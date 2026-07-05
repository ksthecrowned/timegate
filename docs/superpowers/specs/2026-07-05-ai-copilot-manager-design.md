# TimeGate — Copilote manager IA (Cloudflare) — Design

**Date** : 2026-07-05  
**Lot** : IA transversal (hero feature v1)  
**Statut** : design validé — en attente de revue spec avant plan d’implémentation  
**Priorité produit** : B (gain de temps RH/managers) + D (pitch commercial / démo investisseur)

---

## Contexte

TimeGate dispose déjà d’une IA sur le cœur pointage (reconnaissance faciale Python, embeddings, `REVIEW_REQUIRED`). Le reste du produit (timesheets, notifs, manager pro, self-service) repose sur règles métier et crons.

Les lots P1–P2 du backlog sont largement livrés. La prochaine différenciation IA cible :

- **Managers / RH** : poser des questions opérationnelles en langage naturel
- **Commercial** : démo live « assistant RH » lors des pilotes et pitchs

### Décisions validées (brainstorming 2026-07-05)

| Sujet | Choix |
|-------|-------|
| Hero feature v1 | **Copilote manager** (chat), pas OCR ni synthèse hebdo en premier |
| Infra IA | **Cloud-first Cloudflare** (Workers AI + AI Gateway) |
| Coût | **Par tenant** — quotas dans le plan SaaS, comptabilité `companyId` |
| Périmètre v1 | Read-only, ADMIN + MANAGER dashboard uniquement |
| Approche | Phasée : socle metering → tools + API → UI → console plans → pilote |

---

## Vision & périmètre v1

### Produit

**TimeGate Copilot** — assistant conversationnel intégré au dashboard, réservé aux rôles **MANAGER** et **ADMIN**, qui répond en **français** à des questions RH opérationnelles en s’appuyant **uniquement** sur les données réelles du tenant.

### Objectifs mesurables

| Objectif | Indicateur |
|----------|------------|
| Gain de temps manager | Réduction clics pour vue équipe / anomalies / congés |
| Pitch commercial | Démo : question → réponse chiffrée en < 5 s |
| Modèle économique | Chaque requête comptabilisée sur `companyId`, quota plan |

### Inclus v1

- Chat panneau latéral persistant (routes authentifiées, focus `/manager/*`)
- 8 tools read-only mappés sur services API existants
- Historique session (20 messages max, par utilisateur)
- Réponses texte + listes/tableaux + deep links dashboard
- Jauge consommation IA (footer panneau + page admin)
- Feature flag `aiCopilotEnabled` + `aiTokensPerMonth` dans `SubscriptionPlan.features`

### Exclus v1 (phases ultérieures)

- Actions d’écriture (approuver congé, valider pointage)
- OCR justificatifs congé, synthèse hebdo enrichie LLM
- App employé / kiosk
- RAG documents (Cloudflare Vectorize)
- BYOK Cloudflare enterprise
- Streaming SSE des réponses

### Exemples de questions v1

- « Qui est absent aujourd’hui sur le site Casablanca ? »
- « Combien de retards cette semaine ? »
- « Quelles validations sont en attente ? »
- « Top 5 employés en heures sup ce mois »
- « Y a-t-il des kiosks offline ? »
- « Congés en attente d’approbation »

---

## Architecture

### Principe directeur

Le copilote **ne lit jamais la base directement**. NestJS orchestre une boucle **tool-calling** :

1. LLM choisit un tool (JSON Schema)
2. API exécute un service existant scopé `companyId`
3. LLM formule la réponse à partir du JSON retourné

```text
Dashboard (CopilotPanel)
    │  POST /ai/copilot/chat  { message, sessionId? }
    ▼
NestJS — AiModule
    ├── AiQuotaGuard           (quota tenant + feature flag)
    ├── AiCopilotService       (orchestration, session, boucle tools)
    ├── AiToolRegistry         (8 tools read-only + sanitisation)
    └── CloudflareAiService    (Workers AI via AI Gateway)
            │
            ▼
    Cloudflare AI Gateway       (logs, rate limit, cache, metadata tenant)
            │
            ▼
    Workers AI                  (@cf/meta/llama-3-8b-instruct ou équivalent FR)
            │
            ▼
    Services métier existants   (ManagerService, DashboardService, …)
```

### Module API : `api/src/ai/`

| Fichier | Rôle |
|---------|------|
| `ai.module.ts` | Import Manager, Dashboard, Search, Attendance, Leaves, Kiosks |
| `cloudflare-ai.service.ts` | HTTP → AI Gateway ; parsing usage (tokens) |
| `ai-copilot.service.ts` | Boucle chat + tool-calling (max 3 tours) |
| `ai-tool.registry.ts` | Définitions JSON Schema + exécuteurs |
| `ai-quota.service.ts` | Quota mensuel par `companyId` |
| `ai-copilot.controller.ts` | Endpoints REST |
| `dto/copilot-chat.dto.ts` | `message`, `sessionId?` |

Guards réutilisés : `JwtAuthGuard`, `RolesGuard` (ADMIN/MANAGER), `OperationalAccessGuard`, `SubscriptionStateGuard`.

### Endpoints

| Méthode | Route | Rôle |
|---------|-------|------|
| `POST` | `/ai/copilot/chat` | Envoyer un message, recevoir réponse |
| `GET` | `/ai/copilot/sessions/:id` | Historique session (optionnel v1) |
| `GET` | `/ai/usage` | Consommation + quota + `enabled` |

### Variables d’environnement (`api/.env`)

```env
R2_ACCOUNT_ID=…                    # existant — réutilisable pour AI Gateway account
CLOUDFLARE_AI_GATEWAY_ID=…
CLOUDFLARE_AI_API_TOKEN=…
CLOUDFLARE_AI_MODEL=@cf/meta/llama-3-8b-instruct
AI_COPILOT_MAX_TOOL_ROUNDS=3
AI_COPILOT_SESSION_TTL_HOURS=24
AI_COPILOT_REQUEST_TIMEOUT_MS=30000
```

Headers AI Gateway pour metering :

```http
cf-aig-metadata: {"companyId":"ORG-001","userId":"USR-042","feature":"copilot"}
```

### Schéma Prisma (ajouts)

```prisma
model AiUsageRecord {
  id           String   @id @db.VarChar(140)
  companyId    String   @map("company") @db.VarChar(140)
  userId       String?  @map("user_id") @db.VarChar(140)
  feature      String   @db.VarChar(64)  // "copilot"
  inputTokens  Int      @map("input_tokens")
  outputTokens Int      @map("output_tokens")
  model        String   @db.VarChar(140)
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([companyId, createdAt])
  @@map("timegate_ai_usage_record")
}

model AiCopilotSession {
  id        String   @id @db.VarChar(140)
  companyId String   @map("company") @db.VarChar(140)
  userId    String   @map("user_id") @db.VarChar(140)
  messages  Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([companyId, userId, updatedAt])
  @@map("timegate_ai_copilot_session")
}
```

Quota dans `TimeGateSubscriptionPlan.features` (JSON existant) :

```json
{
  "aiCopilotEnabled": true,
  "aiTokensPerMonth": 500000
}
```

`AiQuotaService` agrège `AiUsageRecord` du mois calendaire courant vs quota plan. `null` = illimité (enterprise).

### Boucle tool-calling

1. Utilisateur envoie un message.
2. NestJS charge historique session (20 msgs max, TTL 24 h).
3. Appel Workers AI avec system prompt + tools JSON Schema.
4. Si `tool_calls` → exécution tool → renvoi résultat au modèle (max 3 tours).
5. Réponse `{ text, data?, sources?, usage }` au dashboard.
6. Enregistrement tokens dans `AiUsageRecord`.

**System prompt (extrait)** : répondre en français ; ne jamais inventer de chiffres ; si données insuffisantes, le dire ; citer période et site filtré ; refuser actions d’écriture.

### Mode dev sans Cloudflare

Si `CLOUDFLARE_AI_API_TOKEN` absent : stub LLM (réponses template) mais **tools exécutés réellement** — permet dev local sans coût API.

---

## Catalogue des tools v1

Chaque tool est read-only, exécuté avec le `JwtUser` de la session. Le LLM ne voit que le JSON sanitizé.

### Helper : résolution entités

| Tool | Paramètres | Source |
|------|------------|--------|
| `resolve_branch` | `query: string` | `SearchService.search()` → filtre `branches` |

### 8 tools MVP

| # | Tool | Question type | Implémentation |
|---|------|---------------|----------------|
| 1 | `get_team_today` | Absents, retards, présents aujourd’hui | `ManagerService.teamToday()` + filtre `statusFilter` côté serveur |
| 2 | `get_manager_inbox` | Validations en attente | `ManagerService.inbox()` |
| 3 | `get_weekly_anomalies` | Bilan anomalies semaine | Refactor public de `ManagerReportService.collectWeeklyStats()` |
| 4 | `get_late_records` | Retards sur période | `LateRecordsService.findAll()` + filtres date |
| 5 | `get_planning_vs_actual` | Prévu vs réalisé | `DashboardService.planningVsActual()` |
| 6 | `get_overtime_leaders` | Top heures sup | Requête Prisma agrégée sur `TimeGateTimesheetDay.overtimeMinutes` (read-only, pas d’endpoint HTTP public) |
| 7 | `get_kiosk_status` | Kiosks offline | `KiosksService.findAll()` → filtre `status !== ONLINE` |
| 8 | `search_entities` | Trouver employé / branche | `SearchService.search()` |

### Paramètres communs (exemple `get_team_today`)

```json
{
  "name": "get_team_today",
  "description": "État de l'équipe pour une date (présents, absents, retards, pauses, congés)",
  "parameters": {
    "type": "object",
    "properties": {
      "date": { "type": "string", "format": "date", "description": "YYYY-MM-DD, défaut aujourd'hui" },
      "branchId": { "type": "string", "description": "Optionnel, ID branche" },
      "statusFilter": {
        "type": "string",
        "enum": ["PRESENT","ABSENT","LATE","ON_BREAK","ON_LEAVE","REVIEW_REQUIRED","ALL"]
      }
    }
  }
}
```

### Sanitisation des réponses

| Donnée | v1 |
|--------|-----|
| Nom employé, statut, minutes, branche | ✅ |
| Counts / summaries | ✅ |
| `faceEnrollmentPhoto`, embeddings | ❌ |
| Emails personnels | ❌ sauf search explicite |
| Données autre tenant | ❌ impossible (scope JWT) |

### Deep links (`sources[]` générés côté API)

| Tool | Lien dashboard |
|------|----------------|
| `get_team_today` | `/manager/team?date=…&status=…` |
| `get_manager_inbox` | `/manager/inbox` |
| `get_kiosk_status` | `/kiosks` |
| `search_entities` | `/employees/:id` |

---

## UX dashboard

### Emplacement

- Bouton icône « sparkles » dans `Navbar`, entre recherche globale et cloche notifications
- Visible ADMIN + MANAGER si `aiCopilotEnabled`
- Mobile : panneau plein écran overlay

### Composants

| Fichier | Rôle |
|---------|------|
| `dashboard/components/ai/CopilotPanel.tsx` | Panneau slide-over droit ~400 px, `z-[70]` |
| `dashboard/components/ai/CopilotMessage.tsx` | Bulle message + rendu markdown léger |
| `dashboard/components/ai/CopilotSuggestions.tsx` | Chips suggestions |
| `dashboard/lib/timegate/copilot.ts` | Client API |
| `dashboard/app/(authenticated)/organization/ai-usage/page.tsx` | Page admin consommation |

Intégration dans `(authenticated)/layout.tsx` : `<CopilotProvider>` + bouton navbar.

### États UI

| État | Comportement |
|------|--------------|
| Idle | Accueil + chips suggestions |
| Loading | « Recherche en cours… » |
| Réponse | Texte + listes + boutons deep link |
| Quota 100 % | Input désactivé, jauge rouge |
| Erreur réseau | Message + bouton retry |

### Chips suggestions (statiques v1)

- « Absents aujourd’hui »
- « Validations en attente »
- « Retards cette semaine »
- « Kiosks offline »
- « Top heures sup ce mois »

### Jauge consommation

Footer panneau : barre % quota mensuel.

| Niveau | Affichage |
|--------|-----------|
| < 80 % | Discret |
| 80–99 % | Amber + tooltip |
| 100 % | Input désactivé |

Page admin `/organization/ai-usage` (ADMIN) : tokens/jour (30 j), total mois vs quota, nb sessions.

### Client API

```typescript
postCopilotChat({ message, sessionId? })
getCopilotSession(sessionId)
getAiUsage()  // { enabled, usedTokens, quotaTokens, percent }
```

Pas de streaming v1 — réponse JSON complète (~2–5 s).

### Quotas plan suggérés

| Plan | `aiCopilotEnabled` | `aiTokensPerMonth` |
|------|-------------------|-------------------|
| Essai | `true` | 50 000 |
| Pro | `true` | 500 000 |
| Enterprise | `true` | `null` (illimité) |

Console `console/` : champs plan dans édition `SubscriptionPlan`.

---

## Sécurité

| Risque | Mitigation |
|--------|------------|
| Fuite cross-tenant | `companyId` injecté serveur depuis JWT, jamais depuis prompt |
| Élévation privilèges | `@Roles(ADMIN, MANAGER)` ; pas EMPLOYEE |
| Injection prompt | System prompt + tools read-only uniquement |
| Hallucination chiffres | Réponse basée uniquement sur JSON tool |
| Exfiltration PII | Sanitisation output tools |
| Abus / coût | Quota mensuel + rate limit AI Gateway (~20 req/min/user) |
| Logs | Metadata tenant ; pas de contenu prompt en prod |

Actions d’écriture interdites v1 → message « Disponible prochainement » + lien page manager.

---

## Gestion des erreurs

| Cas | HTTP | UX |
|-----|------|-----|
| Quota épuisé | `429` | Input désactivé |
| Feature désactivée | `403` | Bouton masqué |
| AI Gateway down | `503` | Retry |
| Timeout > 30 s | `504` | Reformuler |
| Tool DB error | `500` partiel | « Données indisponibles » |
| Hors périmètre | `200` | Liste capacités copilote |
| Session expirée | `401` | Redirect login |

Max 3 tours tool-calling ; fallback si boucle.

---

## Observabilité

| Couche | Données |
|--------|---------|
| PostgreSQL | `AiUsageRecord` |
| AI Gateway | Latence, coût, metadata `companyId` |
| NestJS logs | sessionId, tools, durée (sans prompt prod) |
| v1.1 optionnel | Entrée audit `AUDIT_AI_QUERY` |

---

## Tests

### API (prioritaire)

| Test | Scope |
|------|-------|
| Unit `AiToolRegistry` | Sanitisation + scope companyId |
| Unit `AiQuotaService` | Blocage 100 %, illimité |
| Integration `AiCopilotService` | Mock Cloudflare → tool → réponse |
| E2E isolation tenant | Org A ≠ org B |
| E2E quota | 429 après dépassement |

### Dashboard

| Test | Scope |
|------|-------|
| Composant `CopilotPanel` | Render, envoi, quota |
| Playwright (optionnel) | Chip → réponse visible |

---

## Rollout

| Phase | Livrable | Durée |
|-------|----------|-------|
| **0 — Socle** | Prisma, `CloudflareAiService`, `AiQuotaService`, env | ~1 sem. |
| **1 — API** | 8 tools, `POST /ai/copilot/chat`, refactor stats hebdo | ~1,5 sem. |
| **2 — Dashboard** | `CopilotPanel`, navbar, jauge | ~1 sem. |
| **3 — Console** | Champs plan + page usage admin | ~3 j |
| **4 — Pilote** | 2–3 tenants beta, tuning prompts | ~1 sem. |

Merge : Phase 0+1 (curl/Postman) → Phase 2 (UI) → Phase 3 (plans) → Phase 4.

### Critères succès pilote

| Métrique | Cible |
|----------|-------|
| P95 réponse | < 8 s |
| Hallucinations (audit 50 questions) | < 5 % |
| Questions résolues sans navigation | > 70 % |
| Coût moyen / tenant / mois | < quota Pro |
| NPS managers pilote | ≥ 7/10 |

---

## Roadmap IA post-v1 (hors scope immédiat)

| Feature | Phase | Valeur |
|---------|-------|--------|
| Synthèse hebdo LLM | Phase IA-2 | Enrichit email manager existant |
| OCR justificatifs congé | Phase IA-2 | Pré-remplissage formulaire |
| Score qualité enrôlement facial | Phase IA-2 | Réduit `REVIEW_REQUIRED` |
| Actions copilote (approuver congé) | Phase IA-3 | Écriture avec confirmation |
| RAG politiques RH (Vectorize) | Phase IA-3 | Questions réglementaires internes |
| BYOK Cloudflare enterprise | Phase IA-4 | Gros comptes |

---

## Références code existant

| Fichier | Usage copilote |
|---------|----------------|
| `api/src/manager/manager.service.ts` | `teamToday`, `inbox` |
| `api/src/manager/manager-report.service.ts` | `collectWeeklyStats` (à extraire) |
| `api/src/dashboard/dashboard.service.ts` | `planningVsActual` |
| `api/src/search/search.service.ts` | `search`, résolution branche |
| `api/src/late-records/late-records.service.ts` | retards |
| `api/src/kiosks/kiosks.service.ts` | statut kiosks |
| `api/src/storage/cloudflare-r2.service.ts` | pattern Cloudflare credentials |
| `dashboard/components/layout/Navbar.tsx` | emplacement bouton |
| `api/prisma/schema.prisma` | `TimeGateSubscriptionPlan.features` |

---

## Approches écartées

| Approche | Raison écart |
|----------|--------------|
| SQL libre généré par LLM | Risque sécurité + hallucinations |
| Upload direct client → R2 pour IA | Hors scope ; copilote read-only DB |
| OpenAI / Anthropic direct | Décision cloud-first Cloudflare unifié |
| Copilote employee-app v1 | Focus manager + pitch B2B |

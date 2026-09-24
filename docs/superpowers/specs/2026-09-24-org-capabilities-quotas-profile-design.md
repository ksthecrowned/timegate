# TimeGate — Capacités org, quotas & profil — Design (H)

**Date** : 2026-09-24  
**Statut** : **approuvé** (2026-09-24) — H0 puis H1 avec L  
**Priorité** : P0 — Phase 0 (profil) + Phase 1 (gates)  
**Feuille de route** : [`docs/pilot/interne/feuille-de-route-multisecteurs.md`](../../pilot/interne/feuille-de-route-multisecteurs.md)  
**Code de référence** : `Company`, `TimeGateSubscriptionPlan`, `TimeGateSubscription`, `SubscriptionQuotaService`, signup DTO

---

## Objectif

Donner à TimeGate :

1. des **capabilities** (flags) pour activer des fonctions sans forker le produit ;
2. des **quotas opérationnels** pour tarifer (employees, locations, kiosks, …) ;
3. un **profil org** optionnel (secteur, modèle de main-d’œuvre, …) pour onboarding / analytics / commercial.

**Règle :** le profil **suggère** ; les capabilities / le plan **autorisent**. Jamais `if (industrySector === 'hotel')` pour débloquer du code métier.

---

## État actuel

| Élément | État |
| --- | --- |
| `organizationSize` | Signup + `Company` |
| `contactRole` | Signup → User |
| Quotas | `maxEmployees`, `maxKiosks` sur plan + subscription ; assert à la création employé/kiosk |
| `features` JSON sur plan | Existe, peu / pas structuré comme capabilities produit |
| Secteur / workforce / sites attendus | **Absent** |

---

## Modèle cible

### 1. Capabilities (flags)

Enum / constantes stables (string codes) :

| Code | Débloque | Chantier lié |
| --- | --- | --- |
| `multi_locations` | Créer >1 location ; affectations cross-site | A, L |
| `multi_kiosks` | >1 kiosk par location | B |
| `client_missions` | Missions + page QR client | D |
| `scoped_managers` | Scope manager par location | F |
| `anomaly_workflow` | File anomalies typées (au-delà ACCEPTED/REVIEW) | I |

Le **cœur** (pointage mono-site, timesheet, congés, paie de base) est **toujours on** si l’abonnement est opérationnel — pas un flag.

#### Résolution effective

```text
effectiveCapabilities =
  plan.capabilities
  ∪ subscription.capabilityOverrides (si besoin ops)
  ∪ company.capabilityOverrides (ADMIN / console — selon politique)
```

**V1 recommandée (simple) :**

- Plan définit `capabilities: string[]` (dans `features` JSON typé ou colonne dédiée).
- Subscription copie / hérite au moment de l’activation (comme maxEmployees aujourd’hui).
- Console `PLATFORM_ADMIN` peut overrider la subscription.
- Settings org ADMIN : peut **désactiver** une capacité incluse dans le plan (opt-out), pas en activer une hors plan.

#### Gates

| Couche | Comportement |
| --- | --- |
| API | `ForbiddenException` si action nécessite une capacité absente |
| Dashboard | Masquer / disable menus et CTA |
| Console | Afficher flags + bascules |

Defaults pilote mono-site : cœur on ; `multi_locations` / `multi_kiosks` / `client_missions` / `scoped_managers` / `anomaly_workflow` **off** jusqu’à activation plan ou ops.

---

### 2. Quotas opérationnels

| Quota | Aujourd’hui | Cible |
| --- | --- | --- |
| `maxEmployees` | oui | inchangé |
| `maxKiosks` | oui (`max_devices`) | inchangé (devices) |
| `maxLocations` | non | **ajouter** (Phase 1 avec L) |
| `maxActiveMissions` | non | avec D |
| `maxScopedManagers` | non | avec F |
| `maxActiveAssignments` | non | **plus tard** (éviter sur-ingénierie Phase 0) |

`SubscriptionQuotaService` :

- `assertCanAddEmployee` / `assertCanAddKiosk` — déjà
- `assertCanAddLocation` — nouveau
- plus tard : mission, scoped manager

Comptage `locations` : toutes les locations **actives** de la company (définition L).

---

### 3. Profil organisation

Champs optionnels sur `Company` (sauf ce qui est déjà requis au signup) :

| Champ | Type | Signup | Settings | Console |
| --- | --- | --- | --- | --- |
| `industrySector` | enum + OTHER | optionnel | oui | filtre |
| `expectedSiteCount` | enum `1` \| `2-5` \| `6+` | optionnel | oui | filtre |
| `workforceModel` | `fixed_sites` \| `client_sites` \| `mixed` | optionnel | oui | filtre |
| `schedulePattern` | `fixed_day` \| `multi_shift` \| `includes_night` | optionnel | oui | filtre |
| `countryCode` | string ISO | optionnel / défaut | oui | filtre |
| `referralSource` | enum + OTHER | optionnel | oui | analytics |

#### Enums proposés `industrySector`

`OFFICE`, `TRAINING`, `INDUSTRY`, `SECURITY`, `CLEANING`, `STAFFING`, `CLINIC`, `HOTEL`, `OTHER`

#### Suggestions (pas d’auto-activation)

| Signal profil | Suggestion UI |
| --- | --- |
| `expectedSiteCount` ≠ `1` | « Activer multi-lieux » si plan le permet |
| `workforceModel` = `client_sites` \| `mixed` | « Activer missions client » |
| `schedulePattern` = `includes_night` | Preset horaires nuit à la création |

Presets one-shot à l’onboarding (départements / shift types) — **jamais** un mode permanent lié au secteur.

---

## API / UI (v1)

### Signup / création org

Étendre payload (tous optionnels sauf champs déjà requis) :

```json
{
  "organizationName": "...",
  "organizationSize": "11-50",
  "contactRole": "hr",
  "industrySector": "OFFICE",
  "expectedSiteCount": "1",
  "workforceModel": "fixed_sites",
  "schedulePattern": "fixed_day",
  "countryCode": "CG",
  "referralSource": "OTHER"
}
```

Skip autorisé : champs absents = null.

### Settings organisation (ADMIN)

GET/PATCH profil + lecture seule des capabilities effectives + quotas used/max.

### Console SaaS

- Liste orgs : colonnes secteur, taille, capabilities, quotas.
- Fiche org : editer overrides capabilities / quotas (ops).

---

## Stockage proposé

**Option recommandée (pragmatique) :**

1. Colonnes dédiées sur `Company` pour le profil (query/filtre faciles).
2. Sur `TimeGateSubscriptionPlan` / `TimeGateSubscription` :
   - garder `maxEmployees`, `maxKiosks` ;
   - ajouter `maxLocations Int @default(1)` ;
   - `capabilities Json` (array de codes) **ou** typer `features` existant avec schéma `{ capabilities: string[], ... }`.

Éviter une table `CompanyCapability` en v1 sauf besoin d’historique.

---

## Analytics

Événements anonymisés org-level (pas de PII employés) :

- `org.profile_updated`
- `org.capability_toggled` (qui, laquelle, on/off)
- Dimensions : sector, size, workforceModel, capabilities actives

Réutiliser / étendre `TimeGateAnalyticsEvent` si pertinent.

---

## Phasage d’implémentation H

| Slice | Contenu | Quand |
| --- | --- | --- |
| **H0** | Colonnes profil + signup/settings/console lecture | Phase 0 |
| **H1** | `capabilities` sur plan/subscription + helper `hasCapability` + 1–2 gates (ex. bloquer 2e branche si pas `multi_locations`) | Phase 1 avec L |
| **H2** | `maxLocations` + assert | Phase 1 |
| **H3** | `maxActiveMissions`, `client_missions` gate | Phase 2 (D) |
| **H4** | `scoped_managers`, `anomaly_workflow` | Phases 1b / 3 |

---

## Tests

- [ ] Signup sans profil → org OK
- [ ] Signup avec profil → champs persistés
- [ ] Plan sans `multi_locations` → refus 2e location
- [ ] Plan avec flag → création OK jusqu’au quota
- [ ] Opt-out org d’une capacité plan → API refuse l’action
- [ ] Console override → effective capabilities mises à jour
- [ ] Aucun code path métier ne lit `industrySector` pour autoriser une action

---

## Hors scope

- Billing Stripe / paywall marketing
- Auto-activation capabilities depuis le profil
- Packs « édition sécurité » vs « édition clinique »

---

## Critères d’acceptation

- [ ] Spec approuvée
- [ ] H0 shippable sans bloquer le pilote mono-site
- [ ] Documenté dans feuille de route : lien vers ce fichier
- [ ] Aligné avec audit : secteur ≠ fork produit

# Feuille de route — multi-secteurs sans quitter le cœur TimeGate

> **Interne TimeGate** — ne pas transmettre au client.  
> Date : 24 septembre 2026  
> Statut : **Phase 0–5 livrée + partiels C/E/G fermés** — migrations appliquées · UC-20 overnight + soft-end + cycle punch→paie  
> Specs validées : invariants · H · L+A · I/J · D · K · M  
> Suite : démos terrain · soft-pilote mono-site  
> Lié : [audit-compatibilite-fonctionnelle-secteurs.md](./audit-compatibilite-fonctionnelle-secteurs.md)

---

## Règle absolue (60 jours)

> **Chaque nouvelle fonctionnalité doit renforcer le moteur de présence ou résoudre un problème réel rencontré pendant un test.**

Pas de dashboard décoratif, pas de module RH « parce que les concurrents l’ont », pas de feature IA cosmétique.

Le marché converge déjà vers multi-sites, multi-kiosks, QR dynamique, géoloc, rôles scopés, audit, exceptions. TimeGate se différencie par un **registre de présence vérifiable** (qui / où / quand / par quel moyen / dans quel contexte), pas par une checklist feature-parity.

---

## Principe non négociable

**Arrivée → pause (optionnelle) → départ → (anomalie éventuelle) → timesheet → paie.**

Chaîne d’intégrité (jamais supprimer silencieusement un événement) :

```text
Événement brut
      ↓
Interprétation TimeGate
      ↓
Anomalie éventuelle
      ↓
Correction / justification
      ↓
Validation
      ↓
Timesheet
      ↓
Paie
```

### Objectif au jour 60

Pas : « TimeGate support 8 secteurs. »

Oui :

> **TimeGate est un moteur de présence multi-contexte** — même geste partout, autorisations et lieux adaptés, anomalies et audit maîtrisés, offline résilient.

| Modèle | Chaîne |
| --- | --- |
| Bureau | Employé → Lieu (branche) → Horaire → Kiosk |
| Usine | Employé → Atelier → Horaire → Kiosk |
| Clinique | Employé → Clinique → Garde de nuit → Kiosk |
| Sécurité | Employé → Mission → Site client → Horaire → QR client |
| Nettoyage | Employé → Mission → Site client → Créneau → QR client |
| Placement | Employé → Mission → Client → Période → Pointage |

---

## Architecture produit — 5 couches

```text
                    TIMEGATE
                       │
        ┌──────────────┴──────────────┐
        │                             │
   1. PRÉSENCE                   2. AUTORISATION
   arrivée / pause / départ      affectation
   kiosk / face / QR / offline   lieu + période + shift
        │                             │
        └──────────────┬──────────────┘
                       │
                 3. EXPLOITATION
                 anomalies · managers · équipes · audit · centre de contrôle
                       │
                 4. CONTEXTE
                 lieu · mission/job · client · profil org · (gps plus tard)
                       │
                 5. MONÉTISATION
                 capabilities · quotas opérationnels · plans
```

| Couche | Chantiers | Rôle |
| --- | --- | --- |
| 1. Présence | Cœur actuel + offline (K) + contexte événement (M) | Registre vérifiable |
| 2. Autorisation | A, B, C | Qui peut pointer où / quand |
| 3. Exploitation | I (anomalies), J (audit), F, N (contrôle), O (notifs) | Ops quotidiennes + confiance paie |
| 4. Contexte | L (lieux), D (missions), E, H profil | Multi-modèles sans fork |
| 5. Monétisation | H capacités + quotas | Plans sans forks produit |

---

## Décisions produit (verrouillées)

| Sujet | Choix |
| --- | --- |
| Pilotes immédiats | Bureaux + formation (1 site) |
| Affectation | Employé → **lieu de travail** → période + horaire |
| Lieu ≠ branche | **Location** = où on pointe ; Branch = structure admin (peut être un type de lieu) |
| Lieu ≠ mission ≠ département ≠ équipe | Concepts **distincts** ; Job/Mission préparé sans module projet |
| Terminaux | 1 lieu → **1..N kiosks** |
| Missions client | Client affiche QR ; employé scanne (pas le téléphone comme terminal) |
| GPS | **Pas maintenant** ; slot prévu dans `VerificationContext` |
| Anomalies | Sous-système dédié **après A/B/C**, avant de surcharger D |
| Audit | Capacité transverse : qui / quoi / quand / avant / après / pourquoi |
| Offline | **Priorité stratégique** (Congo / Afrique centrale) — exiger, pas option |
| Notifications | Uniquement si **action** potentielle côté manager |
| Capacités (H) | Tôt — flags de contrôle du build |
| Quotas | Employees, locations, kiosks, missions actives, managers… (pas seulement maxEmployees/maxKiosks) |
| Ordre | **Pas de D tant que A+B+C solides** ; anomalies juste après |

---

## Capacités produit + quotas opérationnels (H)

### Flags fonctionnels

| Capacité | Effet | Chantier |
| --- | --- | --- |
| `multi_locations` | Plusieurs lieux + affectations | A, L |
| `multi_kiosks` | Plusieurs bornes / lieu | B |
| `client_missions` | Missions + page QR client | D |
| `scoped_managers` | Managers limités par lieu | F |
| `anomaly_workflow` | File d’anomalies + résolution | I |
| *(cœur)* | Pointage + timesheet + paie + offline de base | — |

### Quotas opérationnels (monétisation)

Au-delà des flags, les plans portent des **limites** :

| Quota | Exemple |
| --- | --- |
| `maxEmployees` | déjà en place |
| `maxKiosks` | déjà en place (devices) |
| `maxLocations` | à ajouter |
| `maxActiveAssignments` | optionnel / plus tard |
| `maxActiveMissions` | avec D |
| `maxScopedManagers` | avec F |

Exemple d’offre :

```text
Plan Pro
├── 100 employees
├── 10 locations
├── 20 kiosks
├── 5 managers scoped
└── client_missions: on
```

Les capacités / quotas **ne sont pas** dérivés du seul `industrySector`.

### Profil org (métadonnée)

Déjà : `organizationSize`, `contactRole`, timeZone, identité.

À ajouter : `industrySector`, `expectedSiteCount`, `workforceModel`, `schedulePattern`, `countryCode`, `referralSource` — suggestions ≠ activation auto.

---

## Présence réelle (axe différenciant)

Chaque événement doit progressivement répondre à :

**Qui ? Où ? Quand ? Par quel moyen ? Dans quel contexte ?**

### Exemple site propre

```text
Jean Dupont · 22/09/2026 07:58
Lieu : Atelier A
Kiosk : K-03
Affectation : #482
Shift : 08:00–17:00
Auth : face
Device : —
```

### Exemple mission client

```text
Jean Dupont · 22/09/2026 08:03
Client : Société X · Mission #M-104
Page client #P-17 · QR challenge #…
Employee device #… (trusted)
Affectation / créneau : …
```

### VerificationContext (architecture — GPS plus tard)

```text
VerificationContext
├── kiosk
├── face
├── qr_challenge
├── trusted_device
└── gps          ← plus tard (complément, pas tracking permanent)
```

Borne / challenge affiché = **méthode principale**. GPS = **complément** éventuel pour contextes distribués — pas le centre du produit en v1.

---

## Modèle conceptuel : Location / Mission / Org

```text
Company
  └── Locations          ← où l’on peut pointer
       ├── type: branch (site admin / siège / atelier)
       ├── type: client_site
       └── type: temporary_site
  └── Branch (admin)     ← peut référencer / être une Location
  └── Missions / Jobs    ← travail effectué (≠ lieu) — modèle léger
  └── Departments        ← orga RH
  └── Teams (plus tard)  ← planning / équipe de travail
```

Exemple :

| Concept | Valeur |
| --- | --- |
| Location | Client A |
| Assignment | 22–30 septembre |
| Job / Mission | Nettoyage nuit |
| Shift | 22:00–06:00 |

**Ne pas fusionner** lieu = mission = département = équipe.

Job/Mission/Cost center : **préparer le modèle** (champs / relations minimales) sans construire un module projet.

---

## Vue d’ensemble des chantiers

```text
[H] Capacités + profil + quotas     ── contrôle + monétisation (tôt)
[L] Locations (≠ Branch)            ── modèle de lieux
[A] Affectation de présence         ──┐
[B] Multi-kiosks / lieu               ├── cœur autorisation (phase 1)
[C] Alignement horaire ↔ punch      ──┘
[K] Offline stratégique             ── présence résiliente (parallèle / hardening)
[M] Contexte événement              ── registre présence réelle
[I] Anomalies                       ── juste après A/B/C
[J] Audit trail                     ── transverse (avec I)
[D] Page client = kiosk léger       ── différenciateur (après A/B/C + I amorcé)
[E] Contrats / fin de mission
[F] Managers scopés / équipes
[N] Centre de contrôle manager
[O] Notifications actionnables
[G] Pilotes + stress tests
[P] Hardening (phase 5)
```

---

## Trajectoire 60 jours

### Jours 1–7 — Phase 0 : preuve + cadrage

- Pilote bureau / formation en parallèle
- Profil org léger (H partiel)
- Specs **A, B, C, H, L** (+ esquisse VerificationContext, anomalies I) **avant** modèles structurants
- Batterie de **tests métier** sur le pointage actuel
- Documenter invariants : arrivée → pause → départ → timesheet → paie (+ « ne jamais supprimer un événement brut »)
- Inventaire offline existant (queue kiosk / sync) → écarts vs exigence produit

### Jours 8–23 — Phase 1 : A + B + C (+ L + gates H)

Cœur de la transformation. **Pas de D.**

```text
employé → affectation → lieu → période → horaire → pointage
lieu → 1..N kiosks
horaire : affectation du jour → defaultShift → défaut org
```

Fin de phase 1 — doit gérer :

- [ ] Employé permanent sur un site
- [ ] Affectation temporaire autre site
- [ ] Plusieurs sites (locations)
- [ ] Plusieurs bornes / site
- [ ] Horaires multiples + nuit
- [ ] Pointage bonne borne
- [ ] Refus/review hors affectation
- [ ] Location distincte de la branche admin (au moins en modèle)

Gates : `multi_locations`, `multi_kiosks`. Quotas : amorcer `maxLocations`.

### Jours 24–30 — Phase 1b : I + J (anomalies + audit)

**Priorité juste après A/B/C** — avant de surinvestir D.

Passer de « accepté / refusé » à :

**pointage → validation → anomalie éventuelle → résolution → impact paie**

Types d’anomalies (v1 non exhaustif) :

- mauvais site / hors affectation
- hors plage horaire
- arrivée tardive
- départ manquant
- double pointage
- pause trop longue
- sortie anticipée
- affectation expirée
- kiosk inconnu / désactivé
- sync offline problématique

Règle : **aucune suppression silencieuse** d’événement brut.

Audit trail (J) pour toute correction sensible :

`qui → quoi → quand → ancienne valeur → nouvelle valeur → pourquoi`

Exemple : *Styve a modifié le départ de Jean du 22/09 de 17:02 à 17:15 — motif : oubli de pointage.*

### Jours 31–40 — Phase 2 : D (+ K offline renforcé)

Missions client / kiosk léger — **après** A/B/C solides et anomalies amorcées.

```text
Client  → lien → QR rotatif
Employé → app → scan → vérif affectation → arrivée / pause / départ
```

Pertinent : sécurité, nettoyage, placement, détachés, maintenance.

**Offline (K)** — exigence produit, pas nice-to-have :

```text
Pointage → validation locale → stockage sécurisé → queue
→ reconnexion → sync → accusé serveur
```

Une coupure réseau **ne doit pas** empêcher de pointer. Avantage régional (Congo / Afrique centrale) = différenciation réelle vs solutions cloud-only.

### Jours 41–48 — Phase 3 : E + F + N (+ O)

Exploitation quotidienne :

- **E** — ✅ contrats CDI/CDD/stage/mis à disposition ; fin mission sans supprimer l’employé (clôture affectation + soft-end contrat)
- **F** — ✅ managers scopés par lieu (`scoped_managers` + `TimeGateUserLocation`) ; département ≠ équipe
- **N** — ✅ centre de contrôle manager (présence maintenant, sites, anomalies)
- **O** — ✅ notifications **uniquement actionnables** (absent au démarrage, départ manquant, mission sans pointage, affectation qui expire, anomalie avant paie) — **pas** « Jean vient de pointer »

Esquisse centre de contrôle :

```text
PRÉSENCE MAINTENANT
🟢 présents · 🟡 pause · 🔴 absents · ⚠️ anomalies

SITES / LOCATIONS
Brazzaville · Pointe-Noire · Client A · …

→ N anomalies nécessitent votre attention
```

### Jours 49–52 — Phase 4 : stress tests (G)

Orgs fictives agressives + **cycle complet** pour chaque scénario :

```text
org → lieu → employés → contrat → horaire → affectation
→ pointage → anomalie → validation → timesheet → paie → reporting
```

| Scénario | Éprouve |
| --- | --- |
| Bureau | Base |
| Formation | Multi-horaires |
| Industrie | Shifts + 2 kiosks |
| Hôtel | Services + multi-points |
| Clinique | Nuit + minuit |
| Sécurité | Rotation + client |
| Nettoyage | Multi-clients + missions |
| Placement | Missions + fin d’affectation |

### Jours 53–60 — Phase 5 : Hardening (P) + consolidation

**Aucune nouvelle grosse feature.** Plus important qu’une feature de plus.

Checklist hardening :

- [x] Concurrence / double scan — `P2002` → replay idempotent (`attendance-punch-recorder`)
- [x] Idempotence des événements — unique `(companyId, idempotencyKey)` + catch conflit
- [x] Offline / reconnexion — durci (K) ; age max + replay `clientId`
- [x] Fuseau horaire — jour métier via `workDateUtcFromOccurredAt` (wrong-site + fenêtres)
- [x] Passage minuit — overnight windows + work date org TZ
- [x] QR expiré / double scan QR — MAC + `redeemedAt` atomique
- [x] Kiosk désactivé ; employé désactivé — `isActive` face/PIN/NFC + statut ACTIVE
- [x] Affectation expirée — REVIEW `ASSIGNMENT_EXPIRED` si pointage sur lieu clôturé
- [x] Changement de site / archivage — archive lieu → kiosks off + close assignments + REVIEW `LOCATION_ARCHIVED`
- [x] Corrections manuelles + recalcul timesheet / paie — audit + materialize
- [x] Permissions + gates capacités — quotas admin ; ingest punch non forké
- [x] Audit trail des corrections — review / timesheet / claims / close assignment
- [x] Stabiliser onboarding / presets / docs / démos / pilotes — presets signup one-shot + playbook G

Corriger · tester · simplifier · nettoyer · mesurer · documenter.

---

## Chantiers détaillés

### A — Affectation de présence

`employé → location → période (+ shift)`. Punch accepté si affectation active sur ce lieu ; sinon refus/review. Timesheet porte le lieu. Cas dégénéré = mono-site actuel.

### B — Multi-kiosks

Lever `branchId` @unique sur kiosk → N devices / location. Migration douce.

### C — Résolution horaire

`affectation du jour → defaultShift → défaut org`. Doc métier = code. Pause via horaire/settings. Nuit/minuit à durcir (tests).

### D — Page client kiosk léger

Lien unique → page QR rotatif → scan employé. Capacité `client_missions`. Prérequis A (+ anomalies amorcées). Pas de check-in GPS seul en v1.

### E — Contrats / fin de mission

Types métier + historique + clôture affectation ≠ delete employé.

### F — Managers / équipes

Scope par location ; département ≠ équipe ; UI locations/emplacements.

### G — Pilotes & stress tests

Phase 0 terrain + phase 4 scénarios agressifs.

✅ Playbook [`stress-tests-multisecteurs.md`](./stress-tests-multisecteurs.md) · unit `api/src/stress/` · UC-20 **terrain** (lieu → mission → close affectation → archive).

### H — Capacités, profil, quotas

Flags + profil onboarding + quotas opérationnels (employees, locations, kiosks, missions, managers). Tôt dans le build.

### I — Anomalies (sous-système)

File d’anomalies typées → résolution / justification → impact timesheet/paie. Capacité `anomaly_workflow`. **Juste après A/B/C.**

### J — Audit trail

Journal immutable des corrections / validations sensibles (qui, quoi, quand, before/after, motif). Transverse paie-grade.

### K — Offline stratégique

Exigence : pointer sans réseau ; sync + ack ; idempotence. Durcir queue existante. Critère régional différenciant.

### L — Locations

Découpler **lieu de pointe** de **branche admin**. Types : branch / client_site / temporary. Base propre pour A, B, D.

### M — Contexte événement (présence réelle)

Enrichir chaque événement : employee, location, mission?, kiosk/page, auth method, device, assignment, shift, timestamps. UI détail « registre vérifiable ». Prévoir `VerificationContext` + slot GPS.

### N — Centre de contrôle manager

Présence temps réel par location + file anomalies. Après A/B/D/F amorcés. Pas un vanity dashboard.

### O — Notifications actionnables

Seulement si action manager potentielle. Pas de spam « vient de pointer ».

### P — Hardening

Phase 5 checklist (ci-dessus). Obligatoire avant de clôturer les 60 jours.

✅ Idempotence / TZ / overnight / kiosk / affectation expirée · **archivage lieu** (`POST /locations/:id/archive`) · **presets onboarding** (secteur + rythme).

---

## Job / Mission / Cost center (préparer, ne pas surconstruire)

Dans les specs A/D/L :

- [ ] Prévoir entité ou champs **Mission/Job** distincts de Location
- [ ] Cost center / code analytique optionnel (string) pour reporting paie plus tard
- [ ] **Ne pas** livrer un module projet / Gantt / staffing marketplace en 60 jours

---

## Ce qu’on ne construit pas

- Téléphone = terminal d’arrivée/départ par défaut
- GPS / tracking permanent au centre
- Multi-orgs pour simuler sites clients
- SIRH / marketplace / facturation client
- Fork produit par secteur
- Notifications vanity
- Dashboard décoratif
- D avant A+B+C ; features pendant le hardening
- Suppression silencieuse d’événements de pointage

---

## Prochaine étape immédiate (avant code structurant)

Ordre de specs :

1. ✅ **Invariants cœur** — [`2026-09-24-presence-core-invariants-design.md`](../../superpowers/specs/2026-09-24-presence-core-invariants-design.md)
2. ✅ **H** — capacités + quotas + profil — [`2026-09-24-org-capabilities-quotas-profile-design.md`](../../superpowers/specs/2026-09-24-org-capabilities-quotas-profile-design.md)
3. ✅ **L + A** (+ C) — [`2026-09-24-locations-presence-assignment-design.md`](../../superpowers/specs/2026-09-24-locations-presence-assignment-design.md)
4. ✅ **B** — multi-kiosks (unique branch levé, gate `multi_kiosks`)
5. ✅ **I / J** — anomalies + audit ([spec](../../superpowers/specs/2026-09-24-anomalies-audit-design.md))
6. ✅ **D** — page client QR ([spec](../../superpowers/specs/2026-09-24-client-mission-qr-page-design.md))
7. ✅ **K** — offline ([spec](../../superpowers/specs/2026-09-24-offline-hardening-design.md))
8. ✅ **M** — VerificationContext ([spec](../../superpowers/specs/2026-09-24-verification-context-design.md))
9. ✅ **N** — centre de contrôle manager (`GET /manager/control-center`, UI `/manager/control`)
10. ✅ **E** (léger) — type « Mis à disposition » + `POST …/close` affectation + soft-end contrat (`isCurrent=false`) ; pas de delete employé
11. ✅ **F** — `TimeGateUserLocation` + capacité `scoped_managers` ; filtre team/inbox/control/anomalies ; UI `/users/[id]`
12. ✅ **O** — politique actionnable + types SHIFT_START_MISSING / ASSIGNMENT_EXPIRING / MISSION_NO_PUNCH / ANOMALY_BEFORE_PAYROLL + crons + href « Traiter »
13. ✅ **P** (amorcé) — P2002 idempotent, jour métier TZ, kiosk `isActive`, REVIEW `ASSIGNMENT_EXPIRED`
14. ✅ **G** — playbook + `bun test src/stress/…` + UC-20 stress multi-secteurs
15. ✅ **P** — archivage site + presets onboarding + checklist Phase 5
16. ✅ **Exploitation** — UC-20 terrain mutatif · soft-end contrat UI · runbook démo/pilote
17. ✅ **Ops** — migrations `20260924*` déployées · UC-20 C (nuit) + E (soft-end) + G (punch→timesheet→paie)

**Maintenant :** démos terrain · soft-pilote client mono-site.

Puis : modifications de modèles structurants derrière flags.

---

## Synthèse

Si on réussit **A+B+C+D + anomalies/audit + offline + hardening**, TimeGate change de catégorie :

> plus un outil de pointage avec quelques fonctions RH,  
> mais un **moteur de présence multi-contexte** sur lequel on pourra construire ensuite.

**A+B+C** = transformation · **I/J** = confiance paie · **D** = différenciateur terrain · **K** = avantage régional · **E/F/N** = exploitable · **P** = ne pas livrer fragile.

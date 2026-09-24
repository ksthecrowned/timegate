# TimeGate — Invariants du cœur de présence — Design

**Date** : 2026-09-24  
**Statut** : **approuvé** (2026-09-24) — Phase 0 tests + référence pour A–P  
**Priorité** : P0 — Phase 0 (jours 1–7)  
**Feuille de route** : [`docs/pilot/interne/feuille-de-route-multisecteurs.md`](../../pilot/interne/feuille-de-route-multisecteurs.md)  
**Code de référence** : `TimeGateAttendanceEvent`, `attendance-punch-resolver`, `attendance-punch-recorder`, `punch-window.service`, timesheets, payroll-runs

---

## Objectif

Figer ce que TimeGate **garantit toujours**, quels que soient le secteur, les capacités ou les lieux :

> Un employé pointe **arrivée → pause (optionnelle) → départ** ; ces événements forment un **registre vérifiable** ; la timesheet et la paie en découlent ; **aucun événement brut n’est effacé silencieusement**.

Ce document est la **ceinture de sécurité** de tous les chantiers A–P.

---

## Chaîne d’intégrité (non négociable)

```text
Événement brut (TimeGateAttendanceEvent / attempt log)
        ↓
Interprétation (fenêtres, état du jour, affectation)
        ↓
Statut : ACCEPTED | REVIEW_REQUIRED | REJECTED
        ↓
Anomalie éventuelle (chantier I — après A/B/C)
        ↓
Correction / justification (claim, override) + audit (J)
        ↓
Validation manager
        ↓
Timesheet day
        ↓
Paie
```

### Politique « événement brut immuable »

| Règle | Détail |
| --- | --- |
| **Pas de DELETE** métier sur un `TimeGateAttendanceEvent` accepté ou en review | Soft-cancel / supersede uniquement |
| **Correction** = nouvel enregistrement ou override timesheet lié à l’événement | Jamais rewrite silencieux de `occurredAt` / `type` sans trace |
| **REJECTED** reste stocké | Ou au minimum dans `TimeGatePunchAttemptLog` avec `outcome` + message |
| **Idempotence** | `(companyId, idempotencyKey)` unique — déjà en place ; à conserver sur tous les canaux |
| **Offline sync** | Même règles ; `source = KIOSK_OFFLINE_SYNC` ; âge max = `offlineSyncMaxAgeMinutes` |

**État actuel vs cible :**

- Aujourd’hui : `ACCEPTED` / `REVIEW_REQUIRED` / `REJECTED` ; `meta` JSON ; punch claims ; timesheet overrides.
- Cible Phase 0 : **documenter + tests** sur le comportement actuel.
- Cible Phase 1b (I/J) : anomalies typées + audit before/after sur corrections.

---

## Gestes de pointage

| Geste | Type événement | Qui le déclenche | Notes |
| --- | --- | --- | --- |
| Arrivée | `CHECK_IN` | Kiosk (face/PIN/NFC/QR) | Terminal / challenge affiché — **pas** le téléphone seul |
| Pause début | `BREAK_START` | Rare / auto selon config | Aujourd’hui la pause est surtout fenêtre + `BREAK_END` |
| Reprise pause | `BREAK_END` | Kiosk **ou** employee-app (trusted + geo branche) | Exception téléphone déjà prévue |
| Départ | `CHECK_OUT` | Kiosk (face/PIN/NFC/QR) | Départ anticipé → refus kiosk → réclamation |

**Invariant téléphone :** le téléphone personnel **n’est pas** un terminal d’arrivée/départ. Il sert à : scanner un QR affiché, reprise de pause (trusted), self-service RH.

---

## Résolution d’un pointage (ordre logique)

Pour un scan à l’instant T :

1. **Identité** — match face / PIN / NFC / QR challenge → `employeeId`
2. **Employé actif** — `status = ACTIVE` ; sinon rejet
3. **Autorisation de lieu** (aujourd’hui : `employee.branchId` vs kiosk ; demain : affectation → location — chantiers A/L)
4. **Horaire** — fenêtres du jour (aujourd’hui surtout via `ShiftAssignment` ; demain : affectation → defaultShift → défaut org — C)
5. **État du jour** — déjà check-in ? pause ? check-out ?
6. **Action** — `CHECK_IN` / `BREAK_END` / `CHECK_OUT` / `REJECTED` / `NONE`
7. **Statut** — confiance faciale, wrong site, late → `ACCEPTED` ou `REVIEW_REQUIRED`
8. **Persistance** — événement (+ attempt log si rejet)
9. **Matérialisation** — si `ACCEPTED` → checkin legacy / timesheet pipeline

### Invariants de machine à états (jour de travail)

Soit un employé et une **work date** (timezone org ; overnight → work date peut être J-1) :

| État | Transitions autorisées |
| --- | --- |
| Vide | → CHECK_IN (dans / hors fenêtre → late/review) |
| Après CHECK_IN | → BREAK_END (si pause configurée) ou CHECK_OUT |
| Après BREAK_END | → CHECK_OUT |
| Après CHECK_OUT | Aucun nouveau pointage « normal » (NONE / rejet) |

Hors fenêtre / trop tôt / départ anticipé : **REJECTED** au kiosk (messages existants), pas de ghost event timesheet.

---

## Contexte minimal d’un événement (présence réelle — amorcé)

Tout événement `ACCEPTED` ou `REVIEW_REQUIRED` doit pouvoir répondre (champs existants + `meta` / extensions M) :

| Question | Aujourd’hui | Cible |
| --- | --- | --- |
| Qui ? | `employeeId` | idem |
| Où ? | `branchId` (+ kiosk) | `locationId` (L) |
| Quand ? | `occurredAt` + `receivedAt` | idem |
| Par quel moyen ? | `authMethod`, `source`, `kioskId` | + page client / QR challenge id |
| Dans quel contexte ? | partiel (`meta`, wrongSite) | assignmentId, shiftId, missionId (A/D/M) |

Phase 0 : **pas de migration** — figer le contrat API de lecture et les tests sur les champs déjà là.

---

## Timesheet & paie

| Invariant | Détail |
| --- | --- |
| Timesheet dérive des événements **acceptés** (+ overrides explicites) | Pas de saisie d’heures parallèle comme source de vérité |
| Override timesheet | Motif + acteur ; plus tard audit J obligatoire |
| Paie | Consomme timesheets / agrégats ; ne réécrit pas les événements bruts |
| Recalcul | Autorisé ; doit être reproductible à partir des événements + overrides |

---

## Batterie de tests métier (Phase 0)

Étendre / structurer autour de `api` use-cases (`bun run test:use-cases`) et specs unitaires punch existantes.

### Scénarios minimum (cœur actuel)

| # | Scénario | Attendu |
| --- | --- | --- |
| 1 | Check-in dans fenêtre | `CHECK_IN` ACCEPTED |
| 2 | Check-in après fin fenêtre arrivée | `CHECK_IN` REVIEW (late) ou règle documentée |
| 3 | Check-in trop tôt | REJECTED |
| 4 | Double check-in | NONE / rejet |
| 5 | Check-out dans fenêtre | `CHECK_OUT` ACCEPTED |
| 6 | Départ anticipé au kiosk | REJECTED → claim |
| 7 | Break end dans fenêtre | `BREAK_END` |
| 8 | Check-out sans check-in | rejet / règle documentée |
| 9 | Idempotency-Key doublon | même résultat, pas 2 événements |
| 10 | Employé inactif | rejet |
| 11 | Wrong site (branch ≠ employee) | REVIEW `KIOSK_OTHER_SITE` |
| 12 | Overnight 22h→06h | work date correcte (tests existants à garder verts) |
| 13 | Offline sync dans max age | accepté avec source offline |
| 14 | Offline sync trop vieux | rejet selon settings |

### Règle de contribution

Toute PR touchant punch / timesheet / paie **doit** ajouter ou mettre à jour un test de cette batterie si elle change un invariant.

---

## Hors scope de ce document

- Modèle Location / affectation (L, A)
- Page client QR (D)
- Sous-système anomalies complet (I)
- GPS
- Centre de contrôle (N)

---

## Critères d’acceptation Phase 0

- [ ] Ce document relu et approuvé
- [ ] Liste des tests 1–14 mappée aux fichiers de test existants ou créés
- [ ] `docs/metier/planning-et-horaires.md` noté « gap C » (fallback defaultShift) sans le corriger encore
- [ ] Aucune feature structurante commencée avant specs H + L/A

---

## Décisions ouvertes (à trancher en Phase 1b / I)

1. Hors affectation demain : **refus dur** vs **REVIEW** (recommandation roadmap : configurable, défaut REVIEW pour migration douce) ?
2. Correction manuelle d’heure : **nouvel événement compensatoire** vs **override timesheet only** (recommandation : override timesheet + audit ; événement brut inchangé) ?

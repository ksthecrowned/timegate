# TimeGate — Locations + Affectation de présence — Design (L + A)

**Date** : 2026-09-24  
**Statut** : **approuvé** (2026-09-24) — prêt pour plan + implémentation Phase 1  
**Décisions** : Option R (`ShiftAssignment.locationId`) · hors-lieu = REVIEW · Branch admin / Location présence · Mission en Phase 2

---

## Objectif

Passer de :

```text
employé → branchId fixe → 1 kiosk/branche
```

à :

```text
employé → affectation (lieu + période + horaire) → pointage sur une borne du lieu
```

avec :

- **Location** = endroit où l’on peut pointer (≠ structure admin pure) ;
- **Branch** = structure administrative (peut *être* ou *référencer* une location de type branch) ;
- **Mission/Job** = travail effectué (≠ lieu) — **esquisse seulement** dans cette spec.

---

## Découpage conceptuel

```text
Company
  ├── Location (punchable)
  │     type: BRANCH_SITE | CLIENT_SITE | TEMPORARY
  │     1..N TimeGateKiosk          ← chantier B (N kiosks ; aujourd’hui 1/branch)
  │     geo optionnelle (lat/lng/radius)
  ├── Branch (admin RH / reporting)
  │     optionnellement linkedLocationId → Location type BRANCH_SITE
  ├── PresenceAssignment
  │     employee + location + shiftType + start/end (+ missionId?)
  ├── Mission (léger — Phase 2 / D)
  │     clientLabel, location, window, link token…
  ├── Department / Designation
  └── Employee
        homeLocationId? (ou conserver branchId comme home admin)
```

### Règles de non-confusion

| Concept | Est | N’est pas |
| --- | --- | --- |
| Location | Où pointer | Une mission, un département |
| PresenceAssignment | Autorisation de pointer ici pendant une période sur un horaire | Un contrat de travail |
| Mission/Job | Motif / prestation (Nettoyage nuit) | Le site client lui-même |
| Department | Orga RH | Équipe de travail / shift |
| Branch | Entité admin historique TimeGate | Obligatoirement le seul lieu de pointe |

---

## Migration depuis l’existant (principe)

Sans big-bang :

1. Pour chaque `Branch` existante → créer une `Location` `type=BRANCH_SITE`, `linkedBranchId = branch.id` (ou `Branch.locationId`).
2. Chaque `TimeGateKiosk` reste rattaché à la branche **et** pointe vers `locationId` (dénormalisé ou via branch→location).
3. Chaque `Employee.branchId` → `homeLocationId` = location de cette branche ; **et** créer une `PresenceAssignment` ouverte (startDate = dateOfJoining ou today, endDate null, shiftType = defaultShift ou org default).
4. Comportement mono-site **inchangé** pour les orgs sans `multi_locations`.

Wrong-site actuel (`employee.branchId !== kiosk.branchId` → REVIEW) devient :

```text
si kiosk.locationId ∈ locations couvertes par une PresenceAssignment active à T
  → OK (plus KIOSK_OTHER_SITE systématique)
sinon
  → REVIEW ou REJECT selon politique org (défaut: REVIEW pendant migration)
```

---

## Modèle de données proposé

### Location

| Champ | Type | Notes |
| --- | --- | --- |
| id | string | |
| companyId | string | |
| name | string | |
| type | enum | `BRANCH_SITE`, `CLIENT_SITE`, `TEMPORARY` |
| branchId | string? | lien admin si BRANCH_SITE |
| isActive | bool | |
| timeZone | string? | fallback company |
| address, lat, lng, checkinRadius | optionnel | geo pause / futur GPS |
| clientLabel | string? | pour CLIENT_SITE (nom client affiché) |

Quota : compte les locations `isActive` → `maxLocations` (H).

Capability : créer une 2e location exige `multi_locations` (sauf seed/migration).

### PresenceAssignment

Remplace / complète l’usage de `ShiftAssignment` comme **autorisation de présence**.

**Deux options — recommandation :**

**Option R (recommandée) :** étendre le rôle de `ShiftAssignment` en y ajoutant `locationId` (obligatoire à terme) + sémantique « présence » ; migrer les rows existantes avec location = home de l’employé.

**Option N :** nouvelle table `PresenceAssignment` et garder `ShiftAssignment` pour planning pur — plus clair mais double concept à expliquer.

→ **Choisir R** pour limiter le surface area en 60 jours, documenter le rename sémantique (« Affectation horaire » UI → « Affectation de présence »).

Champs cibles sur l’affectation :

| Champ | Notes |
| --- | --- |
| employeeId | |
| locationId | **nouveau** — lieu de pointe |
| shiftTypeId | horaire |
| shiftLocationId | zone *dans* le lieu (optionnel, existant) |
| startDate / endDate | période (null = ouverte) |
| missionId | optionnel — Phase 2 |
| companyId | |

Priorité résolution si plusieurs affectations couvrent le jour : single-day > bounded > open-ended (déjà la logique `findActiveAssignment`).

### Employee

| Champ | Transition |
| --- | --- |
| branchId | Conserver pour admin / filtres ; = « rattachement RH » |
| homeLocationId | Nouveau (ou dérivé branch→location) — lieu par défaut |
| defaultShiftId | Conservé — fallback C |

### Esquisse Mission (ne pas builder en Phase 1)

```text
Mission
  companyId, title, locationId (CLIENT_SITE),
  startAt/endAt ou dates,
  linkTokenHash, status (DRAFT|ACTIVE|CLOSED),
  … page QR en D
```

Lien optionnel `PresenceAssignment.missionId`.

Cost center : `String?` optionnel sur assignment ou mission — **plus tard**.

---

## Résolution punch (C inclus)

Ordre pour l’horaire au moment T :

```text
1. PresenceAssignment active couvrant workDate
      → shiftType (+ day exception)
2. Sinon employee.defaultShiftId
3. Sinon company.settings.defaultShiftTypeId
4. Sinon → legacy / rejet « horaires non configurés »
```

Doc `docs/metier/planning-et-horaires.md` doit être alignée (aujourd’hui elle affirme ce fallback ; le punch path assignment-only doit être corrigé **dans le même chantier**).

Autorisation lieu :

```text
kiosk.locationId doit matcher assignment.locationId active
  (ou homeLocation si aucune assignment — période de transition)
```

---

## API / UI

### Locations

- CRUD `/locations` (ADMIN) ; liste filtrable
- Capability gate + quota
- UI : remplacer progressivement le mental model « Branches = seuls sites de pointe » — branches restent pour admin ; locations pour présence

### Affectations

- UI existante `/shift-assignments` : ajouter **Lieu** obligatoire
- Planning : filtre par location
- Clôturer = `endDate` (pas delete employé)

### Kiosks (lien B)

- Provisioning : choisir location (et branch admin associée si besoin)
- Phase 1 peut encore imposer 1 kiosk/location si B pas fini — mais le modèle location doit déjà être là

---

## Règles produit Phase 1 (fin de phase)

L’org avec `multi_locations` doit pouvoir :

| Cas | Résultat |
| --- | --- |
| Employé permanent site A | Assignment ouverte location A |
| Renfort temporaire site B | Assignment datée location B (prime sur la période) |
| Pointe sur kiosk de B pendant assignment B | ACCEPTED |
| Pointe sur kiosk de C hors assignment | REVIEW (défaut) ou REJECT |
| Sans capability multi_locations | 1 seule location active (celle du siège) |

---

## Tests (avec invariants)

- [ ] Migration branch → location pour org seed
- [ ] Mono-site sans flag : comportement punch inchangé
- [ ] Assignment B active : punch B OK, punch A → REVIEW
- [ ] Fallback defaultShift si pas d’assignment (après fix C)
- [ ] Quota maxLocations
- [ ] Overnight + assignment location (régression)

---

## Hors scope Phase 1

- Page client QR (D)
- N kiosks monolitiques si B non mergé — au minimum modèle prêt
- GPS
- Cost centers / module projet
- Managers scopés (F) — consommera `locationId` plus tard

---

## Décisions validées (2026-09-24)

1. **Option R** : enrichir `ShiftAssignment` avec `locationId` (pas de nouvelle table PresenceAssignment).
2. Hors lieu : défaut **REVIEW** (migration douce), pas REJECT dur.
3. **Branch** reste visible en admin ; **Locations** = couche présence.
4. Table **Mission** seulement en Phase 2 (D).

Statut : **approuvé — prêt pour plan + implémentation Phase 1**.

---

## Critères d’acceptation

- [x] Spec approuvée (décisions 1–4 tranchées)
- [ ] Plan d’implémentation écrit (`docs/superpowers/plans/…`)
- [ ] Migration Prisma via plan task-by-task

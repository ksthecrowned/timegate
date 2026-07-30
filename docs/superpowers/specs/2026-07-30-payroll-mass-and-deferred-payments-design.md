# Masse salariale & paiements différés — Design

**Date :** 2026-07-30  
**Surface :** API Nest + Dashboard (ADMIN) + Copilot AI tools  
**Statut :** Approuvé en brainstorming — prêt pour plan d’implémentation

## Summary

TimeGate calcule déjà des cycles de paie (`payroll-runs`) et des lignes détaillées, mais :

1. **Aucun agrégat « masse salariale »** n’est exposé (détail, liste, home).
2. Le statut **`PAID` est global au cycle**, ce qui ne reflète pas la réalité terrain : groupes d’employés avec échéances différentes, paiement **individu par individu**, souvent sur des jours différents même à échéance égale.
3. Le **Copilot** n’a aucun tool paie.

Ce lot comble ces trous volontairement : totaux dénormalisés + paiements différés (groupes + override) + alertes + extension IA ADMIN.

## Goals

- Afficher la masse (brut, net, breakdown) sur **détail cycle**, **liste cycles**, **home ADMIN**.
- Permettre des **échéances** par groupe de paie, avec surcharge employé.
- Marquer le paiement **ligne par ligne** (cases à cocher + « tout sélectionner » explicite) ; `paidAt` propre à chaque employé.
- Savoir, pour une **branche** (ex. Brazzaville), si tout le monde est payé, sinon **qui** reste.
- **Alertes** approche d’échéance + retard : **inbox + e-mail**.
- Étendre le Copilot avec **9 tools paie** read-only (ADMIN).

## Non-goals

- Charges sociales / cotisations patronales.
- Multi-devise.
- Marquer payé via le Copilot (écriture).
- Prorata entrée/sortie avancé (hors scope déjà du refactor compensation).
- Lots bancaires / fichiers SEPA.
- Visibilité MANAGER sur la masse ou les montants (reste ADMIN-only, cohérent avec `/payroll-runs`).

## Décisions produit

| Sujet | Choix |
|-------|--------|
| Surfaces masse | Détail + liste + home (pas de trou volontaire) |
| Métrique | Brut + détail (bases, primes/majorations, pénalités/retenues) + net |
| KPI home | Dernier cycle figé `LOCKED` / `PARTIALLY_PAID` / `PAID` + sparkline brut 6 mois ; **pas** de DRAFT comme chiffre principal |
| Audience | **ADMIN seulement** |
| Stockage totaux | **Dénormalisés** sur `TimeGatePayrollRun`, recalculés dans `generateLines()` |
| Paiement différé | Même lot que la masse |
| Découpage échéances | **Groupes de paie** + surcharge employé |
| Acte de paiement | Échéances planifiées **et** marquage manuel ; toujours **individuel** |
| Sélection | Multi-select + « tout sélectionner » UI (pas de bypass opaque) |
| Alertes | Inbox + e-mail |
| IA | Toute la liste de tools paie (9) en MVP |

## Architecture retenue

### Masse salariale — approche 2 (dénormalisation)

À chaque génération/régénération des lignes (`generateLines`, y compris au lock), recalculer et persister sur le run :

- `totalBaseSalary`
- `totalFixedAllowances` / `totalFixedDeductions`
- `totalVariableAllowances` / `totalVariableDeductions`
- `totalOvertime` / `totalPenalties` (retards + absences agrégés comme aujourd’hui côté lignes)
- `totalGross` / `totalNet`
- `linesCount`
- `paidCount` / `unpaidCount` (mis à jour aussi à chaque marquage payé)

Lectures O(1) pour liste, détail, home, sparkline.

### Paiements différés — approche 2 (groupes + lignes)

- **`PayGroup`** : configuration company (nom, jour d’échéance du mois, défauts).
- **Employé** : `payGroupId` + `payDueDayOverride` optionnel (1–31 ou null).
- **`PayrollLine`** : `dueDate`, `paidAt`, `paymentStatus` (`UNPAID` | `PAID`).
- Au lock/génération : calculer `dueDate` à partir du groupe / override et du mois du run.
- Paiement : `POST mark-lines-paid` avec liste d’ids ; chaque ligne reçoit son `paidAt` (date fournie ou now).
- Statut run dérivé :
  - `DRAFT` — calcul non figé
  - `LOCKED` — figé, 0 payé
  - `PARTIALLY_PAID` — au moins une ligne payée, pas toutes
  - `PAID` — toutes les lignes payées  
  (Migrer/étendre l’enum `TimeGatePayrollRunStatus` ; conserver compatibilité des écrans existants.)

## Modèle de données (MVP)

### `PayGroup` → `timegate_pay_group`

- `id`, `companyId`, `name`, `payDayOfMonth` (Int 1–28 recommandé pour éviter ambiguïté fin de mois ; documenter le clamp si jour > derniers jours du mois)
- `createdAt`, `updatedAt`
- Index `companyId`

### `Employee` (extension)

- `payGroupId` nullable FK → `PayGroup`
- `payDueDayOverride` nullable Int

### `TimeGatePayrollLine` (extension)

- `dueDate` Date?
- `paidAt` DateTime?
- `paymentStatus` enum `UNPAID` | `PAID` (défaut `UNPAID`)
- Index `(payrollRunId, paymentStatus)`, `(payrollRunId, dueDate)`

### `TimeGatePayrollRun` (extension)

- Colonnes totaux listées ci-dessus (Decimal)
- `paidCount`, `unpaidCount` Int
- Statut étendu avec `PARTIALLY_PAID`

### Notifications

Nouveaux `TimeGateNotificationType` :

- `PAYROLL_DUE_SOON`
- `PAYROLL_OVERDUE`

Règles company existantes + envoi mail via `MailService` (même pattern que les autres notifs).

## API

Toutes les routes paie/groupes : **ADMIN** + `OperationalAccessGuard` (comme aujourd’hui).

| Méthode | Route | Rôle |
|---------|-------|------|
| CRUD | `/pay-groups` | Groupes de paie |
| PATCH | `/employees/:id` (champs pay group) | Affectation |
| GET | `/payroll-runs`, `/payroll-runs/:id` | Inclure `totals` + `paymentProgress` |
| GET | `/payroll-runs/:id/lines` | Filtres : `branchId`, `payGroupId`, `paymentStatus`, `dueFrom`, `dueTo` |
| GET | `/payroll-runs/:id/payment-summary-by-branch` | Agrégat payé/non payé par branche + ids non payés (ou embed) |
| POST | `/payroll-runs/:id/mark-lines-paid` | Body `{ lineIds: string[], paidAt?: string }` |
| — | `GET /dashboard/home` | Si ADMIN : `kpis.payrollMass` + `payrollMassSeries` (6 mois) |

**Erreurs**

- Marquer payé si run `DRAFT` → `400`
- `lineIds` hors run / autre company → `404` / ignore scoped
- Ligne déjà `PAID` → no-op idempotent (compte inchangé) ou skip silencieux ; documenter idempotence
- Tool IA si rôle ≠ ADMIN → non exposé / refus

## UX Dashboard

### Nav Paie

- Cycles de paie  
- Grille salariale  
- **Groupes de paie** (nouveau)

### Fiche employé

- Champ groupe de paie + jour d’échéance override

### Détail cycle

- Bandeau masse (brut, net, breakdown, progression paiement)
- Table avec checkboxes, filtres (branche, groupe, statut paiement, échéance)
- Actions : Tout sélectionner (page filtrée), Marquer payé
- Panneau / section « Par branche » : % payé + liste des non servis

### Liste cycles

- Colonnes brut, net, progression (ex. `12/40 payés`)

### Home (ADMIN)

- Carte « Masse salariale » : montant brut (ou brut+net) du dernier cycle figé, période, statut, sparkline 6 mois, lien `/payroll-runs`

### Alertes

- Job quotidien (cron existant / schedule Nest) :
  - `PAYROLL_DUE_SOON` : J-3 et J-1 (paramètres company simples, défauts fixes MVP)
  - `PAYROLL_OVERDUE` : J+1 si encore `UNPAID` sur run non-DRAFT
- Destinataires : admins company (même résolution que notifs RH sensibles)
- Canaux : notification in-app + e-mail

## Copilot AI (ADMIN only)

Neuf tools **read-only**, scoped `companyId`, deep links dashboard :

| # | Tool | Question type |
|---|------|----------------|
| 1 | `get_payroll_mass` | Masse d’un mois / dernier cycle figé + breakdown |
| 2 | `get_payroll_payment_status` | Qui n’est pas payé (filtres branche / groupe / échéance) |
| 3 | `get_payroll_due_alerts` | Échéances proches + en retard |
| 4 | `list_payroll_runs` | Cycles et statuts |
| 5 | `compare_payroll_months` | Mois A vs B (écarts) |
| 6 | `get_payroll_by_branch` | Masse / restant par branche |
| 7 | `get_pay_groups` | Groupes, jour, effectifs |
| 8 | `get_employee_compensation` | Grille + majorations d’un employé |
| 9 | `get_upcoming_pay_dues` | Échéances des N prochains jours |

Suggestions Copilot : chips du type « Qui n’a pas été payé à Brazzaville ? », « Masse juillet vs juin ».

## Data flow

```text
PayGroup + Employee override
        ↓
generateLines() / lock
        ↓
PayrollLine (montants + dueDate, UNPAID)
        ↓
recompute run.totals
        ↓
mark-lines-paid (lineIds)
        ↓
paidAt + PAID → recompute paidCount / run status
        ↓
cron → PAYROLL_DUE_SOON / OVERDUE → inbox + mail
```

## Migration / compatibilité

- Runs existants : backfill totaux via script ou à la prochaine `generateLines` ; `paymentStatus=UNPAID`, `dueDate` null jusqu’au prochain lock/regen ou backfill depuis groupes.
- `mark-paid` global actuel sur le run : remplacer progressivement par paiement lignes ; tant que toutes les lignes ne sont pas payées, ne plus passer le run à `PAID` d’un coup sauf action explicite « marquer toutes les lignes » (= select all + mark).
- Ancien bouton « Marquer payé » cycle entier → devient confirmation « marquer **toutes** les lignes non payées » ou disparaît au profit du flux checkbox.

## Testing

- Unit : calcul `dueDate` (jour 31 → clamp), dérivation statut run, agrégation totaux.
- API : CRUD pay groups ; mark partial ; filtres lines ; payment-summary-by-branch ; home KPI ADMIN only.
- Notifs : due soon / overdue créées une fois (pas de spam — dédup par type+line+jour).
- IA : tools refusés pour MANAGER ; réponses ADMIN avec company scope.
- UC dashboard smoke : lock → partiel branche A → KPI progression.

## Open parameters (defaults MVP, ajustables plus tard)

- Jours d’alerte : J-3, J-1, J+1  
- `payDayOfMonth` max recommandé : 28  
- Sparkline : 6 mois calendaires glissants  

## Success criteria

- Un ADMIN voit la masse sans ouvrir Excel ni sommer les lignes.
- Il peut payer Brazzaville en plusieurs jours, voir qui reste, et être alerté avant/après échéance.
- Le Copilot répond aux questions masse / impayés / comparaison de mois sans accès MANAGER aux montants.

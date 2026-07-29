# Refondre la paie : base contractuelle vs paie mensuelle figée (par run/cycle)

## Summary
TimeGate doit distinguer clairement :
1. **Base contractuelle** (stable, dérivée de *poste + type de contrat*, avec majorations fixes employé).
2. **Paie mensuelle** (résultat calculé à partir du réel : heures/absences/retards/heures sup + primes/ajouts mensuels, puis figé au niveau du cycle `run`).

Objectif : supprimer l’ambiguïté et la double saisie autour de `/salaries`, tout en gardant une migration progressive sans “big-bang” risqué.

## Non-goals (pour ce design)
- Refaire complètement le calcul complet paie/HS déjà présent dans `payroll-runs`.
- Construire un moteur de paie universel type “rules engine” multi-pays (on reste au MVP).
- Gestion complète entrée/sortie au prorata (on le garde pour une phase ultérieure si nécessaire).

## Problème actuel (diagnostic)
- `/salaries` ressemble à une “paie mensuelle”, alors que le calcul du cycle/HS/absences se fait dans `payroll-runs`.
- Cela provoque confusion RH, incohérences de chiffres et incite à saisir des montants “mensuels” qui ne sont pas la base contractuelle.

## Proposition de modèle de données (MVP)

### 1) Grille de rémunération (référence)
**`compensation_grid`**
- `id`
- `companyId`
- `designationId` (poste)
- `employmentTypeId` (type contrat)
- `baseSalary`
- `effectiveFrom`, `effectiveTo` (historisation)
- Contraintes :
  - unicité “version” (ex. `(companyId, designationId, employmentTypeId, effectiveFrom)`)
  - pas de chevauchement de périodes actives sur une même combinaison

### 2) Majorations fixes par employé
**`employee_compensation_items`**
- `id`
- `employeeId`
- `label`
- `kind` = `ALLOWANCE` | `DEDUCTION`
- `amount`
- `isRecurring` (true pour fixe récurrent au MVP)
- `effectiveFrom`, `effectiveTo`
- `isActive`

### 3) Variables/primes mensuelles (résultat de paie)
**`payroll_variable_items`**
- `id`
- `employeeId`
- `payrollRunId` (ou `(year, month)` si run pas encore modélisé)
- `label`
- `kind` = `ALLOWANCE` | `DEDUCTION`
- `amount`
- `source` (ex. `MANUAL`, `AUTO_RULE`)
- `notes`

### 4) Lignes de paie (snapshot figé au cycle)
**`payroll_run_lines`**
- `payrollRunId`
- `employeeId`
- `baseSnapshot` (ou base calculée à ce moment)
- `fixedAllowancesTotal`
- `variableAllowancesTotal`
- `penaltiesTotal` (retards/absences)
- `overtimeTotal` (selon le calcul existant dans `payroll-runs`)
- `gross`, `net`
- `status` = `DRAFT | CALCULATED | VALIDATED | PAID`
- journal / audit (au minimum : `paidAt`, et dates de statut)

## Workflow (run/cycle unique comme source de vérité)
1. **DRAFT** : création du cycle mensuel
2. **CALCULATED** : génération des `payroll_run_lines` à partir du réel
3. **VALIDATED** : validation RH, gel des résultats
4. **PAID** : marquage paiement (`paidAt`)

### Décision clé
La paie “mensuelle” est **figée uniquement au niveau run/cycle**.
`/salaries` (ou la nouvelle vue “paie du mois”) affiche des informations issues du run (et non un formulaire de base mensuelle).

## Règles de calcul (ordre d’application)
1. **Base contractuelle** via `compensation_grid` (poste + type contrat + période effective)
2. **Majorations fixes employé** actives pendant la période
3. **Variables mensuelles** (primes/retenues mensuelles) si configurées
4. **Pénalités retards/absences** issues des modules existants
5. **Heures sup** selon le calcul présent dans `payroll-runs`
6. Génération snapshot dans `payroll_run_lines`

## UX / Réorganisation des pages
- Remplacer progressivement l’usage de `/salaries` :
  - soit en **“Paie du mois”** pilotée par `payroll-runs`
  - soit via des onglets “Contrat (base)” vs “Paie (run snapshot)”
- `payroll-runs` reste l’endroit où l’on “calcule puis verrouille”.
- `Contrat` (base) : modifications = impactent les runs futurs (pas les runs déjà figés).

## Migration progressive (sans casse)
Phase 1 :
- Introduire `compensation_grid` + UI minimale de mise à jour.
- Conserver `/salaries` en lecture limitée / legacy pour éviter rupture immédiate.
Phase 2 :
- Faire générer le net de paie mensuelle via `payroll_run_lines` (source vérité).
Phase 3 :
- Nettoyer l’UX et retirer définitivement l’édition mensuelle de base.

## Questions ouvertes
1. La “période effective” (date de run) : **période range** (`periodStart`/`periodEnd`) au MVP.
2. Où stocker les pénalités exactes (retards/absences) : **les deux** (détail par type + total agrégé dans `payroll_run_lines`) au MVP.
3. Prorata entrées/sorties : **au MVP**, prorata exact par heures prévues vs heures réellement prises/validées.


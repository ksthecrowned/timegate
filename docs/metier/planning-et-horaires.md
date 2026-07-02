# TimeGate — Planning, horaires & emplacements

Guide métier pour les administrateurs du dashboard TimeGate.

## Vue d’ensemble

| Concept | Rôle |
|---------|------|
| **Horaire type** (`ShiftType`) | Modèle de journée : heures début/fin, fenêtres de pointage, pause |
| **Affectation** (`ShiftAssignment`) | Lie un **employé** à un horaire sur une **période** |
| **Jour ouvré** (`WorkDay`) | Jours de la semaine où un horaire s’applique (ex. lun–ven) |
| **Emplacement horaire** (`ShiftLocation`) | Zone physique dans une branche (optionnel) |
| **Planning équipe** | Calendrier mensuel : affectations + congés + fériés |

---

## Horaires types (`/shift-types`)

Un horaire définit :

- **Heures contractuelles** : `startTime` / `endTime` (ex. 08:00–17:00)
- **Fenêtres de pointage** (onglet « Fenêtres pointage ») :
  - Arrivée (`CHECK_IN`) — ex. 07:00–12:00
  - Pause — plage + durée auto-déduite
  - Départ (`CHECK_OUT`) — à partir de la fin de shift
- **Branche** : chaque horaire est rattaché à une branche

L’employé utilise son **horaire par défaut** (`defaultShift` sur la fiche) sauf s’il a une **affectation** active ce jour-là.

---

## Affectations (`/shift-assignments`)

Une affectation précise :

- **Employé** + **Horaire type**
- **Période** optionnelle (`startDate` / `endDate`)
- **Emplacement** optionnel (`shiftLocationId`)

**Priorité** : pour un jour donné, si une affectation couvre la date → elle prime sur l’horaire par défaut de l’employé.

Utilisez les affectations pour :

- Plannings variables (équipe de nuit une semaine sur deux)
- Renforts temporaires sur un autre site

---

## Jours ouvrés (`/work-days`)

Relie un **horaire type** à un **jour de la semaine** (lundi, mardi…).

Complète les affectations pour les plannings récurrents au niveau de l’horaire, pas de l’employé.

---

## Emplacement horaire sur le kiosk

### Qu’est-ce que c’est ?

Un **emplacement horaire** est une zone nommée dans une branche (ex. « Entrée principale », « Entrepôt B »). Il peut porter des coordonnées GPS et un rayon pour la géoloc (reprise pause employee-app).

### À quoi ça sert sur le kiosk ?

Sur la fiche kiosk (`/kiosks`), le champ **Emplacement horaire** (optionnel) restreint **quels employés** peuvent pointer sur ce terminal :

- **Vide** → tous les employés de la **branche** du kiosk (comportement le plus courant)
- **Renseigné** → employés ayant une affectation sur cet emplacement **ou** appartenant à la branche (selon règles API)

Ce n’est **pas** la position GPS du kiosk lui-même : c’est un **filtre d’éligibilité** pour éviter qu’un kiosk « entrepôt » accepte des visages de l’open space.

### Création des emplacements

Les emplacements se gèrent via l’API `POST /shift-locations` (UI dédiée à venir ; redirection actuelle vers `/branches`). Contactez l’administrateur plateforme ou utilisez le seed de démo.

---

## Planning équipe (`/planning`)

Vue **mensuelle** avec deux onglets :

1. **Planning** — nombre d’affectations actives par jour + noms
2. **Congés équipe** — congés approuvés et en attente

Filtre par **branche**. Les managers disposent aussi d’un calendrier congés dédié : `/manager/leaves`.

---

## Chaîne de résolution (pointage)

Pour un employé qui pointe à l’instant T :

```text
Congé approuvé ce jour ? → pas de pointage attendu
Jour férié ? → selon règles tenant
Affectation active ce jour ? → horaire de l’affectation
Sinon → defaultShift de l’employé
Sinon → horaire fallback tenant (/organization/attendance-settings)
```

Les **fenêtres** de l’horaire résolu déterminent si le scan devient `CHECK_IN`, `BREAK_END`, `CHECK_OUT` ou est refusé.

---

## Liens dashboard

| Page | URL |
|------|-----|
| Horaires | `/shift-types` |
| Affectations | `/shift-assignments` |
| Jours ouvrés | `/work-days` |
| Planning | `/planning` |
| Kiosques | `/kiosks` |
| Paramètres pointage | `/organization/attendance-settings` |

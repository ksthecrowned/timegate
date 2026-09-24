# Audit de compatibilité fonctionnelle par secteur

> **Interne TimeGate** — ne pas transmettre au client.  
> Date : 23 septembre 2026  
> Périmètre : état actuel du produit (schéma Prisma, API attendance/planning/kiosk, dashboard UI).  
> Aucune modification de code associée à cet audit.

**Verdict global :** TimeGate est **prêt pour des pilotes mono-site à horaires stables** (bureaux, formation). Il **casse** dès qu’il faut des **rotations multi-sites / missions clients**.

---

## Constats transverses

Ces points conditionnent presque tous les profils :

1. **Site employé = `branchId` fixe** — pas d’affectation site datée. Pointer ailleurs → événement `REVIEW_REQUIRED` (`KIOSK_OTHER_SITE`), pas un workflow d’affectation.
2. **1 kiosk max par branche** (`TimeGateKiosk.branchId` unique) — 10 sites clients = 10 bornes ; 2 bornes sur le même site = fausse 2ᵉ branche.
3. **`ShiftAssignment` = horaire + période** (+ emplacement optionnel) — **pas** employé → site/client → mission.
4. **Pointage résolu via affectation horaire**, pas via `defaultShift` (doc métier vs code : écart).
5. **Nuit / minuit** : supportés dans le moteur de punch (tests) ; le périmètre pilote les listait encore comme exclus — à valider terrain, pas à considérer « produit mature ».
6. **Équipes / superviseurs** : départements + désignations OK ; `TimeGateUserBranch` existe en schéma mais **n’est pas utilisé** → managers non scopés par site.
7. **Contrats** : `EmploymentType` = libellé libre (CDI/CDD) ; `TimeGateEmployeeContract` = document daté (`isCurrent`), pas type juridique ni mission client.

---

## Audit par secteur

### Entreprise de bureaux

**Compatibilité actuelle :**

* 🟢 bonne

**Ce qui fonctionne déjà :**

* Org → 1 branche → employés → horaire fixe → affectation → kiosk → pauses (borne / reprise téléphone si geo) → congés → timesheets / présence

**Ce qui pose problème :**

* Peu de friction si vraiment 1 site / 1 borne
* « Équipe » = département libre, pas de notion d’équipe de travail

**Contournements éventuellement nécessaires :**

* Aucun majeur

**Fonctionnalités manquantes :**

* Mineures (rapports plus riches, multi-bornes entrée/accueil)

**Impact :**

* mineur

---

### Centre de formation

**Compatibilité actuelle :**

* 🟢 bonne

**Ce qui fonctionne déjà :**

* Départements (formateurs / admin / tech) + désignations
* Types de contrat en libellés (CDI, CDD, stagiaire)
* Horaires fixes, retards (`lateAbsent` → revue), absences, congés

**Ce qui pose problème :**

* Contrats « métier » (durée CDD, renouvellement, fin de stage) peu structurés hors dates document + notes
* Si formateurs ponctuels multi-salles : pas de planning de mission, seulement horaire

**Contournements éventuellement nécessaires :**

* Stagiaire = `EmploymentType` + `includeInPayroll` / `accruesLeave` à false

**Fonctionnalités manquantes :**

* Cycle de vie contrat typé (hors document)

**Impact :**

* mineur

---

### Entreprise industrielle / atelier

**Compatibilité actuelle :**

* 🟡 partielle

**Ce qui fonctionne déjà :**

* Plusieurs `ShiftType` (prod / maintenance / admin) + affectations
* Atelier + bureaux = **2 branches** (et donc 2 kiosks) ou 1 site si tout le monde pointe au même endroit
* Pauses, retards, HS calculées timesheet / paie (seuil alerte)

**Ce qui pose problème :**

* 2 bornes sur un même site physique → contrainte 1 kiosk/branche
* Passage atelier ↔ bureau = changement de `branchId` ou revue manuelle permanente
* HS : calcul technique OK, règles métier (majoration, validation) limitées

**Contournements éventuellement nécessaires :**

* Créer « Atelier » et « Bureaux » comme 2 branches artificielles
* Affectations horaires pour rotations d’équipes (pas de planning rotatif avancé)

**Fonctionnalités manquantes :**

* Multi-terminaux / même site ; affectation site temporaire

**Impact :**

* important

---

### Société de sécurité

**Compatibilité actuelle :**

* 🔴 faible

**Ce qui fonctionne déjà :**

* Shifts 06–14 / 14–22 / 22–06 en `ShiftType` (nuit : end ≤ start dans le moteur)
* Plusieurs branches = sites
* Superviseur = rôle `MANAGER` (company-wide)

**Ce qui pose problème :**

* Agent rattaché à **un** site fixe ; rotation sites = revue `KIOSK_OTHER_SITE` ou édition manuelle du `branchId`
* 20 agents / 10 sites → 10 kiosks obligatoires + ops lourdes
* Pas d’affectation mission/période ; pas de responsable par site (`TimeGateUserBranch` non branché)
* Face match company-wide : un agent peut matcher sur n’importe quel kiosk de l’org, puis review

**Contournements éventuellement nécessaires :**

* Une org par grand client (anti-pattern SaaS)
* Changer le site de l’agent chaque rotation (incohérent historiquement)
* Accepter une file de validations manager saturée

**Fonctionnalités manquantes :**

* Affectation site/mission datée ; multi-sites opérationnel ; managers par site ; éventuellement multi-kiosks

**Impact :**

* bloquant

---

### Entreprise de nettoyage

**Compatibilité actuelle :**

* 🔴 faible

**Ce qui fonctionne déjà :**

* Base = 1 branche + kiosk pour le siège
* Horaires / congés classiques pour le personnel « fixe »

**Ce qui pose problème :**

* Sites clients ≠ modèle Branch (ou alors chaque client = branche + kiosk)
* Équipes envoyées chez clients + changements d’affectation : **hors modèle**
* Arrivée/départ exigent un terminal sur place — téléphone ≠ check-in (seulement reprise pause + QR de secours **sur** kiosk)
* Sans kiosk chez le client → pas de pointage terrain crédible

**Contournements éventuellement nécessaires :**

* Clients = branches + kiosk portable déplacé (fragile)
* Pointer seulement à la base (mensonge métier)

**Fonctionnalités manquantes :**

* Mission client + période ; pointage sur site client sans fausse branche ; éventuellement géofence mission

**Impact :**

* bloquant

---

### Société de placement / mise à disposition

**Compatibilité actuelle :**

* 🔴 faible

**Ce qui fonctionne déjà :**

* Admin interne comme org classique
* Contrats documents successifs (`isCurrent`) + types d’emploi libres
* Congés pour le personnel admin

**Ce qui pose problème :**

* Aucune entité Client / Mission / Fin de mission
* Employé placé chez un client : site « client » non représentable proprement
* Fin de mission ≠ statut RH clair (sinon `INACTIVE` manuel)
* Rapports « heures chez client X » impossibles sans détourner branches

**Contournements éventuellement nécessaires :**

* Notes libres sur contrat ; un `branchId` = un client (pollue le modèle site)
* Plusieurs orgs (une par client) — casse paie / RH unifiée

**Fonctionnalités manquantes :**

* Client + mission + période + fin de mission ; contrats liés à une mission

**Impact :**

* bloquant

---

### Clinique

**Compatibilité actuelle :**

* 🟡 partielle

**Ce qui fonctionne déjà :**

* Départements (médecins, infirmiers, admin, entretien) + désignations
* Horaires de journée + shifts nuit (moteur overnight)
* Congés, retards, absences, 1 site / 1 kiosk

**Ce qui pose problème :**

* Gardes / passage minuit : code OK, maturité UI + ops à prouver (doc pilote encore prudent)
* Plusieurs services / 2 bornes (urgences + admin) → contrainte 1 kiosk/branche
* Pas d’équipes de garde structurées (seulement affectations horaires)

**Contournements éventuellement nécessaires :**

* Un kiosk central pour tout le personnel
* Affectations journalières pour plannings de garde

**Fonctionnalités manquantes :**

* Planning de garde / équipes ; multi-terminaux ; validation overnight en conditions réelles

**Impact :**

* important

---

### Hôtel

**Compatibilité actuelle :**

* 🟡 partielle

**Ce qui fonctionne déjà :**

* Départements (réception, housekeeping, restaurant, maintenance, sécurité)
* Plusieurs horaires / shifts matin–après-midi–nuit
* Congés, pauses, présence, rapports mono-site

**Ce qui pose problème :**

* « Responsable par département » : pas de scope manager (`MANAGER` voit toute l’org)
* Plusieurs points de pointage (réception + cuisine + back) → 1 kiosk/site
* Équipes de travail ≠ départements (rotation intra-département)

**Contournements éventuellement nécessaires :**

* Un seul kiosk « staff entrance »
* Désignations « Superviseur réception » sans pouvoir réel de scope

**Fonctionnalités manquantes :**

* Managers / superviseurs par département ou branche ; multi-terminaux

**Impact :**

* important

---

## Matrice globale

| Fonctionnalité | Bureau | Formation | Industrie | Sécurité | Nettoyage | Placement | Clinique | Hôtel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 site | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| Multisite | 🟡 | 🟡 | 🟡 | 🔴 | 🔴 | 🔴 | 🟡 | 🟡 |
| Horaires fixes | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| Horaires multiples | 🟢 | 🟢 | 🟢 | 🟢 | 🟡 | 🟡 | 🟢 | 🟢 |
| Équipes | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Shifts | 🟢 | 🟢 | 🟢 | 🟡 | 🟡 | 🟡 | 🟢 | 🟢 |
| Shift de nuit | 🟢 | 🟢 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Passage minuit | 🟢 | 🟢 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Pauses | 🟢 | 🟢 | 🟢 | 🟢 | 🟡 | 🟡 | 🟢 | 🟢 |
| Congés | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| Contrats multiples | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🔴 | 🟡 | 🟡 |
| Affectations | 🟡 | 🟡 | 🟡 | 🔴 | 🔴 | 🔴 | 🟡 | 🟡 |
| Changement de site | 🟡 | 🟡 | 🟡 | 🔴 | 🔴 | 🔴 | 🟡 | 🟡 |
| Plusieurs terminaux | 🟡 | 🟡 | 🟡 | 🔴 | 🔴 | 🔴 | 🟡 | 🟡 |
| Appareil vérifié | 🟢 | 🟢 | 🟢 | 🟡 | 🟡 | 🟡 | 🟢 | 🟢 |
| QR de secours | 🟢 | 🟢 | 🟢 | 🟡 | 🟡 | 🟡 | 🟢 | 🟢 |
| Rapports | 🟢 | 🟢 | 🟢 | 🟡 | 🟡 | 🟡 | 🟢 | 🟢 |

Légende : 🟢 supporté · 🟡 partiel · 🔴 non supporté

---

## Synthèse

### 1. Secteurs testables immédiatement

Sans modification majeure du produit :

* **Entreprise de bureaux**
* **Centre de formation**

Alignés avec le cadrage pilote actuel (1 site, 5–20 employés).

### 2. Secteurs stress test (révèlent les limites)

* **Sécurité** — multisite + rotation agents (casse le modèle)
* **Nettoyage** — sites clients + terminal obligatoire
* **Placement** — absence totale client/mission
* Ensuite **Clinique** (nuit/minuit) et **Hôtel** / **Industrie** (multi-équipes, multi-bornes)

### 3. Lacunes communes (génériques)

| Lacune | Secteurs touchés |
| --- | --- |
| Site employé fixe + review cross-site | Sécurité, nettoyage, placement, industrie |
| 1 kiosk / branche | Tous dès 2 bornes ou N sites |
| Affectation = horaire, pas mission/site | Sécurité, nettoyage, placement |
| Pas d’équipes / managers scopés | Hôtel, clinique, sécurité, industrie |
| Contrats = document + libellé, pas cycle mission | Placement, formation, tous |
| `defaultShift` ≠ résolution punch | Config RH / tous |
| Téléphone ≠ check-in/out | Nettoyage, sécurité terrain |

### 4. Évolutions prioritaires

#### Bloquant pour un pilote (si cible ≠ bureaux / formation)

* Affectation **site/mission + période** (au-delà de `ShiftAssignment` horaire)
* Politique claire : pointage hors site home = accepté si affecté (pas review permanente)
* Assouplir **1 kiosk / branche** (au moins N kiosks / branche)

#### Important avant commercialisation

* Fallback punch réel sur `defaultShift` / défaut org
* Activer le scope managers (`TimeGateUserBranch` ou équivalent)
* Distinguer **équipe de travail** vs département
* Type de contrat métier (CDI/CDD/stage) + historique propre
* UI emplacements (`/shift-locations` redirige encore vers `/branches`)

#### Amélioration ultérieure

* Clients externes / missions placement & nettoyage
* Planning rotatif / gardes
* HS paramétrables métier
* Superviseurs par département
* Multi-pays / fuseaux (déjà hors périmètre pilote)

---

## Références code / docs

| Sujet | Emplacement |
| --- | --- |
| Modèles Branch / Employee / Shift / Kiosk / Contract | `api/prisma/schema.prisma` |
| Pointage autre site → review | `api/src/attendance/attendance-punch-recorder.service.ts` |
| Résolution fenêtres (assignments) | `api/src/attendance/punch-window.service.ts` |
| Overnight / minuit | `api/src/common/utils/punch-time.util.ts`, tests punch |
| Guide métier planning | `docs/metier/planning-et-horaires.md` |
| Périmètre pilote client | `docs/pilot/remise-client/01-perimetre.md` |

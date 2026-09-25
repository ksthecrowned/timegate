# Analyse — Rattrapage employee-app (vs attentes + Socium)

> Interne TimeGate · 25 septembre 2026  
> Contexte concurrent : [`concurrent-socium.md`](./concurrent-socium.md)  
> Positionnement : [`positionnement-marche.md`](./positionnement-marche.md)  
> Contrainte produit : [`../pilot/interne/feuille-de-route-multisecteurs.md`](../pilot/interne/feuille-de-route-multisecteurs.md) — **pas de feature-parity suite RH** ; GPS **pas maintenant**.

---

## 1. Diagnostic en une page

Le retard n’est **pas** « il manque 20 modules Socium ».  
C’est un **décalage de promesse** :

| Couche | État TimeGate |
|--------|----------------|
| **Moteur présence** (API + kiosk) | Fort — différenciant |
| **Dashboard RH / paie** | Opérationnel côté admin |
| **employee-app** | Portail **partiel** : bon pour pointer / demander un congé, faible pour **vivre** le quotidien RH |

Socium gagne la guerre de **l’écran d’accueil employé** (bulletin, congés, avance, annuaire, pointage QR/GPS).  
TimeGate gagne celle du **registre vérifiable** — mais l’employé ne **voit** presque jamais ce registre sous forme digeste (timesheet, heures période, prochain impact paie).

**Verdict :** rattraper = rendre l’app **quotidienne et lisible**, en exposant ce que le backend sait déjà, **sans** devenir une suite RH.

---

## 2. Inventaire factuel (aujourd’hui)

### 2.1 Ce que l’employee-app expose

| Domaine | Écrans / flux | Maturité |
|---------|---------------|----------|
| Accueil jour | Statut dérivé des events + schedule, CTA primaire (QR / pause / planning) | Moyen — bon squelette, peu de « valeur du jour » |
| Pointage QR + offline queue | `/qr-punch`, sync | **Fort** |
| Reprise pause | `/break-resume` | Fort |
| Historique events | `/attendance` (liste brute 7/30/90 j) | Moyen — events ≠ feuille de temps |
| Réclamations pointage | `/punch-claim-request` | Fort (création) ; suivi des claims faible |
| Planning | `/planning` | Moyen+ |
| Congés | demandes, soldes, types, onglet leave | Moyen+ |
| Échanges de shifts | onglet + request | Moyen (dépend liste collègues) |
| Messages | onglet + threads | Moyen |
| Notifications | inbox | Moyen (surtout orientées manager côté notifs paie) |
| Profil / mdp | edit, password | OK |
| Contrats PDF | `/contracts` | OK (étroit) |
| Trusted device | banner / blocage gestes sensibles | **Fort** (différenciant) |

### 2.2 Portail API employé (`/employee/*`)

Exposé aujourd’hui : `me`, checkins, attendance-events, punch-claims, contracts, leaves, leave-balances, leave-types, shift-swaps, qr-punch, break-resume, today-schedule.

**Absent du portail employé** (alors que le domaine existe côté admin) :

| Domaine backend | Existe pour ADMIN/MANAGER | Visible employé |
|-----------------|---------------------------|-----------------|
| Timesheets (`/timesheets`) | Oui | **Non** |
| Lignes / runs de paie | Oui | **Non** |
| Avances (`salary-advances`) | Oui (CRUD admin) | **Non** (pas de self-service) |
| Anomalies (file unifiée) | Oui | **Non** (employé voit au mieux `REVIEW_REQUIRED` sur un event) |
| Documents RH hors contrats | Partiel | **Non** |
| Annuaire dédié | `GET /employees` sans `@Roles` → JWT employé peut lister | **Pas d’UI** ; API non conçue pour annuaire (trop large / sensible) |
| Pointage GPS autonome | Slot `VerificationContext` | **Reporté** volontairement |

### 2.3 Écart pitch ↔ app

Le pitch Afritech promet : *« Congés, swaps et réclamations depuis l’app… en fin de cycle, les temps préparent la rémunération. »*

L’employé **ne voit pas** la fin de la chaîne. Il pointe, demande, et s’arrête. La boucle confiance (heures → timesheet → paie) reste **côté RH**.

---

## 3. Matrice d’écarts (profondeur)

Légende effort : **S** surface UI · **M** API portail + UI · **L** nouveau produit.

| Attente « normale » / Socium mobile | Gap TimeGate | Nature | Effort | Aligné cœur produit ? |
|-------------------------------------|--------------|--------|--------|------------------------|
| Home : statut + prochain geste + 3–4 raccourcis utiles | Home OK technique, pauvre en **valeur** (pas d’heures semaine, pas de solde mis en avant, pas de paie) | UX + agrégats | **S–M** | **Oui** |
| « Mes heures » / feuille de temps période | Seulement liste d’events | API manquante côté employé | **M** | **Oui — critique** |
| Voir si un jour est en revue / anomalie | Badge event, pas de fil « à traiter / en attente RH » | UI + éventuellement `/employee/anomalies` read-only | **M** | **Oui** |
| Suivi réclamations (statut) | Création seulement | UI sur `GET punch-claims` déjà là | **S** | **Oui** |
| Prochaine paie / net / bulletin | Absent | Nouveau surface ; données admin existent après LOCK | **M–L** | **Oui** si lecture seule (prépare ≠ paie légale) |
| Demande d’avance | Spec + API admin ; pas self-service | Produit | **M–L** | Moyen — utile commercialement, pas cœur présence |
| Annuaire collègues | Picker swap via `/employees` ; pas d’écran | Endpoint safe (id, nom, branche) + UI | **S–M** | Moyen |
| Documents RH (coffre) | Contrats seulement | Hors cœur | **L** | **Non** (ne pas prioriser vs Socium Doc) |
| Pointage GPS sans borne | Reporté feuille de route | — | — | **Non maintenant** |
| ATS / GPEC / ASSIA | N/A | — | — | **Hors scope** |
| Offline app large (congés, planning) | Offline QR seulement | Stratégique terrain | **L** | Plus tard ; offline **punch** déjà prioritaire |

### Lecture

Le trou le plus coûteux commercialement n’est **pas** l’absence d’ATS.  
C’est : **l’employé ne lit jamais ses heures agrégées ni le lien avec la paie** — alors que c’est exactement la promesse TimeGate (« des heures que la paie peut croire »).

---

## 4. Causes racines (pas seulement « features manquantes »)

1. **Migration Expo = portage du portail minimal**, pas redesign « habit-forming » (spec 2026-06-22 = lecture pointages + congés + planning).
2. **Toute la profondeur timesheet/paie/anomalies a été construite dashboard-first** — pattern normal, mais le self-service n’a pas suivi.
3. **Règle produit saine** (« pas de module RH parce que concurrent ») a freiné les bons ajouts employé qui **renforcent** le moteur de présence (timesheet read, suivi claims).
4. **Confusion events ≠ timesheet** dans l’UI : l’écran « Pointages » montre des coups d’horloge, pas « 8h42 travaillées, 12 min retard, jour OK ».
5. **Annuaire / collègues** : client appelle `GET /employees` (ouvert sans `@Roles`) — raccommodage, pas produit.

---

## 5. Trois approches de rattrapage

### A — Surface only (2–3 semaines)

Polish home, raccourcis, suivi claims, badges `REVIEW_REQUIRED`, cards planning/congés plus visibles.  
**+** Rapide, zéro risque scope. **−** Ne ferme pas l’écart Socium ni la promesse « heures → paie ».

### B — Boucle présence employé (recommandé) · 6–10 semaines

Exposer **en lecture** ce que le moteur sait déjà : timesheets perso, fil d’attente (claims + reviews), home valeur du jour, puis **résumé paie lecture seule** (runs LOCKED/PAID).  
**+** Aligne pitch + différenciation. **−** Besoin d’endpoints `/employee/*` soignés (pas d’IDOR, pas de DRAFT paie).

### C — Parité portail RH Socium (3–6 mois)

Avances self-service, coffre docs, annuaire riche, GPS punch, widgets…  
**+** Checklist marketing. **−** Contredit la feuille de route ; dilue le cœur ; TimeGate devient un Socium faible.

**Recommandation : B**, avec un **Sprint 0** tiré de A (quick wins), et des briques de C **uniquement** si elles servent la boucle présence (ex. annuaire minimal pour swaps, pas coffre Doc).

---

## 6. Roadmap priorisée (approche B)

### Phase 0 — Quick wins (≤ 1 semaine) · effort S

Objectif : l’app a l’air **finie**, pas un tiroir de menus.

1. **Home « valeur du jour »**
   - Ligne d’heures du jour (dérivée events ou schedule) : arrivée → départ / en cours
   - Chip solde congés (1 chiffre)
   - Raccourcis : QR · Congé · Planning · Réclamations (pas 4 liens génériques)
2. **Suivi réclamations** : liste `GET /employee/punch-claims` + statut
3. **Attendance** : regrouper par jour + badge revue ; CTA claim moins enfoui
4. **Corriger annuaire swap** : `GET /employee/colleagues` (id, nom, branche/dept) — ne plus s’appuyer sur `GET /employees` nu

*Critère de done :* un employé comprend en &lt; 5 s s’il doit pointer, s’il est en pause, et s’il a une demande en cours.

### Phase 1 — Mes heures (2–3 semaines) · effort M · **priorité stratégique**

Objectif : fermer le gap **events → timesheet**.

1. API `GET /employee/timesheets` (+ `:id`) — scope strict `employeeId` JWT ; champs : workDate, status, workedMinutes, late, OT, flags
2. Écran **Mes heures** (semaine / période pay group si dispo)
3. Détail jour : events liés + statut timesheet + lien « créer réclamation » si pertinent
4. Home : « Cette semaine · Xh » + alerte si jour `REVIEW_REQUIRED`

*Critère de done :* démo 15 min peut montrer **côté employé** la même vérité que le dashboard timesheet (lecture).

### Phase 2 — Transparence paie lecture seule (2–3 semaines) · effort M

Objectif : tenir la promesse pitch sans concurrencer Socium Payroll.

1. API `GET /employee/payroll/summary` — uniquement runs non-DRAFT (LOCKED / PAID / équivalent)
2. Home : « Prochaine / dernière paie » (net ou « en préparation » si pas encore lock)
3. Écran détail ligne : brut / retenues / net **si** la politique org l’autorise (flag capacité ?)
4. **Pas** de PDF bulletin légal multi-pays v1 — export simple ou « voir avec RH » si pas de document

*Critère de done :* objection « Socium a mon bulletin » → « TimeGate montre les heures et le calcul préparatoire ; la paie légale reste chez votre outil / RH ».

### Phase 3 — Habit + trust (ensuite) · effort M

1. Fil « En attente RH » : claims OPEN + events REVIEW (read-only)
2. Push employé actionnables : claim tranché, congé tranché, timesheet revue (pas spam)
3. Avance : **demande** self-service → PENDING (si capacité) — après Phase 1–2
4. Biométrie OS unlock (nice-to-have)

### Explicitement hors rattrapage immédiat

| Sujet | Pourquoi |
|-------|----------|
| GPS punch autonome | Verrou feuille de route (« pas maintenant ») |
| Coffre documentaire / ATS / GPEC | Terrain Socium ; ne renforce pas le registre |
| Offline total app | Prioriser offline **punch** déjà en place |
| Copilote IA employé | Après corpus timesheet/paie lisible |

---

## 7. Architecture cible (Phase 1–2)

```text
                    employee-app
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   /employee/*     (existant)     NOUVEAU
   me, events,     timesheets     payroll/summary
   claims, QR…     (read)         (non-DRAFT only)
         │               │               │
         └───────────────┴───────────────┘
                         │
              même vérité que dashboard
              (services timesheets / payroll
               scopés employeeId JWT)
```

**Sécurité (non négociable)**

- Jamais `employeeId` client pour autoriser — uniquement JWT
- Paie : masquer DRAFT / calculs internes non validés
- Collègues : projection minimale (pas emails/téléphones sauf politique explicite)
- Capacités org optionnelles : `employee_payroll_visibility`, `employee_advance_request`

---

## 8. Métriques de succès (rattrapage réussi)

| Signal | Avant (typique) | Cible |
|--------|-----------------|-------|
| Sessions / employé / semaine | Faible (login ponctuel) | ≥ 3 (matin + soir + un self-service) |
| Démo concurrentielle | « On a le kiosk » | « L’employé voit ses heures et le statut » |
| Objection Socium Time | Silence ou « on a le QR » | Battle card Phase 1–2 tenue |
| Tickets « mes heures sont fausses » | Passent par WhatsApp RH | Passent par claim / revue in-app |

---

## 9. Risques

| Risque | Mitigation |
|--------|------------|
| Exposer trop tôt des chiffres paie erronés | Uniquement non-DRAFT ; libellé « préparation / estimé » |
| Scope creep suite RH | Gate : chaque item Phase 3+ doit renforcer présence ou boucler pitch |
| Duplicata logique timesheet | Réutiliser services existants, pas recalcul mobile |
| `GET /employees` trop permissif | Remplacer par colleagues scoped avant d’ouvrir l’annuaire UI |

---

## 10. Lien docs / suite

- Mettre à jour [`concurrent-socium.md`](./concurrent-socium.md) § implications produit quand Phase 1 est engagée.
- Spec d’implémentation à écrire sous `docs/superpowers/specs/` **après** validation de l’approche (Phase 0+1 d’abord).
- Ne pas confondre ce doc avec une spec détaillée d’API — c’est le **cadrage stratégique** du rattrapage.

---

## 11. Synthèse exécutive

| | |
|--|--|
| **Problème** | App utile pour gestes isolés, pas pour la boucle quotidienne présence → heures → paie |
| **Pas le problème** | Absence d’ATS / Doc / GPS |
| **Rattrapage** | Phase 0 polish → Phase 1 mes heures → Phase 2 paie lecture seule |
| **Diff vs Socium** | Eux = suite + Time « assez bon » ; vous = **vérité des heures dans la poche de l’employé** |

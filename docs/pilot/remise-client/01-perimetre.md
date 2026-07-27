# 01 — Périmètre du pilote

> Document destiné à **l’entreprise** qui teste TimeGate.

## Objectif

Valider que TimeGate répond au besoin **pointage de confiance + RH de terrain** sur un site réel (ou quasi-réel), avec un nombre limité d’utilisateurs, **sans bascule paie/production**.

## Recommandation de cadrage

| Paramètre | Valeur suggérée |
|-----------|-----------------|
| Durée | **2 à 4 semaines** |
| Sites | **1** (éventuellement 2 branches en lecture) |
| Utilisateurs | **5–20 employés**, 1–2 managers, 1 admin |
| Données | Org démo seed **ou** org dédiée isolée (préférable) |
| Support | Canal dédié (WhatsApp / email) + créneau hebdo 30–45 min |
| Engagement | **Pilote**, pas SLA production |

## Inclus dans le pilote

- Connexion dashboard (ADMIN / MANAGER)
- Structure : branches, employés, horaires, affectations
- Pointage kiosk (au moins **une** méthode : PIN et/ou visage et/ou QR)
- Vue **Équipe du jour** + inbox manager (congés / anomalies)
- App employé : congés, historique, (optionnel) QR / reprise pause
- Consultation timesheets / registre de présence / exports
- (Optionnel) Console SaaS : création org / clé d’activation — côté TimeGate seulement

## Exclu / hors scope (sauf accord écrit)

- Remplacement de la paie officielle ou export comptable définitif
- Intégrations legacy (ADP, Sage, etc.)
- **Intégration SIRH** (interfaçage API TimeGate ↔ SIRH client) — **noté, pas prioritaire** ; à rouvrir après un pilote terrain réussi
- Accès client à l’API brute / Swagger / Console plateforme (réservé TimeGate ou intégrateur futur)
- White-label / impersonation / Stripe
- Shifts qui **chevauchent minuit** (limitation connue v1)
- Déploiement multi-pays / multi-fuseaux non validés
- Usage biométrique **sans** notice / accord employés (responsabilité client)

## Phases recommandées

### Phase A — Web only (jours 1–3)

Dashboard + manager + admin. Pas de borne obligatoire.  
Objectif : valider navigation, rôles, données RH, planning prévu vs équipe du jour.

### Phase B — Pointage (jours 4–10)

1 kiosk provisionné. Méthode minimale = **PIN** (si face pas prêt).  
Objectif : check-in / check-out, retards, absences auto, inbox.

### Phase C — Self-service (jours 8–14)

App employé sur 3–5 téléphones.  
Objectif : demande de congé, historique, (optionnel) scan QR borne.

### Phase D — Boucle d’exploitation (semaine 3–4)

Semaine « réelle » : pointages quotidiens, validations manager, export période.  
Objectif : friction réelle, perf, confiance métier.

## Critères de succès (Go / No-Go)

Le pilote est **réussi** si **au moins 5/7** sont vrais :

1. [ ] Un admin peut créer / modifier un employé et un horaire sans aide technique.
2. [ ] Un manager voit l’état de l’équipe du jour cohérent avec les pointages.
3. [ ] Au moins **20 pointages valides** enregistrés sur la période (toutes méthodes confondues).
4. [ ] Une demande de congé est créée puis approuvée / refusée de bout en bout.
5. [ ] Un export présence ou timesheet est généré et compris par le client.
6. [ ] Aucun incident **bloquant** non contourné (perte de données, impossibilité de pointer > 1 jour).
7. [ ] Le client confirme par écrit : *« utile pour notre terrain »* ou liste d’écarts P0 mesurables.

## Rôles pendant le pilote

| Rôle | Responsable | Mission |
|------|-------------|---------|
| Sponsor client | Entreprise | Décision Go / No-Go |
| Champion terrain | Entreprise | Fait vivre le kiosk / rappelle les employés |
| Admin RH | Entreprise | Compte ADMIN |
| Support produit | TimeGate | Env, bugs, onboarding |
| Tech lead | TimeGate | Staging, secrets, face engine |

## Livrables fin de pilote

- Feuille de retour remplie ([05-feuille-retour.md](./05-feuille-retour.md))
- Liste P0 / P1 priorisée
- Décision : **poursuivre commercial** / **2ᵉ itération** / **stop**

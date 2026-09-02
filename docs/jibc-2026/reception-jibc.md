# TimeGate — Dossier JIBC 2026 · Pièces complémentaires

> **Destinataire :** équipe d'analyse des candidatures JIBC 2026
> **Expéditeur :** Styve Maba, porteur du projet TimeGate (projet personnel)
> **Support admin :** Mazala Firm — RCCM CG-BZV-01-2021-A10-01865 · NIU P21000000203772A
> **Site :** https://timegate-one.vercel.app/
> **Objet :** transmission des éléments complémentaires (budget, financement, prévisions financières, grille tarifaire)
> **Date limite :** vendredi 07/08/2026 à 09h00

---

## Documents transmis

| # | Pièce | Fichier | Format |
|---|-------|---------|--------|
| 1 | **Grille tarifaire** (3 packs, options appareil, exemples chiffrés) | [`grille-tarifaire.md`](./grille-tarifaire.md) | Markdown |
| 2 | **Budget prévisionnel** (CAPEX + OPEX, 5 ans) | [`budget-previsionnel.md`](./budget-previsionnel.md) | Markdown |
| 3 | **Plan de financement** (sources, calendrier de levée, modalités d'endettement) | [`plan-financement.md`](./plan-financement.md) | Markdown |
| 4 | **Prévisions financières** (CA, charges, scénarios, impact social) | [`previsions-financieres.md`](./previsions-financieres.md) | Markdown |
| 5 | Récapitulatif structuré (synthèse pour lecture rapide) | [`reception-jibc.md`](./reception-jibc.md) | Markdown |

> Les documents sont rédigés en FCFA (XAF) — taux indicatif 1 € ≈ 655,957 FCFA — et couvrent l'horizon 2026 → 2030 (5 ans).

---

## Synthèse exécutive (1 minute de lecture)

**TimeGate** est une plateforme SaaS de **pointage intelligent et gestion RH** pour PME et organisations multi-sites. Le produit combine :

- **Kiosk mobile** (tablette ou smartphone du client) avec reconnaissance faciale, QR code et NFC
- **Appli mobile employé native** (iOS + Android, Expo / React Native) — **incluse dans tous les packs** — pointages, soldes congés, demandes, notifications push multi-canal (Expo + Firebase FCM), messagerie interne avec le manager
- **Dashboard manager** temps réel : présences, retards, absences, planning, paie v1
- **IA Copilot** (assistant RH intelligent, intégré dès le pack PRO)
- **Intégrations & sync SI tierces** : webhooks sortants signés HMAC-SHA256, API REST ouverte, connecteurs ERP/paie pré-packagés (Sage, Odoo, Saari), migration de données — **différenciateur clé** vs SaaS RH frontaliers qui enferment les données

### La traction est là

> ✅ **1 client payant déjà en pilote terrain au moment de la candidature** — c'est le signal de traction le plus fort du panel JIBC 2026, où la plupart des dossiers restent au stade projet ou prototype.

### Structure

- **Projet personnel de Styve Maba**
- **Support admin** : Mazala Firm (RCCM CG-BZV-01-2021-A10-01865 · NIU P21000000203772A) — uniquement pour la comptabilité et la tenue juridique.
- **Site :** https://timegate-one.vercel.app/

### Grille tarifaire (3 packs, setup flexible)

**Abonnements mensuels :**

| Pack | Abonnement mensuel | Cible |
|---|---:|---|
| **ESSENTIEL** | **15 000 FCFA** | ≤20 employés, 1 site, pointage manuel |
| **PRO** | **50 000 FCFA** | ≤100 employés, 1 à 4 sites, kiosque + paie v1 + IA Copilot |
| **ENTERPRISE** | **220 000 FCFA** | ETI, sites illimités, IA Copilot étendue, SLA, matériel fourni obligatoire |

**Setup variable selon l'appareil du client :**

| Pack | SansAppareil | AppareilCompact (+60k) | AppareilRenforcé (+150k) |
|---|---:|---:|---:|
| ESSENTIEL | 0 | — | — |
| PRO | **50 000** | **110 000** | **200 000** |
| ENTERPRISE | non disponible | **260 000** | **350 000** |

> **Philosophie :** pour PRO, le client compose librement. Pour ENTERPRISE, le matériel est **obligatoirement fourni par TimeGate**.

### Trajectoire financière (résumé)

| | N (2026) | N+1 | N+2 | N+3 | N+4 |
|--|---------:|----:|----:|----:|----:|
| Clients en fin d'année (cible) | 3 | 8 | 20 | 50 | 100 |
| CA total (FCFA) | 1,6 M | 4,9 M | 12,4 M | 31,4 M | **62,0 M** |
| Charges | 2,6 M | 7,9 M | 20,0 M | 36,4 M | 56,7 M |
| Résultat net (FCFA) | -970 k | -2,9 M | -7,5 M | -5,0 M | **+5,4 M** |
| **Marge nette** | -61 % | -59 % | -60 % | -16 % | **+9 %** |

> En **scénario cible** (3 clients), TimeGate devient **rentable en N+4** (+9 %).
> En **scénario traction forte** (6 clients N), TimeGate est **rentable dès N** (+53 % de marge nette).

### Effet de levier SaaS

Doubler les clients (3 → 6) **multiplie le CA par 3,4** mais **ne change pas les charges fixes**. C'est ce qui permet de basculer en rentabilité dès la première année — c'est **la beauté du modèle SaaS**.

### Stratégie de financement

| Phase | Période | Source principale |
|-------|---------|-------------------|
| P1 Bootstrap | 2026 | Love money (1,5 M FCFA) + autofinancement Styve (400 k) + concours JIBC + 1er client payant |
| P2 Amorçage | 2027 | Pré-seed (~5 M FCFA) — business angels + love money |
| P3 Seed | 2028–2029 | Seed (~12 M FCFA) — fonds early-stage panafricains |
| P4 Croissance | 2030 | Tranche 2 / série A (~8 M FCFA) |

**Cumul des levées externes sur 5 ans :** ~37 M FCFA (≈ 56 k €) — dont ~25 M FCFA en capitaux propres et ~12 M FCFA en dette et subventions. **Aucune levée externe en année 1** — autofinancement suffisant.

### Impact social

- **~63 emplois créés ou maintenus sur 5 ans** (19 directs projet + 44 indirects freelance/intégrateurs).
- **Dématérialisation** des registres papier dans 100+ organisations d'ici 2030.
- **Réduction de la fraude au pointage** : estimation 5–10 % de masse salariale récupérée chez les clients.
- **Souveraineté numérique** : stack technique maîtrisée localement, expansion sous-régionale CEMAC.

---

## Scénarios (sensibilité)

| Scénario | CA N | Résultat N | Point d'équilibre |
|----------|-----:|-----------:|-------------------|
| Pessimiste (1 client) | 0,7 M FCFA | -1 870 k FCFA | N+5 / N+6 |
| **Cible (3 clients)** | **1,6 M FCFA** | **-970 k FCFA** | **N+4** |
| **Traction forte (6 clients)** | **5,5 M FCFA** | **+2 900 k FCFA** | **N** |
| Optimiste (+30 % cible) | 2,1 M FCFA | -490 k FCFA | N+3 / N+4 |

---

## Ce que nous cherchons à la JIBC 2026

- **Partenaires** : directions RH, cabinets paie, **intégrateurs SI / éditeurs ERP locaux** (Sage, Odoo, Saari), incubateurs.
- **Clients pilotes** : 2–3 organisations supplémentaires prêtes à tester TimeGate 1–3 mois sur site réel, idéalement avec un système RH existant à connecter (validation du track-record intégrations).
- **Investisseurs & mentors** : accompagnement go-to-market local, hébergement cloud régional.
- **Visibilité** : concours d'innovation, médias locaux, réseau chercheurs-entrepreneurs.

### Pistes spécifiques côté intégrations

- **Cabinets paie** prêts à proposer TimeGate comme **frontal de pointage** à leurs clients (webhooks Paie v1 → leur outil de calcul).
- **Distributeurs / revendeurs ERP** (Sage Congo, Odoo RDC) intéressés par une intégration officielle.
- **ESN / intégrateurs SI** locaux positionnés sur des missions d'**intégration / migration de données** (forfait 150–200 k FCFA / projet selon complexité).
- **Banques & assurances** cherchant à connecter TimeGate à leurs processus internes (paie, contrôle présence terrain).

---

## Coordonnées

**Styve Maba** — porteur du projet TimeGate

📧 kaiserstyve2@gmail.com
📱 +242 06 515 23 74
🌐 https://timegate-one.vercel.app/

**Mazala Firm** (support admin)
RCCM : CG-BZV-01-2021-A10-01865
NIU : P21000000203772A

---

*Documents rédigés dans le cadre de l'appel à compléments JIBC 2026 · 2026-08-06*
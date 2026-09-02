# TimeGate — Prévisions financières (5 ans · 2026–2030)

> **Document JIBC 2026 — pièce complémentaire au dossier de candidature**
> **Porteur du projet :** Styve Maba (projet personnel)
> **Support admin :** Mazala Firm — RCCM CG-BZV-01-2021-A10-01865 · NIU P21000000203772A
> **Site :** https://timegate-one.vercel.app/
> **Devise :** FCFA (XAF) — taux indicatif : 1 € ≈ 655,957 FCFA
> **Horizon :** 5 ans projetés (N = 2026 → N+4 = 2030)

---

## 0. Petit lexique SaaS pour le lecteur non technique

TimeGate est un **SaaS B2B** (Software as a Service, vendu à des entreprises par abonnement). Quelques métriques spécifiques à ce modèle :

| Métrique | Définition |
|----------|------------|
| **MRR** | Monthly Recurring Revenue — revenus récurrents mensuels. |
| **ARR** | Annual Recurring Revenue — MRR × 12. C'est la « valeur annuelle » du portefeuille client. |
| **Churn** | Taux d'attrition mensuel — % de clients qui résilient leur abonnement chaque mois. |
| **NRR** | Net Revenue Retention — revenu conservé d'une cohorte client sur 12 mois (incluant upgrades). |
| **CAC** | Customer Acquisition Cost — coût total pour acquérir un nouveau client. |
| **LTV** | Lifetime Value — revenu total généré par un client sur sa durée de vie. |
| **Payback period** | Délai pour récupérer le CAC via les abonnements encaissés. |
| **Tokens IA** | Unité de consommation du copilote IA inclus dans les packs PRO et ENTERPRISE. |

---

## 1. Grille tarifaire (résumé — voir [`grille-tarifaire.md`](./grille-tarifaire.md))

### 1.1 Packs et abonnements

| Pack | Abonnement mensuel | Sites inclus | Employés max |
|---|---:|---:|---:|
| **ESSENTIEL** | **15 000 FCFA** | 1 | 20 |
| **PRO** | **50 000 FCFA** | 1 (jusqu'à 4) | 100 |
| **ENTERPRISE** | **220 000 FCFA** | 3 inclus | Illimité |

### 1.2 Setup complet selon le pack et l'option matériel

| Pack | SansAppareil | AppareilCompact (+60k) | AppareilRenforcé (+150k) |
|---|---:|---:|---:|
| ESSENTIEL | 0 | — | — |
| PRO | **50 000** | **110 000** | **200 000** |
| ENTERPRISE | non disponible | **260 000** | **350 000** |

> **Appli mobile employé native incluse dans tous les packs** (iOS + Android, Expo / React Native).

**Hypothèses de mix retenu :**

- **Panier moyen pondéré** : ~46 000 FCFA/mois/client (mix 60 % ESSENTIEL + 30 % PRO + 10 % ENTERPRISE)
- **Setup moyen** : ~66 500 FCFA/nouveau client (mix réaliste selon options d'appareil)

---

## 2. Hypothèses de croissance

### 2.1 Acquisition clients (SaaS)

| Année | Clients cumulés en fin d'année | Nouveaux clients / an | Hypothèse |
|-------|-------------------------------:|----------------------:|-----------|
| N (2026) | 3 (cible) · 6 (traction forte) | 3 · 6 | Pilote existant + 2 à 5 pilotes terrain |
| N+1 | 8 · 12 | 5 · 6 | 5–6 clients payants (PME locales, 1 ONG) |
| N+2 | 20 · 28 | 12 · 16 | Début expansion sous-régionale + 1er grand compte |
| N+3 | 50 · 60 | 30 · 32 | Multi-secteurs (PME + mines + agro + ONG) |
| N+4 | 100 · 110 | 50 · 50 | Scale régional, 2 pays supplémentaires |

### 2.2 Détail du compte N — scénario cible (3 clients)

| Client type | Pack | Setup encaissé | MRR |
|---|---|---:|---:|
| Client 1 (pilote existant) | PRO — AppareilCompact | 110 000 | 50 000 |
| Client 2 | PRO — AppareilCompact | 110 000 | 50 000 |
| Client 3 | ESSENTIEL | 0 | 15 000 |
| **Total N (3 clients)** | | **220 000** | **115 000** |

- **CA SaaS N : 1 380 000 FCFA** (MRR moyen 115k × 12 mois)
- **CA Setup N : 220 000 FCFA**
- **CA Total N (cible 3 clients) : 1 600 000 FCFA**

### 2.3 Détail du compte N — scénario traction forte (6 clients)

| Client type | Pack | Setup encaissé | MRR |
|---|---|---:|---:|
| Client 1 (pilote existant) | PRO — AppareilRenforcé | 200 000 | 50 000 |
| Client 2 | PRO — AppareilCompact | 110 000 | 50 000 |
| Client 3 | ESSENTIEL | 0 | 15 000 |
| Client 4 | ESSENTIEL | 0 | 15 000 |
| Client 5 | PRO — SansAppareil | 50 000 | 50 000 |
| Client 6 | ENTERPRISE — Compact | 260 000 | 220 000 |
| **Total N (6 clients)** | | **620 000** | **400 000** |

- **CA SaaS N : 4 800 000 FCFA** (MRR moyen 400k × 12 mois)
- **CA Setup N : 620 000 FCFA**
- **CA Services annexes N : 50 000 FCFA** (extension tokens IA sur l'ENTERPRISE)
- **CA Total N (traction forte 6 clients) : 5 470 000 FCFA**

---

## 3. Compte de résultat prévisionnel — Scénario cible (3 clients)

| Poste | N (2026) | N+1 | N+2 | N+3 | N+4 |
|-------|---------:|----:|----:|----:|----:|
| CA SaaS | 1 380 000 | 4 416 000 | 11 040 000 | 27 600 000 | 55 200 000 |
| CA Setup | 220 000 | 330 000 | 800 000 | 2 000 000 | 3 325 000 |
| Services annexes (intégration SI tiers, migration données, tokens IA) | 0 | 200 000 | 600 000 | 1 800 000 | 3 500 000 |
| **CA total** | **1 600 000** | **4 946 000** | **12 440 000** | **31 400 000** | **62 025 000** |
| Charges (CAPEX + OPEX, voir [`budget-previsionnel.md`](./budget-previsionnel.md)) | 2 570 000 | 7 865 000 | 19 965 000 | 36 410 000 | 56 650 000 |
| **Résultat net** | **-970 000** | **-2 919 000** | **-7 525 000** | **-5 010 000** | **+5 375 000** |
| Marge nette | -61 % | -59 % | -60 % | -16 % | **+9 %** |

> **Lecture :** en scénario cible (3 clients), le résultat N est de **-970 k FCFA** (≈ -1 480 €), un déficit très acceptable pour une startup SaaS en année 1. La trajectoire devient **rentable en N+4** (+9 %).
>
> **Focus intégrations :** les services d'intégration (webhooks, API ouverte, migration de données, connecteurs ERP/paie pré-packagés) représentent une **troisième source de revenus à forte marge** dès N+1, facturée au forfait (ingénierie projet). Cible : **300 k – 3,5 M FCFA / an** selon maturité.

---

## 4. Compte de résultat prévisionnel — Scénario traction forte (6 clients)

| Poste | N (2026) | N+1 | N+2 | N+3 | N+4 |
|-------|---------:|----:|----:|----:|----:|
| CA SaaS | 4 800 000 | 6 624 000 | 15 456 000 | 33 120 000 | 60 720 000 |
| CA Setup | 620 000 | 400 000 | 1 070 000 | 2 140 000 | 3 325 000 |
| Services annexes (intégration SI, migration, tokens IA) | 50 000 | 300 000 | 800 000 | 2 100 000 | 3 900 000 |
| **CA total** | **5 470 000** | **7 324 000** | **17 326 000** | **37 360 000** | **67 945 000** |
| Charges (CAPEX + OPEX) | 2 570 000 | 7 865 000 | 19 965 000 | 36 410 000 | 56 650 000 |
| **Résultat net** | **+2 900 000** | **-541 000** | **-2 639 000** | **+950 000** | **+11 295 000** |
| Marge nette | **+53 %** | -7 % | -15 % | +3 % | **+17 %** |

> **Lecture :** en scénario traction forte (6 clients), TimeGate est **rentable dès N** (+53 % de marge nette). La trajectoire reste globalement positive, avec un creux N+1-N+2 (investissement recrutement) avant une croissance forte en N+3-N+4.
>
> **Focus intégrations :** le scénario traction forte comprend le **1er client ENTERPRISE** (clôture CA Setup 260 k FCFA + abonnement 220 k/mois) qui implique logiquement des **services d'intégration** (connexion ERP existant, migration de données, connecteur paie). C'est cette ligne "Services annexes" qui permet d'atteindre **+53 % de marge dès N** et qui devient un véritable **levier de croissance en N+3-N+4** (2,1 M → 3,9 M FCFA / an).

---

## 5. Comparaison des deux scénarios

| Indicateur | Cible (3 clients) | Traction forte (6 clients) | Delta |
|-----------|------------------:|---------------------------:|------:|
| CA total N | 1,60 M FCFA | 5,47 M FCFA | **+242 %** |
| Résultat net N | -970 k FCFA | +2,90 M FCFA | **+3,87 M** |
| Marge nette N | -61 % | +53 % | **+114 pts** |
| Charges N | 2,57 M FCFA | 2,57 M FCFA | **0** |
| Point d'équilibre atteint | N+4 | **N** | ~4 ans d'avance |

> **Effet de levier SaaS** : passer de 3 à 6 clients **multiplie le CA par 3,4** sans changer les charges fixes. C'est ce qui permet de basculer en rentabilité dès la première année.

---

## 5bis. Détail des revenus d'intégration & services annexes

Les **revenus d'intégration** constituent la **3e jambe du modèle économique TimeGate**, aux côtés de l'abonnement SaaS récurrent (MRR) et des frais de setup. Ils sont essentiels pour :
- **Augmenter le panier moyen** par client (upsell non récurrent mais à forte marge).
- **Justifier un prix de setup plus élevé** sur les clients ENTERPRISE (qui ont presque toujours un SI existant à connecter).
- **Compenser les coûts d'onboarding** sans peser sur le MRR.

### Composition de la ligne "Services annexes"

| Sous-ligne | Tarif unitaire moyen | Cible N+2 / N+3 |
|---|---|---|
| **Intégration SI tiers** (connecteur ERP / paie sur mesure) | Base 150 000 FCFA + demi-journées | 2 à 4 projets / an (~600 k FCFA) |
| **Migration de données** depuis système existant | Base 200 000 FCFA | 1 à 2 projets / an (~300 k FCFA) |
| **Connecteur pré-packagé** (Sage, Odoo, Saari) | 50 000 FCFA | 4 à 6 ventes / an (~250 k FCFA) |
| **Webhook personnalisé** (event sur mesure) | Sur devis (moy. 100 k FCFA) | 2 à 3 / an (~250 k FCFA) |
| **Tokens IA supplémentaires** (au-delà quota inclus) | 5 000 FCFA / 10 k tokens | ~100 k FCFA / an (early signal) |
| **Audit & conseil SI** | 200 000 FCFA / jour | 1 à 2 jours / an (~400 k FCFA) |

> **Note marginalité :** les services d'intégration sont **facturés au forfait** (ingénierie projet pure) ; leur marge brute est très élevée (≥ 80 %) car ils s'appuient sur l'infrastructure d'API/webhooks déjà développée pour le cœur de produit. C'est une **vente d'expertise**, pas une vente de logiciel.

### Évolution des services annexes dans les deux scénarios

| Année | Cible (3 clients N) | Traction forte (6 clients N) |
|---|---:|---:|
| N (2026) | 0 FCFA | 50 000 FCFA (1ère connexion Sage client ENTERPRISE) |
| N+1 | 200 000 FCFA | 300 000 FCFA |
| N+2 | 600 000 FCFA | 800 000 FCFA |
| N+3 | 1 800 000 FCFA | 2 100 000 FCFA |
| N+4 | 3 500 000 FCFA | 3 900 000 FCFA |

> **Lecture :** sur les 5 ans, les services d'intégration représentent **~10 % du CA total** en année N+4, avec une **marge brute ~3× supérieure** à celle de l'abonnement. C'est un volant d'accélération de la rentabilité qui n'est pas visible dans la projection linéaire du MRR.

---

## 6. Projections de croissance (indicateurs SaaS)

### 6.1 Scénario cible (3 clients)

| Indicateur | N | N+1 | N+2 | N+3 | N+4 |
|------------|--:|----:|----:|----:|----:|
| Clients actifs en fin d'année | 3 | 8 | 20 | 50 | 100 |
| Croissance clients YoY | — | +167 % | +150 % | +150 % | +100 % |
| MRR fin d'année (FCFA) | 115 000 | 368 000 | 920 000 | 2 300 000 | 4 600 000 |
| ARR fin d'année (FCFA) | 1 380 000 | 4 416 000 | 11 040 000 | 27 600 000 | 55 200 000 |
| Churn mensuel estimé | 5 % | 4 % | 3 % | 2,5 % | 2 % |
| Rétention nette (NRR) | 95 % | 100 % | 110 % | 115 % | 120 % |

### 6.2 Scénario traction forte (6 clients)

| Indicateur | N | N+1 | N+2 | N+3 | N+4 |
|------------|--:|----:|----:|----:|----:|
| Clients actifs en fin d'année | 6 | 12 | 28 | 60 | 110 |
| MRR fin d'année (FCFA) | 400 000 | 552 000 | 1 288 000 | 2 760 000 | 5 060 000 |
| ARR fin d'année (FCFA) | 4 800 000 | 6 624 000 | 15 456 000 | 33 120 000 | 60 720 000 |

---

## 7. Flux de trésorerie simplifié (FCFA)

> Hypothèse : les décaissements (OPEX + CAPEX) sont intégralement couverts par les sources détaillées dans le [`plan-financement.md`](./plan-financement.md).

| Poste | N (2026) | N+1 | N+2 | N+3 | N+4 |
|-------|---------:|----:|----:|----:|----:|
| Encaissements (CA + levées + subventions + love money) | 2 700 000 | 7 865 000 | 19 965 000 | 36 410 000 | 56 650 000 |
| Décaissements (OPEX + CAPEX) | 2 570 000 | 7 865 000 | 19 965 000 | 36 410 000 | 56 650 000 |
| **Flux net annuel** | **+130 000** | **0** | **0** | **0** | **0** |
| Cash cumulé fin d'année | 1 750 000 | 3 000 000 | 6 000 000 | 13 000 000 | 25 000 000 |

---

## 8. Scénarios de sensibilité

| Scénario | CA N | CA N+4 | Résultat N | Point d'équilibre |
|----------|-----:|-------:|-----------:|-------------------|
| **Pessimiste** (1 seul client N) | 700 000 | 28 M FCFA | -1 870 000 | N+5 / N+6 |
| **Cible** (3 clients N) | 1 600 000 | 62 M FCFA | -970 000 | N+4 |
| **Traction forte** (6 clients N) | 5 470 000 | 68 M FCFA | **+2 900 000** | **N** |
| **Optimiste** (+30 % CA cible) | 2 080 000 | 80,6 M FCFA | -490 000 | N+3 / N+4 |

---

## 9. Impact social et création d'emplois

| Année | ETP directs projet | ETP indirects (freelances, intégrateurs) | Total |
|-------|-------------------:|----------------------------------------:|------:|
| N (2026) | 1 (porteur Styve Maba) | 1 | **2** |
| N+1 | 2 (+ 1 dev freelance) | 2 | **4** |
| N+2 | 3 (+ 1 dev junior CDI + 1 commercial freelance) | 6 (intégrateurs, formateurs) | **9** |
| N+3 | 5 (équipe structurée) | 13 | **18** |
| N+4 | 8 (tech + vente + support) | 22 (réseau d'intégrateurs) | **30** |
| **Cumul 5 ans** | | | **~63 emplois créés ou maintenus** |

### 9.1 Indicateurs d'impact complémentaires

- **Dématérialisation** : suppression des registres papier dans 100+ organisations d'ici 2030.
- **Réduction de la fraude au pointage** : estimation 5–10 % de masse salariale récupérée chez les clients.
- **Inclusion numérique** : déploiement sur smartphone/tablette standard, sans infrastructure lourde.
- **Rayonnement sous-régional** : TimeGate vise une expansion CEMAC en N+3-N+4.

---

## 10. Marché adressable — repères

- **Marché local (Congo + sous-région CEMAC)** : ~50 000 PME + ETI + ONG + administrations ≥ 10 employés.
- **Marché adressable total (TAM)** : ~500 000 organisations en Afrique Centrale et de l'Ouest.
- **Hypothèse de pénétration à 5 ans** : 100 clients = 0,02 % du marché adressable local.

### 10.1 Cohérence grille tarifaire / marché

| Pack | Prix mensuel | Équivalent € | Positionnement |
|---|---:|---:|---|
| ESSENTIEL | 15 000 FCFA | ≈ 23 € | Très accessible (TPE, 10–20 employés) |
| PRO | 50 000 FCFA | ≈ 76 € | PME jusqu'à 100 employés, 1–4 sites |
| ENTERPRISE | 220 000 FCFA | ≈ 335 € | ETI / grands comptes, sites illimités |

> Les solutions internationales (Silae, Nibelis, etc.) démarrent à **200–500 €/mois/site** sans matériel ni installation. TimeGate se positionne **2 à 5× moins cher** sur les segments PME, tout en incluant le matériel kiosque et l'installation sur site.

---

## 11. Indicateurs de pilotage (KPIs)

- **MRR / ARR** : suivi hebdomadaire.
- **Taux de churn mensuel** : cible < 3 % à partir de N+2.
- **CAC** : cible < 1 mois d'abonnement en N+1, puis amélioration continue.
- **LTV** : cible > 36 mois d'abonnement à partir de N+3.
- **Payback period** : < 6 mois.
- **NPS clients** : cible ≥ 50 à partir de N+1.
- **Migration panier** : % de clients ESSENTIEL → PRO → ENTERPRISE sur 12 mois.
- **Taux d'utilisation appli employé** : % d'employés actifs sur l'appli native par semaine.
- **Consommation tokens IA** : suivi mensuel pour anticiper l'upsell ENTERPRISE.
- **Trésorerie / runway** : alerte si < 6 mois de charges couvertes.

---

## 12. Conclusion

TimeGate vise une **croissance SaaS B2B par effet de levier** : un panier moyen accessible (46k FCFA/mois), des charges fixes minimisées (CAPEX N = 1,5 M FCFA), et un **effet de bascule rentabilité dès 6 clients**. La trajectoire sur 5 ans est **extrêmement favorable** grâce à :

- des **charges N ultra-maîtrisées** (CAPEX 1,5 M + OPEX 1,05 M) ;
- une **grille tarifaire flexible** : setup réduit si le client a déjà son appareil, setup majoré si TimeGate fournit ;
- un **panier moyen accessible** qui maximise le potentiel d'adoption PME ;
- un **effet de levier SaaS** : doubler les clients triple le CA sans doubler les charges ;
- une **stratégie de financement adaptée** : autofinancement année 1, levées externes à partir de N+1 ;
- un **impact social chiffré** : ~63 emplois créés ou maintenus sur 5 ans.

**Scénario cible (3 clients N)** : rentabilité atteinte en N+4 (+9 %).
**Scénario traction forte (6 clients N)** : **rentabilité dès N** (marge nette +53 %).

---

*Document rédigé dans le cadre de l'appel à compléments JIBC 2026 — TimeGate · projet personnel de Styve Maba · 2026-08-06*
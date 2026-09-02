# Design — Modèle économique & dossier financier JIBC 2026 (TimeGate)

> **Date :** 2026-08-06
> **Statut :** design verrouillé (v3 — appli employé dans tous les packs + ENTERPRISE matériel obligatoire)
> **Auteur :** Styve Maba (porteur) + assistant Claude

## Contexte

Le projet TimeGate candidat aux JIBC 2026 a reçu un appel à compléments le 2026-08-05 demandant budget prévisionnel, plan de financement et prévisions financières. Session de brainstorming structuré le 2026-08-06 aboutissant à 3 itérations (v1, v2, v3) sur la grille tarifaire, le setup et la position de l'appli employé.

## Décisions verrouillées (v3)

### Juridique
- **Projet personnel de Styve Maba**
- **Mazala Firm** : support admin uniquement (comptabilité, tenue juridique)
- RCCM CG-BZV-01-2021-A10-01865 · NIU P21000000203772A

### Grille tarifaire SaaS (3 packs — v3)

**Abonnements mensuels :**
- **ESSENTIEL** : **15 000 FCFA/mois** — ≤20 employés, 1 site, pointage manuel
- **PRO** : **50 000 FCFA/mois** — ≤100 employés, 1 site (jusqu'à 4)
- **ENTERPRISE** : **220 000 FCFA/mois** — ETI, 3 sites inclus, illimité

**Appli mobile employé native : INCLUSE DANS TOUS LES PACKS** (iOS + Android, Expo / React Native)

### Options d'appareil (v3)

| Pack | Option A (appareil client) | Option B (tablette compacte +60k) | Option C (tablette renforcée +150k) |
|---|---|---|---|
| ESSENTIEL | N/A (pointage manuel) | N/A | N/A |
| PRO | **50 000** | **110 000** | **200 000** |
| ENTERPRISE | **NON DISPONIBLE** (matériel fourni obligatoire) | **260 000** | **350 000** |

### Nommage commercial des variantes

- ESSENTIEL
- PRO — SansAppareil
- PRO — AppareilCompact
- PRO — AppareilRenforcé
- ENTERPRISE — Compact
- ENTERPRISE — Renforcé

### Extensions multi-sites
- PRO : +100k setup + 15k/mois par site supp
- ENTERPRISE : +80k setup + 25k/mois par site supp

### Hypothèses de croissance
- **Cible N : 3 clients** (2 PRO-AppareilCompact + 1 ESSENTIEL)
- **Traction forte : 6 clients** (mix incluant 1 ENTERPRISE-Compact)
- **Panier moyen pondéré** : ~46 000 FCFA/mois/client (mix 60/30/10)
- **Setup moyen** : ~66 500 FCFA/nouveau client (mix réaliste selon options d'appareil)

### Structure de charges N (optimisée agressive)
- **CAPEX N : 1 520 000 FCFA**
- **OPEX N : 1 050 000 FCFA**
- **Total dépenses N : 2 570 000 FCFA**

### Trajectoire financière — Scénario cible (3 clients)

| Année | Clients | CA Total | Charges | Résultat | Marge |
|---|---:|---:|---:|---:|---:|
| N | 3 | 1 600 000 | 2 570 000 | -970 000 | -61 % |
| N+1 | 8 | 4 946 000 | 7 865 000 | -2 919 000 | -59 % |
| N+2 | 20 | 12 440 000 | 19 965 000 | -7 525 000 | -60 % |
| N+3 | 50 | 31 400 000 | 36 410 000 | -5 010 000 | -16 % |
| N+4 | 100 | 62 025 000 | 56 650 000 | **+5 375 000** | **+9 %** |

### Trajectoire financière — Scénario traction forte (6 clients)

| Année | Clients | CA Total | Charges | Résultat | Marge |
|---|---:|---:|---:|---:|---:|
| N | 6 | 5 470 000 | 2 570 000 | **+2 900 000** | **+53 %** |
| N+1 | 12 | 7 324 000 | 7 865 000 | -541 000 | -7 % |
| N+2 | 28 | 17 326 000 | 19 965 000 | -2 639 000 | -15 % |
| N+3 | 60 | 37 360 000 | 36 410 000 | +950 000 | +3 % |
| N+4 | 110 | 67 945 000 | 56 650 000 | **+11 295 000** | **+17 %** |

### Plan de financement
- N : autofinancement Styve + concours + love money + subvention incubateur (~2,82 M FCFA, pas de levée externe)
- N+1 : pré-seed ~5 M FCFA · N+2 : seed ~12 M FCFA · N+3 : tranche 2 ~10 M FCFA · N+4 : série A ~8 M FCFA
- Cumul : ~37 M FCFA capitaux propres + dette sur 5 ans

### Impact social
- N : 2 ETP · N+1 : 4 · N+2 : 9 · N+3 : 18 · N+4 : 30
- Cumul 5 ans : ~63 emplois créés/maintenus

## Fichiers produits / mis à jour

| Fichier | Action |
|---|---|
| `docs/jibc-2026/grille-tarifaire.md` | Réécrire (v3 — appli tous packs, ENTERPRISE matériel obligatoire) |
| `docs/jibc-2026/budget-previsionnel.md` | Inchangé structurellement (charges N stables) |
| `docs/jibc-2026/plan-financement.md` | Edit ciblé (référence grille tarifaire) |
| `docs/jibc-2026/previsions-financieres.md` | Réécrire (nouveaux setups ~66k, scénarios recalculés) |
| `docs/jibc-2026/reception-jibc.md` | Réécrire (synthèse v3) |

## Contraintes & signaux à respecter

- **Deadline JIBC :** vendredi 07/08/2026 à 09h00
- **Documents en FCFA** avec taux indicatif 1 € ≈ 655,957 FCFA
- **Traction réelle** : 1 client payant en pilote — élément différenciateur clé
- **Cohérence avec le code** : la grille reflète les modules réellement présents dans `api/src/` ET inclut l'appli mobile native (`employee-app/`)
- **Mazala Firm** : uniquement support admin, pas fondateur
- **Appli employé** : incluse dans tous les packs (ESSENTIEL, PRO, ENTERPRISE)
- **ENTERPRISE** : matériel fourni par TimeGate obligatoire (tablette compacte ou renforcée)
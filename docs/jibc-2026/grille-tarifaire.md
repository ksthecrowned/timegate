# TimeGate — Grille tarifaire (2026)

> **Document JIBC 2026 — pièce complémentaire au dossier de candidature**
> **Porteur du projet :** Styve Maba (projet personnel)
> **Support admin :** Mazala Firm (RCCM CG-BZV-01-2021-A10-01865 · NIU P21000000203772A)
> **Site :** https://timegate-one.vercel.app/
> **Devise :** FCFA (XAF) — taux indicatif : 1 € ≈ 655,957 FCFA
> **Date :** août 2026

---

## 1. Vue d'ensemble

TimeGate est proposé en **3 packs** extensibles, adaptés à la taille et à la maturité de l'organisation cliente. Chaque pack est composé d'un **frais de setup** (uniques, couvrent la configuration et l'installation) et d'un **abonnement mensuel** (couvre l'usage SaaS, l'hébergement, le support, l'appli mobile employé native).

> **L'appli mobile employé** (Expo / React Native, iOS + Android) est **incluse dans tous les packs** — c'est un **canal d'intégration natif** entre l'employé et le SI RH du client (notifications push Firebase + Expo, messagerie asynchrone, soldes & demandes en autonomie).

Le **setup est modulé selon le matériel** : si le client dispose déjà d'un appareil compatible, il paie un setup logiciel seul ; s'il souhaite que TimeGate fournisse l'appareil, le setup inclut le matériel au prix coûtant majoré.

### Positionnement intégrations / sync externe

TimeGate est conçu **interopérable par défaut** : l'appli mobile, les webhooks signés et l'API ouverte permettent à TimeGate de se brancher sur le SI existant du client (ERP, logiciel paie, SIRH, outils BI) **et** sur les canaux de communication terrain (notifications push multi-device). Concrètement :

| Capacité d'intégration | Implémentation réelle | Disponible dès |
|---|---|---|
| **Webhooks sortants signés** (HMAC-SHA256, retry, id unique par event) | `api/src/webhooks/webhooks.service.ts` | **PRO** (1 endpoint) → **ENTERPRISE** (illimité) |
| **API ouverte REST** (NestJS, JWT, OpenAPI à venir) | Base de l'API NestJS (`api/src/`) | **PRO** (lecture) → **ENTERPRISE** (lecture + écriture + quotas élevés) |
| **Notifications push multi-canal** (Expo + Firebase Cloud Messaging iOS/Android) | `api/src/push/expo-push.service.ts` + `api/src/push/firebase-admin.service.ts` + `api/src/push/push-delivery.service.ts` | **Tous les packs** (via l'appli employé) |
| **Messagerie interne employé ↔ manager** avec notifications push automatiques | `api/src/messaging/messaging.service.ts` | **Tous les packs** |
| **Intégration SI tiers sur devis** (ERP, paie, BI) | Webhooks + API ouverte + adaptateurs | Sur devis (base 150 000 FCFA) dès **PRO** |

---

## 2. Packs et abonnements

| Pack | Abonnement mensuel | Sites inclus | Employés max |
|---|---:|---:|---:|
| **ESSENTIEL** | **15 000 FCFA** | 1 site | 20 |
| **PRO** | **50 000 FCFA** | 1 site (jusqu'à 4 possibles) | 100 |
| **ENTERPRISE** | **220 000 FCFA** | 3 sites inclus | Illimité |

> **Appli mobile employé native incluse** dans tous les packs (iOS + Android) : pointages, soldes congés, demandes, notifications push.

---

## 3. Options d'appareil et setup

### 3.1 Options matériel disponibles

| Option | Prix appareil | Détail | Usage recommandé |
|---|---:|---|---|
| **A — Appareil client** | 0 FCFA | Le client utilise son propre smartphone / tablette via l'apk TimeGate | Toute structure ayant déjà un appareil Android récent |
| **B — Tablette compacte** | **60 000 FCFA** | Tablette 8" entrée de gamme, préconfigurée | Indoor, bureaux, agences |
| **C — Tablette renforcée** | **150 000 FCFA** | Tablette durcie 8" type Samsung Galaxy Tab Active, préconfigurée | Terrain, sites industriels, environnement exigeant |

### 3.2 Setup complet selon le pack et l'option matériel

| Pack | Option A (appareil client) | Option B (tablette compacte) | Option C (tablette renforcée) |
|---|---:|---:|---:|
| **ESSENTIEL** | N/A (pointage manuel, pas de matériel requis) | N/A | N/A |
| **PRO** | **50 000 FCFA** | **110 000 FCFA** | **200 000 FCFA** |
| **ENTERPRISE** | Non disponible (matériel fourni obligatoire) | **260 000 FCFA** | **350 000 FCFA** |

> **Philosophie :** pour PRO, le client compose librement (appareil client OU TimeGate fournit). Pour ENTERPRISE, le matériel est **obligatoirement fourni par TimeGate** (sites exigeants, usage terrain, contexte multi-sites).

### 3.3 Récapitulatif rapide — nommage commercial

| Variante | Setup | Abonnement | Cible |
|---|---:|---:|---|
| **ESSENTIEL** | 0 | 15 000 FCFA/mois | TPE ≤20 employés, pointage manuel |
| **PRO — SansAppareil** | 50 000 FCFA | 50 000 FCFA/mois | PME qui apporte sa propre tablette |
| **PRO — AppareilCompact** | 110 000 FCFA | 50 000 FCFA/mois | PME, TimeGate fournit tablette compacte |
| **PRO — AppareilRenforcé** | 200 000 FCFA | 50 000 FCFA/mois | PME terrain, TimeGate fournit tablette durcie |
| **ENTERPRISE — Compact** | 260 000 FCFA | 220 000 FCFA/mois | ETI, multi-sites, tablette compacte |
| **ENTERPRISE — Renforcé** | 350 000 FCFA | 220 000 FCFA/mois | ETI, multi-sites terrain, tablette durcie |

### 3.4 Extensions multi-sites

| Pack | Coût par site supplémentaire |
|---|---|
| **ESSENTIEL** | Non extensible (pack mono-site) |
| **PRO** | + 100 000 FCFA de setup + 15 000 FCFA/mois par site |
| **ENTERPRISE** | + 80 000 FCFA de setup + 25 000 FCFA/mois par site |

> Les sites supplémentaires sont livrés avec tablette compacte par défaut ; surcoût tablette renforcée = +90 000 FCFA par site.

---

## 4. Contenu détaillé de chaque pack

### 4.1 ESSENTIEL — 15 000 FCFA / mois

**Cible :** très petites structures (≤ 20 employés, 1 site) qui veulent digitaliser leur gestion RH.

**Inclus :**

- Module **Admin** (création entreprise, branches, départements, désignations, employés)
- Module **Auth** (rôles, permissions, multi-utilisateurs)
- **Pointage manuel** (saisie par le manager des heures d'arrivée/départ)
- **Timesheets** basiques (suivi heures travaillées par jour/semaine)
- **Absences & congés** (déclaration, validation, soldes)
- **Dashboard** de base (KPI agrégés)
- **Appli mobile employé native** (iOS + Android) — consultation pointages, soldes congés, demandes de congés, **notifications push multi-canal (Expo + Firebase FCM)** + **messagerie interne avec le manager**
- **Notifications push** déclenchées automatiquement sur les événements clés (validation congé, demande reçue, message manager)
- **1 endpoint webhook sortant** (events de base : `attendance.recorded`, `leave.requested`, `leave.approved`) — signature HMAC-SHA256, retry, documentation OpenAPI
- **API ouverte REST** (lecture seule, JWT authentifié)
- **Support email** (réponse sous 48h ouvrées)

**Non inclus :**

- ❌ Reconnaissance faciale / kiosk physique
- ❌ QR code / NFC
- ❌ Module paie
- ❌ IA Copilot
- ❌ Multi-sites

### 4.2 PRO — 50 000 FCFA / mois (setup variable)

**Cible :** PME en croissance (≤ 100 employés, 1 à 4 sites) qui veulent automatiser le pointage et gérer la paie.

**Inclus :**

- Tout le contenu d'ESSENTIEL
- **Pointage automatique** via kiosque (reconnaissance faciale, QR code, NFC)
- **Installation & formation sur site** (inclus dans le setup)
- **Planning & shifts** (horaires, affectations, jours fériés)
- **Module Paie v1** (calcul bulletins, exports CSV, gestion des variables, **export vers logiciels paie tiers** — Sage, Saari, etc.)
- **Dashboard analytics** (présences, retards, absences, coûts)
- **Notifications push multi-canal** (employés et managers) — Expo + Firebase FCM, granularité par site / département
- **IA Copilot** (assistant RH intelligent) — **quota de tokens limité** (cible : 5 000 tokens / mois / compte, suffisant pour ~30 à 50 requêtes standards)
- **Webhooks sortants** : jusqu'à **3 endpoints** configurables + events avancés (`attendance.late`, `payroll.computed`, `employee.created`) — signature HMAC-SHA256, retry automatique, documentation OpenAPI
- **API ouverte REST** (lecture + écriture sur les modules standards, quotas élevés, JWT)
- **Intégration ERP / SIRH tiers** sur devis (à partir de 150 000 FCFA) — connecteurs vers Sage, Odoo, Excel/CSV, Zapier-like custom
- **Support email prioritaire** (réponse sous 24h ouvrées)
- **Rapports d'audit** (logs de reconnaissance faciale)

**Non inclus :**

- ❌ Multi-sites au-delà de 4
- ❌ Support téléphonique dédié
- ❌ SLA garanti

### 4.3 ENTERPRISE — 220 000 FCFA / mois (matériel fourni obligatoire)

**Cible :** ETI, grands comptes, organisations multi-sites (>100 employés, 3 sites inclus minimum).

**Inclus :**

- Tout le contenu de PRO
- **IA Copilot — quota étendu** (cible : 50 000 tokens / mois / compte, soit ~10× le quota PRO, pour des usages intensifs)
- **Sites illimités** (au-delà de 3, facturation à l'extension)
- **Multi-sociétés** (sous-entités, holdings)
- **Tableau de bord manager dédié** (par site, par département)
- **API ouverte REST** : lecture + écriture + **quotas élevés** (jusqu'à 10 000 requêtes/heure) + **authentification OAuth2 / clé API dédiée par client**
- **Webhooks sortants illimités** : tous les events, retry exponentiel, dashboard de monitoring des deliveries, replay manuel
- **Connecteurs SI tiers pré-packagés** : Sage, Odoo, Saari paie, Excel/CSV, webhooks génériques — inclus dans le setup ENTERPRISE
- **Bus d'événements interne** : export temps réel des événements RH vers datawarehouse / SI client
- **Audit logs avancés** (traçabilité complète, conformité RGPD / OHADA)
- **SLA 99,5 %** (garanti temps de réponse)
- **Gestionnaire de compte dédié** (point de contact unique)
- **Support téléphonique** (hotline heures ouvrées)
- **Matériel kiosque fourni obligatoire** (tablette compacte ou renforcée selon choix client)

---

## 5. Coûts additionnels (hors packs)

| Service | Tarif |
|---|---|
| **Tokens IA Copilot supplémentaires** (au-delà du quota inclus) | 5 000 FCFA / 10 000 tokens additionnels |
| **Formation sur site supplémentaire** (au-delà de l'inclusion PRO/ENTERPRISE) | 75 000 FCFA / demi-journée + déplacements |
| **Intégration SI tiers** (ERP, logiciel paie existant) | Sur devis (base 150 000 FCFA) |
| **Tablette kiosque compacte supplémentaire** (matériel seul) | 75 000 FCFA / unité |
| **Tablette kiosque renforcée supplémentaire** (matériel seul) | 165 000 FCFA / unité |
| **Migration de données** (reprise d'un système existant) | Sur devis (base 200 000 FCFA) |
| **Support premium 24/7** (option ENTERPRISE) | + 50 000 FCFA / mois |

---

## 6. Exemples de calcul

### 6.1 Cas A — Petite boutique, 8 employés, 1 site

Pack recommandé : **ESSENTIEL**

- Setup : 0
- Abonnement : 15 000 FCFA / mois
- **Coût annuel : 180 000 FCFA** (≈ 275 €)

### 6.2 Cas B — PME de services, 45 employés, 2 sites, tablettes compactes

Pack recommandé : **PRO — AppareilCompact**

- Setup 1er site : 110 000
- Setup 2e site : 100 000 (extension) + 60 000 (tablette) = 160 000
- Abonnement 2 sites : 50 000 + 15 000 = 65 000 / mois
- **Coût année 1 : 270 000 setup + 780 000 abonnement = 1 050 000 FCFA** (≈ 1 600 €)

### 6.3 Cas C — PME industrielle, 30 employés, 2 sites, appareils déjà disponibles

Pack recommandé : **PRO — SansAppareil**

- Setup 1er site : 50 000
- Setup 2e site : 100 000 (extension)
- Abonnement 2 sites : 50 000 + 15 000 = 65 000 / mois
- **Coût année 1 : 150 000 setup + 780 000 abonnement = 930 000 FCFA** (≈ 1 420 €)

> Un client qui a déjà ses appareils paie **~50 % moins cher en setup** qu'un client qui demande la fourniture.

### 6.4 Cas D — ETI industrielle, 250 employés, 5 sites, tablettes renforcées

Pack recommandé : **ENTERPRISE — Renforcé**

- Setup de base : 350 000
- Setup 2 sites supplémentaires (80k + 150k + 90k supp) : 2 × 320 000 = 640 000
- Abonnement 5 sites : 220 000 + 2 × 25 000 = 270 000 / mois
- **Coût année 1 : 990 000 setup + 3 240 000 abonnement = 4 230 000 FCFA** (≈ 6 445 €)

> À titre de comparaison, une solution RH SaaS internationale (Silae, Nibelis, etc.) démarre à 200–500 €/mois/site **sans** le matériel kiosque ni l'installation sur site. TimeGate se positionne **2 à 3× moins cher** sur le segment PME.

---

## 7. Intégrations & synchronisation externe (différenciateur clé)

TimeGate est conçu **interopérable nativement**. C'est l'un de nos différenciateurs les plus forts vs les SaaS RH frontaliers qui enferment les données du client.

### 7.1 Ce qui est inclus dans chaque pack

| Capacité | ESSENTIEL | PRO | ENTERPRISE |
|---|:-:|:-:|:-:|
| **Appli mobile employé** (Expo / React Native, iOS + Android) | ✅ | ✅ | ✅ |
| **Notifications push multi-canal** (Expo + Firebase FCM, iOS + Android) | ✅ | ✅ | ✅ |
| **Messagerie interne** employé ↔ manager (avec notifications push) | ✅ | ✅ | ✅ |
| **API ouverte REST** (lecture seule, JWT) | ✅ | ✅ | ✅ |
| **Webhooks sortants signés HMAC-SHA256** (1 endpoint, events de base) | ✅ | — | — |
| **Webhooks sortants** (3 endpoints, events avancés, retry, monitoring) | — | ✅ | — |
| **Webhooks sortants illimités** (tous events, retry exponentiel, replay) | — | — | ✅ |
| **API ouverte REST** (lecture + écriture, quotas élevés) | — | ✅ | — |
| **API ouverte REST** + OAuth2 / clé API dédiée + quotas premium | — | — | ✅ |
| **Connecteurs SI tiers pré-packagés** (Sage, Odoo, Saari paie) | — | sur devis | ✅ inclus setup |
| **Bus d'événements interne** (vers datawarehouse / SI client) | — | — | ✅ |
| **Migration de données** depuis système existant | sur devis | sur devis | ✅ base 200k FCFA |

### 7.2 Tarification des services d'intégration

| Service | Tarif |
|---|---|
| **Intégration SI tiers** (ERP, logiciel paie, SIRH — connecteur sur mesure) | **Base 150 000 FCFA** + 75 000 FCFA / demi-journée additionnelle |
| **Migration de données** depuis système existant (registres papier, Excel, logiciel legacy) | Base 200 000 FCFA (≤ 500 employés) ; +50 FCFA / employé supp |
| **Connecteur pré-packagé** (Sage Paie, Odoo RH, Saari, Excel/CSV automatisé) | Inclus dans setup PRO/ENTERPRISE ; 50 000 FCFA / connecteur additionnel |
| **Webhook personnalisé** (event sur mesure au-delà du catalogue standard) | Sur devis |
| **Audit & conseil intégration SI** (cahier des charges, mapping, gouvernance) | 200 000 FCFA / jour |

> Les services d'intégration représentent un **accélérateur de marge** car ils sont **facturés au forfait** (ingénierie projet) et non inclus dans les abonnements récurrents — ils valorisent le setup comme **projet d'intégration** et non simple déploiement logiciel.

### 7.3 Architecture d'intégration

```
                          ┌──────────────────────────────────────────┐
                          │              CLIENT (organisation)        │
                          │                                          │
   ┌──────────┐  HTTPS    │   ┌─────────────┐    ┌──────────────┐   │
   │ ERP Sage ├──────────►│   │             │    │ Logiciel     │   │
   └──────────┘  Webhook  │   │  TimeGate   │    │ Paie tiers   │   │
   ┌──────────┐  signé    │   │  (NestJS)   │    │ (Saari, etc) │   │
   │ Odoo RH  ├──────────►│   │             │    └──────────────┘   │
   └──────────┘           │   └──────┬──────┘           ▲            │
   ┌──────────┐  REST API │          │                  │            │
   │ DataWh.  ├──────────►│          │ Webhook signé    │            │
   └──────────┘           │          ▼                  │            │
                          │   ┌─────────────┐           │            │
                          │   │ Employés    │   Push    │            │
                          │   │ (Appli mob.)├──────────►│            │
                          │   │ iOS+Android │ FCM/Expo  │            │
                          │   └─────────────┘           │            │
                          └──────────────────────────────────────────┘
```

**Flux principaux :**

- **TimeGate → SI client** : webhooks signés sur événements RH (`attendance.recorded`, `payroll.computed`, `leave.approved`...). Le SI client reçoit des événements structurés JSON, prêts à intégrer dans un ERP ou datawarehouse.
- **SI client → TimeGate** : API REST ouverte permet d'importer des référentiels (employés, départements) ou de pousser des événements (depuis un système de badge legacy, par exemple).
- **TimeGate → employés** : notifications push multi-canal via Firebase Cloud Messaging (Android, iOS natif) ET Expo Push (Expo/React Native). Routage automatique selon le type de device.
- **Bidirectionnel messaging** : l'appli employé permet la conversation asynchrone avec le manager ; toute réponse déclenche une notification push.

### 7.4 Sécurité & conformité

- **Webhooks** : signature HMAC-SHA256, timestamp anti-replay, header `x-timegate-signature` standard.
- **API REST** : authentification JWT (court terme) + clé API dédiée par intégration (long terme).
- **Push tokens** : rotation automatique ; tokens invalides désactivés silencieusement.
- **Données** : chiffrées au repos (PostgreSQL) et en transit (HTTPS/TLS 1.3).

---

## 8. Notes pédagogiques sur le pricing

### 7.1 Appli mobile employé incluse dans tous les packs

L'appli native (Expo / React Native, iOS + Android) est **incluse dès l'ESSENTIEL**, sans surcoût. C'est un argument de rétention et de transparence :

- **Pour le client ESSENTIEL (≤ 20 employés)** : l'appli remplace les usages email/SMS et permet à chaque employé de consulter ses pointages, soldes congés et notifications en autonomie.
- **Pour le client PRO/ENTERPRISE** : l'appli apporte la **fluidité d'usage** (notifications push en temps réel, scan rapide, mode hors-ligne), ce qui justifie le saut de gamme.
- C'est un **levier de différenciation fort** : les solutions SaaS RH importées ont rarement une appli mobile native de qualité pour les employés.

### 7.2 Stratégie de monétisation de l'IA Copilot

Le quota de tokens IA est volontairement limité dans le pack PRO (5 000 tokens/mois) pour :

- **Couvrir 80 % des usages standards** sans surcoût.
- **Créer une rampe d'upsell naturelle** vers ENTERPRISE.
- **Maîtriser les coûts techniques** : les appels LLM ont un coût serveur réel.

---

*Document rédigé dans le cadre de l'appel à compléments JIBC 2026 — TimeGate · projet personnel de Styve Maba · 2026-08-06*
# 02 — Checklist staging (avant remise client)

À cocher **côté TimeGate** avant d’envoyer les accès.  
Objectif : environnement stable, isolé, documenté — pas le laptop du développeur en Wi‑Fi café.

## A. Décisions d’hébergement

- [ ] Choisir le mode : **staging cloud** (recommandé) **ou** serveur on-prem client (plus lourd)
- [ ] URL publiques HTTPS prévues :
  - [ ] API : `https://api-staging.…/api/v1`
  - [ ] Dashboard : `https://app-staging.…`
  - [ ] Console : `https://admin-staging.…` (interne TimeGate uniquement si possible)
- [ ] Base PostgreSQL dédiée (pas la prod, pas le PC local)
- [ ] Stockage fichiers (R2/S3) dédié staging **ou** désactivé si hors scope photos
- [ ] CORS_ORIGIN = URLs staging exactes (dashboard + console + origins mobiles si besoin)

## B. Déploiement technique

### API (`api/`)

- [ ] `bun install` / dépendances figées
- [ ] `.env` staging (jamais commit) : `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, face engine
- [ ] `bunx prisma migrate deploy`
- [ ] `bun run prisma:seed` **ou** création org client dédiée
- [ ] `bun run build` + process manager (systemd / pm2 / container)
- [ ] Health check : `GET /api/v1/...` (login ou route health si dispo)
- [ ] `bun run test:use-cases` OK contre cet env (si réseau autorise)

### Face engine (si Phase B visage)

- [ ] Python venv + deps (`api/python/`)
- [ ] `FACE_ENGINE_PYTHON_BIN` / `FACE_ENGINE_SCRIPT_PATH` / timeout ≥ 45s
- [ ] Test enroll + verify sur 1 employé démo

### Dashboard (`dashboard/`)

- [ ] `NEXT_PUBLIC_TIMEGATE_API_URL` → API staging
- [ ] Auth secrets (`AUTH_SECRET`) distincts de la prod
- [ ] `bun run build` + `bun run start` (ou hébergeur)
- [ ] Login ADMIN seed OK

### Console (`console/`) — optionnel client

- [ ] Port / URL interne
- [ ] Compte SUPER_ADMIN uniquement TimeGate
- [ ] **Ne pas** donner la console au client sauf besoin SaaS

### App employé (`employee-app/`)

- [ ] Build de preview (EAS / APK interne) **ou** Expo Go si acceptable
- [ ] `EXPO_PUBLIC_TIMEGATE_API_URL` → API staging (HTTPS)
- [ ] Push FCM : projet Firebase **staging** (pas prod)
- [ ] 1 téléphone de test login employé OK

### Kiosk (`kiosk-app/`)

- [ ] Tablette Android dédiée pilote
- [ ] API URL en HTTPS (ou HTTP LAN contrôlé documenté)
- [ ] Provision test : branche + kiosk
- [ ] Heartbeat → kiosk ONLINE dans dashboard
- [ ] Au moins PIN **ou** visage validé

## C. Données & comptes

Choisir **une** option :

### Option 1 — Seed démo SOTRAFER (rapide)

- [ ] Seed exécuté
- [ ] Comptes de [../remise-client/03-acces.md](../remise-client/03-acces.md) testés
- [ ] Mot de passe commun communiqué **uniquement** aux testeurs (canal sécurisé)
- [ ] Clarifier au client : données fictives Congo / SOTRAFER

### Option 2 — Org client dédiée (recommandé pour vrai pilote)

- [ ] Créer org (console ou signup) + abonnement TRIAL / clé
- [ ] Créer ADMIN / MANAGER / 5 employés
- [ ] 1 branche, 1 horaire, affectations du jour
- [ ] 1 kiosk + PIN ou enroll face
- [ ] Documenter les **vrais** emails dans une fiche accès **privée** (pas dans git)

## D. Sécurité avant partage

Voir aussi [06-securite-remise.md](./06-securite-remise.md).

- [ ] Aucun `.env` tracké exposé au client
- [ ] Aucune clé Firebase / R2 / JWT prod dans le kit
- [ ] Rotation si secrets ont fuité dans le repo local
- [ ] Accès staging restreint (VPN / IP allowlist / auth basique si possible)
- [ ] Mention biométrie + conservation photos transmise au client

## E. Documentation remise

- [ ] Périmètre ([../remise-client/01-perimetre.md](../remise-client/01-perimetre.md)) signé / accepté
- [ ] Accès ([../remise-client/03-acces.md](../remise-client/03-acces.md)) rempli avec **URLs réelles**
- [ ] Scénarios UAT ([../remise-client/04-scenarios-uat.md](../remise-client/04-scenarios-uat.md))
- [ ] Feuille retour ([../remise-client/05-feuille-retour.md](../remise-client/05-feuille-retour.md))
- [ ] Créneau kickoff planifié (45–60 min)

## F. Go / No-Go interne

| Critère | OK ? |
|---------|------|
| Dashboard login + page d’accueil chargent | |
| API répond en < 2 s sur login | |
| Seed ou org client utilisable | |
| Au moins une méthode de pointage testée en interne | |
| Support joignable pendant les heures client | |

**Go** seulement si les 5 lignes sont OK.

## Commandes locales de smoke (dev / pré-staging)

```bash
# API
cd api && bun install && bunx prisma migrate deploy && bun run prisma:seed && bun run start:dev

# Dashboard
cd dashboard && bun install && bun run dev

# Console (interne)
cd console && bun install && bun run dev

# Use-cases API (API déjà up)
cd api && bun run test:use-cases
```

Ports locaux par défaut : API `4001`, dashboard `3000`, console `3002`.

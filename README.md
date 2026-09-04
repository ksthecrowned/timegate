# TimeGate

TimeGate est une solution de **pointage intelligent par reconnaissance faciale** pour environnements professionnels (entreprises, sites, ateliers, agences), avec:

- une app mobile kiosk pour la capture/verification en temps reel
- une API metier (auth, RH, planning, logs, contrats, salaires, absences)
- un dashboard admin pour piloter les operations
- une app employé Expo pour consulter pointages et congés

Le projet est organise en monorepo.

## Contexte agents

Avant d’explorer le codebase : **[`docs/ecosystem/INDEX.md`](./docs/ecosystem/INDEX.md)**  
(`AGENTS.md` racine + skill `.cursor/skills/timegate-ecosystem/`).

## Vision du projet

TimeGate remplace le pointage manuel ou badge classique par un flux simple:

1. l'employe se presente devant le kiosk mobile
2. le visage est detecte localement
3. une verification serveur est lancee
4. le systeme confirme l'identite et enregistre les evenements de presence
5. les donnees sont visibles en temps reel dans le dashboard

Objectifs principaux:

- reduire la fraude au pointage
- automatiser les workflows RH
- centraliser les donnees multi-sites dans une interface unique

## Architecture

```text
TimeGate/
  api/           -> NestJS + Prisma + PostgreSQL + moteur facial Python
  dashboard/     -> Next.js (backoffice admin, port 3000)
  console/       -> Next.js (Console Plateforme SaaS, port 3002)
  employee-app/  -> Expo (espace employé)
  kiosk-app/     -> Expo / React Native (kiosk facial)
  docs/ecosystem/ -> hub contexte agents (INDEX, integrations, projects)
```

### `api`

API principale de TimeGate:

- authentification (admin, manager, mobile device token)
- multi-tenant (organisation/site)
- verification faciale
- gestion RH (employes, contrats, absences, retards, salaires, conges)
- pointage et logs de reconnaissance
- upload d'images (ex: Cloudflare R2)

La reconnaissance faciale fonctionne via le moteur Python interne (`api/python/face_engine.py`).

Variables : `FACE_ENGINE_PYTHON_BIN`, `FACE_ENGINE_SCRIPT_PATH`, `FACE_ENGINE_TIMEOUT_MS`, `FACE_VERIFY_THRESHOLD`.

Un mode service facial externe est planifié (hors scope actuel).

### `dashboard`

Backoffice web pour les equipes admin/RH:

- suivi des employes et de leurs profils
- visualisation des presences, retards, absences, conges
- gestion des contrats et salaires
- suivi des logs de verification faciale
- administration globale (selon role)

### `employee-app`

Application **Expo** pour les employes (separee du dashboard admin) :

- connexion via `POST /auth/employee/identify` puis `POST /auth/employee/login`
- consultation des pointages et soldes de conges
- demandes de conge, QR punch (trusted device)

Env : `EXPO_PUBLIC_API_URL` (voir `docs/ecosystem/projects/employee-app.md`).

### `kiosk-app`

Application kiosk (tablet/telephone):

- ecran de provisioning initial de l'appareil
- detection faciale live
- capture + envoi de l'image de verification
- feedback utilisateur en temps reel (etat, messages, progression)
- usage en mode point de pointage partage

## Stack technique

- **Backend**: NestJS, Prisma, PostgreSQL
- **Face engine**: Python (`face_recognition` / dlib)
- **Frontend admin**: Next.js, React, TypeScript
- **Mobile**: Expo, React Native, Expo Router

## Demarrage rapide (local)

## 1) API

```bash
cd api
bun install
bun run prisma:generate
bun run start:dev
```

L'API ecoute par defaut sur le port **4001** avec le prefixe global **`/api/v1`**.

Copier `api/.env.example` vers `api/.env`.

Variables importantes dans `api/.env` :

- `PORT` (defaut `4001`)
- `CORS_ORIGIN` (ex: `http://localhost:3000,http://localhost:3002` pour dashboard + console ; ajouter origins Expo/LAN si besoin)
- `DATABASE_URL`
- `JWT_SECRET`
- `FACE_ENGINE_PYTHON_BIN`
- `FACE_ENGINE_SCRIPT_PATH` (optionnel, défaut `api/python/face_engine.py`)
- `FACE_ENGINE_TIMEOUT_MS`
- `FACE_VERIFY_THRESHOLD`

## 2) Dashboard

```bash
cd dashboard
bun install
bun run dev
```

URL par defaut: `http://localhost:3000`

Copier `dashboard/.env.example` vers `dashboard/.env.local` :

- `NEXT_PUBLIC_TIMEGATE_API_URL=http://localhost:4001/api/v1` (API Nest sur port **4001**, prefixe **/api/v1**)

## 3) Console Plateforme (SaaS)

```bash
cd console
bun install
bun run dev
```

URL par defaut: `http://localhost:3002`

Copier `console/.env.example` vers `console/.env.local` :

- `NEXT_PUBLIC_TIMEGATE_API_URL=http://localhost:4001/api/v1`
- `AUTH_SECRET` (meme valeur que dashboard en local si besoin)

Connexion reservee aux comptes **SUPER_ADMIN** (sans SKU).

## 4) Espace employé (Expo)

```bash
cd employee-app
bun install
bun run start
```

Copier / definir `EXPO_PUBLIC_API_URL` (ex. `http://<IP-LAN>:4001/api/v1`).

Compte seed employe : `patrick.mukendi@sotrafer.cg` / `ChangeMe123!`

## 5) Kiosk App

```bash
cd kiosk-app
bun install
bun run android
```

Copier `kiosk-app/.env.example` vers `kiosk-app/.env` :

- `EXPO_PUBLIC_TIMEGATE_API_URL` (ex: `http://<IP-LAN>:4001/api/v1` sur appareil physique)

## Bonnes pratiques

- ne pas versionner les fichiers `.env` locaux
- pour Android + API en `http://`, verifier que le trafic cleartext est autorise en dev
- si la verification faciale timeout, augmenter `FACE_ENGINE_TIMEOUT_MS` (ex: 45000 ou 60000)
- **démo uniquement** : `DEMO_AUTO_ATTENDANCE_SEED=1` **et** une allowlist (`DEMO_AUTO_ATTENDANCE_SEED_SKUS` et/ou `DEMO_AUTO_ATTENDANCE_SEED_COMPANY_IDS`, séparés par des virgules). Sans allowlist, aucune org n’est touchée. À 10h fuseau org, si **aucun** pointage n’existe le jour local pour une org listée, injection de CHECK_IN/CHECK_OUT cohérents ; dès qu’un pointage existe, no-op. Ne pas activer sur des orgs clients réelles.

## Statut

Projet en evolution active, avec focus sur:

- robustesse de la verification faciale
- ergonomie kiosk mobile
- industrialisation SaaS / multi-tenant
- extraction des modules reutilisables (ex: service facial dedie)

## Kit pilote (essai entreprise)

Documentation prête à remettre / à compléter avant un pilote client :

→ [`docs/pilot/remise-client/`](docs/pilot/remise-client/) — **pack à envoyer au client**  
→ [`docs/pilot/`](docs/pilot/README.md) — index (interne + remise)

## CI

Workflow GitHub Actions : [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

- Job **api** : Postgres, migrate, seed, tests use-cases (`bun run test:use-cases`)
- Job **frontend** : `tsc --noEmit` sur `dashboard`, `console`


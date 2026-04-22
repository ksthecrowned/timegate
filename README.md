# TimeGate

TimeGate est une solution de **pointage intelligent par reconnaissance faciale** pour environnements professionnels (entreprises, sites, ateliers, agences), avec:

- une app mobile kiosk pour la capture/verification en temps reel
- une API metier (auth, RH, planning, logs, contrats, salaires, absences)
- un dashboard admin pour piloter les operations

Le projet est organise en monorepo.

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
  api/         -> NestJS + Prisma + PostgreSQL + moteur facial Python
  dashboard/   -> Next.js (backoffice admin)
  mobile-app/  -> Expo / React Native (kiosk facial)
```

### `api`

API principale de TimeGate:

- authentification (admin, manager, mobile device token)
- multi-tenant (organisation/site)
- verification faciale
- gestion RH (employes, contrats, absences, retards, salaires, conges)
- pointage et logs de reconnaissance
- upload d'images (ex: Cloudflare R2)

La reconnaissance faciale peut fonctionner en:

- **interne** (`FACE_RECO_MODE=internal`) via `api/python/face_engine.py`
- **externe** (`FACE_RECO_MODE=external`) via un service facial dedie

### `dashboard`

Backoffice web pour les equipes admin/RH:

- suivi des employes et de leurs profils
- visualisation des presences, retards, absences, conges
- gestion des contrats et salaires
- suivi des logs de verification faciale
- administration globale (selon role)

### `mobile-app`

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

Variables importantes dans `api/.env`:

- `DATABASE_URL`
- `JWT_SECRET`
- `FACE_ENGINE_PYTHON_BIN`
- `FACE_ENGINE_TIMEOUT_MS`
- `FACE_VERIFY_THRESHOLD`
- `FACE_RECO_MODE` (`internal` ou `external`)
- (si externe) `FACE_SERVICE_URL`, `FACE_SERVICE_API_KEY`

## 2) Dashboard

```bash
cd dashboard
bun install
bun run dev
```

URL par defaut: `http://localhost:3000`

## 3) Mobile App

```bash
cd mobile-app
bun install
bun run android
```

Variable importante dans `mobile-app/.env`:

- `EXPO_PUBLIC_TIMEGATE_API_URL` (ex: `http://<IP-LAN>:4001/api`)

## Bonnes pratiques

- ne pas versionner les fichiers `.env` locaux
- pour Android + API en `http://`, verifier que le trafic cleartext est autorise en dev
- si la verification faciale timeout, augmenter `FACE_ENGINE_TIMEOUT_MS` (ex: 45000 ou 60000)

## Statut

Projet en evolution active, avec focus sur:

- robustesse de la verification faciale
- ergonomie kiosk mobile
- industrialisation SaaS / multi-tenant
- extraction des modules reutilisables (ex: service facial dedie)


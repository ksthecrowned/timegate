# TimeGate — App kiosk (Expo)

Terminal de vérification faciale pour borne / tablette Android (ou iOS).

L’espace employé (congés, soldes, pointages personnels) est sur **`employee-web`** (port 3001), pas dans cette app.

## Prérequis

- API TimeGate en cours d'exécution (`api`, port **4001** par défaut)
- Compte **ADMIN** ou **MANAGER** + SKU organisation (ex. **`SOTR`** après seed)
- Employés avec visage enrôlé sur la branche du kiosk choisi
- Moteur facial configuré côté API (`FACE_RECO_MODE`, Python ou service externe)

## Configuration

```bash
cd mobile-app
cp .env.example .env
# Éditer EXPO_PUBLIC_TIMEGATE_API_URL (IP LAN sur appareil réel)
bun install
bun run start
# ou : bun run android
```

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_TIMEGATE_API_URL` | Base API, ex. `http://192.168.1.10:4001/api/v1` |

| Environnement | URL API typique |
|---------------|-----------------|
| Appareil physique (LAN) | `http://<IP-PC>:4001/api/v1` |
| Émulateur Android | `http://10.0.2.2:4001/api/v1` |
| Simulateur iOS (Mac) | `http://localhost:4001/api/v1` |

Android autorise le HTTP en dev via `usesCleartextTraffic` dans `app.json`. En production, préférez HTTPS.

## Parcours kiosk

1. **Bootstrap** — `POST /auth/mobile/bootstrap` (email, mot de passe, SKU) → token opérateur + liste des branches
2. **Provision** — choix branche + appareil → `POST /auth/mobile/provision` → token lifetime stocké localement
3. **Scan** — `POST /auth/mobile/verify` (photo multipart) ; pointage + log si match
4. **PIN fallback** — `POST /auth/mobile/verify-pin` (écran `/pin`) si échec visage
5. **Hors ligne** — en cas d'erreur réseau, la capture est mise en file ; sync auto avec `offlineSync=1` et `capturedAt`
6. **Heartbeat** — `POST /auth/mobile/heartbeat` toutes les ~90 s tant que l'app est ouverte (statut kiosk ONLINE)

## Comptes seed (démo)

| Usage | Email | Mot de passe | SKU |
|-------|-------|--------------|-----|
| Provision kiosk | `admin@monorganisation.com` | `ChangeMe123!` | `SOTR` |
| Manager kiosk | `manager@monorganisation.com` | `ChangeMe123!` | `SOTR` |

Portail employé (web) : `patrick.mukendi@sotrafer.cg` / `ChangeMe123!` → `employee-web` sur http://localhost:3001

**PIN fallback démo :** Patrick Mukendi — PIN `1234` (copier l’ID employé depuis le dashboard RH)

## Scripts

| Commande | Description |
|----------|-------------|
| `bun run start` | Metro / Expo dev |
| `bun run android` | Build et lance sur Android |
| `bun run typecheck` | Vérification TypeScript |

## Dépannage

- **Connexion impossible** : vérifiez l’URL API dans `.env` et que le téléphone est sur le même réseau que le PC.
- **Visage non reconnu** : enrôlement facial requis dans le dashboard (fiche employé).
- **Timeout verify** : augmenter `FACE_ENGINE_TIMEOUT_MS` dans `api/.env`.
- **Vérifications en attente** : compteur affiché sur l’écran d’accueil kiosk ; sync automatique au retour réseau sur `/scan`.

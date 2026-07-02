# TimeGate — Appareils de confiance employé & auth progressive — Design

**Date** : 2026-06-28  
**Statut** : implémenté (2026-06-28)  
**Priorité** : **prérequis** avant lot C (Manager pro) et renforcement des actions sensibles déjà livrées (reprise pause, QR)  
**Lots concernés** : Hub identité employé (C), Employé self-service (F), sécurité transverse

---

## Contexte

L’employee-app permet aujourd’hui :

- Login **email + mot de passe** en une étape
- Enregistrement **push** via `TimeGateDevice` (token FCM), sans notion de confiance
- Actions sensibles (reprise pause `BREAK_END`, QR rotatif) **sans contrôle d’appareil**

Le kiosk, lui, applique déjà un verrou **1 appareil = 1 kiosk** (`deviceToken`).

**Objectif** : n’autoriser les actions sensibles que depuis des **appareils de confiance**, avec onboarding employé sans mot de passe initial, OTP e-mail pour la première configuration, et gestion du **partage d’un même téléphone** entre plusieurs employés.

---

## Décisions produit (validées)

| Sujet | Choix |
|-------|-------|
| Modèle de confiance | **Paire `(userId, deviceInstallId)`** — pas un appareil global |
| 1er appareil employé | Auto-`TRUSTED` si aucun autre user n’est déjà `TRUSTED` sur ce `deviceInstallId` |
| Appareil partagé | 1er employé sur le téléphone → `TRUSTED` pour lui ; 2ᵉ employé sur le **même** téléphone → `PENDING` (lecture seule) |
| Appareil supplémentaire (même employé) | `PENDING` jusqu’à approbation admin |
| Compte à la création | `User` lié à l’employé, **`passwordHash` null** |
| Login | Saisie **e-mail seule** → branchement selon présence du mot de passe |
| Première connexion | **OTP e-mail** (réutilise forgot-password) → création mot de passe → login réussi → enregistrement appareil |
| Enregistrement appareil | **Uniquement après login réussi** |
| Appareil en attente | **Lecture seule** : planning, congés, notifs, profil ; **bloqué** : reprise pause, QR, réclamations pointage |
| Approbation | Admin / manager depuis dashboard (fiche employé + inbox tenant) |

---

## Approches envisagées — identification appareil

| # | Approche | Verdict |
|---|----------|---------|
| 1 | **UUID d’installation** (`expo-secure-store`), envoyé au login | **Retenu** — simple, révocable, aligné kiosk |
| 2 | Empreinte (OS + modèle + installId) | Rejeté — faux positifs, complexité |
| 3 | JWT seul sans table dédiée | Rejeté — pas de révocation / inbox admin |

`TimeGateTrustedDevice` est **distinct** de `TimeGateDevice` (tokens push FCM).

---

## Section 1 — Auth & onboarding

### Flux employee-app

```text
[1] Saisie e-mail
      ↓
POST /auth/employee/identify { email }
      ↓
┌─ compte inconnu ou rôle ≠ EMPLOYEE → message générique (anti-énumération)
├─ hasPassword = false
│     → [2] OTP (POST /auth/forgot-password)
│     → [3] Vérifier code (POST /auth/verify-reset-code)
│     → [4] Créer mot de passe (POST /auth/reset-password)
│     → [5] Login (POST /auth/employee/login + deviceInstallId)
└─ hasPassword = true
      → [5] Login direct
      ↓
Login OK → upsert TimeGateTrustedDevice → JWT + deviceTrust
```

### Endpoints

| Méthode | Route | Rôle |
|---------|-------|------|
| `POST` | `/auth/employee/identify` | `{ email }` → `{ nextStep: 'OTP_SETUP' \| 'PASSWORD' }` (+ délai constant anti-enum) |
| `POST` | `/auth/forgot-password` | Inchangé — envoi OTP 6 chiffres |
| `POST` | `/auth/verify-reset-code` | Inchangé — retourne `resetToken` |
| `POST` | `/auth/reset-password` | Inchangé — pose le **premier** mot de passe si `passwordHash` null |
| `POST` | `/auth/employee/login` | Ajout `deviceInstallId`, `platform`, `deviceLabel?` ; enregistre appareil **après** auth |

### Création compte (admin)

- Lors de la liaison employé ↔ user : créer `User` avec `timeGateRole: EMPLOYEE`, `passwordHash: null`, `email = personalEmail`.
- `employeeLogin` **refuse** si `passwordHash` null (message : « Configurez votre mot de passe via l’e-mail reçu » — en pratique l’app enchaîne OTP).

### Réponse login enrichie

```json
{
  "access_token": "...",
  "deviceTrust": "TRUSTED",
  "deviceTrustMessage": null
}
```

Valeurs : `TRUSTED` | `PENDING`. Si `REVOKED` sur la paire → **403** au login.

---

## Section 2 — Modèle données & enforcement API

### Schéma Prisma

**`User.passwordHash`** → nullable (`String?`).

**Nouveau modèle `TimeGateTrustedDevice`**

| Champ | Type | Notes |
|-------|------|-------|
| `id` | String | `TDV-…` |
| `userId` | FK User | |
| `deviceInstallId` | String | UUID client, max 64 |
| `platform` | `TimeGateDevicePlatform` | IOS / ANDROID / WEB |
| `deviceLabel` | String? | ex. « iPhone 14 » |
| `status` | enum | `TRUSTED` \| `PENDING` \| `REVOKED` |
| `trustedAt` | DateTime? | |
| `lastSeenAt` | DateTime | |
| `createdAt` | DateTime | |

**Contrainte unique :** `@@unique([userId, deviceInstallId])`  
**Index :** `(deviceInstallId, status)` pour détecter le partage.

### Algorithme de confiance (au login réussi)

```text
1. Upsert (userId, deviceInstallId) — mettre à jour lastSeenAt, platform, label

2. Si status existant = REVOKED → 403 « Appareil révoqué »

3. Si enregistrement existant TRUSTED ou PENDING → conserver le status

4. Si nouveau enregistrement :
   a. Si ∃ userId' ≠ userId avec TRUSTED sur ce deviceInstallId → PENDING  (appareil partagé)
   b. Sinon si l'user n'a aucun autre appareil TRUSTED → TRUSTED  (1er appareil perso)
   c. Sinon → PENDING  (2ᵉ téléphone perso)
```

### JWT

Inclure dans le payload JWT employé :

- `deviceInstallId`
- `deviceTrust` : `TRUSTED` | `PENDING`

Alternative acceptable v1 : claim `deviceInstallId` + lookup serveur dans le guard (plus sûr si révocation immédiate requise).

### `TrustedDeviceGuard`

Appliqué sur les routes **sensibles** employé :

| Route | Guard |
|-------|-------|
| `POST /employee/break-resume` | Oui |
| `GET /employee/qr-punch/current` | Oui |
| Futures réclamations pointage | Oui |
| `GET /employee/me`, leaves, planning, notifications | Non |
| `POST /employee/leaves` | **Non** v1 (demande congé = lecture seule étendue ; à revisiter si fraude) |

Erreur : **403** `{ message: '…', code: 'DEVICE_NOT_TRUSTED' }`.

### Admin API (dashboard)

| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/employees/:id/trusted-devices` | Liste appareils de l’employé |
| `PATCH` | `/employees/:id/trusted-devices/:deviceId` | `{ status: 'TRUSTED' \| 'REVOKED' }` |
| `GET` | `/trusted-devices/pending` | Inbox tenant (tous PENDING) |

Audit log : `TRUSTED_DEVICE_APPROVED`, `TRUSTED_DEVICE_REVOKED`.

---

## Section 3 — UI & ordre d’implémentation

### Employee-app

| Écran / composant | Changement |
|-------------------|------------|
| `login.tsx` | Étape 1 : e-mail seul → appel `identify` |
| `(auth)/verify-code.tsx` | Réutilisé pour OTP setup (titre adapté « Activez votre compte ») |
| `(auth)/reset-password.tsx` | Réutilisé pour 1er mot de passe |
| Nouveau `(auth)/set-password-login.tsx` ou fusion login étape 2 | Mot de passe + envoi `deviceInstallId` |
| `lib/deviceInstallId.ts` | Génère UUID v4 au 1er lancement, `SecureStore` clé `timegate_device_install_id` |
| `TrustedDeviceBanner.tsx` | Bandeau si `PENDING` sur toutes les screens authentifiées |
| `break-resume.tsx`, `qr-punch.tsx` | Désactiver bouton si `PENDING` (defense in depth côté client) |
| Logout | **Ne pas** effacer `deviceInstallId` |

### Dashboard tenant

| Zone | Contenu |
|------|---------|
| Fiche employé `/employees/[id]` | Carte **Appareils de confiance** : label, plateforme, statut, dernière activité, badge « partagé » si plusieurs users sur le même `deviceInstallId` |
| Administration ou accueil manager | Widget / page **Appareils en attente** avec actions Approuver / Refuser |
| Création employé | Case « Créer accès app employé » → user sans mot de passe |

### Migration données existantes

- Employés demo / prod avec `passwordHash` déjà défini : **inchangés** (`identify` → branche `PASSWORD`).
- Seed : créer au moins un employé **sans** mot de passe pour tester le flux OTP.
- Au 1er login post-déploiement sur appareil existant : appliquer l’algorithme §2 (1er login = TRUSTED si règles OK).

### Ordre d’implémentation (avant lot C)

| Phase | Contenu | Estimation |
|-------|---------|------------|
| **TD-1** | Migration Prisma (`passwordHash` nullable, `TimeGateTrustedDevice`) | 0,5 j |
| **TD-2** | `identify`, login enrichi, algorithme confiance, JWT claims | 1 j |
| **TD-3** | `TrustedDeviceGuard` + routes sensibles (break-resume, QR) | 0,5 j |
| **TD-4** | Employee-app wizard auth + `deviceInstallId` + bandeau | 1 j |
| **TD-5** | Dashboard admin (liste + approbation) | 1 j |
| **TD-6** | Création user sans mot de passe côté admin + doc | 0,5 j |

**Total ~4,5 j** — à livrer **avant** lot C (Manager pro).

### Tests manuels minimum

1. Employé A, 1er login sur téléphone X → TRUSTED → reprise pause OK  
2. Employé B, login sur même X → PENDING → reprise pause 403, planning OK  
3. Admin approuve B sur X → TRUSTED → reprise pause OK  
4. Employé A, 2ᵉ téléphone Y → PENDING  
5. Nouvel employé sans mot de passe : identify → OTP → set password → TRUSTED  
6. Appareil révoqué → login 403  

### Hors scope v1

- Auth biométrique OS (Lot F, item séparé)
- Limite max d’appareils TRUSTED par employé
- Notification push à l’admin à chaque PENDING (option lot D)
- Blocage des demandes de congé en PENDING

---

## Références code existant

| Fichier | Usage |
|---------|-------|
| `api/src/auth/auth.service.ts` | `requestPasswordReset`, `verifyResetCode`, `resetPassword`, `employeeLogin` |
| `api/src/devices/devices.service.ts` | Push FCM — **ne pas fusionner** avec trusted device |
| `api/src/employee-portal/` | Guard sur break-resume, qr-punch |
| `employee-app/app/(auth)/` | Wizard OTP existant |
| `TODOS.md` Lot F item 9 | Auth biométrique — postérieur |

---

## Self-review (2026-06-28)

- [x] Pas de TBD / sections vides  
- [x] Cohérent : confiance = paire user+device ; partage explicite  
- [x] Scope borné à trusted device + auth progressive (pas lot C)  
- [x] Ambiguïté levée : 2ᵉ user sur même téléphone = PENDING même si 1er appareil du user  

---

*Prochaine étape après validation de cette spec : plan d’implémentation détaillé (writing-plans), puis développement TD-1 → TD-6 avant lot C.*

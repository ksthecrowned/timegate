# TimeGate — Pointage QR inversé (employé scanne le kiosk) — Design

**Date** : 2026-07-25  
**Statut** : implémenté (branche `feat/qr-punch-employee-scans-kiosk`)  
**Priorité** : P1 — remplace le flux QR actuel  
**Lots concernés** : Pointage multi-méthodes (B), Employé self-service (F), Trusted devices, Kiosk

---

## Contexte

### Flux actuel (à retirer)

1. Admin active un secret QR **par employé** (`Employee.qrPunchSecret`).
2. L’**employee-app** affiche un QR personnel rotatif (`GET /employee/qr-punch/current`).
3. Le **kiosk** ouvre la caméra et scanne ce QR (`POST /auth/mobile/verify-qr`).

Inconvénients : UX (présenter l’écran au kiosk), secret affiché sur le téléphone, faible lien avec l’appareil de confiance, offline QR kiosk impossible (codes employés rotatifs).

### Objectif

Inverser le flux :

- Le **kiosk** affiche un QR de **challenge** (mode « Pointage QR » uniquement).
- L’**employé** scanne avec l’employee-app (appareil `TRUSTED`).
- Support **offline** : file locale sur le téléphone → sync API → vérification `TRUSTED` au sync.
- **Pas de GPS** en v1.

---

## Décisions produit (validées)

| Sujet | Choix |
|-------|-------|
| Remplacement | **Total** — plus de QR personnel employé ni de scan caméra kiosk pour le pointage |
| Affichage kiosk | Uniquement en mode dédié **« Pointage QR »** (pas sur l’idle facial) |
| Qui scanne | L’employé (employee-app) |
| GPS | **Non** en v1 (option tenant éventuelle en v2) |
| Confiance appareil | `@RequireTrustedDevice` sur scan + sync |
| Offline | Oui — file sur employee-app ; validation crypto + `TRUSTED` **au moment du sync** |
| Si sync refuse (révocation, QR expiré…) | Message clair ; filet = **réclamation pointage** |
| Résolution pointage | Même machine à états que face/NFC (`resolveAttendancePunch` + recorder) |
| Feedback kiosk | Poll court du résultat du challenge après affichage |

Hors scope v1 : deep link obligatoire, WebSocket, dual-mode (ancien + nouveau), GPS, widgets.

---

## Approches techniques envisagées

| # | Approche | Verdict |
|---|----------|---------|
| 1 | Challenge kiosk signé (HMAC / secret provisionné) + poll résultat | **Retenu** |
| 2 | Deep link URL dans le QR | Rejeté en v1 (fragilité OS) — possible amélioration UX plus tard |
| 3 | Confirmation manuelle « Pointer ? » après chaque scan | Rejeté en v1 (friction) ; TTL court suffit |

---

## Section 1 — Modèle crypto & données

### Secret de signature kiosk

- Nouveau champ sur `TimeGateKiosk` : `qrChallengeSecret` (base64url, 32 bytes), généré / tourné au **provisionnement** (ou endpoint admin « régénérer secret QR »).
- Remplace l’usage produit de `Employee.qrPunchSecret` / `qrPunchSecretIssuedAt` (migration : colonnes dépréciées puis drop, ou nullifiées + UI admin retirée).

### Payload QR (v3)

Format affiché :

```text
TGQR:v3:{kioskId}:{slot}:{nonce}:{mac}
```

| Champ | Rôle |
|-------|------|
| `kioskId` | Borne concernée |
| `slot` | Fenêtre temporelle (~45–60 s), comme l’ancien util |
| `nonce` | Aléa court anti-rejeu (unique par slot ou global one-shot côté serveur) |
| `mac` | HMAC-SHA256(`kioskId:slot:nonce`, `qrChallengeSecret`) tronqué |

Génération :

- **Online** : optionnel `POST /auth/mobile/qr-challenge` (auth kiosk) pour enregistrer le nonce serveur + retourner payload (facilite le poll résultat).
- **Offline** : le kiosk génère localement avec le secret stocké en secure store (reçu au provision). Le nonce offline sera accepté au sync si MAC valide + slot dans la fenêtre / âge max.

### Anti-rejeu

- Table ou cache `TimeGateQrChallengeRedeem` : `(kioskId, nonce)` ou hash payload, `redeemedAt`, `employeeId?`, `resultJson?`.
- Un nonce ne peut produire **qu’un** pointage réussi.
- Tolérance d’horloge : slot courant ±1 (aligné util actuel).
- Offline sync : `scannedAt` doit être ≤ `offlineSyncMaxAgeMinutes` (setting tenant déjà existant, défaut 720).

---

## Section 2 — Flux online

```text
[Kiosk] Mode « Pointage QR »
   → crée / affiche challenge (rotatif ~45–60 s)
   → poll GET résultat challenge

[Employé] Ouvre scanner employee-app
   → scan payload
   → POST /employee/qr-punch/scan { payload }
        Guards: JWT EMPLOYEE + TrustedDevice TRUSTED
   → API vérifie MAC, slot, nonce inédit, kiosk actif + qrEnabled
   → resolveAttendancePunch + enregistre (source QR, kioskId)
   → marque challenge redeemed + résultat

[Kiosk] Poll voit succès / échec → MessageBox + retour idle ou reste en mode QR
```

### Endpoints

| Méthode | Route | Auth | Rôle |
|---------|-------|------|------|
| `POST` | `/auth/mobile/qr-challenge` | Kiosk token | Créer challenge + payload (online) |
| `GET` | `/auth/mobile/qr-challenge/:id/result` ou `?nonce=` | Kiosk token | Poll résultat |
| `POST` | `/employee/qr-punch/scan` | Employé + TRUSTED | Redeem online |
| `POST` | `/employee/qr-punch/sync` | Employé + TRUSTED | Redeem file offline |

Retirer :

- `GET /employee/qr-punch/current`
- `POST /auth/mobile/verify-qr` (payload employé)
- UI dashboard « activer QR employé » / carte secret employé (remplacée par secret kiosk si besoin d’ops)
- Écran employee-app `/qr-punch` (affichage) → remplacé par **scanner**

---

## Section 3 — Flux offline

```text
[Kiosk offline] Mode QR → génère TGQR:v3 localement (secret provisionné)
[Employé offline] Scan → enqueue SecureStore/File :
    { clientId, payload, scannedAt, deviceInstallId }
[Employé online] Sync automatique (app foreground / réseau) :
    POST /employee/qr-punch/sync { items: [...] }
[API] Pour chaque item :
    1. TRUSTED maintenant ? sinon reject (strict)
    2. parse + verify MAC avec secret kiosk
    3. nonce non rejoué
    4. scannedAt dans offlineSyncMaxAgeMinutes
    5. punch avec capturedAt/scannedAt, flag offlineSync
    6. réponse par item : ok | errorCode
```

### Règle TRUSTED (validée)

- Vérification **au sync** uniquement (pas de « était trusted au scan »).
- Si révoqué entre-temps → rejet ; l’employé utilise une **réclamation**.

### UX employee-app

- Badge « X pointages QR en attente »
- Après sync partiel : toast des échecs (révoqué / expiré / déjà utilisé)
- Lien rapide vers réclamation si `DEVICE_NOT_TRUSTED` ou `CHALLENGE_EXPIRED`

### Kiosk offline

- Pas de poll résultat serveur : affichage local « Scannez avec TimeGate » + rotation visuelle.
- Le feedback succès se fait surtout sur le **téléphone** en offline ; au retour online le kiosk n’a pas besoin du résultat historique.

---

## Section 4 — Apps & UI

### Kiosk (`kiosk-app`)

- Écran `qr.tsx` : **plus de caméra** → grand QR + countdown + état (idle / success / error via poll si online).
- File offline kiosk : ne plus mentionner QR comme online-only côté « verify caméra » ; le QR n’est plus une verify kiosk.

### Employee-app

- Remplacer `/qr-punch` (affiche code) par écran **scanner** (`expo-camera` / barcode).
- Entrée Accueil / drawer : « Pointer par QR » (scanner), pas « Mon QR ».
- File offline QR + sync (miroir conceptuel de `offline-verify-queue` kiosk, mais côté employé).

### Dashboard

- Retirer / adapter `EmployeeQrPunchCard` (secret employé).
- Kiosk : flag `qrEnabled` inchangé comme feature flag méthode.
- Trusted devices : inchangé ; scan QR reste action sensible.

---

## Section 5 — Sécurité

- Secret kiosk uniquement sur appareil provisionné + hash/stockage serveur pour verify.
- `@RequireTrustedDevice` sur `scan` et `sync`.
- Pas de GPS v1 ; mitigation photo/relais : TTL court + nonce one-shot + feedback kiosk online.
- Idempotence sync : `clientId` unique par item (comme idempotency keys existantes).

---

## Section 6 — Migration

1. Générer `qrChallengeSecret` pour tous les kiosks `qrEnabled` (ou au prochain provision / heartbeat).
2. Déployer API + apps (feature flag soft optionnel : si pas de secret, mode QR kiosk indisponible).
3. Retirer endpoints / UI anciens.
4. Migration Prisma : drop `Employee.qrPunchSecret*` après période de grâce courte (ou immédiatement si pas de prod large).

---

## Critères de succès

- [x] Mode QR kiosk affiche un challenge rotatif (sans caméra) — `kiosk-app/app/qr.tsx`
- [x] Employé TRUSTED scanne → pointage correct (IN/OUT/BREAK selon fenêtres) — API redeem + employee scan
- [x] Employé PENDING → 403 sur scan/sync — `@RequireTrustedDevice` + check service
- [x] Offline : file + sync OK ; révocation → rejet + chemin réclamation — `qr-offline-queue` + CTA claim
- [x] Ancien flux (QR employé + verify-qr kiosk) retiré
- [x] `qrEnabled=false` → mode QR kiosk inaccessible (API)

### Smoke checklist (manuel appareil)

1. Re-provisionner un kiosk `qrEnabled` → secret reçu.
2. Mode **Pointage QR** : QR `TGQR:v3:…` + countdown ; refresh à expiration.
3. Employee-app TRUSTED : scanner → succès téléphone + poll succès kiosk.
4. Employee-app PENDING : écran bloqué / 403.
5. Mode avion : scanner → file locale → sync au retour online.
6. Challenge expiré / déjà utilisé → message d’erreur + lien réclamation.

---

## Estimation indicative

| Phase | Contenu | Ordre |
|-------|---------|-------|
| QR-1 | Schéma secret kiosk + util TGQR:v3 + challenge redeem | 1 |
| QR-2 | API challenge / result / scan / sync | 2 |
| QR-3 | Kiosk UI QR display + poll | 3 |
| QR-4 | Employee-app scanner + offline queue | 4 |
| QR-5 | Retrait ancien flux + dashboard | 5 |
| QR-6 | Tests manuels + doc | 6 |

---

## Self-review

- [x] Pas de TBD / sections vides
- [x] Cohérent avec trusted devices + offlineSyncMaxAgeMinutes existants
- [x] Scope borné (pas GPS, pas deep link, remplacement total)
- [x] Ambiguïté TRUSTED au sync tranchée (strict A)
- [x] Punch claims déjà autorisés sans TRUSTED (filet OK)

---

*Prochaine étape après validation de cette spec : plan d’implémentation (`writing-plans`), puis QR-1 → QR-6.*

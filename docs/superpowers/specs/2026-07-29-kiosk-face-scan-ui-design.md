# TimeGate — UI reconnaissance faciale kiosk (Ring & Coach) — Design

**Date** : 2026-07-29  
**Statut** : draft (validé en brainstorming, en attente relecture utilisateur)  
**Priorité** : P2 — polish UX borne, sans changement métier  
**Lots concernés** : Kiosk-app (écran `scan`)

---

## Contexte

### État actuel (`kiosk-app/app/scan.tsx`)

- Caméra frontale plein écran + scrim SVG à découpe ovale (`OvalScrimOverlay` / `CaptureStage`).
- Bordure ovale fixe épaisse (16 px) colorée par `verifyState`.
- Pendant `verifying` : GIF `scan_loader_transparent.gif` superposé dans l’ovale.
- Feedback textuel dupliqué : toast `MessageBox` sous le header + carte de progression en bas (avec % timer 60 s trompeur).
- Animations limitées : pulse d’opacité sur le toast ; pas d’anneau de progression lié à `stabilityProgress`.
- Pipeline métier solide : détection live, gates qualité, `FaceStabilityTracker`, capture, `verifyFacePhoto`, file offline, speech FR, auto-reset / redirect.

### Objectif

Benchmark vs bornes de pointage facial (Truein-like) puis **refonte visuelle** de l’écran scan (approche « Ring & Coach ») :

1. **Animations & polish** en priorité.
2. Puis **guidage** plus clair.
3. Puis **vitesse perçue** pendant l’attente API.

Le flow métier (`idle` → stabiliser → capturer → `verifying` → succès / erreur / offline) reste inchangé.

### Décisions produit (validées)

| Sujet | Choix |
|-------|-------|
| But | Benchmark + design cible TimeGate |
| Référents | Bornes / apps de **pointage** (pas KYC Onfido, pas Face ID pur) |
| Priorités | A → B → C (polish, coaching, vitesse perçue) |
| Amplitude | **Refonte visuelle**, même flow (pas évolution cosmétique seule, pas cinématique plein écran) |
| Approche UI | **Ring & Coach** (retenue) |
| Hors scope | Home kiosk, PIN / NFC / QR, enrollment employee-app, changements API |

---

## Benchmark (synthèse)

| Dimension | TimeGate aujourd’hui | Bornes concurrentes typiques |
|-----------|----------------------|------------------------------|
| Cadre | Ovale + bordure fixe épaisse | Cercle/ovale + **anneau de progression** |
| Attente API | GIF + % sur timeout 60 s | Spinner / arc indéterminé (sans faux %) |
| Coaching | Toast + carte (doublon) | Un message court près du visage |
| Succès | Carte bas + redirect 2 s | Nom + check lisible, reset court |
| Hierarchy | Header + toast + footer | Une zone d’état dominante (anneau) |

Écart principal à combler : anneau animé lié à la stabilité + un seul coach + attente API honnête.

---

## Approches envisagées

| # | Approche | Verdict |
|---|----------|---------|
| 1 | **Ring & Coach** — anneau SVG/Reanimated, coach sous ovale, dock allégé | **Retenu** |
| 2 | Dashboard kiosk — jauge/étapes surtout dans le footer | Rejeté (trop « app métier », peu différenciant) |
| 3 | Cinematic punch — UI minimale, splash succès | Rejeté en v1 (coaching / offline fragiles) |

---

## Section 1 — Architecture UI

Trois couches sur le même écran `scan.tsx` :

1. **Header** minimal (retour + titre d’état) — discret.
2. **Capture** — caméra + scrim ovale (inchangé) + **`FaceRing`** (nouveau) + **`CoachLabel`** sous l’ovale.
3. **`StatusDock`** — bas allégé : succès / erreur / badge offline ; ne répète pas le coaching.

Principes :

- Une source visuelle d’état : couleur / animation de `FaceRing`.
- Un seul message coach à l’écran.
- Logique métier (`FaceStabilityTracker`, `verifyFacePhoto`, offline queue, speech) **inchangée**.

---

## Section 2 — États & animations (`FaceRing`)

Implémentation cible : SVG + `react-native-reanimated` (à ajouter au kiosk si absent). Remplace bordure 16 px + GIF.

| État | Visuel | Animation |
|------|--------|-----------|
| `idle` (pas de visage) | Anneau teal/info, trait ~3–4 px | Pulse doux d’opacité (~1.4 s) |
| `coaching` | Teinte info | Pulse un peu plus marqué |
| `stabilizing` | Arc qui se remplit | `strokeDashoffset` ← `stabilityProgress` 0→100 |
| `ready` / capture | Anneau plein | Flash / scale 1→1.04→1 |
| `verifying` | Arc indéterminé | Rotation continue (pas de % 60 s) |
| `success` | Vert | Remplissage rapide + check (anneau ou dock) |
| `error` | Rouge | Shake horizontal léger (~200 ms) |

Vitesse perçue : pendant `verifying`, l’anneau tourne ; le timeout 60 s reste interne / debug, **non** affiché comme pourcentage de progression réelle.

Contrainte perf : animations sur le UI thread Reanimated ; ne pas relancer des timings lourds à chaque frame de détection — sync sur `stabilityProgress` et changements d’état seulement.

Le GIF `scan_loader_transparent.gif` est **retiré** de l’ovale (asset peut rester dans le repo jusqu’à nettoyage ultérieur).

---

## Section 3 — Coaching & StatusDock

### CoachLabel (sous l’ovale)

Unique message utilisateur pendant idle / coaching / stabilizing / verifying.

| Situation | Message FR (court, ≤ ~8 mots) |
|-----------|-------------------------------|
| Attente | Placez votre visage dans le cadre |
| Hors centre | Centrez votre visage |
| Trop loin / près | Rapprochez-vous / Éloignez-vous un peu |
| Plusieurs visages | Une seule personne à la fois |
| Qualité (yeux / angle) | Regardez la caméra / Tenez-vous droit |
| Stabilisation | Restez immobile… |
| Capture | Capture… |
| Vérif serveur | Vérification en cours… |
| Offline queued | Enregistré hors ligne — synchro automatique |

Speech (`expo-speech`) : **uniquement** succès / échec / messages critiques — pas chaque micro-ajustement.

### StatusDock

| État | Contenu |
|------|---------|
| idle / stabilizing | Masqué (anneau + coach suffisent) |
| verifying | « Vérification… » sans faux % |
| success | **Bienvenue {prénom/nom}** + check |
| error | Message court + auto-reset **10 s** (inchangé) |
| pending sync | Badge offline si `pendingSyncCount > 0` |

Header : retour + titre court selon état ; **pas** de sous-titre qui double le coach.

---

## Section 4 — Composants & flux de données

### Fichiers

| Fichier | Rôle |
|---------|------|
| `components/scan/FaceRing.tsx` | Anneau SVG + Reanimated (`progress`, `mode`) |
| `components/scan/CoachLabel.tsx` | Texte sous ovale + fade au changement |
| `components/scan/StatusDock.tsx` | Extraction / allègement de la carte bas |
| `components/scan/OvalScrimOverlay.tsx` | Conservé |
| `app/scan.tsx` | Orchestration ; mappe états → ring + coach + dock |

Retirer de `scan.tsx` : GIF, toast `MessageBox` dupliqué, affichage % trompeur en verifying.

### Flux

```
facesDetected → FaceStabilityTracker
             → stabilityProgress → FaceRing (stabilizing)
             → status message    → CoachLabel
stable → capture → verifying → FaceRing (spin) + StatusDock
       → success/error → FaceRing + StatusDock + speech + reset/redirect
```

### Dépendances

- Ajouter `react-native-reanimated` au `kiosk-app` (babel plugin selon config Expo).
- Pas de Lottie obligatoire en v1 (SVG suffit).

---

## Section 5 — Erreurs, offline & critères de succès

### Erreurs / offline (comportement métier inchangé)

- Échec match / API → anneau rouge + shake, message dock, speech, auto-reset 10 s.
- Réseau down + photo capturée → file offline existante ; anneau info/success soft ; coach offline.
- Permission caméra → écran dédié actuel (hors redesign ring).
- Redirect succès → home après **2 s** (inchangé).

### Validation

- Manuels : idle → coach → stabilize (anneau remplit) → verify (spin) → success / error / offline.
- Non-régression gates : centrage, distance, multi-visages, yeux/angle.
- Perf : animation fluide sur tablette cible pendant détection.
- `expo-doctor` OK après ajout Reanimated.

### Done when

1. Plus de GIF ni de % trompeur en verifying.
2. Anneau = feedback principal ; un seul coach label.
3. Succès « Bienvenue {nom} » lisible à ~1–1.5 m.
4. Pipeline capture / offline / speech non régressé.

---

## Hors scope explicite

- Refonte home / setup kiosk.
- Écrans PIN, NFC, QR.
- Enrollment / selfie dans employee-app.
- Changement des seuils de `face-capture-gate` (sauf si un message coach l’exige).
- Localisation i18n multi-langue (FR reste la langue UI kiosk).

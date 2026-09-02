# Prompt — Création de la landing page TimeGate

> **Objectif :** créer from scratch la landing page marketing publique de TimeGate (site vitrine PLG), distincte du dashboard applicatif.  
> **Domaine cible :** `https://timegate-one.vercel.app/`  
> **Langue :** français (cible CEMAC / Afrique centrale)  
> **Stack recommandée :** HTML/CSS statique ou Next.js marketing léger — aligné sur la **charte graphique TimeGate** (tokens ci-dessous).  
> **Autonomie :** ce prompt est **100 % self-contained**. Ne pas référencer ni lire de fichiers externes : toutes les couleurs, tarifs, textes et specs assets sont intégrés ici.

---

## 1. Mission

Créer une **landing page marketing complète** pour TimeGate. Il n’existe pas aujourd’hui de page vitrine dédiée sur le domaine public (le domaine sert actuellement de point d’entrée vers le dashboard `/login`). La landing doit :

- Présenter TimeGate comme un **SaaS self-service** (product-led growth)
- Orienter le visiteur vers **`/signup`** pour créer son organisation et **tester 14 jours gratuitement**
- Afficher la **grille tarifaire officielle 2026** : ESSENTIEL / PRO / ENTERPRISE (section 4)
- Reléguer le **pilote accompagné** en offre secondaire
- Appliquer la **charte graphique TimeGate** (section 6 — tokens, typo, composants)

**Ne pas** présenter TimeGate comme un produit accessible uniquement sur démo commerciale ou pilote sur mesure.

---

## 2. Parcours utilisateur cible

```
Découvrir → Créer son organisation → Essai gratuit 14 jours → Choisir ESSENTIEL, PRO ou ENTERPRISE
```

**3 messages clés obligatoires :**

1. **Je peux commencer tout seul** — pas de rendez-vous commercial pour créer mon organisation
2. **Je peux tester avant de payer** — essai gratuit **14 jours** à l'inscription (10 employés max, 1 kiosk max)
3. **Je peux évoluer vers une offre payante** — **ESSENTIEL 15 000 FCFA/mois**, **PRO 50 000 FCFA/mois**, **ENTERPRISE 220 000 FCFA/mois**

---

## 3. Informations produit (contenu réel)

### 3.1 Positionnement

TimeGate est une plateforme SaaS de **pointage intelligent** et de **gestion des présences / RH de terrain** pour PME, industries et organisations multi-sites.

| TimeGate est | TimeGate n’est pas |
|---|---|
| Pointage de confiance (kiosk + app + règles métier) | Suite RH complète (Factorial, Lucca) |
| SaaS product-led, déploiement rapide | ERP ou outil de temps facturable (Clockify) |
| Conçu pour le terrain africain (offline, FCFA) | Borne biométrique propriétaire type ZKTeco |

### 3.2 Écosystème (5 composants — à illustrer visuellement)

| Composant | Technologie | Rôle | Public |
|---|---|---|---|
| **Dashboard RH** | Next.js 15 | Backoffice admin/manager | Admin RH, managers |
| **App Kiosk** | Expo / React Native | Terminal pointage (tablette ou smartphone) | Terrain |
| **App Employé** | Expo / React Native (iOS + Android) | Self-service congés, pointages, notifications | Collaborateurs |
| **API TimeGate** | NestJS `/api/v1` | Multi-tenant, auth, pointage, RH | Intégrateurs (hors landing) |
| **Console SaaS** | Next.js | Super-admin plateforme | TimeGate interne — **ne pas mettre en avant** |

### 3.3 Méthodes de pointage (différenciateur)

1. **Reconnaissance faciale** — détection locale kiosk, vérification serveur, anti buddy punching
2. **PIN de secours** — hashé bcrypt, configurable par kiosk
3. **QR Code rotatif** — challenge kiosk ↔ scan app employé (~1 min)
4. **NFC** — implémenté ; disponibilité PRO selon terminaux Android

**Atouts terrain :**
- **Offline-first** : file d’attente visage/NFC sur kiosk, resync auto (fenêtre 12 h) ; QR côté app employé
- **Appareil de confiance** : 1 appareil = 1 kiosk provisionné
- **Pas de matériel lourd** : tablette ou smartphone existant suffit
- **Fenêtres horaires** : arrivée, pause, reprise, départ — refus explicites + logs

### 3.4 Preuve crédible (sans inventer de chiffres)

- Pilote actif : PME SSII ~10 collaborateurs, 1 site, Brazzaville, Congo
- Formulation autorisée : *« Déjà utilisé en production par des équipes au Congo »*
- **Interdit :** témoignages fictifs, KPIs non publiés, logos clients non autorisés

### 3.5 Roadmap — ne pas vendre comme disponible

- Module **paie** (code présent, non activé au pilote)
- **Copilote IA manager** (prototype, quotas par plan)
- **Webhooks / intégrations ERP** (Sage, Odoo…) — offres avancées / sur devis
- **Paiement en ligne** — n’existe pas ; upgrade PRO via contact ou clé `/activate`

---

## 4. Grille tarifaire officielle TimeGate (2026)

> **Devise :** FCFA (XAF) — taux indicatif : 1 € ≈ 655,957 FCFA  
> **Appli mobile employé** (iOS + Android) : **incluse dans tous les packs**  
> **Paiement en ligne :** non disponible — activation via clé (`/activate`) ou contact commercial

### 4.1 Point d’entrée self-service — Essai gratuit

À l’inscription `/signup`, le produit crée automatiquement un abonnement **TRIAL** :

| Paramètre | Valeur produit (réelle) |
|---|---|
| Durée | **14 jours** |
| Employés max | **10** |
| Kiosks max | **1** |
| Source | `SELF_SIGNUP` |
| Après expiration | 7 jours **lecture seule**, puis blocage (login + `/activate` uniquement) |

**Présentation landing :**
- Badge : **Essai gratuit 14 jours**
- CTA : `Créer mon organisation` → `/signup`
- Ne pas présenter l’essai comme un pack payant ; c’est la **porte d’entrée PLG** avant choix d’un pack

### 4.2 Abonnements mensuels — 3 packs

| Pack | Abonnement / mois | Setup (frais uniques) | Sites | Employés max |
|---|---:|---|---:|---:|
| **ESSENTIEL** | **15 000 FCFA** | **0 FCFA** | 1 | 20 |
| **PRO** | **50 000 FCFA** | **50 000 – 200 000 FCFA** (selon matériel) | 1 (jusqu’à 4) | 100 |
| **ENTERPRISE** | **220 000 FCFA** | **260 000 – 350 000 FCFA** | 3 inclus | Illimité |

**Note importante :** le tarif **25 000 FCFA/mois** mentionné au pilote SSII Brazzaville est une **réduction exceptionnelle premier client** — **ne pas l’afficher** sur la landing. Le tarif catalogue PRO public est **50 000 FCFA/mois**.

### 4.3 Setup PRO — selon option matériel

| Option | Détail | Setup PRO |
|---|---|---:|
| **A — Appareil client** | Smartphone/tablette du client | **50 000 FCFA** |
| **B — Tablette compacte** | 8" entrée de gamme, préconfigurée (+ **60 000 FCFA** matériel) | **110 000 FCFA** |
| **C — Tablette renforcée** | Type Samsung Tab Active (+ **150 000 FCFA** matériel) | **200 000 FCFA** |

ESSENTIEL : **pas de matériel kiosk** (pointage manuel). ENTERPRISE : matériel **obligatoirement fourni** par TimeGate.

### 4.4 Extensions multi-sites

| Pack | Par site supplémentaire |
|---|---|
| ESSENTIEL | Non extensible (mono-site) |
| PRO | + **100 000 FCFA** setup + **15 000 FCFA**/mois |
| ENTERPRISE | + **80 000 FCFA** setup + **25 000 FCFA**/mois |

Tablette compacte incluse par défaut sur site suppl. ; surcoût tablette renforcée = +90 000 FCFA/site.

### 4.5 ESSENTIEL — 15 000 FCFA / mois

**Cible :** TPE ≤ 20 employés, 1 site — digitaliser la RH sans kiosk.

**Inclus :**
- Admin (entreprise, branches, départements, employés)
- Auth (rôles, permissions, multi-utilisateurs)
- **Pointage manuel** (saisie manager arrivée/départ)
- Timesheets basiques
- Absences & congés (déclaration, validation, soldes)
- Dashboard de base (KPI agrégés)
- **Appli mobile employé** (iOS + Android) — pointages, soldes congés, demandes, push, messagerie manager
- 1 webhook sortant (events de base, HMAC-SHA256)
- API REST lecture seule (JWT)
- Support e-mail (48 h ouvrées)

**Non inclus :**
- Reconnaissance faciale / kiosk
- QR code / NFC
- Module paie
- IA Copilot
- Multi-sites

**CTA carte :** `Choisir ESSENTIEL` → contact ou `/activate`

### 4.6 PRO — 50 000 FCFA / mois (badge « Recommandé »)

**Cible :** PME ≤ 100 employés, 1 à 4 sites — automatiser le pointage terrain.

**Inclus :**
- Tout ESSENTIEL
- Pointage automatique kiosk : **reconnaissance faciale, QR code, NFC, PIN de secours**
- Installation & formation sur site (inclus dans le setup)
- Planning & shifts (horaires, affectations, jours fériés)
- **Module Paie v1** (calcul bulletins, exports CSV, variables, export logiciels paie tiers)
- Dashboard analytics (présences, retards, absences, coûts)
- Notifications push multi-canal (granularité site/département)
- **IA Copilot** — quota ~5 000 tokens/mois (~30–50 requêtes standards)
- Webhooks : jusqu’à **3 endpoints** + events avancés
- API REST lecture + écriture (quotas élevés)
- Intégration ERP/SIRH sur devis (base 150 000 FCFA)
- Support e-mail prioritaire (24 h ouvrées)
- Rapports d’audit (logs reconnaissance faciale)
- Resynchronisation offline (visage, QR, NFC)

**Non inclus :**
- Multi-sites au-delà de 4
- Support téléphonique dédié
- SLA garanti

**CTA carte :** `Choisir PRO` → contact ou `/activate`

**Note sous la carte :**
> Setup unique selon matériel — à partir de 50 000 FCFA (appareil client). Pas de paiement en ligne pour l’instant.

### 4.7 ENTERPRISE — 220 000 FCFA / mois

**Cible :** ETI, grands comptes, multi-sites (> 100 employés, 3 sites minimum).

**Inclus :**
- Tout PRO
- IA Copilot quota étendu (~50 000 tokens/mois)
- Sites illimités (facturation extension au-delà de 3)
- Multi-sociétés (holdings)
- Tableau de bord manager dédié (par site, département)
- API REST + OAuth2 / clé API dédiée (jusqu’à 10 000 req/h)
- Webhooks illimités + monitoring + replay
- Connecteurs SI pré-packagés (Sage, Odoo, Saari) inclus setup
- Bus d’événements vers datawarehouse / SI client
- Audit logs avancés (RGPD / OHADA)
- **SLA 99,5 %**
- Gestionnaire de compte dédié
- Support téléphonique (heures ouvrées)
- Matériel kiosk fourni obligatoire

**CTA carte :** `Contacter l’équipe` → mailto

### 4.8 Coûts additionnels (tableau secondaire sous les packs)

| Service | Tarif |
|---|---:|
| Tokens IA Copilot supplémentaires | 5 000 FCFA / 10 000 tokens |
| Formation sur site suppl. | 75 000 FCFA / demi-journée + déplacements |
| Intégration SI tiers | Sur devis (base 150 000 FCFA) |
| Tablette compacte suppl. (matériel seul) | 75 000 FCFA |
| Tablette renforcée suppl. (matériel seul) | 165 000 FCFA |
| Migration de données | Sur devis (base 200 000 FCFA) |
| Support premium 24/7 (option ENTERPRISE) | + 50 000 FCFA / mois |

### 4.9 Exemples chiffrés (encadré pédagogique — optionnel)

| Cas | Pack | Coût année 1 (indicatif) |
|---|---|---:|
| Boutique 8 employés, 1 site | ESSENTIEL | **180 000 FCFA** (15k × 12, setup 0) |
| PME 45 employés, 2 sites, tablettes compactes | PRO AppareilCompact | **~1 050 000 FCFA** |
| PME industrielle 30 emp., 2 sites, appareils client | PRO SansAppareil | **~930 000 FCFA** |

### 4.10 Règles d’affichage pricing sur la landing

- Afficher les **3 packs payants** + bandeau **Essai gratuit 14 jours** au-dessus
- Utiliser les **prix catalogue** (15k / 50k / 220k) — jamais le tarif pilote 25k
- Afficher les **quotas confirmés** (employés, sites) — ils sont documentés officiellement
- Mentionner **setup variable** pour PRO/ENTERPRISE (lien ancre ou tooltip, pas de détail exhaustif en hero)
- Sous le tableau : *« Commencez par l’essai gratuit, puis activez le pack adapté à votre organisation. »*
- **Ne pas inventer** de fonctionnalités ou limites absentes de la grille tarifaire

---

## 5. URLs, CTAs et navigation

### 5.1 URLs de production

| Action | URL |
|---|---|
| Landing (à créer) | `https://timegate-one.vercel.app/` |
| **Créer mon organisation** (CTA principal) | `https://timegate-one.vercel.app/signup` |
| Se connecter | `https://timegate-one.vercel.app/login` |
| Activer une clé PRO | `https://timegate-one.vercel.app/activate` |
| Confidentialité | `https://timegate-one.vercel.app/privacy` |

### 5.2 Hiérarchie des CTA

| Priorité | Libellés | Destination |
|---|---|---|
| **Primaire** | `Créer mon organisation`, `Essayer gratuitement 14 jours`, `Commencer l'essai gratuit` | `/signup` |
| Secondaire | `Voir comment ça fonctionne`, `Découvrir les fonctionnalités`, `Voir les tarifs` | Ancres `#comment-ca-marche`, `#fonctionnalites`, `#pricing` |
| Upgrade | `Choisir ESSENTIEL`, `Choisir PRO`, `Contacter pour ENTERPRISE` | `#pricing` puis contact ou `/activate` |
| Pilote | `Parler à l'équipe TimeGate` | `mailto:kaiserstyve2@gmail.com?subject=Pilote accompagné TimeGate` |
| Discret | `Se connecter` | `/login` |

**CTA interdits comme principal :** « Demander une démonstration », « Planifier un appel », « Contacter pour essayer ».

**Emplacements obligatoires du CTA primaire :** header sticky · hero · section self-service · bandeau essai 14 j · CTA final.

### 5.3 Header sticky

```
[Logo TimeGate]     Fonctionnalités · Tarifs · Pilote     [Se connecter]  [Créer mon organisation →]
```

- Header fond blanc ou glass (`bg-surface-card/90 backdrop-blur`)
- Bordure basse `border-slate-200/80`
- Bouton primaire header = même style que hero

---

## 6. Design system — tokens TimeGate

Appliquer **exactement** la charte graphique ci-dessous (palette officielle TimeGate — teal & slate, typo Comfortaa).

### 6.1 Palette de couleurs (mode clair — landing par défaut)

| Token CSS | Hex | Usage landing |
|---|---|---|
| `--color-primary` | `#0d9488` | CTA, liens actifs, accents, bordure top cartes, icônes highlights |
| `--color-secondary` | `#0284c7` | Hover boutons primaires, dégradés, accents secondaires |
| `--color-accent` | `#14b8a6` | Badges, micro-accents, focus rings |
| `--color-surface` | `#eef2f7` | Fond de page, sections alternées |
| `--color-surface-card` | `#ffffff` | Cartes pricing, feature cards, header |
| `--color-surface-muted` | `#e2e8f0` | Section pilote secondaire, séparateurs doux |

### 6.2 Palette mode sombre (optionnel — section hero ou toggle)

| Token CSS | Hex | Usage |
|---|---|---|
| `--color-surface-dark` | `#0b1120` | Fond hero sombre, footer |
| `--color-surface-card-dark` | `#141c2e` | Cartes en dark |
| `--color-surface-elevated-dark` | `#1c2740` | Élévation, dropdowns |
| `--color-border-dark` | `#2d3a52` | Bordures dark |

### 6.3 Couleurs sémantiques (Tailwind slate — textes & bordures)

| Usage | Classe / valeur | Exemple |
|---|---|---|
| Texte principal | `text-slate-900` | Titres H1–H2 |
| Texte corps | `text-slate-700` | Paragraphes |
| Texte muted | `text-slate-500` | Sous-titres, légendes |
| Placeholder | `text-slate-400` | Micro-preuves hero |
| Bordure carte | `border-slate-200/80` | `.tg-card`, inputs |
| Fond section alt | `bg-slate-50/60` | Encadrés discrets |

### 6.4 Couleurs sémantiques (états)

| État | Light | Usage landing |
|---|---|---|
| Succès / badge essai | `bg-emerald-50 text-emerald-800` | Badge « Essai gratuit 14 jours » |
| Info / badge PRO | `bg-sky-100 text-sky-800` | Badge « Recommandé » sur carte PRO |
| Neutre / ESSENTIEL | `bg-slate-100 text-slate-700` | Badge « TPE » |
| Premium / ENTERPRISE | `bg-violet-100 text-violet-800` | Badge « Multi-sites » |
| Erreur | `bg-red-50 border-red-200 text-red-600` | Rare sur landing |
| Warning | `text-amber-800` | Notes pilote |

### 6.5 Dégradés & surfaces spéciales

```css
/* Bouton CTA hero */
background: linear-gradient(to right, #0d9488, #0284c7);
/* hover : inverser */
background: linear-gradient(to right, #0284c7, #0d9488);

/* Sidebar brand (référence — bandeau hero optionnel) */
background: linear-gradient(135deg, #0d9488 0%, #0369a1 100%);

/* Hero background suggestion (subtil) */
background: radial-gradient(ellipse 80% 50% at 50% -20%, rgb(13 148 136 / 0.12), transparent),
            var(--color-surface);
```

### 6.6 Typographie

| Token | Valeur |
|---|---|
| Font family | **Comfortaa**, sans-serif |
| Source | [Google Fonts — Comfortaa](https://fonts.google.com/specimen/Comfortaa) (`@import` ou `<link>`) |
| Weights | 300–700 |
| Base body | `16px` / `1rem`, `line-height: 1.6` |
| Font display | `swap` |

**Échelle typographique landing :**

| Élément | Taille | Weight | Couleur |
|---|---|---|---|
| H1 hero | `clamp(2rem, 5vw, 3.25rem)` | 700 | `text-slate-900` |
| H2 section | `clamp(1.5rem, 3vw, 2rem)` | 600 | `text-slate-900` |
| H3 carte | `1.125rem` / `text-lg` | 600 | `text-slate-900` |
| Sous-titre hero | `1.125rem` / `text-lg` | 400 | `text-slate-600` |
| Corps | `1rem` / `text-base` | 400 | `text-slate-700` |
| Micro-preuve | `0.875rem` / `text-sm` | 500 | `text-slate-500` |
| Badge | `0.75rem` / `text-xs` | 600 | selon variante |
| Bouton | `0.875rem` / `text-sm` | 600 | `text-white` (primaire) |

### 6.7 Espacements & layout

| Token | Valeur | Usage |
|---|---|---|
| Container max | `max-w-6xl` (72rem) ou `max-w-7xl` | Sections principales |
| Padding section Y | `py-16 md:py-24` | Rythme vertical |
| Padding section X | `px-4 sm:px-6 lg:px-8` | Marges latérales |
| Gap grilles | `gap-6 md:gap-8` | Feature grid, pricing |
| Gap stack | `space-y-4` (texte) · `space-y-8` (sections internes) | |

### 6.8 Rayons, ombres & bordures

| Composant | Classes / valeurs |
|---|---|
| Carte (`.tg-card`) | `rounded-xl border border-slate-200/80 bg-surface-card shadow-xs` |
| Carte accentuée | `border-t-4 border-t-primary` |
| Bouton primaire | `rounded-lg` |
| Badge | `rounded-full px-2.5 py-0.5` |
| Input (si formulaire contact) | `rounded-lg` + ombre légère `0 1px 2px rgb(15 23 42 / 0.04)` |
| Ombre carte hover | `hover:shadow-md transition-shadow` |
| Ombre hero mockup | `0 18px 40px rgb(15 23 42 / 0.12)` |

### 6.9 Composants boutons

**Primaire :**
```
py-2 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg
border border-transparent bg-primary text-white shadow-sm
hover:bg-secondary disabled:opacity-50 transition-colors
```

**Primaire hero (CTA large — variante signup) :**
```
py-3 px-6 font-semibold text-white rounded-lg
bg-linear-to-r from-primary to-secondary
hover:from-secondary hover:to-primary
disabled:opacity-70 transition-all
```

**Secondaire :**
```
py-2 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg
border border-slate-200 bg-surface-card text-slate-700
hover:bg-slate-50
```

**Ghost / lien CTA :**
```
text-sm font-semibold text-primary hover:underline underline-offset-2
```

### 6.10 Logos, captures & assets visuels

**Règle :** héberger tous les assets sur le site déployé sous `/public/` (ou équivalent). **Ne pas supposer l’existence de fichiers locaux** — les créer, les uploader ou utiliser les pièces jointes fournies avec ce brief.

#### Logos TimeGate (à intégrer au projet)

| Fichier cible (dans `/public/images/logos/`) | Description | Usage |
|---|---|---|
| `timegate-logo-full-color.png` | Logo complet TimeGate, fond transparent, version couleur (teal) | Header, footer fond clair |
| `timegate-logo-full-white.png` | Logo complet blanc, fond transparent | Hero sombre, footer dark |
| `timegate-icon-color.png` | Icône seule couleur | Favicon, og:image fallback |
| `timegate-icon-white.png` | Icône seule blanche | Hero sombre |
| `icon-512x512.png` | Icône PWA 512×512 | Favicon / app icon |

> Si les logos ne sont pas fournis : placeholder temporaire = icône + wordmark « TimeGate » en Comfortaa bold `#0d9488`, en attendant les fichiers officiels.

#### Captures produit (à intégrer au projet)

| Fichier cible (dans `/public/images/screenshots/`) | Contenu | Usage landing |
|---|---|---|
| `screenshot-dashboard.png` | Dashboard RH — présences, équipe du jour, KPI | Hero, section écosystème |
| `screenshot-kiosk.png` | App Kiosk — écran pointage visage/PIN | Hero, section écosystème |
| `screenshot-employee-app.png` | App Employé — congés, historique pointages | Hero, section écosystème |

**Légendes captures :** libellé « Interface produit TimeGate » — ne pas laisser croire à des métriques client réelles.

#### Image Open Graph

| Fichier cible | Usage |
|---|---|
| `/public/images/og-timegate.png` | `og:image` — recommandé : capture dashboard ou composite 1200×630 |

### 6.11 Iconographie

- **Font Awesome 6** via CDN : `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css`
- Style : outline ou solid cohérent, icône `text-primary` sur fond `bg-primary/10 rounded-lg p-3`
- Alternative acceptable : **Lucide React** ou **Heroicons** si stack React/Next.js

### 6.12 Responsive & accessibilité

- **Mobile-first** : hero stack vertical, pricing cards en colonne → 2 colonnes `md:` → côte à côte `lg:`
- **Touch targets** : boutons min `44×44px`
- **Contraste** : WCAG AA minimum (teal `#0d9488` sur blanc = OK)
- **Focus** : `focus:outline-2 focus:outline-offset-2 focus:outline-primary`
- **Scroll** : `scroll-behavior: smooth` pour ancres
- **Images** : `alt` descriptifs, lazy loading, WebP optimisé

---

## 7. Structure de la page — sections & contenus

Ordre vertical des sections :

1. Header sticky
2. Hero
3. Self-service (3 étapes)
4. Comment ça marche (`#comment-ca-marche`)
5. Écosystème / Fonctionnalités (`#fonctionnalites`)
6. Pourquoi TimeGate
7. Pricing (`#pricing`)
8. Preuves / Confiance
9. Pilote accompagné (`#pilote`) — visuellement secondaire
10. FAQ
11. CTA final
12. Footer

---

### 7.1 HERO

**Badge :**
> Le pointage intelligent pensé pour le terrain africain

**Titre (H1) :**
> Gérez les présences de vos équipes simplement.

**Sous-titre :**
> TimeGate vous permet de créer votre organisation, d'enregistrer vos équipes et de suivre les présences depuis une seule plateforme. **Essayez 14 jours gratuitement**, puis choisissez le pack adapté — dès **15 000 FCFA/mois**.

**CTA principal :** `Créer mon organisation →` → `/signup`

**CTA secondaire :** `Voir comment ça fonctionne` → `#comment-ca-marche`

**Micro-preuves (sous les CTA) :**
> Création instantanée · Aucun déploiement complexe · Évolutif

**Visuel :** mockup composite des 3 captures (dashboard + kiosk + app employé), ombre `0 18px 40px rgb(15 23 42 / 0.12)`, coins `rounded-xl`.

**Design hero :**
- Fond : `--color-surface` + dégradé radial teal subtil
- Badge : `bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold`
- Espacement : `pt-24 pb-16 md:pt-32 md:pb-24` (compenser header sticky)

---

### 7.2 SECTION SELF-SERVICE

**Titre :** Commencez en quelques minutes.

**Sous-titre :** Pas besoin d'attendre un commercial ou de planifier un déploiement pour découvrir TimeGate.

**3 étapes (cartes numérotées `.tg-card`) :**

| # | Titre | Texte |
|---|---|---|
| 01 | Créez votre organisation | Créez votre espace TimeGate directement depuis la plateforme. Nom d'entreprise, rôle, taille d'équipe — branche « Siège » et compte admin créés automatiquement. |
| 02 | Ajoutez vos collaborateurs | Configurez votre équipe, départements et horaires. Préparez vos méthodes de pointage selon votre offre. |
| 03 | Commencez à pointer | Testez TimeGate immédiatement avec les fonctionnalités disponibles sur votre offre. |

**CTA :** `Essayer gratuitement 14 jours →` → `/signup`

**Layout :** grille 3 colonnes `lg:grid-cols-3`, numéros en `text-primary text-2xl font-bold`.

---

### 7.3 SECTION COMMENT ÇA MARCHE (`#comment-ca-marche`)

**Titre :** Du pointage terrain au tableau de bord RH, en temps réel.

**Timeline 5 étapes :**
1. L'employé se présente au kiosk (visage, PIN, QR, NFC — pack PRO+) ou le manager saisit la présence (ESSENTIEL / essai)
2. TimeGate valide selon les fenêtres horaires
3. Événements enregistrés côté serveur — resync offline si coupure
4. Le manager consulte équipe du jour, retards, absences, inbox
5. L'employé suit historique et congés depuis l'app mobile

**Callout (encadré `border-l-4 border-l-primary bg-surface-card`) :**
> Un smartphone ou une tablette existante suffit. Pas de borne biométrique coûteuse.

---

### 7.4 SECTION ÉCOSYSTÈME (`#fonctionnalites`)

**Titre :** Trois interfaces, une seule source de vérité.

**3 cartes `.tg-card border-t-4 border-t-primary` :**

| Carte | Contenu |
|---|---|
| App Kiosk | Terminal sur tablette/smartphone. Visage, PIN, QR, NFC. Offline + resync. |
| App Employé | iOS & Android. Pointages, congés, push Firebase, messagerie manager, scan QR. |
| Dashboard RH | Présences, retards, absences, congés, kiosks, exports, paramétrage org. |

**Stat row (4 métriques) :**
- **4** méthodes de pointage
- **3** applications synchronisées
- **1** plateforme multi-tenant
- **Offline** visage & QR

**Visuel :** carrousel ou grille des 3 screenshots sous les cartes.

---

### 7.5 SECTION POURQUOI TIMEGATE

**Titre :** Un système de pointage qui s'adapte à votre entreprise.

**4 piliers (grille 2×2) :**

| Pilier | Texte |
|---|---|
| **Accessible** | Créez votre organisation et commencez directement depuis la plateforme. |
| **Flexible** | Plusieurs méthodes de pointage pour s'adapter à vos environnements de travail. |
| **Évolutif** | Commencez par l'essai gratuit, puis ESSENTIEL (15 000 FCFA), PRO (50 000 FCFA) ou ENTERPRISE (220 000 FCFA). |
| **Sécurisé** | Mécanismes conçus pour protéger les accès et fiabiliser les données de présence. |

---

### 7.6 SECTION PRICING (`#pricing`)

**Titre :** Des tarifs adaptés à la taille de votre organisation.

**Sous-titre :** Essai gratuit 14 jours à l'inscription — sans carte bancaire. Puis choisissez votre pack.

**Bandeau au-dessus des cartes (full-width, fond emerald/teal léger) :**

| Essai gratuit | 0 FCFA · 14 jours · 10 employés · 1 kiosk |
|---|---|
| CTA | `Créer mon organisation` → `/signup` |

**Layout :** 3 cartes packs (`lg:grid-cols-3`) — **PRO** mise en avant au centre (`ring-2 ring-primary`, `lg:scale-105`, badge « Recommandé »).

#### Carte ESSENTIEL
- **15 000 FCFA / mois**
- Setup : **0 FCFA**
- **≤ 20 employés · 1 site**
- Badge : `TPE` (slate)
- Features ESSENTIEL (section 4.5) — liste courte (5–7 puces max)
- CTA secondaire : `Choisir ESSENTIEL` → contact / `/activate`

#### Carte PRO (centrale, accentuée)
- **50 000 FCFA / mois**
- Setup : **à partir de 50 000 FCFA** (tooltip : options matériel section 4.3)
- **≤ 100 employés · 1 à 4 sites**
- Badge : `Recommandé` (sky)
- Features PRO (section 4.6) — liste courte
- CTA primaire : `Choisir PRO` → contact / `/activate`

#### Carte ENTERPRISE
- **220 000 FCFA / mois**
- Setup : **à partir de 260 000 FCFA**
- **Employés illimités · 3 sites inclus**
- Badge : `Multi-sites` (violet)
- Features ENTERPRISE (section 4.7) — liste courte
- CTA ghost : `Contacter l'équipe` → mailto

**Tableau comparatif (optionnel, sous les cartes) :**

| | Essai 14 j | ESSENTIEL | PRO | ENTERPRISE |
|---|---|---|---|---|
| Prix/mois | 0 | 15 000 | 50 000 | 220 000 |
| Employés max | 10 | 20 | 100 | Illimité |
| Kiosk / visage | 1 kiosk | ❌ | ✅ | ✅ |
| Pointage manuel | ✅ | ✅ | ✅ | ✅ |
| App employé | ✅ | ✅ | ✅ | ✅ |
| Paie v1 | ❌ | ❌ | ✅ | ✅ |
| IA Copilot | ❌ | ❌ | ✅ (~5k tok) | ✅ (~50k tok) |
| Multi-sites | ❌ | ❌ | jusqu'à 4 | Illimité |

**Sous le tableau :**
> Commencez par l'essai gratuit, puis activez le pack adapté via une clé d'activation ou en contactant l'équipe TimeGate. Setup et matériel facturés une seule fois.

**Encadré coûts additionnels (repliable) :** reprendre le tableau section 4.8 (formation, intégrations, matériel suppl.)

---

### 7.7 SECTION PREUVES / CONFIANCE

**Titre :** Conçu pour le terrain, déployé en conditions réelles.

- Pilote actif : PME services numériques, ~10 collaborateurs, Brazzaville
- Stack : NestJS · PostgreSQL · Next.js · Expo · reconnaissance faciale Python
- Porteur : **Styve Maba** — Mazala Firm (RCCM CG-BZV-01-2021-A10-01865)
- Contact : kaiserstyve2@gmail.com · +242 06 515 23 74

---

### 7.8 SECTION PILOTE (`#pilote`) — secondaire

**Style :** fond `bg-surface-muted` ou `bg-slate-50/60`, pas de gros CTA primaire.

**Titre :** Besoin d'un déploiement accompagné ?

**Texte :**
> Pour les entreprises qui souhaitent déployer TimeGate auprès de leurs équipes avec un accompagnement dédié, nous proposons également des pilotes et déploiements accompagnés.

**CTA ghost :** `Parler à l'équipe TimeGate →` → mailto pilote

---

### 7.9 FAQ

| Question | Réponse courte |
|---|---|
| Puis-je tester avant de payer ? | Oui — **essai gratuit 14 jours** à l'inscription (10 employés, 1 kiosk). |
| Combien coûte TimeGate ? | **ESSENTIEL 15 000 FCFA/mois**, **PRO 50 000 FCFA/mois**, **ENTERPRISE 220 000 FCFA/mois** (+ setup unique selon pack et matériel). |
| Dois-je acheter du matériel ? | ESSENTIEL : non (pointage manuel). PRO : tablette/smartphone Android existant possible (setup dès 50 000 FCFA) ou fourniture TimeGate. |
| Comment activer un pack payant ? | Contactez l'équipe ou saisissez une clé d'activation sur `/activate`. Pas de paiement en ligne pour l'instant. |
| Fonctionne-t-il sans internet ? | Partiellement — file offline visage/QR/NFC, resync auto. PIN = online. |
| Le module paie est-il inclus ? | **PRO et ENTERPRISE** — calcul bulletins, exports CSV. Non activé chez tous les clients pilotes. |
| Données biométriques ? | Embeddings serveur. Consentement employés = responsabilité employeur. |

**Composant :** accordéon natif `<details>` / `<summary>` ou composant accordion UI de la stack choisie.

---

### 7.10 CTA FINAL

**Titre :** Votre organisation peut commencer dès aujourd'hui.

**Sous-titre :** Créez votre espace TimeGate et profitez de **14 jours d'essai gratuit** pour découvrir une nouvelle façon de gérer les présences.

**CTA principal :** `Essayer gratuitement 14 jours →` → `/signup`

**CTA secondaire :** `Découvrir les fonctionnalités` → `#fonctionnalites`

**Design :** bandeau full-width dégradé `linear-gradient(135deg, #0d9488, #0369a1)`, texte blanc, bouton blanc avec texte primary ou bouton secondaire inversé.

---

### 7.11 FOOTER

```
[Logo blanc ou couleur]
Pointage intelligent · Gestion des présences

Fonctionnalités · Tarifs · Pilote · Se connecter · Créer mon organisation · Confidentialité

kaiserstyve2@gmail.com · +242 06 515 23 74
© 2026 TimeGate · Mazala Firm · Brazzaville, Congo
```

**Fond footer :** `--color-surface-dark` (`#0b1120`), texte `text-slate-300`, liens `hover:text-white`.

---

## 8. SEO & métadonnées

```html
<title>TimeGate — Pointage intelligent & gestion des présences | SaaS Afrique</title>
<meta name="description" content="Essai gratuit 14 jours. TimeGate : pointage visage, QR, PIN, NFC + dashboard RH. Packs dès 15 000 FCFA/mois. Conçu pour le terrain africain." />
<meta property="og:title" content="TimeGate — Gérez les présences de vos équipes simplement" />
<meta property="og:description" content="Essai gratuit 14 jours · ESSENTIEL 15k · PRO 50k · ENTERPRISE 220k FCFA/mois." />
<meta property="og:image" content="https://timegate-one.vercel.app/images/og-timegate.png" />
<meta name="theme-color" content="#0d9488" />
<link rel="icon" href="https://timegate-one.vercel.app/images/logos/timegate-icon-color.png" />
```

**Mots-clés naturels :** pointage intelligent, gestion présences, reconnaissance faciale entreprise, SaaS RH Congo, time attendance Afrique, kiosk pointage tablette.

---

## 9. Contraintes techniques

- Page **statique ou SSG** — pas d'authentification requise pour la landing
- **Routage sur `timegate-one.vercel.app` :**
  - `/` → landing marketing (à créer)
  - `/signup`, `/login`, `/activate`, `/privacy` → pages applicatives existantes (liens absolus ou relatifs)
- La landing et l'app partagent le **même domaine** ; les CTAs pointent vers les routes applicatives ci-dessus
- Sanitiser tout contenu HTML dynamique ; pas d'injection de markup non contrôlé
- Images optimisées (WebP si possible), lazy load below fold
- Performance cible : LCP < 2,5 s mobile
- **Langue :** français exclusivement

---

## 10. Cohérence avec le produit (à respecter dans les textes)

| Élément | Comportement réel à refléter |
|---|---|
| Inscription `/signup` | Crée une organisation + essai **14 jours** |
| Quotas essai | **10 employés max**, **1 kiosk max** |
| Après expiration essai | **7 jours** lecture seule, puis compte bloqué (login + activation clé) |
| Noms commerciaux landing | **ESSENTIEL / PRO / ENTERPRISE** uniquement |
| Activation payante | Clé sur `/activate` ou contact commercial — **pas de paiement en ligne** |
| Tarif pilote interne | PRO à 25 000 FCFA/mois pour un client Brazzaville — **ne jamais afficher sur la landing** |

> En interne, le produit peut utiliser d'autres libellés techniques (ex. STARTER) ; la landing communique uniquement **ESSENTIEL / PRO / ENTERPRISE** avec les prix section 4.

---

## 11. Checklist avant mise en ligne

- [ ] Landing créée on `/` — distincte de la page login
- [ ] Tous les tokens couleur reprennent `#0d9488` / `#0284c7` / Comfortaa
- [ ] CTA principal → `/signup` (header, hero, self-service, bandeau essai, final)
- [ ] Essai **14 jours** affiché honnêtement (10 emp · 1 kiosk)
- [ ] 3 packs : **ESSENTIEL 15k / PRO 50k / ENTERPRISE 220k** FCFA/mois
- [ ] **Aucun** tarif pilote 25 000 FCFA sur la landing
- [ ] Setup variable mentionné pour PRO (dès 50 000 FCFA)
- [ ] Quotas employés/sites conformes à la grille tarifaire
- [ ] Section pilote visuellement secondaire
- [ ] Paie / IA / webhooks absents ou marqués roadmap
- [ ] Captures produit réelles intégrées avec légendes honnêtes
- [ ] Contact réel (email + téléphone Congo)
- [ ] Responsive mobile-first validé
- [ ] SEO meta + og:image configurés
- [ ] Mention « pas de paiement en ligne » sur carte PRO

---

## 12. Contact & entité

| Champ | Valeur |
|---|---|
| Porteur | Styve Maba |
| E-mail | kaiserstyve2@gmail.com |
| Téléphone | +242 06 515 23 74 |
| Structure | Mazala Firm |
| RCCM | CG-BZV-01-2021-A10-01865 |
| NIU | P21000000203772A |
| Site | https://timegate-one.vercel.app/ |

---

*Brief autonome pour la création de la landing page TimeGate — août 2026 · TimeGate / Mazala Firm.*

# TimeGate — Présentation JIBC 2026 (contenu PDF)

> **Usage :** ce document est la maquette texte + visuelle du futur PDF (4 à 6 pages).  
> **Export PDF :** à produire depuis ce MD (Pandoc, Canva, Google Slides, etc.).  
> **Limite upload formulaire :** 10 Mo.

---

## Métadonnées document

| Champ | Valeur |
|-------|--------|
| Titre | TimeGate — Pointage intelligent & gestion RH |
| Sous-titre | Innovation numérique au service du développement local |
| Événement | JIBC 2026 |
| Version | 1.0 — brouillon |
| Contact | *(email)* · *(WhatsApp)* · *(site web si disponible)* |

---

# PAGE 1 — COUVERTURE

### Mise en page

- Fond : dégradé ou couleur brand TimeGate (teal / primary du dashboard)
- Centrage vertical : logo + titre + tagline + événement

### Image

```
[IMAGE — Pleine largeur ou centrée, hauteur ~80–120 px]
Fichier : dashboard/public/images/logos/timegate-logo-full-white.png
         (fond sombre)
      ou : dashboard/public/images/logos/timegate-logo-full-color.png
         (fond clair)
Alt     : Logo TimeGate
```

### Texte

**TimeGate**

*Le pointage intelligent au service du travail digne, pensé pour le terrain local.*

---

**Plateforme de pointage & gestion RH pour PME et organisations multi-sites**

Reconnaissance faciale · QR code · NFC · Tableau de bord temps réel

---

**JIBC 2026**  
Journée de l'Innovation du Bassin du Congo

*(Nom porteur / organisation)*  
*(Email · Téléphone / WhatsApp)*

---

# PAGE 2 — LE PROBLÈME

### Titre de page

**Le défi : une gestion de présence peu fiable et coûteuse**

### Image (optionnelle — bandeau ou icônes)

```
[IMAGE — Colonne droite ou bandeau bas, ~40 % largeur page]
Suggestion : photo libre de droits — registre papier, file d'attente,
              ou illustration « buddy punching » (sans stigmatiser)
Source       : à sourcer (Unsplash, banque interne, ou schéma simple)
Alt          : Gestion manuelle de la présence en entreprise
```

### Corps de texte

Sur le marché local, des milliers d'organisations — PME, industries, ONG, administrations — peinent encore à suivre la présence de leurs équipes de manière **fiable**, **traçable** et **économique**.

**Constats terrain :**

| Problème | Conséquence |
|----------|-------------|
| Registres papier & badges partagés | Fraude au pointage, litiges |
| Systèmes importés coûteux | Peu adaptés au terrain, déploiement lent |
| Saisie manuelle RH | Erreurs de paie, retards de traitement |
| Sites dispersés | Aucune vision consolidée pour la direction |
| Absence de traçabilité | Difficulté à prouver la conformité sociale |

**Organisations concernées :** PME & ETI · sites éloignés (mines, logistique) · ONG & administrations

**Résultat :** perte de productivité, tensions sociales, données RH peu exploitables pour le développement économique local.

---

# PAGE 3 — LA SOLUTION TIMEGATE

### Titre de page

**TimeGate : du kiosk mobile au tableau de bord RH**

### Schéma d'architecture (central)

```
[IMAGE — Schéma pleine largeur, ~50 % hauteur page]
Type        : Diagramme flux (à créer — voir description ci-dessous)
Fichier cible : docs/jibc-2026/assets/schema-timegate-jibc.png (à produire)
Alt         : Architecture TimeGate — kiosk, API, dashboard

Description du schéma à designer :
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  KIOSK APP  │────▶│  API        │────▶│  DASHBOARD RH    │
│  (tablette) │     │  TimeGate   │     │  Présences · RH  │
│  Visage/QR  │     │  NestJS     │     │  Paie · Congés   │
│  NFC        │     └──────┬──────┘     └──────────────────┘
└─────────────┘            │
                           ▼
                    ┌─────────────┐
                    │ APP EMPLOYÉ │
                    │ Congés ·    │
                    │ Pointages   │
                    └─────────────┘
```

### Texte — Comment ça marche

1. **L'employé** se présente devant un smartphone ou une tablette en mode kiosk
2. **Identification** en quelques secondes : reconnaissance faciale, QR personnel ou badge NFC
3. **Vérification serveur** et enregistrement de l'événement (entrée, sortie, pause)
4. **Le manager** consulte en temps réel présences, retards et absences sur le dashboard
5. **Les données** alimentent feuilles de temps, congés et module paie

### Points forts

- **Sans matériel lourd** — un téléphone suffit ; TPE dédiés sur commande
- **Multi-méthodes** — visage, QR ou NFC selon le site et le budget
- **Multi-sites** — branches, entrepôts, chantiers : une vue RH consolidée
- **Conçu pour l'Afrique** — offline-first, SaaS accessible, hébergement régional envisagé

**Méthodes :** reconnaissance faciale · QR personnel · badge NFC · mode hors-ligne

---

# PAGE 4 — CAPTURES PRODUIT

### Titre de page

**Aperçu de la plateforme**

### Grille 2×2 (quatre captures)

```
[IMAGE 1 — Haut gauche]
Fichier suggéré : capture kiosk-app écran scan / accueil prêt à pointer
Source          : screenshot kiosk-app/app/scan.tsx ou index.tsx (état Ready)
Alt             : Application kiosk — écran de pointage
Légende         : Kiosk mobile — pointage en un geste

[IMAGE 2 — Haut droite]
Fichier suggéré : capture dashboard page présences / home KPI
Source          : screenshot dashboard/app/(authenticated)/page.tsx
Alt             : Tableau de bord — vue présences
Légende         : Dashboard RH — suivi temps réel

[IMAGE 3 — Bas gauche]
Fichier suggéré : capture employee-app onglet pointages
Source          : screenshot employee-app/app/(tabs)/index.tsx
Alt             : Application employé — historique pointages
Légende         : Espace employé — transparence & congés

[IMAGE 4 — Bas droite]
Fichier suggéré : capture dashboard employés ou planning
Source          : screenshot dashboard section RH
Alt             : Gestion des équipes
Légende         : Gestion multi-sites & plannings
```

> **Note production :** flouter noms réels si données de seed ; préférer démo « Entreprise Démo locale ».

### Encadré technique (optionnel, pied de page)

**Stack :** NestJS · PostgreSQL · Next.js · Expo · Moteur facial Python  
**Sécurité :** authentification multi-rôles, logs d'audit, hébergement sécurisé *(préciser hébergeur)*

---

# PAGE 5 — IMPACT & MARCHÉ

### Titre de page

**Impact attendu & opportunités sur le marché local**

### Image (optionnelle)

```
[IMAGE — Carte ou pictogrammes secteurs, ~30 % page]
Suggestion : carte simplifiée marché local + icônes secteurs
Fichier cible : docs/jibc-2026/assets/marche-local.png (à produire)
Alt          : Marchés cibles TimeGate sur le marché local
```

**Stade actuel : test marché** — prototype opérationnel, validation avec les premiers utilisateurs terrain.

### Impact

| Dimension | Bénéfice |
|-----------|----------|
| **Économique** | Réduction fraude & erreurs de paie ; gain de temps RH |
| **Social** | Transparence employeur-employé ; formalisation de l'emploi |
| **Technologique** | Souveraineté numérique ; innovation locale déployable |
| **Environnemental** | Dématérialisation registres papier |
| **Institutionnel** | Données fiables pour politiques emploi & formation |
| **Opérationnel** | Visibilité temps réel multi-sites ; pilotage RH simplifié |

### Cibles prioritaires

- PME & ETI (commerce, services, industrie légère)
- Secteur minier & logistique (sites éloignés, équipes en rotation)
- Agro-industrie & coopératives
- ONG & projets multi-bureaux
- Administrations & établissements publics

### Modèle économique

- **SaaS accessible** — essai gratuit, abonnement par clé (3 / 12 mois), sans gros CAPEX
- **Déploiement rapide** — 1 smartphone = 1 kiosk, montée en charge site par site
- **Écosystème local** — intégrateurs RH, cabinets paie, incubateurs & appui PME

**Objectif test marché :** 2–3 pilotes terrain d'ici fin 2026 pour valider adoption, UX et modèle économique.

---

# PAGE 6 — STADE, ROADMAP & CONTACT

### Titre de page

**Où en sommes-nous ? & prochaines étapes**

### Stade actuel

```
[IMAGE — Timeline horizontale, optionnelle]
Fichier cible : docs/jibc-2026/assets/roadmap-timegate.png (à produire)

Idée ──▶ Prototype ──▶ **[TEST MARCHÉ — stade actuel]** ──▶ Pilotes terrain ──▶ Croissance locale & régionale
                              │
                    API · Dashboard · Kiosk facial
                    RH · Congés · Timesheets · Paie v1
```

**Aujourd'hui — test marché**

Produit fonctionnel, en validation avec les premiers retours utilisateurs. Prochaine étape : pilotes payants sur le terrain.

- [x] Application kiosk (reconnaissance faciale, sync offline)
- [x] Dashboard admin & espace employé
- [x] Plannings & horaires (shifts, affectations, jours fériés)
- [x] Timesheets journaliers & suivi retards / absences
- [x] Paie v1 — lots, bulletins, export CSV
- [x] Multi-sites — branches, départements, rôles RH
- [x] Traçabilité — événements pointage & logs faciaux
- [~] QR code, NFC, notifications push — en cours de déploiement
- [~] Modèle SaaS multi-organisations — en cours

### Roadmap 12 mois (simplifiée)

| Trimestre | Livrable |
|-----------|----------|
| T1 | Multi-méthodes pointage (QR, NFC) · notifications |
| T2 | Essai SaaS self-service · premiers clients pilotes locaux |
| T3 | Partenariats intégrateurs · exports conformité |
| T4 | Extension multi-pays régionale |

### Ce que nous recherchons à la JIBC 2026

TimeGate est prêt pour des pilotes — la JIBC est l'occasion de rencontrer les bons partenaires et accélérer la phase test marché.

- **Partenaires** — directions RH, cabinets paie, intégrateurs SI, incubateurs et structures d'appui PME : co-déployer et packager l'offre
- **Clients pilotes** — 2–3 organisations (PME, industrie, ONG) prêtes à tester TimeGate 1–3 mois sur site réel, avec retours structurés
- **Investisseurs & mentors** — accélération commerciale, hébergement cloud régional, accompagnement go-to-market local
- **Visibilité** — concours d'innovation, médias locaux, réseau chercheurs-entrepreneurs : faire connaître une solution RH made in Congo

---

### Bloc contact (pied de page — bandeau coloré)

```
[IMAGE — Petit logo, coin gauche]
Fichier : dashboard/public/images/logos/timegate-icon-color.png
Alt     : Icône TimeGate
```

**TimeGate**

**Styve Maba** — porteur du projet

Projet porté par Styve Maba, développeur full-stack spécialisé dans les solutions web, mobiles et cloud, avec plusieurs années d'expérience sur des projets numériques déployés en Afrique et à l'international.

📧 kaiserstyve2@gmail.com  
📱 +242 06 515 23 74  
🌐 www.time-gate.io

*Merci de votre attention — échangeons sur le stand JIBC 2026 !*

---

# ANNEXE — CHECKLIST PRODUCTION PDF

## Assets à créer ou capturer

| # | Asset | Statut | Chemin cible |
|---|-------|--------|--------------|
| 1 | Logo couverture | Existe | `dashboard/public/images/logos/timegate-logo-full-color.png` |
| 2 | Schéma architecture | À créer | `docs/jibc-2026/assets/schema-timegate-jibc.png` |
| 3 | Screenshot kiosk | À capturer | `docs/jibc-2026/assets/screenshot-kiosk.png` |
| 4 | Screenshot dashboard | À capturer | `docs/jibc-2026/assets/screenshot-dashboard.png` |
| 5 | Screenshot employee-app | À capturer | `docs/jibc-2026/assets/screenshot-employee-app.png` |
| 6 | Screenshot RH / employés | À capturer | `docs/jibc-2026/assets/screenshot-rh.png` |
| 7 | Carte marché (optionnel) | À créer | `docs/jibc-2026/assets/marche-local.png` |
| 8 | Timeline roadmap (optionnel) | À créer | `docs/jibc-2026/assets/roadmap-timegate.png` |

## Recommandations export PDF

- Format : **A4** ou **16:9** selon usage (impression vs écran stand)
- Polices : alignées sur le dashboard (sans-serif moderne)
- Couleurs : reprendre `primary` / `secondary` TimeGate
- Taille fichier : compresser images (< 10 Mo total pour le formulaire)
- Version FR uniquement pour JIBC ; version EN optionnelle plus tard

## Script démo stand (rappel — 3 min)

1. Employé pointe au kiosk (visage) → message succès
2. Dashboard : présence du jour mise à jour
3. Employé : historique + solde congés
4. *(Si réseau faible)* mention sync offline

---

*Document source pour le PDF JIBC 2026 — TimeGate · dernière mise à jour : 2026-06-24*

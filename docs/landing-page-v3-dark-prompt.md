# Prompt — TimeGate landing v3 (dark · itération sur la v2)

> **Objectif :** améliorer la landing Lovable actuelle (**2ᵉ version** — *TimeGate: Le Pointage Intelligent*) sans repartir de zéro.  
> **Base visuelle :** composition, rythme, sections immersives et esprit produit de la v2.  
> **Direction :** **DARK FIRST** pour la vitrine marketing (choix volontaire — indépendant du thème clair du dashboard applicatif).  
> **Langue :** **français** (cible CEMAC / Afrique centrale).  
> **Domaine :** `https://timegate-one.vercel.app/`  
> **Autonomie :** ce prompt est self-contained. Ne pas inventer de features, stats ou tarifs absents d’ici.

**Formule :**

```
V2 → DARK TIMEGATE BRAND → VRAI PRODUIT → MEILLEUR STORYTELLING → PLUS POLI
```

**Pas :**

```
V2 → REDESIGN COMPLET
```

---

## 0. Contexte des versions

| Version | Projet Lovable | Caractère |
|---------|----------------|-----------|
| v1 | *TimeGate Landing Page* | Plus dark / cinéma, moins fidèle au PLG |
| **v2 (base)** | *TimeGate: Le Pointage Intelligent* | Light, Comfortaa, PLG, pricing — **meilleure base** |
| **v3 (cible)** | Itération de la v2 | **Dark premium**, contenu produit précis, finition haute |

La vitrine marketing est un **site distinct** du dashboard. Le dashboard peut rester light en produit : **cela n’impose rien** à la landing. La nouvelle vitrine est **dark by design**.

---

## 1. Objectif

TimeGate est une plateforme SaaS de **pointage intelligent** et de **gestion des présences / temps de travail** pour PME, industries et organisations multi-sites — conçue pour le **terrain africain** (offline, FCFA, déploiement rapide).

Le problème de la v2 n’est pas seulement le thème clair : le **contenu et le positionnement** ne montrent pas assez le vrai système (kiosk · face · QR · offline · dashboard live).

Tu dois :

* conserver le langage visuel et la structure narrative de la **v2** ;
* passer **toute** la page en **dark mode** comme direction principale ;
* utiliser les **tokens TimeGate** (surfaces dark + accents teal) ;
* remplacer le contenu générique par une présentation **crédible et précise** ;
* donner plus de place aux **interfaces réelles** (kiosk, dashboard, app employé) ;
* faire ressentir un produit **technologique, fiable, mature** — pas un template SaaS ni un site RH corporate.

Ne transforme PAS TimeGate en suite RH classique.  
Ne fais PAS une grille de dizaines de petites cards.

---

## 2. Positionnement (à respecter partout)

| TimeGate **est** | TimeGate **n’est pas** |
|---|---|
| Pointage de confiance (kiosk + app + règles métier) | Suite RH complète (Factorial, Lucca) |
| SaaS product-led, essai 14 jours | Produit accessible uniquement sur démo / pilote |
| Soft kiosk sur **tablette / smartphone** | Borne biométrique propriétaire type ZKTeco |
| Présence terrain + dashboard RH opérationnel | Outil de temps facturable (Clockify) |

**Message en une phrase (visiteur &lt; 1 min) :**

> TimeGate sait qui est présent, quand il est arrivé, et ce qui se passe dans l’effectif — en temps réel.

**Écosystème (3 surfaces à illustrer — pas la console SaaS) :**

| Surface | Rôle |
|---------|------|
| **Kiosk** | Terminal de pointage (visage, PIN, QR, NFC) — tablette / téléphone |
| **App employé** | Self-service : pointages, congés, scan QR (appareil de confiance) |
| **Dashboard RH** | Présences live, retards, absences, planning, administration |

---

## 3. Direction artistique

Référence : **esprit de la v2** — composition moderne, grands espaces, sections immersives, UI produit mises en avant, typo expressive, profondeur, motion au scroll.

Pousser vers :

**dark · premium · technical · precise · futuristic · trustworthy**

Pas un template SaaS. Pas un redesign total.

### Dark first (vitrine uniquement)

Fond et surfaces dark comme **design principal** de toute la page.

| Token | Hex | Usage |
|-------|-----|--------|
| Primary | `#0d9488` | CTA, accents, highlights |
| Secondary | `#0284c7` | Dégradés, hover |
| Accent | `#14b8a6` | Micro-accents, focus |
| Surface dark | `#0b1120` | Fond de page |
| Card dark | `#141c2e` | Panneaux UI, sections |
| Elevated dark | `#1c2740` | Élévation, overlays |
| Border dark | `#2d3a52` | Bordures |

**Gradient signature :**

```css
linear-gradient(135deg, #0d9488 0%, #0369a1 100%)
```

Aussi : dégradés primary → secondary déjà utilisés dans le produit.

**Règle gradients :** signature visuelle seulement — hero, CTA, accents, halos, interactifs, transitions. Ne pas peindre toute la page en gradient.

Textes : blanc / slate clair pour titres ; slate muted pour le secondaire. Contraste WCAG AA minimum.

---

## 4. Typographie

**Comfortaa** (cohérence marque TimeGate).

Hiérarchie expressive :

* headlines très grands ;
* sous-titres courts ;
* petits labels uppercase ;
* chiffres importants très visibles ;
* texte secondaire discret.

Éviter les longs paragraphes. Contenu scannable en quelques secondes.

---

## 5. Langue, CTAs et URLs

**Langue :** français exclusivement (pas de headlines EN type « KNOW WHO'S HERE »).

| Priorité | Libellés | Destination |
|----------|----------|-------------|
| **Primaire** | `Créer mon organisation`, `Essayer gratuitement 14 jours` | `/signup` |
| Secondaire | `Voir comment ça fonctionne`, `Découvrir TimeGate` | ancres page |
| Discret | `Se connecter` | `/login` |
| Activation | packs payants | `/activate` ou contact |

**Interdit en CTA principal :** « Demander une démo », « Planifier un appel », « Get started » vague.

---

## 6. Hero

Plus fort que la v2, toujours **une composition** (pas un collage de cards).

### Eyebrow

`PLATEFORME DE PRÉSENCE & POINTAGE`

### Headline (FR)

**Savoir qui est là.  
Savoir quand il arrive.**

(Alternative acceptable si elle scrolle mieux : *Le pointage de vos équipes, enfin fiable.*)

### Supporting

TimeGate transforme chaque pointage en donnée fiable, vérifiable et exploitable — de l’arrivée au reporting. Kiosk facial, QR, NFC, PIN, sync offline, dashboard en temps réel.

### CTAs

* Principal : **Créer mon organisation** → `/signup`
* Secondaire : **Voir comment ça fonctionne** → ancre

Micro-ligne : `Essai gratuit 14 jours · 10 employés · 1 kiosk`

### Hero visual

Composition produit TimeGate (pas trois téléphones génériques) :

* interface **kiosk** (face / confirmation identité / heure / statut) ;
* hint **dashboard** en profondeur ;
* sensation de sync / live.

Exemple de contenu UI (illustratif, pas des stats clients) :

```
07:58:42
STYVE MABA
✓ Identité vérifiée
PRÉSENT
```

Puis panneau :

```
PRÉSENCE EN DIRECT
128 Présents · 09 Retards · 05 Absents
```

Objectif : montrer un **système de présence temps réel**, pas une app de badge.

**Important kiosk :** software sur tablette / smartphone. Cadre type tablette OK. Éviter une borne hardware fantasy type ZKTeco.

---

## 7. Section — Le pointage, réinventé

**Headline :** Chaque événement de présence compte.

Texte court : TimeGate transforme l’arrivée ou le départ en donnée fiable.

Processus **visuel** (grandes typos, chiffres, motion) — méthodes **alternatives**, pas une chaîne unique Face→NFC→PIN :

| Étape | Titre | Contenu |
|-------|--------|---------|
| 01 | IDENTIFIER | Reconnaissance faciale (détection locale, match serveur) |
| 02 | VÉRIFIER | Face **ou** PIN **ou** NFC **ou** QR (appareil de confiance) |
| 03 | ENREGISTRER | Événement de présence instantané (+ file offline si besoin) |
| 04 | EXPLOITER | Dashboard live, retards, absences, timesheets, rapports |

---

## 8. Section — TimeGate Kiosk

**Headline :** Un kiosk. Chaque arrivée.

Grande UI kiosk :

* reconnaissance faciale ;
* confirmation d’identité ;
* heure ;
* statut ;
* feedback visuel ;
* fallback PIN ;
* NFC ;
* challenge **QR** (employé scanne depuis l’app).

Ressembler à un **produit soft réel** (tablette murale / comptoir), pas à un mockup smartphone générique empilé.

Mention discrète : *Pas de borne biométrique lourde — une tablette ou un smartphone Android suffit.*

---

## 9. Section — Présence en temps réel

**Headline :** Voyez votre effectif. En temps réel.

Grande interface dashboard :

* Présents · Retards · Absents  
* (congés : traitement séparé, pas mélangé comme 4ᵉ KPI live du même type)
* Fil d’activité vivant :

```
07:58 — Styve Maba — Présent (visage)
08:01 — Jean Dupont — Présent (QR)
08:07 — Marie N. — Retard (NFC)
```

Animations légères de sync / update. Légende : *Interface produit TimeGate* (pas des métriques client réelles).

---

## 10. Section — Une présence, plusieurs méthodes

Composition autour d’**une identité employé** — pas une grille de 4 cards SaaS.

| Méthode | Pitch | Note |
|---------|--------|------|
| **Reconnaissance faciale** | Rapide, sans contact | Différenciateur principal |
| **NFC** | Tap and go | Selon terminal Android |
| **PIN** | Fallback fiable | Configurable par kiosk |
| **QR rotatif** | Scan depuis l’app employé | Sur **appareil de confiance** |

**Ne pas** intituler la 4ᵉ méthode « Registered Device ».  
**Appareil de confiance** = contrôle d’accès employé (QR / actions sensibles), pas un mode de pointage à part.

Atout terrain à faire sentir : **offline-first** (file visage/NFC/QR, resync auto).

---

## 11. Section — Fiabilité

**Headline :** Des données de présence auxquelles vous pouvez faire confiance.

Points réels (sans chiffres inventés) :

* appareils de confiance (employee) + kiosks provisionnés ;
* vérification d’identité (face / PIN / NFC / QR) ;
* historique de présence ;
* auditabilité (logs de reconnaissance faciale) ;
* administration centralisée multi-sites ;
* fenêtres horaires (arrivée, pause, reprise, départ) ;
* resynchronisation offline.

**Interdit :** « 99.9 % accuracy », témoignages fictifs, logos clients non autorisés.

**Preuve autorisée :** *« Déjà utilisé en production par des équipes au Congo »* (pilote PME, Brazzaville).

---

## 12. Section — Du pointage à la donnée

Progression visuelle (données qui circulent) :

**POINTAGE** → **PRÉSENCE** → **HEURES TRAVAILLÉES** → **HEURES SUP.** → **RAPPORTS**

(Overtime / timesheets existent dans le produit ; ne pas promettre un module paie « activé partout » — voir §17.)

---

## 13. Section — Dashboard

Grande section produit. Dashboard = héros visuel.

UI crédible : overview présence, employés, activité live, taux de présence, retards, absences, rapports / exports.

Grands panels UI. Éviter cards flottantes vides. Screenshots ou mockups fidèles au produit.

---

## 14. Section — Pour les équipes

Composition éditoriale (pas 3 cards SaaS) :

| Acteur | Message |
|--------|---------|
| **Employés** | Check-in / check-out simple + app (congés, QR) |
| **Managers** | Visibilité sur leur équipe, retards, validations |
| **RH / Admin** | Données fiables, multi-sites, rapports, paramétrage |

---

## 15. Section — Technologie (crédibilité)

Traitement type interface technique, discret :

* Face recognition (engine dédié)
* NFC · PIN fallback · QR challenge
* Device trust (employé) + provisionnement kiosk
* Sync temps réel + file offline
* Dashboard centralisé multi-tenant
* Branches / sites

---

## 16. Pricing & PLG (obligatoire — ne pas supprimer de la v2)

Conserver une section tarifs claire (dark), sans en faire le seul sujet de la page.

**Essai :** 14 jours · 10 employés max · 1 kiosk · via `/signup`

| Pack | Abonnement / mois | Setup | Cible courte |
|------|------------------:|------:|--------------|
| **ESSENTIEL** | **15 000 FCFA** | 0 | ≤ 20 emp · 1 site · pointage manuel |
| **PRO** | **50 000 FCFA** | dès 50 000 (matériel) | ≤ 100 emp · kiosk face/QR/NFC/PIN |
| **ENTERPRISE** | **220 000 FCFA** | dès 260 000 | Multi-sites · illimité |

* Ne **jamais** afficher le tarif pilote interne 25 000 FCFA.  
* Pas de paiement en ligne : activation via `/activate` ou contact.  
* Pilote accompagné = section **secondaire** (mailto), pas le parcours principal.

---

## 17. Roadmap — ne pas vendre comme disponible partout

* Module **paie** (code présent, pas activé chez tous les clients)
* **Copilote IA** (prototype / quotas)
* Webhooks / ERP avancés — offres avancées
* Paiement en ligne — n’existe pas

---

## 18. Final CTA

Fond dark + gradient TimeGate subtil.

**Headline :**  
Vos équipes bougent déjà.  
TimeGate suit le rythme.

* Principal : **Essayer gratuitement 14 jours** → `/signup`  
* Secondaire : **Découvrir TimeGate** → ancre produit

---

## 19. Navigation

Minimaliste, premium, dark glass.

* Gauche : logo TimeGate  
* Centre : Produit · Comment ça marche · Fonctionnalités · Tarifs · Sécurité  
* Droite : `Se connecter` + **Créer mon organisation**

Discrète, peu de hauteur.

---

## 20. Motion

Reveal on scroll, fade + translate, chiffres qui apparaissent, fil d’activité, sync subtile, léger parallax, hovers propres.

Thème du mouvement : **temps réel · précision · synchronisation · activité**  
Pas de gadgets.

---

## 21. Contenu — règles

* Spécifique TimeGate : présence, pointage, identité, face, NFC, PIN, **QR**, appareil de confiance, offline, dashboard, rapports, fiabilité.
* Pas de lorem ipsum.
* Pas de phrases creuses (« Empower your workforce… »).
* Pas de vocabulaire RH générique vide.
* Compréhension du produit en **moins d’une minute**.

---

## 22. Ne pas faire

* Repartir sur une nouvelle direction graphique  
* Revenir au light comme design principal de la **vitrine**  
* Bleu SaaS générique / purple glow / template  
* Dizaines de cards  
* Illustrations corporate génériques  
* Stats inventées / features inventées  
* Présenter TimeGate comme un simple badge logiciel  
* Mockups téléphone partout  
* Borne hardware fantasy  
* Remplacer les tokens TimeGate  
* Renommer le QR en « Registered Device »  
* Headlines / nav en anglais  
* CTA principal ≠ `/signup`  
* Supprimer pricing / essai 14 j de la v2  

---

## 23. Checklist livraison

- [ ] Base = structure / esprit **v2**, polish v3  
- [ ] Page **entièrement dark** (vitrine)  
- [ ] Tokens TimeGate respectés  
- [ ] Comfortaa  
- [ ] FR only  
- [ ] Hero = composition kiosk + live présence  
- [ ] 4 méthodes : Face, NFC, PIN, **QR** (+ device trust expliqué correctement)  
- [ ] Offline / resync mentionné  
- [ ] 3 surfaces : kiosk · app employé · dashboard  
- [ ] CTA primaire → `/signup` + essai 14 j  
- [ ] Pricing catalogue 15k / 50k / 220k FCFA  
- [ ] Aucun 25k pilote, aucun faux KPI  
- [ ] Pas de promesse paie/IA comme core  
- [ ] Motion au service du temps réel  
- [ ] Mobile soigné  

---

*Brief d’itération v2 → v3 dark — TimeGate / Mazala Firm · septembre 2026.*

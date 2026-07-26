# TimeGate — Product tour dashboard (Start tour) — Design

**Date** : 2026-07-26  
**Surface** : Dashboard Next.js (`dashboard/`)  
**Statut** : design validé en brainstorming — en attente de revue spec avant plan d’implémentation  
**Lib spotlight** : driver.js (déjà en dépendance)

---

## Contexte

Une V1 minimale existe déjà :

- `driver.js` + `lib/product-tour.ts`
- Bouton « Start tour » (navbar + home)
- Auto-start one-shot via `localStorage`
- Étapes chrome (sidebar, search, notifs, Copilot) + home (Aujourd’hui, accès rapide, plan)

Cette V1 est **trop courte** (textes one-liner), **non multi-pages**, et **peu interactive**. Le brainstorming du 2026-07-26 redéfinit le tour comme **onboarding post-signup complet et interactif** de la plateforme.

### Décisions validées

| Sujet | Choix |
|-------|-------|
| But | Onboarding **post-signup** (première session) |
| Forme | Tour plateforme **multi-pages** + **micro-tâches** |
| Périmètre modules V1 | Noyau : home, org, employés, branches, kiosques, pointage/événements, congés/inbox (+ planning côté manager) |
| Parcours | **Deux catalogues** : Admin (setup) et Manager (quotidien) |
| Interactivité | Naviguer + ouvrir formulaires ; **pas de création silencieuse** d’objets |
| Exception write | **Configuration organisation** : **save requis** pour avancer |
| Copy | Textes **vendeurs** + **explicatifs** (décrire l’élément pointé) |
| UI | Popover / progress **larges**, match design system teal/slate TimeGate (pas le chrome driver.js par défaut) |
| Approche technique | **Orchestrateur** sur driver.js + state machine (pas de moteur 100 % custom) |

---

## Vision & principes UX

### Promesse

À la première session (et via **Start tour**), TimeGate guide l’utilisateur dans un parcours immersif : on **montre la valeur**, on **explique ce qui est à l’écran**, on **fait agir** (naviguer, ouvrir un écran clé, enregistrer l’org), sans polluer le tenant de données fictives (sauf save org volontaire).

### Copy

- Ton : confiant, bénéfice-first, français.
- Structure par étape :
  1. **Titre punchy** (vendeur)
  2. **Corps 2–4 phrases** qui décrit **ce qu’on voit** sur l’élément pointé (blocs, tuiles, boutons, chiffres) **et** à quoi ça sert
  3. **CTA** clair (« Continuer », « Ouvrir les employés », « Enregistrez pour continuer »)
- Interdit en V1 : one-liners vagues du type « Retrouvez vos alertes ici » sans expliquer le contenu visible.

Exemple (bloc Aujourd’hui) :

> **Le pouls de votre organisation**  
> Ce bandeau résume la journée : présents, absents, congés, retards, et ce qui attend une validation. Chaque tuile est cliquable pour plonger dans le détail. C’est votre point de départ chaque matin pour savoir où concentrer votre attention.

### UI

- Popover TimeGate custom : largeur ~360–400px, titre ~16–18px, corps ~14px, boutons primary/secondary alignés dashboard.
- Progress chip fixe : `Dashboard · 3/12`, Quitter / Skip selon règles.
- Bouton Start tour : pill navbar cohérente + bouton page home.
- Spotlight driver.js sous le capot ; chrome entièrement restylé (`popoverClass` + `onPopoverRender` si besoin).

---

## Architecture

### Composants

| Unité | Rôle |
|-------|------|
| `TourController` | State machine client : `idle → running → awaitingAction → navigating → completed \| dismissed` |
| Catalogues | `adminTour.ts` / `managerTour.ts` — étapes déclaratives |
| driver.js | Spotlight uniquement |
| `TourProgressChip` | Avancement + Quitter |
| `StartTourButton` | Relance forcée |
| `ProductTourBootstrap` | Auto-start / reprise première visite |
| Persistence | `localStorage` clé scopée `userId` + `role` |

### Types d’étapes

| Type | Comportement |
|------|----------------|
| `spotlight` | Highlight + copy longue + Suivant |
| `navigate` | `router.push(path)` → attendre sélecteur DOM → spotlight |
| `awaitAction` | Bloque jusqu’au clic sur `data-tour-action="…"`. Ex. ouvrir « Ajouter un employé » (form) **sans** forcer la sauvegarde |
| `requireSave` | Bloque jusqu’à **succès** d’enregistrement (événement / callback après `updateMyCompany`). Skip explicite « Plus tard » possible → flag `orgSetupSkipped` |
| `celebrate` | Fin de parcours : récap + Terminer |

### Règles runtime

- Cible absente après timeout (~4s) → skip soft (sauf `requireSave` org, qui reste bloquant jusqu’à save ou Skip explicite).
- Page hors rôle / 403 → skip du module.
- Esc / X → `dismissed` ; si `requireSave` en cours → confirmation légère.
- Terminer → `completed` ; Start tour avec `force` relance from scratch.
- **Aucune autre écriture API** pendant le tour que le save org volontaire.

### Fichiers cibles (indicatif)

```
dashboard/lib/tour/
  types.ts
  storage.ts
  controller.ts
  catalogs/admin.ts
  catalogs/manager.ts
dashboard/components/tour/
  StartTourButton.tsx
  TourProgressChip.tsx
  ProductTourBootstrap.tsx
  tour-popover.css (ou globals)
```

Ancres DOM : `data-tour="…"`, `data-tour-action="…"`, et pour l’org `data-tour-save` sur le submit réussi (ou event bus léger `tour:org-saved`).

Remplace / absorbe la V1 (`lib/product-tour.ts` monolithique).

---

## Parcours

### Préalable commun — Tour de l’écran Dashboard (`/`)

Avant toute navigation hors-home, enchaîner des spotlights **explicatifs** sur :

1. En-tête (titre, Start tour, Actualiser)
2. Bloc **Aujourd’hui** (tuiles + ligne kiosks offline)
3. **KPI cards** (contenu selon rôle : Admin voit employés/branches/kiosques/couverture ; Manager voit surtout absences/retards/congés/timesheets — skip soft si une carte absente)
4. **Analytics / graphiques** (si présents dans le DOM ; sinon skip soft)
5. **Accès rapide**

Le catalogue numérote **chaque** spotlight dashboard comme une étape distincte (pas un seul step « home »).

### Admin — « Lancez TimeGate »

Ordre :

1. Welcome (`celebrate` / spotlight centrée)
2. **Tour dashboard** (5 étapes ci-dessus)
3. **Configuration organisation** (`navigate` → `/organization`)  
   - Spotlight sur le formulaire (nom, logo, fuseau, contacts…) avec copy qui explique les champs visibles  
   - **`requireSave`** : continuer seulement après enregistrement réussi  
   - Option « Plus tard » → `orgSetupSkipped` + rappel soft one-shot plus tard sur `/`
4. Employés (`navigate` → `/employees`) + `awaitAction` sur « Ajouter un employé » (ouvre `/employees/new`, **pas** de save forcé)
5. Branches (`navigate` → `/branches`) + `awaitAction` ouvrir formulaire création (pas de save forcé)
6. Kiosques (`navigate` → `/kiosks`) — spotlight liste / CTA
7. Événements de pointage (`navigate` → `/attendance/events`)
8. Inbox (`navigate` → `/manager/inbox`)
9. Celebrate — « Vous êtes opérationnel »

### Manager — « Pilotez votre journée »

1. Welcome
2. **Tour dashboard**
3. Équipe du jour (`/manager/team`)
4. Inbox (`/manager/inbox`) — `awaitAction` ouvrir un item / CTA principal si disponible, sinon spotlight
5. Congés manager (`/manager/leaves`)
6. Événements (`/attendance/events`)
7. Planning (`/planning`)
8. Chrome : recherche globale + notifications (si visibles)
9. Celebrate — « Prêt à manager »

Pas d’étape `requireSave` org pour Manager (hors périmètre typique).

---

## Erreurs, reprise, persistence

| Situation | Comportement |
|-----------|----------------|
| Refresh mid-tour | Persister `status: running` + `stepId` ; au retour proposer **Reprendre la visite** |
| Skip / Quitter | `dismissed` ; Start tour = restart (confirm si unfinished) |
| Org skip « Plus tard » | `orgSetupSkipped` ; bandeau rappel one-shot sur home |
| Échec save org | Rester sur l’étape ; toast / erreur formulaire existante ; Réessayer |
| Sélecteur manquant | Skip soft + toast discret (sauf requireSave) |

Clé storage (exemple) : `timegate.dashboard.tour.v2:{userId}:{role}`.

---

## Critères de done (V1)

- [ ] Orchestrateur + types `spotlight` | `navigate` | `awaitAction` | `requireSave` | `celebrate`
- [ ] Catalogues Admin / Manager avec **textes longs explicatifs** (FR)
- [ ] Tour multi-étapes dédié de l’écran dashboard
- [ ] Étape organisation **save requis** (Admin)
- [ ] Navigation multi-pages + ouverture de formulaires sans create forcé
- [ ] Progress chip + Start tour + auto-start / reprise localStorage
- [ ] UI popover / boutons alignés design system (taille confortable)
- [ ] Remplacement propre de la V1 monolithique
- [ ] Aucune autre write API que le save org volontaire

### Hors V1

- Funnel analytics dédié au tour
- i18n EN
- Création forcée employé / branche / kiosque
- Tour paie, system-config, analytics produit profond
- App employé / kiosk

---

## Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| driver.js + App Router (unmount pages) | `navigate` attend le sélecteur post-route ; détruire/recréer instance driver entre pages si besoin |
| Tour trop long → abandon | Progress visible, Skip, reprise ; copy utile dès la 1ʳᵉ phrase |
| requireSave frustrant | « Plus tard » explicite + rappel soft, pas de soft-lock produit |
| Cibles DOM fragiles | `data-tour*` stables ; skip soft documenté |

---

## Références code existant

- V1 : `dashboard/lib/product-tour.ts`, `components/tour/*`
- Org save : `dashboard/app/(authenticated)/organization/page.tsx` → `updateMyCompany`
- Nav rôle : `dashboard/lib/navigation.ts`

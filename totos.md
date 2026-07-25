# TimeGate — Comparaison marché & todos d’amélioration

> Document de synthèse produit (app employé + écosystème TimeGate).  
> Dernière mise à jour : 2026-07-25

---

## 1. Positionnement TimeGate

TimeGate est une plateforme de **pointage opérationnel + RH de terrain** :

- **Kiosk** : reconnaissance faciale, PIN, NFC, QR
- **App employé** (Expo) : self-service (congés, échanges, planning, pointage QR, reprise pause)
- **Dashboard** admin / managers
- **Console** SaaS multi-tenant
- Atouts différenciants : **appareil de confiance**, **QR inversé** (employé scanne la borne), **file offline**, règles de fenêtre de pointage

Ce n’est **pas** une suite RH complète type Factorial/Lucca, ni un outil de temps facturable type Clockify.

---

## 2. Comparaison avec les solutions existantes

### 2.1 Tableau synthétique

| Critère | TimeGate | Combo / Lucca / Factorial | UKG / ADP / SoftGarden | Clockify / Toggl | Constructeurs biométriques (ZKTeco, etc.) |
|---|---|---|---|---|---|
| Pointage kiosk + anti-fraude | **Fort** | Moyen / option | Fort (entreprise) | Faible | Fort hardware, soft souvent faible |
| Self-service RH (congés, docs) | Moyen | **Fort** | Fort | Faible | Faible |
| Planning / shifts | Moyen | Fort (selon offre) | Fort | Faible | Variable |
| UX app mobile | Moyen+ | **Fort** | Variable | Fort | Souvent médiocre |
| Déploiement PME / time-to-value | **Avantage potentiel** | Cher / EU-centric | Cher, long | Pas le même métier | Lié au hardware |
| Prix / contrôle du stack | Bon (produit intégré) | Licence SaaS | Entreprise | Abonnement léger | Capex bornes |
| IA manager / copilote | En cours | Oui (souvent) | Oui | N/A | Rare |
| Offline punch / confiance appareil | **Fort** | Rare / limité | Variable | N/A | Variable |

### 2.2 Lectures par famille

#### Vs Combo / Lucca / Factorial
- **Eux** : expérience employé soignée, large couverture RH (docs, absences, onboarding, parfois paie).
- **TimeGate** : plus fort sur le **contrôle physique du pointage** (bornes, confiance appareil, QR borne).
- **Écart à combler** : polish UX, home contextuelle, formulaires, branding, dark mode.

#### Vs UKG / ADP / SoftGarden
- Même famille fonctionnelle (temps & présence), mais TimeGate est plus **léger et product-led**.
- **Avantage** : mise en place plus rapide, stack moderne.
- **Désavantage** : écosystème paie / conformité multi-pays / intégrations legacy.

#### Vs Clockify / Toggl
- **Pas les mêmes clients** : eux = temps facturable / freelances / projets.
- TimeGate = présence réglementaire, site, équipe, bornes.

#### Vs constructeurs biométriques
- **Eux** vendent des boîtiers ; TimeGate vend un **système** (kiosk + app + admin + règles métier).
- Positionnement à pousser : “intelligence + conformité + self-service”, pas seulement “badgeuse”.

### 2.3 Verdict

| | |
|---|---|
| **Force** | Moteur de pointage de confiance (kiosk + device trust + QR + offline) |
| **Faiblesse** | App employé encore perçue comme portail admin, pas comme produit habit-forming |
| **Opportunité** | PME / sites multi-bornes qui veulent anti-fraude sans lourdeur UKG |
| **Menace** | Suites RH qui ajoutent du pointage “assez bon” + UX supérieure |

---

## 3. Todos d’amélioration (priorisés)

### P0 — Doit être fait (impact immédiat)

- [x] **Accueil contextuel** — Remplacer la grille d’actions égales par un état du jour : prochain shift / statut journée / CTA primaire (Pointer, Reprendre pause, etc.)
- [x] **Identité TimeGate** — Renommer l’app (`TimeGate`), scheme `timegate`, splash/teal adaptive background (`app.json`)
- [x] **États vides & erreurs** — `EmptyState` / `ErrorState` (congés, échanges) + retry
- [x] **Dark mode complet** — Écrans migrés vers `useTheme()` (contrats, soldes, planning, types, formulaires…)
- [x] **Date pickers natifs** — `DateField` (`@react-native-community/datetimepicker`) sur congés, échanges, réclamations

### P1 — Devrait suivre (expérience employé)

- [x] **Hiérarchie des actions** — CTA primaire + actions secondaires
- [x] **Feedback post-pointage** — Confirmation claire (heure, site, type) + accès immédiat à l’historique
- [x] **Notifications deep-link** — Ouvre congés / pointage / pause / contrats selon le type
- [x] **Accessibilité** — Login (AuthForm), QR, reprise pause (rôles, labels, live regions)
- [x] **Offline explicite** — Bannière sync sur l’accueil (file QR)

### P2 — Peut attendre (différenciation / maturité)

- [ ] Documents RH / contrats (aperçu PDF fluide, téléchargement fiable)
- [ ] Messagerie légère manager ↔ employé
- [ ] Widgets / raccourcis Android (pointer, solde)
- [ ] Onboarding in-app (1ʳᵉ connexion + appareil de confiance)
- [ ] Analytics produit (funnels : login → QR → demande congé)

### P3 — Technique (qualité durable)

- [ ] Unifier le thème via `useTheme()` partout
- [ ] Kit formulaires partagé (champ, erreur, bouton, empty state)
- [ ] Tests e2e sur parcours sensibles (login, scan QR, reprise pause)
- [ ] Harmoniser labels a11y FR (`STRINGS.a11y`) sur tous les écrans restants

---

## 4. Focus recommandé (3 prochains chantiers)

~~1. Accueil “état du jour”~~ ✅  
~~2. Branding + dark mode cohérent~~ ✅  
~~3. Date pickers + empty states~~ ✅  

**Suite utile :** onboarding appareil de confiance · widgets Android · docs/contrats · analytics · a11y tailles de texte dynamiques.

> Le moteur (kiosk, confiance appareil, QR) est déjà un atout.  
> Le levier restant : **clarté et confiance perçue** côté employé.

---

## 5. Références internes utiles

- Specs / plans : `docs/superpowers/specs/`, `docs/superpowers/plans/`
- App employé : `employee-app/`
- Kiosk : `kiosk-app/`
- API : `api/`
- Dashboard : `dashboard/`

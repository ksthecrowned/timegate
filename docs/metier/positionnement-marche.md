# Positionnement marché TimeGate

> Extrait consolidé depuis l’ancien `totos.md` (2026-07-25).  
> Backlog d’exécution : [`TODOS.md`](../../TODOS.md).

## Positionnement

TimeGate est une plateforme de **pointage opérationnel + RH de terrain** :

- **Kiosk** : reconnaissance faciale, PIN, NFC, QR
- **App employé** (Expo) : self-service (congés, échanges, planning, pointage QR, reprise pause)
- **Dashboard** admin / managers
- **Console** SaaS multi-tenant
- Atouts : **appareil de confiance**, **QR inversé**, **file offline**, fenêtres de pointage

Ce n’est **pas** une suite RH complète (Factorial/Lucca) ni un outil de temps facturable (Clockify).

## Comparaison synthétique

| Critère | TimeGate | Combo / Lucca / Factorial | UKG / ADP | Clockify / Toggl | Bornes biométriques |
|---|---|---|---|---|---|
| Pointage kiosk + anti-fraude | **Fort** | Moyen | Fort | Faible | Fort hardware |
| Self-service RH | Moyen | **Fort** | Fort | Faible | Faible |
| Planning / shifts | Moyen | Fort | Fort | Faible | Variable |
| UX app mobile | Moyen+ | **Fort** | Variable | Fort | Souvent médiocre |
| Time-to-value PME | **Avantage** | Cher | Cher / long | Autre métier | Lié hardware |
| Offline / device trust | **Fort** | Rare | Variable | N/A | Variable |

### Lectures

- **Vs Lucca / Factorial** : eux = UX RH large ; TimeGate = contrôle physique du pointage.
- **Vs UKG / ADP** : même famille temps & présence, TimeGate plus léger / product-led.
- **Vs Clockify** : pas les mêmes clients.
- **Vs ZKTeco & co.** : eux = boîtiers ; TimeGate = système (kiosk + app + règles).

### Verdict

| | |
|---|---|
| **Force** | Pointage de confiance (kiosk + device trust + QR + offline) |
| **Faiblesse** | App employé encore peu « habit-forming » |
| **Opportunité** | PME / multi-bornes anti-fraude sans lourdeur UKG |
| **Menace** | Suites RH qui ajoutent un pointage « assez bon » + meilleure UX |

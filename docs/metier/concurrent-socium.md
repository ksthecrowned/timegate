# Concurrent — Socium (Socium Time)

> Interne TimeGate · 25 septembre 2026  
> Source publique : [socium.link](https://socium.link/)  
> Positionnement TimeGate : [`positionnement-marche.md`](./positionnement-marche.md)

---

## Verdict en une phrase

**Socium** = suite RH panafricaine qui ajoute le temps (Socium Time).  
**TimeGate** = moteur de présence vérifiable (kiosk + anti-fraude + chaîne pointage → timesheet → paie).

Ils se croisent sur le **pointage QR / mobile**. Ils ne se battent pas sur le même cœur de valeur.

---

## Snapshot Socium

| | |
|---|---|
| **Produit** | Suite RH modulaire : Time, Job (ATS), Workflow, Doc, Performance, Payroll |
| **Géographie** | ~20 pays Afrique, multi-devises, conformité locale revendiquée |
| **Traction affichée** | +200 entreprises, +50k salariés, logos (Orange, Auchan, Sonatel, Lagardère TR…) |
| **Funding affiché** | ~6 M€ (Breega, Partech, Orange Ventures, Kima) |
| **Time (Socium Time)** | Pointage QR + GPS (app mobile), feuilles de temps, export vers paie |
| **Différenciation suite** | Paie multi-pays, ASSIA (assistant IA RH), coffre documentaire, recrutement |

Socium Time n’est **pas** le produit phare : c’est un module dans une suite. Le pitch site met la paie / RH multi-pays en avant ; le temps est un add-on de confiance.

---

## Matrice features

Légende : **Fort** · Moyen · Faible / absent · ? = non vérifié en public

| Capacité | TimeGate | Socium Time (public) | Note |
|---|---|---|---|
| Pointage QR | **Fort** (kiosk challenge + employé scan) | **Fort** (borne / app) | Parité de surface |
| Pointage GPS | Moyen / roadmap | **Fort** (revendiqué) | Socium plus visible sur GPS |
| Reconnaissance faciale (kiosk) | **Fort** | ? / faible | Avantage TimeGate |
| PIN / NFC kiosk | **Fort** | ? | Avantage TimeGate |
| Borne sans hardware propriétaire | **Fort** (téléphone / tablette) | Moyen (QR borne + app) | TimeGate = kiosk logiciel complet |
| Offline + resync | **Fort** (file, idempotency) | Moyen (app « hors-ligne » revendiqué) | Profondeur à vérifier côté Socium |
| Appareil de confiance | **Fort** | ? | Différenciant TimeGate |
| Fenêtres / règles de pointage | **Fort** | ? | Cœur TimeGate |
| Multi-sites / multi-contextes (mission, client) | **Fort** (présence multi-contexte) | Moyen (multi-pays org) | Pas le même axe |
| Feuilles de temps | **Fort** | **Fort** | Parité |
| Planning / shifts | Moyen+ | ? (suite) | Socium peut s’appuyer sur autres modules |
| Congés / demandes | Moyen | **Fort** (Workflow) | Suite Socium gagne |
| Préparation / export paie | Moyen+ (prépare, ne remplace pas) | **Fort** (Payroll natif multi-pays) | Socium gagne sur paie réglementaire |
| Recrutement / GPEC / docs | Faible | **Fort** | Hors scope TimeGate — volontaire |
| Copilote IA | Moyen (métier présence / paie) | Moyen+ (ASSIA, RH large) | Pas le même corpus |
| Time-to-value PME « présence only » | **Fort** | Moyen (suite à configurer) | Avantage TimeGate |
| Crédibilité marché / logos / fonds | Faible (early) | **Fort** | Avantage Socium |

### Lecture rapide

- **Parité** : QR, timesheets, app mobile, lien vers la paie.
- **TimeGate gagne** : kiosk facial + multi-modal (face / PIN / NFC / QR), registre vérifiable, offline / device trust, anti-fraude terrain.
- **Socium gagne** : suite RH + paie multi-pays + traction commerciale + conformité réglementaire large.

---

## Matrice messaging

| Message | Socium | TimeGate (à pousser) |
|---|---|---|
| Promesse | « Gérez vos RH simplement » — suite complète Afrique | « Qui est vraiment au travail ? » — présence vérifiable |
| Preuve | Logos, multi-pays, levées | Démo cycle kiosk → anomalies → timesheet → paie |
| Objet | Employé unique dans toute la RH | Événement de présence (qui / où / quand / moyen / contexte) |
| Achat | Module Time dans un deal suite | Spécialiste présence ; s’intègre à la paie existante |
| Menace implicite pour l’autre | Time « assez bon » + tout le reste RH | Face + bornes + règles que le module Time n’égalera pas vite |

---

## Positionnement — pourquoi TimeGate plutôt que Socium Time

### Pour le pitch (30 s)

> Socium est une excellente suite RH. Socium Time pointe par QR et GPS.  
> TimeGate est autre chose : un **moteur de présence de confiance** — kiosk facial sur téléphone, NFC, QR inversé, offline, appareil de confiance, anomalies et audit.  
> On ne remplace pas votre paie ni votre ATS. On garantit que les heures qui y arrivent sont **réelles**.

### Battle card (objections)

| Objection prospect | Réponse |
|---|---|
| « On a déjà Socium / on regarde Socium » | Parfait pour paie & RH. Pour le **contrôle physique** du pointage (usines, sécurité, multi-sites, anti-fraude), TimeGate est le spécialiste. Cohabitation possible : TimeGate → export / préparation → leur paie. |
| « QR + GPS ça suffit » | Suffit pour du bureau calm. Dès qu’il y a **substitution de badge, sites clients, horaires serrés, pas de réseau**, il faut kiosk + biometrie + règles + offline. |
| « On veut une seule plateforme » | Une suite large a un Time « assez bon ». Les entreprises qui souffrent du pointage achètent la **profondeur**, pas la checklist. |
| « Socium a l’IA / 20 pays » | Leur force. La nôtre : **intégrité du registre de présence**. L’IA TimeGate lit ce registre ; elle ne remplace pas une fiche de paie multi-pays. |
| « Vous êtes plus petits » | Oui. Time-to-value sur la présence, sans projet de transformation RH de 18 mois. Pilote 30 jours sur un site. |

### Phrases site / one-pager (FR)

1. **Pas une suite RH de plus** — le registre de présence que les suites branchent trop tard.
2. **Kiosk sans borne propriétaire** — face, PIN, NFC, QR sur téléphone ou tablette.
3. **Des heures que la paie peut croire** — anomalies, audit, offline, appareil de confiance.
4. **Complément, pas concurrent forcé** — TimeGate prépare ; votre paie (Socium Payroll ou autre) reste souveraine.

### Ce qu’on ne dit **pas**

- Ne pas attaquer Socium sur la paie multi-pays ou le recrutement (terrain perdu).
- Ne pas promettre « on remplace Socium ».
- Ne pas sous-estimer leur Time : QR/GPS + timesheets + export est déjà crédible pour beaucoup de PME.

---

## SWOT vs Socium Time

| | |
|---|---|
| **Force TimeGate** | Profondeur présence (face, kiosk, trust, offline, multi-contexte) |
| **Faiblesse TimeGate** | Moins de surface RH, moins de logos, GPS moins mis en avant |
| **Opportunité** | Clients Socium frustrés par un Time trop léger ; secteurs terrain (sécurité, nettoyage, usine, clinique) ; intégration / export vers leur paie |
| **Menace** | Socium approfondit Time (face, bornes, offline durci) + vend le bundle « déjà chez nous » |

---

## Implications produit (interne)

Aligné avec la règle feuille de route multi-secteurs : **pas de feature-parity suite RH**.

Priorités défensives / offensives face à Socium Time :

1. **Rendre indéniable** le registre vérifiable (démo 15 min : face → anomalie → timesheet).
2. **Clarifier le lien paie** : « on prépare / on exporte » — coexistence avec Socium Payroll ou autre.
3. **GPS / géofence** : réduire l’écart de messaging s’il est réel côté produit.
4. **Ne pas** lancer ATS / GPEC / coffre docs « parce que Socium l’a ».

Rattrapage **employee-app** (home, mes heures, paie lecture seule) :  
[`employee-app-rattrapage.md`](./employee-app-rattrapage.md).

---

## Sources & limites

- Analyse basée sur le messaging public Socium (site, Socium Time) au 25/09/2026 — pas sur un essai produit ni un call concurrent.
- Mettre à jour après démo Socium Time, retours terrain, ou annonce produit (face, offline, bornes).

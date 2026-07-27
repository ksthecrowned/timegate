# 04 — Scénarios de test (UAT)

> Document destiné aux **testeurs de l’entreprise**. Cocher OK / KO au fil des essais.

Chaque scénario : **rôle**, **prérequis**, **étapes**, **attendu**, case **OK / KO / N/A**.  
Durée indicative totale Phase A+B : **½ journée** guidée + usage réel ensuite.

Légende résultats : `OK` · `KO` · `N/A` · `Partiel`

---

## Vague 1 — Fondations (obligatoire)

### UAT-01 — Connexion & rôles

| | |
|--|--|
| Rôle | ADMIN puis MANAGER |
| Prérequis | Accès dashboard |
| Étapes | 1. Login ADMIN + SKU<br>2. Parcourir le menu<br>3. Logout → login MANAGER<br>4. Vérifier absences d’écrans sensibles (paie / users selon droits) |
| Attendu | Menus cohérents ; pas d’erreur 500 à l’accueil |
| Résultat | ☐ |

### UAT-02 — Structure & employés

| | |
|--|--|
| Rôle | ADMIN |
| Étapes | 1. Ouvrir Branches<br>2. Ouvrir un employé (Patrick ou employé client)<br>3. Vérifier fiche identité / méthodes de pointage<br>4. (Optionnel) créer un employé test |
| Attendu | Libellés lisibles (pas d’UUID bruts) ; fiche complète |
| Résultat | ☐ |

### UAT-03 — Horaires & planning prévu

| | |
|--|--|
| Rôle | ADMIN |
| Étapes | 1. Ouvrir un type d’horaire (jours + fenêtres)<br>2. Vérifier affectation employé<br>3. Ouvrir **Planning prévu**<br>4. Contrôler qu’un jour sans affectation / hors `weekDays` n’affiche pas de travail |
| Attendu | Planning = affectation → jours horaire → heures (+ exceptions date si utilisées) |
| Résultat | ☐ |

### UAT-04 — Équipe du jour (manager)

| | |
|--|--|
| Rôle | MANAGER |
| Étapes | 1. Ouvrir **Équipe du jour**<br>2. Filtrer par statut<br>3. Comparer avec 1–2 employés connus |
| Attendu | Compteurs + liste compréhensibles |
| Résultat | ☐ |

---

## Vague 2 — Pointage (cœur produit)

### UAT-05 — Provision kiosk

| | |
|--|--|
| Rôle | ADMIN |
| Matériel | Tablette kiosk |
| Étapes | 1. Bootstrap + provision branche<br>2. Dashboard → kiosk ONLINE |
| Attendu | Appareil lié ; heartbeat OK |
| Résultat | ☐ |

### UAT-06 — Pointage PIN (socle minimal)

| | |
|--|--|
| Rôle | Employé terrain / testeur |
| Prérequis | PIN connu (démo Patrick `1234`) |
| Étapes | 1. Dans la fenêtre d’arrivée : CHECK_IN PIN<br>2. Avant fin de shift : tenter départ → doit être refusé / message clair<br>3. Après fin de shift : CHECK_OUT |
| Attendu | Événements visibles dashboard ; messages kiosk explicites |
| Résultat | ☐ |

### UAT-07 — Pointage visage (si activé)

| | |
|--|--|
| Prérequis | Enroll face sur fiche employé + face engine OK |
| Étapes | 1. Scan visage CHECK_IN<br>2. Vérifier log biométrique / événement FACE |
| Attendu | Match + pointage ; échec → message + éventuel fallback PIN |
| Résultat | ☐ N/A si hors scope |

### UAT-08 — Retard / absence (observation)

| | |
|--|--|
| Rôle | MANAGER |
| Étapes | 1. Simuler arrivée tardive **ou** observer cron / données seed<br>2. Vérifier retard / absence / inbox |
| Attendu | Anomalie visible côté manager (pas silencieuse) |
| Résultat | ☐ |

### UAT-09 — Inbox « À traiter »

| | |
|--|--|
| Rôle | MANAGER |
| Étapes | 1. Ouvrir inbox<br>2. Traiter 1 item (congés / claim / review) si dispo<br>3. Vérifier cloche notifications |
| Attendu | Action possible ; état mis à jour |
| Résultat | ☐ |

---

## Vague 3 — Self-service employé

### UAT-10 — Login app employé

| | |
|--|--|
| Compte démo | `patrick.mukendi@sotrafer.cg` |
| Étapes | Login → écran d’accueil contextuel |
| Attendu | État du jour + CTA clair |
| Résultat | ☐ |

### UAT-11 — Demande de congé

| | |
|--|--|
| Étapes | 1. Créer une demande<br>2. Manager approuve ou refuse<br>3. Employé voit le statut |
| Attendu | Bout en bout sans 500 |
| Résultat | ☐ |

### UAT-12 — QR borne (optionnel)

| | |
|--|--|
| Prérequis | Kiosk mode QR + app caméra |
| Étapes | Employé scanne le challenge affiché sur la borne |
| Attendu | Pointage enregistré (authMethod QR) |
| Résultat | ☐ N/A |

### UAT-13 — Reprise de pause (optionnel)

| | |
|--|--|
| Prérequis | Horaire avec fenêtre pause ; géoloc site |
| Étapes | Après plage pause : bouton reprise dans l’app |
| Attendu | `BREAK_END` ; bouton inactif hors site |
| Résultat | ☐ N/A |

---

## Vague 4 — Exploitation RH

### UAT-14 — Registre / timesheets / export

| | |
|--|--|
| Rôle | ADMIN ou MANAGER |
| Étapes | 1. Registre de présence période<br>2. Temps travaillé d’un employé<br>3. Export si disponible |
| Attendu | Données cohérentes avec pointages test |
| Résultat | ☐ |

### UAT-15 — Exceptions de planning (date)

| | |
|--|--|
| Rôle | ADMIN |
| Étapes | 1. Créer exception sur un horaire (off ou heures forcées)<br>2. Vérifier planning + comportement pointage si testé |
| Attendu | Exception appliquée à tous les employés de cet horaire |
| Résultat | ☐ N/A |

### UAT-16 — Abonnement / activate (si org dédiée)

| | |
|--|--|
| Rôle | ADMIN |
| Étapes | Voir `/subscriptions` ; si besoin `/activate` avec clé fournie |
| Attendu | Statut lisible (essai / actif) ; pas de blocage surprise |
| Résultat | ☐ N/A |

---

## Matrice de couverture minimale « Go »

Pour un pilote **web + PIN** (sans face/QR) : **UAT-01 à 06, 09, 10, 11, 14** doivent être `OK` ou `Partiel` accepté.

| ID | Statut | Commentaire testeur |
|----|--------|---------------------|
| UAT-01 | | |
| UAT-02 | | |
| UAT-03 | | |
| UAT-04 | | |
| UAT-05 | | |
| UAT-06 | | |
| UAT-07 | | |
| UAT-08 | | |
| UAT-09 | | |
| UAT-10 | | |
| UAT-11 | | |
| UAT-12 | | |
| UAT-13 | | |
| UAT-14 | | |
| UAT-15 | | |
| UAT-16 | | |

## Bugs : comment remonter

Pour chaque KO : **écran**, **compte**, **heure**, **étapes**, **attendu vs obtenu**, capture.  
Priorité : P0 (bloque pointage / login) · P1 (métier faux) · P2 (UX).

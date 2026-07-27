# Avant remise au pilote — checklist courte

Ordre recommandé **côté TimeGate** avant d’envoyer [`../remise-client/`](../remise-client/).

Détail technique : [02-staging-checklist.md](./02-staging-checklist.md) · Sécurité : [06-securite-remise.md](./06-securite-remise.md).

## 1. Périmètre Phase A

- [ ] Décider : **web only** (dashboard) d’abord, ou kiosk / app employé dès le jour 1
- [ ] Si kiosk/app reportés : le noter dans le périmètre / scénarios (cases N/A)

## 2. Staging API + données (bloqueur #1)

- [ ] API HTTPS up + `CORS_ORIGIN` = URL dashboard
- [ ] Migrations + seed (SOTR) **ou** org client dédiée
- [ ] Smoke login ADMIN + SKU → accueil OK
- [ ] (Bonus) `bun run test:use-cases` contre cet env

## 3. Fiche client

- [ ] Remplir [`../remise-client/03-acces.md`](../remise-client/03-acces.md) (URL, support, kickoff)
- [ ] Mot de passe : canal sécurisé séparé si possible
- [ ] Clarifier données démo SOTRAFER **ou** comptes dédiés

## 4. Smoke interne Go / No-Go

- [ ] ADMIN + MANAGER
- [ ] 1 fiche employé + planning / équipe du jour
- [ ] Si Phase B promise : 1 pointage PIN (sinon retirer / N/A)

## 5. Remise

- [ ] Envoyer **uniquement** `docs/pilot/remise-client/`
- [ ] Kickoff 45–60 min planifié
- [ ] Ne pas envoyer `interne/`, console, Swagger, API

## 6. Housekeeping repo (parallèle OK)

- [ ] Commit kit pilote + untrack `.env` + correctifs en attente
- [ ] Changer `ChangeMe123!` si l’env est déjà public

---

**Prêt à transmettre** quand 2 + 3 + 4 sont cochés.

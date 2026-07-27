# 06 — Sécurité & remise (obligatoire avant partage)

Checklist anti-fuite pour un pilote externe.

## Ne jamais envoyer au client

- [ ] Fichiers `.env` / `.env.local` (prod ou staging)
- [ ] Clé Firebase Admin (`*firebase-adminsdk*.json`)
- [ ] `google-services.json` / clés push prod
- [ ] Dump base avec données personnelles réelles non anonymisées (sauf accord)
- [ ] Accès console SUPER_ADMIN (sauf besoin SaaS explicite)
- [ ] Secrets JWT / AUTH_SECRET / clés R2 / SMTP prod

## Avant zip / repo / accès Git

- [ ] Vérifier `git ls-files '*.env'` → doit être vide (aujourd’hui `console/.env` et `kiosk-app/.env` sont trackés : **les retirer du tracking** et régénérer les secrets)
- [ ] Confirmer que `api/.gitignore` ignore le JSON Firebase Admin
- [ ] Pas de credentials dans captures d’écran de la doc remise
- [ ] Compte démo : changer `ChangeMe123!` si l’env est exposé hors équipe TimeGate

## Commandes utiles (TimeGate)

```bash
# Fichiers env encore trackés ?
git ls-files '*.env' '**/.env' '*adminsdk*' 'google-services.json'

# Retirer du index sans supprimer localement (exemple)
git rm --cached console/.env kiosk-app/.env
```

Puis commit dédié + rotation `AUTH_SECRET` / URL si besoin.

## Données personnelles & biométrie

- Informer le client : pointage facial = **données biométriques**.
- Prévoir notice employés + base légale (responsabilité **client** en tant que responsable de traitement).
- Staging : préférer **données fictives** (seed) ou employés volontaires informés.
- Rétention photos : configurable côté tenant (ne pas laisser illimitée en pilote).

## Accès réseau

- Préférer HTTPS partout.
- Restreindre staging (IP / VPN / mot de passe hébergeur).
- Désactiver ou limiter Swagger public si exposé Internet.

## Fin de pilote

- [ ] Révoquer comptes testeurs externes
- [ ] Suspendre ou détruire l’org staging client si demandée
- [ ] Archiver la feuille de retour
- [ ] Décider conservation logs / photos (purge)

## Contact incident sécurité

| | |
|--|--|
| Contact | ________________ |
| Délai de réaction cible | < 4 h ouvrées |

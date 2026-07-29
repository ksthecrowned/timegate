import BrandLogo from '@/components/brand/BrandLogo'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — TimeGate',
  description:
    'Politique de confidentialité de TimeGate : traitement des données personnelles, biométrie, applications et droits des personnes.',
  robots: { index: true, follow: true },
}

const LAST_UPDATED = '29 juillet 2026'

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {children}
      </div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface text-slate-800 dark:bg-surface-dark dark:text-slate-100">
      <header className="border-b border-slate-200/80 bg-surface-card dark:border-slate-700/80 dark:bg-surface-card-dark">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/login" className="inline-flex items-center gap-3" aria-label="TimeGate">
            <BrandLogo variant="full" tone="on-light" className="max-h-10 max-w-[180px]" priority />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline dark:text-primary"
          >
            Connexion
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          Document brouillon à faire valider par un conseil juridique avant publication
          définitive. Les mentions entre crochets ([…]) doivent être complétées (raison
          sociale, adresse, contact).
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Politique de confidentialité
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Dernière mise à jour : {LAST_UPDATED}
        </p>

        <div className="mt-10 space-y-10">
          <Section id="qui" title="1. Qui sommes-nous ?">
            <p>
              La présente politique décrit la manière dont{' '}
              <strong>[Raison sociale TimeGate]</strong> (« TimeGate », « nous ») traite
              les données personnelles dans le cadre de la solution TimeGate (pointage,
              présence, RH et applications associées).
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Éditeur / responsable des traitements liés au service SaaS :{' '}
                <strong>[Raison sociale]</strong>, <strong>[forme juridique]</strong>,{' '}
                <strong>[adresse du siège]</strong>
              </li>
              <li>
                Contact confidentialité :{' '}
                <a
                  className="text-primary underline-offset-2 hover:underline"
                  href="mailto:kaiserstyve2@gmail.com"
                >
                  kaiserstyve2@gmail.com
                </a>{' '}
                <span className="text-slate-500">(provisoire — à remplacer)</span>
              </li>
            </ul>
          </Section>

          <Section id="roles" title="2. Rôles : responsable et sous-traitant">
            <p>
              TimeGate est une solution B2B multi-organisations. Selon le contexte :
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Organisation cliente</strong> (employeur) : en principe{' '}
                <em>responsable de traitement</em> pour les données de ses salariés
                (identité, planning, pointages, biométrie le cas échéant). Elle définit
                les finalités et la base légale côté emploi.
              </li>
              <li>
                <strong>TimeGate</strong> : en principe <em>sous-traitant</em> pour ces
                données RH / présence, et agit sur instruction documentée du client
                (contrat / conditions d’utilisation).
              </li>
              <li>
                TimeGate peut être <em>responsable de traitement</em> pour les données
                liées à la relation commerciale (comptes administrateurs du service,
                facturation, support, logs techniques de plateforme).
              </li>
            </ul>
            <p>
              Les salariés doivent également consulter la notice d’information fournie
              par leur employeur concernant le pointage et, le cas échéant, la
              reconnaissance faciale.
            </p>
          </Section>

          <Section id="perimetre" title="3. Périmètre des services">
            <p>Cette politique couvre notamment :</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>le tableau de bord web administrateur / RH (dashboard) ;</li>
              <li>l’application mobile employé (consultation, congés, pointage assisté) ;</li>
              <li>l’application kiosk de pointage (y compris vérification faciale) ;</li>
              <li>l’API TimeGate et les services d’infrastructure associés.</li>
            </ul>
          </Section>

          <Section id="donnees" title="4. Données traitées">
            <p>Selon les modules activés par l’organisation, nous pouvons traiter :</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Identité et compte</strong> : nom, prénom, e-mail, identifiants
                de connexion, rôle, organisation, éventuel SKU / code organisation.
              </li>
              <li>
                <strong>Données RH et présence</strong> : affectations, planning,
                pointages, absences, retards, congés, types de contrat, informations
                salariales si le module est utilisé (accès restreint selon les rôles).
              </li>
              <li>
                <strong>Données biométriques / images</strong> : modèles ou templates
                faciaux et/ou images de vérification capturées via le kiosk, utilisés
                pour authentifier le pointage. Il s’agit de données sensibles ; leur
                usage relève en premier lieu de l’employeur et d’une base légale adaptée.
              </li>
              <li>
                <strong>Appareils et sécurité</strong> : jetons d’appareils de confiance,
                identifiants de kiosk, journaux de reconnaissance, adresses IP et
                métadonnées techniques raisonnablement nécessaires à la sécurité.
              </li>
              <li>
                <strong>Notifications</strong> : jetons push (Firebase Cloud Messaging /
                Expo) pour les alertes configurées par l’organisation.
              </li>
              <li>
                <strong>Support et usage plateforme</strong> : échanges avec le support,
                logs applicatifs, métriques d’usage agrégées.
              </li>
            </ul>
          </Section>

          <Section id="finalites" title="5. Finalités">
            <ul className="list-disc space-y-1 pl-5">
              <li>fournir et sécuriser le service de pointage et de gestion RH ;</li>
              <li>vérifier l’identité au pointage (y compris reconnaissance faciale) ;</li>
              <li>permettre la gestion des plannings, congés, absences et exports ;</li>
              <li>envoyer des notifications liées au service ;</li>
              <li>assurer le support, la maintenance, la prévention de la fraude et des abus ;</li>
              <li>respecter nos obligations légales et faire valoir nos droits.</li>
            </ul>
          </Section>

          <Section id="bases" title="6. Bases légales">
            <p>
              Selon le rôle (responsable / sous-traitant) et la législation applicable
              (ex. RGPD si applicable, ou droit local) :
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>exécution du contrat de service avec le client ;</li>
              <li>
                intérêts légitimes (sécurité de la plateforme, amélioration du service,
                prévention des abus) — lorsqu’ils sont applicables et proportionnés ;
              </li>
              <li>obligations légales ;</li>
              <li>
                pour la biométrie côté employeur : base légale propre à l’organisation
                cliente (souvent consentement ou autre fondement prévu par le droit du
                travail / la réglementation locale) — TimeGate ne se substitue pas à
                cette analyse.
              </li>
            </ul>
          </Section>

          <Section id="partage" title="7. Destinataires et sous-traitants">
            <p>Les données peuvent être accessibles à :</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>les utilisateurs autorisés de l’organisation (admin, managers, RH) ;</li>
              <li>l’équipe TimeGate, dans la limite du besoin (support, exploitation) ;</li>
              <li>
                des prestataires techniques (hébergement cloud, stockage d’objets type
                Cloudflare R2, notifications push Firebase / Expo, e-mail transactionnel)
                agissant selon nos instructions.
              </li>
            </ul>
            <p>
              Nous ne vendons pas les données personnelles. Un transfert vers une
              autorité n’intervient que si la loi l’exige.
            </p>
          </Section>

          <Section id="conservation" title="8. Durées de conservation">
            <p>
              Les durées sont définies avec le client et/ou dans la configuration du
              tenant (ex. rétention des photos / logs de reconnaissance). En l’absence
              d’instruction spécifique :
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                données de compte et d’organisation : durée de la relation contractuelle,
                puis archivage / suppression selon les délais légaux ;
              </li>
              <li>
                données de présence et RH : selon les besoins du client et obligations
                sociales / comptables ;
              </li>
              <li>
                données biométriques et images de vérification : durée limitée au besoin
                du pointage et à la politique de rétention du tenant ;
              </li>
              <li>logs techniques : durée limitée nécessaire à la sécurité et au diagnostic.</li>
            </ul>
          </Section>

          <Section id="securite" title="9. Sécurité">
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles
              appropriées : contrôle d’accès par rôles, authentification, chiffrement en
              transit (HTTPS), cloisonnement multi-tenant, journalisation, et principes
              de moindre privilège. Aucune mesure ne garantit une sécurité absolue ;
              signalez tout incident suspect au contact indiqué ci-dessus.
            </p>
          </Section>

          <Section id="droits" title="10. Vos droits">
            <p>
              Selon la loi applicable, vous pouvez disposer de droits d’accès,
              rectification, effacement, limitation, opposition, portabilité, et du droit
              d’introduire une réclamation auprès d’une autorité de protection des
              données.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Salariés</strong> : adressez-vous en priorité à votre employeur
                (responsable de traitement) ; TimeGate relayera les demandes relevant du
                sous-traitement.
              </li>
              <li>
                <strong>Clients / administrateurs de compte</strong> : contactez-nous à
                l’adresse indiquée en section 1.
              </li>
            </ul>
          </Section>

          <Section id="cookies" title="11. Cookies et stockage local">
            <p>
              Le dashboard utilise des cookies ou un stockage local nécessaires à la
              session d’authentification et aux préférences (ex. thème clair / sombre).
              Ces éléments ne sont pas utilisés pour de la publicité comportementale
              tierce. Les applications mobiles peuvent stocker des jetons de session et
              de notification sur l’appareil.
            </p>
          </Section>

          <Section id="transferts" title="12. Transferts internationaux">
            <p>
              Selon l’hébergement et les prestataires retenus, des données peuvent être
              traitées hors du pays de l’organisation cliente. Lorsque la réglementation
              l’exige, des garanties appropriées (clauses contractuelles types, etc.)
              sont mises en place. Détails disponibles sur demande :{' '}
              <strong>[compléter la région d’hébergement principale]</strong>.
            </p>
          </Section>

          <Section id="mineurs" title="13. Mineurs">
            <p>
              Le service s’adresse à des professionnels et aux salariés des
              organisations clientes. Il n’est pas destiné aux enfants.
            </p>
          </Section>

          <Section id="modifications" title="14. Modifications">
            <p>
              Nous pouvons mettre à jour cette politique pour refléter l’évolution du
              produit ou de la réglementation. La date de « dernière mise à jour »
              sera révisée en tête de page. En cas de changement substantiel, nous
              informerons les clients par un canal raisonnable (e-mail ou notification
              in-app).
            </p>
          </Section>

          <Section id="contact" title="15. Contact">
            <p>
              Pour toute question relative à la présente politique :{' '}
              <a
                className="text-primary underline-offset-2 hover:underline"
                href="mailto:kaiserstyve2@gmail.com"
              >
                kaiserstyve2@gmail.com
              </a>
              .
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              Adresse postale : <strong>[Adresse complète]</strong>
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 py-8 text-center text-xs text-slate-500 dark:border-slate-700/80 dark:text-slate-400">
        <p>© {new Date().getFullYear()} TimeGate. Tous droits réservés.</p>
        <p className="mt-1">
          <Link href="/login" className="hover:text-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </footer>
    </div>
  )
}

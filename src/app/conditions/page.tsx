import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Conditions générales d'utilisation et de vente",
  description:
    "Conditions générales d'utilisation et de vente de PebbleDrop : compte, achats, cailloux virtuels, données personnelles, engagement caritatif.",
};

// Date de dernière mise à jour des présentes conditions.
const MAJ = "18 juillet 2026";

// Associations pouvant être tirées au sort pour le reversement (article 12).
// Toutes acceptent les dons en ligne par carte bancaire, virement immédiat.
const ASSOCIATIONS = [
  "Les Restos du Cœur",
  "La Croix-Rouge française",
  "Le Secours Populaire Français",
  "Médecins Sans Frontières (MSF)",
  "Action contre la Faim",
  "La Fondation Abbé Pierre",
  "UNICEF France",
  "La Société Protectrice des Animaux (SPA)",
  "L'Institut Pasteur",
  "WWF France",
];

function Art({
  n,
  titre,
  children,
}: {
  n: number;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section id={`art-${n}`} style={{ marginTop: 34, scrollMarginTop: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", color: "#17251c" }}>
        Article {n} — {titre}
      </h2>
      <div style={{ fontSize: 15, lineHeight: 1.7, color: "#2e3f34", display: "grid", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

const SOMMAIRE = [
  "Objet et champ d'application",
  "Définitions",
  "Acceptation des conditions",
  "Accès au Service",
  "Création et gestion du compte",
  "Règles de conduite et contenus interdits",
  "Contenus publiés par les Utilisateurs",
  "Modération, avertissement et bannissement",
  "Nature juridique des Cailloux et des Objets",
  "Commandes, prix et paiement",
  "Droit de rétractation",
  "Engagement caritatif",
  "Disponibilité, évolutions et interruptions",
  "Propriété intellectuelle",
  "Données personnelles",
  "Cookies et traceurs",
  "Responsabilité de l'Éditeur",
  "Force majeure",
  "Durée, résiliation et suppression du compte",
  "Modification des présentes conditions",
  "Réclamations et médiation de la consommation",
  "Droit applicable et juridiction compétente",
  "Contact",
];

export default function ConditionsPage() {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Logo size={28} />
        </Link>
        <Link href="/" className="pd-btn" style={{ textDecoration: "none" }}>← Retour</Link>
      </div>

      <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 6px", color: "#17251c" }}>
        Conditions générales d&apos;utilisation et de vente
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Dernière mise à jour : {MAJ}
      </p>

      <div className="pd-panel" style={{ padding: 16, margin: "18px 0", background: "var(--panel-2)" }}>
        <strong>À lire avant d&apos;acheter.</strong> Les points les plus importants :
        les cailloux et objets achetés sont des <strong>contenus numériques sans valeur
        monétaire</strong>, non remboursables en argent et non revendables (article 9) ;
        en achetant, vous demandez leur mise à disposition immédiate et
        <strong> renoncez à votre droit de rétractation</strong> (article 11) ;
        <strong> l&apos;argent des achats est reversé à une association caritative</strong> (article 12).
      </div>

      {/* Sommaire */}
      <nav className="pd-panel" style={{ padding: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Sommaire</div>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9, columns: 2, columnGap: 24 }}>
          {SOMMAIRE.map((t, i) => (
            <li key={t}>
              <a href={`#art-${i + 1}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                {t}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Art n={1} titre="Objet et champ d'application">
        <p>
          Les présentes conditions générales d&apos;utilisation et de vente (ci-après les
          « Conditions ») régissent l&apos;accès au site PebbleDrop et son utilisation, ainsi
          que les achats de contenus numériques effectués sur celui-ci.
        </p>
        <p>
          PebbleDrop est un service de divertissement en ligne permettant à ses utilisateurs
          de placer des éléments graphiques (les « Cailloux ») sur une grille partagée,
          d&apos;y associer un message ou un lien, et d&apos;acquérir des contenus numériques
          destinés à enrichir cette activité.
        </p>
        <p>
          Les présentes Conditions constituent l&apos;intégralité de l&apos;accord entre
          l&apos;Éditeur et l&apos;Utilisateur concernant le Service. Elles prévalent sur tout
          autre document, sauf conditions particulières expressément acceptées par écrit.
        </p>
      </Art>

      <Art n={2} titre="Définitions">
        <p>Dans les présentes Conditions, les termes suivants ont la signification indiquée :</p>
        <ul style={{ paddingLeft: 20, display: "grid", gap: 6 }}>
          <li><strong>Éditeur</strong> : la personne physique ou morale qui exploite le Service.</li>
          <li><strong>Service</strong> ou <strong>Site</strong> : le site PebbleDrop, ses pages, fonctionnalités et interfaces.</li>
          <li><strong>Utilisateur</strong> : toute personne accédant au Service, avec ou sans compte.</li>
          <li><strong>Compte</strong> : l&apos;espace personnel créé par un Utilisateur inscrit.</li>
          <li><strong>Caillou</strong> : unité virtuelle permettant d&apos;occuper une case de la grille. Le terme désigne aussi le crédit consommé lors de cette action.</li>
          <li><strong>Objet</strong> : contenu numérique complémentaire (pioche, masse, dynamite, mousse protectrice, pierre rare, badge, titre, couleur de pseudonyme, etc.).</li>
          <li><strong>Contenu Utilisateur</strong> : tout élément publié par un Utilisateur, notamment pseudonyme, message de chat, texte ou lien associé à un Caillou.</li>
          <li><strong>Grille</strong> ou <strong>Clairière</strong> : l&apos;espace partagé de 1 000 × 1 000 cases sur lequel les Cailloux sont posés.</li>
        </ul>
      </Art>

      <Art n={3} titre="Acceptation des conditions">
        <p>
          La création d&apos;un Compte suppose l&apos;acceptation expresse et sans réserve des
          présentes Conditions, matérialisée par la case à cocher prévue lors de
          l&apos;inscription. Cette acceptation est enregistrée avec sa date.
        </p>
        <p>
          L&apos;Utilisateur qui n&apos;accepte pas les présentes Conditions ne peut pas créer de
          Compte ni effectuer d&apos;achat. La simple consultation de la Grille en mode visiteur
          emporte acceptation des articles applicables à la consultation.
        </p>
        <p>
          L&apos;Utilisateur déclare avoir la capacité juridique de contracter. Les mineurs ne
          peuvent effectuer d&apos;achat qu&apos;avec l&apos;autorisation préalable du titulaire de
          l&apos;autorité parentale, lequel est réputé accepter les présentes Conditions.
        </p>
      </Art>

      <Art n={4} titre="Accès au Service">
        <p>
          La consultation de la Grille est libre et gratuite, sans création de compte. Les
          fonctionnalités de pose de Cailloux, de chat et d&apos;achat nécessitent un Compte.
        </p>
        <p>
          L&apos;accès au Service requiert une connexion internet et un navigateur récent, dont
          le coût et le bon fonctionnement demeurent à la charge de l&apos;Utilisateur.
        </p>
      </Art>

      <Art n={5} titre="Création et gestion du compte">
        <p>
          Le Compte est créé soit par un fournisseur d&apos;identité tiers (Google, Microsoft,
          Apple), soit par la saisie d&apos;une adresse électronique et d&apos;un mot de passe.
        </p>
        <p>
          L&apos;Utilisateur s&apos;engage à fournir des informations exactes et à les maintenir à
          jour. Un seul Compte par personne est autorisé, sauf accord de l&apos;Éditeur.
        </p>
        <p>
          L&apos;Utilisateur est seul responsable de la confidentialité de ses identifiants et de
          toute activité réalisée depuis son Compte. Il informe sans délai l&apos;Éditeur de toute
          utilisation non autorisée.
        </p>
        <p>
          À l&apos;inscription, un montant de dix (10) Cailloux est crédité gratuitement. Une
          récompense quotidienne et un dispositif de parrainage peuvent créditer des Cailloux
          supplémentaires, selon les modalités affichées dans le Service et modifiables à tout moment.
        </p>
      </Art>

      <Art n={6} titre="Règles de conduite et contenus interdits">
        <p>L&apos;Utilisateur s&apos;interdit notamment :</p>
        <ul style={{ paddingLeft: 20, display: "grid", gap: 5 }}>
          <li>de publier des contenus illicites, notamment injurieux, diffamatoires, haineux, racistes, sexistes, homophobes, négationnistes ou incitant à la violence ;</li>
          <li>de publier des contenus pornographiques ou préjudiciables aux mineurs ;</li>
          <li>de porter atteinte aux droits de tiers, notamment aux droits de propriété intellectuelle, au droit à l&apos;image ou à la vie privée ;</li>
          <li>de publier des données personnelles concernant un tiers ;</li>
          <li>de diffuser des liens vers des contenus illicites, des logiciels malveillants ou des sites d&apos;hameçonnage ;</li>
          <li>de recourir à des automatisations (robots, scripts) pour interagir avec le Service ;</li>
          <li>de tenter d&apos;accéder sans autorisation à des parties du Service, d&apos;en perturber le fonctionnement ou d&apos;en contourner les limitations ;</li>
          <li>d&apos;exploiter une faille, une erreur d&apos;affichage ou de comptabilisation à son avantage ;</li>
          <li>de revendre, échanger ou céder à titre onéreux un Compte, des Cailloux ou des Objets ;</li>
          <li>d&apos;usurper l&apos;identité d&apos;un tiers ou de se présenter faussement comme membre de l&apos;équipe du Service.</li>
        </ul>
        <p>
          Les liens associés aux Cailloux doivent pointer vers des ressources licites. Seuls les
          protocoles <code>http</code> et <code>https</code> sont acceptés.
        </p>
      </Art>

      <Art n={7} titre="Contenus publiés par les Utilisateurs">
        <p>
          L&apos;Utilisateur demeure titulaire des droits sur ses Contenus. Il concède à
          l&apos;Éditeur, à titre gratuit et pour la durée d&apos;exploitation du Service, une
          licence non exclusive de reproduction et de représentation de ces Contenus, aux seules
          fins de leur affichage dans le Service et de la promotion de celui-ci.
        </p>
        <p>
          L&apos;Utilisateur garantit détenir les droits nécessaires sur les Contenus qu&apos;il
          publie et garantit l&apos;Éditeur contre toute réclamation de tiers à ce titre.
        </p>
        <p>
          L&apos;Éditeur agit en qualité d&apos;hébergeur au sens de la LCEN s&apos;agissant des
          Contenus Utilisateur. Il n&apos;est pas soumis à une obligation générale de
          surveillance, mais retire promptement tout contenu manifestement illicite qui lui est
          signalé. Un signalement peut être effectué depuis l&apos;interface du Service ou à
          l&apos;adresse indiquée à l&apos;article 23.
        </p>
      </Art>

      <Art n={8} titre="Modération, avertissement et bannissement">
        <p>
          L&apos;Éditeur peut, en cas de manquement aux présentes Conditions : supprimer un
          Contenu, retirer un ou plusieurs Cailloux, restreindre l&apos;accès au chat, suspendre
          ou supprimer un Compte.
        </p>
        <p>
          <strong>Le bannissement d&apos;un Compte entraîne la suppression de l&apos;ensemble des
          Cailloux posés par ce Compte sur la Grille</strong>, ainsi que la perte des Cailloux et
          Objets non consommés, sans indemnité, lorsque le bannissement est justifié par un
          manquement caractérisé.
        </p>
        <p>
          Les mesures sont proportionnées à la gravité du manquement. L&apos;Utilisateur peut
          contester une mesure à l&apos;adresse figurant à l&apos;article 23 ; l&apos;Éditeur
          répond dans un délai raisonnable.
        </p>
      </Art>

      <Art n={9} titre="Nature juridique des Cailloux et des Objets">
        <p>
          Les Cailloux et Objets sont des <strong>contenus numériques à usage strictement
          ludique et interne au Service</strong>. Ils ne constituent ni une monnaie, ni un moyen
          de paiement, ni un instrument financier, ni un titre de propriété.
        </p>
        <p>
          Ils <strong>n&apos;ont aucune valeur monétaire</strong>, ne sont pas convertibles en
          argent, ne peuvent être ni remboursés en numéraire, ni revendus, ni échangés contre
          des biens ou services extérieurs au Service.
        </p>
        <p>
          L&apos;Utilisateur ne dispose sur les Cailloux et Objets que d&apos;un droit
          d&apos;usage personnel, non exclusif et non transférable, dans le cadre du Service et
          pour la durée de son exploitation.
        </p>
        <p>
          Une case occupée est verrouillée : aucun autre Utilisateur ne peut y poser un Caillou.
          Elle peut toutefois être libérée au moyen des Objets prévus à cet effet, dans les
          conditions décrites dans le Service, ou par une mesure de modération.
        </p>
      </Art>

      <Art n={10} titre="Commandes, prix et paiement">
        <p>
          Les prix sont indiqués en euros, toutes taxes comprises le cas échéant, sur la page
          Boutique. Le prix applicable est celui affiché au moment de la validation de la commande.
        </p>
        <p>
          Le paiement est réalisé exclusivement par l&apos;intermédiaire du prestataire Stripe.
          L&apos;Éditeur n&apos;a accès à aucune donnée de carte bancaire, celles-ci étant
          collectées et traitées directement par Stripe.
        </p>
        <p>
          Les Cailloux et Objets sont crédités sur le Compte après confirmation du paiement par
          Stripe. En cas d&apos;échec du paiement, aucun contenu n&apos;est crédité.
        </p>
        <p>
          Le contenu des coffres et sacs surprise est déterminé aléatoirement au moment de
          l&apos;achat, selon des probabilités fixées par l&apos;Éditeur. L&apos;Utilisateur
          reconnaît en être informé avant l&apos;achat.
        </p>
        <p>
          Un justificatif est mis à disposition dans l&apos;historique d&apos;achat du Compte.
        </p>
      </Art>

      <Art n={11} titre="Droit de rétractation">
        <div style={{ background: "#fff8e6", border: "1px solid #c9922a", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: 0 }}>
            <strong>Information importante.</strong> Conformément à l&apos;article L221-28, 13°
            du Code de la consommation, le droit de rétractation ne peut être exercé pour la
            fourniture d&apos;un contenu numérique non fourni sur support matériel dont
            l&apos;exécution a commencé après accord préalable exprès du consommateur et renoncement
            exprès à son droit de rétractation.
          </p>
        </div>
        <p>
          En validant sa commande, l&apos;Utilisateur <strong>demande expressément
          l&apos;exécution immédiate</strong> de la fourniture des Cailloux ou Objets et
          <strong> renonce expressément à son droit de rétractation</strong> de quatorze (14) jours.
        </p>
        <p>
          En conséquence, aucun remboursement ne peut être exigé pour un contenu numérique
          effectivement crédité. Cette renonciation ne prive pas l&apos;Utilisateur des garanties
          légales, notamment en cas de contenu non délivré ou non conforme.
        </p>
        <p>
          En cas de contenu payé mais non crédité du fait d&apos;un dysfonctionnement, l&apos;Éditeur
          procède, au choix de l&apos;Utilisateur, au crédit du contenu ou au remboursement.
        </p>
      </Art>

      {/* ─────────── ENGAGEMENT CARITATIF ─────────── */}
      <Art n={12} titre="Engagement caritatif">
        <div style={{ background: "#f4f9f1", border: "2px solid var(--accent)", borderRadius: 12, padding: 16 }}>
          <p style={{ margin: 0, fontSize: 16 }}>
            <strong>L&apos;Éditeur s&apos;engage à reverser l&apos;argent des achats réalisés
            sur le Site</strong> à une
            association caritative.
          </p>
        </div>
        <p>
          <strong>Assiette.</strong> Le reversement porte sur les sommes effectivement
          encaissées, c&apos;est-à-dire hors paiements échoués, impayés et sommes remboursées.
        </p>
        <p>
          <strong>Périodicité.</strong> Le versement est effectué trimestriellement, dans les
          trente (30) jours suivant la fin de chaque trimestre civil. Si le montant dû est
          inférieur à dix (10) euros, il est reporté au trimestre suivant afin d&apos;éviter des
          frais de transfert disproportionnés.
        </p>
        <p>
          <strong>Choix du bénéficiaire.</strong> L&apos;association bénéficiaire est sélectionnée
          de manière aléatoire, pour chaque période, parmi la liste suivante :
        </p>
        <ul style={{ paddingLeft: 20, display: "grid", gap: 3 }}>
          {ASSOCIATIONS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p>
          Cette liste peut être modifiée, notamment si une association cesse d&apos;accepter les
          dons en ligne. Toute modification prend effet pour les périodes à venir.
        </p>
        <p>
          <strong>Absence de partenariat.</strong> PebbleDrop n&apos;est ni affilié, ni partenaire,
          ni parrainé, ni soutenu par les associations mentionnées. Leur citation a pour seul
          objet d&apos;identifier les bénéficiaires possibles du reversement et ne constitue ni
          une recommandation de leur part, ni une collecte de fonds effectuée pour leur compte.
        </p>
        <p>
          <strong>Nature du versement.</strong> Le reversement est effectué par l&apos;Éditeur en
          son nom propre. L&apos;Utilisateur n&apos;effectue pas de don : il achète un contenu
          numérique. Il ne peut donc bénéficier d&apos;aucune réduction d&apos;impôt ni recevoir
          de reçu fiscal à ce titre.
        </p>
        <p>
          <strong>Justification.</strong> Les justificatifs de versement sont conservés par
          l&apos;Éditeur et peuvent être communiqués sur demande à l&apos;adresse figurant à
          l&apos;article 23.
        </p>
      </Art>

      <Art n={13} titre="Disponibilité, évolutions et interruptions">
        <p>
          L&apos;Éditeur s&apos;efforce d&apos;assurer la disponibilité du Service, sans y être
          tenu de manière continue. Le Service peut être interrompu pour maintenance, mise à
          jour, ou pour des raisons techniques ou de sécurité.
        </p>
        <p>
          L&apos;Éditeur peut faire évoluer les fonctionnalités, l&apos;équilibrage du jeu, la
          liste des Objets et leurs effets, sans que ces évolutions ouvrent droit à indemnité.
        </p>
        <p>
          En cas de cessation définitive du Service, l&apos;Éditeur en informe les Utilisateurs
          par tout moyen approprié dans un délai raisonnable. Les Cailloux et Objets non
          consommés ne donnent lieu à aucun remboursement, sauf disposition légale contraire.
        </p>
      </Art>

      <Art n={14} titre="Propriété intellectuelle">
        <p>
          Le Service, sa charte graphique, ses textes, son code source, sa dénomination et son
          logo sont protégés par le droit de la propriété intellectuelle et demeurent la
          propriété exclusive de l&apos;Éditeur ou de ses concédants.
        </p>
        <p>
          Toute reproduction, représentation ou adaptation, totale ou partielle, sans
          autorisation préalable écrite, est interdite. L&apos;export d&apos;images de la Grille
          proposé par le Service est autorisé pour un usage personnel et non commercial.
        </p>
      </Art>

      <Art n={15} titre="Données personnelles">
        <p>
          L&apos;Éditeur traite les données personnelles conformément au Règlement (UE) 2016/679
          (RGPD) et à la loi Informatique et Libertés.
        </p>
        <p><strong>Données traitées :</strong></p>
        <ul style={{ paddingLeft: 20, display: "grid", gap: 4 }}>
          <li>identification : adresse électronique, pseudonyme, mot de passe (stocké sous forme chiffrée irréversible), photo de profil transmise par le fournisseur d&apos;identité ;</li>
          <li>utilisation : Cailloux posés et leurs coordonnées, contenus publiés, niveau, expérience, succès, connexions récentes ;</li>
          <li>transactions : historique des achats, montants, statut, référence de paiement ;</li>
          <li>techniques : adresse IP (à des fins de sécurité et de limitation d&apos;abus), journaux de connexion.</li>
        </ul>
        <p><strong>Finalités et bases légales :</strong></p>
        <ul style={{ paddingLeft: 20, display: "grid", gap: 4 }}>
          <li>fourniture du Service et gestion du Compte — exécution du contrat ;</li>
          <li>traitement des achats et obligations comptables — exécution du contrat et obligation légale ;</li>
          <li>sécurité, prévention de la fraude et des abus — intérêt légitime ;</li>
          <li>modération des contenus — obligation légale et intérêt légitime.</li>
        </ul>
        <p><strong>Destinataires :</strong> Vercel (hébergement), Neon (base de données), Stripe
          (paiements), et le cas échéant Google, Microsoft ou Apple pour l&apos;authentification.
          Aucune donnée n&apos;est vendue à des tiers.</p>
        <p><strong>Durée de conservation :</strong> les données du Compte sont conservées tant
          que le Compte existe, puis supprimées ou anonymisées. Les documents comptables sont
          conservés dix (10) ans conformément à la loi.</p>
        <p>
          <strong>Vos droits :</strong> accès, rectification, effacement, limitation, opposition
          et portabilité. Ils s&apos;exercent à l&apos;adresse indiquée à l&apos;article 23. Une
          fonction de suppression du Compte est également disponible depuis le profil. Vous
          pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).
        </p>
      </Art>

      <Art n={16} titre="Cookies et traceurs">
        <p>
          Le Service utilise uniquement des cookies strictement nécessaires à son fonctionnement,
          notamment le cookie de session permettant de maintenir l&apos;Utilisateur connecté.
          Ces cookies sont exemptés de consentement préalable.
        </p>
        <p>
          Certaines préférences (sons, vibrations, affichage de la grille, couleurs récentes)
          sont enregistrées localement dans le navigateur et ne sont transmises à aucun serveur.
        </p>
        <p>
          Aucun cookie publicitaire ni traceur de mesure d&apos;audience tiers n&apos;est déposé
          à la date de dernière mise à jour des présentes Conditions.
        </p>
      </Art>

      <Art n={17} titre="Responsabilité de l'Éditeur">
        <p>
          L&apos;Éditeur est tenu d&apos;une obligation de moyens. Il ne saurait être tenu
          responsable des dommages résultant d&apos;une utilisation non conforme du Service,
          d&apos;une défaillance du réseau ou du matériel de l&apos;Utilisateur, ou du fait
          d&apos;un tiers.
        </p>
        <p>
          L&apos;Éditeur n&apos;exerce aucun contrôle éditorial a priori sur les liens publiés par
          les Utilisateurs et décline toute responsabilité quant au contenu des sites tiers vers
          lesquels ils renvoient.
        </p>
        <p>
          Aucune stipulation des présentes ne saurait limiter la responsabilité de
          l&apos;Éditeur en cas de dol, de faute lourde, de dommage corporel, ni écarter les
          garanties légales de conformité applicables aux consommateurs.
        </p>
      </Art>

      <Art n={18} titre="Force majeure">
        <p>
          Aucune partie n&apos;est responsable d&apos;un manquement résultant d&apos;un événement
          de force majeure au sens de l&apos;article 1218 du Code civil, notamment interruption
          généralisée des réseaux, défaillance d&apos;un prestataire technique essentiel, ou
          décision d&apos;une autorité publique.
        </p>
      </Art>

      <Art n={19} titre="Durée, résiliation et suppression du compte">
        <p>
          Les présentes Conditions s&apos;appliquent pendant toute la durée d&apos;utilisation du
          Service.
        </p>
        <p>
          L&apos;Utilisateur peut supprimer son Compte à tout moment, sans motif, depuis son
          profil. La suppression entraîne la perte définitive des Cailloux et Objets non
          consommés, sans remboursement, l&apos;Utilisateur en étant informé au préalable.
        </p>
        <p>
          L&apos;Éditeur peut résilier le Compte en cas de manquement grave ou répété aux
          présentes Conditions, dans les conditions de l&apos;article 8.
        </p>
      </Art>

      <Art n={20} titre="Modification des présentes conditions">
        <p>
          L&apos;Éditeur peut modifier les présentes Conditions, notamment pour tenir compte
          d&apos;évolutions légales ou fonctionnelles. La version applicable est celle en ligne
          au jour de l&apos;utilisation ou de la commande.
        </p>
        <p>
          Toute modification substantielle est portée à la connaissance des Utilisateurs par tout
          moyen approprié. La poursuite de l&apos;utilisation du Service après information vaut
          acceptation. L&apos;Utilisateur qui refuse peut supprimer son Compte.
        </p>
      </Art>

      <Art n={21} titre="Réclamations et médiation de la consommation">
        <p>
          Toute réclamation doit être adressée à l&apos;Éditeur à l&apos;adresse figurant à
          l&apos;article 23. L&apos;Éditeur s&apos;efforce d&apos;y répondre dans un délai
          raisonnable.
        </p>
        <p>
          Conformément aux articles L611-1 et suivants du Code de la consommation, le
          consommateur peut recourir gratuitement à un médiateur de la consommation en vue de la
          résolution amiable d&apos;un litige. Les coordonnées du médiateur compétent sont
          communiquées sur simple demande à l&apos;adresse de contact.
        </p>
        <p>
          La plateforme européenne de règlement en ligne des litiges est accessible à
          l&apos;adresse : ec.europa.eu/consumers/odr.
        </p>
      </Art>

      <Art n={22} titre="Droit applicable et juridiction compétente">
        <p>Les présentes Conditions sont soumises au droit français.</p>
        <p>
          À défaut de résolution amiable, le litige sera porté devant les juridictions
          françaises compétentes. Le consommateur peut saisir, à son choix, la juridiction du
          lieu de son domicile ou celle du lieu d&apos;exécution de la prestation.
        </p>
      </Art>

      <Art n={23} titre="Contact">
        <p>
          Pour toute question relative aux présentes Conditions, au Service, à l&apos;exercice
          des droits sur les données personnelles, à un signalement de contenu ou à une demande
          de justificatif de reversement, l&apos;Utilisateur peut écrire à l&apos;adresse de
          contact de l&apos;Éditeur, communiquée dans le Service.
        </p>
      </Art>

      <div className="pd-panel" style={{ padding: 16, marginTop: 34, background: "var(--panel-2)", fontSize: 13.5, color: "var(--muted)" }}>
        <strong>Avertissement.</strong> Ce document constitue une base sérieuse et complète,
        mais il ne remplace pas l&apos;examen par un professionnel du droit.
      </div>

      <div style={{ textAlign: "center", marginTop: 26 }}>
        <Link href="/register" className="pd-btn pd-btn-primary" style={{ textDecoration: "none" }}>
          Créer mon compte
        </Link>
      </div>
    </div>
  );
}

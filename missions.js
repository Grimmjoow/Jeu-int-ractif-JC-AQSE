// 4 jeux séquentiels — 25 XP chacun (total 100)
const missions = [
  {
    // Jeu 1 : Brainstorm + Étiquetage (25 XP)
    id: "jeu1",
    role: "Jeu",
    type: "brainstorm",
    titre: "Jeu 1 – Brainstorm & Étiquetage",
    question:
      "Ajoute un maximum d’idées, sélectionne-en 5 puis attribue un pôle à chacune.",
    config: {
      minIdeas: 5, // au moins 5 idées pour avancer
      maxSelected: 5, // on en retient 5
      roles: [
        "Présidence",
        "Trésorerie",
        "Secrétariat",
        "Événementiel",
        "Communication",
      ],
    },
    scoring: { xp: 25 },
    timerSec: 0,
  },
  {
    id: "jeu2",
    role: "Jeu",
    type: "jeu2", // <- nouveau type
    titre: "Jeu 2 – Série de 6 questions par pôles",
    question:
      "Répondez aux 6 étapes : textes par pôles, QCM communs, brainstorming, puis budget & justification.",
    // Contenu minimal de QCM (modifiable)
    qcm: [
      {
        titre: "Étape 3 – QCM commun #1",
        question: "Choisissez la meilleure option.",
        options: ["Option A", "Option B", "Option C"],
        bonneReponse: 1, // index (ici 'Option B')
      },
      {
        titre: "Étape 4 – QCM commun #2",
        question: "Choisissez la seule réponse correcte.",
        options: ["Réponse 1", "Réponse 2", "Réponse 3"],
        bonneReponse: 2, // 'Réponse 3'
      },
    ],
    // Rôles affichés pour guider la saisie
    roles: ["Présidence", "Trésorerie", "Secrétariat"],
    scoring: { xp: 25 },
  },
  {
    id: "jeu3_etape1",
    role: "Tous",
    type: "texte",
    titre: "Idées pour la cohésion",
    question:
      "Quelles sont les choses à faire pour maintenir la cohésion d’équipe toute l’année (Erasmus, stages, etc.) ?",
    validation: "mj",
    scoring: { xp: 20 },
  },
  {
    id: "jeu3_etape2",
    role: "Tous",
    type: "choix",
    titre: "Fréquence des réunions",
    question:
      "Quelle fréquence de réunions est idéale pour garder la cohésion ?",
    options: [
      "Une fois par mois",
      "Une fois toutes les deux semaines",
      "Une fois par semaine",
      "Tous les jours",
    ],
    bonneReponse: 2,
    scoring: { xp: 20 },
  },
  {
    id: "jeu3_etape3",
    role: "Tous",
    type: "brainstorm",
    titre: "Cohésion avant fin décembre",
    question:
      "Proposez des actions concrètes pour renforcer la cohésion avant les départs.",
    validation: "mj",
    scoring: { xp: 30 },
  },
  {
    id: "jeu3_etape4",
    role: "Tous",
    type: "tagging",
    titre: "Répartition des responsabilités",
    question:
      "Attribuez chaque idée proposée au pôle concerné (Présidence, Trésorerie, Secrétariat, Événementiel, Communication).",
    validation: "mj",
    scoring: { xp: 30 },
  },
  {
    id: "jeu4",
    role: "Jeu",
    type: "jeu4",
    titre: "Jeu 4 – Partenariats & Prospection",
    question:
      "Identifiez/renouvelez les partenaires, ciblez des secteurs et organisez le budget et les actions.",
    // Données utiles au jeu (listes/options)
    data: {
      // Partenaires actuels connus (à multi-sélection dans l'étape 2)
      partenairesActuels: ["Préfas Incendie", "BNP Paribas", "PROPULSE", "JPM"],
      // Entreprise en période d’essai 1 an
      partenaireEssai: "PWC",
      // Où trouver l’info / quand renouveler
      renouvellement: {
        bonnePeriode: "Janvier",
        bonDossier: "Stratégie et pilotage",
        durees: ["1 an", "2 ans", "3 ans", "5 ans"], // items d’options
        bonneDurees: ["1 an", "2 ans"], // certaines conventions durent 2 ans
      },
      // Secteurs/cibles pertinents (multi QCM)
      secteursPertinents: [
        "PME",
        "Industries",
        "ETI",
        "Startups",
        "Collectivités",
        "Ecoles/Universités",
      ],
      // Pôles pour le budget
      roles: [
        "Présidence",
        "Trésorerie",
        "Secrétariat",
        "Événementiel",
        "Communication",
      ],
    },
    scoring: { xp: 30 },
  },
];

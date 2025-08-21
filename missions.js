/* =========================
   Missions — JC AQSE (4 jeux)
   ========================= */

const missions = [
  /* --------------------------------------------------------
     JEU 1 — Conférence pro (brainstorm + tagging)
     -------------------------------------------------------- */
  {
    id: "jeu1",
    role: "Jeu",
    type: "brainstorm",
    titre: "Organiser une conférence à destination des professionnels",
    question:
      "Quelles sont les idées qui vous viennent pour organiser cet évènement ?",
    // Timer demandé : 6 minutes
    timerSec: 360,
    // Le MJ valide (il peut accepter/refuser les idées sup)
    validation: "mj",
    // Paramètres UI du brainstorm
    config: {
      minIdeas: 6, // au moins 6 idées saisies
      maxSelected: 5, // on en retient 5
      roles: [
        "Présidence",
        "Trésorerie",
        "Secrétariat",
        "Événementiel",
        "Communication",
      ],
    },
    scoring: { xp: 20 },
  },

  /* --------------------------------------------------------
     JEU 2 — Objectif CA & Prospection (6 étapes)
     -------------------------------------------------------- */
  {
    id: "jeu2",
    role: "Jeu",
    type: "jeu2",
    titre: "Fixer le CA & organiser la prospection",
    question:
      "Définissez l’objectif de CA du mandat, répartissez les responsabilités et cadrez la prospection.",
    // QCM utilisés par les étapes 3 et 4
    qcm: [
      // Étape 3 — QCM commun #1 : fréquence de prospection
      {
        titre: "Fréquence de prospection",
        question:
          "À quelle fréquence faut-il prospecter pour atteindre l’objectif de CA ?",
        options: [
          "1 fois / semaine",
          "1 fois / mois",
          "3 fois / semaine – créneaux de 2h",
          "3 fois / semaine – créneaux de 15 min",
          "3 fois / mois",
          "Tous les jours 15 min (hors week-ends)",
        ],
        // Bonne réponse retenue (ajuste si besoin)
        bonneReponse: 2,
      },
      // Étape 4 — QCM commun #2 : canal le plus pertinent au démarrage
      {
        titre: "Canal prioritaire pour démarrer",
        question:
          "Quel canal est le plus pertinent pour lancer la prospection B2B ?",
        options: [
          "Affichage sur le campus",
          "Porte-à-porte en entreprise sans rdv",
          "LinkedIn + Email ciblé",
          "Stories Instagram",
        ],
        bonneReponse: 2,
      },
    ],
    // (Les autres étapes sont en réponses libres / brainstorm / budget dans jeu.js)
    scoring: { xp: 30 },
  },

  /* --------------------------------------------------------
     JEU 3 — Cohésion d’équipe (4 étapes)
     -------------------------------------------------------- */
  {
    id: "jeu3",
    role: "Jeu",
    type: "jeu3",
    titre: "Cohésion d’équipe sur l’année",
    question:
      "Construisez un plan de cohésion viable (Erasmus, stages…), cadencez les réunions et justifiez vos choix.",
    // (Les contenus d’étapes sont gérés dans jeu.js ; QCM simple étape 3)
    scoring: { xp: 25 },
  },

  /* --------------------------------------------------------
     JEU 4 — Partenariats & Prospection (7 étapes)
     -------------------------------------------------------- */
  {
    id: "jeu4",
    role: "Jeu",
    type: "jeu4",
    titre: "Partenariats & Prospection",
    question:
      "Identifiez/renouvelez les partenaires, ciblez des secteurs, puis organisez budget et actions.",
    data: {
      // Étape 2 — QCM multi : partenaires actuels (doivent tous être cochés)
      partenairesActuels: ["Préfas Incendie", "BNP Paribas", "PROPULSE", "JPM"],
      // Étape 3a — Entreprise en période d’essai 1 an
      partenaireEssai: "PWC",
      // Étape 3b — Renouvellement : quand / où / durées possibles
      renouvellement: {
        bonnePeriode: "Janvier",
        bonDossier: "Stratégie et pilotage",
        durees: ["1 an", "2 ans", "3 ans", "5 ans"],
        bonneDurees: ["1 an", "2 ans"],
      },
      // Étape 5 — Cibles/secteurs pertinents (multi)
      secteursPertinents: [
        "PME",
        "Industries",
        "ETI",
        "Startups",
        "Collectivités",
        "Ecoles/Universités",
      ],
      // Étape 6 — Pôles pour le budget partenaires
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

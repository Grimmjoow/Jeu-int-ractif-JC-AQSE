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
    // Timer : 6 minutes
    timerSec: 360,
    // Le MJ peut accepter/refuser les ajouts si besoin (le code Valide quand on clique sur “Valider le jeu”)
    validation: "mj",
    // Paramètres UI du brainstorm (utilisés par renderBrainstorm côté jeu.js)
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
       Étapes (gérées dans renderJeu2) :
        1) Libre (Présidence/Tréso/SecG) — cadrage initial
        2) Libre (Présidence) — vision + 3 objectifs
        3) QCM commun — stratégie de prospection (choix unique)
        4) QCM commun — rythme / fréquence (choix unique)
        5) Brainstorm — canaux & événements
        6) Budget par pôle + pourquoi (libre) -> Validation
     -------------------------------------------------------- */
  {
    id: "jeu2",
    role: "Jeu",
    type: "jeu2",
    titre: "Fixer le CA & organiser la prospection",
    question:
      "Définissez l’objectif de CA du mandat, répartissez les responsabilités et cadrez la prospection.",
    // NB : les QCM d’étapes 3 et 4 sont définis directement dans renderJeu2.
    scoring: { xp: 30 },
  },

  /* --------------------------------------------------------
     JEU 3 — Cohésion d’équipe (4 étapes)
       Étapes (gérées dans renderJeu3) :
        1) Libre — actions pour la cohésion à distance
        2) Libre — fréquence réunions & suivi individuel
        3) QCM — choix d’un pack de rituels
        4) Libre — plan avant décembre + budget cohésion -> Validation
     -------------------------------------------------------- */
  {
    id: "jeu3",
    role: "Jeu",
    type: "jeu3",
    titre: "Cohésion d’équipe sur l’année",
    question:
      "Construisez un plan de cohésion viable (Erasmus, stages…), cadencez les réunions et justifiez vos choix.",
    scoring: { xp: 25 },
  },

  /* --------------------------------------------------------
     JEU 4 — Partenariats & Prospection (7 étapes)
       Étapes (gérées dans renderJeu4) :
        1) Libre — partenaires actuels
        2) Libre — entreprise en période d’essai (1 an)
        3) QCM — renouvellement + où se trouve l’info
        4) Libre — types d’entreprises pertinentes à prospecter
        5) Libre — cible prioritaire + exemple
        6) Formulaire — budget & arguments par pôle
        7) Libre — budget “séduction” + idées d’actions -> Validation
     -------------------------------------------------------- */
  {
    id: "jeu4",
    role: "Jeu",
    type: "jeu4",
    titre: "Partenariats & Prospection",
    question:
      "Identifiez / renouvelez les partenaires, ciblez des secteurs, puis organisez budget et actions.",
    scoring: { xp: 30 },
  },
];

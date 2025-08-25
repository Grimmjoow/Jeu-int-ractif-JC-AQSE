/* =========================================================
   missions.js — Définition des 4 jeux
   (Sans chrono ; textes/jeux alignés avec tes consignes)
========================================================= */

const missions = [
  {
    id: "jeu1",
    titre: "Jeu 1 — Brainstorm Conférence",
    type: "brainstorm",
    // Texte affiché au-dessus du jeu
    question: "Organiser une conférence à destination des professionnels.",
    scoring: { xp: 25 },
  },

  {
    id: "jeu2",
    titre: "Jeu 2 — Stratégie commerciale",
    type: "jeu2",
    // Étapes gérées dans jeu.js :
    // - Étape 6 clarifiée + réponse libre par pôle
    // - Étape 7 : entreprise cible
    question: "Construisez votre stratégie commerciale en 7 étapes.",
    scoring: { xp: 25 },
  },

  {
    id: "jeu3",
    titre: "Jeu 3 — Cohésion d’équipe",
    type: "jeu3",
    // Étapes gérées dans jeu.js :
    // - Étape 1 en brainstorm
    // - Étape 3 : “Quelle est la fréquence des réunions ainsi que des prises de contacts avec chaque membre ?”
    // - Étape 4 : budget cohésion (Tréso, Sec G, Reste) + affichage des réponses
    question: "Définissez vos rituels et votre budget cohésion.",
    scoring: { xp: 25 },
  },

  {
    id: "jeu4",
    titre: "Jeu 4 — Partenariats",
    type: "jeu4",
    // Étapes gérées dans jeu.js :
    // - Étape 1 en brainstorm (nouvelle consigne)
    question: "Développez et structurez les partenariats.",
    scoring: { xp: 25 },
  },
];

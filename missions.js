/* =========================================================
   missions.js — Définition des 4 jeux
   (Sans chrono ; textes/jeux alignés avec les dernières consignes)
========================================================= */

const missions = [
  {
    id: "jeu1",
    titre: "Jeu 1 — Brainstorm Conférence",
    type: "brainstorm",
    // Texte affiché au-dessus du jeu (les étapes sont gérées dans jeu.js)
    question: "Organiser une conférence à destination des professionnels.",
    scoring: { xp: 25 },
    // pas de timerSec (chrono supprimé)
  },

  {
    id: "jeu2",
    titre: "Jeu 2 — Stratégie commerciale",
    type: "jeu2",
    // Étapes gérées dans jeu.js, dont :
    // - Étape 6 reformulée + réponses libres par pôle
    // - Pas de chrono
    question: "Construisez votre stratégie commerciale en 7 étapes.",
    scoring: { xp: 25 },
  },

  {
    id: "jeu3",
    titre: "Jeu 3 — Cohésion d’équipe",
    type: "jeu3",
    // Étapes gérées dans jeu.js, dont :
    // - Étape 1 en brainstorm
    // - Étape 3 question : fréquence réunions + prises de contact
    // - Étape 4 : budget cohésion (Tréso / SecG / Reste) avec affichage
    question: "Définissez vos rituels et votre budget cohésion.",
    scoring: { xp: 25 },
  },

  {
    id: "jeu4",
    titre: "Jeu 4 — Partenariats",
    type: "jeu4",
    // Étapes gérées dans jeu.js, dont :
    // - Étape 1 en brainstorm
    // - Étape 2 sans exemple
    // - Ancienne étape 3 scindée en 3.1 et 3.2 (deux questions libres)
    question: "Développez et structurez les partenariats.",
    scoring: { xp: 25 },
  },
];

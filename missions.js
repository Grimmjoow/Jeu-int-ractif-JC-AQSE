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
    id: "jeu3",
    role: "Jeu",
    type: "texte",
    titre: "Jeu 3",
    question: "Écris ta proposition (validation auto).",
    placeholder: "Ta réponse ici…",
    validation: "auto", // ou "mj" si tu veux forcer la validation manuelle
    scoring: { xp: 25 },
    timerSec: 90,
  },
  {
    id: "jeu4",
    role: "Jeu",
    type: "qcm",
    titre: "Jeu 4",
    question: "Sélectionne la (seule) bonne réponse.",
    options: ["Proposition X", "Proposition Y", "Proposition Z"],
    bonnesReponses: [2], // Z
    scoring: { xp: 25 },
    timerSec: 60,
  },
];

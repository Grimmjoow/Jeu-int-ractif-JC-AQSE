// 4 jeux séquentiels — 25 XP chacun (total 100)
const missions = [
  {
    id: "jeu1",
    role: "Jeu",
    type: "qcm",
    titre: "Jeu 1",
    question: "Sélectionne les 2 bonnes réponses.",
    options: ["Option A", "Option B", "Option C", "Option D"],
    bonnesReponses: [0, 2], // A et C
    scoring: { xp: 25 },
    timerSec: 60,
  },
  {
    id: "jeu2",
    role: "Jeu",
    type: "choix",
    titre: "Jeu 2",
    question: "Choisis la bonne réponse.",
    options: ["Réponse 1", "Réponse 2", "Réponse 3"],
    bonneReponse: 1, // Réponse 2
    scoring: { xp: 25 },
    timerSec: 60,
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

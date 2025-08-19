/* =========================================================
   Missions du jeu interactif JC AQSE
   - 15 missions génériques par pôle
   - 8 missions “épreuves réelles” (Conférence, CA, Cohésion, Partenaires)
   - Total : 23 missions
   ========================================================= */

const missions = [
  /* =================== GÉNÉRIQUES =================== */

  // Présidence
  {
    id: "pres_priorites",
    role: "Présidence",
    titre: "Fixer les priorités du mandat",
    type: "choix",
    question: "Quelle est la priorité la plus stratégique à fixer en premier ?",
    options: [
      "Augmenter le CA de 50 %",
      "Organiser un congrès régional",
      "Renforcer les process internes",
    ],
    bonneReponse: 0,
    scoring: { xp: 20, cohesion: 5 },
  },
  {
    id: "pres_partners",
    role: "Présidence",
    titre: "Partenariats stratégiques",
    type: "qcm",
    question: "Quels partenaires semblent pertinents à renforcer ?",
    options: [
      "BNP Paribas",
      "Propulse",
      "PWC",
      "Entreprise concurrente directe",
    ],
    bonnesReponses: [0, 1, 2],
    scoring: { xp: 25, ca: 10 },
  },
  {
    id: "pres_crisis",
    role: "Présidence",
    titre: "Gérer une crise",
    type: "texte",
    question:
      "Un client important menace de résilier un contrat. Quelle est ta réaction ?",
    validation: "mj",
    scoring: { xp: 30, cohesion: 10 },
  },

  // Trésorerie
  {
    id: "treso_budget_event",
    role: "Trésorerie",
    titre: "Gérer le budget d’un événement",
    type: "choix",
    question:
      "Budget total : 1000 €. Quelle répartition est la plus équilibrée ?",
    options: [
      "Salle 600€ / Logistique 200€ / Communication 200€",
      "Salle 300€ / Logistique 400€ / Communication 300€",
      "Salle 800€ / Logistique 100€ / Communication 100€",
    ],
    bonneReponse: 1,
    scoring: { xp: 20, budget: 10 },
  },
  {
    id: "treso_risques",
    role: "Trésorerie",
    titre: "Identifier les risques",
    type: "qcm",
    question: "Quels risques financiers doivent être anticipés ?",
    options: [
      "Retard de paiement client",
      "Erreur de facturation",
      "Dépenses imprévues",
      "Trop de bénévolat",
    ],
    bonnesReponses: [0, 1, 2],
    scoring: { xp: 20, budget: 15 },
  },
  {
    id: "treso_surplus",
    role: "Trésorerie",
    titre: "Excédent budgétaire",
    type: "texte",
    question: "Vous avez 2000 € de surplus en fin d’année, comment l’allouer ?",
    validation: "mj",
    scoring: { xp: 15, cohesion: 10 },
  },

  // Secrétariat
  {
    id: "sec_process",
    role: "Secrétariat",
    titre: "Mettre en place un process",
    type: "choix",
    question: "Quel process est prioritaire pour garantir la conformité ?",
    options: [
      "Archivage juridique et contrats",
      "Organisation des réunions",
      "Suivi des réseaux sociaux",
    ],
    bonneReponse: 0,
    scoring: { xp: 20, cohesion: 5 },
  },
  {
    id: "sec_quality",
    role: "Secrétariat",
    titre: "Audit qualité",
    type: "qcm",
    question: "Quels éléments doivent être vérifiés pour réussir un audit ?",
    options: [
      "Statuts et règlements",
      "Comptes-rendus de réunion",
      "Documents comptables",
      "Posts Instagram",
    ],
    bonnesReponses: [0, 1, 2],
    scoring: { xp: 25, cohesion: 10 },
  },
  {
    id: "sec_absence",
    role: "Secrétariat",
    titre: "Gestion d’une absence",
    type: "texte",
    question:
      "Un membre du bureau part 6 mois en Erasmus. Comment assurer le suivi ?",
    validation: "mj",
    scoring: { xp: 20, cohesion: 15 },
  },

  // Événementiel
  {
    id: "event_conference",
    role: "Événementiel",
    titre: "Organiser une conférence",
    type: "qcm",
    question: "Quels éléments sont indispensables pour réussir ?",
    options: ["Lieu", "Intervenant", "Communication", "Snack pour l’équipe"],
    bonnesReponses: [0, 1, 2],
    scoring: { xp: 20, cohesion: 10 },
  },
  {
    id: "event_logistique",
    role: "Événementiel",
    titre: "Gestion logistique",
    type: "choix",
    question: "Quel est le point logistique le plus critique ?",
    options: [
      "Disponibilité de la salle",
      "Choix des goodies",
      "Nombre de places assises",
    ],
    bonneReponse: 0,
    scoring: { xp: 15, cohesion: 5 },
  },
  {
    id: "event_planb",
    role: "Événementiel",
    titre: "Plan B",
    type: "texte",
    question:
      "L’intervenant principal annule à la dernière minute. Quelle solution proposes-tu ?",
    validation: "mj",
    scoring: { xp: 25, cohesion: 10 },
  },

  // Communication
  {
    id: "com_reseaux",
    role: "Communication",
    titre: "Stratégie réseaux sociaux",
    type: "choix",
    question: "Quel canal privilégier pour toucher les étudiants ?",
    options: ["LinkedIn", "Instagram", "Email"],
    bonneReponse: 1,
    scoring: { xp: 20, ca: 5 },
  },
  {
    id: "com_identite",
    role: "Communication",
    titre: "Identité visuelle",
    type: "qcm",
    question: "Quels éléments font partie de la charte graphique ?",
    options: ["Logo", "Typographie", "Couleurs", "Budget annuel"],
    bonnesReponses: [0, 1, 2],
    scoring: { xp: 15, cohesion: 5 },
  },
  {
    id: "com_crise",
    role: "Communication",
    titre: "Communication de crise",
    type: "texte",
    question:
      "Un article négatif sort dans la presse locale. Comment réagissez-vous ?",
    validation: "mj",
    scoring: { xp: 30, cohesion: 10 },
  },

  /* =================== ÉPREUVES ÉTAPE 3 =================== */

  // Conférence
  {
    id: "conf_idees",
    role: "Événementiel",
    titre: "Conférence — Idées clés (6 min)",
    type: "texte",
    question:
      "Listez les éléments essentiels : Lieu, Intervenant, Date, Budget, Communication, Partenaires.",
    rolesInvites: ["Événementiel", "Présidence", "Communication"],
    timerSec: 360,
    validation: "mj",
    scoring: { xp: 20, cohesion: 5 },
    penalty: { xp: -5 },
    placeholder:
      "Ex : Amphi A • Dr. Dupont • 12 mars • 800 € • Affiches + LinkedIn • BNP",
  },
  {
    id: "conf_dispatch",
    role: "Événementiel",
    titre: "Conférence — Répartition des tâches",
    type: "qcm",
    question: "Quelles tâches relèvent directement de l’Événementiel ?",
    options: [
      "Réserver la salle et gérer la logistique",
      "Négocier l’intervention et cadrer les objectifs avec l’intervenant",
      "Concevoir et lancer la campagne de communication",
      "Contrôler la conformité contractuelle et autorisations campus",
    ],
    bonnesReponses: [0],
    scoring: { xp: 15, cohesion: 5 },
  },
  {
    id: "conf_budget",
    role: "Trésorerie",
    titre: "Conférence — Répartition du budget (1000 €)",
    type: "choix",
    question: "Quelle répartition te semble la plus pertinente ?",
    options: [
      "Salle 300€ / Logistique 400€ / Communication 300€",
      "Salle 600€ / Logistique 200€ / Communication 200€",
      "Salle 200€ / Logistique 200€ / Communication 600€",
    ],
    bonneReponse: 0,
    scoring: { xp: 20, budget: 10 },
  },

  // CA / Prospection
  {
    id: "ca_objectif",
    role: "Présidence",
    titre: "Fixer l’objectif de CA du mandat",
    type: "choix",
    question:
      "Quel objectif te semble ambitieux ET réaliste (CA précédent : 10–20k €) ?",
    options: [
      "15 k€ (conservateur)",
      "25 k€ (ambitieux mais réaliste)",
      "50 k€ (très agressif)",
    ],
    bonneReponse: 1,
    scoring: { xp: 15, ca: 5 },
  },
  {
    id: "ca_canaux",
    role: "Communication",
    titre: "Choisir les canaux de prospection",
    type: "qcm",
    question: "Quels canaux sont adaptés pour atteindre l’objectif CA ?",
    options: [
      "LinkedIn + Email (outbound ciblé)",
      "Porte-à-porte sans ciblage",
      "Conférences / salons pros",
      "Cold call à des particuliers",
    ],
    bonnesReponses: [0, 2],
    scoring: { xp: 20, ca: 10 },
  },
  {
    id: "ca_budget",
    role: "Trésorerie",
    titre: "Budget Business Dev",
    type: "texte",
    question:
      "Quel budget allouer pour atteindre l’objectif (outils, stands, déplacements) ? Justifie.",
    validation: "mj",
    scoring: { xp: 15, budget: 10 },
    placeholder:
      "Ex : 1 200 € (CRM, sponsorisation LinkedIn, stand salon régional...)",
  },

  // Cohésion
  {
    id: "cohesion_dispositif",
    role: "Secrétariat",
    titre: "Cohésion — Dispositif de suivi",
    type: "choix",
    question:
      "Quel dispositif instaure-t-on pour garder une cohésion avec Erasmus/stages ?",
    options: [
      "Réunion plénière mensuelle uniquement",
      "Points hebdo + compte-rendu + binômes de suivi",
      "Un groupe WhatsApp suffit",
    ],
    bonneReponse: 1,
    scoring: { xp: 20, cohesion: 10 },
  },
  {
    id: "cohesion_rythme",
    role: "Présidence",
    titre: "Cohésion — Cadence des réunions",
    type: "texte",
    question:
      "Propose une cadence de réunions (Bureau / Pôle / Plénière) et le format.",
    validation: "mj",
    scoring: { xp: 15, cohesion: 10 },
    placeholder:
      "Ex : Bureau/hebdo, Pôle/hebdo ou bi-hebdo, Plénière/mensuelle",
  },
  {
    id: "cohesion_budget",
    role: "Trésorerie",
    titre: "Cohésion — Budget & justification",
    type: "texte",
    question:
      "Quel budget allouer à la cohésion (team-building, séminaire) ? Donne les priorités.",
    validation: "mj",
    scoring: { xp: 15, cohesion: 10 },
    placeholder: "Ex : 600 € (kickoff, mid-mandat, clôture) + 200 € supports",
  },

  // Partenaires
  {
    id: "part_liste",
    role: "Présidence",
    titre: "Partenaires actuels",
    type: "qcm",
    question: "Sélectionne les partenaires connus de JC AQSE.",
    options: ["Préfas Incendie", "BNP Paribas", "PROPULSE", "JPM", "ACME Inc."],
    bonnesReponses: [0, 1, 2, 3],
    scoring: { xp: 20, ca: 5 },
  },
  {
    id: "part_renouvellement",
    role: "Présidence",
    titre: "Renouvellement des conventions",
    type: "choix",
    question: "Quand renouveler et où trouver l’information ?",
    options: [
      "Janvier ; Dossier Stratégie et pilotage",
      "Décembre ; SMQ",
      "Tous les 3 ans ; RH",
    ],
    bonneReponse: 0,
    scoring: { xp: 20 },
  },
  {
    id: "part_budget",
    role: "Trésorerie",
    titre: "Budget Partenaires & activations",
    type: "texte",
    question:
      "Propose un budget annuel partenaires (activations, co-events, dotations) et justifie par pôle.",
    rolesInvites: [
      "Trésorerie",
      "Événementiel",
      "Présidence",
      "Secrétariat",
      "Communication",
    ],
    validation: "mj",
    scoring: { xp: 20, cohesion: 10, ca: 5 },
    placeholder:
      "Ex : 1 500 € (co-event campus, dotations concours, activation LinkedIn sponsorisée...)",
  },
];

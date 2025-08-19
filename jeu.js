/************  ÉTAPE 1 : rôles + indicateurs + mémo  ************/

// Ordre fixe des pôles (et boutons de timeline)
const POLES_ORDER = [
  "Présidence",
  "Trésorerie",
  "Secrétariat",
  "Événementiel",
  "Communication",
];

// Indicateurs globaux
const indicateurs = { xp: 0, ca: 0, budget: 0, cohesion: 0 };

// État de jeu
let etatDuJeu = {
  etapesTerminees: [], // indices missions terminées
  missionActuelle: null, // index mission courante
  poleActuel: null, // pôle courant
};

/* ---------- Utils rôles ---------- */
function normalize(str = "") {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
// Affichage “nettoyé” : Partenariats/Dév. -> Présidence ; SecGén -> Secrétariat
function displayRole(roleLabel = "") {
  const r = normalize(roleLabel);
  if (!roleLabel) return "Étape";
  if (
    r.includes("partenariat") ||
    r.includes("developpement") ||
    r.includes("commercial")
  )
    return "Présidence";
  if (r.includes("secretariat")) return "Secrétariat";
  if (r.includes("tresorerie")) return "Trésorerie";
  if (r.includes("evenementiel")) return "Événementiel";
  if (r.includes("presidence")) return "Présidence";
  if (r.includes("communication")) return "Communication";
  return roleLabel;
}
function roleClass(roleLabel) {
  const role = displayRole(roleLabel);
  const r = normalize(role);
  if (r.includes("presidence")) return "role-pres";
  if (r.includes("tresorerie")) return "role-treso";
  if (r.includes("secretariat")) return "role-sec";
  if (r.includes("evenementiel")) return "role-event";
  if (r.includes("communication")) return "role-com";
  return "";
}

/* ---------- Header : mise à jour des chips ---------- */
function renderHeader() {
  document.getElementById("chip-xp").textContent = indicateurs.xp;
  document.getElementById("chip-ca").textContent = indicateurs.ca;
  document.getElementById("chip-budget").textContent = indicateurs.budget;
  document.getElementById("chip-cohesion").textContent = indicateurs.cohesion;
}
function majIndics(delta) {
  if (!delta) return;
  for (const k of Object.keys(indicateurs)) {
    indicateurs[k] += delta[k] || 0;
  }
  renderHeader();
}

/* ---------- Mémo : garder les infos de la mission en cours ---------- */
function clearMemo(msg = "Aucune note pour le moment.") {
  const el = document.getElementById("memo-body");
  el.innerHTML = `<p class="muted">${msg}</p>`;
}
function ajouterMemo(label, valeur) {
  const el = document.getElementById("memo-body");
  // si premier ajout, on enlève le placeholder
  if (el.querySelector("p")) el.innerHTML = "";
  const line = document.createElement("div");
  line.className = "memo-line";
  line.innerHTML = `<strong>${label} :</strong> ${valeur}`;
  el.appendChild(line);
}

/* ---------- Index missions par pôle ---------- */
function buildPoleIndex() {
  const map = {};
  POLES_ORDER.forEach((p) => (map[p] = []));
  missions.forEach((m, i) => {
    const p = displayRole(m.role);
    if (map[p]) map[p].push(i);
  });
  return map;
}

/* ---------- Timeline : un bouton par pôle ---------- */
function renderTimeline() {
  const wrap = document.getElementById("steps");
  if (!wrap) return;
  wrap.innerHTML = "";
  POLES_ORDER.forEach((roleName, rank) => {
    const btn = document.createElement("button");
    btn.className = "step-btn " + roleClass(roleName);
    btn.textContent = `${rank + 1}. ${roleName}`;
    btn.dataset.pole = roleName;
    btn.onclick = () => loadPole(roleName);
    wrap.appendChild(btn);
  });
  setTimelineStates();
}
function setTimelineStates() {
  const buttons = document.querySelectorAll(".step-btn");
  buttons.forEach((btn) => {
    btn.disabled = false;
    btn.classList.remove("locked", "current", "done");
    const poleOfCurrent =
      etatDuJeu.missionActuelle != null
        ? displayRole(missions[etatDuJeu.missionActuelle].role)
        : null;
    if (btn.dataset.pole === poleOfCurrent) btn.classList.add("current");
  });
}

/* ---------- Barre progression (reste XP-based pour l’instant) ---------- */
function updateProgress() {
  // on garde la barre actuelle basée sur missions finies si tu en as une (optionnel)
}

/* ---------- Feedback ---------- */
function showFeedback(ok, msg) {
  const box = document.getElementById("feedback");
  if (!box) return;
  box.className = "feedback " + (ok ? "ok" : "ko");
  box.textContent = (ok ? "✅ " : "❌ ") + msg;
}

/* ---------- Affichage mission ---------- */
function renderMission(index) {
  const m = missions[index];
  const body = document.getElementById("mission-body");
  if (!body) return;
  const role = displayRole(m.role);
  const roleCls = roleClass(m.role);

  // reset mémo pour la nouvelle mission
  clearMemo();

  let html = `
    <h3 class="mission-title">${m.titre}</h3>
    <div class="mission-meta">
      <span class="role-badge ${roleCls}">${role}</span>
      &nbsp;•&nbsp; ${m.points ?? 0} XP
    </div>
    <p>${m.question}</p>
  `;

  if (m.type === "qcm") {
    (m.options || []).forEach((opt, i) => {
      html += `
        <label class="option">
          <input type="checkbox" name="opt" value="${i}" />
          <span>${opt}</span>
        </label>
      `;
    });
    html += `<div class="actions"><button class="btn" onclick="validerQCM(${index})">Valider</button></div>`;
  } else if (m.type === "choix") {
    (m.options || []).forEach((opt, i) => {
      html += `
        <label class="option">
          <input type="radio" name="opt" value="${i}" />
          <span>${opt}</span>
        </label>
      `;
    });
    html += `<div class="actions"><button class="btn" onclick="validerChoix(${index})">Valider</button></div>`;
  } else {
    // Placeholder pour futurs types (texte, timer, etc.)
    html += `<div class="end-screen">Mission non interactive implémentée ultérieurement.</div>`;
  }

  body.innerHTML = html;
  const fb = document.getElementById("feedback");
  if (fb) fb.textContent = "";
}

/* ---------- Navigation ---------- */
function loadPole(roleName) {
  const map = buildPoleIndex();
  const list = map[roleName] || [];
  if (list.length === 0) {
    document.getElementById(
      "mission-body"
    ).innerHTML = `<p>Aucune mission définie pour ${roleName}.</p>`;
    clearMemo();
    return;
  }
  loadStep(list[0], roleName);
}
function loadStep(index, poleName = null) {
  etatDuJeu.missionActuelle = index;
  etatDuJeu.poleActuel = poleName || displayRole(missions[index].role);
  setTimelineStates();
  renderMission(index);
}

/* ---------- Validations classiques (QCM / Choix) ---------- */
function validerQCM(index) {
  const m = missions[index];
  const checked = Array.from(
    document.querySelectorAll('input[name="opt"]:checked')
  ).map((e) => parseInt(e.value, 10));
  const bonnes = m.bonnesReponses || [];
  const estBonne =
    bonnes.every((r) => checked.includes(r)) &&
    checked.length === bonnes.length;

  ajouterMemo("Sélection", checked.map((i) => m.options[i]).join(", ") || "—");

  if (estBonne) {
    const pts = m.points ?? 0;
    majIndics({ xp: pts });
    showFeedback(true, `Bonne réponse ! +${pts} XP`);
    if (!etatDuJeu.etapesTerminees.includes(index))
      etatDuJeu.etapesTerminees.push(index);
  } else {
    showFeedback(false, "Mauvaise réponse ou réponse incomplète.");
  }
}
function validerChoix(index) {
  const m = missions[index];
  const choisi = parseInt(
    document.querySelector('input[name="opt"]:checked')?.value ?? "-1",
    10
  );
  ajouterMemo("Choix", m.options?.[choisi] ?? "—");

  const estBonne = choisi === m.bonneReponse;
  if (estBonne) {
    const pts = m.points ?? 0;
    majIndics({ xp: pts });
    showFeedback(true, `Bonne réponse ! +${pts} XP`);
    if (!etatDuJeu.etapesTerminees.includes(index))
      etatDuJeu.etapesTerminees.push(index);
  } else {
    showFeedback(false, "Mauvais choix.");
  }
}

/* ---------- Affectation des rôles (overlay) ---------- */
function showRolesOverlay(show = true) {
  document.getElementById("roles-overlay").classList.toggle("hidden", !show);
}
function loadPlayers() {
  try {
    return JSON.parse(localStorage.getItem("aqse_players") || "{}");
  } catch (e) {
    return {};
  }
}
function savePlayers(obj) {
  localStorage.setItem("aqse_players", JSON.stringify(obj || {}));
}
function initRolesOverlay() {
  const players = loadPlayers();
  const form = document.getElementById("roles-form");
  const resetBtn = document.getElementById("roles-reset");

  // Pré-remplir si déjà saisi
  Array.from(form.elements).forEach((el) => {
    if (el.name && players[el.name]) el.value = players[el.name];
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {};
    POLES_ORDER.forEach((p) => {
      data[p] = form.elements[p]?.value?.trim() || "";
    });
    savePlayers(data);
    showRolesOverlay(false);
  });

  resetBtn.addEventListener("click", () => {
    localStorage.removeItem("aqse_players");
    Array.from(form.elements).forEach((el) => {
      if (el.tagName === "INPUT") el.value = "";
    });
  });
}

/* ---------- Init ---------- */
window.onload = () => {
  // Rôles : afficher overlay si pas encore saisi
  const players = loadPlayers();
  const hasAll = POLES_ORDER.every((p) => (players[p] || "").length > 0);
  showRolesOverlay(!hasAll);
  initRolesOverlay();

  // Header + timeline + écran de départ
  renderHeader();
  renderTimeline();
  clearMemo();
};

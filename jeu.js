/************  JE — Étape 2 + lock + auto-advance par pôle  ************/

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
  etapesTerminees: [], // indices missions terminées (auto)
  missionActuelle: null, // index mission courante
  poleActuel: null, // pôle courant
  timer: { handle: null, total: 0, left: 0, expired: false },
  seq: { ordre: [], pos: 0 }, // séquence multi‑pôles
};

// Verrouillage : une seule validation par mission
const missionLocked = new Set();
function isLocked(idx) {
  return missionLocked.has(idx);
}
function lockMission(idx) {
  missionLocked.add(idx);
}

/* ---------- Utils rôles ---------- */
function normalize(str = "") {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
// Affichage “nettoyé” : Partenariats/Dév. → Présidence ; SecGén → Secrétariat
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

/* ---------- Header : chips ---------- */
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

/* ---------- Mémo ---------- */
function clearMemo(msg = "Aucune note pour le moment.") {
  const el = document.getElementById("memo-body");
  el.innerHTML = `<p class="muted">${msg}</p>`;
}
function ajouterMemo(label, valeur) {
  const el = document.getElementById("memo-body");
  if (el.querySelector("p")) el.innerHTML = "";
  const line = document.createElement("div");
  line.className = "memo-line";
  line.innerHTML = `<strong>${label} :</strong> ${valeur}`;
  el.appendChild(line);
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

/* ---------- Timer ---------- */
function stopTimer() {
  if (etatDuJeu.timer.handle) {
    clearInterval(etatDuJeu.timer.handle);
    etatDuJeu.timer.handle = null;
  }
}
function startTimer(seconds, onExpire) {
  stopTimer();
  etatDuJeu.timer.total = seconds;
  etatDuJeu.timer.left = seconds;
  etatDuJeu.timer.expired = false;
  const bar = document.getElementById("timer-bar");
  const legend = document.getElementById("timer-legend");

  function tick() {
    etatDuJeu.timer.left -= 1;
    const pct = Math.max(
      0,
      Math.round((etatDuJeu.timer.left / etatDuJeu.timer.total) * 100)
    );
    if (bar) bar.style.width = pct + "%";
    if (legend) legend.textContent = `⏱️ ${etatDuJeu.timer.left}s restant(s)`;
    if (etatDuJeu.timer.left <= 0) {
      stopTimer();
      etatDuJeu.timer.expired = true;
      if (typeof onExpire === "function") onExpire();
    }
  }
  if (bar) bar.style.width = "100%";
  if (legend) legend.textContent = `⏱️ ${seconds}s restant(s)`;
  etatDuJeu.timer.handle = setInterval(tick, 1000);
}

/* ---------- Affichage mission ---------- */
function renderMission(index) {
  const m = missions[index];
  const body = document.getElementById("mission-body");
  if (!body) return;
  const role = displayRole(m.role);
  const roleCls = roleClass(m.role);

  // reset mémo & timer
  clearMemo();
  stopTimer();

  let html = `
    <h3 class="mission-title">${m.titre}</h3>
    <div class="mission-meta">
      <span class="role-badge ${roleCls}">${role}</span>
      &nbsp;•&nbsp; ${m.points ?? m.scoring?.xp ?? 0} XP
    </div>
    <p>${m.question}</p>
  `;

  // Timer UI si défini
  if (m.timerSec) {
    html += `
    <div class="timer-wrap"><div id="timer-bar" class="timer-bar"></div></div>
    <div id="timer-legend" class="timer-legend"></div>`;
  }

  // Bloc selon type
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
  } else if (m.type === "texte") {
    html += `
      <textarea id="reponse-texte" class="textarea" placeholder="${
        m.placeholder || "Écrivez ici..."
      }"></textarea>
      <div class="mj-actions">
        <span class="mj-badge">Validation : ${
          m.validation === "mj" ? "Maître du jeu" : "Automatique"
        }</span>
        ${
          m.validation === "mj"
            ? `
          <button class="btn" onclick="validerParMJ(${index}, true)">✅ Valider (MJ)</button>
          <button class="btn secondary" onclick="validerParMJ(${index}, false)">❌ Refuser (MJ)</button>
        `
            : `
          <button class="btn" onclick="validerTexte(${index})">Valider</button>
        `
        }
      </div>
    `;
  } else {
    html += `<div class="end-screen">Type de mission à venir.</div>`;
  }

  body.innerHTML = html;
  document.getElementById("feedback").textContent = "";

  // Démarrage timer si besoin
  if (m.timerSec) {
    startTimer(m.timerSec, () => {
      showFeedback(false, "⏱️ Temps écoulé.");
      if (m.penalty) majIndics(m.penalty);
      ajouterMemo("Timer", "Temps écoulé");
    });
  }

  // Séquence multi-pôles (affichage de l'ordre)
  if (Array.isArray(m.rolesInvites) && m.rolesInvites.length) {
    etatDuJeu.seq = { ordre: m.rolesInvites.slice(), pos: 0 };
    const players = loadPlayers();
    const show = m.rolesInvites
      .map((r) => `${r} (${players[r] || "?"})`)
      .join(" → ");
    ajouterMemo("Ordre des rôles", show);
  } else {
    etatDuJeu.seq = { ordre: [], pos: 0 };
  }

  // Si la mission est déjà verrouillée : geler les inputs/boutons
  if (isLocked(index)) {
    disableCurrentInputs();
    ajouterMemo("Statut", "Mission déjà validée (verrouillée)");
  }
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

/* ---------- Utilitaires: disable + next-in-pole ---------- */
function disableCurrentInputs() {
  document
    .querySelectorAll(
      "#mission-body input, #mission-body textarea, #mission-body button"
    )
    .forEach((el) => {
      // on garde seulement les boutons de notre bloc (évite d'autres boutons de nav)
      el.disabled = true;
      el.style.opacity = 0.6;
      el.style.cursor = "not-allowed";
    });
}
function nextIndexInSamePole(currentIdx) {
  const pole = displayRole(missions[currentIdx].role);
  const map = buildPoleIndex();
  const list = map[pole] || [];
  const pos = list.indexOf(currentIdx);
  return pos >= 0 && pos < list.length - 1 ? list[pos + 1] : null;
}
function advanceToNextInPole(currentIdx) {
  const nxt = nextIndexInSamePole(currentIdx);
  const pole = displayRole(missions[currentIdx].role);
  if (nxt != null) {
    loadStep(nxt, pole);
  } else {
    showFeedback(
      true,
      `✅ Pôle ${pole} terminé. Choisis un autre pôle dans la timeline.`
    );
  }
}

/* ---------- Feedback ---------- */
function showFeedback(ok, msg) {
  const box = document.getElementById("feedback");
  if (!box) return;
  box.className = "feedback " + (ok ? "ok" : "ko");
  box.textContent = (ok ? "✅ " : "❌ ") + msg;
}

/* ---------- Validations (+ lock + auto-advance) ---------- */
function applySuccess(m) {
  if (m.scoring) {
    majIndics(m.scoring);
  } else {
    majIndics({ xp: m.points ?? 0 });
  }
  if (!etatDuJeu.etapesTerminees.includes(etatDuJeu.missionActuelle)) {
    etatDuJeu.etapesTerminees.push(etatDuJeu.missionActuelle);
  }
  disableCurrentInputs();
  showFeedback(true, "Réponse validée !");
}
function applyFailure(msg = "Réponse incorrecte.") {
  disableCurrentInputs();
  showFeedback(false, msg);
}

function validerQCM(index) {
  if (isLocked(index))
    return showFeedback(false, "Cette mission a déjà été validée.");
  const m = missions[index];
  const checked = Array.from(
    document.querySelectorAll('input[name="opt"]:checked')
  ).map((e) => parseInt(e.value, 10));
  const bonnes = m.bonnesReponses || [];
  ajouterMemo("Sélection", checked.map((i) => m.options[i]).join(", ") || "—");

  const ok =
    bonnes.every((r) => checked.includes(r)) &&
    checked.length === bonnes.length;

  // Verrouillage immédiat
  lockMission(index);

  if (ok) {
    applySuccess(m);
  } else {
    applyFailure("Mauvaise réponse ou incomplète.");
  }

  // Passer à la mission suivante du même pôle
  advanceToNextInPole(index);
}

function validerChoix(index) {
  if (isLocked(index))
    return showFeedback(false, "Cette mission a déjà été validée.");
  const m = missions[index];
  const choisi = parseInt(
    document.querySelector('input[name="opt"]:checked')?.value ?? "-1",
    10
  );
  ajouterMemo("Choix", m.options?.[choisi] ?? "—");

  // Verrouillage immédiat
  lockMission(index);

  if (choisi === m.bonneReponse) {
    applySuccess(m);
  } else {
    applyFailure("Mauvais choix.");
  }

  advanceToNextInPole(index);
}

function validerTexte(index) {
  if (isLocked(index))
    return showFeedback(false, "Cette mission a déjà été validée.");
  const m = missions[index];
  const v = document.getElementById("reponse-texte")?.value.trim() || "";
  if (!v) return applyFailure("Réponse vide.");

  ajouterMemo("Réponse", v);

  // Verrouillage immédiat
  lockMission(index);

  // Validation auto (si pas MJ)
  applySuccess(m);

  advanceToNextInPole(index);
}

function validerParMJ(index, accepte) {
  if (isLocked(index))
    return showFeedback(false, "Cette mission a déjà été validée.");
  const m = missions[index];
  const v = document.getElementById("reponse-texte")?.value.trim() || "";
  if (v) ajouterMemo("Réponse", v);

  // Verrouillage immédiat
  lockMission(index);

  if (accepte) {
    applySuccess(m);
  } else {
    applyFailure("Refusé par le MJ.");
  }

  advanceToNextInPole(index);
}

/* ---------- Init ---------- */
window.onload = () => {
  // Rôles : overlay si pas saisis
  const players = loadPlayers();
  const hasAll = POLES_ORDER.every((p) => (players[p] || "").length > 0);
  showRolesOverlay(!hasAll);
  initRolesOverlay();

  renderHeader();
  renderTimeline();
  clearMemo();
};

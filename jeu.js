/************  Jeu — Progression par XP uniquement (barre %)  ************/

const POLES_ORDER = [
  "Présidence",
  "Trésorerie",
  "Secrétariat",
  "Événementiel",
  "Communication",
];

// Indicateur unique : XP cumulé
const indicateurs = { xp: 0 };

// Calcul du total d’XP possible (auto depuis missions.js)
let XP_MAX = 0;
function computeXpMax() {
  XP_MAX = missions.reduce((sum, m) => {
    if (m?.scoring?.xp) return sum + (m.scoring.xp || 0);
    if (typeof m.points === "number") return sum + m.points;
    return sum;
  }, 0);
  if (XP_MAX <= 0) XP_MAX = 1; // éviter /0
}

// État de jeu
let etatDuJeu = {
  etapesTerminees: [],
  missionActuelle: null,
  poleActuel: null,
  timer: { handle: null, total: 0, left: 0, expired: false },
  seq: { ordre: [], pos: 0 },
};

// Journal simple si besoin d’un bilan (non exporté)
const results = [];

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

/* ---------- Progress bar ---------- */
function renderProgress() {
  const perc = Math.max(
    0,
    Math.min(100, Math.round((indicateurs.xp / XP_MAX) * 100))
  );
  const bar = document.getElementById("progress-bar");
  const label = document.getElementById("progress-perc");
  if (bar) bar.style.width = perc + "%";
  if (label) label.textContent = perc + "%";
}
function majIndics(delta) {
  if (!delta) return;
  // Seul xp compte désormais
  const dxp = delta.xp ?? delta.points ?? 0;
  indicateurs.xp += dxp;
  renderProgress();
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

/* ---------- Affectation des rôles : ancien stockage (legacy 1 prénom) ---------- */
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

/* ---------- Timeline ---------- */
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

  clearMemo();
  stopTimer();

  let html = `
    <h3 class="mission-title">${m.titre}</h3>
    <div class="mission-meta">
      <span class="role-badge ${roleCls}">${role}</span>
      ${
        m.scoring?.xp || m.points
          ? `&nbsp;•&nbsp; ${m.scoring?.xp ?? m.points} XP`
          : ""
      }
    </div>
    <p>${m.question || ""}</p>
  `;

  if (m.timerSec) {
    html += `
    <div class="timer-wrap"><div id="timer-bar" class="timer-bar"></div></div>
    <div id="timer-legend" class="timer-legend"></div>`;
  }

  if (m.type === "qcm") {
    (m.options || []).forEach((opt, i) => {
      html += `
        <label class="option">
          <input type="checkbox" name="opt" value="${i}" />
          <span>${opt}</span>
        </label>`;
    });
    html += `<div class="actions"><button class="btn" onclick="validerQCM(${index})">Valider</button></div>`;
  } else if (m.type === "choix") {
    (m.options || []).forEach((opt, i) => {
      html += `
        <label class="option">
          <input type="radio" name="opt" value="${i}" />
          <span>${opt}</span>
        </label>`;
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
      </div>`;
  } else {
    html += `<div class="end-screen">Type de mission à venir.</div>`;
  }

  body.innerHTML = html;
  document.getElementById("feedback").textContent = "";

  if (m.timerSec) {
    startTimer(m.timerSec, () => {
      showFeedback(false, "⏱️ Temps écoulé.");
      if (m.penalty?.xp) majIndics({ xp: m.penalty.xp });
      ajouterMemo("Timer", "Temps écoulé");
    });
  }

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

/* ---------- Utilitaires ---------- */
function disableCurrentInputs() {
  document
    .querySelectorAll(
      "#mission-body input, #mission-body textarea, #mission-body button"
    )
    .forEach((el) => {
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
    if (missionLocked.size === missions.length) {
      renderEndScreen();
    }
  }
}

/* ---------- Feedback ---------- */
function showFeedback(ok, msg) {
  const box = document.getElementById("feedback");
  if (!box) return;
  box.className = "feedback " + (ok ? "ok" : "ko");
  box.textContent = (ok ? "✅ " : "❌ ") + msg;
}

/* ---------- Journal minimal + validations ---------- */
function logResult(index, ok, answerText) {
  const m = missions[index];
  results.push({
    id: m.id,
    role: displayRole(m.role),
    titre: m.titre,
    type: m.type,
    ok: !!ok,
    answer: (answerText || "").slice(0, 500),
    ts: new Date().toISOString(),
  });
}
function rewardXpOf(m) {
  return m?.scoring?.xp ?? m.points ?? 0;
}
function applySuccess(m) {
  const xp = rewardXpOf(m);
  majIndics({ xp });
  if (!etatDuJeu.etapesTerminees.includes(etatDuJeu.missionActuelle)) {
    etatDuJeu.etapesTerminees.push(etatDuJeu.missionActuelle);
  }
  disableCurrentInputs();
  showFeedback(true, `Réponse validée ! +${xp} XP`);
}
function applyFailure(msg = "Réponse incorrecte.") {
  disableCurrentInputs();
  showFeedback(false, msg);
}

function validerQCM(index) {
  if (isLocked(index))
    return showFeedback(false, "Cette mission a déjà été validée.");
  const m = missions[index];
  const checkedIdx = Array.from(
    document.querySelectorAll('input[name="opt"]:checked')
  ).map((e) => parseInt(e.value, 10));
  const bonnes = m.bonnesReponses || [];
  const answerText = checkedIdx.length
    ? checkedIdx.map((i) => m.options[i]).join(", ")
    : "—";
  ajouterMemo("Sélection", answerText);

  const ok =
    bonnes.every((r) => checkedIdx.includes(r)) &&
    checkedIdx.length === bonnes.length;

  lockMission(index);
  logResult(index, ok, answerText);
  ok ? applySuccess(m) : applyFailure("Mauvaise réponse ou incomplète.");

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
  const answerText = m.options?.[choisi] ?? "—";
  ajouterMemo("Choix", answerText);

  lockMission(index);
  const ok = choisi === m.bonneReponse;
  logResult(index, ok, answerText);
  ok ? applySuccess(m) : applyFailure("Mauvais choix.");

  advanceToNextInPole(index);
}

function validerTexte(index) {
  if (isLocked(index))
    return showFeedback(false, "Cette mission a déjà été validée.");
  const m = missions[index];
  const v = document.getElementById("reponse-texte")?.value.trim() || "";
  if (!v) return applyFailure("Réponse vide.");

  ajouterMemo("Réponse", v);
  lockMission(index);
  logResult(index, true, v);
  applySuccess(m);
  advanceToNextInPole(index);
}

function validerParMJ(index, accepte) {
  if (isLocked(index))
    return showFeedback(false, "Cette mission a déjà été validée.");
  const m = missions[index];
  const v = document.getElementById("reponse-texte")?.value.trim() || "";
  if (v) ajouterMemo("Réponse", v);

  lockMission(index);
  logResult(index, !!accepte, v);
  if (accepte) {
    applySuccess(m);
  } else {
    applyFailure("Refusé par le MJ.");
  }

  advanceToNextInPole(index);
}

/* ---------- Bilan ---------- */
function renderEndScreen() {
  const end = document.getElementById("end-screen");
  if (!end) return;
  const total = missions.length;
  const okCount = results.filter((r) => r.ok).length;
  const perc = Math.round((indicateurs.xp / XP_MAX) * 100);

  end.style.display = "block";
  end.innerHTML = `
    <h2>🎉 Bilan de mandat</h2>
    <p><strong>Progression :</strong> ${perc}% (${indicateurs.xp} XP / ${XP_MAX} XP)</p>
    <p><strong>Missions validées :</strong> ${okCount}/${total}</p>
    <div class="hero-ctas" style="margin-top:10px">
      <button class="btn" onclick="resetGame()">🔁 Rejouer</button>
    </div>
  `;
}

/* ---------- Reset (Rejouer) ---------- */
function resetGame() {
  // 1) Demande si on veut aussi réaffecter les rôles
  const alsoResetRoles = window.confirm(
    "Souhaites-tu aussi réaffecter les rôles ?\n\nOK = Oui, on vide le formulaire et on le re-remplit\nAnnuler = Non, on garde les rôles actuels"
  );

  // 2) Si oui, on efface les rôles (legacy + multi) et on rouvrira l’overlay
  if (alsoResetRoles) {
    try {
      localStorage.removeItem("aqse_players"); // 1er prénom par pôle (legacy)
      localStorage.removeItem("aqse_players_multi"); // liste complète par pôle
    } catch (e) {
      /* ignore */
    }
  }

  // 3) Reset de l’état du jeu
  etatDuJeu = {
    etapesTerminees: [],
    missionActuelle: null,
    poleActuel: null,
    timer: { handle: null, total: 0, left: 0, expired: false },
    seq: { ordre: [], pos: 0 },
  };
  stopTimer();
  missionLocked.clear();
  results.length = 0;
  indicateurs.xp = 0;

  // 4) UI jeu
  renderProgress();
  renderTimeline();
  clearMemo();
  const end = document.getElementById("end-screen");
  if (end) {
    end.style.display = "none";
    end.innerHTML = "";
  }
  document.getElementById(
    "mission-body"
  ).innerHTML = `<p>Choisis un pôle pour commencer le jeu.</p>`;

  // 5) Si on a choisi de réaffecter les rôles : on reconstruit et on ouvre l’overlay
  if (alsoResetRoles) {
    setupRolesUI(); // régénère le formulaire à partir d’un storage vide
    showRolesOverlay(true); // affiche l’overlay
  } else {
    // Sinon, on s’assure que l’overlay reste fermé
    showRolesOverlay(false);
  }
}

/* =========================================================
   Formulaire multi-personnes par pôle (overlay)
   - UI générée dynamiquement dans #roles-form
   - Stockage:
       * aqse_players        : { Pole: "PremierPrenom", ... }
       * aqse_players_multi  : { Pole: ["Prenom1","Prenom2",...], ... }
   - Compat: loadPlayers() continue de retourner un objet { Pole: "PremierPrenom" }
   ========================================================= */

const ROLES_KEYS = [
  "Présidence",
  "Trésorerie",
  "Secrétariat",
  "Événementiel",
  "Communication",
];

/* ---------- Storage helpers ---------- */
function loadPlayersLegacy() {
  try {
    return JSON.parse(localStorage.getItem("aqse_players") || "{}");
  } catch (e) {
    return {};
  }
}
function savePlayersLegacy(firsts) {
  localStorage.setItem("aqse_players", JSON.stringify(firsts || {}));
}
function loadPlayersMulti() {
  try {
    return JSON.parse(localStorage.getItem("aqse_players_multi") || "{}");
  } catch (e) {
    return {};
  }
}
function savePlayersMulti(all) {
  localStorage.setItem("aqse_players_multi", JSON.stringify(all || {}));
}
// exposé si besoin ailleurs
window.loadPlayersMulti = loadPlayersMulti;

/* ---------- État en mémoire pour l'overlay ---------- */
let playersMultiState = {};

/* Migration / upgrade vers multi si besoin */
function upgradePlayersStorage() {
  const legacy = loadPlayersLegacy();
  const multi = loadPlayersMulti();
  const hasMulti = Object.keys(multi).some(
    (k) => Array.isArray(multi[k]) && multi[k].length
  );
  if (hasMulti) {
    playersMultiState = ROLES_KEYS.reduce((acc, role) => {
      acc[role] = Array.isArray(multi[role]) ? multi[role].slice() : [];
      return acc;
    }, {});
    return;
  }
  // sinon on crée depuis legacy (un prénom → tableau)
  playersMultiState = ROLES_KEYS.reduce((acc, role) => {
    const v = (legacy[role] || "").trim();
    acc[role] = v ? [v] : [];
    return acc;
  }, {});
  savePlayersMulti(playersMultiState);
}

/* ---------- Rendu UI overlay rôles ---------- */
function setupRolesUI() {
  upgradePlayersStorage();

  const form = document.getElementById("roles-form");
  if (!form) {
    console.warn("[roles] #roles-form introuvable.");
    return;
  }
  form.innerHTML = "";

  ROLES_KEYS.forEach((role) => {
    form.appendChild(buildRoleBlock(role));
  });

  const ctas = document.createElement("div");
  ctas.className = "hero-ctas";
  ctas.innerHTML = `
    <button type="submit" class="btn">Commencer</button>
    <button type="button" class="btn secondary" id="roles-reset">Effacer</button>
  `;
  form.appendChild(ctas);

  form.addEventListener("submit", onSubmitRolesForm);
  form.querySelector("#roles-reset").addEventListener("click", () => {
    playersMultiState = ROLES_KEYS.reduce((acc, r) => ((acc[r] = []), acc), {});
    savePlayersMulti(playersMultiState);
    savePlayersLegacy({}); // vide aussi legacy
    setupRolesUI(); // re-render
  });

  // premier rendu des listes
  ROLES_KEYS.forEach((role) => renderPersonList(role));

  // ouvrir si au moins un pôle est vide
  const hasAll = ROLES_KEYS.every(
    (r) => playersMultiState[r] && playersMultiState[r].length > 0
  );
  showRolesOverlay(!hasAll);
}

function buildRoleBlock(role) {
  const block = document.createElement("div");
  block.className = "role-block";

  const header = document.createElement("header");
  header.innerHTML = `
    <span>${role}</span>
    <button type="button" class="add-btn" data-role="${role}">+ Ajouter</button>
  `;

  const list = document.createElement("div");
  list.className = "person-list";
  list.id = `list-${slug(role)}`;

  const row = document.createElement("div");
  row.className = "name-input-row";
  row.style.display = "none";
  row.innerHTML = `
    <input type="text" placeholder="Prénom..." id="input-${slug(role)}" />
    <button type="button" class="ok" data-role="${role}">OK</button>
  `;

  header.querySelector(".add-btn").addEventListener("click", () => {
    row.style.display = row.style.display === "none" ? "flex" : "none";
    const inp = row.querySelector("input");
    if (row.style.display === "flex") {
      inp.focus();
    }
  });
  row.querySelector(".ok").addEventListener("click", () => {
    const inp = row.querySelector("input");
    const val = (inp.value || "").trim();
    if (!val) return;
    addPerson(role, val);
    inp.value = "";
    renderPersonList(role);
  });
  row.querySelector("input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      row.querySelector(".ok").click();
    }
  });

  block.appendChild(header);
  block.appendChild(list);
  block.appendChild(row);
  return block;
}

function renderPersonList(role) {
  const list = document.getElementById(`list-${slug(role)}`);
  if (!list) return;
  list.innerHTML = "";

  const arr = playersMultiState[role] || [];
  if (!arr.length) {
    const empty = document.createElement("span");
    empty.className = "muted";
    empty.textContent = "Aucune personne ajoutée.";
    list.appendChild(empty);
    return;
  }

  arr.forEach((name, idx) => {
    const chip = document.createElement("span");
    chip.className = "name-chip";
    chip.innerHTML = `
      ${escapeHtml(name)}
      <button type="button" class="remove" title="Retirer" aria-label="Retirer">×</button>
    `;
    chip.querySelector(".remove").addEventListener("click", () => {
      removePerson(role, idx);
      renderPersonList(role);
    });
    list.appendChild(chip);
  });
}

function addPerson(role, name) {
  const clean = name.replace(/\s+/g, " ").trim();
  if (!clean) return;
  const arr = playersMultiState[role] || [];
  const exists = arr.some((n) => n.toLowerCase() === clean.toLowerCase());
  if (!exists) {
    arr.push(clean);
    playersMultiState[role] = arr;
    savePlayersMulti(playersMultiState);
    // MAJ legacy (1er prénom par pôle)
    const legacy = ROLES_KEYS.reduce((acc, r) => {
      acc[r] =
        playersMultiState[r] && playersMultiState[r][0]
          ? playersMultiState[r][0]
          : "";
      return acc;
    }, {});
    savePlayersLegacy(legacy);
  }
}

function removePerson(role, idx) {
  const arr = playersMultiState[role] || [];
  if (idx >= 0 && idx < arr.length) {
    arr.splice(idx, 1);
    playersMultiState[role] = arr;
    savePlayersMulti(playersMultiState);
    // MAJ legacy
    const legacy = ROLES_KEYS.reduce((acc, r) => {
      acc[r] =
        playersMultiState[r] && playersMultiState[r][0]
          ? playersMultiState[r][0]
          : "";
      return acc;
    }, {});
    savePlayersLegacy(legacy);
  }
}

function onSubmitRolesForm(e) {
  e.preventDefault();
  const ok = ROLES_KEYS.every(
    (r) => playersMultiState[r] && playersMultiState[r].length > 0
  );
  if (!ok) {
    alert("Merci d’ajouter au moins une personne dans chaque pôle.");
    return;
  }
  showRolesOverlay(false);
}

/* Utils divers pour l’overlay */
function slug(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}
function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        s
      ])
  );
}

/* ---------- Init ---------- */
window.onload = () => {
  computeXpMax();
  renderProgress();

  // Nouveau formulaire multi‑personnes
  setupRolesUI();

  renderTimeline();
  clearMemo();

  // bouton rejouer (header)
  document.getElementById("btn-reset").onclick = resetGame;
};

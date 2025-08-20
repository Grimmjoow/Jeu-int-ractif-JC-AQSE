/************  Jeu — 4 jeux séquentiels (barre % par XP)  ************/

// On ne s’appuie plus sur les pôles pour la timeline : 4 jeux fixes.
const POLES_ORDER = ["Jeu 1", "Jeu 2", "Jeu 3", "Jeu 4"];

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
  timer: { handle: null, total: 0, left: 0, expired: false },
  // Séquencement strict : 0 = Jeu 1 débloqué uniquement au début
  unlockedIndex: 0,
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

/* ---------- Utilitaires ---------- */
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
  const dxp = delta.xp ?? delta.points ?? 0;
  indicateurs.xp += dxp;
  renderProgress();
}

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

/* ---------- Timeline (4 boutons) ---------- */
function renderTimeline() {
  const wrap = document.getElementById("steps");
  if (!wrap) return;
  wrap.innerHTML = "";

  for (let i = 0; i < 4; i++) {
    const btn = document.createElement("button");
    btn.className = "step-btn";
    btn.textContent = `${i + 1}. Jeu ${i + 1}`;
    btn.dataset.index = String(i);
    btn.disabled = i > etatDuJeu.unlockedIndex; // 🔒 séquentiel
    btn.onclick = () => loadStep(i);
    wrap.appendChild(btn);
  }
  setTimelineStates();
}
function setTimelineStates() {
  const buttons = document.querySelectorAll(".step-btn");
  buttons.forEach((btn) => {
    btn.classList.remove("locked", "current", "done");
    const idx = parseInt(btn.dataset.index, 10);
    if (idx > etatDuJeu.unlockedIndex) btn.classList.add("locked");
    if (etatDuJeu.missionActuelle === idx) btn.classList.add("current");
    if (missionLocked.has(idx)) btn.classList.add("done");
  });
}

/* ---------- Affichage mission ---------- */
function renderMission(index) {
  const m = missions[index];
  const body = document.getElementById("mission-body");
  if (!body) return;

  clearMemo();
  stopTimer();

  let html = `
    <h3 class="mission-title">${m.titre}</h3>
    <div class="mission-meta">
      <span class="role-badge">Jeu ${index + 1}</span>
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
      <div id="timer-legend" class="timer-legend"></div>
    `;
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
            : `<button class="btn" onclick="validerTexte(${index})">Valider</button>`
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

  if (isLocked(index)) {
    disableCurrentInputs();
    ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
  }
}

/* ---------- Navigation (séquentielle) ---------- */
function loadStep(index) {
  // Interdit d'ouvrir un jeu verrouillé
  if (index > etatDuJeu.unlockedIndex) {
    showFeedback(false, "Ce jeu est verrouillé. Termine d’abord le précédent.");
    return;
  }
  etatDuJeu.missionActuelle = index;
  setTimelineStates();
  renderMission(index);
}

function advanceToNext(index) {
  // Débloque seulement si on vient de valider le jeu actuellement ouvert
  if (index === etatDuJeu.unlockedIndex) {
    etatDuJeu.unlockedIndex = Math.min(3, etatDuJeu.unlockedIndex + 1);
  }
  setTimelineStates();

  // S’il y a un jeu suivant, on l’ouvre, sinon écran de fin
  if (index < 3) {
    loadStep(index + 1);
  } else {
    renderEndScreen();
  }
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
function applySuccess(index, m) {
  const xp = rewardXpOf(m);
  majIndics({ xp });
  if (!etatDuJeu.etapesTerminees.includes(index)) {
    etatDuJeu.etapesTerminees.push(index);
  }
  disableCurrentInputs();
  showFeedback(true, `Réponse validée ! +${xp} XP`);
  advanceToNext(index);
}
function applyFailure(msg = "Réponse incorrecte.") {
  disableCurrentInputs();
  showFeedback(false, msg);
}

/* ---------- Validations ---------- */
function validerQCM(index) {
  if (isLocked(index)) return showFeedback(false, "Ce jeu a déjà été validé.");
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
  ok ? applySuccess(index, m) : applyFailure("Mauvaise réponse ou incomplète.");
}

function validerChoix(index) {
  if (isLocked(index)) return showFeedback(false, "Ce jeu a déjà été validé.");
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
  ok ? applySuccess(index, m) : applyFailure("Mauvais choix.");
}

function validerTexte(index) {
  if (isLocked(index)) return showFeedback(false, "Ce jeu a déjà été validé.");
  const m = missions[index];
  const v = document.getElementById("reponse-texte")?.value.trim() || "";
  if (!v) return applyFailure("Réponse vide.");

  ajouterMemo("Réponse", v);
  lockMission(index);
  logResult(index, true, v);
  applySuccess(index, m);
}

function validerParMJ(index, accepte) {
  if (isLocked(index)) return showFeedback(false, "Ce jeu a déjà été validé.");
  const m = missions[index];
  const v = document.getElementById("reponse-texte")?.value.trim() || "";
  if (v) ajouterMemo("Réponse", v);

  lockMission(index);
  logResult(index, !!accepte, v);
  if (accepte) {
    applySuccess(index, m);
  } else {
    applyFailure("Refusé par le MJ.");
  }
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
    <h2>🎉 Bilan</h2>
    <p><strong>Progression :</strong> ${perc}% (${indicateurs.xp} XP / ${XP_MAX} XP)</p>
    <p><strong>Jeux validés :</strong> ${okCount}/${total}</p>
    <div class="hero-ctas" style="margin-top:10px">
      <button class="btn" onclick="resetGame()">🔁 Rejouer</button>
    </div>
  `;
}

/* ---------- Reset (Rejouer) ---------- */
function resetGame() {
  const alsoResetRoles = window.confirm(
    "Souhaites-tu aussi réaffecter les rôles ?\n\nOK = Oui, on vide le formulaire et on le re-remplit\nAnnuler = Non, on garde les rôles actuels"
  );
  if (alsoResetRoles) {
    try {
      localStorage.removeItem("aqse_players");
      localStorage.removeItem("aqse_players_multi");
    } catch (e) {}
  }

  etatDuJeu = {
    etapesTerminees: [],
    missionActuelle: null,
    timer: { handle: null, total: 0, left: 0, expired: false },
    unlockedIndex: 0,
  };
  stopTimer();
  missionLocked.clear();
  results.length = 0;
  indicateurs.xp = 0;

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
  ).innerHTML = `<p>Commence par le Jeu 1.</p>`;

  if (alsoResetRoles) {
    setupRolesUI?.();
    if (typeof showRolesOverlay === "function") showRolesOverlay(true);
  } else {
    if (typeof showRolesOverlay === "function") showRolesOverlay(false);
  }
}

/* =========================================================
   Overlay rôles — multi personnes (optionnel, si tu l’utilises)
   -> Si tu n’utilises pas l’overlay des rôles, tu peux supprimer
      toute la section ci-dessous + l’appel setupRolesUI().
   ========================================================= */
const ROLES_KEYS = [
  "Présidence",
  "Trésorerie",
  "Secrétariat",
  "Événementiel",
  "Communication",
];

function showRolesOverlay(show = true) {
  const ov = document.getElementById("roles-overlay");
  if (ov) ov.classList.toggle("hidden", !show);
}

/* --- stockage --- */
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
window.loadPlayersMulti = loadPlayersMulti;

let playersMultiState = {};
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
  playersMultiState = ROLES_KEYS.reduce((acc, role) => {
    const v = (legacy[role] || "").trim();
    acc[role] = v ? [v] : [];
    return acc;
  }, {});
  savePlayersMulti(playersMultiState);
}

/* --- UI overlay --- */
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
  const resetBtn = form.querySelector("#roles-reset");
  resetBtn.addEventListener("click", () => {
    playersMultiState = ROLES_KEYS.reduce((acc, r) => ((acc[r] = []), acc), {});
    savePlayersMulti(playersMultiState);
    savePlayersLegacy({});
    setupRolesUI();
  });

  ROLES_KEYS.forEach((role) => renderPersonList(role));

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

/* utils overlay */
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

/* =========================================================
   INIT
========================================================= */
window.onload = () => {
  // total XP & UI
  computeXpMax();
  renderProgress();

  // overlay rôles (facultatif)
  setupRolesUI?.(); // si l’overlay existe dans ton HTML, il sera initialisé

  // timeline 4 jeux et écran de départ
  renderTimeline();
  clearMemo();
  const end = document.getElementById("end-screen");
  if (end) {
    end.style.display = "none";
    end.innerHTML = "";
  }
  const body = document.getElementById("mission-body");
  if (body) body.innerHTML = `<p>Commence par le Jeu 1.</p>`;

  // bouton rejouer
  const btnReset = document.getElementById("btn-reset");
  if (btnReset) btnReset.onclick = resetGame;
};

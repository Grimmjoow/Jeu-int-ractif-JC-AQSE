/************  Étape 2 + Étape 4 (bilan, export, polish)  ************/

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

// Journal des résultats (pour export)
const results = []; // {id, role, titre, type, ok, answer, ts}

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

/* ---------- Affectation des rôles ---------- */
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
    <p>${m.question || ""}</p>
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
    // si tous les pôles terminés → bilan
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

/* ---------- Journalisation + validations ---------- */
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
  logResult(index, true, v); // auto-validé
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

/* ---------- Bilan / Écran de fin ---------- */
function renderEndScreen() {
  const end = document.getElementById("end-screen");
  if (!end) return;
  const players = loadPlayers();
  const total = missions.length;
  const okCount = results.filter((r) => r.ok).length;

  end.style.display = "block";
  end.innerHTML = `
    <h2>🎉 Bilan de mandat</h2>
    <p><strong>XP :</strong> ${indicateurs.xp} &nbsp; • &nbsp;
       <strong>CA :</strong> ${indicateurs.ca} &nbsp; • &nbsp;
       <strong>Budget :</strong> ${indicateurs.budget} &nbsp; • &nbsp;
       <strong>Cohésion :</strong> ${indicateurs.cohesion}
    </p>
    <p><strong>Missions validées :</strong> ${okCount}/${total}</p>

    <div class="card" style="margin-top:8px">
      <h3>Analyse rapide</h3>
      <ul>
        ${
          indicateurs.cohesion < 10
            ? "<li>Cohésion perfectible : prévoir plus de rituels d’équipe.</li>"
            : ""
        }
        ${
          indicateurs.budget < 0
            ? "<li>Budget dépassé : revoir la priorisation des dépenses.</li>"
            : ""
        }
        ${
          indicateurs.ca > 0
            ? "<li>Business activé : continuez l’effort de prospection.</li>"
            : ""
        }
      </ul>
    </div>

    <div class="hero-ctas" style="margin-top:10px">
      <button class="btn" onclick="exportCSV()">⬇️ Export CSV</button>
      <button class="btn secondary" onclick="sendToNetlify()">📤 Envoyer (Netlify)</button>
      <button class="btn" onclick="resetGame()">🔁 Rejouer</button>
    </div>
  `;
}

/* ---------- Export CSV ---------- */
function exportCSV() {
  const players = loadPlayers();
  const header = [
    "id",
    "role",
    "titre",
    "type",
    "ok",
    "answer",
    "timestamp",
    "players",
    "xp",
    "ca",
    "budget",
    "cohesion",
  ];
  const rows = results.map((r) => [
    r.id,
    r.role,
    r.titre,
    r.type,
    r.ok ? "1" : "0",
    r.answer || "",
    r.ts,
    JSON.stringify(players),
    indicateurs.xp,
    indicateurs.ca,
    indicateurs.budget,
    indicateurs.cohesion,
  ]);
  const all = [header, ...rows];
  const csv = all
    .map((line) =>
      line.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "resultats_jeu_AQSE.csv";
  a.click();
}

/* ---------- Envoi Netlify Forms ---------- */
async function sendToNetlify() {
  const players = loadPlayers();
  const form = document.querySelector('form[name="resultat-jeu"]');
  if (!form) {
    alert("Form Netlify introuvable.");
    return;
  }
  form.querySelector('[name="players"]').value = JSON.stringify(players);
  form.querySelector('[name="indicateurs"]').value =
    JSON.stringify(indicateurs);
  form.querySelector('[name="resultats"]').value = JSON.stringify(results);

  // Fallback simple : soumission via fetch (application/x-www-form-urlencoded)
  const data = {
    "form-name": "resultat-jeu",
    players: form.querySelector('[name="players"]').value,
    indicateurs: form.querySelector('[name="indicateurs"]').value,
    resultats: form.querySelector('[name="resultats"]').value,
  };
  const encoded = Object.keys(data)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(data[k]))
    .join("&");

  try {
    await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encoded,
    });
    alert("Résultats envoyés (Netlify).");
  } catch (e) {
    console.error(e);
    alert("Échec de l'envoi Netlify (voir console).");
  }
}

/* ---------- Reset ---------- */
function resetGame() {
  // on garde les joueurs, mais on reset tout le reste
  etatDuJeu = {
    etapesTerminees: [],
    missionActuelle: null,
    poleActuel: null,
    timer: { handle: null, total: 0, left: 0, expired: false },
    seq: { ordre: [], pos: 0 },
  };
  missionLocked.clear();
  results.length = 0;
  indicateurs.xp =
    indicateurs.ca =
    indicateurs.budget =
    indicateurs.cohesion =
      0;
  renderHeader();
  renderTimeline();
  clearMemo();
  document.getElementById(
    "mission-body"
  ).innerHTML = `<p>Choisis un pôle pour commencer le jeu.</p>`;
  const end = document.getElementById("end-screen");
  if (end) {
    end.style.display = "none";
    end.innerHTML = "";
  }
}

/* ---------- Init ---------- */
window.onload = () => {
  const players = loadPlayers();
  const hasAll = POLES_ORDER.every((p) => (players[p] || "").length > 0);
  showRolesOverlay(!hasAll);
  initRolesOverlay();

  renderHeader();
  renderTimeline();
  clearMemo();

  // Raccourcis header
  document.getElementById("btn-export").onclick = exportCSV;
  document.getElementById("btn-send").onclick = sendToNetlify;
};

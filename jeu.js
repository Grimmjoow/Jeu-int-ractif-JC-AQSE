/************  MODE : ACCÈS LIBRE AUX ÉTAPES (par pôle)  ************/
const MODE_LIBRE = true;
/*********************************************************/

let score = 0;
let etatDuJeu = {
  etapesTerminees: [], // indices de missions terminées
  missionActuelle: null, // index global dans missions[]
  poleActuel: null, // libellé de pôle courant (Présidence, etc.)
};

/* ---------- Utils rôles ---------- */
function normalize(str = "") {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Mapping d’affichage : Partenariats/Dév. -> Présidence ; Secrétariat Général -> Secrétariat
function displayRole(roleLabel = "") {
  const r = normalize(roleLabel);
  if (!roleLabel) return "Étape";
  if (
    r.includes("partenariat") ||
    r.includes("partenaires") ||
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
  const role = displayRole(roleLabel); // utiliser le libellé mappé
  const r = normalize(role);
  if (r.includes("presidence")) return "role-pres";
  if (r.includes("tresorerie")) return "role-treso";
  if (r.includes("secretariat")) return "role-sec";
  if (r.includes("evenementiel")) return "role-event";
  if (r.includes("communication")) return "role-com";
  return "";
}

/* ---------- Ordre fixe des pôles demandé ---------- */
const POLES_ORDER = [
  "Présidence",
  "Trésorerie",
  "Secrétariat",
  "Événementiel",
  "Communication",
];

/* ---------- Indexation des missions par pôle ---------- */
function buildPoleIndex() {
  // map: "Présidence" -> [indices de missions ...]
  const map = {};
  POLES_ORDER.forEach((p) => (map[p] = []));
  missions.forEach((m, i) => {
    const p = displayRole(m.role);
    if (map[p]) map[p].push(i);
  });
  return map;
}

/* ---------- TIMELINE (5 boutons) ---------- */
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
    btn.disabled = false; // tout cliquable
    btn.classList.remove("locked", "current", "done");
    // surligner le pôle courant si missionActuelle appartient à ce pôle
    const poleOfCurrent =
      etatDuJeu.missionActuelle != null
        ? displayRole(missions[etatDuJeu.missionActuelle].role)
        : null;
    if (btn.dataset.pole === poleOfCurrent) btn.classList.add("current");
  });
}

/* ---------- Barre de progression ---------- */
function updateProgress() {
  const done = etatDuJeu.etapesTerminees.length;
  const total = missions.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const bar = document.getElementById("progress-bar");
  if (bar) bar.style.width = pct + "%";
}

/* ---------- Feedback ---------- */
function showFeedback(ok, msg) {
  const box = document.getElementById("feedback");
  if (!box) return;
  box.className = "feedback " + (ok ? "ok" : "ko");
  box.textContent = (ok ? "✅ " : "❌ ") + msg;
}

/* ---------- Sous-nav missions du même pôle ---------- */
function renderSubnav(poleName, poleIdxs, activeIndex) {
  if (poleIdxs.length <= 1) return ""; // pas de sous-nav si 1 seule mission

  const currentPos = poleIdxs.indexOf(activeIndex);
  const hasPrev = currentPos > 0;
  const hasNext = currentPos < poleIdxs.length - 1;

  return `
    <div class="hero-ctas" style="margin-top:8px">
      <button class="btn secondary" ${
        hasPrev ? "" : "disabled"
      } onclick="gotoPoleMission('${poleName}', ${
    currentPos - 1
  })">⟵ Précédente</button>
      <span class="muted">Mission ${currentPos + 1} / ${
    poleIdxs.length
  } — ${poleName}</span>
      <button class="btn" ${
        hasNext ? "" : "disabled"
      } onclick="gotoPoleMission('${poleName}', ${
    currentPos + 1
  })">Suivante ⟶</button>
    </div>
  `;
}

function gotoPoleMission(poleName, pos) {
  const map = buildPoleIndex();
  const list = map[poleName] || [];
  if (pos < 0 || pos >= list.length) return;
  const idx = list[pos];
  loadStep(idx, poleName);
}

/* ---------- Affichage mission ---------- */
function renderMission(index) {
  const m = missions[index];
  const body = document.getElementById("mission-body");
  if (!body) return;
  const role = displayRole(m.role);
  const roleCls = roleClass(m.role);

  // Construire la sous-nav si plusieurs missions pour ce pôle
  const map = buildPoleIndex();
  const subnav = renderSubnav(role, map[role] || [], index);

  let html = `
    <h3 class="mission-title">${m.titre}</h3>
    <div class="mission-meta">
      <span class="role-badge ${roleCls}">${role}</span>
      &nbsp;•&nbsp; ${m.points} XP
    </div>
    <p>${m.question}</p>
  `;

  if (m.type === "qcm") {
    m.options.forEach((opt, i) => {
      html += `
        <label class="option">
          <input type="checkbox" name="opt" value="${i}" />
          <span>${opt}</span>
        </label>
      `;
    });
    html += `<div class="actions"><button class="btn" onclick="validerQCM(${index})">Valider</button></div>`;
  } else if (m.type === "choix") {
    m.options.forEach((opt, i) => {
      html += `
        <label class="option">
          <input type="radio" name="opt" value="${i}" />
          <span>${opt}</span>
        </label>
      `;
    });
    html += `<div class="actions"><button class="btn" onclick="validerChoix(${index})">Valider</button></div>`;
  } else {
    html += `<div class="end-screen">Mission non interactive implémentée ultérieurement.</div>`;
  }

  body.innerHTML = html + subnav;
  const fb = document.getElementById("feedback");
  if (fb) fb.textContent = "";
}

/* ---------- Navigation ---------- */
function loadPole(roleName) {
  const map = buildPoleIndex();
  const list = map[roleName] || [];
  if (list.length === 0) {
    const body = document.getElementById("mission-body");
    if (body)
      body.innerHTML = `<p>Aucune mission définie pour ${roleName}.</p>`;
    return;
  }
  // 1ʳᵉ mission de ce pôle
  loadStep(list[0], roleName);
}

function loadStep(index, poleName = null) {
  etatDuJeu.missionActuelle = index;
  etatDuJeu.poleActuel = poleName || displayRole(missions[index].role);
  setTimelineStates();
  renderMission(index);
}

/* ---------- Validations ---------- */
function validerQCM(index) {
  const m = missions[index];
  const checked = Array.from(
    document.querySelectorAll('input[name="opt"]:checked')
  ).map((e) => parseInt(e.value, 10));
  const bonnes = m.bonnesReponses || [];
  const estBonne =
    bonnes.every((r) => checked.includes(r)) &&
    checked.length === bonnes.length;

  if (estBonne) {
    score += m.points;
    document.getElementById("score-value").textContent = score;
    if (!etatDuJeu.etapesTerminees.includes(index))
      etatDuJeu.etapesTerminees.push(index);
    setTimelineStates();
    updateProgress();
    showFeedback(true, "Bonne réponse !");
    verifierFin();
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
  const estBonne = choisi === m.bonneReponse;

  if (estBonne) {
    score += m.points;
    document.getElementById("score-value").textContent = score;
    if (!etatDuJeu.etapesTerminees.includes(index))
      etatDuJeu.etapesTerminees.push(index);
    setTimelineStates();
    updateProgress();
    showFeedback(true, "Bonne réponse !");
    verifierFin();
  } else {
    showFeedback(false, "Mauvais choix.");
  }
}

/* ---------- Fin ---------- */
function verifierFin() {
  if (etatDuJeu.etapesTerminees.length === missions.length) {
    const body = document.getElementById("mission-body");
    if (body) {
      body.innerHTML = `
        <div class="end-screen">
          <h3>🎉 Félicitations !</h3>
          <p>Vous avez terminé le mandat avec un total de <strong>${score} XP</strong>.</p>
        </div>
      `;
    }
    const fb = document.getElementById("feedback");
    if (fb) fb.textContent = "";
  }
}

/* ---------- Init ---------- */
window.onload = () => {
  renderTimeline(); // 5 boutons : Présidence, Tréso, Secrétariat, Évent, Com
  updateProgress(); // initialise la barre
};

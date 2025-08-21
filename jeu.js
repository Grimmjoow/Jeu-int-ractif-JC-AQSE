/************  Jeu — 4 jeux libres (barre % par XP)  ************/

// On n’utilise pas les pôles pour la timeline : 4 jeux fixes.
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
};

// Journal simple si besoin d’un bilan (non exporté)
const results = [];

// Verrouillage : une seule validation par jeu
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
  if (el) el.innerHTML = `<p class="muted">${msg}</p>`;
}
function ajouterMemo(label, valeur) {
  const el = document.getElementById("memo-body");
  if (!el) return;
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
    // Jeux accessibles dès le départ ; se verrouillent uniquement une fois terminés
    btn.disabled = isLocked(i);
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
    if (isLocked(idx)) btn.classList.add("locked", "done");
    if (etatDuJeu.missionActuelle === idx) btn.classList.add("current");
  });
}

/* ---------- Affichage mission (tête, timers et délégation) ---------- */
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
    ${m.question ? `<p>${m.question}</p>` : ""}
  `;

  if (m.timerSec) {
    html += `
      <div class="timer-wrap"><div id="timer-bar" class="timer-bar"></div></div>
      <div id="timer-legend" class="timer-legend"></div>
    `;
  }

  body.innerHTML = html;

  // Délégation par type
  if (m.type === "qcm" || m.type === "choix" || m.type === "texte") {
    renderNativeMissionUI(index, m); // utilise validerQCM / validerChoix / validerTexte
  } else if (m.type === "brainstorm") {
    if (isLocked(index)) {
      disableCurrentInputs();
      ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
      return;
    }
    renderBrainstorm(index); // doit exister dans ton fichier (Jeu 1)
  } else if (m.type === "jeu2") {
    if (isLocked(index)) {
      disableCurrentInputs();
      ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
      return;
    }
    renderJeu2(index); // doit exister dans ton fichier (Jeu 2)
  } else if (m.type === "jeu3") {
    if (isLocked(index)) {
      disableCurrentInputs();
      ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
      return;
    }
    if (typeof renderJeu3 === "function") renderJeu3(index);
    else body.innerHTML += `<div class="end-screen">Jeu 3 à venir.</div>`;
  } else if (m.type === "jeu4") {
    if (isLocked(index)) {
      disableCurrentInputs();
      ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
      return;
    }
    if (typeof renderJeu4 === "function") renderJeu4(index);
    else body.innerHTML += `<div class="end-screen">Jeu 4 à venir.</div>`;
  } else {
    body.innerHTML += `<div class="end-screen">Type de mission à venir.</div>`;
  }

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

/* Helpers UI pour qcm/choix/texte */
function renderNativeMissionUI(index, m) {
  const body = document.getElementById("mission-body");
  let html = body.innerHTML;

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
            ? `<button class="btn" onclick="validerParMJ(${index}, true)">✅ Valider (MJ)</button>
             <button class="btn secondary" onclick="validerParMJ(${index}, false)">❌ Refuser (MJ)</button>`
            : `<button class="btn" onclick="validerTexte(${index})">Valider</button>`
        }
      </div>`;
  }

  body.innerHTML = html;
}

/* ---------- Navigation ---------- */
function loadStep(index) {
  if (isLocked(index)) {
    showFeedback(false, "Ce jeu est déjà terminé.");
    return;
  }
  etatDuJeu.missionActuelle = index;
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
    answer: (answerText || "").slice(0, 1000),
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
  showFeedback(true, `Jeu validé ! +${xp} XP`);
  // verrouille définitivement ce jeu
  lockMission(index);
  setTimelineStates();
  // si tous les jeux sont verrouillés, on affiche le bilan
  if (missionLocked.size === 4) renderEndScreen();
}
function applyFailure(msg = "Réponse incorrecte.") {
  disableCurrentInputs();
  showFeedback(false, msg);
}

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
  logResult(index, true, v);
  applySuccess(index, m);
}

function validerParMJ(index, accepte) {
  if (isLocked(index)) return showFeedback(false, "Ce jeu a déjà été validé.");
  const m = missions[index];
  const v = document.getElementById("reponse-texte")?.value.trim() || "";
  if (v) ajouterMemo("Réponse", v);

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
  ).innerHTML = `<p>Choisis un jeu pour commencer.</p>`;

  if (alsoResetRoles) {
    if (typeof setupRolesUI === "function") setupRolesUI();
    if (typeof showRolesOverlay === "function") showRolesOverlay(true);
  } else {
    if (typeof showRolesOverlay === "function") showRolesOverlay(false);
  }
}

/* =========================================================
   INIT
========================================================= */
window.onload = () => {
  // total XP & UI
  computeXpMax();
  renderProgress();

  // overlay rôles (facultatif — si présent dans ton HTML)
  if (typeof setupRolesUI === "function") setupRolesUI();

  // timeline 4 jeux et écran de départ
  renderTimeline();
  clearMemo();
  const end = document.getElementById("end-screen");
  if (end) {
    end.style.display = "none";
    end.innerHTML = "";
  }
  const body = document.getElementById("mission-body");
  if (body) body.innerHTML = `<p>Choisis un jeu pour commencer.</p>`;

  // bouton rejouer
  const btnReset = document.getElementById("btn-reset");
  if (btnReset) btnReset.onclick = resetGame;
};

/* =========================================================
   JEU 1 : Brainstorm en 2 étapes
   - Étape 1 : saisie libre d’idées + sélection de 5
   - Étape 2 : étiquetage des 5 idées parmi 5 pôles
   ========================================================= */

function getBrainstormState(index) {
  if (!etatDuJeu._brainstorm) etatDuJeu._brainstorm = {};
  if (!etatDuJeu._brainstorm[index]) {
    etatDuJeu._brainstorm[index] = { phase: 1, ideas: [] }; // {text, selected:false, tag:null}
  }
  return etatDuJeu._brainstorm[index];
}

function renderBrainstorm(index) {
  const m = missions[index];
  const body = document.getElementById("mission-body");
  if (!body) return;

  const state = getBrainstormState(index);
  const roles = m.config?.roles || [
    "Présidence",
    "Trésorerie",
    "Secrétariat",
    "Événementiel",
    "Communication",
  ];
  const maxSel = m.config?.maxSelected ?? 5;
  const minIdeas = m.config?.minIdeas ?? 5;

  let html = `
    <h3 class="mission-title">${m.titre}</h3>
    <div class="mission-meta">
      <span class="role-badge">Jeu 1</span>
      ${m.scoring?.xp ? `&nbsp;•&nbsp; ${m.scoring.xp} XP` : ""}
    </div>
    <p>${m.question || ""}</p>
  `;

  if (state.phase === 1) {
    html += `
      <div class="card">
        <h4 style="margin:6px 0">Étape 1 — Brainstorm</h4>
        <div class="mj-badge">Ajoute des idées (≥ ${minIdeas}), puis <strong>sélectionne ${maxSel}</strong>.</div>
        <div style="display:flex; gap:8px; margin:8px 0;">
          <input id="idea-input" class="input" placeholder="Écris une idée…" />
          <button class="btn" id="btn-add-idea">Ajouter</button>
        </div>
        <div id="ideas-list" class="memo-body" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
        <div class="muted" style="margin-top:8px">
          Idées : <span id="ideas-count">0</span> • Sélectionnées : <span id="sel-count">0</span> / ${maxSel}
        </div>
        <div class="actions" style="margin-top:10px;">
          <button class="btn" id="btn-phase2" disabled>Passer à l’étape 2</button>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="card">
        <h4 style="margin:6px 0">Étape 2 — Étiquetage des ${maxSel} idées</h4>
        <div class="mj-badge">Clique sur un pôle pour attribuer l’idée.</div>
        <div id="tagging-list" class="memo-body" style="display:grid; gap:10px;"></div>
        <div class="actions" style="margin-top:10px;">
          <button class="btn" id="btn-validate-brainstorm" disabled>Valider le Jeu 1</button>
        </div>
      </div>
    `;
  }

  body.innerHTML = html;

  if (state.phase === 1) {
    setupBrainstormPhase1(index, minIdeas, maxSel);
  } else {
    setupBrainstormPhase2(index, roles, maxSel);
  }

  if (isLocked(index)) {
    disableCurrentInputs();
    ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
  }
}

/* ===== PHASE 1 : Ajout & sélection ===== */
function setupBrainstormPhase1(index, minIdeas, maxSel) {
  const state = getBrainstormState(index);

  const input = document.getElementById("idea-input");
  const btnAdd = document.getElementById("btn-add-idea");
  const list = document.getElementById("ideas-list");
  const btnNext = document.getElementById("btn-phase2");
  const ideasCount = document.getElementById("ideas-count");
  const selCount = document.getElementById("sel-count");

  function refreshList() {
    list.innerHTML = "";
    state.ideas.forEach((it, i) => {
      const el = document.createElement("div");
      el.className = "memo-line";
      el.style.cursor = "pointer";
      el.style.display = "inline-flex";
      el.style.gap = "8px";
      el.style.alignItems = "center";

      const chip = document.createElement("span");
      chip.textContent = it.text;
      chip.style.fontWeight = "700";
      chip.style.padding = "4px 8px";
      chip.style.borderRadius = "999px";
      chip.style.border = "1px solid rgba(255,255,255,0.10)";
      chip.style.background = it.selected
        ? "rgba(59,130,246,0.15)"
        : "rgba(255,255,255,0.06)";

      const del = document.createElement("button");
      del.className = "btn secondary";
      del.textContent = "×";
      del.title = "Supprimer";
      del.style.padding = "4px 8px";
      del.onclick = (e) => {
        e.stopPropagation();
        state.ideas.splice(i, 1);
        refreshList();
      };

      el.onclick = () => {
        const selectedCount = state.ideas.filter((x) => x.selected).length;
        if (!it.selected && selectedCount >= maxSel) return;
        it.selected = !it.selected;
        refreshList();
      };

      el.appendChild(chip);
      el.appendChild(del);
      list.appendChild(el);
    });

    const selectedCount = state.ideas.filter((x) => x.selected).length;
    ideasCount.textContent = String(state.ideas.length);
    selCount.textContent = String(selectedCount);

    btnNext.disabled = !(
      state.ideas.length >= minIdeas && selectedCount === maxSel
    );
  }

  btnAdd.onclick = () => {
    const v = (input.value || "").trim();
    if (!v) return;
    state.ideas.push({ text: v, selected: false, tag: null });
    input.value = "";
    refreshList();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnAdd.click();
    }
  });

  btnNext.onclick = () => {
    state.phase = 2;
    renderBrainstorm(index);
  };

  refreshList();
}

/* ===== PHASE 2 : Étiquetage ===== */
function setupBrainstormPhase2(index, roles, expectedCount) {
  const state = getBrainstormState(index);
  const selected = state.ideas.filter((x) => x.selected);
  const wrap = document.getElementById("tagging-list");
  const btnValidate = document.getElementById("btn-validate-brainstorm");

  function renderRows() {
    wrap.innerHTML = "";
    selected.forEach((it, i) => {
      const row = document.createElement("div");
      row.className = "memo-line";
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr auto";
      row.style.alignItems = "center";
      row.style.gap = "8px";

      const label = document.createElement("div");
      label.innerHTML = `<strong>Idée ${i + 1} :</strong> ${escapeHtml(
        it.text
      )}`;

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.flexWrap = "wrap";
      actions.style.gap = "6px";

      roles.forEach((role) => {
        const b = document.createElement("button");
        b.className = "btn" + (it.tag === role ? "" : " secondary");
        b.textContent = role;
        b.style.padding = "6px 10px";
        b.onclick = () => {
          it.tag = role;
          renderRows();
        };
        actions.appendChild(b);
      });

      if (it.tag) {
        const badge = document.createElement("span");
        badge.className = "role-badge";
        badge.textContent = it.tag;
        badge.style.marginLeft = "8px";
        label.appendChild(badge);
      }

      row.appendChild(label);
      row.appendChild(actions);
      wrap.appendChild(row);
    });

    btnValidate.disabled = !selected.every((x) => !!x.tag);
  }

  btnValidate.onclick = () => {
    const m = missions[index];
    const reponses = selected.map((x) => `${x.text} → ${x.tag}`).join(" | ");
    ajouterMemo("Idées retenues", reponses);
    lockMission(index);
    logResult(index, true, reponses);
    applySuccess(index, m); // débloque Jeu 2
  };

  renderRows();
}

/* =========================================================
   JEU 2 — Séquence 6 étapes
   1) Textes libres par pôle (Présidence/Trésorerie/Secrétariat)
   2) Texte libre par Présidence
   3) QCM commun #1
   4) QCM commun #2
   5) Brainstorm (liste d’idées)
   6) Budget par pôle (liste) + justification
   Validation finale -> XP + déblocage Jeu 3
========================================================= */

function getJeu2State(index) {
  if (!etatDuJeu._jeu2) etatDuJeu._jeu2 = {};
  if (!etatDuJeu._jeu2[index]) {
    etatDuJeu._jeu2[index] = {
      step: 1,
      // données récoltées :
      step1: { Presidence: "", Tresorerie: "", Secretariat: "" },
      step2: { Presidence: "" },
      step3: { choix: null, ok: null },
      step4: { choix: null, ok: null },
      step5: { ideas: [] },
      step6: {
        budgets: {
          Presidence: "",
          Tresorerie: "",
          Secretariat: "",
          Evenementiel: "",
          Communication: "",
        },
        why: "",
      },
    };
  }
  return etatDuJeu._jeu2[index];
}

function renderJeu2(index) {
  const m = missions[index];
  const body = document.getElementById("mission-body");
  if (!body) return;

  const S = getJeu2State(index);

  // En-tête commun
  let html = `
    <h3 class="mission-title">${m.titre}</h3>
    <div class="mission-meta">
      <span class="role-badge">Jeu 2</span>
      ${m.scoring?.xp ? `&nbsp;•&nbsp; ${m.scoring.xp} XP` : ""}
    </div>
    <p>${m.question || ""}</p>
    <div class="muted">Étape ${S.step} / 6</div>
  `;

  // Contenu selon l’étape
  if (S.step === 1) {
    html += renderJeu2Step1();
  } else if (S.step === 2) {
    html += renderJeu2Step2();
  } else if (S.step === 3) {
    html += renderJeu2Step3(m);
  } else if (S.step === 4) {
    html += renderJeu2Step4(m);
  } else if (S.step === 5) {
    html += renderJeu2Step5();
  } else if (S.step === 6) {
    html += renderJeu2Step6();
  }

  body.innerHTML = html;

  // brancher les handlers
  if (S.step === 1) hookStep1Handlers(index);
  else if (S.step === 2) hookStep2Handlers(index);
  else if (S.step === 3) hookStep3Handlers(index);
  else if (S.step === 4) hookStep4Handlers(index);
  else if (S.step === 5) hookStep5Handlers(index);
  else if (S.step === 6) hookStep6Handlers(index);

  if (isLocked(index)) {
    disableCurrentInputs();
    ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
  }
}

/* ---------- Étape 1 : textes par pôle P/T/S ---------- */
function renderJeu2Step1() {
  return `
    <div class="card">
      <h4>Étape 1 — Réponse libre par pôle</h4>
      <div class="mj-badge">Présidence, Trésorerie, Secrétariat : complétez chacun votre zone.</div>
      <label class="option"><span>Présidence</span></label>
      <textarea id="j2-s1-pres" class="textarea" placeholder="Réponse Présidence…"></textarea>
      <label class="option"><span>Trésorerie</span></label>
      <textarea id="j2-s1-tres" class="textarea" placeholder="Réponse Trésorerie…"></textarea>
      <label class="option"><span>Secrétariat</span></label>
      <textarea id="j2-s1-sec" class="textarea" placeholder="Réponse Secrétariat…"></textarea>
      <div class="actions"><button class="btn" id="j2-s1-next" disabled>Continuer</button></div>
    </div>
  `;
}
function hookStep1Handlers(index) {
  const S = getJeu2State(index);
  const pres = document.getElementById("j2-s1-pres");
  const tres = document.getElementById("j2-s1-tres");
  const sec = document.getElementById("j2-s1-sec");
  const btn = document.getElementById("j2-s1-next");

  function check() {
    const ok = pres.value.trim() && tres.value.trim() && sec.value.trim();
    btn.disabled = !ok;
  }
  [pres, tres, sec].forEach((el) => el.addEventListener("input", check));

  btn.onclick = () => {
    S.step1.Presidence = pres.value.trim();
    S.step1.Tresorerie = tres.value.trim();
    S.step1.Secretariat = sec.value.trim();
    getJeu2State(index).step = 2;
    renderJeu2(index);
  };
  check();
}

/* ---------- Étape 2 : texte par Présidence ---------- */
function renderJeu2Step2() {
  return `
    <div class="card">
      <h4>Étape 2 — Réponse libre (Présidence)</h4>
      <textarea id="j2-s2-pres" class="textarea" placeholder="Réponse Présidence…"></textarea>
      <div class="actions"><button class="btn" id="j2-s2-next" disabled>Continuer</button></div>
    </div>
  `;
}
function hookStep2Handlers(index) {
  const S = getJeu2State(index);
  const pres = document.getElementById("j2-s2-pres");
  const btn = document.getElementById("j2-s2-next");
  function check() {
    btn.disabled = !pres.value.trim();
  }
  pres.addEventListener("input", check);
  btn.onclick = () => {
    S.step2.Presidence = pres.value.trim();
    getJeu2State(index).step = 3;
    renderJeu2(index);
  };
  check();
}

/* ---------- Étape 3 : QCM commun #1 ---------- */
function renderJeu2Step3(m) {
  const q = m.qcm?.[0];
  const opts = (q?.options || [])
    .map(
      (o, i) => `
    <label class="option">
      <input type="radio" name="j2s3" value="${i}"><span>${o}</span>
    </label>`
    )
    .join("");
  return `
    <div class="card">
      <h4>${q?.titre || "Étape 3 — QCM commun #1"}</h4>
      <p>${q?.question || ""}</p>
      ${opts}
      <div class="actions">
        <button class="btn" id="j2-s3-validate" disabled>Valider & Continuer</button>
      </div>
      <div id="j2-s3-feedback" class="feedback"></div>
    </div>
  `;
}
function hookStep3Handlers(index) {
  const S = getJeu2State(index);
  const m = missions[index];
  const q = m.qcm?.[0];
  const btn = document.getElementById("j2-s3-validate");
  const fb = document.getElementById("j2-s3-feedback");

  document.querySelectorAll('input[name="j2s3"]').forEach((r) => {
    r.addEventListener("change", () => {
      btn.disabled = false;
    });
  });

  btn.onclick = () => {
    const choisi = parseInt(
      document.querySelector('input[name="j2s3"]:checked')?.value ?? "-1",
      10
    );
    S.step3.choix = choisi;
    S.step3.ok = choisi === q?.bonneReponse;
    fb.className = "feedback " + (S.step3.ok ? "ok" : "ko");
    fb.textContent = S.step3.ok ? "✅ Bonne réponse" : "❌ Mauvaise réponse";
    // avance après un court délai
    setTimeout(() => {
      getJeu2State(index).step = 4;
      renderJeu2(index);
    }, 600);
  };
}

/* ---------- Étape 4 : QCM commun #2 ---------- */
function renderJeu2Step4(m) {
  const q = m.qcm?.[1];
  const opts = (q?.options || [])
    .map(
      (o, i) => `
    <label class="option">
      <input type="radio" name="j2s4" value="${i}"><span>${o}</span>
    </label>`
    )
    .join("");
  return `
    <div class="card">
      <h4>${q?.titre || "Étape 4 — QCM commun #2"}</h4>
      <p>${q?.question || ""}</p>
      ${opts}
      <div class="actions">
        <button class="btn" id="j2-s4-validate" disabled>Valider & Continuer</button>
      </div>
      <div id="j2-s4-feedback" class="feedback"></div>
    </div>
  `;
}
function hookStep4Handlers(index) {
  const S = getJeu2State(index);
  const m = missions[index];
  const q = m.qcm?.[1];
  const btn = document.getElementById("j2-s4-validate");
  const fb = document.getElementById("j2-s4-feedback");

  document.querySelectorAll('input[name="j2s4"]').forEach((r) => {
    r.addEventListener("change", () => {
      btn.disabled = false;
    });
  });

  btn.onclick = () => {
    const choisi = parseInt(
      document.querySelector('input[name="j2s4"]:checked')?.value ?? "-1",
      10
    );
    S.step4.choix = choisi;
    S.step4.ok = choisi === q?.bonneReponse;
    fb.className = "feedback " + (S.step4.ok ? "ok" : "ko");
    fb.textContent = S.step4.ok ? "✅ Bonne réponse" : "❌ Mauvaise réponse";
    setTimeout(() => {
      getJeu2State(index).step = 5;
      renderJeu2(index);
    }, 600);
  };
}

/* ---------- Étape 5 : Brainstorm simple ---------- */
function renderJeu2Step5() {
  return `
    <div class="card">
      <h4>Étape 5 — Brainstorm (liste d’idées)</h4>
      <div class="mj-badge">Ajoutez plusieurs idées (≥ 3) puis continuez.</div>
      <div style="display:flex; gap:8px; margin:8px 0;">
        <input id="j2-s5-input" class="input" placeholder="Saisir une idée…"/>
        <button class="btn" id="j2-s5-add">Ajouter</button>
      </div>
      <div id="j2-s5-list" class="memo-body" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
      <div class="actions"><button class="btn" id="j2-s5-next" disabled>Continuer</button></div>
    </div>
  `;
}
function hookStep5Handlers(index) {
  const S = getJeu2State(index);
  const inp = document.getElementById("j2-s5-input");
  const add = document.getElementById("j2-s5-add");
  const list = document.getElementById("j2-s5-list");
  const next = document.getElementById("j2-s5-next");

  function refresh() {
    list.innerHTML = "";
    (S.step5.ideas || []).forEach((t, i) => {
      const chip = document.createElement("span");
      chip.className = "pill";
      chip.textContent = t;
      const del = document.createElement("button");
      del.className = "btn secondary";
      del.textContent = "×";
      del.style.marginLeft = "6px";
      del.onclick = () => {
        S.step5.ideas.splice(i, 1);
        refresh();
      };
      const wrap = document.createElement("div");
      wrap.className = "memo-line";
      wrap.style.display = "inline-flex";
      wrap.style.gap = "6px";
      wrap.appendChild(chip);
      wrap.appendChild(del);
      list.appendChild(wrap);
    });
    next.disabled = S.step5.ideas.length < 3;
  }

  add.onclick = () => {
    const v = (inp.value || "").trim();
    if (!v) return;
    S.step5.ideas.push(v);
    inp.value = "";
    refresh();
  };
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add.click();
    }
  });
  next.onclick = () => {
    getJeu2State(index).step = 6;
    renderJeu2(index);
  };
  refresh();
}

/* ---------- Étape 6 : Budget par pôle + justification ---------- */
function renderJeu2Step6() {
  return `
    <div class="card">
      <h4>Étape 6 — Budget par pôle & justification</h4>
      <div class="grid small">
        ${[
          "Présidence",
          "Trésorerie",
          "Secrétariat",
          "Événementiel",
          "Communication",
        ]
          .map(
            (p) => `
          <div class="memo-line">
            <label style="display:block; font-weight:700; margin-bottom:6px">${p}</label>
            <input class="input" type="number" min="0" step="10" id="j2-s6-${slug(
              p
            )}" placeholder="Budget (en €)"/>
          </div>
        `
          )
          .join("")}
      </div>
      <label class="option" style="margin-top:8px;"><span>Expliquez vos choix</span></label>
      <textarea id="j2-s6-why" class="textarea" placeholder="Pourquoi ces répartitions ?"></textarea>
      <div class="actions"><button class="btn" id="j2-s6-validate" disabled>Valider le Jeu 2</button></div>
    </div>
  `;
}
function hookStep6Handlers(index) {
  const S = getJeu2State(index);
  const ids = [
    "Présidence",
    "Trésorerie",
    "Secrétariat",
    "Événementiel",
    "Communication",
  ].map((p) => `j2-s6-${slug(p)}`);
  const inputs = ids.map((id) => document.getElementById(id));
  const why = document.getElementById("j2-s6-why");
  const btn = document.getElementById("j2-s6-validate");

  function check() {
    const budgetsOk = inputs.every((inp) => (inp.value || "").trim() !== "");
    const whyOk = (why.value || "").trim().length > 0;
    btn.disabled = !(budgetsOk && whyOk);
  }
  inputs.forEach((el) => el.addEventListener("input", check));
  why.addEventListener("input", check);

  btn.onclick = () => {
    // Enregistrer
    const keys = [
      "Presidence",
      "Tresorerie",
      "Secretariat",
      "Evenementiel",
      "Communication",
    ];
    inputs.forEach((inp, i) => {
      S.step6.budgets[keys[i]] = inp.value.trim();
    });
    S.step6.why = why.value.trim();

    // Mémo + validation finale
    const recapBudget = keys
      .map((k) => `${k}: ${S.step6.budgets[k]}€`)
      .join(" | ");
    ajouterMemo("Budget par pôle", recapBudget);
    ajouterMemo("Justification", S.step6.why);

    // Finalisation
    const m = missions[index];
    lockMission(index);
    logResult(index, true, `[BUDGET] ${recapBudget} | [WHY] ${S.step6.why}`);
    applySuccess(index, m); // -> débloque Jeu 3
  };

  check();
}

/* =========================================================
   JEU 3 : Cohésion
========================================================= */

function getJeu3State(index) {
  if (!etatDuJeu.jeu3) etatDuJeu.jeu3 = {};
  if (!etatDuJeu.jeu3[index]) etatDuJeu.jeu3[index] = { step: 1, answers: {} };
  return etatDuJeu.jeu3[index];
}

function renderJeu3(index) {
  const state = getJeu3State(index);
  const body = document.getElementById("mission-body");

  if (state.step === 1) {
    body.innerHTML += `
      <h4>Étape 1 : Réponses libres (Présidence / Trésorerie / Secrétariat)</h4>
      <textarea id="jeu3-step1" class="textarea"></textarea>
      <button class="btn" onclick="validerJeu3Step1(${index})">Valider étape 1</button>
    `;
  } else if (state.step === 2) {
    body.innerHTML += `
      <h4>Étape 2 : Réponse libre (Présidence)</h4>
      <textarea id="jeu3-step2" class="textarea"></textarea>
      <button class="btn" onclick="validerJeu3Step2(${index})">Valider étape 2</button>
    `;
  } else if (state.step === 3) {
    body.innerHTML += `
      <h4>Étape 3 : QCM commun</h4>
      <label><input type="radio" name="jeu3q1" value="A"/> Réponse A</label>
      <label><input type="radio" name="jeu3q1" value="B"/> Réponse B</label>
      <button class="btn" onclick="validerJeu3Step3(${index})">Valider étape 3</button>
    `;
  } else if (state.step === 4) {
    body.innerHTML += `
      <h4>Étape 4 : Attribution avec justification</h4>
      <input class="input" placeholder="Idée"/> 
      <select id="jeu3-role">
        <option value="Présidence">Présidence</option>
        <option value="Trésorerie">Trésorerie</option>
        <option value="Secrétariat">Secrétariat</option>
        <option value="Événementiel">Événementiel</option>
        <option value="Communication">Communication</option>
      </select>
      <textarea id="jeu3-justif" class="textarea" placeholder="Expliquez pourquoi..."></textarea>
      <button class="btn" onclick="validerJeu3Step4(${index})">Valider étape 4</button>
    `;
  } else {
    body.innerHTML += `
      <div class="end-screen">🎉 Jeu 3 terminé !</div>
    `;
  }
}

/* ========= State minimal pour Jeu 3 ========= */
function getJeu3State(index) {
  if (!etatDuJeu._jeu3) etatDuJeu._jeu3 = {};
  if (!etatDuJeu._jeu3[index]) {
    etatDuJeu._jeu3[index] = {
      step: 1,
      answers: {
        step1: "", // réponses libres P/T/S consolidées (texte)
        step2: "", // réponse libre Présidence
        step3: { choix: null, ok: null }, // QCM commun
        step4: { idee: "", role: "", why: "" }, // tagging + justification
      },
    };
  }
  return etatDuJeu._jeu3[index];
}

/* ========= Étape 1 : réponses libres P/T/S ========= */
function validerJeu3Step1(index) {
  if (isLocked(index))
    return showFeedback(false, "Cette mission est déjà validée.");

  const textarea = document.getElementById("jeu3-step1");
  const v = (textarea?.value || "").trim();
  if (!v) return showFeedback(false, "Réponse vide. Ajoute du contenu.");

  const S = getJeu3State(index);
  S.answers.step1 = v;

  ajouterMemo("Cohésion – Étape 1", v.slice(0, 200));
  showFeedback(true, "Étape 1 validée.");
  S.step = 2;
  renderJeu3(index);
}

/* ========= Étape 2 : réponse libre Présidence ========= */
function validerJeu3Step2(index) {
  if (isLocked(index))
    return showFeedback(false, "Cette mission est déjà validée.");

  const textarea = document.getElementById("jeu3-step2");
  const v = (textarea?.value || "").trim();
  if (!v) return showFeedback(false, "Réponse vide. Ajoute du contenu.");

  const S = getJeu3State(index);
  S.answers.step2 = v;

  ajouterMemo("Cohésion – Étape 2 (Présidence)", v.slice(0, 200));
  showFeedback(true, "Étape 2 validée.");
  S.step = 3;
  renderJeu3(index);
}

/* ========= Étape 3 : QCM commun ========= */
function validerJeu3Step3(index) {
  if (isLocked(index))
    return showFeedback(false, "Cette mission est déjà validée.");

  // Ton QCM simple : A/B (on met B comme bonne réponse)
  const choisi =
    document.querySelector('input[name="jeu3q1"]:checked')?.value || null;
  if (!choisi) return showFeedback(false, "Choisis une réponse.");

  const BONNE = "B"; // ajuste si besoin
  const ok = choisi === BONNE;

  const S = getJeu3State(index);
  S.answers.step3.choix = choisi;
  S.answers.step3.ok = ok;

  ajouterMemo(
    "Cohésion – Étape 3 (QCM)",
    `Choix: ${choisi} • Résultat: ${ok ? "✅" : "❌"}`
  );
  showFeedback(ok, ok ? "Bonne réponse." : "Mauvaise réponse (on continue).");

  // On laisse avancer même si faux (change si tu veux obliger la bonne réponse)
  S.step = 4;
  renderJeu3(index);
}

/* ========= Étape 4 : Tagging + justification (validation finale) ========= */
function validerJeu3Step4(index) {
  if (isLocked(index))
    return showFeedback(false, "Cette mission est déjà validée.");

  const ideaInput = document.querySelector("#mission-body input.input"); // l’input "Idée"
  const roleSel = document.getElementById("jeu3-role");
  const whyTxt = document.getElementById("jeu3-justif");

  const idee = (ideaInput?.value || "").trim();
  const role = (roleSel?.value || "").trim();
  const why = (whyTxt?.value || "").trim();

  if (!idee) return showFeedback(false, "Ajoute au moins une idée.");
  if (!role) return showFeedback(false, "Choisis un pôle.");
  if (!why) return showFeedback(false, "Explique ta justification.");

  const S = getJeu3State(index);
  S.answers.step4.idee = idee;
  S.answers.step4.role = role;
  S.answers.step4.why = why;

  // Journal + mémo
  ajouterMemo("Cohésion – Étape 4 (Tagging)", `${idee} → ${role}`);
  ajouterMemo("Justification", why.slice(0, 300));

  // Validation finale du Jeu 3 : on attribue l’XP de la mission, on verrouille
  const m = missions[index];
  lockMission(index);
  logResult(
    index,
    true,
    `[Jeu3] S1:${S.answers.step1.slice(0, 120)} | S2:${S.answers.step2.slice(
      0,
      120
    )} | S3:${S.answers.step3.choix}/${
      S.answers.step3.ok ? "OK" : "KO"
    } | S4:${idee}->${role} | WHY:${why.slice(0, 180)}`
  );
  applySuccess(m);
  showFeedback(true, "Jeu 3 validé 🎉");
}

/* =========================================================
   JEU 4 — Partenariats & Prospection (7 étapes)
   Étape 1 : Réponses libres (brainstorm partenaires cibles) – validation MJ
   Étape 2 : QCM multi — reconnaître les partenaires actuels
   Étape 3 : QCM (2 sous-questions)
             3a) Entreprise en période d’essai d’1 an
             3b) Renouvellement : quand + où est l’info + durées possibles
   Étape 4 : Brainstorm — types d’entreprises/partenaires à prospecter (validation MJ)
   Étape 5 : QCM multi — secteurs/cibles pertinents
   Étape 6 : Budget partenaires par pôle + justification (auto)
   Étape 7 : Réponse libre — exemples d’entreprises à aller chercher + pourquoi (validation MJ)
========================================================= */

function getJeu4State(index) {
  if (!etatDuJeu._jeu4) etatDuJeu._jeu4 = {};
  if (!etatDuJeu._jeu4[index]) {
    etatDuJeu._jeu4[index] = {
      step: 1,
      // 1) Brainstorm libre (validé MJ)
      step1: { ideas: [] },
      // 2) QCM multi : partenaires existants
      step2: { checked: [] },
      // 3) QCM : essai + renouvellement
      step3: { essaiChoix: null, periode: null, dossier: null, durees: [] },
      // 4) Brainstorm types d’entreprises (validé MJ)
      step4: { ideas: [] },
      // 5) QCM multi secteurs
      step5: { checked: [] },
      // 6) Budget & justification
      step6: { budgets: {}, why: "" },
      // 7) Réponse libre exemples + pourquoi (validé MJ)
      step7: { texte: "" },
    };
  }
  return etatDuJeu._jeu4[index];
}

function renderJeu4(index) {
  const m = missions[index];
  const D = m.data || {};
  const S = getJeu4State(index);
  const body = document.getElementById("mission-body");
  if (!body) return;

  let html = `
    <h3 class="mission-title">${m.titre}</h3>
    <div class="mission-meta">
      <span class="role-badge">Jeu 4</span>
      ${m.scoring?.xp ? `&nbsp;•&nbsp; ${m.scoring.xp} XP` : ""}
    </div>
    <p>${m.question || ""}</p>
    <div class="muted">Étape ${S.step} / 7</div>
  `;

  if (S.step === 1) html += j4_renderStep1();
  else if (S.step === 2) html += j4_renderStep2(D);
  else if (S.step === 3) html += j4_renderStep3(D);
  else if (S.step === 4) html += j4_renderStep4();
  else if (S.step === 5) html += j4_renderStep5(D);
  else if (S.step === 6) html += j4_renderStep6(D);
  else if (S.step === 7) html += j4_renderStep7();

  body.innerHTML = html;

  if (isLocked(index)) {
    disableCurrentInputs();
    ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
    return;
  }

  if (S.step === 1) j4_hookStep1(index);
  else if (S.step === 2) j4_hookStep2(index, D);
  else if (S.step === 3) j4_hookStep3(index, D);
  else if (S.step === 4) j4_hookStep4(index);
  else if (S.step === 5) j4_hookStep5(index, D);
  else if (S.step === 6) j4_hookStep6(index, D);
  else if (S.step === 7) j4_hookStep7(index);
}

/* ---------------- Étape 1 : Brainstorm (MJ) ---------------- */
function j4_renderStep1() {
  return `
    <div class="card">
      <h4>Étape 1 — Brainstorm : partenaires à cibler</h4>
      <div class="mj-badge">Ajoutez des idées (min 3), puis validation par le MJ.</div>
      <div style="display:flex; gap:8px; margin:8px 0;">
        <input id="j4-s1-inp" class="input" placeholder="Ex : cabinet audit régional, ESN locale, industriel…"/>
        <button class="btn" id="j4-s1-add">Ajouter</button>
      </div>
      <div id="j4-s1-list" class="memo-body" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
      <div class="mj-actions" style="margin-top:8px;">
        <span class="mj-badge">Validation : Maître du jeu</span>
        <button class="btn" id="j4-s1-accept" disabled>✅ Valider (MJ)</button>
        <button class="btn secondary" id="j4-s1-reject" disabled>❌ Refuser (MJ)</button>
      </div>
    </div>
  `;
}
function j4_hookStep1(index) {
  const S = getJeu4State(index);
  const inp = document.getElementById("j4-s1-inp");
  const add = document.getElementById("j4-s1-add");
  const list = document.getElementById("j4-s1-list");
  const ok = document.getElementById("j4-s1-accept");
  const ko = document.getElementById("j4-s1-reject");

  function refresh() {
    list.innerHTML = "";
    (S.step1.ideas || []).forEach((t, i) => {
      const chip = document.createElement("span");
      chip.className = "pill";
      chip.textContent = t;
      const del = document.createElement("button");
      del.className = "btn secondary";
      del.textContent = "×";
      del.style.marginLeft = "6px";
      del.onclick = () => {
        S.step1.ideas.splice(i, 1);
        refresh();
      };
      const wrap = document.createElement("div");
      wrap.className = "memo-line";
      wrap.style.display = "inline-flex";
      wrap.style.gap = "6px";
      wrap.appendChild(chip);
      wrap.appendChild(del);
      list.appendChild(wrap);
    });
    ok.disabled = S.step1.ideas.length < 3;
    ko.disabled = S.step1.ideas.length < 3;
  }

  add.onclick = () => {
    const v = (inp.value || "").trim();
    if (!v) return;
    S.step1.ideas.push(v);
    inp.value = "";
    refresh();
  };
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add.click();
    }
  });
  ok.onclick = () => {
    ajouterMemo("Cibles partenaires (brainstorm)", S.step1.ideas.join(" | "));
    showFeedback(true, "Étape 1 validée (MJ).");
    S.step = 2;
    renderJeu4(index);
  };
  ko.onclick = () =>
    showFeedback(false, "Refusé par le MJ — ajustez la liste.");

  refresh();
}

/* ---------------- Étape 2 : QCM multi — partenaires actuels ---------------- */
function j4_renderStep2(D) {
  return `
    <div class="card">
      <h4>Étape 2 — Qui sont nos partenaires actuels ?</h4>
      <div class="mj-badge">Sélectionnez tous les partenaires actuels (réponses multiples).</div>
      <div id="j4-s2-wrap"></div>
      <div class="actions"><button class="btn" id="j4-s2-validate">Valider & Continuer</button></div>
      <div id="j4-s2-fb" class="feedback"></div>
    </div>
  `;
}
function j4_hookStep2(index, D) {
  const S = getJeu4State(index);
  const wrap = document.getElementById("j4-s2-wrap");
  const btn = document.getElementById("j4-s2-validate");
  const fb = document.getElementById("j4-s2-fb");

  // On mélange vraies + leurres
  const base = D.partenairesActuels || [];
  const leurres = ["Capgemini", "Dassault Systèmes", "EDF", "TotalEnergies"];
  const pool = [...new Set([...base, ...leurres])].sort();

  wrap.innerHTML = pool
    .map(
      (name, i) => `
    <label class="option">
      <input type="checkbox" name="j4s2" value="${name}">
      <span>${name}</span>
    </label>
  `
    )
    .join("");

  btn.onclick = () => {
    const chosen = Array.from(
      document.querySelectorAll('input[name="j4s2"]:checked')
    ).map((e) => e.value);
    S.step2.checked = chosen;

    const correctSet = new Set(base);
    const ok =
      chosen.length > 0 &&
      chosen.every((c) => correctSet.has(c)) &&
      base.every((b) => chosen.includes(b));

    fb.className = "feedback " + (ok ? "ok" : "ko");
    fb.textContent = ok ? "✅ Exact !" : "❌ Incomplet ou incorrect.";
    setTimeout(() => {
      getJeu4State(index).step = 3;
      renderJeu4(index);
    }, 700);
  };
}

/* ---------------- Étape 3 : QCM — essai + renouvellement ---------------- */
function j4_renderStep3(D) {
  const R = D.renouvellement || {};
  return `
    <div class="card">
      <h4>Étape 3a — Entreprise en période d’essai (1 an)</h4>
      <div id="j4-s3a" class="memo-body">
        ${["PWC", "BNP Paribas", "PROPULSE", "JPM"]
          .map(
            (name, i) => `
          <label class="option">
            <input type="radio" name="j4s3a" value="${name}">
            <span>${name}</span>
          </label>`
          )
          .join("")}
      </div>

      <h4 style="margin-top:12px;">Étape 3b — Renouvellement des conventions</h4>
      <p class="muted">Quand renouveler et où trouver l’info ?</p>
      <div class="memo-body">
        <label class="option">
          <span>Période</span>
          <select id="j4-s3-periode" class="input">
            ${["Janvier", "Décembre", "Mars"]
              .map((x) => `<option>${x}</option>`)
              .join("")}
          </select>
        </label>
        <label class="option">
          <span>Où trouver l’info ?</span>
          <select id="j4-s3-dossier" class="input">
            ${[
              "SMQ",
              "Stratégie et pilotage",
              "Gestion des Ressources Humaines",
            ]
              .map((x) => `<option>${x}</option>`)
              .join("")}
          </select>
        </label>
        <div class="mj-badge">Durées possibles de conventions (multi) :</div>
        <div id="j4-s3-durees">
          ${(R.durees || ["1 an", "2 ans", "3 ans", "5 ans"])
            .map(
              (d) => `
            <label class="option"><input type="checkbox" name="j4s3d" value="${d}"> <span>${d}</span></label>
          `
            )
            .join("")}
        </div>
      </div>

      <div class="actions"><button class="btn" id="j4-s3-validate">Valider & Continuer</button></div>
      <div id="j4-s3-fb" class="feedback"></div>
    </div>
  `;
}
function j4_hookStep3(index, D) {
  const S = getJeu4State(index);
  const R = D.renouvellement || {};
  const fb = document.getElementById("j4-s3-fb");
  document.getElementById("j4-s3-validate").onclick = () => {
    const essai =
      document.querySelector('input[name="j4s3a"]:checked')?.value || "";
    const periode = document.getElementById("j4-s3-periode").value;
    const dossier = document.getElementById("j4-s3-dossier").value;
    const durees = Array.from(
      document.querySelectorAll('input[name="j4s3d"]:checked')
    ).map((e) => e.value);

    S.step3.essaiChoix = essai;
    S.step3.periode = periode;
    S.step3.dossier = dossier;
    S.step3.durees = durees;

    const okEssai = essai === (D.partenaireEssai || "PWC");
    const okPeriode = periode === (R.bonnePeriode || "Janvier");
    const okDossier = dossier === (R.bonDossier || "Stratégie et pilotage");
    const goodDur = new Set(R.bonneDurees || ["1 an", "2 ans"]);
    const okDur =
      durees.length > 0 &&
      durees.every((d) => goodDur.has(d)) &&
      [...goodDur].every((d) => durees.includes(d));

    const allOk = okEssai && okPeriode && okDossier && okDur;
    fb.className = "feedback " + (allOk ? "ok" : "ko");
    fb.textContent = allOk ? "✅ Parfait." : "❌ Vérifiez vos choix.";
    setTimeout(() => {
      getJeu4State(index).step = 4;
      renderJeu4(index);
    }, 700);
  };
}

/* ---------------- Étape 4 : Brainstorm types d’entreprises (MJ) ---------------- */
function j4_renderStep4() {
  return `
    <div class="card">
      <h4>Étape 4 — Brainstorm : types d’entreprises à prospecter</h4>
      <div class="mj-badge">Aucune mauvaise réponse. Validation par le MJ.</div>
      <div style="display:flex; gap:8px; margin:8px 0;">
        <input id="j4-s4-inp" class="input" placeholder="Ex : PME industrie, ESN, bureau d’études…"/>
        <button class="btn" id="j4-s4-add">Ajouter</button>
      </div>
      <div id="j4-s4-list" class="memo-body" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
      <div class="mj-actions">
        <span class="mj-badge">Validation : Maître du jeu</span>
        <button class="btn" id="j4-s4-accept" disabled>✅ Valider (MJ)</button>
        <button class="btn secondary" id="j4-s4-reject" disabled>❌ Refuser (MJ)</button>
      </div>
    </div>
  `;
}
function j4_hookStep4(index) {
  const S = getJeu4State(index);
  const inp = document.getElementById("j4-s4-inp");
  const add = document.getElementById("j4-s4-add");
  const list = document.getElementById("j4-s4-list");
  const ok = document.getElementById("j4-s4-accept");
  const ko = document.getElementById("j4-s4-reject");

  function refresh() {
    list.innerHTML = "";
    (S.step4.ideas || []).forEach((t, i) => {
      const chip = document.createElement("span");
      chip.className = "pill";
      chip.textContent = t;
      const del = document.createElement("button");
      del.className = "btn secondary";
      del.textContent = "×";
      del.style.marginLeft = "6px";
      del.onclick = () => {
        S.step4.ideas.splice(i, 1);
        refresh();
      };
      const wrap = document.createElement("div");
      wrap.className = "memo-line";
      wrap.style.display = "inline-flex";
      wrap.style.gap = "6px";
      wrap.appendChild(chip);
      wrap.appendChild(del);
      list.appendChild(wrap);
    });
    ok.disabled = S.step4.ideas.length < 3;
    ko.disabled = S.step4.ideas.length < 3;
  }

  add.onclick = () => {
    const v = (inp.value || "").trim();
    if (!v) return;
    S.step4.ideas.push(v);
    inp.value = "";
    refresh();
  };
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add.click();
    }
  });
  ok.onclick = () => {
    ajouterMemo("Types d’entreprises", S.step4.ideas.join(" | "));
    showFeedback(true, "Étape 4 validée (MJ).");
    S.step = 5;
    renderJeu4(index);
  };
  ko.onclick = () =>
    showFeedback(false, "Refusé par le MJ — ajustez la liste.");
  refresh();
}

/* ---------------- Étape 5 : QCM multi — secteurs/cibles pertinents ---------------- */
function j4_renderStep5(D) {
  const pool = D.secteursPertinents || [
    "PME",
    "Industries",
    "ETI",
    "Startups",
    "Collectivités",
    "Ecoles/Universités",
  ];
  // On ajoute quelques leurres
  const all = [...pool, "Particuliers B2C", "Artisans individuels"].sort();
  return `
    <div class="card">
      <h4>Étape 5 — Cibles pertinentes</h4>
      <div class="mj-badge">Cochez tous les types de cibles pertinents (multi).</div>
      ${all
        .map(
          (name) => `
        <label class="option"><input type="checkbox" name="j4s5" value="${name}"><span>${name}</span></label>
      `
        )
        .join("")}
      <div class="actions"><button class="btn" id="j4-s5-validate">Valider & Continuer</button></div>
      <div id="j4-s5-fb" class="feedback"></div>
    </div>
  `;
}
function j4_hookStep5(index, D) {
  const S = getJeu4State(index);
  const btn = document.getElementById("j4-s5-validate");
  const fb = document.getElementById("j4-s5-fb");
  btn.onclick = () => {
    const chosen = Array.from(
      document.querySelectorAll('input[name="j4s5"]:checked')
    ).map((e) => e.value);
    S.step5.checked = chosen;
    const good = new Set(D.secteursPertinents || []);
    const ok =
      chosen.length > 0 &&
      chosen.every((c) => good.has(c)) &&
      [...good].every((g) => chosen.includes(g));
    fb.className = "feedback " + (ok ? "ok" : "ko");
    fb.textContent = ok
      ? "✅ Bien ciblé."
      : "❌ Il manque des cibles pertinentes.";
    setTimeout(() => {
      getJeu4State(index).step = 6;
      renderJeu4(index);
    }, 700);
  };
}

/* ---------------- Étape 6 : Budget & justification ---------------- */
function j4_renderStep6(D) {
  const roles = D.roles || [
    "Présidence",
    "Trésorerie",
    "Secrétariat",
    "Événementiel",
    "Communication",
  ];
  return `
    <div class="card">
      <h4>Étape 6 — Budget partenaires par pôle</h4>
      <div class="grid small">
        ${roles
          .map(
            (p) => `
          <div class="memo-line">
            <label style="display:block; font-weight:700; margin-bottom:6px">${p}</label>
            <input class="input" id="j4-s6-${slug(
              p
            )}" placeholder="ex. 300 € (supports), 200 € (événements)…"/>
          </div>
        `
          )
          .join("")}
      </div>
      <label class="option" style="margin-top:8px;"><span>Expliquez vos choix</span></label>
      <textarea id="j4-s6-why" class="textarea" placeholder="Pourquoi cette répartition ? Quelles actions ?"></textarea>

      <div class="mj-actions"><button class="btn" id="j4-s6-validate" disabled>Continuer</button></div>
    </div>
  `;
}
function j4_hookStep6(index, D) {
  const S = getJeu4State(index);
  const roles = D.roles || [
    "Présidence",
    "Trésorerie",
    "Secrétariat",
    "Événementiel",
    "Communication",
  ];
  const inputs = roles.map((p) => document.getElementById(`j4-s6-${slug(p)}`));
  const why = document.getElementById("j4-s6-why");
  const btn = document.getElementById("j4-s6-validate");

  function check() {
    const allOk =
      inputs.every((el) => (el.value || "").trim()) && (why.value || "").trim();
    btn.disabled = !allOk;
  }
  inputs.forEach((el) => el.addEventListener("input", check));
  why.addEventListener("input", check);

  btn.onclick = () => {
    roles.forEach((p, i) => (S.step6.budgets[p] = inputs[i].value.trim()));
    S.step6.why = why.value.trim();
    ajouterMemo(
      "Budgets",
      roles.map((p) => `${p}: ${S.step6.budgets[p]}`).join(" | ")
    );
    ajouterMemo("Justification", S.step6.why);
    S.step = 7;
    renderJeu4(index);
  };
  check();
}

/* ---------------- Étape 7 : Exemples d’entreprises + pourquoi (MJ) ---------------- */
function j4_renderStep7() {
  return `
    <div class="card">
      <h4>Étape 7 — Exemples d’entreprises à approcher</h4>
      <div class="mj-badge">Réponse libre, validation par le MJ.</div>
      <textarea id="j4-s7" class="textarea" placeholder="Citez des entreprises + pourquoi elles sont pertinentes pour le mandat…"></textarea>
      <div class="mj-actions">
        <span class="mj-badge">Validation : Maître du jeu</span>
        <button class="btn" id="j4-s7-accept">✅ Valider (MJ)</button>
        <button class="btn secondary" id="j4-s7-reject">❌ Refuser (MJ)</button>
      </div>
      <div id="j4-s7-fb" class="feedback"></div>
    </div>
  `;
}
function j4_hookStep7(index) {
  const S = getJeu4State(index);
  const txt = document.getElementById("j4-s7");
  const fb = document.getElementById("j4-s7-fb");
  const m = missions[index];

  document.getElementById("j4-s7-accept").onclick = () => {
    const v = (txt.value || "").trim();
    if (!v) return showFeedback(false, "Réponse vide.");
    S.step7.texte = v;
    lockMission(index);
    logResult(
      index,
      true,
      `[Jeu4] S1:${(S.step1.ideas || []).join(", ")} | S2:${(
        S.step2.checked || []
      ).join(", ")} | S3:${S.step3.essaiChoix}/${S.step3.periode}/${
        S.step3.dossier
      }/${(S.step3.durees || []).join(",")} | S4:${(S.step4.ideas || []).join(
        ", "
      )} | S5:${(S.step5.checked || []).join(", ")} | S6:${JSON.stringify(
        S.step6
      )} | S7:${v.slice(0, 180)}`
    );
    applySuccess(m);
    fb.className = "feedback ok";
    fb.textContent = "✅ Jeu 4 validé !";
  };
  document.getElementById("j4-s7-reject").onclick = () => {
    fb.className = "feedback ko";
    fb.textContent = "❌ Refusé par le MJ — complétez la réponse.";
  };
}

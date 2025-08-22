/************  JC AQSE — jeu.js (overlay rôles + 4 jeux libres + XP fixe)  ************/

/* =========================================================
   CONFIG / ETAT GÉNÉRAL
========================================================= */

// Indicateur unique : XP cumulé
const indicateurs = { xp: 0 };

// Calcul du total d’XP possible (auto depuis missions.js)
let XP_MAX = 0;
function computeXpMax() {
  try {
    XP_MAX = (missions || []).reduce((sum, m) => {
      if (m?.scoring?.xp) return sum + (m.scoring.xp || 0);
      if (typeof m.points === "number") return sum + m.points;
      return sum;
    }, 0);
  } catch {
    XP_MAX = 0;
  }
  if (XP_MAX <= 0) XP_MAX = 1; // éviter /0
}

// État de jeu global
let etatDuJeu = {
  etapesTerminees: [],
  missionActuelle: null, // index 0..3 (les 4 jeux)
  timer: { handle: null, total: 0, left: 0, expired: false },

  // états internes par jeu
  _jeu1: {}, // brainstorm
  _jeu2: {}, // série 7 étapes
  _jeu3: {}, // cohésion (4 étapes)
  _jeu4: {}, // partenariats (7 étapes)
};

// Journal simple si besoin d’un bilan (non exporté)
const results = [];

// Verrouillage : un jeu validé => verrouillé (non rejouable dans la session)
const missionLocked = new Set();
function isLocked(idx) {
  return missionLocked.has(idx);
}
function lockMission(idx) {
  missionLocked.add(idx);
  setTimelineStates();
}

/* =========================================================
   UTILS
========================================================= */
function renderProgress() {
  // Défensif : si jamais XP_MAX est 0 (missions pas encore chargées)
  if (!XP_MAX || XP_MAX < 1) computeXpMax();
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

function showFeedback(ok, msg) {
  const box = document.getElementById("feedback");
  if (!box) return;
  box.className = "feedback " + (ok ? "ok" : "ko");
  box.textContent = (ok ? "✅ " : "❌ ") + msg;
}

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

/* =========================================================
   TIMELINE (4 jeux libres)
========================================================= */
function renderTimeline() {
  const wrap = document.getElementById("steps");
  if (!wrap) return;
  wrap.innerHTML = "";

  for (let i = 0; i < 4; i++) {
    const btn = document.createElement("button");
    btn.className = "step-btn";
    btn.textContent = `${i + 1}. Jeu ${i + 1}`;
    btn.dataset.index = String(i);
    btn.disabled = isLocked(i); // accessible par défaut, bloqué une fois fini
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
function loadStep(index) {
  if (isLocked(index)) {
    showFeedback(false, "Ce jeu est déjà terminé.");
    return;
  }
  etatDuJeu.missionActuelle = index;
  setTimelineStates();
  renderMission(index);
}

/* =========================================================
   AFFICHAGE D’UN JEU (tête + délégation)
========================================================= */
function renderMission(index) {
  // Assure que XP_MAX est correct même si missions a été (re)chargé après
  if (!XP_MAX || XP_MAX < 1) computeXpMax();

  const m = missions[index];
  const body = document.getElementById("mission-body");
  if (!body) return;

  clearMemo();
  stopTimer();

  let html = `
    <h3 class="mission-title">${m.titre || `Jeu ${index + 1}`}</h3>
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

  const container = document.getElementById("mission-body");
  container.innerHTML = html;

  // Types natifs
  if (m.type === "qcm" || m.type === "choix" || m.type === "texte") {
    renderNativeMissionUI(index, m);
  }
  // Jeux custom
  else if (m.type === "brainstorm") {
    if (isLocked(index)) {
      disableCurrentInputs();
      ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
      return;
    }
    renderBrainstorm(index);
  } else if (m.type === "jeu2") {
    if (isLocked(index)) {
      disableCurrentInputs();
      ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
      return;
    }
    renderJeu2(index);
  } else if (m.type === "jeu3") {
    if (isLocked(index)) {
      disableCurrentInputs();
      ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
      return;
    }
    if (typeof renderJeu3 === "function") renderJeu3(index);
    else container.innerHTML += `<div class="end-screen">Jeu 3 à venir.</div>`;
  } else if (m.type === "jeu4") {
    if (isLocked(index)) {
      disableCurrentInputs();
      ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
      return;
    }
    if (typeof renderJeu4 === "function") renderJeu4(index);
    else container.innerHTML += `<div class="end-screen">Jeu 4 à venir.</div>`;
  } else {
    container.innerHTML += `<div class="end-screen">Type de mission à venir.</div>`;
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

/* =========================================================
   VALIDATIONS GÉNÉRIQUES (natifs)
========================================================= */
function logResult(index, ok, answerText) {
  const m = missions[index] || {};
  results.push({
    id: m.id || `jeu_${index + 1}`,
    titre: m.titre || `Jeu ${index + 1}`,
    type: m.type || "custom",
    ok: !!ok,
    answer: (answerText || "").slice(0, 2000),
    ts: new Date().toISOString(),
  });
}
function rewardXpOf(m) {
  return m?.scoring?.xp ?? m.points ?? 0;
}

function applySuccess(index, m) {
  // Garanti que XP_MAX est bon
  if (!XP_MAX || XP_MAX < 1) computeXpMax();
  const xp = rewardXpOf(m || {});
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
  if (accepte) applySuccess(index, m);
  else applyFailure("Refusé par le MJ.");
}

/* =========================================================
   BILAN + RESET
========================================================= */
function renderEndScreen() {
  const end = document.getElementById("end-screen");
  if (!end) return;
  const total = (missions || []).length;
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
    _jeu1: {},
    _jeu2: {},
    _jeu3: {},
    _jeu4: {},
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

  // Réafficher l’overlay si demandé et présent dans le HTML
  const hasOverlay = !!document.getElementById("roles-overlay");
  if (hasOverlay) {
    if (typeof setupRolesUI === "function") setupRolesUI();
    if (alsoResetRoles && typeof showRolesOverlay === "function")
      showRolesOverlay(true);
  }
}

/* =========================================================
   JEU 1 — Brainstorm (2 étapes)
========================================================= */
function getBrainstormState() {
  const i = etatDuJeu.missionActuelle;
  if (!etatDuJeu._jeu1) etatDuJeu._jeu1 = {};
  if (!etatDuJeu._jeu1[i]) {
    etatDuJeu._jeu1[i] = { step: 1, ideas: [], selected: [], tags: {} };
  }
  return etatDuJeu._jeu1[i];
}
function renderBrainstorm(index) {
  const s = getBrainstormState();
  const body = document.getElementById("mission-body");

  // Étape 1 — nuage d’idées + sélection de 5
  if (s.step === 1) {
    body.innerHTML += `
      <div class="grid-2">
        <div class="card">
          <h4>Étape 1 — Brainstorm</h4>
          <p><em>Organiser une conférence à destination des professionnels</em></p>
          <label class="option" style="gap:6px">
            <input id="bs-input" class="input" style="color: var(--text);" placeholder="Ajoute une idée et appuie sur Entrée">
          </label>
          <div id="bs-chip" class="memo-body" style="margin-top:8px"></div>
          <div class="actions">
            <button class="btn" id="bs-next" disabled>Continuer (5 idées)</button>
          </div>
        </div>
        <div class="card">
          <h4>Instructions</h4>
          <ul class="muted">
            <li>Ajoute un maximum d’idées (Entrée pour valider chacune).</li>
            <li>Sélectionne ensuite <strong>5 de tes idées</strong> parmis celle que tu as choisis (cliquer pour sélectionner/désélectionner).</li>
          </ul>
        </div>
      </div>
    `;

    const input = document.getElementById("bs-input");
    const chip = document.getElementById("bs-chip");
    const nextBtn = document.getElementById("bs-next");

    function renderList() {
      chip.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexWrap = "wrap";
      wrap.style.gap = "8px";

      s.ideas.forEach((txt, idx) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "pill";
        el.style.color = "var(--text)";
        if (s.selected.includes(idx))
          el.style.outline = "2px solid var(--primary)";
        el.textContent = txt;
        el.onclick = () => {
          const pos = s.selected.indexOf(idx);
          if (pos >= 0) s.selected.splice(pos, 1);
          else {
            if (s.selected.length >= 5) return;
            s.selected.push(idx);
          }
          renderList();
        };
        wrap.appendChild(el);
      });
      chip.appendChild(wrap);
      nextBtn.disabled = s.selected.length !== 5;
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const v = input.value.trim();
        if (v) {
          s.ideas.push(v);
          input.value = "";
          renderList();
        }
      }
    });
    nextBtn.onclick = () => {
      // Mémo des idées + sélection avant de passer à l’étape 2
      if (s.ideas.length) {
        ajouterMemo("Idées saisies", s.ideas.join(", "));
      }
      if (s.selected.length) {
        const sel = s.selected.map((i) => s.ideas[i]).join(", ");
        ajouterMemo("Sélection (5)", sel);
      }
      s.step = 2;
      renderBrainstorm(index);
    };
    renderList();
    return;
  }

  // Étape 2 — étiquetage (pôle) des 5 idées
  if (s.step === 2) {
    const selectedIdeas = s.selected.map((i) => s.ideas[i]);
    body.innerHTML += `
      <div class="card">
        <h4>Étape 2 — Attribue un pôle à chacune de tes 5 idées</h4>
        <div id="tag-list" class="memo-body"></div>
        <div class="actions">
          <button class="btn" id="bs-validate">Valider le jeu</button>
          <button class="btn secondary" id="bs-back">◀ Retour</button>
        </div>
      </div>
    `;

    const poles = [
      "Présidence",
      "Trésorerie",
      "Secrétariat",
      "Événementiel",
      "Communication",
    ];
    const tagList = document.getElementById("tag-list");
    function renderTags() {
      tagList.innerHTML = "";
      selectedIdeas.forEach((idea, k) => {
        const row = document.createElement("div");
        row.className = "option";
        const sel = document.createElement("select");
        sel.className = "input";
        sel.style.color = "var(--text)";
        poles.forEach((p) => {
          const opt = document.createElement("option");
          opt.value = p;
          opt.textContent = p;
          sel.appendChild(opt);
        });
        sel.value = s.tags[k] || poles[0];
        sel.onchange = () => {
          s.tags[k] = sel.value;
        };
        const label = document.createElement("div");
        label.style.flex = "1";
        label.innerHTML = `<strong>${idea}</strong>`;
        row.appendChild(label);
        row.appendChild(sel);
        tagList.appendChild(row);
      });
    }
    renderTags();

    document.getElementById("bs-back").onclick = () => {
      s.step = 1;
      renderBrainstorm(index);
    };
    document.getElementById("bs-validate").onclick = () => {
      const m = missions[index];
      // Mémo des tags (idée → pôle)
      const mapping = selectedIdeas
        .map((idea, k) => `${idea} → ${s.tags[k] || poles[0]}`)
        .join("<br>");
      ajouterMemo("Attribution par pôle", mapping);

      logResult(
        index,
        true,
        JSON.stringify({
          ideas: s.selected.map((i) => s.ideas[i]),
          tags: s.tags,
        })
      );
      applySuccess(index, m);
    };
    return;
  }
}

/* =========================================================
   JEU 2 — 7 étapes (ajout Étape 7 : entreprise visée)
========================================================= */
function renderJeu2(index) {
  const key = `_jeu2_${index}`;
  if (!etatDuJeu[key]) etatDuJeu[key] = { step: 1, data: {} };
  const S = etatDuJeu[key];
  const m = missions[index];
  const body = document.getElementById("mission-body");

  function header() {
    return `<p class="muted">Étape ${S.step} / 7</p>`;
  }
  function next() {
    S.step += 1;
    renderJeu2(index);
  }

  body.innerHTML += header();

  // 1) Réponse libre par Présidence/Tréso/SecG
  if (S.step === 1) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 1 — Cadrage initial (Présidence / Trésorerie / Secrétariat)</h4>
        <p><strong>Quel premier cadrage proposez-vous pour lancer le mandat ?</strong></p>
        <textarea id="j2s1" class="textarea" placeholder="Un paragraphe par rôle si possible…"></textarea>
        <div class="actions"><button class="btn" id="ok1">Suite</button></div>
      </div>`;
    document.getElementById("ok1").onclick = () => {
      const v = document.getElementById("j2s1").value.trim();
      if (!v) return showFeedback(false, "Réponse attendue.");
      S.data.s1 = v;
      ajouterMemo("Cadrage initial", v);
      next();
    };
    return;
  }

  // 2) Réponse libre par Présidence
  if (S.step === 2) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 2 — Vision & objectifs (Présidence)</h4>
        <p><strong>Définissez la vision de l’année et 3 objectifs stratégiques.</strong></p>
        <textarea id="j2s2" class="textarea" placeholder="Vision + 3 objectifs…"></textarea>
        <div class="actions"><button class="btn" id="ok2">Suite</button></div>
      </div>`;
    document.getElementById("ok2").onclick = () => {
      const v = document.getElementById("j2s2").value.trim();
      if (!v) return showFeedback(false, "Réponse attendue.");
      S.data.s2 = v;
      ajouterMemo("Vision & objectifs", v);
      next();
    };
    return;
  }

  // 3) QCM commun — stratégie de prospection
  if (S.step === 3) {
    const opts = [
      "Prospection hebdo structurée (2h x 2 / semaine)",
      "Prospection uniquement à l’approche des échéances",
      "Aucune prospection, attendre l’inbound",
    ];
    body.innerHTML += `
      <div class="card">
        <h4>Étape 3 — QCM commun</h4>
        <p><strong>Quelle stratégie de prospection adoptez‑vous ?</strong></p>
        ${opts
          .map(
            (o, i) => `
          <label class="option">
            <input type="radio" name="j2s3" value="${i}">
            <span>${o}</span>
          </label>`
          )
          .join("")}
        <div class="actions"><button class="btn" id="ok3">Suite</button></div>
      </div>`;
    document.getElementById("ok3").onclick = () => {
      const v = document.querySelector('input[name="j2s3"]:checked');
      if (!v) return showFeedback(false, "Choisis une option.");
      S.data.s3 = parseInt(v.value, 10);
      ajouterMemo("Stratégie de prospection", opts[S.data.s3]);
      next();
    };
    return;
  }

  // 4) QCM commun — rythme
  if (S.step === 4) {
    const opts = [
      "1 fois / semaine",
      "3 fois / semaine, 15 min",
      "Tous les jours (sauf week‑end), 15 min",
      "1 fois / mois",
    ];
    body.innerHTML += `
      <div class="card">
        <h4>Étape 4 — QCM commun</h4>
        <p><strong>Rythme de prospection pour tenir l’objectif CA ?</strong></p>
        ${opts
          .map(
            (o, i) => `
          <label class="option">
            <input type="radio" name="j2s4" value="${i}">
            <span>${o}</span>
          </label>`
          )
          .join("")}
        <div class="actions"><button class="btn" id="ok4">Suite</button></div>
      </div>`;
    document.getElementById("ok4").onclick = () => {
      const v = document.querySelector('input[name="j2s4"]:checked');
      if (!v) return showFeedback(false, "Choisis une option.");
      S.data.s4 = parseInt(v.value, 10);
      ajouterMemo("Rythme de prospection", opts[S.data.s4]);
      next();
    };
    return;
  }

  // 5) Brainstorm — canaux / événements business
  if (S.step === 5) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 5 — Brainstorm commun</h4>
        <p><strong>Quels canaux / événements utiliser pour trouver du business ?</strong></p>
        <label class="option"><input id="j2s5in" class="input" placeholder="Ajoute un canal puis Entrée"></label>
        <div id="j2s5list" class="memo-body"></div>
        <div class="actions"><button class="btn" id="ok5" disabled>Suite</button></div>
      </div>`;
    const list = document.getElementById("j2s5list");
    const input = document.getElementById("j2s5in");
    if (!S.data.s5) S.data.s5 = [];
    function renderList() {
      list.innerHTML = "";
      if (!S.data.s5.length)
        list.innerHTML = `<p class="muted">Aucun canal ajouté.</p>`;
      else {
        S.data.s5.forEach((c, i) => {
          const line = document.createElement("div");
          line.className = "memo-line";
          line.innerHTML = `${c} <span class="muted">#${i + 1}</span>`;
          list.appendChild(line);
        });
      }
      document.getElementById("ok5").disabled = S.data.s5.length < 1;
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const v = input.value.trim();
        if (v) {
          S.data.s5.push(v);
          input.value = "";
          renderList();
        }
      }
    });
    document.getElementById("ok5").onclick = () => {
      ajouterMemo("Canaux / événements", S.data.s5.join(", "));
      next();
    };
    renderList();
    return;
  }

  // 6) Budget par pôle + justification
  if (S.step === 6) {
    const poles = [
      "Présidence",
      "Trésorerie",
      "Secrétariat",
      "Événementiel",
      "Communication",
    ];
    body.innerHTML += `
      <div class="card">
        <h4>Étape 6 — Budget par pôle + Pourquoi ?</h4>
        <p>Indique un montant (en €) pour chaque pôle, puis explique vos choix.</p>
        <div id="j2s6grid" class="memo-body"></div>
        <textarea id="j2s6why" class="textarea" placeholder="Pourquoi cette répartition ?"></textarea>
        <div class="actions"><button class="btn" id="ok6">Suite</button></div>
      </div>`;
    const grid = document.getElementById("j2s6grid");
    if (!S.data.s6) S.data.s6 = { budget: {}, why: "" };
    poles.forEach((p) => {
      const row = document.createElement("div");
      row.className = "option";
      row.innerHTML = `
        <div style="flex:1"><strong>${p}</strong></div>
        <input type="number" min="0" class="input" id="j2s6-${p}" placeholder="€" style="max-width:160px">
      `;
      grid.appendChild(row);
    });
    document.getElementById("ok6").onclick = () => {
      const budget = {};
      poles.forEach((p) => {
        const v = parseFloat(document.getElementById(`j2s6-${p}`).value || "0");
        budget[p] = isNaN(v) ? 0 : v;
      });
      const why = document.getElementById("j2s6why").value.trim();
      if (!why) return showFeedback(false, "Explique tes choix.");
      S.data.s6 = { budget, why };

      const budTxt = poles
        .map((p) => `${p}: ${S.data.s6.budget[p] || 0} €`)
        .join(" ; ");
      ajouterMemo("Budget par pôle", budTxt);
      ajouterMemo("Pourquoi cette répartition", why);

      next(); // -> Étape 7
    };
    return;
  }

  // 7) Nouvelle étape : Entreprise chez qui obtenir une mission
  if (S.step === 7) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 7 — Cible client prioritaire</h4>
        <p><strong>Quelle est l’entreprise chez qui vous souhaitez obtenir une mission ? Pourquoi elle ?</strong></p>
        <input id="j2s7company" class="input" placeholder="Nom de l’entreprise">
        <textarea id="j2s7why" class="textarea" placeholder="Justifiez en quelques lignes…"></textarea>
        <div class="actions"><button class="btn" id="ok7">Valider le Jeu 2</button></div>
      </div>`;
    document.getElementById("ok7").onclick = () => {
      const company = document.getElementById("j2s7company").value.trim();
      const why = document.getElementById("j2s7why").value.trim();
      if (!company)
        return showFeedback(false, "Indiquez une entreprise cible.");
      if (!why) return showFeedback(false, "Expliquez brièvement pourquoi.");
      S.data.s7 = { company, why };

      ajouterMemo("Entreprise cible", company);
      ajouterMemo("Pourquoi elle", why);

      logResult(index, true, JSON.stringify(S.data));
      applySuccess(index, m);
    };
    return;
  }
}

/* =========================================================
   JEU 3 — Cohésion (4 étapes)
========================================================= */
function renderJeu3(index) {
  const key = `_jeu3_${index}`;
  if (!etatDuJeu[key]) etatDuJeu[key] = { step: 1, data: {} };
  const S = etatDuJeu[key];
  const m = missions[index];
  const body = document.getElementById("mission-body");

  function header() {
    return `<p class="muted">Étape ${S.step} / 4</p>`;
  }
  function next() {
    S.step += 1;
    renderJeu3(index);
  }

  body.innerHTML += header();

  // 1) Maintenir la cohésion à distance
  if (S.step === 1) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 1 — Maintenir la cohésion à distance</h4>
        <p><strong>Quelles actions concrètes mettez‑vous en place (outils/rituels)?</strong></p>
        <textarea id="j3s1" class="textarea" placeholder="Ex : point hebdo, coffee visio, binômes, Discord…"></textarea>
        <div class="actions"><button class="btn" id="ok1">Suite</button></div>
      </div>`;
    document.getElementById("ok1").onclick = () => {
      const v = document.getElementById("j3s1").value.trim();
      if (!v) return showFeedback(false, "Réponse attendue.");
      S.data.s1 = v;
      ajouterMemo("Cohésion à distance", v);
      next();
    };
    return;
  }

  // 2) Fréquences réunions & suivis
  if (S.step === 2) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 2 — Fréquences & suivi</h4>
        <p><strong>Indique la fréquence des réunions d’équipe et le rythme de suivi individuel.</strong></p>
        <textarea id="j3s2" class="textarea" placeholder="Ex : réu équipe hebdo 1h ; 1:1 toutes les 2 semaines…"></textarea>
        <div class="actions"><button class="btn" id="ok2">Suite</button></div>
      </div>`;
    document.getElementById("ok2").onclick = () => {
      const v = document.getElementById("j3s2").value.trim();
      if (!v) return showFeedback(false, "Réponse attendue.");
      S.data.s2 = v;
      ajouterMemo("Fréquences & suivi", v);
      next();
    };
    return;
  }

  // 3) QCM — pack de rituels
  if (S.step === 3) {
    const opts = [
      "Réunion d’équipe hebdo + 1:1 bimensuel + canal info centralisé",
      "Réunion mensuelle uniquement",
      "Pas de rituels, au fil de l’eau",
    ];
    body.innerHTML += `
      <div class="card">
        <h4>Étape 3 — QCM (rituels)</h4>
        <p><strong>Quel pack de rituels te semble le plus adapté au mandat ?</strong></p>
        ${opts
          .map(
            (o, i) => `
          <label class="option">
            <input type="radio" name="j3s3" value="${i}">
            <span>${o}</span>
          </label>`
          )
          .join("")}
        <div class="actions"><button class="btn" id="ok3">Suite</button></div>
      </div>`;
    document.getElementById("ok3").onclick = () => {
      const v = document.querySelector('input[name="j3s3"]:checked');
      if (!v) return showFeedback(false, "Choisis une option.");
      S.data.s3 = parseInt(v.value, 10);
      ajouterMemo("Pack de rituels", opts[S.data.s3]);
      next();
    };
    return;
  }

  // 4) Plan avant décembre + budget cohésion
  if (S.step === 4) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 4 — Plan avant fin décembre + budget</h4>
        <textarea id="j3s4plan" class="textarea" placeholder="Onboarding, séminaire, activités, etc."></textarea>
        <label class="option"><span>Budget cohésion (€) :</span> <input id="j3s4bud" type="number" min="0" class="input" style="max-width:160px"></label>
        <div class="actions"><button class="btn" id="ok4">Valider le Jeu 3</button></div>
      </div>`;
    document.getElementById("ok4").onclick = () => {
      const plan = document.getElementById("j3s4plan").value.trim();
      const bud = parseFloat(document.getElementById("j3s4bud").value || "0");
      if (!plan) return showFeedback(false, "Plan attendu.");
      S.data.s4 = { plan, budget: isNaN(bud) ? 0 : bud };

      ajouterMemo("Plan avant décembre", plan);
      ajouterMemo("Budget cohésion", `${S.data.s4.budget} €`);

      logResult(index, true, JSON.stringify(S.data));
      applySuccess(index, m);
    };
    return;
  }
}

/* =========================================================
   JEU 4 — Partenariats (7 étapes)
========================================================= */
function renderJeu4(index) {
  const key = `_jeu4_${index}`;
  if (!etatDuJeu[key]) etatDuJeu[key] = { step: 1, data: {} };
  const S = etatDuJeu[key];
  const m = missions[index];
  const body = document.getElementById("mission-body");

  function header() {
    return `<p class="muted">Étape ${S.step} / 7</p>`;
  }
  function next() {
    S.step += 1;
    renderJeu4(index);
  }

  body.innerHTML += header();

  // 1) Partenaires actuels
  if (S.step === 1) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 1 — Partenaires actuels</h4>
        <p><strong>Qui sont les partenaires actuels de JCAQSE ?</strong></p>
        <textarea id="j4s1" class="textarea" placeholder="Ex : Préfas Incendie, BNP Paribas, PROPULSE, JPM…"></textarea>
        <div class="actions"><button class="btn" id="ok1">Suite</button></div>
      </div>`;
    document.getElementById("ok1").onclick = () => {
      const v = document.getElementById("j4s1").value.trim();
      if (!v) return showFeedback(false, "Réponse attendue.");
      S.data.s1 = v;
      ajouterMemo("Partenaires actuels", v);
      next();
    };
    return;
  }

  // 2) Entreprise en période d’essai
  if (S.step === 2) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 2 — Période d’essai</h4>
        <p><strong>Quelle entreprise est en période d’essai de 1 an pour un partenariat ?</strong></p>
        <input id="j4s2" class="input" placeholder="Nom de l’entreprise (ex : PWC)">
        <div class="actions"><button class="btn" id="ok2">Suite</button></div>
      </div>`;
    document.getElementById("ok2").onclick = () => {
      const v = document.getElementById("j4s2").value.trim();
      if (!v) return showFeedback(false, "Réponse attendue.");
      S.data.s2 = v;
      ajouterMemo("Entreprise en période d’essai (1 an)", v);
      next();
    };
    return;
  }

  // 3) QCM — Renouvellement + où trouver l’info
  if (S.step === 3) {
    const opts = [
      "Janvier ; Dossier Stratégie et pilotage",
      "Décembre ; SMQ",
      "Tous les 3 ans ; RH",
    ];
    body.innerHTML += `
      <div class="card">
        <h4>Étape 3 — Renouvellement des conventions</h4>
        <p><strong>Quand renouveler et où trouver l’info ?</strong></p>
        ${opts
          .map(
            (o, i) => `
          <label class="option"><input type="radio" name="j4s3" value="${i}"><span>${o}</span></label>
        `
          )
          .join("")}
        <div class="actions"><button class="btn" id="ok3">Suite</button></div>
      </div>`;
    document.getElementById("ok3").onclick = () => {
      const v = document.querySelector('input[name="j4s3"]:checked');
      if (!v) return showFeedback(false, "Choisis une option.");
      S.data.s3 = parseInt(v.value, 10);
      ajouterMemo("Renouvellement / Où est l’info", opts[S.data.s3]);
      next();
    };
    return;
  }

  // 4) Types d’entreprises à prospecter (libre)
  if (S.step === 4) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 4 — Cibles pertinentes</h4>
        <p><strong>Quels types d’entreprises prospecter pour de nouveaux partenaires ?</strong></p>
        <textarea id="j4s4" class="textarea" placeholder="PME, ETI, industriels, cabinets, etc. + justification"></textarea>
        <div class="actions"><button class="btn" id="ok4">Suite</button></div>
      </div>`;
    document.getElementById("ok4").onclick = () => {
      const v = document.getElementById("j4s4").value.trim();
      if (!v) return showFeedback(false, "Réponse attendue.");
      S.data.s4 = v;
      ajouterMemo("Types d’entreprises à prospecter", v);
      next();
    };
    return;
  }

  // 5) Type d’entreprise visée + exemple (libre)
  if (S.step === 5) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 5 — Cible prioritaire + exemple</h4>
        <p><strong>Quel type d’entreprise visez‑vous en priorité ? Donnez un exemple concret.</strong></p>
        <textarea id="j4s5" class="textarea" placeholder="Ex : PME locale du secteur X ; Exemple : ACME Industrie"></textarea>
        <div class="actions"><button class="btn" id="ok5">Suite</button></div>
      </div>`;
    document.getElementById("ok5").onclick = () => {
      const v = document.getElementById("j4s5").value.trim();
      if (!v) return showFeedback(false, "Réponse attendue.");
      S.data.s5 = v;
      ajouterMemo("Cible prioritaire + exemple", v);
      next();
    };
    return;
  }

  // 6) Budget annuel partenaires + arguments par pôle (table)
  if (S.step === 6) {
    const poles = [
      "Trésorerie",
      "Événementiel",
      "Présidence",
      "Secrétariat",
      "Communication",
    ];
    body.innerHTML += `
      <div class="card">
        <h4>Étape 6 — Budget partenaires & arguments par pôle</h4>
        <div id="j4s6" class="memo-body"></div>
        <div class="actions"><button class="btn" id="ok6">Suite</button></div>
      </div>`;
    const zone = document.getElementById("j4s6");
    if (!S.data.s6) S.data.s6 = {};
    poles.forEach((p) => {
      const row = document.createElement("div");
      row.className = "option";
      row.innerHTML = `
        <div style="flex:0 0 140px"><strong>${p}</strong></div>
        <input type="number" min="0" class="input" id="j4s6-bud-${p}" placeholder="Budget €" style="max-width:160px">
        <input class="input" id="j4s6-arg-${p}" placeholder="Argument / pourquoi">
      `;
      zone.appendChild(row);
    });
    document.getElementById("ok6").onclick = () => {
      const data = {};
      poles.forEach((p) => {
        const bud = parseFloat(
          document.getElementById(`j4s6-bud-${p}`).value || "0"
        );
        const arg = document.getElementById(`j4s6-arg-${p}`).value.trim();
        data[p] = { budget: isNaN(bud) ? 0 : bud, arg };
      });
      S.data.s6 = data;

      // Mémo détaillé par pôle
      poles.forEach((p) => {
        const d = S.data.s6[p];
        ajouterMemo(
          `${p} — budget & argument`,
          `${d.budget} € ; ${d.arg || "—"}`
        );
      });

      next();
    };
    return;
  }

  // 7) Budget “séduction” + idées d’actions (libre) — Validation finale
  if (S.step === 7) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 7 — Budget séduction & idées d’actions</h4>
        <p><strong>Quel budget allouer pour convaincre de nouveaux partenaires ? Quelles actions concrètes ?</strong></p>
        <input id="j4s7bud" type="number" min="0" class="input" placeholder="Budget total (€)" style="max-width:220px">
        <textarea id="j4s7ideas" class="textarea" placeholder="Ex : petit-déj pro, ateliers, visite site, contenus co-brandés…"></textarea>
        <div class="actions"><button class="btn" id="ok7">Valider le Jeu 4</button></div>
      </div>`;
    document.getElementById("ok7").onclick = () => {
      const bud = parseFloat(document.getElementById("j4s7bud").value || "0");
      const ideas = document.getElementById("j4s7ideas").value.trim();
      if (!ideas) return showFeedback(false, "Donne des exemples d’actions.");
      S.data.s7 = { budget: isNaN(bud) ? 0 : bud, ideas };

      ajouterMemo("Budget séduction", `${S.data.s7.budget} €`);
      ajouterMemo("Idées d’actions", ideas);

      logResult(index, true, JSON.stringify(S.data));
      applySuccess(index, m);
    };
    return;
  }
}

/* =========================================================
   OVERLAY RÔLES (si présent dans ton HTML)
   (si tu utilises un autre overlay, laisse juste ces 2 hooks)
========================================================= */
function showRolesOverlay(show = true) {
  const ov = document.getElementById("roles-overlay");
  if (ov) ov.classList.toggle("hidden", !show);
}
function setupRolesUI() {
  // Si tu as déjà ton implémentation détaillée, elle prendra la main.
  // Ici on affiche l’overlay si aucun joueur n’est enregistré.
  const hasOverlay = !!document.getElementById("roles-overlay");
  if (!hasOverlay) return;
  try {
    const multi = JSON.parse(
      localStorage.getItem("aqse_players_multi") || "{}"
    );
    const hasSomeone = Object.values(multi).some((arr) =>
      Array.isArray(arr) ? arr.length : !!arr
    );
    showRolesOverlay(!hasSomeone);
  } catch {
    showRolesOverlay(true);
  }
}

/* =========================================================
   INIT
========================================================= */
window.onload = () => {
  computeXpMax();
  renderProgress();

  // overlay rôles (si présent dans le HTML)
  setupRolesUI();

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

function setupRolesUI() {
  const form = document.getElementById("roles-form");

  // Charger les sauvegardes
  const saved = JSON.parse(localStorage.getItem("aqse_players_multi") || "{}");
  Object.entries(saved).forEach(([role, names]) => {
    const block = form.querySelector(`.role-block[data-role="${role}"]`);
    if (block) {
      names.forEach((name) => addNamePill(block, name));
    }
  });

  // Gestion ajout
  form.querySelectorAll(".add-name").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const block = e.target.closest(".role-block");
      const input = block.querySelector("input");
      const names = input.value
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      names.forEach((n) => addNamePill(block, n));
      input.value = "";
    });
  });

  // Sauvegarde
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {};
    form.querySelectorAll(".role-block").forEach((block) => {
      const role = block.dataset.role;
      const pills = [...block.querySelectorAll(".roles-pill span")].map(
        (s) => s.textContent
      );
      data[role] = pills;
    });
    localStorage.setItem("aqse_players_multi", JSON.stringify(data));
    document.getElementById("roles-overlay").classList.add("hidden");
  });

  // Reset
  document.getElementById("roles-reset").addEventListener("click", () => {
    localStorage.removeItem("aqse_players_multi");
    form
      .querySelectorAll(".roles-list")
      .forEach((list) => (list.innerHTML = ""));
  });
}

function addNamePill(block, name) {
  const list = block.querySelector(".roles-list");
  const pill = document.createElement("div");
  pill.className = "roles-pill";
  pill.innerHTML = `<span>${name}</span> <button type="button">×</button>`;
  pill.querySelector("button").addEventListener("click", () => pill.remove());
  list.appendChild(pill);
}

// Lancer UI rôles au chargement
document.addEventListener("DOMContentLoaded", setupRolesUI);

/* =========================================================
   DIVERS
========================================================= */
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

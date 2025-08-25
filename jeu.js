/************  JC AQSE — jeu.js  ************/
/* Intègre :
   - Overlay rôles (multi-prénoms)
   - 4 jeux libres
   - XP global
   - ✅ Tes demandes : J2-E6 clarifiée + réponses par pôle ; J3-E1 brainstorm ;
     J3-E3 question fréquence réunions + contacts ; J3-E4 budget cohésion (Tréso/SecG/Reste) avec affichage ;
     J4-E1 brainstorm.
*/

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
  missionActuelle: null, // index 0..3
  timer: { handle: null, total: 0, left: 0, expired: false },

  _jeu1: {}, // brainstorm
  _jeu2: {}, // stratégie commerciale
  _jeu3: {}, // cohésion
  _jeu4: {}, // partenariats
};

// Journal simple si besoin d’un bilan (non exporté)
const results = [];

// Verrouillage : un jeu validé => verrouillé (non rejouable dans la session)
const missionLocked = new Set();
const isLocked = (idx) => missionLocked.has(idx);
function lockMission(idx) {
  missionLocked.add(idx);
  setTimelineStates();
}

/* =========================================================
   UTILS
========================================================= */
function renderProgress() {
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
  if (!XP_MAX || XP_MAX < 1) computeXpMax();

  const m = missions[index];
  const body = document.getElementById("mission-body");
  if (!body) return;

  clearMemo();

  let html = `
    <h3 class="mission-title">${m.titre || `Jeu ${index + 1}`}</h3>
    <div class="mission-meta">
      <span class="role-badge">Jeu ${index + 1}</span>
      ${m.scoring?.xp ? `&nbsp;•&nbsp; ${m.scoring.xp} XP` : ""}
    </div>
    ${m.question ? `<p>${m.question}</p>` : ""}
  `;
  body.innerHTML = html;

  if (m.type === "qcm" || m.type === "choix" || m.type === "texte") {
    renderNativeMissionUI(index, m);
  } else if (m.type === "brainstorm") {
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
    renderJeu3(index);
  } else if (m.type === "jeu4") {
    if (isLocked(index)) {
      disableCurrentInputs();
      ajouterMemo("Statut", "Jeu déjà validé (verrouillé)");
      return;
    }
    renderJeu4(index);
  } else {
    body.innerHTML += `<div class="end-screen">Type de mission à venir.</div>`;
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
      <div class="actions">
        <button class="btn" onclick="validerTexte(${index})">Valider</button>
      </div>`;
  }

  body.innerHTML = html;
}

function disableCurrentInputs() {
  document
    .querySelectorAll(
      "#mission-body input, #mission-body textarea, #mission-body button"
    )
    .forEach((el) => (el.disabled = true));
}

/* =========================================================
   VALIDATIONS GÉNÉRIQUES
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
const rewardXpOf = (m) => m?.scoring?.xp ?? m.points ?? 0;

function applySuccess(index, m) {
  if (!XP_MAX || XP_MAX < 1) computeXpMax();
  const xp = rewardXpOf(m || {});
  majIndics({ xp });
  if (!etatDuJeu.etapesTerminees.includes(index)) {
    etatDuJeu.etapesTerminees.push(index);
  }
  disableCurrentInputs();
  showFeedback(true, `Jeu validé ! +${xp} XP`);
  lockMission(index);
  setTimelineStates();
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
  etatDuJeu = {
    etapesTerminees: [],
    missionActuelle: null,
    timer: { handle: null, total: 0, left: 0, expired: false },
    _jeu1: {},
    _jeu2: {},
    _jeu3: {},
    _jeu4: {},
  };
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
            <li>Sélectionne ensuite <strong>5 de tes idées</strong> (cliquer pour sélectionner/désélectionner).</li>
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
      if (s.ideas.length) ajouterMemo("Idées saisies", s.ideas.join(", "));
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
   JEU 2 — 7 étapes (E6 clarifiée + réponses libres par pôle)
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

  // 1) Cadrage initial (libre)
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

  // 2) Vision & objectifs (Présidence)
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

  // 3) *** NOUVEAU *** Tableau dynamique — Qui prospecte quelles parties prenantes ?
  if (S.step === 3) {
    // Liste des secteurs (colonne 1) et des parties intéressées (colonne 3)
    const sectors = [
      "Industrie (Agroalimentaire, Chimie, Pétrochimie…)",
      "Construction et BTP",
      "Énergie et Environnement",
      "Services et Commerces",
      "Santé et Social",
      "Administration & collectivités",
      "Informatique & Nouvelles Technologies",
      "Agriculture",
      "Startups & TPE/PME",
      "Éducation et formation",
      "Luxe & mode",
      "Industrie minière & extractive",
      "Secteur maritime & portuaire",
      "Tourisme & loisirs durables",
      "Événementiel",
      "Centres de recherche & labos (incl. contrôle qualité)",
      "Centres commerciaux & immobilier (incl. audits sécurité)",
      "Marché public",
      "Supply‑chain / Logistique",
    ];
    const stakeholders = [
      "ESAIP",
      "Alumnis ESAIP",
      "Partenaires ESAIP",
      "Alumnis Junior",
      "Partenaires Junior (actuels & anciens)",
      "Anciens clients",
      "Autres JE (certifiées pour audit)",
      "Entreprises de stages/alternances",
      "Professeurs / intervenants",
      "Contacts perso",
    ];

    body.innerHTML += `
      <div class="card">
        <h4>Étape 3 — Qui prospecte quelles parties prenantes ?</h4>
        <p class="muted" style="margin-top:4px">
          <strong>Consigne :</strong> <em>Écrivez le nom des pôles dans les cases que vous souhaitez</em>.
        </p>
        <div style="overflow:auto; margin-top:8px;">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Secteurs d'activités</th>
                <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Responsable</th>
                <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Parties intéressées</th>
                <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Responsable</th>
              </tr>
            </thead>
            <tbody id="j2s3-body"></tbody>
          </table>
        </div>
        <div class="actions">
          <button class="btn" id="ok3">Suite</button>
        </div>
      </div>`;

    const tb = document.getElementById("j2s3-body");

    // Construit les lignes
    sectors.forEach((sec, i) => {
      const row = document.createElement("tr");

      function td(txt) {
        const d = document.createElement("td");
        d.style.padding = "8px";
        d.style.borderBottom = "1px solid rgba(255,255,255,.06)";
        d.innerHTML = txt;
        return d;
      }
      // input helper
      function inputCell(cls) {
        const d = document.createElement("td");
        d.style.padding = "8px";
        d.style.borderBottom = "1px solid rgba(255,255,255,.06)";
        const inp = document.createElement("input");
        inp.className = `input ${cls}`;
        inp.placeholder = "ex : Présidence";
        inp.dataset.row = String(i);
        d.appendChild(inp);
        return d;
      }

      row.appendChild(td(`<strong>${sec}</strong>`));
      row.appendChild(inputCell("j2s3-resp-secteur"));

      const stkh = stakeholders[i % stakeholders.length];
      row.appendChild(td(stkh));
      row.appendChild(inputCell("j2s3-resp-partie"));

      tb.appendChild(row);
    });

    // Si retour sur l'étape, recharger les anciennes saisies
    if (S.data.s3 && Array.isArray(S.data.s3.rows)) {
      S.data.s3.rows.forEach((r, idx) => {
        const a = tb.querySelector(`.j2s3-resp-secteur[data-row="${idx}"]`);
        const b = tb.querySelector(`.j2s3-resp-partie[data-row="${idx}"]`);
        if (a) a.value = r.respSecteur || "";
        if (b) b.value = r.respPartie || "";
      });
    }

    document.getElementById("ok3").onclick = () => {
      // Collecte des données
      const rows = [];
      const aList = tb.querySelectorAll(".j2s3-resp-secteur");
      const bList = tb.querySelectorAll(".j2s3-resp-partie");
      for (let i = 0; i < sectors.length; i++) {
        rows.push({
          secteur: sectors[i],
          parties: stakeholders[i % stakeholders.length],
          respSecteur: aList[i]?.value.trim() || "",
          respPartie: bList[i]?.value.trim() || "",
        });
      }
      S.data.s3 = { rows };

      // Mémo : quelques infos utiles
      const filled =
        rows.filter((r) => r.respSecteur || r.respPartie).length || 0;
      ajouterMemo(
        "Attribution prospection",
        `${filled} ligne(s) renseignée(s)`
      );
      const preview = rows
        .filter((r) => r.respSecteur || r.respPartie)
        .slice(0, 4)
        .map(
          (r) =>
            `${r.secteur} → <em>${r.respSecteur || "—"}</em> / ${
              r.parties
            } → <em>${r.respPartie || "—"}</em>`
        )
        .join("<br>");
      if (preview) ajouterMemo("Exemples (aperçu)", preview);

      next();
    };
    return;
  }

  // 4) QCM — rythme
  if (S.step === 4) {
    const opts = [
      "1 fois / semaine",
      "3 fois / semaine, 15 min",
      "Tous les jours (sauf week-end), 15 min",
      "1 fois / mois",
    ];
    body.innerHTML += `
      <div class="card">
        <h4>Étape 4 — QCM</h4>
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

  // 5) Brainstorm — canaux / événements
  if (S.step === 5) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 5 — Brainstorm</h4>
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

  // 6) ✅ Question clarifiée + réponse libre par pôle
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
        <h4>Étape 6 — Budget & allocation par pôle</h4>
        <p><strong>Quel pourrait être le budget à allouer dans le business et qu’est-ce qu’il faut allouer sur votre mandat ?</strong></p>
        <div id="j2s6grid" class="memo-body"></div>
        <textarea id="j2s6why" class="textarea" placeholder="Expliquez votre logique d’allocation globale…"></textarea>
        <div class="actions"><button class="btn" id="ok6">Suite</button></div>
      </div>`;
    const grid = document.getElementById("j2s6grid");
    if (!S.data.s6) S.data.s6 = { budget: {}, notes: {}, why: "" };
    poles.forEach((p) => {
      const row = document.createElement("div");
      row.className = "option";
      row.innerHTML = `
        <div style="flex:1"><strong>${p}</strong></div>
        <input type="number" min="0" class="input" id="j2s6-${p}-€" placeholder="Budget (€)" style="max-width:160px">
      `;
      const note = document.createElement("textarea");
      note.className = "textarea";
      note.placeholder = `Que faut-il allouer sur le mandat pour ${p} ? (réponse libre)`;
      note.id = `j2s6-${p}-txt`;
      note.style.marginTop = "8px";
      const wrap = document.createElement("div");
      wrap.style.flex = "1";
      wrap.appendChild(note);
      row.appendChild(wrap);
      grid.appendChild(row);
    });
    document.getElementById("ok6").onclick = () => {
      const budget = {};
      const notes = {};
      poles.forEach((p) => {
        const v = parseFloat(
          document.getElementById(`j2s6-${p}-€`).value || "0"
        );
        budget[p] = isNaN(v) ? 0 : v;
        notes[p] = document.getElementById(`j2s6-${p}-txt`).value.trim();
      });
      const why = document.getElementById("j2s6why").value.trim();
      if (!why) return showFeedback(false, "Expliquez votre logique globale.");
      S.data.s6 = { budget, notes, why };

      poles.forEach((p) => {
        ajouterMemo(`${p} — budget`, `${budget[p]} €`);
        if (notes[p]) ajouterMemo(`${p} — allocation mandat`, notes[p]);
      });
      ajouterMemo("Pourquoi cette répartition", why);
      next();
    };
    return;
  }

  // 7) Cible client prioritaire
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

  // 1) ✅ Brainstorm cohésion
  if (S.step === 1) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 1 — Brainstorm Cohésion</h4>
        <p><strong>Listez toutes les idées de rituels/actions pour la cohésion (présentiel & distance).</strong></p>
        <label class="option"><input id="j3s1in" class="input" placeholder="Ajoute une idée puis Entrée"></label>
        <div id="j3s1list" class="memo-body"></div>
        <div class="actions"><button class="btn" id="ok1" disabled>Suite</button></div>
      </div>`;
    const list = document.getElementById("j3s1list");
    const input = document.getElementById("j3s1in");
    if (!S.data.s1) S.data.s1 = [];
    function renderList() {
      list.innerHTML = "";
      if (!S.data.s1.length)
        list.innerHTML = `<p class="muted">Aucune idée ajoutée.</p>`;
      else {
        S.data.s1.forEach((c, i) => {
          const line = document.createElement("div");
          line.className = "memo-line";
          line.innerHTML = `${c} <span class="muted">#${i + 1}</span>`;
          list.appendChild(line);
        });
      }
      document.getElementById("ok1").disabled = S.data.s1.length < 1;
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const v = input.value.trim();
        if (v) {
          S.data.s1.push(v);
          input.value = "";
          renderList();
        }
      }
    });
    document.getElementById("ok1").onclick = () => {
      ajouterMemo("Idées de cohésion", S.data.s1.join(", "));
      next();
    };
    renderList();
    return;
  }

  // 2) Fréquences générales (libre)
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

  // 3) ✅ Bonne question (libre)
  if (S.step === 3) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 3 — Organisation des échanges</h4>
        <p><strong>Quelle est la fréquence des réunions ainsi que des prises de contacts avec chaque membre ?</strong></p>
        <textarea id="j3s3" class="textarea" placeholder="Détaille les rythmes par pôle/membre si utile…"></textarea>
        <div class="actions"><button class="btn" id="ok3">Suite</button></div>
      </div>`;
    document.getElementById("ok3").onclick = () => {
      const v = document.getElementById("j3s3").value.trim();
      if (!v) return showFeedback(false, "Réponse attendue.");
      S.data.s3 = v;
      ajouterMemo("Fréquences (réunions & contacts)", v);
      next();
    };
    return;
  }

  // 4) ✅ Budget cohésion par pôles + Total (affiché UNE seule fois)
  if (S.step === 4) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 4 — Budget alloué pour la cohésion</h4>
        <p class="muted">Saisissez le budget par pôle.</p>
        <div id="j3s4grid" class="memo-body"></div>
        <div id="j3s4recap" class="memo-body" style="margin-top:8px"></div>
        <div class="actions"><button class="btn" id="ok4">Valider le Jeu 3</button></div>
      </div>`;

    const champs = [
      { id: "Tresorerie", label: "Trésorerie" },
      { id: "SecG", label: "Secrétariat Général" },
      { id: "Presidence", label: "Présidence" },
      { id: "Evenementiel", label: "Événementiel" },
      { id: "Communication", label: "Communication" },
    ];

    const grid = document.getElementById("j3s4grid");
    const recap = document.getElementById("j3s4recap");

    if (!S.data.s4) {
      S.data.s4 = {
        Tresorerie: 0,
        SecG: 0,
        Presidence: 0,
        Evenementiel: 0,
        Communication: 0,
      };
    }

    // champs de saisie
    champs.forEach((c) => {
      const row = document.createElement("div");
      row.className = "option";
      row.innerHTML = `
        <div style="flex:1"><strong>${c.label}</strong></div>
        <input type="number" min="0" class="input" id="j3s4-${c.id}" placeholder="€" style="max-width:160px">
      `;
      grid.appendChild(row);
    });

    function renderRecap() {
      recap.innerHTML = ""; // ← on nettoie à chaque fois (pas de doublon)
      let total = 0;

      champs.forEach((c) => {
        const v = parseFloat(
          document.getElementById(`j3s4-${c.id}`).value || "0"
        );
        S.data.s4[c.id] = isNaN(v) ? 0 : v;
        total += S.data.s4[c.id];
      });

      // Ligne Total (unique)
      const totalLine = document.createElement("div");
      totalLine.className = "memo-line";
      totalLine.innerHTML = `<strong>Total :</strong> ${total} €`;
      recap.appendChild(totalLine);
    }

    grid.addEventListener("input", renderRecap);
    renderRecap();

    document.getElementById("ok4").onclick = () => {
      // Mémo propre : une ligne par pôle + total
      let total = 0;
      champs.forEach((c) => {
        total += S.data.s4[c.id];
        ajouterMemo(`Budget cohésion — ${c.label}`, `${S.data.s4[c.id]} €`);
      });
      ajouterMemo("Budget cohésion — Total", `${total} €`);
      logResult(index, true, JSON.stringify(S.data));
      applySuccess(index, m);
    };
    return;
  }
}

/* =========================================================
   JEU 4 — Partenariats (Étape 1 = Brainstorm)
========================================================= */
function renderJeu4(index) {
  const key = `_jeu4_${index}`;
  if (!etatDuJeu[key]) etatDuJeu[key] = { step: 1, data: {} };
  const S = etatDuJeu[key];
  const m = missions[index];
  const body = document.getElementById("mission-body");

  function next() {
    S.step += 1;
    renderJeu4(index);
  }

  // 1) ✅ Brainstorm partenariats
  if (S.step === 1) {
    body.innerHTML += `
      <p class="muted">Étape 1 / 3</p>
      <div class="card">
        <h4>Étape 1 — Brainstorm Partenariats</h4>
        <p><strong>Listez des pistes de partenaires (écoles, entreprises, institutions, assos, etc.).</strong></p>
        <label class="option"><input id="j4s1in" class="input" placeholder="Ajoute une idée puis Entrée"></label>
        <div id="j4s1list" class="memo-body"></div>
        <div class="actions"><button class="btn" id="ok1" disabled>Suite</button></div>
      </div>`;
    const list = document.getElementById("j4s1list");
    const input = document.getElementById("j4s1in");
    if (!S.data.s1) S.data.s1 = [];
    function renderList() {
      list.innerHTML = "";
      if (!S.data.s1.length)
        list.innerHTML = `<p class="muted">Aucune piste ajoutée.</p>`;
      else {
        S.data.s1.forEach((c, i) => {
          const line = document.createElement("div");
          line.className = "memo-line";
          line.innerHTML = `${c} <span class="muted">#${i + 1}</span>`;
          list.appendChild(line);
        });
      }
      document.getElementById("ok1").disabled = S.data.s1.length < 1;
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const v = input.value.trim();
        if (v) {
          S.data.s1.push(v);
          input.value = "";
          renderList();
        }
      }
    });
    document.getElementById("ok1").onclick = () => {
      ajouterMemo("Pistes partenariats", S.data.s1.join(", "));
      next();
    };
    renderList();
    return;
  }

  // 2) Entreprise en période d’essai (libre ; mémo)
  if (S.step === 2) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 2 — Période d’essai</h4>
        <p><strong>Quelle entreprise est en période d’essai de 1 an pour un partenariat ?</strong></p>
        <input id="j4s2" class="input" placeholder="Nom de l’entreprise">
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

  // 3) Deux questions libres (3.1 et 3.2) — mémo
  if (S.step === 3) {
    body.innerHTML += `
      <div class="card">
        <h4>Étape 3 — Conventions</h4>
        <label class="option" style="align-items:flex-start">
          <div style="flex:1"><strong>3.1 — Quand faut‑il refaire les conventions de partenariats ?</strong></div>
        </label>
        <textarea id="j4s3q1" class="textarea" placeholder="Indiquez la périodicité / le moment…"></textarea>

        <label class="option" style="align-items:flex-start">
          <div style="flex:1"><strong>3.2 — Où trouver l’information ?</strong></div>
        </label>
        <textarea id="j4s3q2" class="textarea" placeholder="Ex : dossier, outil, référent, etc."></textarea>

        <div class="actions"><button class="btn" id="ok3">Suite</button></div>
      </div>`;
    document.getElementById("ok3").onclick = () => {
      const q1 = document.getElementById("j4s3q1").value.trim();
      const q2 = document.getElementById("j4s3q2").value.trim();
      if (!q1 || !q2)
        return showFeedback(false, "Merci de répondre aux 2 questions.");
      S.data.s3 = { when: q1, where: q2 };

      ajouterMemo("Conventions — Quand refaire ?", q1);
      ajouterMemo("Conventions — Où trouver l’information ?", q2);

      next();
    };
    return;
  }

  // 4) Types d’entreprises à prospecter (libre ; mémo)
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

  // 5) Type d’entreprise visée + exemple (libre ; mémo)
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

  // 6) Budget annuel partenaires + arguments par pôle (table) — mémo
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

  // 7) Budget “séduction” + idées d’actions (libre) — Validation finale (mémo)
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
   BOOT
========================================================= */
window.addEventListener("DOMContentLoaded", () => {
  computeXpMax();
  renderProgress();
  renderTimeline();

  // Bouton “Rejouer”
  const resetBtn = document.getElementById("btn-reset");
  if (resetBtn) resetBtn.addEventListener("click", resetGame);
});

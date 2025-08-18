let score = 0;
let etatDuJeu = {
  etapesDebloquees: [true, false, false, false, false, false],
  etapesTerminees: [],
  missionActuelle: null,
};

function roleClass(roleLabel) {
  const r = (roleLabel || "").toLowerCase();
  if (r.includes("présidence")) return "role-pres";
  if (r.includes("trésor")) return "role-treso";
  if (r.includes("secr")) return "role-sec";
  if (r.includes("événement")) return "role-event";
  if (r.includes("communication")) return "role-com";
  if (r.includes("développement") || r.includes("commercial"))
    return "role-biz";
  if (r.includes("partenariat")) return "role-biz";
  return "";
}

function setTimelineStates() {
  const buttons = document.querySelectorAll(".step-btn");
  buttons.forEach((btn, i) => {
    btn.disabled = !etatDuJeu.etapesDebloquees[i];
    btn.classList.remove("locked", "current", "done");
    if (!etatDuJeu.etapesDebloquees[i]) btn.classList.add("locked");
    if (etatDuJeu.etapesTerminees.includes(i)) btn.classList.add("done");
    if (etatDuJeu.missionActuelle === i) btn.classList.add("current");
  });
}

function updateProgress() {
  const done = etatDuJeu.etapesTerminees.length;
  const total = missions.length;
  const pct = Math.round((done / total) * 100);
  document.getElementById("progress-bar").style.width = pct + "%";
}

function showFeedback(ok, msg) {
  const box = document.getElementById("feedback");
  box.className = "feedback " + (ok ? "ok" : "ko");
  box.textContent = (ok ? "✅ " : "❌ ") + msg;
}

function renderMission(index) {
  const m = missions[index];
  const body = document.getElementById("mission-body");
  const roleCls = roleClass(m.role);

  let html = `
    <h3 class="mission-title">${m.titre}</h3>
    <div class="mission-meta">
      <span class="role-badge ${roleCls}">${m.role || "—"}</span>
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

  body.innerHTML = html;
  document.getElementById("feedback").textContent = "";
}

function loadStep(index) {
  if (!etatDuJeu.etapesDebloquees[index]) {
    showFeedback(false, "Cette étape n'est pas encore débloquée.");
    return;
  }
  etatDuJeu.missionActuelle = index;
  setTimelineStates();
  renderMission(index);
}

function validerQCM(index) {
  const m = missions[index];
  const checked = Array.from(
    document.querySelectorAll('input[name="opt"]:checked')
  ).map((e) => parseInt(e.value));
  const bonnes = m.bonnesReponses || [];
  const estBonne =
    bonnes.every((r) => checked.includes(r)) &&
    checked.length === bonnes.length;

  if (estBonne) {
    score += m.points;
    document.getElementById("score-value").textContent = score;
    finalizeStep(index, "Bonne réponse ! Étape suivante débloquée.");
  } else {
    showFeedback(false, "Mauvaise réponse ou réponse incomplète.");
  }
}

function validerChoix(index) {
  const m = missions[index];
  const choisi = parseInt(
    document.querySelector('input[name="opt"]:checked')?.value
  );
  const estBonne = choisi === m.bonneReponse;

  if (estBonne) {
    score += m.points;
    document.getElementById("score-value").textContent = score;
    finalizeStep(index, "Bonne réponse ! Étape suivante débloquée.");
  } else {
    showFeedback(false, "Mauvais choix.");
  }
}

function finalizeStep(index, okMsg) {
  if (!etatDuJeu.etapesTerminees.includes(index)) {
    etatDuJeu.etapesTerminees.push(index);
  }
  if (index + 1 < missions.length) {
    etatDuJeu.etapesDebloquees[index + 1] = true;
  }
  setTimelineStates();
  updateProgress();
  showFeedback(true, okMsg);
  verifierFin();
}

function verifierFin() {
  if (etatDuJeu.etapesTerminees.length === missions.length) {
    document.getElementById("mission-body").innerHTML = `
      <div class="end-screen">
        <h3>🎉 Félicitations !</h3>
        <p>Vous avez terminé le mandat avec un total de <strong>${score} XP</strong>.</p>
      </div>
    `;
    document.getElementById("feedback").textContent = "";
  }
}

window.onload = () => {
  setTimelineStates();
  updateProgress();
};

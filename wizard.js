'use strict';

// ────────────────────────────────────────────────────────────────────────────
//  wizard.js — KI-Use-Case-Navigator
//  Anwendungslogik: Modul-Rendering, Branching, Persistenz, Navigation,
//  Markdown-Export, PDF-Export (jsPDF).
//  Alle Inhalte kommen aus content.js (NAVIGATOR).
// ────────────────────────────────────────────────────────────────────────────

(function () {

  // ── Konstanten ─────────────────────────────────────────────────────────────
  const STORAGE_KEY = 'navigator_responses';
  const M4_THRESHOLD_GUT     = 7;
  const M4_THRESHOLD_BEDINGT = 4;
  const M4_SCORING_FIELDS = [
    'm4_haeufigkeit', 'm4_variabilitaet', 'm4_fehlertoleranz',
    'm4_rechtliche_bindung', 'm4_nutzen_aufwand'
  ];

  const ONBOARDING_SCREENS = [
    {
      icon: '🧭',
      title: 'Was ist der KI-Use-Case-Navigator?',
      body: 'Ein Werkzeug zur strukturierten Reflexion deines KI-Vorhabens in der Kommunalverwaltung — von der ersten Idee bis zur begründeten Entscheidung.',
      hint: null
    },
    {
      icon: '⏱',
      title: 'Wie lange dauert das?',
      body: 'Ca. 15–25 Minuten — je nachdem, wie weit dein Use Case schon konkretisiert ist. Alle Felder sind freiwillig. Du kannst jederzeit unterbrechen und weitermachen.',
      hint: 'Dein Fortschritt wird automatisch im Browser gespeichert.'
    },
    {
      icon: '📄',
      title: 'Was bekommst du am Ende?',
      body: 'Einen persönlichen Use-Case-Steckbrief mit Selbstbewertung — zum Herunterladen als Markdown oder PDF. Alle Daten bleiben ausschließlich in deinem Browser.',
      hint: null
    }
  ];

  // ── App-State ──────────────────────────────────────────────────────────────
  let state    = {};   // { use_case_typ, ki_eignung, hosting_typ }
  let responses = {};  // { fieldId: value, ... }
  let currentModuleIndex = 0;
  let onExportScreen = false;
  let onboardingIndex = -1; // >= 0 wenn Onboarding aktiv
  let pendingResume = null;  // Callback für URL-Import-Resume

  // ── Hilfsfunktionen ────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── localStorage ───────────────────────────────────────────────────────────

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        state: Object.assign({}, state),
        responses: Object.assign({}, responses),
        currentModuleIndex
      }));
    } catch (_) { /* Quota oder Private Browsing */ }
    updateProgressBars();
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  // ── State-Verwaltung ───────────────────────────────────────────────────────

  function resetState() {
    state = {};
    Object.keys(NAVIGATOR.stateKeys).forEach(k => { state[k] = null; });
  }

  function recomputeStateFromResponses() {
    NAVIGATOR.modules.forEach(mod => {
      mod.fields.forEach(field => {
        if (field.branching && field.branching.setVar) {
          const val = responses[field.id];
          if (val !== undefined && val !== null && val !== '') {
            state[field.branching.setVar] = val;
          }
        }
      });
    });
    computeM4Score();
  }

  function computeM4Score() {
    const m4 = NAVIGATOR.modules.find(m => m.id === 'm4');
    if (!m4) return;

    let score = 0;
    let filledCount = 0;

    M4_SCORING_FIELDS.forEach(fid => {
      const field = m4.fields.find(f => f.id === fid);
      const val   = responses[fid];
      if (field && field.scoring && val !== undefined && field.scoring[val] !== undefined) {
        score += field.scoring[val];
        filledCount++;
      }
    });

    if (filledCount === M4_SCORING_FIELDS.length) {
      if      (score >= M4_THRESHOLD_GUT)     state.ki_eignung = 'ja';
      else if (score >= M4_THRESHOLD_BEDINGT) state.ki_eignung = 'bedingt';
      else                                    state.ki_eignung = 'nein';
    }
  }

  // ── Sichtbarkeitslogik ─────────────────────────────────────────────────────

  function isFieldVisible(field) {
    if (field.showWhen) return evalShowWhen(field.showWhen);
    if (field.showFor) {
      const typ = state[field.showFor.var || 'use_case_typ'];
      return Array.isArray(field.showFor.values) && field.showFor.values.includes(typ);
    }
    return true;
  }

  function evalShowWhen(sw) {
    if (sw.stateKey) {
      const val = state[sw.stateKey];
      if (sw.values) return sw.values.includes(val);
      if (sw.value !== undefined) return val === sw.value;
      return false;
    }
    if (sw.field) {
      const val = responses[sw.field];
      const check = sw.values || (sw.value !== undefined ? [sw.value] : []);
      if (Array.isArray(val)) return val.some(v => check.includes(v));
      return check.includes(val);
    }
    return true;
  }

  // ── Label-HTML ─────────────────────────────────────────────────────────────

  function buildLabelHtml(field) {
    if (!field.label) return '';
    const isCritical = field.label.includes('[kritisch]');
    const text = field.label.replace('[kritisch]', '').trim();

    let html = `<div class="field-label-row">`;
    html += `<label class="field-label${isCritical ? ' label-critical' : ''}" for="${field.id}">`;
    html += escapeHtml(text);
    html += `</label>`;
    if (field.source) {
      html += `<button type="button" class="source-btn"
        data-label="${escapeHtml(field.source.label)}"
        data-text="${escapeHtml(field.source.text)}"
        aria-label="Quelle anzeigen: ${escapeHtml(field.source.label)}">ⓘ</button>`;
    }
    html += `</div>`;
    if (field.hint) {
      html += `<p class="field-hint">${escapeHtml(field.hint)}</p>`;
    }
    return html;
  }

  // ── Feld-Rendering ─────────────────────────────────────────────────────────

  function renderField(field) {
    if (!isFieldVisible(field)) return null;

    const wrap = document.createElement('div');
    wrap.className = `field field-type-${field.type}`;
    wrap.dataset.id = field.id;

    switch (field.type) {
      case 'info':        renderInfo(wrap, field);        break;
      case 'text':        renderText(wrap, field);        break;
      case 'textarea':    renderTextarea(wrap, field);    break;
      case 'select':      renderSelect(wrap, field);      break;
      case 'multiselect': renderMultiselect(wrap, field); break;
      case 'scale':       renderScale(wrap, field);       break;
      case 'checklist':   renderChecklist(wrap, field);   break;
      default: return null;
    }

    return wrap;
  }

  function renderInfo(wrap, field) {
    // Dynamischer Ergebnis-Block (m4_eignung_ergebnis)
    if (field.dynamic && field.contentByScore) {
      const score   = state.ki_eignung;
      const content = score && field.contentByScore[score];
      if (content) {
        wrap.classList.add('info-result', `info-result-${score}`);
        wrap.innerHTML = `<div class="info-block"><p>${content}</p></div>`;
      } else {
        wrap.style.display = 'none';
      }
      return;
    }
    const paragraphs = (field.content || []).map(c => `<p>${c}</p>`).join('');
    wrap.innerHTML = `<div class="info-block">${paragraphs}</div>`;
  }

  function renderText(wrap, field) {
    const val = escapeHtml(responses[field.id] || '');
    wrap.innerHTML = buildLabelHtml(field) +
      `<input type="text" id="${field.id}" name="${field.id}" value="${val}" autocomplete="off">`;
    wrap.querySelector('input').addEventListener('input', e => {
      responses[field.id] = e.target.value;
      saveToStorage();
    });
    attachSourceButtons(wrap);
  }

  function renderTextarea(wrap, field) {
    const val  = escapeHtml(responses[field.id] || '');
    const rows = field.rows || 4;
    wrap.innerHTML = buildLabelHtml(field) +
      `<textarea id="${field.id}" name="${field.id}" rows="${rows}">${val}</textarea>`;
    wrap.querySelector('textarea').addEventListener('input', e => {
      responses[field.id] = e.target.value;
      saveToStorage();
    });
    attachSourceButtons(wrap);
  }

  function renderSelect(wrap, field) {
    const current = responses[field.id];
    let html = buildLabelHtml(field);
    html += `<div class="options-list" role="radiogroup">`;

    (field.options || []).forEach(opt => {
      // Optionsseitige showFor-Filterung
      if (opt.showFor && Array.isArray(opt.showFor)) {
        if (!opt.showFor.includes(state.use_case_typ)) return;
      }
      const isCrit   = opt.label.includes('[kritisch]');
      const labelTxt = escapeHtml(opt.label.replace('[kritisch]', '').trim());
      const checked  = current === opt.value ? ' checked' : '';
      const descHtml = opt.description
        ? `<span class="opt-desc">${escapeHtml(opt.description)}</span>` : '';

      html += `<label class="option-label${isCrit ? ' option-critical' : ''}">
        <input type="radio" name="${field.id}" value="${escapeHtml(opt.value)}"${checked}>
        <span class="opt-body">
          <span class="opt-main">${labelTxt}</span>
          ${descHtml}
        </span>
      </label>`;
    });

    html += `</div>`;
    wrap.innerHTML = html;
    attachSourceButtons(wrap);

    wrap.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', e => {
        responses[field.id] = e.target.value;

        if (field.branching && field.branching.setVar) {
          state[field.branching.setVar] = e.target.value;
        }
        if (M4_SCORING_FIELDS.includes(field.id)) {
          computeM4Score();
        }

        saveToStorage();
        refreshModuleView();
      });
    });
  }

  function renderMultiselect(wrap, field) {
    const current = responses[field.id] || [];
    let html = buildLabelHtml(field);
    html += `<div class="options-list" role="group">`;

    (field.options || []).forEach(opt => {
      const checked  = current.includes(opt.value) ? ' checked' : '';
      const descHtml = opt.description
        ? `<span class="opt-desc">${escapeHtml(opt.description)}</span>` : '';
      html += `<label class="option-label">
        <input type="checkbox" name="${field.id}" value="${escapeHtml(opt.value)}"${checked}>
        <span class="opt-body">
          <span class="opt-main">${escapeHtml(opt.label)}</span>
          ${descHtml}
        </span>
      </label>`;
    });

    html += `</div>`;
    wrap.innerHTML = html;
    attachSourceButtons(wrap);

    wrap.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        responses[field.id] = Array.from(
          wrap.querySelectorAll('input[type="checkbox"]:checked')
        ).map(el => el.value);
        saveToStorage();
      });
    });
  }

  function renderScale(wrap, field) {
    const min = field.min !== undefined ? field.min : 1;
    const max = field.max !== undefined ? field.max : 5;
    const val = responses[field.id] !== undefined ? responses[field.id] : min;

    wrap.innerHTML = buildLabelHtml(field) +
      `<div class="scale-wrapper">
        <span class="scale-end-label">${escapeHtml(field.minLabel || String(min))}</span>
        <input type="range" id="${field.id}" name="${field.id}"
               min="${min}" max="${max}" value="${val}">
        <span class="scale-end-label">${escapeHtml(field.maxLabel || String(max))}</span>
      </div>
      <output class="scale-output" for="${field.id}">${val}</output>`;

    const input  = wrap.querySelector('input[type="range"]');
    const output = wrap.querySelector('.scale-output');
    input.addEventListener('input', e => {
      output.textContent = e.target.value;
      responses[field.id] = Number(e.target.value);
      saveToStorage();
    });
    attachSourceButtons(wrap);
  }

  function renderChecklist(wrap, field) {
    let html = buildLabelHtml(field);
    html += `<ul class="checklist">`;

    (field.items || []).forEach(item => {
      const auto      = computeChecklistStatus(item);
      const overrides = (typeof responses[field.id] === 'object' && responses[field.id])
        ? responses[field.id] : {};
      const status = overrides[item.id] || auto;
      const ariaLabel = status === 'green' ? 'Erledigt' : status === 'yellow' ? 'Teilweise' : 'Offen';

      html += `<li class="checklist-item" data-item="${item.id}" data-status="${status}">
        <button type="button" class="traffic-light tl-${status}" aria-label="${ariaLabel}">
          <span class="tl-dot"></span>
        </button>
        <span class="checklist-label">${escapeHtml(item.label)}</span>
      </li>`;
    });

    html += `</ul>`;
    wrap.innerHTML = html;
    attachSourceButtons(wrap);

    // Manuelles Überschreiben: Ampel-Klick rotiert green → yellow → red → green
    wrap.querySelectorAll('.checklist-item').forEach(li => {
      li.querySelector('.traffic-light').addEventListener('click', () => {
        const cur  = li.dataset.status;
        const next = cur === 'green' ? 'yellow' : cur === 'yellow' ? 'red' : 'green';
        li.dataset.status = next;
        const tl = li.querySelector('.traffic-light');
        tl.className = `traffic-light tl-${next}`;
        tl.setAttribute('aria-label', next === 'green' ? 'Erledigt' : next === 'yellow' ? 'Teilweise' : 'Offen');

        if (!responses[field.id] || typeof responses[field.id] !== 'object') {
          responses[field.id] = {};
        }
        responses[field.id][li.dataset.item] = next;
        saveToStorage();
      });
    });
  }

  function computeChecklistStatus(item) {
    const logic = item.status_logic || '';
    const refs  = item.referenced_fields || [];

    if (logic === 'green_if_filled' || logic === 'green_if_any_filled') {
      return refs.some(fid => {
        const v = responses[fid];
        return Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== null && v !== '');
      }) ? 'green' : 'red';
    }

    if (logic.startsWith('green_if_not_value:')) {
      const badVals = logic.slice('green_if_not_value:'.length).split(',').map(s => s.trim());
      const anyFilled = refs.some(fid => {
        const v = responses[fid];
        return Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== null && v !== '');
      });
      if (!anyFilled) return 'red';
      const hasBad = refs.some(fid => badVals.includes(responses[fid]));
      return hasBad ? 'yellow' : 'green';
    }

    return 'red';
  }

  // ── Quellenangaben-Tooltip ─────────────────────────────────────────────────

  function attachSourceButtons(wrap) {
    wrap.querySelectorAll('.source-btn').forEach(btn => {
      const label = btn.dataset.label;
      const text  = btn.dataset.text;
      let tooltip = null;

      function showTip() {
        if (tooltip) return;
        tooltip = document.createElement('div');
        tooltip.className = 'source-tooltip';
        tooltip.innerHTML = `<strong>${escapeHtml(label)}</strong><br>${escapeHtml(text)}`;
        btn.insertAdjacentElement('afterend', tooltip);
      }
      function hideTip() {
        if (tooltip) { tooltip.remove(); tooltip = null; }
      }

      btn.addEventListener('mouseenter', showTip);
      btn.addEventListener('mouseleave', hideTip);
      btn.addEventListener('focus',      showTip);
      btn.addEventListener('blur',       hideTip);
      btn.addEventListener('click', e => { e.preventDefault(); tooltip ? hideTip() : showTip(); });
    });
  }

  // ── Warnhinweise für [kritisch]-Antworten ─────────────────────────────────

  function getCriticalWarnings(mod) {
    const seen = new Set();
    const out  = [];
    mod.fields.forEach(field => {
      if (!isFieldVisible(field) || !field.options) return;
      const val  = responses[field.id];
      if (!val) return;
      const vals = Array.isArray(val) ? val : [val];
      vals.forEach(v => {
        const opt = field.options.find(o => o.value === v);
        if (opt && opt.label && opt.label.includes('[kritisch]')) {
          const text = opt.label.replace('[kritisch]', '').trim();
          if (!seen.has(text)) { seen.add(text); out.push(text); }
        }
      });
    });
    return out;
  }

  // ── Onboarding ─────────────────────────────────────────────────────────────

  function renderOnboarding(idx) {
    onboardingIndex = idx;
    const screen = ONBOARDING_SCREENS[idx];
    const container = document.getElementById('module-container');
    container.innerHTML = '';

    let dotsHtml = '<div class="onboarding-dots">';
    ONBOARDING_SCREENS.forEach((_, i) => {
      dotsHtml += `<span class="dot${i === idx ? ' active' : ''}"></span>`;
    });
    dotsHtml += '</div>';

    const wrap = document.createElement('div');
    wrap.className = 'onboarding-screen';
    wrap.innerHTML =
      `<div class="onboarding-icon">${screen.icon}</div>` +
      `<h2 class="onboarding-title">${escapeHtml(screen.title)}</h2>` +
      `<p class="onboarding-body">${escapeHtml(screen.body)}</p>` +
      (screen.hint ? `<p class="onboarding-hint">${escapeHtml(screen.hint)}</p>` : '') +
      dotsHtml;
    container.appendChild(wrap);

    // Progress-Bar ausblenden
    document.getElementById('progress-bar').innerHTML = '';

    const btnBack = document.getElementById('btn-back');
    const btnSkip = document.getElementById('btn-skip');
    const btnNext = document.getElementById('btn-next');
    btnBack.disabled = idx === 0;
    btnSkip.style.display = '';
    btnNext.style.display = '';
    btnNext.textContent = idx === ONBOARDING_SCREENS.length - 1 ? 'Los geht\'s →' : 'Weiter →';
  }

  function finishOnboarding() {
    onboardingIndex = -1;
    responses['_onboarding_done'] = true;
    saveToStorage();
    startFresh();
  }

  // ── Modul-Rendering ────────────────────────────────────────────────────────

  function renderModule(idx) {
    const mod       = NAVIGATOR.modules[idx];
    const container = document.getElementById('module-container');
    container.innerHTML = '';

    // Modul-Überschrift
    const hdr = document.createElement('header');
    hdr.className = 'module-header';
    hdr.innerHTML = `<h2 class="module-title">${escapeHtml(mod.title)}</h2>`;
    container.appendChild(hdr);

    // Warnhinweise
    const warnings = getCriticalWarnings(mod);
    if (warnings.length > 0) {
      const warnEl = document.createElement('div');
      warnEl.className = 'warning-box';
      warnEl.innerHTML = '<strong>Hinweis:</strong> Folgende Punkte erfordern besondere Aufmerksamkeit:<ul>' +
        warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('') + '</ul>';
      container.appendChild(warnEl);
    }

    // Felder
    mod.fields.forEach(field => {
      const el = renderField(field);
      if (el) container.appendChild(el);
    });

    applyLabelOverrides(container);
    updateProgressBar(idx);
    updateNavButtons(mod, idx);
  }

  function applyLabelOverrides(container) {
    container.querySelectorAll('.field-label').forEach(el => {
      if (el.textContent.trim() === 'Dein Name') el.textContent = 'Name deines Use Cases';
    });
    container.querySelectorAll('.field-hint').forEach(el => {
      const parent = el.closest('[data-id="m1_organisation"]');
      if (parent) el.textContent = '';
    });
  }

  function refreshModuleView() {
    renderModule(currentModuleIndex);
  }

  // ── Fortschrittsanzeige pro Modul ─────────────────────────────────────────

  function getModuleCompletion(moduleId) {
    const module = NAVIGATOR.modules.find(m => m.id === moduleId);
    if (!module) return { pct: 0 };

    const inputFields = module.fields.filter(f =>
      f.type !== 'info' && f.type !== 'checklist' && isFieldVisible(f)
    );
    const filled = inputFields.filter(f => {
      const val = responses[f.id];
      if (val === undefined || val === null || val === '') return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    });
    const pct = inputFields.length > 0
      ? Math.round((filled.length / inputFields.length) * 100)
      : 0;
    return { pct };
  }

  function updateProgressBars() {
    document.querySelectorAll('.progress-step[data-idx]').forEach(btn => {
      const idx = parseInt(btn.dataset.idx, 10);
      const module = NAVIGATOR.modules[idx];
      if (!module) return;
      const { pct } = getModuleCompletion(module.id);
      const fill = btn.querySelector('.step-bar-fill');
      if (fill) fill.style.width = pct + '%';
    });
  }

  // ── Fortschrittsbalken ─────────────────────────────────────────────────────

  function updateProgressBar(activeIdx) {
    const nav = document.getElementById('progress-bar');
    nav.innerHTML = '';
    NAVIGATOR.modules.forEach((mod, i) => {
      const isActive  = i === activeIdx;
      const isVisited = responses['_visited_' + mod.id] || i < activeIdx;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.idx = i;
      btn.className = 'progress-step' +
        (isActive  ? ' active'  : '') +
        (isVisited ? ' visited' : '');
      btn.setAttribute('aria-current', isActive ? 'step' : 'false');
      btn.addEventListener('click', () => navigateTo(i));

      const { pct } = getModuleCompletion(mod.id);
      const showBar = isVisited || isActive;
      btn.innerHTML =
        `<span class="step-label">${escapeHtml(mod.progressLabel)}</span>` +
        `<span class="step-bar-wrap">` +
        (showBar ? `<span class="step-bar-fill" style="width:${pct}%"></span>` : '') +
        `</span>`;

      nav.appendChild(btn);
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function updateNavButtons(mod, idx) {
    const isLast = idx === NAVIGATOR.modules.length - 1;
    document.getElementById('btn-back').disabled = idx === 0;
    document.getElementById('btn-skip').style.display = mod.skippable ? '' : 'none';
    document.getElementById('btn-next').textContent = isLast ? 'Steckbrief erstellen' : 'Weiter →';
  }

  function navigateTo(idx) {
    // Aktuelles Modul als besucht markieren
    const leaving = NAVIGATOR.modules[currentModuleIndex];
    if (leaving) responses['_visited_' + leaving.id] = true;
    currentModuleIndex = idx;
    saveToStorage();
    renderModule(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    if (currentModuleIndex < NAVIGATOR.modules.length - 1) {
      navigateTo(currentModuleIndex + 1);
    } else {
      showExportScreen();
    }
  }

  // ── Export: Hilfsfunktionen ────────────────────────────────────────────────

  function getFieldDef(fieldId) {
    for (const mod of NAVIGATOR.modules) {
      for (const f of mod.fields) {
        if (f.id === fieldId) return f;
      }
    }
    return null;
  }

  function getDisplayValue(field, response) {
    if (response === undefined || response === null || response === '') return null;

    switch (field.type) {
      case 'text':
      case 'textarea':
        return String(response).trim() || null;

      case 'select': {
        const opt = (field.options || []).find(o => o.value === response);
        return opt ? opt.label.replace('[kritisch]', '').trim() : String(response);
      }

      case 'multiselect': {
        if (!Array.isArray(response) || response.length === 0) return null;
        return response.map(v => {
          const opt = (field.options || []).find(o => o.value === v);
          return opt ? opt.label.replace('[kritisch]', '').trim() : v;
        }).join(', ');
      }

      case 'scale':
        return String(response);

      case 'checklist': {
        const overrides = (typeof response === 'object' && response) ? response : {};
        return (field.items || []).map(item => {
          const status = overrides[item.id] || computeChecklistStatus(item);
          const icon = status === 'green' ? '✅' : status === 'yellow' ? '⚠️' : '❌';
          return `${icon} ${item.label}`;
        }).join('\n');
      }

      default:
        return null;
    }
  }

  function getExportSections() {
    const cfg = NAVIGATOR.exportConfig;
    const isNein = state.ki_eignung === 'nein';
    const allowedIds = isNein
      ? new Set(cfg.alternativeExport_ki_nein.sections)
      : null;

    return cfg.sections.filter(s => {
      if (allowedIds && !allowedIds.has(s.id)) return false;
      if (s.skipWhen) {
        const sw = s.skipWhen;
        if (sw.stateKey && sw.value && state[sw.stateKey] === sw.value) return false;
      }
      return true;
    });
  }

  function getSectionTitle(section) {
    if (state.ki_eignung === 'nein' && section.alternativeTitle_ki_nein) {
      return section.alternativeTitle_ki_nein;
    }
    return section.title;
  }

  function getDocTitle() {
    const cfg = NAVIGATOR.exportConfig;
    return state.ki_eignung === 'nein'
      ? cfg.alternativeExport_ki_nein.title
      : cfg.document.title;
  }

  // ── Markdown-Export ────────────────────────────────────────────────────────

  function generateMarkdown() {
    const cfg = NAVIGATOR.exportConfig;
    const sections = getExportSections();
    const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const sep = cfg.markdown.sectionSeparator;

    let md = `# ${getDocTitle()}\n\n`;
    md += `*${cfg.document.subtitle}*  \n`;
    md += `*Erstellt am: ${dateStr}*\n\n`;
    md += `${sep}\n\n`;

    sections.forEach(section => {
      md += `## ${getSectionTitle(section)}\n\n`;
      let hasContent = false;

      section.fields.forEach(fieldId => {
        const field = getFieldDef(fieldId);
        if (!field || !field.output) return;
        const val = getDisplayValue(field, responses[fieldId]);
        if (!val) return;

        hasContent = true;
        if (val.includes('\n')) {
          md += `**${field.output.label}:**\n\n`;
          val.split('\n').forEach(line => { md += `- ${line}\n`; });
          md += '\n';
        } else {
          md += `**${field.output.label}:** ${val}\n\n`;
        }
      });

      if (!hasContent) md += `*(keine Angaben)*\n\n`;
      md += `${sep}\n\n`;
    });

    md += `*${cfg.document.footerNote}*\n`;
    return md;
  }

  function downloadMarkdown() {
    const md = generateMarkdown();
    const blob = new Blob(['﻿' + md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${NAVIGATOR.meta.exportFilename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── PDF-Export ─────────────────────────────────────────────────────────────

  function generatePDF() {
    const { jsPDF } = window.jspdf;
    const cfg = NAVIGATOR.exportConfig;
    const m = cfg.pdf.margins;
    const sections = getExportSections();
    const sourceNotesInFooter = cfg.pdf.sourceNotesInFooter;

    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const pw  = doc.internal.pageSize.getWidth();
    const ph  = doc.internal.pageSize.getHeight();
    const cw  = pw - m.left - m.right;
    const LH  = 5.5;
    const FOOT_ZONE = 14;

    let y = m.top;
    const footnotes = [];

    function newPage() {
      doc.addPage();
      y = m.top;
    }

    function checkY(needed) {
      if (y + needed > ph - m.bottom - FOOT_ZONE) newPage();
    }

    function pdfText(text, x, yPos, opts) {
      doc.text(text, x, yPos, opts || {});
    }

    // ── Titelseite ─────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 76, 129);
    const titleLines = doc.splitTextToSize(getDocTitle(), cw);
    pdfText(titleLines, m.left, y);
    y += titleLines.length * LH * 1.8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    pdfText(cfg.document.subtitle, m.left, y);
    y += LH * 1.3;
    pdfText(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, m.left, y);
    y += LH * 2.5;
    doc.setTextColor(0);

    // ── Sektionen ─────────────────────────────────────────────────────────
    sections.forEach((section, sIdx) => {
      if (sIdx > 0) newPage();

      // Abschnittsüberschrift
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 76, 129);
      const stLines = doc.splitTextToSize(getSectionTitle(section), cw);
      pdfText(stLines, m.left, y);
      y += stLines.length * LH * 1.4;

      // Trennlinie
      doc.setDrawColor(15, 76, 129);
      doc.setLineWidth(0.4);
      doc.line(m.left, y, pw - m.right, y);
      y += LH * 0.9;
      doc.setDrawColor(0);
      doc.setTextColor(0);

      // Felder
      section.fields.forEach(fieldId => {
        const field = getFieldDef(fieldId);
        if (!field || !field.output) return;
        const val = getDisplayValue(field, responses[fieldId]);
        if (!val) return;

        // Quellenangabe sammeln
        let noteTag = '';
        if (sourceNotesInFooter && field.source) {
          footnotes.push(`[${footnotes.length + 1}] ${field.source.label}: ${field.source.text}`);
          noteTag = ` [${footnotes.length}]`;
        }

        // Label
        checkY(LH * 3);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const lblLines = doc.splitTextToSize(`${field.output.label}${noteTag}:`, cw);
        pdfText(lblLines, m.left, y);
        y += lblLines.length * LH * 0.9;

        // Wert
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        if (field.type === 'checklist') {
          val.split('\n').forEach(line => {
            const pdfLine = line.replace('✅', '[OK] ').replace('⚠️', '[!]  ').replace('❌', '[  ] ');
            const lLines = doc.splitTextToSize(pdfLine, cw - 3);
            checkY(lLines.length * LH * 0.9);
            pdfText(lLines, m.left + 3, y);
            y += lLines.length * LH * 0.9;
          });
        } else {
          const valLines = doc.splitTextToSize(val, cw);
          valLines.forEach(line => {
            checkY(LH * 0.9);
            pdfText(line, m.left, y);
            y += LH * 0.9;
          });
        }

        y += LH * 0.5;
      });
    });

    // ── Quellenangaben-Seite ───────────────────────────────────────────────
    if (footnotes.length > 0) {
      newPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 76, 129);
      pdfText('Quellenangaben', m.left, y);
      y += LH * 1.8;
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      footnotes.forEach(note => {
        const nLines = doc.splitTextToSize(note, cw);
        checkY(nLines.length * LH * 0.85 + 2);
        pdfText(nLines, m.left, y);
        y += nLines.length * LH * 0.85 + 2;
      });
    }

    // ── Footer auf jeder Seite ─────────────────────────────────────────────
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(140);
      const footLines = doc.splitTextToSize(cfg.document.footerNote, cw - 18);
      pdfText(footLines, m.left, ph - m.bottom + 5);
      pdfText(`${p} / ${total}`, pw - m.right, ph - m.bottom + 5, { align: 'right' });
      doc.setTextColor(0);
    }

    return doc;
  }

  function downloadPDF() {
    if (!window.jspdf) {
      alert('PDF-Bibliothek nicht verfügbar. Bitte Internetverbindung prüfen.');
      return;
    }
    try {
      const doc = generatePDF();
      doc.save(`${NAVIGATOR.meta.exportFilename}.pdf`);
    } catch (err) {
      console.error('PDF-Fehler:', err);
      alert('Beim Erstellen des PDFs ist ein Fehler aufgetreten.');
    }
  }

  // ── Export-Screen ──────────────────────────────────────────────────────────

  function showExportScreen() {
    onExportScreen = true;
    const container = document.getElementById('module-container');
    container.innerHTML = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const md = generateMarkdown();

    const wrap = document.createElement('div');
    wrap.className = 'export-screen';
    wrap.innerHTML = `
      <header class="module-header">
        <h2 class="module-title">Steckbrief erstellen</h2>
      </header>
      <div class="export-action-box field">
        <p class="export-intro">Dein Use-Case-Steckbrief ist bereit zum Herunterladen.</p>
        <div class="export-buttons">
          <button id="btn-dl-md"  class="btn btn-primary btn-export">↓ Markdown (.md)</button>
          <button id="btn-dl-pdf" class="btn btn-primary btn-export">↓ PDF herunterladen</button>
          <button id="btn-print"  class="btn btn-secondary btn-export">&#x1F5A8; Drucken</button>
          <button id="btn-share"  class="btn btn-secondary btn-export">&#x1F517; Link teilen</button>
        </div>
      </div>
      <div class="export-preview-box field">
        <h3 class="export-preview-title">Vorschau</h3>
        <pre class="export-preview">${escapeHtml(md)}</pre>
      </div>
    `;
    container.appendChild(wrap);

    // Nur "Zurück" anzeigen
    document.getElementById('btn-back').disabled = false;
    document.getElementById('btn-skip').style.display = 'none';
    const btnNext = document.getElementById('btn-next');
    btnNext.style.display = 'none';

    updateProgressBar(NAVIGATOR.modules.length - 1);

    document.getElementById('btn-dl-md').addEventListener('click',  downloadMarkdown);
    document.getElementById('btn-dl-pdf').addEventListener('click', downloadPDF);
    document.getElementById('btn-print').addEventListener('click',  printSteckbrief);
    document.getElementById('btn-share').addEventListener('click', () => {
      const url = getShareURL();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => showToast('Link in Zwischenablage kopiert'));
      } else {
        prompt('Link kopieren:', url);
      }
    });
  }

  // ── Druckansicht ───────────────────────────────────────────────────────────

  function printSteckbrief() {
    document.getElementById('print-view').innerHTML = buildPrintHTML();
    window.print();
    setTimeout(() => { document.getElementById('print-view').innerHTML = ''; }, 1000);
  }

  function buildPrintHTML() {
    const cfg      = NAVIGATOR.exportConfig;
    const sections = getExportSections();
    const dateStr  = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let html = `<div class="print-header">
      <h1>${escapeHtml(getDocTitle())}</h1>
      <p class="print-meta">${escapeHtml(cfg.document.subtitle)} &mdash; Erstellt am ${dateStr}</p>
    </div>`;

    sections.forEach(section => {
      const rows = section.fields.map(fid => {
        const field = getFieldDef(fid);
        if (!field || !field.output) return '';
        const val = getDisplayValue(field, responses[fid]);
        if (!val) return '';
        const safeLabel = escapeHtml(field.output.label);
        const safeVal   = escapeHtml(val).replace(/\n/g, '<br>');
        return `<tr><td class="print-label">${safeLabel}</td><td class="print-value">${safeVal}</td></tr>`;
      }).filter(Boolean).join('');

      if (!rows) return;
      html += `<div class="print-section">
        <h2>${escapeHtml(getSectionTitle(section))}</h2>
        <table>${rows}</table>
      </div>`;
    });

    html += `<p class="print-footer">${escapeHtml(cfg.document.footerNote)}</p>`;
    return html;
  }

  // ── URL-Hash-Share ─────────────────────────────────────────────────────────

  function getShareURL() {
    const payload = { v: 1, r: responses, s: state };
    const json    = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return window.location.href.split('#')[0] + '#share=' + encoded;
  }

  function loadFromURLHash() {
    const hash = window.location.hash;
    if (!hash.startsWith('#share=')) return false;
    try {
      const encoded = hash.slice(7);
      const json    = decodeURIComponent(escape(atob(encoded)));
      const payload = JSON.parse(json);
      if (!payload.r) return false;
      responses = payload.r;
      state     = payload.s || {};
      return true;
    } catch (e) {
      console.warn('URL-Share konnte nicht geladen werden:', e);
      return false;
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  function showToast(message, duration) {
    duration = duration || 3000;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }

  // ── Initialisierung ────────────────────────────────────────────────────────

  function init() {
    const meta = NAVIGATOR.meta;
    document.getElementById('app-subtitle').textContent = 'Schritt für Schritt den eigenen KI-Use Case entwickeln';
    document.title = meta.title;

    resetState();

    // Priorität: URL-Hash > localStorage > neu starten
    const fromURL = loadFromURLHash();
    if (fromURL) {
      history.replaceState(null, '', window.location.pathname);
      recomputeStateFromResponses();
      pendingResume = () => renderModule(currentModuleIndex);
      showResumeDialog(null, 'url');
    } else {
      const saved = loadFromStorage();
      const hasSaved = saved && saved.responses &&
        Object.keys(saved.responses).filter(k => !k.startsWith('_')).length > 0;

      if (hasSaved) {
        showResumeDialog(saved.savedAt, null);
      } else {
        const onboardingDone = saved && saved.responses && saved.responses['_onboarding_done'];
        if (onboardingDone) {
          startFresh();
        } else {
          renderOnboarding(0);
        }
      }
    }

    document.getElementById('btn-next').addEventListener('click', () => {
      if (onboardingIndex >= 0) {
        if (onboardingIndex < ONBOARDING_SCREENS.length - 1) {
          renderOnboarding(onboardingIndex + 1);
        } else {
          finishOnboarding();
        }
        return;
      }
      goNext();
    });
    document.getElementById('btn-back').addEventListener('click', () => {
      if (onboardingIndex > 0) {
        renderOnboarding(onboardingIndex - 1);
        return;
      }
      if (onExportScreen) {
        onExportScreen = false;
        document.getElementById('btn-next').style.display = '';
        navigateTo(currentModuleIndex);
      } else if (currentModuleIndex > 0) {
        navigateTo(currentModuleIndex - 1);
      }
    });
    document.getElementById('btn-skip').addEventListener('click', () => {
      if (onboardingIndex >= 0) {
        finishOnboarding();
        return;
      }
      goNext();
    });

    document.getElementById('btn-resume-yes').addEventListener('click', () => {
      hideResumeDialog();
      if (pendingResume) {
        const fn = pendingResume;
        pendingResume = null;
        fn();
        return;
      }
      const data = loadFromStorage();
      if (data) {
        responses = data.responses || {};
        Object.assign(state, data.state || {});
        currentModuleIndex = data.currentModuleIndex || 0;
        recomputeStateFromResponses();
      }
      renderModule(currentModuleIndex);
    });

    document.getElementById('btn-resume-no').addEventListener('click', () => {
      hideResumeDialog();
      localStorage.removeItem(STORAGE_KEY);
      startFresh();
    });
  }

  function startFresh() {
    resetState();
    const onboardingDone = responses['_onboarding_done'];
    responses = {};
    if (onboardingDone) responses['_onboarding_done'] = true;
    currentModuleIndex = 0;
    renderModule(0);
  }

  function showResumeDialog(savedAt, source) {
    const info = document.getElementById('dialog-info');
    if (source === 'url') {
      info.textContent = 'Ein gespeicherter Stand wurde über den Link geladen. Möchtest du dort weitermachen?';
    } else if (savedAt) {
      const d = new Date(savedAt);
      info.textContent = `Gespeichert: ${d.toLocaleDateString('de-DE')} um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
    } else {
      info.textContent = 'Es wurden gespeicherte Eingaben gefunden.';
    }
    document.getElementById('resume-dialog').classList.remove('hidden');
  }

  function hideResumeDialog() {
    document.getElementById('resume-dialog').classList.add('hidden');
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

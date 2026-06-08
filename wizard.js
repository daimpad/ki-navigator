'use strict';

// ────────────────────────────────────────────────────────────────────────────
//  wizard.js — KI-Use-Case-Navigator
//  Anwendungslogik: Modul-Rendering, Branching, Persistenz, Navigation.
//  Alle Inhalte kommen aus content.js (NAVIGATOR).
//  Export: Phase 2.
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

  // ── App-State ──────────────────────────────────────────────────────────────
  let state    = {};   // { use_case_typ, ki_eignung, hosting_typ }
  let responses = {};  // { fieldId: value, ... }
  let currentModuleIndex = 0;

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
        wrap.innerHTML = `<div class="info-block info-result info-result-${score}"><p>${content}</p></div>`;
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

    updateProgressBar(idx);
    updateNavButtons(mod, idx);
  }

  function refreshModuleView() {
    renderModule(currentModuleIndex);
  }

  // ── Fortschrittsbalken ─────────────────────────────────────────────────────

  function updateProgressBar(activeIdx) {
    const nav = document.getElementById('progress-bar');
    nav.innerHTML = '';
    NAVIGATOR.modules.forEach((mod, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'progress-step' +
        (i === activeIdx ? ' active'   : '') +
        (i < activeIdx  ? ' visited'  : '');
      btn.textContent = mod.progressLabel;
      btn.setAttribute('aria-current', i === activeIdx ? 'step' : 'false');
      btn.addEventListener('click', () => navigateTo(i));
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
    currentModuleIndex = idx;
    saveToStorage();
    renderModule(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    if (currentModuleIndex < NAVIGATOR.modules.length - 1) {
      navigateTo(currentModuleIndex + 1);
    } else {
      showExportPlaceholder();
    }
  }

  function showExportPlaceholder() {
    // Platzhalter — Export wird in Phase 2 implementiert
    alert('Export wird in Phase 2 implementiert.');
  }

  // ── Initialisierung ────────────────────────────────────────────────────────

  function init() {
    const meta = NAVIGATOR.meta;
    document.getElementById('app-title').textContent    = meta.title;
    document.getElementById('app-subtitle').textContent = meta.subtitle;
    document.title = meta.title;

    resetState();

    const saved = loadFromStorage();
    const hasSaved = saved && saved.responses && Object.keys(saved.responses).length > 0;

    if (hasSaved) {
      showResumeDialog(saved.savedAt);
    } else {
      startFresh();
    }

    document.getElementById('btn-next').addEventListener('click', goNext);
    document.getElementById('btn-back').addEventListener('click', () => {
      if (currentModuleIndex > 0) navigateTo(currentModuleIndex - 1);
    });
    document.getElementById('btn-skip').addEventListener('click', goNext);

    document.getElementById('btn-resume-yes').addEventListener('click', () => {
      hideResumeDialog();
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
    responses = {};
    currentModuleIndex = 0;
    renderModule(0);
  }

  function showResumeDialog(savedAt) {
    const info = document.getElementById('dialog-info');
    if (savedAt) {
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

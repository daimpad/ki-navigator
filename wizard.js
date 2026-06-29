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
    'm4_häufigkeit', 'm4_variabilitaet', 'm4_fehlertoleranz',
    'm4_rechtliche_bindung', 'm4_nutzen_aufwand'
  ];

  // ── App-State ──────────────────────────────────────────────────────────────
  let state    = {};   // { use_case_typ, ki_eignung, hosting_typ }
  let responses = {};  // { fieldId: value, ... }
  let currentModuleIndex = 0;
  let onExportScreen = false;
  let pendingResume = null;
  let sessionConfig = null;

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
    const hasPopup = field.source || field.help ||
      (Array.isArray(field.sources) && field.sources.length > 0);
    if (hasPopup) {
      const aria = field.source ? field.source.label : 'Hilfe und Quellen';
      html += `<button type="button" class="source-btn"
        aria-label="Info anzeigen: ${escapeHtml(aria)}">ⓘ</button>`;
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
      case 'stakeholderMatrix': renderStakeholderMatrix(wrap, field); break;
      default: return null;
    }

    // Session-spezifischer Feld-Hint (Facilitator-Modus)
    const sessionHint = sessionConfig && sessionConfig.fieldHints && sessionConfig.fieldHints[field.id];
    if (sessionHint) {
      const hintEl = document.createElement('p');
      hintEl.className = 'field-hint session-hint';
      hintEl.textContent = '★ ' + sessionHint;
      wrap.appendChild(hintEl);
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

  // ── Stakeholder-Adressierung (Custom-Feldtyp) ──────────────────────────────
  //
  //  Daten leben in state.stakeholderMatrix (NICHT in responses), damit sie
  //  über die bestehende state-Serialisierung automatisch in localStorage und
  //  im URL-Share mitgeführt werden. Alte Stände ohne den Schlüssel werden
  //  beim ersten Zugriff leer initialisiert — kein Fehler, kein Fallback-Dialog.

  const STAKEHOLDER_CATEGORIES = [
    { value: 'entscheider',   label: 'Entscheider:in' },
    { value: 'bewerter',      label: 'Bewerter:in' },
    { value: 'multiplikator', label: 'Multiplikator:in' },
    { value: 'betroffene',    label: 'Betroffene:r' }
  ];
  const STAKEHOLDER_INFLUENCE = [
    { value: 'gering', label: 'Gering' },
    { value: 'hoch',   label: 'Hoch' }
  ];
  const STAKEHOLDER_ATTITUDE = [
    { value: 'unterstuetzend', label: 'Unterstützend/Fördernd' },
    { value: 'skeptisch',      label: 'Skeptisch/Resistent' }
  ];
  // influence|attitude → Quadrant-Schlüssel (identisch zu stakeholder-hints.js)
  const STAKEHOLDER_QUADRANTS = {
    'gering|unterstuetzend': 'potenzielle-unterstuetzer',
    'hoch|unterstuetzend':   'strategische-partner',
    'gering|skeptisch':      'marginal-beteiligte',
    'hoch|skeptisch':        'kritische-vetospieler'
  };
  const STAKEHOLDER_QUADRANT_TITLES = {
    'strategische-partner':     'Strategische Partner',
    'potenzielle-unterstuetzer':'Potenzielle Unterstützer',
    'kritische-vetospieler':    'Kritische Vetospieler',
    'marginal-beteiligte':      'Marginal Beteiligte'
  };
  // Lesefolge im 2×2-Raster: oben-links, oben-rechts, unten-links, unten-rechts
  const STAKEHOLDER_MATRIX_ORDER = [
    'potenzielle-unterstuetzer', 'strategische-partner',
    'marginal-beteiligte',       'kritische-vetospieler'
  ];

  let stakeholderIdCounter = 0;
  function makeStakeholderId() {
    stakeholderIdCounter += 1;
    return 's' + Date.now().toString(36) + '_' + stakeholderIdCounter;
  }

  function getStakeholderMatrix() {
    if (!state.stakeholderMatrix || typeof state.stakeholderMatrix !== 'object') {
      state.stakeholderMatrix = { stakeholders: [], importedFromM3: false };
    }
    if (!Array.isArray(state.stakeholderMatrix.stakeholders)) {
      state.stakeholderMatrix.stakeholders = [];
    }
    return state.stakeholderMatrix;
  }

  function stakeholderHasData() {
    return getStakeholderMatrix().stakeholders.length > 0;
  }

  function stakeholderQuadrant(s) {
    if (!s || !s.influence || !s.attitude) return null;
    return STAKEHOLDER_QUADRANTS[s.influence + '|' + s.attitude] || null;
  }

  function stakeholderCategoryLabel(value) {
    const c = STAKEHOLDER_CATEGORIES.find(x => x.value === value);
    return c ? c.label : '';
  }

  // Einzeilige Klartext-Darstellung für Markdown/PDF-Export
  function stakeholderLine(s) {
    const name  = (s.name && s.name.trim()) ? s.name.trim() : '(ohne Name)';
    const parts = [name];
    if (s.role && s.role.trim()) parts.push(s.role.trim());
    let line = parts.join(' — ');
    const cat = stakeholderCategoryLabel(s.category);
    if (cat) line += ` (${cat})`;
    return line;
  }

  function generateStakeholderMarkdown() {
    if (!stakeholderHasData()) return '';
    const sep  = NAVIGATOR.exportConfig.markdown.sectionSeparator;
    const data = getStakeholderMatrix();
    let md = `## Stakeholder-Adressierung\n\n`;
    STAKEHOLDER_MATRIX_ORDER.forEach(quadKey => {
      const members = data.stakeholders.filter(s => stakeholderQuadrant(s) === quadKey);
      if (members.length === 0) return;
      md += `**${STAKEHOLDER_QUADRANT_TITLES[quadKey]}**\n\n`;
      members.forEach(s => { md += `- ${stakeholderLine(s)}\n`; });
      md += `\n`;
    });
    const unpos = data.stakeholders.filter(s => !stakeholderQuadrant(s));
    if (unpos.length > 0) {
      md += `**Noch nicht positioniert**\n\n`;
      unpos.forEach(s => { md += `- ${stakeholderLine(s)}\n`; });
      md += `\n`;
    }
    md += `${sep}\n\n`;
    return md;
  }

  function renderStakeholderMatrix(wrap, field) {
    const data = getStakeholderMatrix();

    function persist() { saveToStorage(); }

    function optionTags(list, selected, emptyLabel) {
      let h = `<option value=""${selected ? '' : ' selected'}>${escapeHtml(emptyLabel)}</option>`;
      list.forEach(o => {
        h += `<option value="${escapeHtml(o.value)}"${selected === o.value ? ' selected' : ''}>${escapeHtml(o.label)}</option>`;
      });
      return h;
    }

    // Einmaliger Übernahme-Hinweis aus m3_entscheider (strukturierte
    // Mehrfachauswahl — daher kein fragiles Freitext-Splitting nötig).
    function buildImportNote() {
      if (data.stakeholders.length > 0 || data.importedFromM3) return '';
      const sel = responses['m3_entscheider'];
      if (!Array.isArray(sel) || sel.length === 0) return '';
      return `<div class="sth-import-note" data-role="import-note">
        <p>Im Modul „Organisatorischer Kontext“ hast du bereits ${sel.length} Beteiligte benannt. Möchtest du sie als Stakeholder übernehmen? Die Kategorie ordnest du anschließend selbst zu.</p>
        <div class="sth-import-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-action="import-m3">Aus Modul übernehmen</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="import-skip">Neu beginnen</button>
        </div>
      </div>`;
    }

    function buildCaptureRows() {
      if (data.stakeholders.length === 0) {
        return `<p class="sth-empty">Noch keine Stakeholder erfasst.</p>`;
      }
      let h = `<div class="sth-table" role="list">`;
      data.stakeholders.forEach(s => {
        h += `<div class="sth-row" role="listitem" data-sid="${escapeHtml(s.id)}">
          <input type="text" class="sth-input sth-name" data-fieldkey="name" maxlength="60"
            placeholder="Name/Kürzel (Pflichtfeld)" value="${escapeHtml(s.name || '')}"
            aria-label="Name oder Kürzel">
          <input type="text" class="sth-input sth-role" data-fieldkey="role" maxlength="120"
            placeholder="Rolle/Funktion (optional)" value="${escapeHtml(s.role || '')}"
            aria-label="Rolle oder Funktion">
          <select class="sth-select sth-cat" data-fieldkey="category" aria-label="Kategorie">
            ${optionTags(STAKEHOLDER_CATEGORIES, s.category, 'Kategorie …')}
          </select>
          <button type="button" class="sth-del" data-action="delete" aria-label="Stakeholder entfernen" title="Entfernen">✕</button>
        </div>`;
      });
      h += `</div>`;
      return h;
    }

    function buildPositioning() {
      if (data.stakeholders.length === 0) return '';
      let h = `<div class="sth-section">
        <h3 class="sth-step-title">Schritt 2 · Positionierung</h3>
        <p class="sth-step-desc">Lege pro Stakeholder Einfluss und Haltung fest. Einträge ohne vollständige Angabe erscheinen unter „Noch nicht positioniert“.</p>
        <div class="sth-table" role="list">`;
      data.stakeholders.forEach(s => {
        const name = (s.name && s.name.trim()) ? s.name : '(ohne Name)';
        h += `<div class="sth-posrow" role="listitem" data-sid="${escapeHtml(s.id)}">
          <span class="sth-posname">${escapeHtml(name)}</span>
          <select class="sth-select" data-fieldkey="influence" aria-label="Einfluss von ${escapeHtml(name)}">
            ${optionTags(STAKEHOLDER_INFLUENCE, s.influence, 'Einfluss …')}
          </select>
          <select class="sth-select" data-fieldkey="attitude" aria-label="Haltung von ${escapeHtml(name)}">
            ${optionTags(STAKEHOLDER_ATTITUDE, s.attitude, 'Haltung …')}
          </select>
        </div>`;
      });
      h += `</div></div>`;
      return h;
    }

    function buildChips(quadKey, unpositioned) {
      const members = unpositioned
        ? data.stakeholders.filter(s => !stakeholderQuadrant(s))
        : data.stakeholders.filter(s => stakeholderQuadrant(s) === quadKey);
      if (members.length === 0) return unpositioned ? '' : `<p class="sth-quadrant-empty">—</p>`;
      return members.map(s => {
        const name = (s.name && s.name.trim()) ? s.name : '(ohne Name)';
        const cat  = stakeholderCategoryLabel(s.category);
        const cls  = 'sth-chip' + (unpositioned ? ' sth-chip-unpos' : '');
        return `<span class="${cls}" title="${escapeHtml(s.role || '')}">${escapeHtml(name)}${cat ? `<span class="sth-chip-cat">${escapeHtml(cat)}</span>` : ''}</span>`;
      }).join('');
    }

    function buildMatrix() {
      if (data.stakeholders.length === 0) return '';
      let cells = '';
      STAKEHOLDER_MATRIX_ORDER.forEach(quadKey => {
        cells += `<div class="sth-quadrant sth-q-${quadKey}">
          <span class="sth-quadrant-title">${escapeHtml(STAKEHOLDER_QUADRANT_TITLES[quadKey])}</span>
          <div class="sth-chips">${buildChips(quadKey, false)}</div>
        </div>`;
      });
      let h = `<div class="sth-section">
        <h3 class="sth-step-title">Einfluss-Haltungs-Matrix</h3>
        <div class="sth-matrix-frame">
          <div class="sth-axis-y sth-axis-y-top">Unterstützend / Fördernd</div>
          <div class="sth-matrix-grid">${cells}</div>
          <div class="sth-axis-y sth-axis-y-bottom">Skeptisch / Resistent</div>
          <div class="sth-axis-x"><span>Geringer Einfluss</span><span>Hoher Einfluss</span></div>
        </div>`;
      const unposHtml = buildChips(null, true);
      if (unposHtml) {
        h += `<div class="sth-unpositioned">
          <h4>Noch nicht positioniert</h4>
          <div class="sth-chips">${unposHtml}</div>
        </div>`;
      }
      h += `</div>`;
      return h;
    }

    function buildHints() {
      if (data.stakeholders.length === 0) return '';
      const H = (typeof window !== 'undefined' && window.STAKEHOLDER_HINTS) ? window.STAKEHOLDER_HINTS : null;
      if (!H) return '';
      let h = `<div class="sth-section sth-hints">
        <h3 class="sth-step-title">Adressierungs-Hinweise</h3>`;
      if (H.general) h += `<p class="sth-hint-general">${escapeHtml(H.general)}</p>`;
      h += `<div class="sth-hint-grid">`;
      STAKEHOLDER_MATRIX_ORDER.forEach(quadKey => {
        const hint = H[quadKey];
        if (!hint) return;
        h += `<div class="sth-hint sth-hint-${quadKey}">
          <h4 class="sth-hint-title">${escapeHtml(hint.title || STAKEHOLDER_QUADRANT_TITLES[quadKey])}</h4>`;
        if (hint.axes) h += `<p class="sth-hint-axes">${escapeHtml(hint.axes)}</p>`;
        (hint.body || []).forEach(p => { h += `<p>${escapeHtml(p)}</p>`; });
        if (hint.pitfall) h += `<p class="sth-hint-pitfall"><strong>Was hier am häufigsten schiefläuft:</strong> ${escapeHtml(hint.pitfall)}</p>`;
        h += `</div>`;
      });
      h += `</div></div>`;
      return h;
    }

    function findStakeholder(sid) {
      return data.stakeholders.find(s => s.id === sid);
    }

    function wire() {
      const noteEl = wrap.querySelector('[data-role="import-note"]');
      if (noteEl) {
        const impBtn  = noteEl.querySelector('[data-action="import-m3"]');
        const skipBtn = noteEl.querySelector('[data-action="import-skip"]');
        if (impBtn) impBtn.addEventListener('click', () => {
          const sel  = responses['m3_entscheider'];
          const def  = getFieldDef('m3_entscheider');
          const opts = (def && def.options) || [];
          (Array.isArray(sel) ? sel : []).forEach(v => {
            const opt   = opts.find(o => o.value === v);
            const label = opt ? opt.label.replace('[kritisch]', '').trim() : String(v);
            data.stakeholders.push({
              id: makeStakeholderId(), name: label.slice(0, 60),
              role: '', category: '', influence: '', attitude: ''
            });
          });
          data.importedFromM3 = true;
          persist(); render();
        });
        if (skipBtn) skipBtn.addEventListener('click', () => {
          data.importedFromM3 = true;
          persist(); render();
        });
      }

      const addBtn = wrap.querySelector('.sth-add');
      if (addBtn) addBtn.addEventListener('click', () => {
        data.stakeholders.push({
          id: makeStakeholderId(), name: '', role: '', category: '',
          influence: '', attitude: ''
        });
        persist(); render();
      });

      wrap.querySelectorAll('.sth-row').forEach(row => {
        const sid = row.dataset.sid;
        const s   = findStakeholder(sid);
        if (!s) return;
        // Textfelder: live in den State schreiben OHNE Re-Render (Fokus bleibt);
        // erst beim Verlassen (change) Matrix & Schritt 2 neu zeichnen.
        row.querySelectorAll('.sth-input').forEach(inp => {
          const key = inp.dataset.fieldkey;
          inp.addEventListener('input',  () => { s[key] = inp.value; persist(); });
          inp.addEventListener('change', () => { s[key] = inp.value; persist(); render(); });
        });
        const cat = row.querySelector('.sth-cat');
        if (cat) cat.addEventListener('change', () => { s.category = cat.value; persist(); render(); });
        const del = row.querySelector('[data-action="delete"]');
        if (del) del.addEventListener('click', () => {
          data.stakeholders = data.stakeholders.filter(x => x.id !== sid);
          persist(); render();
        });
      });

      wrap.querySelectorAll('.sth-posrow').forEach(row => {
        const sid = row.dataset.sid;
        const s   = findStakeholder(sid);
        if (!s) return;
        row.querySelectorAll('.sth-select').forEach(sel => {
          const key = sel.dataset.fieldkey;
          sel.addEventListener('change', () => { s[key] = sel.value; persist(); render(); });
        });
      });
    }

    function render() {
      wrap.innerHTML =
        buildImportNote() +
        `<div class="sth-section">
          <h3 class="sth-step-title">Schritt 1 · Stakeholder erfassen</h3>
          <p class="sth-step-desc">Erfasse die relevanten Personen oder Rollen. Name/Kürzel ist Pflicht; Rolle und Kategorie sind optional. Beliebig viele Einträge, Reihenfolge nach Eingabe.</p>` +
          buildCaptureRows() +
          `<button type="button" class="btn btn-secondary sth-add" data-action="add">+ Stakeholder hinzufügen</button>
        </div>` +
        buildPositioning() +
        buildMatrix() +
        buildHints();
      wire();
    }

    render();
  }

  // ── Quellenangaben-Tooltip ─────────────────────────────────────────────────

  function attachSourceButtons(wrap) {
    wrap.querySelectorAll('.source-btn').forEach(btn => {
      const fieldEl = btn.closest('[data-id]');
      const field   = fieldEl ? getFieldDef(fieldEl.dataset.id) : null;
      if (!field) return;

      const hasLinks = Array.isArray(field.sources) && field.sources.length > 0;
      let tooltip = null;
      let docClickHandler = null;

      function buildHtml() {
        let h = '';
        if (field.help) {
          h += `<p class="tip-help">${escapeHtml(field.help)}</p>`;
        }
        if (field.source) {
          h += `<p class="tip-cite"><strong>${escapeHtml(field.source.label)}</strong>` +
               `<br>${escapeHtml(field.source.text)}</p>`;
        }
        if (hasLinks) {
          h += `<p class="tip-cite"><strong>Quellen</strong></p><ul class="tip-links">`;
          field.sources.forEach(s => {
            h += `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">` +
                 `${escapeHtml(s.label)}</a></li>`;
          });
          h += `</ul>`;
        }
        return h;
      }

      function showTip() {
        if (tooltip) return;
        tooltip = document.createElement('div');
        tooltip.className = 'source-tooltip' + (hasLinks ? ' source-tooltip--interactive' : '');
        tooltip.innerHTML = buildHtml();
        btn.insertAdjacentElement('afterend', tooltip);
      }
      function hideTip() {
        if (tooltip) { tooltip.remove(); tooltip = null; }
        if (docClickHandler) {
          document.removeEventListener('click', docClickHandler);
          docClickHandler = null;
        }
      }

      if (hasLinks) {
        // Mit Links: Klick-Toggle, bleibt offen, damit Links anklickbar sind
        btn.addEventListener('click', e => {
          e.preventDefault();
          if (tooltip) { hideTip(); return; }
          showTip();
          docClickHandler = ev => {
            if (tooltip && !tooltip.contains(ev.target) && ev.target !== btn) {
              hideTip();
            }
          };
          setTimeout(() => document.addEventListener('click', docClickHandler), 0);
        });
      } else {
        // Nur Text/Hilfe: Hover + Klick-Toggle
        btn.addEventListener('mouseenter', showTip);
        btn.addEventListener('mouseleave', hideTip);
        btn.addEventListener('focus',      showTip);
        btn.addEventListener('blur',       hideTip);
        btn.addEventListener('click', e => { e.preventDefault(); tooltip ? hideTip() : showTip(); });
      }
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

    // Session-Banner (Facilitator-Modus)
    if (sessionConfig) {
      const bannerEl = document.createElement('div');
      bannerEl.innerHTML = renderSessionBanner();
      container.appendChild(bannerEl.firstElementChild);
    }

    // Modul-Überschrift
    const hdr = document.createElement('header');
    hdr.className = 'module-header';
    hdr.innerHTML = `<h2 class="module-title">${escapeHtml(mod.title)}</h2>`;
    container.appendChild(hdr);

    // Session-Modul-Hervorhebung
    if (sessionConfig && sessionConfig.highlightModules && sessionConfig.highlightModules.includes(mod.id)) {
      const noteEl = document.createElement('div');
      noteEl.className = 'session-module-note';
      noteEl.textContent = '★ Dieses Modul ist für die aktuelle Sitzung besonders relevant';
      container.appendChild(noteEl);
    }

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
      if (f.type === 'stakeholderMatrix') return stakeholderHasData();
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
    document.getElementById('btn-next').innerHTML = isLast ? 'Steckbrief erstellen' : 'Weiter <i class="fa-solid fa-arrow-right"></i>';
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

  // Sammelt eindeutige Quell-Links (field.sources) aller beantworteten Export-Felder
  function collectSourceLinks() {
    const seen  = new Set();
    const links = [];
    getExportSections().forEach(section => {
      section.fields.forEach(fieldId => {
        const field = getFieldDef(fieldId);
        if (!field || !Array.isArray(field.sources)) return;
        const val = getDisplayValue(field, responses[fieldId]);
        if (!val) return; // nur für beantwortete Felder aufnehmen
        field.sources.forEach(s => {
          if (s && s.url && !seen.has(s.url)) {
            seen.add(s.url);
            links.push(s);
          }
        });
      });
    });
    return links;
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

    md += generateStakeholderMarkdown();

    const links = collectSourceLinks();
    if (links.length > 0) {
      md += `## Quellen & weiterführende Links\n\n`;
      links.forEach(s => { md += `- [${s.label}](${s.url})\n`; });
      md += `\n${sep}\n\n`;
    }

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

  // ── JSON-Export / Import ───────────────────────────────────────────────────

  function downloadJSON() {
    const payload = { v: 1, exportedAt: new Date().toISOString(), responses, state };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${NAVIGATOR.meta.exportFilename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function showImportDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.id = 'import-dialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'import-dialog-title');
    overlay.innerHTML = `
      <div class="dialog-box dialog-box--wide">
        <h2 id="import-dialog-title">JSON-Datei importieren</h2>
        <p>Wähle eine zuvor exportierte <code>.json</code>-Datei aus, um den gespeicherten Stand wiederherzustellen.</p>
        <div class="import-drop-area" id="import-drop-area">
          <i class="fa-solid fa-upload"></i>
          <span>Datei hierher ziehen oder</span>
          <label class="btn btn-secondary import-file-label">
            Datei auswählen
            <input type="file" id="import-file-input" accept=".json,application/json" style="display:none">
          </label>
        </div>
        <p id="import-error" class="import-error" style="display:none"></p>
        <div class="dialog-actions">
          <button id="btn-import-cancel" type="button" class="btn btn-secondary">Abbrechen</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const fileInput = overlay.querySelector('#import-file-input');
    const dropArea  = overlay.querySelector('#import-drop-area');
    const errorEl   = overlay.querySelector('#import-error');

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = '';
    }

    function processFile(file) {
      if (!file || !file.name.endsWith('.json')) {
        showError('Bitte eine gültige .json-Datei auswählen.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const payload = JSON.parse(e.target.result);
          if (!payload.responses || typeof payload.responses !== 'object') {
            showError('Ungültiges Format: "responses" fehlt.');
            return;
          }
          responses = payload.responses;
          state     = payload.state && typeof payload.state === 'object' ? payload.state : {};
          recomputeStateFromResponses();
          saveToStorage();
          overlay.remove();
          onExportScreen = false;
          currentModuleIndex = 0;
          renderModule(0);
          showToast('Daten erfolgreich importiert');
        } catch (err) {
          showError('Datei konnte nicht gelesen werden: ' + err.message);
        }
      };
      reader.readAsText(file, 'utf-8');
    }

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) processFile(fileInput.files[0]);
    });

    dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropArea.classList.add('drag-over');
    });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dropArea.classList.remove('drag-over');
      processFile(e.dataTransfer.files[0]);
    });

    overlay.querySelector('#btn-import-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
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

    // ── Stakeholder-Adressierung (eigener Abschnitt am Ende) ────────────────
    if (stakeholderHasData()) {
      const sdata = getStakeholderMatrix();
      newPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 76, 129);
      pdfText('Stakeholder-Adressierung', m.left, y);
      y += LH * 1.4;
      doc.setDrawColor(15, 76, 129);
      doc.setLineWidth(0.4);
      doc.line(m.left, y, pw - m.right, y);
      y += LH * 0.9;
      doc.setDrawColor(0);
      doc.setTextColor(0);

      const writeGroup = (title, members) => {
        if (members.length === 0) return;
        checkY(LH * 3);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0);
        const tLines = doc.splitTextToSize(title, cw);
        pdfText(tLines, m.left, y);
        y += tLines.length * LH * 0.95;
        doc.setFont('helvetica', 'normal');
        members.forEach(s => {
          const lines = doc.splitTextToSize('• ' + stakeholderLine(s), cw - 3);
          checkY(lines.length * LH * 0.9);
          pdfText(lines, m.left + 3, y);
          y += lines.length * LH * 0.9;
        });
        y += LH * 0.5;
      };

      STAKEHOLDER_MATRIX_ORDER.forEach(quadKey => {
        writeGroup(STAKEHOLDER_QUADRANT_TITLES[quadKey],
          sdata.stakeholders.filter(s => stakeholderQuadrant(s) === quadKey));
      });
      writeGroup('Noch nicht positioniert',
        sdata.stakeholders.filter(s => !stakeholderQuadrant(s)));
    }

    // ── Quellenangaben-Seite ───────────────────────────────────────────────
    const sourceLinks = collectSourceLinks();
    if (footnotes.length > 0 || sourceLinks.length > 0) {
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

      if (sourceLinks.length > 0) {
        if (footnotes.length > 0) y += LH * 0.8;
        checkY(LH * 2);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 76, 129);
        pdfText('Weiterführende Links', m.left, y);
        y += LH * 1.4;
        doc.setTextColor(0);
        sourceLinks.forEach(s => {
          const lblLines = doc.splitTextToSize('• ' + s.label, cw);
          checkY(lblLines.length * LH * 0.85 + LH * 0.85 + 2);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          pdfText(lblLines, m.left, y);
          y += lblLines.length * LH * 0.85;
          // URL als klickbarer Link in Blau
          doc.setTextColor(15, 76, 129);
          doc.textWithLink(s.url, m.left + 3, y, { url: s.url });
          doc.setTextColor(0);
          y += LH * 0.85 + 2;
        });
      }
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
          <button id="btn-dl-md"   class="btn btn-primary btn-export"><i class="fa-solid fa-download"></i> Markdown</button>
          <button id="btn-dl-pdf"  class="btn btn-primary btn-export"><i class="fa-solid fa-file-pdf"></i> PDF</button>
          <button id="btn-dl-json" class="btn btn-primary btn-export"><i class="fa-solid fa-file-export"></i> JSON</button>
          <button id="btn-share"   class="btn btn-secondary btn-export"><i class="fa-solid fa-link"></i> Link teilen</button>
          <button id="btn-import"  class="btn btn-secondary btn-export"><i class="fa-solid fa-file-import"></i> Importieren</button>
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

    document.getElementById('btn-dl-md').addEventListener('click',   downloadMarkdown);
    document.getElementById('btn-dl-pdf').addEventListener('click',  downloadPDF);
    document.getElementById('btn-dl-json').addEventListener('click', downloadJSON);
    document.getElementById('btn-import').addEventListener('click',  showImportDialog);

    const shareURL    = getShareURL();
    const shareKB     = Math.round(shareURL.length / 1024 * 10) / 10;
    const shareLarge  = shareURL.length > 2000;
    const btnShareEl  = document.getElementById('btn-share');
    if (shareLarge) {
      btnShareEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Link teilen';
      btnShareEl.title = `URL ist ${shareKB} KB groß — kann in manchen Programmen abgeschnitten werden. Lieber JSON exportieren.`;
      btnShareEl.classList.add('btn-share-large');
    }
    btnShareEl.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareURL).then(() => {
          const msg = shareLarge
            ? `Link kopiert (${shareKB} KB — bei Problemen JSON exportieren)`
            : 'Link in Zwischenablage kopiert';
          showToast(msg, shareLarge ? 5000 : 3000);
        });
      } else {
        prompt('Link kopieren:', shareURL);
      }
    });
  }

  // ── Facilitator-Session ────────────────────────────────────────────────────

  async function loadSessionConfig() {
    const params = new URLSearchParams(window.location.search);
    const sessionName = params.get('session');
    if (!sessionName) return;
    try {
      const res = await fetch(`sessions/${sessionName}.json`);
      if (!res.ok) throw new Error('Session nicht gefunden');
      sessionConfig = await res.json();
    } catch (e) {
      console.warn('Session-Konfig konnte nicht geladen werden:', e.message);
      sessionConfig = null;
    }
  }

  function renderSessionBanner() {
    if (!sessionConfig) return '';
    return `<div class="session-banner">` +
      `<span class="session-label">${escapeHtml(sessionConfig.sessionTitle)}</span>` +
      `<span class="session-date">${escapeHtml(sessionConfig.sessionDate)}</span>` +
      `</div>`;
  }

  // ── URL-Hash-Share ─────────────────────────────────────────────────────────

  function getShareURL() {
    const payload = { v: 1, r: responses, s: state };
    const json    = JSON.stringify(payload);
    const bytes   = new TextEncoder().encode(json);
    const encoded = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
    const base    = window.location.origin + window.location.pathname;
    return base + '#share=' + encoded;
  }

  function loadFromURLHash() {
    const hash = window.location.hash;
    if (!hash.startsWith('#share=')) return false;
    try {
      const encoded = hash.slice(7);
      const bytes   = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const json    = new TextDecoder().decode(bytes);
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

  async function init() {
    await loadSessionConfig();
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
        startFresh();
      }
    }

    document.getElementById('btn-next').addEventListener('click', goNext);
    document.getElementById('btn-back').addEventListener('click', () => {
      if (onExportScreen) {
        onExportScreen = false;
        document.getElementById('btn-next').style.display = '';
        navigateTo(currentModuleIndex);
      } else if (currentModuleIndex > 0) {
        navigateTo(currentModuleIndex - 1);
      }
    });
    document.getElementById('btn-skip').addEventListener('click', goNext);

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
    responses = {};
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
  function startInit() {
    init().catch(err => console.error('Navigator-Initialisierung fehlgeschlagen:', err));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startInit);
  } else {
    startInit();
  }

})();

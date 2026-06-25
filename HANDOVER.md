# Übergabe-Kontext: KI-Use-Case-Navigator

Dieses Dokument gibt dir den vollständigen Kontext, um die Weiterentwicklung des **KI-Use-Case-Navigators** zu übernehmen.

---

## Was ist das Projekt?

Ein **adaptiver Wizard** als statische Single-Page-App (HTML/CSS/Vanilla JS, kein Framework, kein Build-Schritt). Zielgruppe: Beschäftigte in deutschen Kommunalverwaltungen. Ziel: strukturierte Reflexion und Dokumentation eines KI-Use-Cases in 8 Modulen.

**Live:** `https://daimpad.github.io/ki-navigator`  
**Repo:** `daimpad/ki-navigator` auf GitHub  
**Deployment:** automatisch via GitHub Actions → GitHub Pages bei jedem Push auf `main`

---

## Dateistruktur

```
index.html    — App-Shell (Header, Progressbar, Modul-Container, Nav-Footer, Dialog)
style.css     — nozilla Corporate Identity (vollständig)
wizard.js     — Anwendungslogik: Rendering, Branching, Persistenz, Export
content.js    — ALLE Inhalte (Module, Felder, Texte) — NIEMALS modifizieren*
.github/workflows/deploy.yml — GitHub Pages Deployment
```

> \* content.js darf für reine Textfixes (Tippfehler, Umlaute) angepasst werden, aber Logik, IDs und value-Keys dürfen sich nicht ändern.

---

## Architektur

### NAVIGATOR-Objekt (content.js)

```js
NAVIGATOR = {
  meta: { title, subtitle, exportFilename },
  stateKeys: { use_case_typ: null, ki_eignung: null, hosting_typ: null },
  modules: [ ...8 Module... ],
  exportConfig: { sections, markdown, pdf, document, alternativeExport_ki_nein }
}
```

### Wizard-State (wizard.js)

```js
let state = {};        // { use_case_typ, ki_eignung, hosting_typ }
let responses = {};    // { fieldId: value }
let currentModuleIndex = 0;
let onExportScreen = false;
```

### Schlüsselfunktionen in wizard.js

| Funktion | Zweck |
|----------|-------|
| `renderModule(idx)` | Rendert ein Modul komplett neu |
| `renderField(field)` | Dispatcht auf den richtigen Feldtyp-Renderer |
| `renderInfo/Text/Textarea/Select/Multiselect/Scale/Checklist` | Feldtyp-Renderer |
| `applyLabelOverrides(container)` | Post-render: überschreibt einzelne Labels/Hints ohne content.js zu ändern |
| `computeM4Score()` | Berechnet ki_eignung aus 5 Scoring-Feldern |
| `isFieldVisible(field)` | Prüft showWhen / showFor Bedingungen |
| `showExportScreen()` | Export-UI mit Markdown-Preview und Download-Buttons |
| `generateMarkdown()` | Erstellt Markdown-String für Export |
| `generatePDF()` | Erstellt jsPDF-Dokument (jsPDF 2.5.1, lokal in `vendor/`) |
| `saveToStorage()` / `loadFromStorage()` | localStorage unter Key `navigator_responses` |

---

## Module (M1–M8)

| ID | Titel | Besonderheiten |
|----|-------|----------------|
| m1 | Einstieg & Selbstverortung | Name (Label überschrieben: "Name deines Use Cases"), Behörde (Hint geleert) |
| m2 | Dein Use Case | Setzt `state.use_case_typ` → steuert Branching in M5/M6 |
| m3 | Organisatorischer Kontext | Skippable |
| m4 | KI-Eignung & Technologieauswahl | **Scoring-Algorithmus** → setzt `state.ki_eignung` (ja/bedingt/nein) |
| m5 | Datenschutz & Recht | DSGVO, EU AI Act, DSFA; `skipWhen: { ki_eignung: "nein" }` |
| m6 | Prompting-Reflexion | `skipWhen: { ki_eignung: "nein" }`; Chatbot-Felder via showFor |
| m7 | Applikation vs. Transformation | Prozess-Veränderung, Rollenwandel, Einordnung |
| m8 | Selbstbewertung | Ampel-Checkliste mit auto-Status aus bisherigen Antworten |

### M4-Scoring (ki_eignung)

```js
const M4_SCORING_FIELDS = [
  'm4_haeufigkeit', 'm4_variabilitaet', 'm4_fehlertoleranz',
  'm4_rechtliche_bindung', 'm4_nutzen_aufwand'
];
// Score >= 7 → "ja", >= 4 → "bedingt", < 4 → "nein"
```

---

## Branching-Mechanik

```js
// Field-Level:
showWhen: { stateKey: "ki_eignung", value: "ja" }
showWhen: { stateKey: "ki_eignung", values: ["ja", "bedingt"] }
showWhen: { field: "m2_feldId", value: "wert" }
showFor:  { values: ["chatbot", "workflow"] }  // filtert nach use_case_typ

// Module-Level (exportConfig):
skipWhen: { stateKey: "ki_eignung", value: "nein" }
```

### ki_eignung = "nein" (Alternativpfad)

- Module M5 (Technologie) und M6 (Prompting) werden übersprungen
- Export verwendet `alternativeExport_ki_nein.sections` (nur: meta, use_case, eignung, datenschutz, selbstbewertung)
- Dokumenttitel wechselt zu "Reflexionsdokument: Begründete Entscheidung gegen KI-Einsatz"

---

## Export-System

### Markdown
- BOM + UTF-8
- Download als `ki-use-case-steckbrief.md`
- Sections via `getExportSections()` gefiltert

### PDF (jsPDF 2.5.1)
- Lokal: `vendor/jspdf.umd.min.js` (kein CDN — konsistent mit lokalen Fonts/Icons)
- Format A4, Helvetica (Latin-1, unterstützt alle deutschen Umlaute)
- Quellenangaben-Seite wenn `sourceNotesInFooter: true`
- Checklist-Emojis → ASCII: `✅→[OK]`, `⚠️→[!]`, `❌→[ ]`
- Seitenzahlen im Footer

### Export-Screen
- Zeigt Markdown-Vorschau im `<pre>`
- "Zurück"-Button kehrt zum letzten Modul zurück
- "Weiter"-Button wird ausgeblendet

---

## Design-System: nozilla CI

### Farb-Tokens (CSS custom properties)

```css
--nz-green:      #00FF9C   /* Signal-Grün */
--nz-green-soft: #B7FFE0   /* Grün-Hell (selected state) */
--nz-paper:      #FFFEE5   /* Papier-Gelb */
--nz-paper-deep: #F4F1C4   /* Papier-Tief (Info-Blöcke) */
--nz-ink:        #000000   /* Tinte-Schwarz */
--nz-radius:     0         /* Kein border-radius */
--nz-shadow-sm:  3px 3px 0 0 black
--nz-shadow-md:  6px 6px 0 0 black
--nz-shadow-lg:  10px 10px 0 0 black
```

### Schriften

```css
--nz-font-display: "Zilla Slab", serif     /* Headlines, Modul-Titel, Subtitle */
--nz-font-body:    "Inter", sans-serif     /* Fließtext, Labels, Buttons */
--nz-font-mono:    "Space Mono", monospace /* Hints, Progress-Steps, Metadaten */
```

### Hintergründe (aktuell)

- `body`: `#ffffff` (weiß)
- `.app-header`: `var(--nz-ink)` (schwarz)
- `.progress-wrapper`: `#ffffff`
- `.nav-footer`: `#ffffff`
- `.field`: `#ffffff`, kein Border
- Inputs: `#ffffff`, Hairline-Border
- `field-type-info`: transparent, `border-radius: 8px` (einzige Ausnahme vom nz-radius: 0)

### Wichtige Klassen-Konventionen

- `.info-result-ja / -bedingt / -nein` — liegen direkt auf dem `.field`-Wrapper (nicht auf dem inneren div)
- `.label-critical` — Unterstrichen (kein Rot, weil nozilla kein Rot verwendet)
- `.traffic-light.tl-green/yellow/red` — Quadratische Ampeln (border-radius: 0)
- `.warning-box` — schwarzer Hintergrund + grüner linker Border

---

## Aktuell bestehende Label-Overrides (wizard.js)

In `applyLabelOverrides()` (wird nach jedem `renderModule()` aufgerufen):

```js
// "Dein Name" → "Name deines Use Cases"
container.querySelectorAll('.field-label').forEach(el => {
  if (el.textContent.trim() === 'Dein Name') el.textContent = 'Name deines Use Cases';
});
// Behörde-Hint (Beispiele entfernt)
container.querySelectorAll('.field-hint').forEach(el => {
  const parent = el.closest('[data-id="m1_organisation"]');
  if (parent) el.textContent = '';
});
```

---

## HTML-Struktur (index.html)

```html
<div class="top-bar">               ← sticky
  <header class="app-header">
    <h1 class="app-title">KI-Use-Case-<mark class="g">Navigator</mark></h1>
    <p id="app-subtitle" class="app-subtitle"></p>
  </header>
  <div class="progress-wrapper">
    <nav id="progress-bar"></nav>   ← dynamisch befüllt
  </div>
</div>

<main id="module-container"></main>  ← dynamisch befüllt

<div class="nav-footer">            ← fixed bottom
  <div class="nav-inner">
    <button id="btn-back">← Zurück</button>
    <nav class="site-footer-links"> ← Impressum / Datenschutz / Kontakt / nozilla
    <button id="btn-skip">Überspringen</button>
    <button id="btn-next">Weiter →</button>
  </div>
</div>

<div id="resume-dialog">            ← "Fortschritt fortsetzen?"-Dialog
```

---

## Subtitle

Hardcoded in wizard.js (überschreibt content.js):

```js
document.getElementById('app-subtitle').textContent =
  'Schritt für Schritt den eigenen KI-Use Case entwickeln';
```

---

## Footer-Links (in nav-footer)

```html
<a href="https://nozilla.de/impressum">Impressum</a>
<a href="https://nozilla.de/datenschutz">Datenschutz</a>
<a href="https://nozilla.de/kontakt">Kontakt</a>
<a href="https://nozilla.de">nozilla | bits & bytes mit ❤</a>
```

---

## Entwicklungs-Workflow

```bash
# Lokaler Start
python3 -m http.server 8080

# Branch-Konvention (Claude Code on the web)
# Entwicklung auf Feature-Branch → PR → Merge in main → automatisches Deployment
git checkout -b feature/mein-feature
git push -u origin feature/mein-feature
# PR erstellen → mergen
```

---

## Was als nächstes denkbar wäre

- **Mehrsprachigkeit** (DE/EN)
- **Druckansicht** (CSS `@media print`)
- **Fortschrittsanzeige** pro Modul (% ausgefüllt)
- **Validierung** (Pflichtfelder markieren, Warnung bei leerem Modul)
- **Weitere Exportformate** (Word via docx-Bibliothek)
- **Barrierefreiheit** (ARIA-Verbesserungen, Tastatur-Navigation)
- **Admin-Modus** zum einfachen Bearbeiten von content.js über eine UI

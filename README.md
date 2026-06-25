# KI-Use-Case-Navigator

Ein adaptiver Wizard für Beschäftigte in Kommunalverwaltungen, der Schritt für Schritt durch die Entwicklung und Bewertung eines KI-Use-Cases führt. Am Ende entsteht ein strukturierter Steckbrief als Markdown- oder PDF-Dokument.

**Live:** [daimpad.github.io/ki-navigator](https://daimpad.github.io/ki-navigator)

---

## Was es tut

Der Navigator führt durch 8 Module:

| Modul | Titel | Inhalt |
|-------|-------|--------|
| M1 | Einstieg & Selbstverortung | Name, Organisation, Rolle, KI-Vorerfahrung |
| M2 | Dein Use Case | Beschreibung, Nutzergruppen, Use-Case-Typ |
| M3 | Organisatorischer Kontext | Ressourcen, Zeitrahmen, Hindernisse |
| M4 | KI-Eignung & Technologieauswahl | Scoring-Algorithmus → Eignung (ja/bedingt/nein), Hosting, Lock-in |
| M5 | Datenschutz & Rechtliche Rahmenbedingungen | DSGVO, DSFA, EU AI Act, Drittlandtransfer |
| M6 | Prompting-Reflexion | Prompt-Erfahrung, Qualitätssicherung, Datenschutz im Prompt |
| M7 | KI als Applikation oder Transformation? | Prozessveränderung, Rollenwandel, Einordnung |
| M8 | Selbstbewertung | Ampel-Checkliste, Umsetzungsreife, nächste Schritte |

### Branching-Logik

- **M4-Scoring:** 5 Felder (Häufigkeit, Variabilität, Fehlertoleranz, Rechtliche Bindung, Nutzen/Aufwand) ergeben einen Score. Ab 7 Punkten → KI geeignet (`ja`), ab 4 → bedingt geeignet (`bedingt`), darunter → `nein`.
- **ki_eignung = nein:** Alternativer Exportpfad — Module Technologie und Prompting werden übersprungen; das Dokument wird als begründete Entscheidung gegen KI formuliert.
- **Use-Case-Typ** (`chatbot`, `text`, `daten`, `workflow`, `hybrid`): steuert, welche Felder und Optionen sichtbar sind.

---

## Technischer Aufbau

```
ki-navigator/
├── index.html      # Shell: Header, Progressbar, Modul-Container, Nav-Footer, Dialog
├── style.css       # nozilla Corporate Identity
├── wizard.js       # Anwendungslogik (Rendering, Branching, Export, Persistenz)
└── content.js      # Alle Inhalte (Module, Felder, Texte) — NICHT modifizieren
```

### Prinzipien

- **Kein Framework, kein Build-Schritt** — reines HTML/CSS/Vanilla JS
- **Kein Backend** — funktioniert vollständig im Browser
- **content.js ist Daten, wizard.js ist Logik** — Trennung strikt einhalten
- **localStorage** persistiert Fortschritt unter dem Key `navigator_responses`

### Feldtypen in content.js

| Typ | Rendering |
|-----|-----------|
| `info` | Textblock (statisch oder dynamisch via `contentByScore`) |
| `text` | Einzeiliges Eingabefeld |
| `textarea` | Mehrzeiliges Eingabefeld |
| `select` | Radiobuttons (Einfachauswahl) |
| `multiselect` | Checkboxen (Mehrfachauswahl) |
| `scale` | Range-Slider mit numerischer Ausgabe |
| `checklist` | Ampel-Liste mit automatischem und manuellem Status |

### Sichtbarkeitssteuerung

```js
showWhen: { stateKey: "ki_eignung", value: "ja" }       // nur wenn State-Variable = Wert
showWhen: { stateKey: "ki_eignung", values: ["ja","bedingt"] } // eine von mehreren
showWhen: { field: "m2_use_case_typ", value: "chatbot" } // basierend auf Antwort
showFor:  { values: ["chatbot","workflow"] }              // Use-Case-Typ-Filter
```

### State-Variablen

```js
state.use_case_typ   // gesetzt durch m2_use_case_typ (branching.setVar)
state.ki_eignung     // gesetzt durch M4-Scoring (ja / bedingt / nein)
state.hosting_typ    // gesetzt durch m4_hosting
```

---

## Export

Am Ende von M8 erscheint der Export-Screen mit zwei Optionen:

### Markdown
- UTF-8 BOM, Download als `ki-use-case-steckbrief.md`
- Abschnitte gefiltert nach `ki_eignung` (Alternativpfad bei `nein`)

### PDF
- Generiert clientseitig via **jsPDF 2.5.1** (UMD, lokal in `vendor/`)
- A4, Helvetica (Latin-1 für Umlaute)
- Abschnitte, Quellenangaben-Seite, Seitenzahlen im Footer

---

## Design — nozilla Corporate Identity

Das Design folgt dem nozilla CI-System:

| Token | Wert | Verwendung |
|-------|------|-----------|
| `--nz-green` | `#00FF9C` | Signal-Grün: Highlights, aktive Zustände, Buttons |
| `--nz-paper` | `#FFFEE5` | Papier-Gelb: Hintergrundakzente |
| `--nz-ink` | `#000000` | Tinte-Schwarz: Text, Borders, Shadows |
| `--nz-radius` | `0` | Kein border-radius (neo-brutalist) |
| `--nz-shadow-sm/md/lg` | `3/6/10px offset, kein Blur` | Harte Schatten |

**Schriften** (Google Fonts):
- `Zilla Slab` (Bold 700) — Headlines, Modul-Titel, Subtitle
- `Inter` (Regular 400, SemiBold 600) — Fließtext, Labels, Buttons
- `Space Mono` (Regular/Bold) — Metadaten, Hints, Progress-Steps, Code

---

## Deployment

Automatisches Deployment via **GitHub Actions → GitHub Pages** bei jedem Push auf `main`.

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
```

Die App ist statisch (kein Build-Schritt) — das gesamte Repository wird direkt als Pages-Artifact hochgeladen.

---

## Lokale Entwicklung

Kein Build nötig — einfach einen lokalen HTTP-Server starten:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Dann `http://localhost:8080` im Browser öffnen.

> **Hinweis:** Direktes Öffnen von `index.html` als `file://` funktioniert für die Basis-Funktionalität, aber Google Fonts werden nicht geladen.

---

## Bekannte Einschränkungen

- **jsPDF + Umlaute:** jsPDF 2.5.1 mit Helvetica unterstützt Latin-1. Alle deutschen Sonderzeichen werden korrekt gerendert. Emojis im PDF werden durch ASCII-Platzhalter ersetzt (`[OK]`, `[!]`, `[ ]`).
- **Checklist-Status:** Wird automatisch aus bisherigen Antworten abgeleitet (grün/gelb/rot). Manuelle Überschreibung per Klick auf die Ampel möglich.
- **Kein Account / kein Server:** Alle Daten bleiben lokal im Browser (localStorage). Beim Löschen des Browser-Caches gehen gespeicherte Eingaben verloren.

---

## Projektstruktur für Weiterentwicklung

### content.js anpassen

`content.js` enthält das `NAVIGATOR`-Objekt mit allen Inhalten. Neue Felder, Module oder Texte → hier einfügen. Die Datei ist bewusst von der Logik getrennt.

### Neue Feldtypen

Neuen `case` in `renderField()` (wizard.js) hinzufügen und entsprechende `render[Typ]`-Funktion implementieren.

### Export-Abschnitte

`NAVIGATOR.exportConfig.sections` steuert, welche Felder in welchem Abschnitt exportiert werden. `skipWhen` und `alternativeTitle_ki_nein` ermöglichen den Alternativpfad.

---

*Erstellt mit nozilla — bits & bytes mit ❤*

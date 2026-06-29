# Entwicklungs-Dokumentation

Technische Notizen zur Weiterentwicklung des KI-Use-Case-Navigators.
Für den Gesamtüberblick siehe `README.md` und `HANDOVER.md`.

---

## Modul „Stakeholder-Adressierung“

Ein eigener Wizard-Schritt, der die Stakeholder-Arbeit aus Session 4 der
KI-Werkstatt I abbildet: Erfassung der Beteiligten (Schritt 1) und Einordnung
in eine 2×2-Einfluss/Haltungs-Matrix (Schritt 2) mit kuratierten
Adressierungs-Hinweisen pro Quadrant.

### Position im Wizard

Das Modul (`id: "mstake"`) wird in `content.js` **direkt nach m3
(Organisatorischer Kontext)** eingefügt — dort werden über das Feld
`m3_entscheider` die Beteiligten erstmals benannt. Technisch geschieht das
über einen `NAVIGATOR.modules.push(...)`, der **vor** dem `m4`-Push steht;
zu diesem Zeitpunkt enthält das Modul-Array erst `m1–m3`, sodass das neue
Modul an Index 3 landet. Die Reihenfolge lässt sich durch Verschieben dieses
Push-Blocks jederzeit ändern, ohne weitere Anpassungen.

### Datenmodell — wie wird ein Stakeholder-Eintrag gespeichert?

Die Daten liegen **nicht** im flachen `responses`-Objekt, sondern in einem
eigenen Schlüssel innerhalb des Stand-Objekts `state`:

```js
state.stakeholderMatrix = {
  stakeholders: [
    {
      id,         // stabile, kollisionsarme ID (makeStakeholderId())
      name,       // Name/Kürzel (Pflichtfeld, max. 60 Zeichen)
      role,       // Rolle/Funktion (Freitext, max. 120 Zeichen)
      category,   // '' | 'entscheider' | 'bewerter' | 'multiplikator' | 'betroffene'
      influence,  // '' | 'gering' | 'hoch'
      attitude    // '' | 'unterstuetzend' | 'skeptisch'
    }
  ],
  importedFromM3  // bool — true, sobald der Übernahme-Hinweis einmalig
                  //        beantwortet wurde (übernommen oder verworfen)
};
```

Der **Quadrant** wird nicht gespeichert, sondern aus `influence` + `attitude`
**abgeleitet** (`stakeholderQuadrant()`), damit es keine widersprüchlichen
Zustände geben kann:

| Einfluss | Haltung        | Quadrant                  |
|----------|----------------|---------------------------|
| gering   | unterstuetzend | Potenzielle Unterstützer  |
| hoch     | unterstuetzend | Strategische Partner      |
| gering   | skeptisch      | Marginal Beteiligte       |
| hoch     | skeptisch      | Kritische Vetospieler     |

Fehlt einer der beiden Werte, gilt der Stakeholder als *„Noch nicht
positioniert“* und erscheint in einer separaten Liste unterhalb der Matrix.

Gerendert wird das Ganze über einen **neuen Feldtyp** `stakeholderMatrix`
(Dispatch in `renderField()`, Komponente `renderStakeholderMatrix()`). Die
Komponente verwaltet ihr DOM selbst und zeichnet sich bei strukturellen
Änderungen (Hinzufügen, Löschen, Auswahl) neu. Texteingaben (Name/Rolle)
schreiben live in den State **ohne** Re-Render, damit der Fokus erhalten
bleibt; die Matrix aktualisiert sich beim Verlassen des Feldes (`change`).

### Warum keine KI-gestützte Empfehlung?

Die Adressierungs-Hinweise sind **statisch und kuratiert** — kein API-Call,
kein Sprachmodell, keine dynamische Texterzeugung. Das ist eine bewusste
didaktische Setzung: Der Navigator ist Teil einer Werkstatt, die **Reflexion
über KI** lehrt. Eine KI, die dem Nutzenden die Stakeholder-Einschätzung
abnimmt, würde genau die Eigenleistung unterlaufen, um die es methodisch geht.
Die Einordnung in die Matrix und die Schlüsse daraus sollen die Nutzenden
selbst ziehen; die Hinweistexte geben dafür einen erfahrungsbasierten Rahmen,
keine generierte Antwort.

### Kuratierte Inhalte — `stakeholder-hints.js`

Die vier Quadranten-Hinweise und der allgemeine Hinweis sind in eine eigene
Datei `stakeholder-hints.js` ausgelagert, die **ohne Code-Eingriff** vom
Auftraggeber gepflegt werden kann. Sie wird in `index.html` als einfaches
`<script src="stakeholder-hints.js">` **vor** `content.js` geladen und stellt
die globale Konstante `STAKEHOLDER_HINTS` bereit (kein Build-Schritt, kein
Modul-System — konsistent mit `content.js`/`wizard.js`).

Pro Quadrant: `title`, `axes`, `body` (Array von Absätzen) und optional
`pitfall` („Was hier am häufigsten schiefläuft“ — durch Entfernen der
Eigenschaft ausblendbar). Die Quadranten-**Schlüssel** sind technisch fix und
verbinden Hinweis und Matrix-Logik — nur die Texte sind frei editierbar.
Fehlt die Datei, rendert das Modul ohne Hinweisblock weiter (defensive
Prüfung auf `window.STAKEHOLDER_HINTS`).

### Wie wird die Rückwärtskompatibilität gewährleistet?

Oberste Priorität: bestehende Stände, URL-Shares, JSON-Im/Exporte und PDFs
dürfen nicht brechen.

1. **Eigener State-Schlüssel.** `state.stakeholderMatrix` ist additiv.
   Bestehende Felder (insbesondere `m3_entscheider`) bleiben unangetastet.

2. **Automatische Mitführung ohne Sonderlogik.** Sowohl `saveToStorage()`
   (localStorage) als auch `getShareURL()` (Base64-URL-Hash) als auch
   `downloadJSON()` serialisieren das **gesamte** `state`-Objekt. Der neue
   Schlüssel wird dadurch ohne zusätzlichen Code in allen drei Kanälen
   gespeichert und wiederhergestellt.

3. **Lazy-Init für alte Stände.** `getStakeholderMatrix()` legt den Schlüssel
   beim ersten Zugriff leer an (`{ stakeholders: [], importedFromM3: false }`).
   Ein Stand ohne den Schlüssel wirft **nie** einen Fehler und braucht keinen
   für Nutzende sichtbaren Fallback. Alte URL-Hashes laden, das neue Tab ist
   initial leer.

4. **Export nur bei Daten.** Markdown- und PDF-Export ergänzen den
   Stakeholder-Abschnitt **am Ende** und nur, wenn mindestens ein Stakeholder
   erfasst ist (`stakeholderHasData()`). Stände ohne Stakeholder-Daten
   erzeugen denselben Export wie zuvor — der Abschnitt wird weggelassen, nicht
   leer angezeigt.

5. **Übernahme aus m3 — robust statt heuristisch.** Das ursprüngliche Konzept
   sah ein zeilen-/listenweises Aufsplitten eines Freitextfeldes vor. Das
   Feld `m3_entscheider` ist jedoch eine **strukturierte Mehrfachauswahl**,
   kein Freitext. Statt fragiler Texttrennung übernimmt der Hinweis daher die
   **ausgewählten Optionen** direkt (eine Stakeholder-Zeile je Auswahl,
   Kategorie zunächst leer). Der Hinweis erscheint einmalig (gesteuert über
   `importedFromM3`) und nur, wenn noch keine Stakeholder erfasst sind und
   `m3_entscheider` Auswahlen enthält.

### Tests

`scratchpad/test_stakeholder.mjs` (Playwright, headless Chromium) deckt ab:
alter Hash ohne `stakeholderMatrix` lädt fehlerfrei, Lazy-Init, Übernahme aus
m3, Quadranten-Zuordnung, „Noch nicht positioniert“, Persistenz in
localStorage, Share-Round-Trip in frischem Kontext, Markdown-Export mit/ohne
Daten sowie fehlerfreie PDF-Generierung. Der Testlauf ist nicht Teil des
Repos (Browser-Treiber umgebungsspezifisch), die Datei dient als Vorlage.

### Bekannte Grenzen / mögliche Erweiterungen

- **URL-Länge:** Viele Stakeholder vergrößern den Share-Hash. Die bestehende
  URL-Längenwarnung (> 2000 Zeichen) greift dadurch ggf. früher — das ist
  akzeptiert und erwünscht.
- **Name als Pflichtfeld** wird bewusst weich behandelt (Platzhalter-Hinweis,
  Anzeige „(ohne Name)“ statt harter Blockade) — konsistent mit dem
  durchgängig nicht-blockierenden Stil des Navigators.
- Denkbar: Pflege-Erinnerung/Wiedervorlage, Sortierung/Filter, Verschieben
  einzelner Hinweise in collapsible Panels bei sehr vielen Stakeholdern.

/**
 * content.js — KI-Use-Case-Navigator
 * ====================================
 * Inhaltsdatei: Alle Fragen, Texte, Verzweigungsbedingungen, Output-Templates.
 * Vollständig getrennt von der Anwendungslogik (wizard.js).
 *
 * Feldtypen:
 *   "info"        — Informationsblock, kein Input
 *   "text"        — Einzeiliges Textfeld
 *   "textarea"    — Mehrzeiliges Textfeld
 *   "select"      — Einfachauswahl (Radio-Buttons)
 *   "multiselect" — Mehrfachauswahl (Checkboxen)
 *   "scale"       — Numerische Skala mit Beschriftung
 *
 * Alle Felder sind standardmäßig überspringbar (required: false).
 * Ausnahmen sind explizit markiert (required: true).
 *
 * Verzweigungslogik:
 *   select-Felder mit branching.setVar setzen eine globale State-Variable.
 *   Spätere Felder nutzen showFor: ["wert1", "wert2"], um typspezifisch
 *   ein- oder ausgeblendet zu werden.
 *   Ein leeres showFor (oder fehlendes Attribut) bedeutet: immer sichtbar.
 *
 * Module (Stand: v0.2 — Module 1–3 vollständig):
 *   m1  Einstieg & Selbstverortung
 *   m2  Use-Case-Typ  ← HAUPTWEICHE (setzt state.use_case_typ)
 *   m3  Organisatorischer Kontext
 *   m4  KI-Eignung & Technologieauswahl    [folgt]
 *   m5  Datenschutz & Datensouveränität    [folgt]
 *   m6  Prompting-Reflexion                [folgt]
 *   m7  Einordnung: Applikation vs. Transformation [folgt]
 *   m8  Selbstbewertung                    [folgt]
 *   m9  Export                             [folgt]
 */

const NAVIGATOR = {

  // ─────────────────────────────────────────────────────────────
  // META
  // ─────────────────────────────────────────────────────────────
  meta: {
    title: "KI-Use-Case-Navigator",
    subtitle: "Strukturierte Reflexion für Beschäftigte in Kommunalverwaltungen",
    version: "0.1",
    language: "de",
    exportFilename: "ki-use-case-steckbrief"
  },

  // ─────────────────────────────────────────────────────────────
  // STATE — globale Verzweigungsvariablen
  // Werden durch Nutzerauswahl befüllt, nie manuell gesetzt.
  // ─────────────────────────────────────────────────────────────
  stateKeys: {
    use_case_typ: null,   // Hauptweiche: chatbot | dokument | recherche | crm_analyse | texterstellung | unklar
    ki_eignung: null,     // Eignungsprüfung: ja | bedingt | nein
    hosting_typ: null     // Datenschutz-Verzweigung: cloud_extern | cloud_eu | on_premise | unklar
  },

  // ─────────────────────────────────────────────────────────────
  // MODULE
  // ─────────────────────────────────────────────────────────────
  modules: [

    // ═══════════════════════════════════════════════════════════
    // MODUL 1 — Einstieg & Selbstverortung
    // Ziel: Kontext herstellen, keine Verzweigungen
    // ═══════════════════════════════════════════════════════════
    {
      id: "m1",
      title: "Einstieg & Selbstverortung",
      skippable: false,
      progressLabel: "Kontext",

      fields: [

        {
          id: "m1_intro",
          type: "info",
          content: [
            "Dieser Navigator begleitet dich durch eine strukturierte Reflexion deines KI-Vorhabens in der kommunalen Verwaltung.",
            "Du kannst jeden Schritt überspringen — alle Eingaben bleiben ausschließlich in deinem Browser gespeichert.",
            "Am Ende erhältst du einen <strong>Use-Case-Steckbrief</strong> und eine <strong>Selbstbewertung</strong> zum Herunterladen."
          ]
        },

        {
          id: "m1_name",
          type: "text",
          label: "Dein Name",
          hint: "Optional — wird nur im Export angezeigt.",
          required: false,
          output: { label: "Erstellt von", section: "meta" }
        },

        {
          id: "m1_organisation",
          type: "text",
          label: "Behörde / Organisation",
          hint: "z. B. Stadt Neuss, Gemeinde Korschenbroich, Rhein-Kreis Neuss",
          required: false,
          output: { label: "Organisation", section: "meta" }
        },

        {
          id: "m1_fachbereich",
          type: "text",
          label: "Fachbereich / Amt",
          hint: "z. B. Bürgeramt, Stadtdigitalisierung, Schul-IT, Stadtentwicklung, Beschaffung",
          required: false,
          output: { label: "Fachbereich", section: "meta" }
        },

        {
          id: "m1_zeitrahmen",
          type: "text",
          label: "Zeitrahmen",
          hint: "Ab wann soll das Projekt lanciert werden oder ab wann wird es wichtig, diesen Use Case umzusetzen?",
          required: false,
          output: { label: "Zeitrahmen", section: "meta" }
        },

        {
          id: "m1_bekannte_tools",
          type: "textarea",
          label: "Bekannte Applikationen",
          hint: "Gibt es bereits Anwendungen oder Tools, die diesen Bedarf abdecken könnten?",
          rows: 3,
          required: false,
          output: { label: "Bekannte Applikationen", section: "meta" }
        },

        {
          id: "m1_referenzbeispiele",
          type: "textarea",
          label: "Referenzbeispiele",
          hint: "Gibt es Referenzbeispiele aus anderen Kommunen oder Organisationen, die etwas Ähnliches umgesetzt haben?",
          rows: 3,
          required: false,
          output: { label: "Referenzbeispiele", section: "meta" }
        },

        {
          id: "m1_use_case_status",
          type: "select",
          label: "In welchem Stadium befindet sich dein Use Case?",
          required: false,
          options: [
            { value: "idee",    label: "Erste Idee — ich habe eine grobe Vorstellung" },
            { value: "konkret", label: "Konkrete Vorstellung — ich weiß ungefähr, was ich will" },
            { value: "erprobt", label: "Bereits erprobt — ich habe erste praktische Erfahrungen" }
          ],
          output: { label: "Status des Use Cases bei Bearbeitung", section: "meta" }
        }

      ] // end fields m1
    },


    // ═══════════════════════════════════════════════════════════
    // MODUL 2 — Use-Case-Typ  ← HAUPTWEICHE
    // Setzt state.use_case_typ → steuert Inhalt in M4, M5, M6
    // ═══════════════════════════════════════════════════════════
    {
      id: "m2",
      title: "Dein Use Case",
      skippable: false,
      progressLabel: "Use Case",

      fields: [

        {
          id: "m2_intro",
          type: "info",
          content: [
            "Damit der Navigator die richtigen Fragen für dich auswählt, ordne deinen Use Case zunächst einem Typ zu.",
            "Das ist eine erste Einordnung — keine endgültige Festlegung."
          ]
        },

        {
          id: "m2_typ",
          type: "select",
          label: "Welcher Typ beschreibt deinen Use Case am besten?",
          required: true,
          branching: {
            setVar: "use_case_typ"   // ← setzt globale Hauptweiche
          },
          options: [
            {
              value: "chatbot",
              label: "Auskunft & Dialog",
              description: "KI beantwortet Fragen, führt Gespräche oder übernimmt Erstkontakt — z. B. Bürgerhotline, interner Helpdesk, Schul-IT-Auskunft"
            },
            {
              value: "dokument",
              label: "Dokumentenverarbeitung",
              description: "KI liest, klassifiziert, extrahiert oder migriert Dokumente — z. B. DMS-Migration, Aktenerschließung, Vertragsanalyse"
            },
            {
              value: "recherche",
              label: "Recherche & Wissensarbeit",
              description: "KI unterstützt beim Suchen, Zusammenfassen oder Analysieren — z. B. Marktrecherche Beschaffung, Fördermittelsuche"
            },
            {
              value: "crm_analyse",
              label: "Datenauswertung & CRM",
              description: "KI wertet strukturierte Daten aus oder unterstützt Beziehungsmanagement — z. B. Wirtschaftsförderung, Unternehmenskontakte"
            },
            {
              value: "texterstellung",
              label: "Texterstellung & Kommunikation",
              description: "KI erstellt oder überarbeitet Texte — z. B. Newsletter, Bescheide, Lieferantenkommunikation"
            },
            {
              value: "unklar",
              label: "Noch unklar / Sonstiges",
              description: "Ich bin noch nicht sicher, welchem Typ mein Use Case entspricht — der Navigator führt mich trotzdem durch"
            }
          ],
          output: { label: "Use-Case-Typ", section: "use_case" }
        },

        {
          id: "m2_name",
          type: "text",
          label: "Arbeitstitel",
          hint: "z. B. Bürger-Chatbot Bürgeramt, DMS-Migration Altakten, KI-Recherche Beschaffung",
          required: false,
          output: { label: "Arbeitstitel", section: "use_case" }
        },

        {
          id: "m2_beschreibung",
          type: "textarea",
          label: "Beschreibe deinen Use Case in 3–5 Sätzen",
          hint: "Was soll die KI konkret tun? Wer nutzt es? In welchem Kontext?",
          help: "Beschreibe, was deine KI-Lösung tun soll - nicht wie sie technisch funktioniert. Vermeide an dieser Stelle Produktnamen oder Anbieter. Es geht um das Was, nicht um das Womit. Eine gute Beschreibung lässt offen, mit welcher konkreten Technologie das Ziel später erreicht wird. Das hält den Lösungsraum bewusst weit - die Festlegung auf eine bestimmte Architektur kommt später.",
          required: false,
          rows: 5,
          output: { label: "Beschreibung", section: "use_case" }
        },

        {
          id: "m2_problem",
          type: "textarea",
          label: "Welches Problem oder welchen Bedarf soll der Use Case adressieren?",
          hint: "Was passiert heute ohne KI? Wo liegt die Ineffizienz, Lücke oder Belastung?",
          help: "Das Problem ist nicht 'wir haben keine KI' - sondern eine konkrete Schwachstelle im Prozess. Was ärgert die Bürgerinnen und Bürger, die Beschäftigten oder die Verwaltungsleitung? Wo entstehen vermeidbare Kosten, Wartezeiten oder Fehler? Wenn du das Problem in einem Satz formulieren kannst, hilft das später bei der Argumentation - auch gegenüber Stakeholdern, die KI skeptisch gegenüberstehen.",
          required: false,
          rows: 4,
          output: { label: "Ausgangsproblem / Bedarf", section: "use_case" }
        },

        {
          id: "m2_zielgruppe",
          type: "text",
          label: "Wer profitiert direkt?",
          hint: "z. B. Bürger:innen, interne Sachbearbeitung, Führungskräfte, Unternehmen",
          required: false,
          output: { label: "Zielgruppe", section: "use_case" }
        },

        {
          id: "m2_ziel",
          type: "multiselect",
          label: "Was ist das primäre Ziel des Use Cases?",
          hint: "Mehrfachauswahl möglich",
          required: false,
          options: [
            { value: "zeitersparnis",    label: "Zeitersparnis / Effizienz" },
            { value: "qualität",        label: "Qualitätssteigerung" },
            { value: "erreichbarkeit",   label: "Bessere Erreichbarkeit / Verfügbarkeit" },
            { value: "entlastung",       label: "Entlastung von Routineaufgaben" },
            { value: "wissen",           label: "Besserer Zugang zu Wissen" },
            { value: "buergerservice",   label: "Verbesserter Bürgerservice" },
            { value: "transparenz",      label: "Mehr Transparenz / Nachvollziehbarkeit" },
            { value: "sonstiges",        label: "Sonstiges" }
          ],
          output: { label: "Ziele", section: "use_case" }
        }

      ] // end fields m2
    }
,

    // ═══════════════════════════════════════════════════════════
    // MODUL 3 — Organisatorischer Kontext
    // Ziel: Interne Voraussetzungen, Entscheidungsstrukturen,
    //       Datenverfügbarkeit und Ressourcenlage klären.
    // ═══════════════════════════════════════════════════════════
    {
      id: "m3",
      title: "Organisatorischer Kontext",
      skippable: true,
      progressLabel: "Organisation",

      fields: [

        {
          id: "m3_intro",
          type: "info",
          content: [
            "KI-Vorhaben scheitern selten an der Technologie — häufiger an organisatorischen Voraussetzungen.",
            "Dieses Modul hilft dir einzuschätzen, wie gut dein Use Case in die bestehende Struktur passt."
          ]
        },

        {
          id: "m3_daten_vorhanden",
          type: "select",
          label: "Sind die Daten, die dein Use Case benötigt, bereits vorhanden?",
          required: false,
          options: [
            { value: "ja_digital",        label: "Ja — digital und gut zugänglich" },
            { value: "ja_unstrukturiert",  label: "Ja — digital, aber unstrukturiert oder verteilt" },
            { value: "teilweise",          label: "Teilweise — einiges vorhanden, anderes fehlt noch" },
            { value: "analog",             label: "Größtenteils analog (Papier, Akten)" },
            { value: "nein",               label: "Nein — müssten erst erhoben oder aufbereitet werden" },
            { value: "unklar",             label: "Ich weiß es noch nicht" }
          ],
          output: { label: "Datenverfügbarkeit", section: "kontext" }
        },

        {
          id: "m3_daten_beschreibung",
          type: "textarea",
          label: "Welche Daten braucht dein Use Case konkret?",
          hint: "z. B. Bürgeranfragen, Bescheide, Lieferantenlisten, interne Wissensdokumente, Formulare",
          required: false,
          rows: 3,
          output: { label: "Benötigte Daten", section: "kontext" }
        },

        {
          id: "m3_systeme_vorhanden",
          type: "multiselect",
          label: "Welche IT-Systeme sind in deinem Fachbereich bereits im Einsatz?",
          hint: "Mehrfachauswahl — nur auswählen, was tatsächlich genutzt wird",
          required: false,
          options: [
            { value: "dms",              label: "Dokumentenmanagementsystem (DMS)" },
            { value: "erp",              label: "ERP / Finanzsoftware (z. B. SAP, OK.FIS)" },
            { value: "crm",              label: "CRM / Kontaktmanagementsystem" },
            { value: "fachverfahren",    label: "Fachverfahren (amtsspezifisch)" },
            { value: "microsoft365",     label: "Microsoft 365 / Office-Suite" },
            { value: "ticketsystem",     label: "Ticket- oder Helpdesk-System" },
            { value: "intranet",         label: "Intranet / Wissensportal" },
            { value: "keine",            label: "Keine nennenswerte IT-Infrastruktur vorhanden" },
            { value: "sonstiges",        label: "Sonstiges" }
          ],
          output: { label: "Bestehende Systeme", section: "kontext" }
        },

        {
          id: "m3_integration_notwendig",
          type: "select",
          label: "Muss der Use Case in bestehende Systeme integriert werden?",
          required: false,
          options: [
            { value: "ja_eng",   label: "Ja — enge technische Integration notwendig" },
            { value: "ja_lose",  label: "Ja — lose Anbindung (z. B. Export/Import) ausreichend" },
            { value: "nein",     label: "Nein — der Use Case steht eigenständig" },
            { value: "unklar",   label: "Noch unklar" }
          ],
          output: { label: "Integrationsnotwendigkeit", section: "kontext" }
        },

        {
          id: "m3_entscheider",
          type: "multiselect",
          label: "Wer muss an der Entscheidung beteiligt werden?",
          hint: "Mehrfachauswahl",
          help: "Stakeholder sind alle Personen, deren Zustimmung, Mitwirkung oder Akzeptanz du für die Umsetzung brauchst - oder die durch das Vorhaben unmittelbar betroffen sind. Unterscheide vier Kategorien: Entscheider (formal zuständig für Zustimmung - z. B. Verwaltungsleitung, Personalrat), Bewerter (prüfen kritisch - z. B. Datenschutzbeauftragte, Rechnungsprüfung), Multiplikatoren (können das Vorhaben aktiv unterstützen - z. B. CDO, Digitalisierungsbeauftragte, Innovationsbüros) und Betroffene (nutzen das System, ohne formal eingebunden zu sein - z. B. Bürgerinnen und Bürger, Beschäftigte in der Sachbearbeitung). In fast jedem kommunalen KI-Vorhaben sind dabei: Datenschutzbeauftragte, Personalrat, IT-Verantwortliche und Verwaltungsleitung. Notiere pro Stakeholder, welche Erwartung oder Sorge zu erwarten ist - das hilft bei der späteren Kommunikation.",
          sources: [
            { label: "BfDI – KI in Behörden. Datenschutz von Anfang an mitdenken (Dezember 2025)", url: "https://www.bfdi.bund.de/SharedDocs/Downloads/DE/Konsultationsverfahren/1_KI/Handreichung-KI-Behoerden.html" },
            { label: "KGSt – Stakeholder-Management in kommunalen Digitalisierungsvorhaben", url: "https://www.kgst.de" },
            { label: "NACo AI County Compass (Juli 2024, englischsprachig, übertragbar)", url: "https://www.naco.org" }
          ],
          required: false,
          options: [
            { value: "it_abteilung",           label: "IT-Abteilung / Systemverantwortliche" },
            { value: "datenschutzbeauftragter", label: "Datenschutzbeauftragte:r (DSB)" },
            { value: "fuehrungsebene",          label: "Führungsebene / Amtsleitung" },
            { value: "personalrat",             label: "Personal- / Betriebsrat" },
            { value: "kaemmerei",               label: "Kämmerei / Haushalt" },
            { value: "rechtsamt",               label: "Rechtsamt" },
            { value: "verwaltungsvorstand",     label: "Verwaltungsvorstand / Bürgermeister:in" },
            { value: "extern",                  label: "Externe Stellen (Aufsichtsbehörde, Kommunalaufsicht)" }
          ],
          output: { label: "Beteiligte Entscheidungsträger:innen", section: "kontext" }
        },

        {
          id: "m3_dsb_einbezogen",
          type: "select",
          label: "Ist der/die Datenschutzbeauftragte bereits informiert oder einbezogen?",
          required: false,
          options: [
            { value: "ja_aktiv",      label: "Ja — aktiv beteiligt" },
            { value: "ja_informiert", label: "Ja — informiert, aber noch nicht beratend tätig" },
            { value: "geplant",       label: "Noch nicht, aber geplant" },
            { value: "nein",          label: "Nein — noch nicht" },
            { value: "weiss_nicht",   label: "Weiß ich nicht" }
          ],
          output: { label: "DSB einbezogen", section: "kontext" }
        },

        {
          id: "m3_unterstützung",
          type: "select",
          label: "Wie stark ist die interne Unterstützung für deinen Use Case?",
          required: false,
          options: [
            { value: "stark",      label: "Stark — klarer Rückhalt und Ressourcen vorhanden" },
            { value: "moderat",    label: "Moderat — Interesse da, Verbindlichkeit fehlt noch" },
            { value: "gering",     label: "Gering — ich arbeite noch daran, Unterstützung zu gewinnen" },
            { value: "widerstand", label: "Es gibt aktiven Widerstand oder Skepsis" },
            { value: "unbekannt",  label: "Noch nicht aktiv gesucht" }
          ],
          output: { label: "Interner Rückhalt", section: "kontext" }
        },

        {
          id: "m3_ressourcen",
          type: "multiselect",
          label: "Welche Ressourcen stehen prinzipiell zur Verfügung?",
          required: false,
          options: [
            { value: "budget",            label: "Budget (Lizenz, Einführung, Betrieb)" },
            { value: "personal",          label: "Personalkapazität im eigenen Bereich" },
            { value: "it_support",        label: "IT-Support intern" },
            { value: "externe_beratung",  label: "Externe Beratung / Dienstleister" },
            { value: "foerdermittel",     label: "Fördermittel (z. B. Digitalisierungsprogramme)" },
            { value: "keine",             label: "Aktuell keine gesicherten Ressourcen" }
          ],
          output: { label: "Verfügbare Ressourcen", section: "kontext" }
        },

        {
          id: "m3_zeitrahmen",
          type: "select",
          label: "Welchen Zeithorizont hast du für die Umsetzung im Blick?",
          required: false,
          options: [
            { value: "kurzfristig",   label: "Kurzfristig — innerhalb der nächsten 3 Monate" },
            { value: "mittelfristig", label: "Mittelfristig — 3 bis 12 Monate" },
            { value: "langfristig",   label: "Langfristig — mehr als 12 Monate" },
            { value: "offen",         label: "Noch offen" }
          ],
          output: { label: "Zeithorizont", section: "kontext" }
        },

        {
          id: "m3_hindernisse",
          type: "textarea",
          label: "Welche organisatorischen Hindernisse siehst du aktuell?",
          hint: "z. B. fehlende Zuständigkeiten, Datenschutzbedenken, technische Altlasten, Budgetsperren",
          required: false,
          rows: 4,
          output: { label: "Bekannte Hindernisse", section: "kontext" }
        }

      ] // end fields m3
    }


    // MODULE 4–9 folgen


  ] // end modules

}; // end NAVIGATOR

// Export für Nutzung in wizard.js
// (falls als ES-Modul gewünscht: export default NAVIGATOR;)
if (typeof module !== "undefined") module.exports = NAVIGATOR;

// ═══════════════════════════════════════════════════════════
// MODUL 4 — KI-Eignung & Technologieauswahl
//
// Struktur:
//   4a  Eignungsprüfung     → setzt state.ki_eignung (ja / bedingt / nein)
//   4b  KI-Typ-Auswahl      → typspezifisch via showFor
//   4c  Datensouveränität   → setzt state.hosting_typ
//   4d  Lock-in-Reflexion   → Kompromisse bewusst eingehen
//
// Scoring für ki_eignung (Hinweis für wizard.js):
//   Summe >= 7  → ja
//   Summe 4–6   → bedingt
//   Summe <= 3  → nein
//   Bei nein: Modul zeigt m4_kein_einsatz, Module 5–7 werden übersprungen.
// ═══════════════════════════════════════════════════════════

NAVIGATOR.modules.push({
  id: "m4",
  title: "KI-Eignung & Technologieauswahl",
  skippable: true,
  progressLabel: "KI-Eignung",
  fields: [

    // ── 4a EIGNUNGSPRÜFUNG ──────────────────────────────────

    {
      id: "m4_intro",
      type: "info",
      content: [
        "Bevor du in die technische Auswahl gehst, lohnt sich ein kurzer Eignungscheck.",
        "Nicht jeder Prozess gewinnt durch KI — und eine bewusste Entscheidung dagegen ist genauso wertvoll wie eine dafür."
      ]
    },

    {
      id: "m4_häufigkeit",
      type: "select",
      label: "Wie häufig tritt die Aufgabe auf, die KI übernehmen soll?",
      hint: "Hohe Häufigkeit erhöht den Nutzen von Automatisierung.",
      required: false,
      scoring: { "taeglich_viel": 3, "woechentlich": 2, "monatlich": 1, "selten": 0 },
      options: [
        { value: "taeglich_viel", label: "Täglich, in großer Zahl" },
        { value: "woechentlich",  label: "Mehrmals pro Woche" },
        { value: "monatlich",     label: "Einige Male pro Monat" },
        { value: "selten",        label: "Selten oder sehr unregelmäßig" }
      ],
      output: { label: "Aufgabenhäufigkeit", section: "eignung" }
    },

    {
      id: "m4_variabilitaet",
      type: "select",
      label: "Wie variabel sind die Eingaben, die der Use Case verarbeiten soll?",
      hint: "Hohe Variabilität spricht eher für generative KI als für regelbasierte Systeme.",
      required: false,
      scoring: { "sehr_variabel": 3, "moderat": 2, "gleichfoermig": 1 },
      options: [
        { value: "sehr_variabel", label: "Sehr variabel — Sprache, Formulierungen, Kontexte sehr unterschiedlich" },
        { value: "moderat",       label: "Moderat variabel — Grundstruktur ähnlich, viele Ausprägungen" },
        { value: "gleichfoermig", label: "Weitgehend gleichförmig — klare Struktur, wenig Variation" }
      ],
      output: { label: "Variabilität der Eingaben", section: "eignung" }
    },

    {
      id: "m4_fehlertoleranz",
      type: "select",
      label: "Was sind die Konsequenzen, wenn die KI einen Fehler macht?",
      hint: "Niedrige Fehlertoleranz erfordert zwingend menschliche Kontrolle (Human-in-the-Loop).",
      required: false,
      scoring: { "gering": 3, "moderat": 2, "hoch": 1, "kritisch": 0 },
      options: [
        { value: "gering",    label: "Gering — Fehler leicht korrigierbar, kein großer Schaden" },
        { value: "moderat",   label: "Moderat — Fehler ärgerlich, aber behebbar" },
        { value: "hoch",      label: "Hoch — spürbare Folgen für Bürger:innen oder den Betrieb" },
        { value: "kritisch",  label: "Kritisch — rechtliche, finanzielle oder persönliche Schäden möglich" }
      ],
      output: { label: "Fehlertoleranz", section: "eignung" }
    },

    {
      id: "m4_rechtliche_bindung",
      type: "select",
      label: "Ist für diesen Prozess eine menschliche Entscheidung rechtlich vorgeschrieben?",
      hint: "Viele Verwaltungsakte erfordern per Gesetz einen menschlichen Bescheid.",
      required: false,
      scoring: { "nein": 2, "teilweise": 1, "ja_unterstuetzend": 1, "ja_abschliessend": 0 },
      options: [
        { value: "nein",                label: "Nein — kein Verwaltungsakt, keine gesetzliche Bindung" },
        { value: "teilweise",           label: "Teilweise — Prozess hat rechtlich gebundene und freie Anteile" },
        { value: "ja_unterstuetzend",   label: "Ja — KI unterstützt, Mensch entscheidet final (Human-in-the-Loop)" },
        { value: "ja_abschliessend",    label: "Ja — vollständig menschlicher Bescheid zwingend" }
      ],
      output: { label: "Rechtliche Bindung", section: "eignung" }
    },

    {
      id: "m4_nutzen_aufwand",
      type: "select",
      label: "Wie schätzt du das Verhältnis von Nutzen und Einführungsaufwand ein?",
      required: false,
      scoring: { "klar_positiv": 3, "wahrscheinlich_positiv": 2, "unklar": 1, "negativ": 0 },
      options: [
        { value: "klar_positiv",             label: "Klar positiv — Nutzen überwiegt deutlich" },
        { value: "wahrscheinlich_positiv",    label: "Wahrscheinlich positiv — muss noch geprüft werden" },
        { value: "unklar",                    label: "Unklar — ich kann das noch nicht einschätzen" },
        { value: "negativ",                   label: "Eher negativ — Aufwand erscheint größer als Nutzen" }
      ],
      output: { label: "Nutzen-Aufwand-Einschätzung", section: "eignung" }
    },

    {
      id: "m4_eignung_ergebnis",
      type: "info",
      dynamic: true,
      contentByScore: {
        ja:      "Die Eignungsprüfung ergibt ein <strong>positives Bild</strong>. Die Rahmenbedingungen sprechen grundsätzlich für den KI-Einsatz.",
        bedingt: "Die Eignungsprüfung ergibt ein <strong>gemischtes Bild</strong>. Ein KI-Einsatz ist möglich, aber mit Einschränkungen verbunden.",
        nein:    "Die Eignungsprüfung legt nahe, dass <strong>KI hier aktuell keinen klaren Mehrwert</strong> bietet. Das wird in deinem Steckbrief als begründete Entscheidung dokumentiert."
      }
    },

    {
      id: "m4_kein_einsatz",
      type: "textarea",
      label: "Was spricht gegen den KI-Einsatz — oder was müsste sich ändern?",
      hint: "Diese Begründung erscheint als dokumentierte Entscheidung in deinem Steckbrief.",
      required: false,
      showWhen: { stateKey: "ki_eignung", value: "nein" },
      rows: 4,
      output: { label: "Begründung: KI nicht empfohlen", section: "eignung" }
    },

    // ── 4b KI-TYP-AUSWAHL ──────────────────────────────────

    {
      id: "m4_kitype_intro",
      type: "info",
      showWhen: { stateKey: "ki_eignung", values: ["ja", "bedingt"] },
      content: ["Welche Art von KI-System ist für deinen Use Case geeignet? Die Optionen sind nach deinem Use-Case-Typ vorgefiltert."]
    },

    {
      id: "m4_ki_typ",
      type: "select",
      label: "Welcher KI-Ansatz passt am besten?",
      help: "Nicht jedes Vorhaben braucht ein Sprachmodell. Bei klar definierten Standardprozessen mit eindeutigen Regeln (zum Beispiel: 'Wenn Anliegen X, dann Weiterleitung an Y') reichen regelbasierte Systeme oft aus - sie sind günstiger, transparenter, datenschutzfreundlicher und stabiler im Betrieb. Generative KI ist sinnvoll, wenn freie Sprache verarbeitet werden muss, wenn Texte zusammengefasst oder umformuliert werden sollen, oder wenn Klassifikationen ohne klare Regeln nötig sind. Machine Learning im engeren Sinn passt bei datenbasierten Mustererkennungen, zum Beispiel bei der automatischen Einsortierung von Dokumenten anhand vieler Beispieldaten. Wenn du dir nicht sicher bist, wähle 'noch unklar' - das ist eine gültige Antwort und Teil der gemeinsamen Klärung in der Werkstatt.",
      sources: [
        { label: "BfDI – KI in Behörden. Datenschutz von Anfang an mitdenken (Dezember 2025)", url: "https://www.bfdi.bund.de/SharedDocs/Downloads/DE/Konsultationsverfahren/1_KI/Handreichung-KI-Behoerden.html" },
        { label: "KI-Guide BMDV – Umsetzungsfahrplan für KI-Systeme in der Verwaltung (November 2025)", url: "https://www.bmdv.bund.de" },
        { label: "Wiener KI-Kompass V2.0 – Einordnung von KI-Vorhaben", url: "https://digitales.wien.gv.at/projekt/ki-kompass/" }
      ],
      required: false,
      showWhen: { stateKey: "ki_eignung", values: ["ja", "bedingt"] },
      options: [
        { value: "generativ_llm",  label: "Generative KI / LLM",          description: "Flexible Sprachverarbeitung — Chatbots, Texterstellung, Q&A, Zusammenfassungen",                  showFor: ["chatbot","recherche","texterstellung","unklar"] },
        { value: "regelbasiert",   label: "Regelbasiertes System",         description: "Entscheidungsbäume für klar strukturierte, wiederkehrende Anfragen",                               showFor: ["chatbot","dokument","unklar"] },
        { value: "klassifikation", label: "Klassifikationssystem",         description: "Automatische Zuordnung zu Kategorien — Dokumentenklassifikation, Routing, OCR",                   showFor: ["dokument","crm_analyse","unklar"] },
        { value: "rag",            label: "RAG (Retrieval-Augmented Gen.)", description: "LLM kombiniert mit Wissensdatenbank — Recherche auf Basis eigener Dokumente",                     showFor: ["recherche","chatbot","unklar"] },
        { value: "analyse_ml",     label: "Datenanalyse / ML",             description: "Mustererkennung in strukturierten Daten — CRM-Auswertungen, Prognosen",                            showFor: ["crm_analyse","unklar"] },
        { value: "hybrid",         label: "Hybridansatz",                  description: "Kombination mehrerer Typen — z. B. regelbasierter Einstieg mit LLM-Fallback",                      showFor: ["chatbot","dokument","recherche","crm_analyse","texterstellung","unklar"] }
      ],
      output: { label: "KI-Typ", section: "technologie" }
    },

    {
      id: "m4_anwendung_konkret",
      type: "text",
      label: "Gibt es bereits ein konkretes Tool oder eine Plattform im Blick?",
      hint: "z. B. Microsoft Copilot, ChatGPT Enterprise, kommunale KI-Plattform, Open-Source-Lösung",
      required: false,
      showWhen: { stateKey: "ki_eignung", values: ["ja", "bedingt"] },
      output: { label: "Betrachtetes Tool / Plattform", section: "technologie" }
    },

    // ── 4c DATENSOUVERÄNITÄT ────────────────────────────────

    {
      id: "m4_souv_intro",
      type: "info",
      showWhen: { stateKey: "ki_eignung", values: ["ja", "bedingt"] },
      content: [
        "Datensouveränität bedeutet: Wer hat Zugriff auf deine Daten — und wer auf die KI-Infrastruktur?",
        "Diese Fragen sind für Kommunen besonders relevant, da personenbezogene und behördeninterne Daten verarbeitet werden."
      ]
    },

    {
      id: "m4_hosting_ki",
      type: "select",
      label: "Wo läuft die KI-Infrastruktur (Modell, Verarbeitung)?",
      required: false,
      showWhen: { stateKey: "ki_eignung", values: ["ja", "bedingt"] },
      branching: { setVar: "hosting_typ" },
      options: [
        { value: "cloud_eu",           label: "Cloud — europäischer Anbieter oder EU-Rechenzentrum" },
        { value: "cloud_us",           label: "Cloud — US-amerikanischer Anbieter (z. B. Azure, AWS, Google)" },
        { value: "on_premise",         label: "On-Premise — eigene Server der Kommune / des Rechenzentrums" },
        { value: "kommunal_plattform", label: "Kommunale Plattform / Landesrechenzentrum" },
        { value: "unklar",             label: "Noch nicht entschieden" }
      ],
      output: { label: "Hosting der KI-Infrastruktur", section: "technologie" }
    },

    {
      id: "m4_hosting_daten",
      type: "select",
      label: "Wo werden die verarbeiteten Daten gespeichert?",
      hint: "Daten, die an externe Modelle gesendet werden, verlassen möglicherweise den EU-Rechtsraum.",
      required: false,
      showWhen: { stateKey: "ki_eignung", values: ["ja", "bedingt"] },
      options: [
        { value: "lokal",    label: "Lokal / On-Premise — Daten verlassen die Verwaltung nicht" },
        { value: "cloud_eu", label: "Cloud EU — Daten bleiben im europäischen Rechtsraum" },
        { value: "cloud_us", label: "Cloud US — Daten werden an US-Dienste übermittelt" },
        { value: "geteilt",  label: "Gemischt — je nach Prozessschritt unterschiedlich" },
        { value: "unklar",   label: "Noch unklar" }
      ],
      output: { label: "Speicherort der Daten", section: "technologie" }
    },

    {
      id: "m4_anbieter_bindung",
      type: "select",
      label: "Wie ist die Abhängigkeit vom gewählten Anbieter einzuschätzen?",
      hint: "Proprietäre Systeme binden Daten, Schnittstellen und Prozesse enger an einen Anbieter.",
      required: false,
      showWhen: { stateKey: "ki_eignung", values: ["ja", "bedingt"] },
      options: [
        { value: "open_source",        label: "Open Source — kein Vendor-Lock-in, volle Kontrolle" },
        { value: "kommunal_standard",  label: "Kommunaler Standard / Landesplattform — abgestimmte Abhängigkeit" },
        { value: "proprietaer_eu",     label: "Proprietär, EU-Anbieter — Abhängigkeit im EU-Rechtsrahmen" },
        { value: "proprietaer_us",     label: "Proprietär, US-Anbieter — erhöhte Abhängigkeit und Rechtsrisiken" },
        { value: "unklar",             label: "Noch nicht bewertet" }
      ],
      output: { label: "Anbieterbindung", section: "technologie" }
    },

    // ── 4d LOCK-IN-REFLEXION ────────────────────────────────

    {
      id: "m4_lockin_intro",
      type: "info",
      showWhen: { stateKey: "ki_eignung", values: ["ja", "bedingt"] },
      content: [
        "Jede Technologieentscheidung bringt Kompromisse mit sich. Es geht nicht darum, Lock-in zu vermeiden — sondern ihn bewusst einzugehen.",
        "Wer weiß, welche Abhängigkeiten er akzeptiert und warum, kann besser verhandeln, wechseln und dokumentieren."
      ]
    },

    {
      id: "m4_lockin_risiken",
      type: "multiselect",
      label: "Welche Lock-in-Risiken siehst du?",
      hint: "Mehrfachauswahl — ehrliche Einschätzung, kein Ausschlusskriterium",
      required: false,
      showWhen: { stateKey: "ki_eignung", values: ["ja", "bedingt"] },
      options: [
        { value: "daten",          label: "Daten-Lock-in — proprietäre Formate oder Datenhaltung beim Anbieter" },
        { value: "schnittstellen", label: "Schnittstellen-Lock-in — tiefe Integration in bestehende Systeme" },
        { value: "prozesse",       label: "Prozess-Lock-in — interne Abläufe werden auf das Tool ausgerichtet" },
        { value: "kosten",         label: "Kosten-Lock-in — Wechsel wäre teuer oder aufwändig" },
        { value: "kompetenz",      label: "Kompetenz-Lock-in — spezifisches Wissen nur für diesen Anbieter" },
        { value: "keiner",         label: "Kein nennenswertes Lock-in erkennbar" }
      ],
      output: { label: "Identifizierte Lock-in-Risiken", section: "technologie" }
    },

    {
      id: "m4_lockin_begruendung",
      type: "textarea",
      label: "Warum gehst du diese Kompromisse ein — und unter welchen Bedingungen?",
      hint: 'z.B.: Wir akzeptieren Cloud-Abhängigkeit, weil kommunale Plattform erst später verfügbar - jährliche Prüfung des Wechsels geplant.',
      required: false,
      showWhen: { stateKey: "ki_eignung", values: ["ja", "bedingt"] },
      rows: 4,
      output: { label: "Begründung der Kompromisse", section: "technologie" }
    }

  ] // end fields m4
});


// MODUL 5 Datenschutz und Rechtliche Rahmenbedingungen
// Quellen: BfDI-Handreichung Dez.2025 / DSGVO / EU AI Act / WIK-Studie Dez.2024

NAVIGATOR.modules.push({
  id: "m5",
  title: "Datenschutz und Rechtliche Rahmenbedingungen",
  skippable: true,
  progressLabel: "Datenschutz",
  fields: [

    { id:"m5_intro", type:"info", content:[
      "Datenschutz ist keine nachgelagerte Prüfung - er muss von Anfang an in die Konzeption einfließen.",
      "Die folgenden Fragen orientieren sich an der BfDI-Handreichung KI in Behörden (Dezember 2025) sowie an DSGVO und EU-KI-Gesetz."
    ]},

    { id:"m5_s_a", type:"info", content:["A - Personenbezogene Daten"]},

    { id:"m5_pb_daten", type:"select",
      label:"Verarbeitet dein Use Case personenbezogene Daten?",
      hint:"Personenbezogen = alle Daten, die einer identifizierbaren Person zugeordnet werden können.",
      required:false,
      source:{ label:"DSGVO Art. 4 Nr. 1; BfDI-Handreichung Kap. 2", text:"Auch indirekt identifizierbare Daten (Pseudonyme, Merkmalskombinationen) gelten als personenbezogen." },
      options:[
        { value:"ja_direkt",   label:"Ja - direkt personenbezogen (Name, Adresse, Fallnummer)" },
        { value:"ja_indirekt", label:"Ja - indirekt personenbezogen (Pseudonyme, Kombinationen)" },
        { value:"nein",        label:"Nein - ausschliesslich anonyme oder aggregierte Daten" },
        { value:"unklar",      label:"Noch nicht geprüft" }
      ],
      output:{ label:"Personenbezogene Daten verarbeitet", section:"datenschutz" }
    },

    { id:"m5_datenkategorien", type:"multiselect",
      label:"Welche Datenkategorien werden verarbeitet?",
      hint:"Besondere Kategorien (Art. 9 DSGVO) erfordern erhöhten Schutz und in der Regel eine DSFA.",
      required:false,
      showWhen:{ field:"m5_pb_daten", values:["ja_direkt","ja_indirekt"] },
      source:{ label:"DSGVO Art. 9; BfDI-Handreichung Kap. 3.1", text:"Besondere Kategorien duerfen nur in eng definierten Ausnahmen verarbeitet werden." },
      options:[
        { value:"kontaktdaten",   label:"Kontaktdaten (Name, Adresse, E-Mail)" },
        { value:"fallbezogen",    label:"Fallbezogene Verwaltungsdaten (Aktenzeichen, Vorgang)" },
        { value:"beschaeftigte",  label:"Beschäftigtendaten" },
        { value:"gesundheit",     label:"Gesundheitsdaten [Art. 9 DSGVO - besondere Kategorie]" },
        { value:"sozial",         label:"Sozialdaten (SGB)" },
        { value:"finanzen",       label:"Finanz- und Einkommensdaten" },
        { value:"biometrie",      label:"Biometrische Daten [Art. 9 DSGVO]" },
        { value:"minderjaehrige", label:"Daten Minderjähriger" }
      ],
      output:{ label:"Verarbeitete Datenkategorien", section:"datenschutz" }
    },

    { id:"m5_rechtsgrundlage", type:"select",
      label:"Auf welche Rechtsgrundlage stützt sich die Datenverarbeitung?",
      required:false,
      showWhen:{ field:"m5_pb_daten", values:["ja_direkt","ja_indirekt"] },
      source:{ label:"DSGVO Art. 6; BfDI-Handreichung Kap. 2.2", text:"Für Behörden kommt meist Art. 6 Abs. 1 lit. e (öffentliches Interesse) in Betracht. Die BfDI empfiehlt, die konkrete Aufgabennorm zu benennen." },
      options:[
        { value:"gesetzlich",    label:"Gesetzliche Aufgabe / öffentliches Interesse (Art. 6 Abs. 1 lit. e) - häufigste Grundlage für Behörden" },
        { value:"einwilligung",  label:"Einwilligung (Art. 6 Abs. 1 lit. a)" },
        { value:"vertrag",       label:"Vertragserfüllung (Art. 6 Abs. 1 lit. b)" },
        { value:"rechtspflicht", label:"Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c)" },
        { value:"unklar",        label:"Noch nicht geklärt" }
      ],
      output:{ label:"Rechtsgrundlage", section:"datenschutz" }
    },

    { id:"m5_s_b", type:"info", content:["B - Datenschutz-Folgenabschätzung (DSFA)"]},

    { id:"m5_dsfa_geprüft", type:"select",
      label:"Wurde geprüft, ob eine Datenschutz-Folgenabschätzung (DSFA) erforderlich ist?",
      required:false,
      source:{ label:"DSGVO Art. 35; BfDI-Handreichung Kap. 4", text:"Die BfDI empfiehlt: Bei KI-Systemen, die systematisch personenbezogene Daten verarbeiten, ist eine DSFA in der Regel erforderlich. Zwei oder mehr DSFA-Auslöserfaktoren machen sie zwingend." },
      options:[
        { value:"ja_erforderlich", label:"Ja - DSFA ist erforderlich und läuft oder ist abgeschlossen" },
        { value:"ja_nicht_erf",    label:"Ja geprüft - DSFA nicht erforderlich (mit Begründung)" },
        { value:"noch_nicht",      label:"Noch nicht geprüft" },
        { value:"unbekannt",       label:"Ich weiss nicht, was eine DSFA ist" }
      ],
      output:{ label:"DSFA geprüft", section:"datenschutz" }
    },

    { id:"m5_dsfa_kriterien", type:"multiselect",
      label:"Welche DSFA-Auslöserfaktoren treffen auf deinen Use Case zu?",
      hint:"Zwei oder mehr Faktoren machen eine DSFA zwingend (BfDI / DSK-Empfehlung).",
      required:false,
      source:{ label:"DSK-Blacklist; BfDI-Handreichung Kap. 4.2", text:"Die Datenschutzkonferenz (DSK) hat Listen veröffentlicht, welche Verarbeitungsarten eine DSFA zwingend erfordern. KI-gestützte Entscheidungen mit Rechtswirkung sind regelmäßig enthalten." },
      options:[
        { value:"systematisch",     label:"Systematische Verarbeitung auf grosser Skala" },
        { value:"profiling",        label:"Profiling oder automatisierte Entscheidungen mit Rechtswirkung" },
        { value:"besondere_kat",    label:"Besondere Kategorien (Art. 9 DSGVO)" },
        { value:"schutzbeduerfte",  label:"Verarbeitung schutzbedürftiger Personen (Minderjährige, Sozialhilfe)" },
        { value:"neue_technologie", label:"Neue Technologie mit noch unbekannten Risiken" },
        { value:"keiner",           label:"Keiner der genannten Faktoren trifft zu" }
      ],
      output:{ label:"DSFA-Auslöserfaktoren", section:"datenschutz" }
    },

    { id:"m5_s_c", type:"info", content:["C - Auftragsverarbeitung und Datentransfer"]},

    { id:"m5_avv", type:"select",
      label:"Gibt es einen Auftragsverarbeitungsvertrag (AVV) mit dem KI-Anbieter?",
      required:false,
      source:{ label:"DSGVO Art. 28; BfDI-Handreichung Kap. 5.1", text:"Sobald ein externer Anbieter personenbezogene Daten im Auftrag verarbeitet, ist ein AVV zwingend." },
      options:[
        { value:"ja",          label:"Ja - AVV liegt vor oder ist in Vorbereitung" },
        { value:"nein_extern", label:"Nein - trotz externer Verarbeitung kein AVV vorhanden [kritisch]" },
        { value:"nicht_erf",   label:"Nicht erforderlich - rein interne Verarbeitung" },
        { value:"unklar",      label:"Noch nicht geprüft" }
      ],
      output:{ label:"Auftragsverarbeitungsvertrag (AVV)", section:"datenschutz" }
    },

    { id:"m5_drittland", type:"select",
      label:"Werden Daten in ein Drittland (außerhalb EU/EWR) übertragen?",
      hint:"Relevant auch bei US-Anbietern mit EU-Rechenzentrum (CLOUD Act).",
      required:false,
      showWhen:{ stateKey:"hosting_typ", values:["cloud_extern","cloud_us"] },
      source:{ label:"DSGVO Kap. V; Schrems-II EuGH 2020; BfDI-Handreichung Kap. 5.2", text:"Nach dem Schrems-II-Urteil reichen EU-Standardvertragsklauseln allein nicht aus, wenn US-Behörden Zugriff haben könnten. Die BfDI empfiehlt einzelfallbezogene Transfer Impact Assessments." },
      options:[
        { value:"nein",            label:"Nein - Daten bleiben im EU/EWR-Raum" },
        { value:"ja_scc",          label:"Ja - mit EU-Standardvertragsklauseln (SCC)" },
        { value:"ja_ungeklärt",   label:"Ja - Absicherung noch nicht geklärt [kritisch]" },
        { value:"möglicherweise", label:"Möglicherweise - US-Anbieter mit EU-Rechenzentrum" },
        { value:"unklar",          label:"Noch nicht untersucht" }
      ],
      output:{ label:"Drittlandsübermittlung", section:"datenschutz" }
    },

    { id:"m5_s_d", type:"info", content:["D - EU-KI-Gesetz (AI Act)"]},

    { id:"m5_aiact_risikoklasse", type:"select",
      label:"Fällt dein Use Case unter die Hochrisiko-Kategorie des EU-KI-Gesetzes?",
      hint:"Hochrisiko in der öffentlichen Verwaltung: z.B. Systeme zur Bewertung von Personen, Bearbeitung von Sozialleistungen, Bildung.",
      required:false,
      source:{ label:"EU AI Act Art. 6, Anhang III; BfDI-Handreichung Kap. 6", text:"Hochrisiko-Systeme unterliegen strengen Anforderungen: Konformitätsbewertung, Registrierung in der EU-Datenbank, Transparenz, menschliche Aufsicht. Gilt für Anbieter und Betreiber gleichermaßen." },
      options:[
        { value:"ja_hochrisiko", label:"Ja - System fällt wahrscheinlich unter Anhang III (Hochrisiko)" },
        { value:"nein",          label:"Nein - kein Hochrisiko-System" },
        { value:"begrenzt",      label:"Begrenztes Risiko (z.B. Chatbot mit Kennzeichnungspflicht)" },
        { value:"unklar",        label:"Noch nicht eingeschätzt" }
      ],
      output:{ label:"AI Act Risikoklasse", section:"datenschutz" }
    },

    { id:"m5_aiact_verbote", type:"select",
      label:"Wurde geprüft, ob der Use Case unter verbotene KI-Praktiken fällt?",
      hint:"Verboten u.a.: Social Scoring durch Behörden, biometrische Echtzeitüberwachung im öffentlichen Raum.",
      required:false,
      source:{ label:"EU AI Act Art. 5; BfDI-Handreichung Kap. 6.1", text:"Art. 5 AI Act enthält absolute Verbote - auch für Behörden, ohne Ausnahmemöglichkeit. Die BfDI empfiehlt, diese Prüfung frühzeitig und dokumentiert durchzuführen." },
      options:[
        { value:"geprüft_nein", label:"Ja geprüft - kein Verstoss gegen Art. 5 AI Act" },
        { value:"noch_nicht",    label:"Noch nicht geprüft" },
        { value:"unklar",        label:"Ich bin mir nicht sicher" }
      ],
      output:{ label:"AI Act Verbote geprüft", section:"datenschutz" }
    },

    { id:"m5_s_e", type:"info", content:["E - Transparenz und menschliche Kontrolle"]},

    { id:"m5_automatisierung", type:"select",
      label:"Trifft das System automatisierte Entscheidungen mit Wirkung gegenüber Personen?",
      required:false,
      source:{ label:"DSGVO Art. 22; Paragr. 35a VwVfG; BfDI-Handreichung Kap. 3.3", text:"Art. 22 DSGVO schützt vor vollautomatisierten Entscheidungen mit Rechtswirkung. Paragr. 35a VwVfG erlaubt automatisierte Verwaltungsakte nur in eng definierten Fällen." },
      options:[
        { value:"nein_unterstuetzend", label:"Nein - KI unterstützt, Mensch entscheidet immer final" },
        { value:"teilautomatisiert",   label:"Teilautomatisiert - KI-Vorschlag mit menschlicher Prüfpflicht" },
        { value:"vollautomatisiert",   label:"Vollautomatisiert - keine manuelle Prüfung vorgesehen [kritisch]" },
        { value:"unklar",              label:"Noch nicht festgelegt" }
      ],
      output:{ label:"Automatisierungsgrad", section:"datenschutz" }
    },

    { id:"m5_human_loop", type:"select",
      label:"Wie ist die menschliche Kontrolle (Human-in-the-Loop) ausgestaltet?",
      required:false,
      source:{ label:"EU AI Act Art. 14; BfDI-Handreichung Kap. 3.4", text:"Der AI Act verlangt für Hochrisiko-Systeme wirksame - nicht nur formale - menschliche Aufsicht. Mitarbeitende müssen KI-Ausgaben tatsächlich verstehen und bewerten können." },
      options:[
        { value:"vollstaendig",  label:"Vollständig - jedes Ergebnis wird geprüft und freigegeben" },
        { value:"stichproben",   label:"Stichprobenartig - regelmäßige Qualitätskontrolle" },
        { value:"ausnahmen",     label:"Bei Grenzfällen - nur bei Unsicherheit" },
        { value:"nicht_geplant", label:"Nicht vorgesehen [kritisch]" },
        { value:"noch_unklar",   label:"Noch nicht definiert" }
      ],
      output:{ label:"Human-in-the-Loop", section:"datenschutz" }
    },

    { id:"m5_transparenz", type:"select",
      label:"Werden Betroffene informiert, dass KI eingesetzt wird?",
      required:false,
      source:{ label:"DSGVO Art. 13/14; EU AI Act Art. 50; BfDI-Handreichung Kap. 3.5", text:"Art. 50 AI Act verpflichtet zur Kennzeichnung bei KI-Interaktion (z.B. Chatbots). Die BfDI empfiehlt proaktive verständliche Kommunikation." },
      options:[
        { value:"ja_aktiv",       label:"Ja - aktiv und verständlich kommuniziert" },
        { value:"ja_passiv",      label:"Ja - in Datenschutzhinweisen erwähnt" },
        { value:"geplant",        label:"Noch nicht, aber geplant" },
        { value:"nein",           label:"Nein [kritisch]" },
        { value:"nicht_relevant", label:"Nicht relevant - kein direkter Bürgerinnen-Kontakt" }
      ],
      output:{ label:"Transparenz gegenüber Betroffenen", section:"datenschutz" }
    },

    { id:"m5_s_f", type:"info", content:["F - Datenschutzbeauftragte und Dokumentation"]},

    { id:"m5_dsb_konsultiert", type:"select",
      label:"Wurde der/die behördliche Datenschutzbeauftragte (bDSB) konsultiert?",
      required:false,
      source:{ label:"DSGVO Art. 38/39; BfDI-Handreichung Kap. 7", text:"Die BfDI empfiehlt: bDSB frühzeitig einbeziehen - nicht erst bei Inbetriebnahme. Der bDSB hat Beratungsfunktion, keine Genehmigungsfunktion." },
      options:[
        { value:"ja_aktiv",      label:"Ja - aktiv eingebunden, laufende Beratung" },
        { value:"ja_informiert", label:"Ja - informiert, aber noch keine aktive Beratung" },
        { value:"geplant",       label:"Geplant für nächsten Schritt" },
        { value:"nein",          label:"Noch nicht eingebunden" }
      ],
      output:{ label:"bDSB konsultiert", section:"datenschutz" }
    },

    { id:"m5_vvt", type:"select",
      label:"Wurde der Use Case im Verzeichnis von Verarbeitungstätigkeiten (VVT) erfasst?",
      required:false,
      source:{ label:"DSGVO Art. 30; BfDI-Handreichung Kap. 7.1", text:"KI-Einsatz stellt in der Regel eine neue Verarbeitungstätigkeit dar und muss im VVT eingetragen werden." },
      options:[
        { value:"ja",      label:"Ja - bereits eingetragen oder in Bearbeitung" },
        { value:"geplant", label:"Noch nicht, aber geplant" },
        { value:"nein",    label:"Nein" },
        { value:"unklar",  label:"Ich kenne das VVT nicht" }
      ],
      output:{ label:"VVT-Eintrag", section:"datenschutz" }
    },

    { id:"m5_offene_fragen", type:"textarea",
      label:"Welche datenschutzrechtlichen Fragen sind noch offen?",
      hint:"z.B. Rechtsgrundlage unklar, DSFA aussteht, Drittlandtransfer ungeklärt",
      help:"Eine offene Frage ist kein Mangel, sondern ein Arbeitsstand. Eine ehrliche Liste offener Fragen ist besser als ein scheinbar vollständiger Plan, in dem Lücken überspielt werden. Typische Felder, in denen offene Fragen vorkommen: Schnittstellen zu Bestandssystemen, Hosting und Betriebsmodell, datenschutzrechtliche Einordnung, Anbieterauswahl, Finanzierungslogik, Personalentwicklung. Eine gute offene Frage ist nicht 'Wir wissen noch nicht alles', sondern präzise formuliert mit klarem Adressaten: 'Wir müssen klären, ob System X eine API hat - Ansprechpartner ist Y.'",
      required:false, rows:4,
      output:{ label:"Offene Datenschutzfragen", section:"datenschutz" }
    }

  ]
});


// MODUL 6 — Prompting-Reflexion
// Quellen: Wiener KI-Kompass V2.0 (April 2024) / NACo AI County Compass (Juli 2024)
// Struktur:
//   6a  Grundverstaendnis & Erfahrung
//   6b  Prompt-Qualität (typuebergreifend)
//   6c  Typspezifische Prompting-Praxis (showFor: use_case_typ)
//   6d  Qualitätssicherung & Grenzen
//   6e  Organisationale Dimension

NAVIGATOR.modules.push({
  id: "m6",
  title: "Prompting-Reflexion",
  skippable: true,
  progressLabel: "Prompting",
  fields: [

    { id:"m6_intro", type:"info", content:[
      "Wie du mit KI kommunizierst, entscheidet maßgeblich über die Qualität der Ergebnisse.",
      "Dieses Modul hilft dir einzuschätzen, wie bewusst und systematisch du bereits mit Prompts arbeitest."
    ]},

    // 6a — Grundverstaendnis
    { id:"m6_s_a", type:"info", content:["<strong>A — Grundverständnis &amp; Erfahrung</strong>"]},

    { id:"m6_erfahrung_prompting", type:"select",
      label:"Wie würden du deine bisherige Erfahrung mit Prompting beschreiben?",
      hint:"Prompting = die Kunst, einer KI präzise Anweisungen zu geben.",
      required:false,
      options:[
        { value:"keine",        label:"Keine - ich kenne den Begriff kaum" },
        { value:"intuitiv",     label:"Intuitiv - ich probiere aus, ohne System" },
        { value:"bewusst",      label:"Bewusst - ich achte auf Formulierung und Kontext" },
        { value:"systematisch", label:"Systematisch - ich nutze feste Strukturen und teste gezielt" }
      ],
      output:{ label:"Prompting-Erfahrung", section:"prompting" }
    },

    { id:"m6_hauptanwendung", type:"select",
      label:"Wie setzt du Prompting in deinem Use Case hauptsächlich ein?",
      required:false,
      options:[
        { value:"einmalig",       label:"Einmalige Anweisung - ein Prompt pro Aufgabe" },
        { value:"gespraech",      label:"Im Dialog - ich verfeinere durch Rückfragen" },
        { value:"templates",      label:"Mit Vorlagen - ich nutze erprobte Prompt-Strukturen" },
        { value:"system_prompt",  label:"Über System-Prompts - grundlegende Verhaltensvorgaben für das Modell" },
        { value:"noch_unklar",    label:"Noch nicht entschieden" }
      ],
      output:{ label:"Prompting-Hauptanwendung", section:"prompting" }
    },

    // 6b — Prompt-Qualität
    { id:"m6_s_b", type:"info", content:["<strong>B — Prompt-Qualität</strong>"]},

    { id:"m6_kontext", type:"select",
      label:"Gibst du der KI in deinen Prompts ausreichend Kontext?",
      hint:"Kontext umfasst: Aufgabe, Zielgruppe, Rolle der KI, Ausgabeformat, Einschränkungen.",
      required:false,
      source:{ label:"Wiener KI-Kompass V2.0, Kap. 4.2", text:"Der Wiener KI-Kompass empfiehlt, Prompts mit klarer Rollenanweisung, Aufgabenbeschreibung und Formatvorgabe zu strukturieren - insbesondere für den behördlichen Einsatz." },
      options:[
        { value:"kaum",          label:"Kaum - ich formuliere kurze Anweisungen ohne Erklärung" },
        { value:"teilweise",     label:"Teilweise - ich gebe manchmal Hintergrundinformationen" },
        { value:"meistens",      label:"Meistens - Kontext ist für mich Standard" },
        { value:"systematisch",  label:"Systematisch - ich nutze eine feste Prompt-Struktur mit allen Elementen" }
      ],
      output:{ label:"Kontextqualität in Prompts", section:"prompting" }
    },

    { id:"m6_rolle_vorgabe", type:"select",
      label:"Weist du der KI eine Rolle oder Persona zu?",
      hint:"Beispiel: 'Du bist ein erfahrener Verwaltungsjurist...' oder 'Antworte als interner IT-Helpdesk...'",
      required:false,
      source:{ label:"Wiener KI-Kompass V2.0, Kap. 4.3", text:"Rollenvorgaben verbessern die Relevanz und den Stil von KI-Ausgaben erheblich. Für behördliche Anwendungen empfiehlt sich eine Rolle, die Fachkompetenz und Verwaltungskontext vereint." },
      options:[
        { value:"nie",       label:"Nein - ich weise keine Rolle zu" },
        { value:"manchmal",  label:"Manchmal - bei bestimmten Aufgaben" },
        { value:"immer",     label:"Ja - Rollenvorgabe gehört zu meinem Standard" }
      ],
      output:{ label:"Rollenvorgabe in Prompts", section:"prompting" }
    },

    { id:"m6_ausgabeformat", type:"select",
      label:"Gibst du das gewünschte Ausgabeformat vor?",
      hint:"z.B. 'Antworte in 3 Stichpunkten', 'Erstelle eine Tabelle', 'Schreibe in Verwaltungssprache'",
      required:false,
      options:[
        { value:"nie",       label:"Nein - ich nehme, was kommt" },
        { value:"manchmal",  label:"Manchmal - bei komplexeren Aufgaben" },
        { value:"immer",     label:"Ja - Format-Vorgabe ist Standard für mich" }
      ],
      output:{ label:"Ausgabeformat-Vorgabe", section:"prompting" }
    },

    { id:"m6_iteration", type:"select",
      label:"Wie gehst du vor, wenn das erste Ergebnis nicht passt?",
      required:false,
      source:{ label:"NACo AI County Compass, S. 18", text:"Der NACo-Leitfaden betont: Iteratives Prompting ist eine Kernkompetenz - gute Ergebnisse entstehen selten beim ersten Versuch. Mitarbeitende sollten gezielt Rückfragen und Korrekturen trainieren." },
      options:[
        { value:"abbrechen",   label:"Ich akzeptiere das Ergebnis oder breche ab" },
        { value:"neustarten",  label:"Ich starte neu mit einem anderen Prompt" },
        { value:"verfeinern",  label:"Ich verfeinere den Prompt gezielt - Schritt für Schritt" },
        { value:"erklären",   label:"Ich erkläre der KI, was fehlt, und bitte um Überarbeitung" }
      ],
      output:{ label:"Umgang mit unpassenden Ergebnissen", section:"prompting" }
    },

    // 6c — Typspezifisch
    { id:"m6_s_c", type:"info", content:["<strong>C — Typspezifische Prompting-Praxis</strong>"]},

    { id:"m6_chatbot_systemprompt", type:"select",
      label:"Nutzt du einen System-Prompt, um das Verhalten des Chatbots grundlegend zu steuern?",
      hint:"Der System-Prompt legt Persönlichkeit, Grenzen und Aufgabe des Bots fest - er ist unsichtbar für Nutzende.",
      required:false,
      showFor:{ var:"use_case_typ", values:["chatbot"] },
      source:{ label:"Wiener KI-Kompass V2.0, Kap. 5.1", text:"Für behördliche Chatbots empfiehlt der Wiener KI-Kompass einen sorgfältig dokumentierten System-Prompt, der Datenschutzgrenzen, Eskalationspfade und den behördlichen Kontext definiert." },
      options:[
        { value:"ja_ausfuehrlich",  label:"Ja - ausführlicher, dokumentierter System-Prompt" },
        { value:"ja_einfach",       label:"Ja - einfache Grundanweisung" },
        { value:"nein_geplant",     label:"Noch nicht, aber geplant" },
        { value:"nein",             label:"Nein" }
      ],
      output:{ label:"System-Prompt vorhanden (Chatbot)", section:"prompting" }
    },

    { id:"m6_chatbot_eskalation", type:"select",
      label:"Ist definiert, wann und wie der Chatbot an einen Menschen übergibt?",
      hint:"Eskalationspfade sind entscheidend für Nutzerzufriedenheit und rechtliche Absicherung.",
      required:false,
      showFor:{ var:"use_case_typ", values:["chatbot"] },
      options:[
        { value:"ja_klar",    label:"Ja - klare Regeln für Eskalation definiert" },
        { value:"teilweise",  label:"Teilweise - einige Fälle geregelt" },
        { value:"nein",       label:"Noch nicht definiert" }
      ],
      output:{ label:"Eskalationspfad (Chatbot)", section:"prompting" }
    },

    { id:"m6_dokument_extraktion", type:"textarea",
      label:"Wie formulierst du Extraktions- oder Klassifikationsanweisungen für Dokumente?",
      hint:"z.B. 'Extrahiere Datum, Aktenzeichen und Betreff aus diesem Schreiben. Antworte nur mit diesen drei Feldern als JSON.'",
      required:false,
      showFor:{ var:"use_case_typ", values:["dokument"] },
      rows:3,
      output:{ label:"Beispiel Extraktions-Prompt (Dokument)", section:"prompting" }
    },

    { id:"m6_recherche_quellenkritik", type:"select",
      label:"Wie gehst du mit der Quellenbehauptung von KI-Rechercheergebnissen um?",
      hint:"KI kann Quellen erfinden (Halluzinationen) - besonders bei unbekannten Dokumenten.",
      required:false,
      showFor:{ var:"use_case_typ", values:["recherche"] },
      source:{ label:"NACo AI County Compass, S. 22", text:"Der NACo-Leitfaden warnt ausdrücklich vor unkritischer Übernahme von KI-Rechercheergebnissen. Factchecking und Quellenverifikation müssen in den Prozess eingebaut sein." },
      options:[
        { value:"verifiziere_immer",   label:"Ich verifiziere Quellen immer manuell" },
        { value:"verifiziere_wichtig", label:"Ich verifiziere bei wichtigen Entscheidungen" },
        { value:"vertraue_meistens",   label:"Ich vertraue den Ergebnissen meistens" },
        { value:"noch_kein_prozess",   label:"Kein definierter Prozess bisher" }
      ],
      output:{ label:"Quellenkritik bei Recherche", section:"prompting" }
    },

    { id:"m6_text_tonalitaet", type:"select",
      label:"Wie steuerst du Tonalität und Stil bei KI-Texten für die Verwaltung?",
      hint:"Verwaltungssprache hat spezifische Anforderungen: Sachlichkeit, Rechtskonformität, Barrierefreiheit.",
      required:false,
      showFor:{ var:"use_case_typ", values:["texterstellung"] },
      options:[
        { value:"explizit",   label:"Explizit im Prompt - Stil und Zielgruppe immer angegeben" },
        { value:"nachkorrektur", label:"Per Nachkorrektur - KI erstellt, Mensch passt an" },
        { value:"noch_offen", label:"Noch nicht systematisch gelöst" }
      ],
      output:{ label:"Stil-Steuerung bei Texterstellung", section:"prompting" }
    },

    { id:"m6_crm_datenformat", type:"select",
      label:"In welchem Format lässt du KI-Auswertungen ausgeben?",
      hint:"Strukturierte Formate (JSON, Tabelle, CSV) erleichtern die Weiterverwertung.",
      required:false,
      showFor:{ var:"use_case_typ", values:["crm_analyse"] },
      options:[
        { value:"strukturiert",  label:"Strukturiert - Tabelle, JSON oder CSV vorgegeben" },
        { value:"freitext",      label:"Freitext - ich verarbeite den Text manuell weiter" },
        { value:"gemischt",      label:"Gemischt - je nach Aufgabe" }
      ],
      output:{ label:"Ausgabeformat CRM/Analyse", section:"prompting" }
    },

    // 6d — Qualitätssicherung & Grenzen
    { id:"m6_s_d", type:"info", content:["<strong>D — Qualitätssicherung &amp; Grenzen</strong>"]},

    { id:"m6_halluzinationen", type:"select",
      label:"Weisst du, was KI-Halluzinationen sind - und wie du sie erkennst?",
      required:false,
      source:{ label:"NACo AI County Compass, S. 14; Wiener KI-Kompass V2.0, Kap. 3.4", text:"Beide Leitfäden betonen: Halluzinationen (plausibelklingende, aber falsche Ausgaben) sind ein Kernrisiko generativer KI. Mitarbeitende müssen gezielt geschult werden, Ausgaben zu hinterfragen." },
      options:[
        { value:"ja_erkenne",    label:"Ja - ich kenne das Phänomen und erkenne es oft" },
        { value:"ja_weiss",      label:"Ich kenne den Begriff, bin aber unsicher beim Erkennen" },
        { value:"kaum",          label:"Kaum - das ist ein neues Thema für mich" }
      ],
      output:{ label:"Halluzinationen bekannt", section:"prompting" }
    },

    { id:"m6_daten_in_prompts", type:"select",
      label:"Wie gehst du mit personenbezogenen oder behordseninternen Daten in Prompts um?",
      hint:"Daten, die in Prompts eingegeben werden, können beim Anbieter gespeichert oder für Training genutzt werden.",
      required:false,
      source:{ label:"BfDI-Handreichung Kap. 5.3; Wiener KI-Kompass V2.0, Kap. 6.1", text:"BfDI und Wiener KI-Kompass warnen ausdrücklich vor dem unkritischen Einsatz personenbezogener Daten in Prompts. Anonymisierung oder Pseudonymisierung vor der Eingabe wird empfohlen." },
      options:[
        { value:"anonymisiere",   label:"Ich anonymisiere oder pseudonymisiere Daten vor der Eingabe" },
        { value:"keine_pb",       label:"Mein Use Case enthält keine personenbezogenen Daten" },
        { value:"bewusst_abwaege", label:"Ich wäge im Einzelfall ab" },
        { value:"noch_kein_prozess", label:"Kein etablierter Prozess bisher" }
      ],
      output:{ label:"Umgang mit sensiblen Daten in Prompts", section:"prompting" }
    },

    { id:"m6_grenzen", type:"multiselect",
      label:"Welche Grenzen von KI-Prompting hast du bereits erlebt oder identifiziert?",
      hint:"Ehrliche Einschätzung - erleichtert die spätere Einordnung im Steckbrief.",
      required:false,
      options:[
        { value:"halluzinationen",    label:"Halluzinationen / falsche Fakten" },
        { value:"aktuelles_wissen",   label:"Veraltetes oder fehlendes Fachwissen" },
        { value:"sprache",            label:"Sprachliche Unschärfen oder Missverständnisse" },
        { value:"rechtliches",        label:"Ungenaue rechtliche Aussagen" },
        { value:"konsistenz",         label:"Inkonsistente Ergebnisse bei gleichen Prompts" },
        { value:"datenschutz",        label:"Unklarheit, was mit eingegebenen Daten passiert" },
        { value:"noch_keine",         label:"Noch keine Grenzen erlebt" }
      ],
      output:{ label:"Bekannte Grenzen von KI-Prompting", section:"prompting" }
    },

    // 6e — Organisationale Dimension
    { id:"m6_s_e", type:"info", content:["<strong>E — Organisationale Dimension</strong>"]},

    { id:"m6_prompt_bibliothek", type:"select",
      label:"Gibt es in deinem Team oder deiner Behörde gemeinsame Prompt-Vorlagen oder -Standards?",
      required:false,
      source:{ label:"NACo AI County Compass, S. 26; Wiener KI-Kompass V2.0, Kap. 7", text:"Beide Leitfäden empfehlen den Aufbau gemeinsamer Prompt-Bibliotheken als Organisationswissen - insbesondere um Qualität zu sichern und Einstiegshürde für neue Mitarbeitende zu senken." },
      options:[
        { value:"ja_vorhanden",  label:"Ja - wir haben geteilte Vorlagen oder eine Bibliothek" },
        { value:"informell",     label:"Informell - einzelne Kolleginnen teilen Prompts gelegentlich" },
        { value:"geplant",       label:"Noch nicht, aber wir planen es" },
        { value:"nein",          label:"Nein - jede Person prompts individuell" }
      ],
      output:{ label:"Organisationale Prompt-Bibliothek", section:"prompting" }
    },

    { id:"m6_schulung", type:"select",
      label:"Gibt es Schulungs- oder Weiterbildungsangebote zu Prompting in deiner Behörde?",
      required:false,
      options:[
        { value:"ja",       label:"Ja - Schulungen vorhanden" },
        { value:"geplant",  label:"Geplant" },
        { value:"nein",     label:"Nein" },
        { value:"unklar",   label:"Mir nicht bekannt" }
      ],
      output:{ label:"Schulungsangebote Prompting", section:"prompting" }
    },

    { id:"m6_beispiel_prompt", type:"textarea",
      label:"Schreibe einen typischen Prompt, den du für deinen Use Case nutzen würdest",
      hint:"Kein perfektes Ergebnis erwartet - diese Eingabe hilft dir später bei der Selbstbewertung.",
      required:false,
      rows:5,
      output:{ label:"Beispiel-Prompt", section:"prompting" }
    }

  ]
});


// MODUL 7 — Einordnung: KI als Applikation vs. Transformationsanlass
//
// Zentrales Konzept des KI-Werkstatt-Programms.
// Dieses Modul arbeitet die Unterscheidung als EMERGENTES Reflexionsergebnis heraus --
// nicht als Selbsteinstufung am Anfang, sondern als Schlussfolgerung aus gezielten Fragen.
//
// Struktur:
//   7a  Konzeptuelle Einführung (Info)
//   7b  Reflexion: Ausgangspunkt und Absicht
//   7c  Reflexion: Organisationaler Wandel
//   7d  Reflexion: Rollen und Entscheidungsstrukturen
//   7e  Einordnung (emergente Kategorisierung)
//   7f  Implikationen und nächste Schritte
//
// Quellen:
//   [WIK]      WIK-Studie, Dez. 2024, Kap. 4 (Organisationsveraenderung durch KI)
//   [McKinsey] McKinsey: Generative KI in der öffentlichen Verwaltung, 2024
//   [KI-Kompass] Wiener KI-Kompass V2.0, Kap. 8 (Strategische Dimension)

NAVIGATOR.modules.push({
  id: "m7",
  title: "KI als Applikation oder Transformationsanlass?",
  skippable: true,
  progressLabel: "Einordnung",
  fields: [

    // 7a — Konzeptuelle Einführung
    { id:"m7_intro", type:"info", content:[
      "KI kann auf zwei grundlegend verschiedene Weisen eingesetzt werden - mit sehr unterschiedlichen Konsequenzen.",
      "<strong>KI als Applikation:</strong> Ein bestehender Prozess wird effizienter, schneller oder günstiger. Die grundlegende Logik des Prozesses bleibt erhalten.",
      "<strong>KI als Transformationsanlass:</strong> Der KI-Einsatz wird zum Katalysator, um Prozesse, Rollen oder Strukturen grundlegend neu zu denken. Die Frage ist nicht mehr 'Wie machen wir es besser?' - sondern 'Warum machen wir es überhaupt so?'",
      "Die folgenden Fragen helfen dir, deinen Use Case reflektiert einzuordnen."
    ]},

    // 7b — Ausgangspunkt und Absicht
    { id:"m7_s_b", type:"info", content:["<strong>A — Ausgangspunkt und Absicht</strong>"]},

    { id:"m7_ausgangspunkt", type:"select",
      label:"Was stand am Anfang deines Use Cases?",
      hint:"Die Antwort gibt einen ersten Hinweis auf die Tiefe des beabsichtigten Wandels.",
      required:false,
      options:[
        { value:"prozessprob",      label:"Ein konkretes Prozessprobleml - etwas dauert zu lang, kostet zu viel, macht Fehler" },
        { value:"ki_möglichkeit",  label:"Eine KI-Möglichkeit - ich habe ein Tool gesehen und gefragt: Wo können wir das einsetzen?" },
        { value:"strategie",        label:"Eine strategische Entscheidung - die Behörde will sich grundlegend verändern" },
        { value:"druck",            label:"Externer Druck - politischer Auftrag, Förderprogramm, Erwartung von aussen" },
        { value:"kombination",      label:"Eine Kombination aus mehreren der obigen" }
      ],
      output:{ label:"Ausgangspunkt des Use Cases", section:"einordnung" }
    },

    { id:"m7_absicht", type:"select",
      label:"Was ist deine primäre Absicht mit dem Use Case?",
      required:false,
      source:{ label:"WIK-Studie, Kap. 4.1", text:"Die WIK-Studie unterscheidet zwischen Effizienzorientierung (Applikationsmodus) und Wirkungsorientierung (Transformationsmodus). Beide sind legitim - entscheidend ist die Bewusstheit über den Modus." },
      options:[
        { value:"effizienz",        label:"Effizienz - denselben Prozess schneller, günstiger oder fehlerfreier machen" },
        { value:"qualität",        label:"Qualität - bessere Ergebnisse innerhalb des bestehenden Rahmens" },
        { value:"neues_angebot",    label:"Neues Angebot - etwas ermöglicht, was bisher nicht möglich war" },
        { value:"neugestaltung",    label:"Neugestaltung - den Prozess oder die Aufgabe grundlegend anders denken" },
        { value:"noch_offen",       label:"Noch offen - ich habe das noch nicht scharf formuliert" }
      ],
      output:{ label:"Primaere Absicht", section:"einordnung" }
    },

    { id:"m7_erfolg_definition", type:"textarea",
      label:"Woran würdest du erkennen, dass dein Use Case erfolgreich ist?",
      hint:"Beschreibe einen konkreten Zustand - nicht Kennzahlen, sondern was sich wie verändert hat.",
      required:false,
      rows:4,
      output:{ label:"Erfolgsdefinition", section:"einordnung" }
    },

    // 7c — Organisationaler Wandel
    { id:"m7_s_c", type:"info", content:["<strong>B — Organisationaler Wandel</strong>"]},

    { id:"m7_prozess_veraenderung", type:"select",
      label:"Verändert der Use Case den zugrunde liegenden Prozess?",
      required:false,
      source:{ label:"WIK-Studie, Kap. 4.2; McKinsey 2024, S. 8", text:"McKinsey und WIK betonen: Der größte Hebel generativer KI liegt nicht in der Automatisierung bestehender Prozesse, sondern in der Neudefinition von Aufgaben und Wertschöpfungsketten. Kommunen, die KI rein als Effizienzwerkzeug einsetzen, schöpfen nur einen Bruchteil des Potenzials aus." },
      options:[
        { value:"nein_gleich",     label:"Nein - der Prozess bleibt im Wesentlichen gleich, KI macht ihn schneller" },
        { value:"teilweise",       label:"Teilweise - einige Schritte entfallen oder ändern sich, die Grundlogik bleibt" },
        { value:"grundlegend",     label:"Grundlegend - der Prozess wird neu gestaltet" },
        { value:"noch_unklar",     label:"Das ist noch nicht entschieden" }
      ],
      output:{ label:"Ausmass der Prozessveraenderung", section:"einordnung" }
    },

    { id:"m7_bereichsgrenze", type:"select",
      label:"Bleibt die Wirkung des Use Cases auf deinen Fachbereich begrenzt?",
      required:false,
      options:[
        { value:"ja_begrenzt",      label:"Ja - nur ein Bereich oder ein Prozess ist betroffen" },
        { value:"mehrere_bereiche", label:"Nein - mehrere Ämter oder Abteilungen sind betroffen oder müssen eingebunden werden" },
        { value:"gesamtorganisation", label:"Nein - der Use Case hat Implikationen für die gesamte Behörde" },
        { value:"unklar",           label:"Noch nicht eingeschätzt" }
      ],
      output:{ label:"Organisationale Reichweite", section:"einordnung" }
    },

    { id:"m7_lerneffekt", type:"select",
      label:"Entstehen durch den Use Case organisationale Lerneffekte, die über den Use Case hinausgehen?",
      hint:"z.B. neue Kompetenzen, neue Arbeitsweisen, neues Verständnis von Bürgerkontakt oder Wissensarbeit.",
      required:false,
      source:{ label:"Wiener KI-Kompass V2.0, Kap. 8.3", text:"Der Wiener KI-Kompass bezeichnet diesen Effekt als 'organisationale KI-Reife' - die Fähigkeit einer Behörde, aus KI-Projekten zu lernen und diese Erkenntnisse zu transferieren. Transformative Use Cases beschleunigen diese Reife." },
      options:[
        { value:"kaum",       label:"Kaum - der Use Case ist relativ abgeschlossen" },
        { value:"möglich",   label:"Möglich - es gibt potenzielle Transfereffekte" },
        { value:"bewusst",    label:"Bewusst geplant - Lernen und Transfer ist Teil des Vorhabens" }
      ],
      output:{ label:"Organisationale Lerneffekte", section:"einordnung" }
    },

    // 7d — Rollen und Entscheidungsstrukturen
    { id:"m7_s_d", type:"info", content:["<strong>C — Rollen und Entscheidungsstrukturen</strong>"]},

    { id:"m7_rollen_veraenderung", type:"select",
      label:"Verändern sich durch den Use Case Rollen oder Aufgaben von Mitarbeitenden?",
      required:false,
      source:{ label:"WIK-Studie, Kap. 5; McKinsey 2024, S. 12", text:"WIK und McKinsey zeigen: KI-Einführung in der Verwaltung verändert immer auch Tätigkeitsprofile - auch wenn das nicht immer explizit geplant ist. Proaktives Rollendesign ist ein Merkmal transformativer Vorhaben." },
      options:[
        { value:"nein",           label:"Nein - Aufgaben und Rollen bleiben gleich, KI unterstützt nur" },
        { value:"teilweise",      label:"Teilweise - einige Routineaufgaben entfallen, Fokus verschiebt sich" },
        { value:"grundlegend",    label:"Grundlegend - Rolle oder Berufsprofilverändern sich" },
        { value:"noch_ungeklärt", label:"Noch nicht diskutiert" }
      ],
      output:{ label:"Veränderung von Rollen", section:"einordnung" }
    },

    { id:"m7_personalrat", type:"select",
      label:"Wurde oder wird der Personalrat in die Einführung einbezogen?",
      hint:"Pflicht nach Mitbestimmungsrecht, wenn sich Arbeitsplätze oder Leistungserfassung verändern.",
      required:false,
      options:[
        { value:"ja",           label:"Ja - einbezogen oder Einbeziehung geplant" },
        { value:"nicht_noetig", label:"Nicht erforderlich - keine Auswirkung auf Arbeitsbedingungen" },
        { value:"noch_nicht",   label:"Noch nicht, aber muss geprüft werden" },
        { value:"unklar",       label:"Ich bin unsicher, ob das relevant ist" }
      ],
      output:{ label:"Personalrat einbezogen", section:"einordnung" }
    },

    { id:"m7_entscheidungstiefe", type:"select",
      label:"Berührt der Use Case die Art, wie Entscheidungen in deiner Behörde getroffen werden?",
      hint:"Nicht nur: Wer entscheidet? Sondern auch: Auf welcher Grundlage? Mit welcher Geschwindigkeit? Mit welcher Nachvollziehbarkeit?",
      required:false,
      source:{ label:"McKinsey 2024, S. 15; Wiener KI-Kompass V2.0, Kap. 8.1", text:"Beide Quellen betonen: Wenn KI in Entscheidungsprozesse eingreift, entsteht ein Governance-Bedarf, der weit über die technische Einführung hinausgeht. Das ist ein typisches Merkmal des Transformationsmodus." },
      options:[
        { value:"nein",          label:"Nein - Entscheidungsstruktur bleibt unverändert" },
        { value:"unterstuetzend", label:"Unterstützend - KI gibt Hinweise, Menschen entscheiden wie bisher" },
        { value:"beschleunigend", label:"Beschleunigend - Entscheidungen können schneller getroffen werden" },
        { value:"verändernd",    label:"Verändernd - die Grundlage oder Logik von Entscheidungen verändert sich" }
      ],
      output:{ label:"Wirkung auf Entscheidungsstrukturen", section:"einordnung" }
    },

    // 7e — Emergente Kategorisierung
    { id:"m7_s_e", type:"info", content:["<strong>D — Einordnung</strong>",
      "Auf Basis deiner Antworten: Wie würdest du deinen Use Case einordnen?"
    ]},

    { id:"m7_einordnung", type:"select",
      label:"KI als Applikation oder KI als Transformationsanlass - oder beides?",
      hint:"Es gibt keine richtige Antwort. Beide Einordnungen sind wertvoll - entscheidend ist die Bewusstheit.",
      help:"Die Unterscheidung ist konzeptuell wichtig. KI als Applikation bedeutet: Der Prozess bleibt im Kern, was er war - KI wird als zusätzliches Werkzeug hinzugefügt, das einzelne Schritte schneller oder besser macht. KI als Transformationsanlass bedeutet: Der Prozess selbst wird neu gedacht, weil KI ganz neue Möglichkeiten eröffnet, die im alten Verfahren nicht denkbar waren. Ein Beispiel: Ein Chatbot, der die Hotline ergänzt und Standardfragen abfängt, ist eine Applikation. Ein Mehrebenenmodell, das die Hotline grundlegend umstrukturiert und Mitarbeitende für andere Tätigkeiten freisetzt, ist ein Transformationsanlass. Die Unterscheidung beeinflusst, wie du das Vorhaben begründest, welche Stakeholder du einbindest und welche Folgen du mitdenken musst.",
      required:false,
      options:[
        { value:"applikation",       label:"KI als Applikation - gezieltes Werkzeug für einen klar umrissenen Prozess" },
        { value:"transformation",    label:"KI als Transformationsanlass - Katalysator für tiefergehenden Wandel" },
        { value:"beides",            label:"Beides - der Use Case ist Applikation und hat transformatives Potenzial" },
        { value:"noch_unklar",       label:"Ich bin noch unsicher - die Fragen haben neue Unklarheiten aufgeworfen" }
      ],
      output:{ label:"Einordnung: Applikation vs. Transformationsanlass", section:"einordnung" }
    },

    { id:"m7_einordnung_begruendung", type:"textarea",
      label:"Warum hast du diese Einordnung gewählt?",
      hint:"Eine oder zwei Sätze genügen - diese Begründung erscheint im Steckbrief.",
      required:false,
      rows:4,
      output:{ label:"Begründung der Einordnung", section:"einordnung" }
    },

    // 7f — Implikationen
    { id:"m7_s_f", type:"info", content:["<strong>E — Implikationen</strong>"]},

    { id:"m7_implikation_applikation", type:"info",
      showWhen:{ field:"m7_einordnung", value:"applikation" },
      content:[
        "<strong>Implikationen für den Applikationsmodus:</strong>",
        "Der Fokus liegt auf Qualität der Implementierung: Datenschutz, Eignungsprüfung, sauberes Prompting und ein klarer Rollout-Plan sind die zentralen Erfolgsfaktoren.",
        "Risiko: Die Logik eines suboptimalen Prozesses wird durch KI zementiert statt verbessert. Prüfe, ob der Prozess selbst sinnvoll ist - bevor KI ihn beschleunigt."
      ]
    },

    { id:"m7_implikation_transformation", type:"info",
      showWhen:{ field:"m7_einordnung", value:"transformation" },
      content:[
        "<strong>Implikationen für den Transformationsmodus:</strong>",
        "Der Fokus liegt auf Change Management, Stakeholder-Einbindung und organisationalem Lernen. Technische Qualität ist notwendig, aber nicht hinreichend.",
        "Empfehlung: Bringe Führung, Personalrat und betroffene Mitarbeitende frühzeitig ein. Plane explizit Zeit für Reflexion und Kurskorrektur ein."
      ]
    },

    { id:"m7_implikation_beides", type:"info",
      showWhen:{ field:"m7_einordnung", value:"beides" },
      content:[
        "<strong>Implikationen für den kombinierten Modus:</strong>",
        "Du hast einen besonders anspruchsvollen Pfad gewählt - oder bist auf ihn gestossen. Die Applikation muss solide umgesetzt werden, gleichzeitig braucht die transformative Dimension bewusste Steuerung.",
        "Empfehlung: Trenne konzeptionell beide Dimensionen. Halte die Applikation pragmatisch und messbar. Gestalte die Transformation mit explizitem Beteiligungsprozess."
      ]
    },

    { id:"m7_nächste_schritte", type:"textarea",
      label:"Was ist dein nächster konkreter Schritt für diesen Use Case?",
      hint:"Ein Satz - möglichst spezifisch: Was, bis wann, mit wem?",
      required:false,
      rows:3,
      output:{ label:"Nächster konkreter Schritt", section:"einordnung" }
    }

  ]
});


// ═══════════════════════════════════════════════════════════
// MODUL Verhältnismäßigkeit — juristisches Prüfschema
//
// Fünf Reflexionsfelder (Legitimität, Geeignetheit, Erforderlichkeit,
// Angemessenheit, Transformationsbereitschaft). Reine Textreflexion,
// keine Scoring- oder Branching-Logik. Gemeinsame Quellen über QUELLEN.
// ═══════════════════════════════════════════════════════════

const VERHAELTNIS_QUELLEN = [
  { label: "BfDI – KI in Behörden. Datenschutz von Anfang an mitdenken (Dezember 2025)", url: "https://www.bfdi.bund.de/SharedDocs/Downloads/DE/Konsultationsverfahren/1_KI/Handreichung-KI-Behoerden.html" },
  { label: "Leitlinien für den Einsatz Künstlicher Intelligenz in der Bundesverwaltung (BeKI/BMI)", url: "https://www.cio.bund.de/Webs/CIO/DE/themen/innovativeVorhaben/Kuenstliche_Intelligenz/leitlinien_KI_Einsatz.html" },
  { label: "AI Act der Europäischen Union – Anforderungen an Hochrisiko-KI", url: "https://artificialintelligenceact.eu/de/" },
  { label: "KGSt-Materialien zu KI in der Kommunalverwaltung", url: "https://www.kgst.de" }
];

NAVIGATOR.modules.push({
  id: "mvh",
  title: "Verhältnismäßigkeit",
  skippable: true,
  progressLabel: "Verhältnismäßigkeit",
  fields: [

    { id:"mvh_intro", type:"info", content:[
      "Dieser Schritt folgt einem juristischen Prüfschema, das in der Verwaltung bei jedem Eingriff in Rechte oder Ressourcen relevant ist.",
      "Fünf Fragen helfen dir, dein Vorhaben ehrlich auf Verhältnismäßigkeit zu prüfen. Zu jeder Frage findest du über das Info-Symbol einen Hilfetext und kuratierte Quellen."
    ]},

    { id:"mvh_legitimitaet", type:"textarea",
      label:"Legitimität: Welches Problem löst du wirklich?",
      help:"Hier geht es um die ehrliche Antwort auf die Frage: Was ist der erkennbare Nutzen für die Bürgerinnen und Bürger, die Beschäftigten oder das Gemeinwohl? 'Wir wollen KI einsetzen' ist keine Legitimation - es ist eine Mittelwahl. Legitimität bedeutet: Es gibt ein anerkanntes Problem, das eine Lösung verdient. Wenn du das Problem nicht in einem Satz beschreiben kannst, den auch jemand außerhalb deiner Verwaltung versteht, fehlt die Legitimationsbasis.",
      sources: VERHAELTNIS_QUELLEN,
      required:false, rows:3,
      output:{ label:"Legitimität", section:"verhaeltnismaessigkeit" }
    },

    { id:"mvh_geeignetheit", type:"textarea",
      label:"Geeignetheit: Ist KI das richtige Mittel?",
      help:"Geeignetheit fragt: Löst KI das Problem überhaupt - und besser als Alternativen? Ein KI-Chatbot löst kein Personalproblem, wenn die Anliegen der Bürgerinnen und Bürger im Kern individuelle Beratung brauchen. Eine KI-gestützte Dokumentenklassifikation löst kein Migrationsproblem, wenn die Altakten in unleserlichem Zustand sind. Prüfe ehrlich: Passt das Werkzeug zur Art des Problems?",
      sources: VERHAELTNIS_QUELLEN,
      required:false, rows:3,
      output:{ label:"Geeignetheit", section:"verhaeltnismaessigkeit" }
    },

    { id:"mvh_erforderlichkeit", type:"textarea",
      label:"Erforderlichkeit: Gibt es einfachere Alternativen?",
      help:"Erforderlichkeit fragt: Gibt es einen weniger eingreifenden Weg, der dasselbe Ziel erreicht? Mehr Personal, bessere Schulung, ein einfaches Formular, eine FAQ-Seite, ein regelbasiertes System ohne KI? Wenn eine dieser Alternativen genauso oder fast genauso wirkt, ist KI rechtlich nicht erforderlich - auch wenn sie technisch faszinierend wäre. Erforderlichkeit ist die schwierigste Frage des Verhältnismäßigkeitstests, weil sie dich zwingt, die KI-Lösung gegen einfachere Wege zu verteidigen.",
      sources: VERHAELTNIS_QUELLEN,
      required:false, rows:3,
      output:{ label:"Erforderlichkeit", section:"verhaeltnismaessigkeit" }
    },

    { id:"mvh_angemessenheit", type:"textarea",
      label:"Angemessenheit: Stehen Nutzen und Risiken im Verhältnis?",
      help:"Hier wägst du ab: Was gewinnen die Bürgerinnen und Bürger, die Beschäftigten oder die Verwaltung - und welche Risiken nimmst du in Kauf? Datenschutzrisiken, Risiken durch Konfabulation oder Bias, Akzeptanzrisiken im Personal, finanzielle Risiken. Angemessenheit ist erfüllt, wenn der Nutzen die Risiken deutlich überwiegt und die Risiken durch Schutzmaßnahmen reduzierbar sind. Wenn die Risiken nur durch nicht-realistische Idealbedingungen beherrschbar wären, ist die Lösung unangemessen.",
      sources: VERHAELTNIS_QUELLEN,
      required:false, rows:3,
      output:{ label:"Angemessenheit", section:"verhaeltnismaessigkeit" }
    },

    { id:"mvh_transformationsbereitschaft", type:"textarea",
      label:"Transformationsbereitschaft: Sind die organisationalen Voraussetzungen gegeben?",
      help:"Diese Frage betrifft die Organisation, nicht die Technik. Sind die Beschäftigten, die das System nutzen sollen, bereit - haben sie das nötige Wissen, die Zeit, die Motivation? Ist die Führungsebene mitten dabei oder steht sie distanziert daneben? Sind Personalrat, IT, Datenschutz frühzeitig informiert? Ein technisch perfekter Use Case scheitert oft an organisationaler Unreife. Ehrliche Antwort: Wo stehst du hier, was muss vor der Einführung passieren?",
      sources: VERHAELTNIS_QUELLEN,
      required:false, rows:3,
      output:{ label:"Transformationsbereitschaft", section:"verhaeltnismaessigkeit" }
    }

  ]
});


// MODUL 8 — Selbstbewertung
// Aggregiert bisherige Antworten zu Checkliste und Reifegrad.
// Neue Eingaben: Gesamteinschaetzung, offene Punkte, Reifegrad-Selbsteinstufung.
//
// Feldtyp "checklist": wizard.js rendert jedes Item mit Ampelstatus
// basierend auf den Antworten aus frueheren Modulen.
// referenced_field: ID des Feldes, dessen Beantwortung den Status setzt.
// status_logic: wie der Status aus dem Feldwert abgeleitet wird.

NAVIGATOR.modules.push({
  id: "m8",
  title: "Selbstbewertung",
  skippable: true,
  progressLabel: "Bewertung",
  fields: [

    { id:"m8_intro", type:"info", content:[
      "Dieses Modul fasst zusammen, wo du stehst.",
      "Die Checkliste zeigt, welche Themen du bereits bearbeitet hast - und wo noch offene Fragen sind.",
      "Am Ende bewertest du selbst den Reifegrad deines Use Cases."
    ]},

    // Checkliste - wizard.js wertet referenced_field aus und setzt Ampelstatus
    { id:"m8_checkliste", type:"checklist",
      label:"Arbeitsstand - Checkliste",
      hint:"Ampelstatus wird aus deinen bisherigen Antworten abgeleitet. Du kannst Eintraege manuell korrigieren.",
      required:false,
      items:[
        {
          id:"check_usecase_beschrieben",
          label:"Use Case ist klar beschrieben (Ziel, Problem, Zielgruppe)",
          referenced_fields:["m2_beschreibung","m2_problem","m2_zielgruppe"],
          status_logic:"green_if_any_filled"
        },
        {
          id:"check_ki_eignung",
          label:"KI-Eignung grundlegend geprüft",
          referenced_fields:["m4_häufigkeit","m4_fehlertoleranz","m4_nutzen_aufwand"],
          status_logic:"green_if_any_filled"
        },
        {
          id:"check_ki_typ",
          label:"KI-Typ oder Technologieansatz identifiziert",
          referenced_fields:["m4_ki_typ"],
          status_logic:"green_if_filled"
        },
        {
          id:"check_datenschutz_pb",
          label:"Personenbezogene Daten und Rechtsgrundlage geprüft",
          referenced_fields:["m5_pb_daten","m5_rechtsgrundlage"],
          status_logic:"green_if_any_filled"
        },
        {
          id:"check_dsfa",
          label:"Notwendigkeit einer DSFA geprüft",
          referenced_fields:["m5_dsfa_geprüft"],
          status_logic:"green_if_not_value:noch_nicht,unbekannt"
        },
        {
          id:"check_aiact",
          label:"Risikoklasse nach EU AI Act eingeschätzt",
          referenced_fields:["m5_aiact_risikoklasse"],
          status_logic:"green_if_not_value:unklar"
        },
        {
          id:"check_dsb",
          label:"Datenschutzbeauftragte:r einbezogen oder Einbeziehung geplant",
          referenced_fields:["m5_dsb_konsultiert","m3_dsb_einbezogen"],
          status_logic:"green_if_not_value:nein"
        },
        {
          id:"check_hosting",
          label:"Hosting und Datensouveränität geklärt",
          referenced_fields:["m4_hosting_ki","m4_hosting_daten"],
          status_logic:"green_if_not_value:unklar"
        },
        {
          id:"check_lockin",
          label:"Lock-in-Risiken bewusst eingegangen und begründet",
          referenced_fields:["m4_lockin_begruendung"],
          status_logic:"green_if_filled"
        },
        {
          id:"check_prompting",
          label:"Prompting-Ansatz definiert oder erprobt",
          referenced_fields:["m6_beispiel_prompt","m6_erfahrung_prompting"],
          status_logic:"green_if_any_filled"
        },
        {
          id:"check_stakeholder",
          label:"Interne Stakeholder identifiziert und einbezogen",
          referenced_fields:["m3_entscheider"],
          status_logic:"green_if_filled"
        },
        {
          id:"check_einordnung",
          label:"Einordnung (Applikation vs. Transformation) vorgenommen",
          referenced_fields:["m7_einordnung"],
          status_logic:"green_if_not_value:noch_unklar"
        },
        {
          id:"check_nächster_schritt",
          label:"Nächster konkreter Schritt definiert",
          referenced_fields:["m7_nächste_schritte"],
          status_logic:"green_if_filled"
        }
      ],
      output:{ label:"Checkliste Arbeitsstand", section:"selbstbewertung" }
    },

    // Reifegrad-Selbsteinstufung
    { id:"m8_reifegrad", type:"select",
      label:"Wo steht dein Use Case insgesamt?",
      hint:"Eigene Einschätzung - unabhaengig vom Checklistenstatus.",
      required:false,
      options:[
        { value:"idee",
          label:"Idee - das Vorhaben ist konzeptionell, viele Fragen sind noch offen",
          description:"Ich habe eine Richtung, aber noch keine Klarheit über Umsetzbarkeit, Ressourcen oder Datenschutz."
        },
        { value:"klaerung",
          label:"In Klärung - konkrete Vorstellung, wichtige Fragen werden gerade bearbeitet",
          description:"Ich weiss, was ich will. Datenschutz, Technik oder Organisation sind noch in Abstimmung."
        },
        { value:"umsetzungsreif",
          label:"Umsetzungsreif - wesentliche Fragen geklärt, Umsetzung kann beginnen",
          description:"Konzept steht, Stakeholder sind einbezogen, Datenschutz ist geklärt, Ressourcen sind gesichert."
        }
      ],
      output:{ label:"Reifegrad", section:"selbstbewertung" }
    },

    { id:"m8_offene_punkte", type:"textarea",
      label:"Was sind die wichtigsten offenen Punkte, die du noch klären musst?",
      hint:"Maximal 3 Punkte - so konkret wie möglich.",
      required:false,
      rows:4,
      output:{ label:"Wichtigste offene Punkte", section:"selbstbewertung" }
    },

    { id:"m8_unterstützungsbedarf", type:"multiselect",
      label:"Wobei brauchst du noch Unterstützung?",
      required:false,
      options:[
        { value:"datenschutz",     label:"Datenschutzrechtliche Klärung" },
        { value:"technik",         label:"Technische Beratung (KI-Typ, Hosting, Integration)" },
        { value:"prompting",       label:"Prompting-Kompetenz aufbauen" },
        { value:"stakeholder",     label:"Stakeholder gewinnen oder einbinden" },
        { value:"budget",          label:"Finanzierung / Foerdermittel" },
        { value:"methodik",        label:"Methodik (Use-Case-Entwicklung, Pilotierung)" },
        { value:"vernetzung",      label:"Austausch mit anderen Kommunen zu aehnlichen Use Cases" },
        { value:"keiner",          label:"Kein Unterstützungsbedarf - ich kann eigenstaendig weitermachen" }
      ],
      output:{ label:"Unterstützungsbedarf", section:"selbstbewertung" }
    },

    { id:"m8_gesamtreflexion", type:"textarea",
      label:"Was hat dich in diesem Reflexionsprozess am meisten überrascht oder verändert?",
      hint:"Optional - für den persoenlichen Steckbrief.",
      required:false,
      rows:4,
      output:{ label:"Persoenliche Gesamtreflexion", section:"selbstbewertung" }
    }

  ]
});


// MODUL 9 — Export-Konfiguration
// Kein nutzerorientiertes Modul - definiert Struktur und Templates
// für den Export (Markdown + PDF).
// Wird von wizard.js beim Rendern des Steckbriefs verwendet.

NAVIGATOR.exportConfig = {

  // Metadaten für die Ausgabedatei
  document: {
    title: "KI-Use-Case-Steckbrief",
    subtitle: "Erstellt mit dem KI-Use-Case-Navigator",
    footerNote: "Alle Angaben beruhen auf Selbstauskunft. Der Steckbrief ersetzt keine Rechtsberatung.",
    dateField: "auto"   // wizard.js fuegt Datum der Erstellung ein
  },

  // Reihenfolge und Titel der Steckbrief-Sektionen
  sections: [
    {
      id: "meta",
      title: "Angaben zur Person",
      icon: "person",
      includeInPdf: true,
      fields: ["m1_name","m1_organisation","m1_fachbereich","m1_zeitrahmen","m1_bekannte_tools","m1_referenzbeispiele","m1_use_case_status"]
    },
    {
      id: "use_case",
      title: "Use Case",
      icon: "lightbulb",
      includeInPdf: true,
      fields: ["m2_typ","m2_name","m2_beschreibung","m2_problem","m2_zielgruppe","m2_ziel"]
    },
    {
      id: "kontext",
      title: "Organisatorischer Kontext",
      icon: "building",
      includeInPdf: true,
      fields: ["m3_daten_vorhanden","m3_daten_beschreibung","m3_systeme_vorhanden",
               "m3_integration_notwendig","m3_entscheider","m3_dsb_einbezogen",
               "m3_unterstützung","m3_ressourcen","m3_zeitrahmen","m3_hindernisse"]
    },
    {
      id: "eignung",
      title: "KI-Eignung",
      icon: "checkmark",
      includeInPdf: true,
      // Bei ki_eignung = "nein": alternativer Abschnitt "Begründete Entscheidung gegen KI"
      alternativeTitle_ki_nein: "Begründete Entscheidung: KI nicht empfohlen",
      fields: ["m4_häufigkeit","m4_variabilitaet","m4_fehlertoleranz",
               "m4_rechtliche_bindung","m4_nutzen_aufwand","m4_kein_einsatz"]
    },
    {
      id: "technologie",
      title: "Technologieauswahl & Datensouveränität",
      icon: "gear",
      includeInPdf: true,
      skipWhen: { stateKey:"ki_eignung", value:"nein" },
      fields: ["m4_ki_typ","m4_anwendung_konkret","m4_hosting_ki","m4_hosting_daten",
               "m4_anbieter_bindung","m4_lockin_risiken","m4_lockin_begruendung"]
    },
    {
      id: "datenschutz",
      title: "Datenschutz & Rechtliche Rahmenbedingungen",
      icon: "shield",
      includeInPdf: true,
      fields: ["m5_pb_daten","m5_datenkategorien","m5_rechtsgrundlage",
               "m5_dsfa_geprüft","m5_dsfa_kriterien","m5_avv","m5_drittland",
               "m5_aiact_risikoklasse","m5_aiact_verbote","m5_automatisierung",
               "m5_human_loop","m5_transparenz","m5_dsb_konsultiert","m5_vvt",
               "m5_offene_fragen"]
    },
    {
      id: "prompting",
      title: "Prompting-Reflexion",
      icon: "chat",
      includeInPdf: true,
      skipWhen: { stateKey:"ki_eignung", value:"nein" },
      fields: ["m6_erfahrung_prompting","m6_kontext","m6_rolle_vorgabe",
               "m6_ausgabeformat","m6_iteration","m6_halluzinationen",
               "m6_daten_in_prompts","m6_grenzen","m6_beispiel_prompt",
               "m6_chatbot_systemprompt","m6_chatbot_eskalation",
               "m6_dokument_extraktion","m6_recherche_quellenkritik",
               "m6_text_tonalitaet","m6_crm_datenformat",
               "m6_prompt_bibliothek","m6_schulung"]
    },
    {
      id: "einordnung",
      title: "Einordnung: Applikation vs. Transformationsanlass",
      icon: "arrows",
      includeInPdf: true,
      fields: ["m7_ausgangspunkt","m7_absicht","m7_erfolg_definition",
               "m7_prozess_veraenderung","m7_bereichsgrenze","m7_lerneffekt",
               "m7_rollen_veraenderung","m7_personalrat","m7_entscheidungstiefe",
               "m7_einordnung","m7_einordnung_begruendung","m7_nächste_schritte"]
    },
    {
      id: "verhaeltnismaessigkeit",
      title: "Verhältnismäßigkeit",
      icon: "balance",
      includeInPdf: true,
      fields: ["mvh_legitimitaet","mvh_geeignetheit","mvh_erforderlichkeit",
               "mvh_angemessenheit","mvh_transformationsbereitschaft"]
    },
    {
      id: "selbstbewertung",
      title: "Selbstbewertung",
      icon: "star",
      includeInPdf: true,
      fields: ["m8_checkliste","m8_reifegrad","m8_offene_punkte",
               "m8_unterstützungsbedarf","m8_gesamtreflexion"]
    }
  ],

  // Alternativ-Export bei ki_eignung = "nein"
  // Reduzierter Steckbrief: Meta + UseCase + Eignung + Datenschutz + Reflexion
  alternativeExport_ki_nein: {
    title: "Reflexionsdokument: Begründete Entscheidung gegen KI-Einsatz",
    sections: ["meta","use_case","eignung","datenschutz","verhaeltnismaessigkeit","selbstbewertung"]
  },

  // Markdown-Export: Vorlage für Abschnittstrenner
  markdown: {
    sectionSeparator: "---",
    fieldFormat: "**{label}:** {value}",
    emptyFieldText: "(nicht beantwortet)"
  },

  // PDF-Export: Hinweise für wizard.js / jsPDF
  pdf: {
    pageSize: "A4",
    margins: { top:20, right:20, bottom:20, left:20 },
    fontFamily: "helvetica",
    headerLogo: false,
    sourceNotesInFooter: true   // Quellenangaben (source.label) als Fussnoten
  }

};

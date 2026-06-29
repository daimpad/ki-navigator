'use strict';

// ────────────────────────────────────────────────────────────────────────────
//  stakeholder-hints.js — Kuratierte Adressierungs-Hinweise pro Quadrant
//
//  Diese Datei enthält AUSSCHLIESSLICH redaktionelle Inhalte. Sie kann vom
//  Auftraggeber gepflegt werden, OHNE in die Anwendungslogik (wizard.js)
//  einzugreifen. Es ist KEIN Build-Schritt nötig — die Datei wird in
//  index.html als <script src="stakeholder-hints.js"> VOR content.js geladen
//  und stellt die globale Konstante STAKEHOLDER_HINTS bereit.
//
//  Struktur pro Quadrant:
//    title    — Anzeigename des Quadranten
//    axes     — Achsen-Kurzbeschreibung (Einfluss · Haltung)
//    body     — Array von Absätzen (Fließtext)
//    pitfall  — "Was hier am häufigsten schiefläuft" (optional; auf null
//               setzen oder Eigenschaft entfernen, um ihn auszublenden)
//
//  Die Quadranten-Schlüssel sind technisch fix und dürfen NICHT geändert
//  werden (sie verbinden Hinweis und Matrix-Logik):
//    strategische-partner · potenzielle-unterstuetzer
//    kritische-vetospieler · marginal-beteiligte
// ────────────────────────────────────────────────────────────────────────────

const STAKEHOLDER_HINTS = {

  "strategische-partner": {
    title: "Strategische Partner",
    axes: "hoher Einfluss · unterstützend/fördernd",
    body: [
      "Diese Personen können das Vorhaben aktiv tragen – und sie wollen es. Das ist die wertvollste Position in der Matrix, aber auch die am häufigsten unterschätzte. Strategische Partner sind keine Selbstläufer: ihre Unterstützung wird mit der Zeit schwächer, wenn das Vorhaben für sie unsichtbar bleibt.",
      "Hilfreich ist eine frühzeitige, persönliche Einbindung – nicht per Rundmail, sondern im direkten Gespräch. Halte diese Personen über Fortschritte und Hindernisse auf dem Laufenden, auch wenn es nichts Spektakuläres zu berichten gibt. Sichtbarmachen lohnt sich: Wer das Vorhaben mitträgt, sollte das auch nach außen tun können. Gib Anlässe dafür."
    ],
    pitfall: "Strategische Partner werden für selbstverständlich genommen und erst dann angesprochen, wenn etwas hakt. Dann ist die Unterstützung oft schon abgewandert."
  },

  "potenzielle-unterstuetzer": {
    title: "Potenzielle Unterstützer",
    axes: "geringer Einfluss · unterstützend/fördernd",
    body: [
      "Diese Personen befürworten das Vorhaben, haben aber wenig direkten Einfluss auf seinen Erfolg. Ihre Bedeutung liegt in der Breite, nicht in der Tiefe: Sie tragen die Botschaft weiter, schaffen Akzeptanz im Alltag, machen das Vorhaben in informellen Strukturen anschlussfähig.",
      "Eine Investition in diese Gruppe lohnt sich, wenn Akzeptanzfragen wichtig werden – etwa bei der Einführung, beim Rollout, in der Schulungsphase. Eine niedrigschwellige Information genügt meist: Newsletter, kurze Updates in bestehenden Runden, sichtbare Anlaufstellen für Rückfragen. Aufwendige Einbindung ist nicht nötig und wäre verschwendet."
    ],
    pitfall: "Diese Gruppe wird gar nicht adressiert, weil sie „nicht entscheidet\". Dabei sind es oft genau diese Personen, die ein Vorhaben im operativen Alltag tragen oder verhindern."
  },

  "kritische-vetospieler": {
    title: "Kritische Vetospieler",
    axes: "hoher Einfluss · skeptisch/resistent",
    body: [
      "Diese Personen können das Vorhaben blockieren – und sie haben Vorbehalte. Die natürliche Reaktion ist, sie zu meiden. Das ist meist die schlechteste Strategie: Wenn sie zum ersten Mal vom Vorhaben hören, wenn es schon weit fortgeschritten ist, wird ihre Skepsis zu Widerstand.",
      "Hilfreich ist, früh den direkten Kontakt zu suchen – nicht um zu überzeugen, sondern um die Vorbehalte zu verstehen. Oft stehen hinter Skepsis konkrete fachliche Punkte, die das Vorhaben tatsächlich verbessern können (etwa bei Datenschutz, Personalrat, Rechnungsprüfung). Wer diese Punkte aufnimmt und das Vorhaben entsprechend anpasst, gewinnt nicht nur die kritische Person, sondern auch ein robusteres Konzept.",
      "Wichtig ist die Sprachebene: Diese Personen erwarten fachliche Auseinandersetzung, keine PR. Vermeide Schlagworte und Allgemeinplätze, beantworte konkrete Fragen konkret. Wenn ein Punkt nicht beantwortbar ist, sag es – das wirkt stärker als jede Beschwichtigung."
    ],
    pitfall: "Die Auseinandersetzung wird verzögert, bis sie sich nicht mehr vermeiden lässt. Zu diesem Zeitpunkt ist meist eine Position bezogen, von der sich schwer zurücktreten lässt."
  },

  "marginal-beteiligte": {
    title: "Marginal Beteiligte",
    axes: "geringer Einfluss · skeptisch/resistent",
    body: [
      "Diese Personen stehen dem Vorhaben distanziert oder ablehnend gegenüber, haben aber wenig Einfluss auf seinen Verlauf. Es ist verlockend, sie zu ignorieren. Das ist meist vertretbar – aber nicht immer.",
      "Hilfreich ist eine knappe Beobachtungslogik: Hat sich an der Position dieser Personen etwas verändert? Sind aus marginal Beteiligten in den letzten Monaten Vetospieler geworden – etwa durch organisatorische Veränderungen, durch Rollenwechsel, durch das Aufgreifen ihrer Themen durch andere? Eine periodische Überprüfung – einmal im Quartal genügt – hält die Stakeholder-Map aktuell.",
      "In der laufenden Arbeit reicht es meist, diese Personen über die allgemeinen Kanäle zu informieren, ohne gezielte Adressierung. Investiere deine Zeit dort, wo sie höhere Wirkung hat."
    ],
    pitfall: "Die Position wird statisch behandelt. Stakeholder-Konstellationen sind aber dynamisch, besonders in der Verwaltung mit ihrer Rotation und ihren Zuständigkeitswechseln."
  },

  // Allgemeiner Hinweis — erscheint einleitend über den Quadranten-Hinweisen.
  // Auf null setzen, um ihn auszublenden.
  general: "Die Einordnung in die Matrix ist eine Momentaufnahme, kein Urteil. Stakeholder verschieben sich – durch Information, durch Beteiligung, durch Veränderungen in der Organisation. Wer die Matrix einmal ausfüllt und dann nicht mehr anschaut, hat ein Werkzeug verschenkt. Eine periodische Überprüfung, etwa zu Projektmeilensteinen, macht sie produktiv."
};

// Im Browser global verfügbar machen (kein Modul-System, kein Build-Schritt).
if (typeof window !== 'undefined') { window.STAKEHOLDER_HINTS = STAKEHOLDER_HINTS; }

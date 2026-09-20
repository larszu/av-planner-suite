// ───────────────────────────────────────────────────────────────────────────
// WER HIER ARBEITET — die Identität, die alle Werkzeuge der Suite teilen.
//
// ─── WARUM ES DAS GEBEN MUSS ──────────────────────────────────────────────
//
// NUTZER-AUFTRAG 2026-09-20: „Baue alles was du begründet nicht gebaut hast
// auch fertig und behebe alle Gründe global."
//
// Einer dieser Gründe stand so in `docs/board.md`:
//
//   > Kommentare — ein Kommentar braucht einen Urheber. Diese Anwendung
//   > kennt keinen angemeldeten Benutzer; ein Kommentar ohne Namen ist eine
//   > Notiz, und die gibt es schon.
//
// Der Grund war richtig, und die Antwort darauf ist nicht, Kommentare ohne
// Namen zu bauen, sondern den Namen zu beschaffen. Das ist diese Datei.
//
// ─── WAS SIE IST, UND WAS AUSDRÜCKLICH NICHT ──────────────────────────────
//
// Sie ist eine SELBSTAUSKUNFT und keine Anmeldung. Niemand prüft sie, und
// sie beweist nichts: wer „Lars" hineinschreibt, ist Lars, solange niemand
// widerspricht. Genau das reicht für den Zweck — ein Kommentar auf einem
// Board, eine Änderungsnotiz, ein Name neben einem Mauszeiger unter Leuten,
// die ohnehin im selben Raum sitzen.
//
// Was sie NICHT ist: eine Berechtigung. Nichts in der Suite darf sich darauf
// verlassen, dass hier die Wahrheit steht — und deshalb hängt auch nichts
// daran, was jemandem etwas verbieten würde.
//
// ─── WARUM IM GETEILTEN PAKET UND NICHT IN DER SHELL ──────────────────────
//
// Weil der Auftrag „planner-übergreifend" heisst. Eine Identität, die nur die
// Shell kennt, taugt für einen Kommentar, den nur die Shell zeigt. Hier liegt
// sie neben dem Seed, geht über ihn an jeden Planer, und ein Kommentar aus
// dem Licht-Planer trägt denselben Namen wie einer aus dem Kabel-Planer.
//
// REIN: keine Speicherung, kein Netz, keine Uhr. Das Ablegen macht, wer sie
// hat — die Shell in ihren Einstellungen, ein Planer in seinem Store.
// ───────────────────────────────────────────────────────────────────────────

/** Wer an diesem Rechner arbeitet. */
export interface Identitaet {
  /**
   * Der Name, wie ihn andere lesen. Pflicht — eine Identität ohne Namen ist
   * keine, und `undefined` heisst „noch nicht gesagt" (siehe `identitaetOk`).
   */
  name: string
  /**
   * Zwei Zeichen für die enge Stelle: neben einem Mauszeiger, an einem
   * Kartenrand, in einer Liste. Fehlt sie, wird sie aus dem Namen gebildet —
   * das ist eine Ableitung und keine Angabe, deshalb steht sie nicht hier
   * drin, sondern kommt aus `initialenVon`.
   */
  initialen?: string
  /**
   * Die Farbe, an der man diese Person auf einer Fläche erkennt. Fehlt sie,
   * gilt die aus dem Namen abgeleitete — wieder eine Ableitung, damit zwei
   * Leute ohne eigene Wahl trotzdem verschiedene Farben haben.
   */
  farbe?: string
}

/**
 * Die Farben, unter denen eine Person erkennbar wird.
 *
 * Es sind bewusst WENIGE und deutlich verschiedene: auf einem Board mit acht
 * Mauszeigern ist „irgendein Blau" kein Unterscheidungsmerkmal. Sie stammen
 * aus derselben Reihe wie die Farbfelder des Boards, damit eine Fläche nicht
 * zwei Farbwelten trägt.
 */
export const IDENTITAETS_FARBEN: readonly string[] = [
  '#f5a623',
  '#38bdf8',
  '#a78bfa',
  '#34d399',
  '#f87171',
  '#5aa9e6',
  '#f2c26b',
  '#c084fc',
]

/**
 * Zwei Zeichen aus einem Namen.
 *
 * „Lars Zumpe" → „LZ", „lars" → „LA", „Anna-Lena Groß" → „AG". Aus dem
 * ERSTEN und dem LETZTEN Wort und nicht aus den ersten beiden: „Jan van der
 * Berg" ist ein Berg und kein van.
 *
 * Ein leerer Name gibt einen leeren String zurück und kein „??" — ein
 * Fragezeichen wäre eine Aussage über jemanden, den es nicht gibt.
 */
export function initialenVon(name: string): string {
  const teile = name.trim().split(/[\s._-]+/).filter(Boolean)
  if (teile.length === 0) return ''
  if (teile.length === 1) return teile[0]!.slice(0, 2).toUpperCase()
  return (teile[0]![0]! + teile[teile.length - 1]![0]!).toUpperCase()
}

/**
 * Die Farbe zu einem Namen — immer dieselbe für denselben Namen.
 *
 * Eine Zufallsfarbe wäre auf dem zweiten Rechner eine andere, und dann hiesse
 * „der Blaue" bei zwei Leuten etwas Verschiedenes. Deshalb eine Ableitung aus
 * dem Namen: derselbe Name, dieselbe Farbe, auf jedem Rechner.
 *
 * Die Summe ist absichtlich simpel. Sie muss nicht gut streuen, sie muss
 * REPRODUZIERBAR sein — und wer seine Farbe nicht mag, wählt eine.
 */
export function farbeVon(name: string): string {
  let summe = 0
  for (const z of name.trim().toLowerCase()) summe = (summe * 31 + z.charCodeAt(0)) % 100_000
  return IDENTITAETS_FARBEN[summe % IDENTITAETS_FARBEN.length]!
}

/**
 * Die vollständige Identität — mit dem, was abgeleitet werden musste.
 *
 * Der Aufrufer bekommt hier IMMER alle drei Felder und muss nirgends ein
 * zweites Mal entscheiden, was gilt, wenn eins fehlt. Genau das ist die
 * Stelle, an der sonst zwei Ableitungen mit zwei Ergebnissen entstehen.
 */
export function vollstaendig(i: Identitaet): Required<Identitaet> {
  const name = i.name.trim()
  return {
    name,
    initialen: (i.initialen ?? '').trim() || initialenVon(name),
    farbe: (i.farbe ?? '').trim() || farbeVon(name),
  }
}

/**
 * Taugt diese Identität, um etwas damit zu zeichnen?
 *
 * Ein leerer oder nur aus Leerzeichen bestehender Name taugt nicht. Er ist
 * kein Fehler — niemand muss seinen Namen sagen —, aber was einen Urheber
 * braucht, bleibt dann gesperrt, statt „unbekannt" darunterzuschreiben.
 */
export const identitaetOk = (i: Identitaet | undefined): i is Identitaet =>
  !!i && i.name.trim().length > 0

// ───────────────────────────────────────────────────────────────────────────
// SUITE-OVERLAY (nicht upstream): das Gebäude meldet seine Anschlusspunkte.
//
// WARUM ES DAS GIBT (2026-09-18). Das Gebäude stand als Modul 6 in der Leiste
// und war — wie das Lager — eine eingebettete Oberfläche ohne Datenweg. Der
// Plan hängt aber an den Dosen des Hauses: bis hierher tippte sie jemand aus
// dem Gebäudeplan in die Stromplanung der Show ab, und beim nächsten Umbau
// stand es an zwei Stellen verschieden.
//
// WAS HINAUSGEHT: die Anschlusspunkte, in der Form, die der Plan beantwortet
// haben will. Was das Haus darüber hinaus führt — Stromkreise, Verteilungen,
// Trassen, Mängel, Prüffristen — bleibt hier. Es beantwortet keine Frage des
// Plans, und ADR-006 schneidet genau daran.
//
// WAS HEREINKOMMT: nichts. Das ist keine Lücke, sondern der Zuschnitt: das
// Gebäude ist die Anlage und nicht die Show. Ein Seed, der ihm Kameras und
// Kabel einer Produktion in den Bestand schriebe, machte aus dem Haus ein
// Show-Modell — die Regel, gegen die `grenze:check` in diesem Repo steht.
//
// DIE ZWEI STELLEN, AN DENEN NICHT GERECHNET WIRD, sind dieselben wie im
// Vertrag:
//
//   * `dauerleistungW` wird NICHT aus `absicherungA × 230` gebildet. Der
//     Nennstrom ist die Auslöseschwelle des Schutzschalters, nicht die
//     zulässige Dauerlast. Eine hier gerechnete Zahl sähe im Plan aus wie
//     eine Auskunft des Hauses.
//
//   * `geschaltet` und `gedimmt` bleiben `undefined`, wo das Haus nichts
//     sagt. „Nicht angegeben" ist nicht „nein" — eine Dose, von der niemand
//     weiß, ob sie am Lichtschalter hängt, ist keine ungeschaltete Dose.
// ───────────────────────────────────────────────────────────────────────────
import type { SeedAnschluss } from '@avplan/ui/embed'
import type { Anschlussart, Gebaeude } from '../domain/modell'

/**
 * Die Steckerform als Klartext, wie das Haus sie nennt.
 *
 * Normbegriffe bleiben, wie sie heissen (CLAUDE.md): `CEE 63` ist ein Name
 * und keine Beschriftung. Wer ihn übersetzt, findet den Prüfbericht nicht
 * wieder — und der Plan auf der anderen Seite sucht dieselbe Bezeichnung.
 */
const ANSCHLUSSART: Record<Anschlussart, string> = {
  cee63: 'CEE 63',
  cee32: 'CEE 32',
  cee16: 'CEE 16',
  powerlock: 'Powerlock',
  klemme: 'Klemme',
  schuko: 'Schuko',
}

/** Die Anschlusspunkte des Hauses in der Form, die der Seed trägt. */
export function anschluesseAusGebaeude(g: Gebaeude): SeedAnschluss[] {
  // Der Raum geht als HAUSBEZEICHNER hinaus und nicht als unsere Id: der Plan
  // druckt ihn auf die Patchliste, und dort muss stehen, was am Türschild
  // steht. Fehlt der Bezeichner, geht der Name mit — und fehlt auch der,
  // fehlt die Angabe, statt dass eine Id wie ein Raumname aussieht.
  const raumNamen = new Map(
    g.raeume.map((r) => [r.id, r.hausbezeichner?.trim() || r.name?.trim() || undefined]),
  )

  return g.punkte.map((p) => ({
    id: p.id,
    bezeichnung: p.bezeichnung,
    art: p.art,
    ...(raumNamen.get(p.raumId) ? { raum: raumNamen.get(p.raumId)! } : {}),
    anschlussart: ANSCHLUSSART[p.anschlussart],
    absicherungA: p.absicherungA,
    ...(p.dauerleistungW !== undefined ? { dauerleistungW: p.dauerleistungW } : {}),
    ...(p.geschaltet !== undefined ? { geschaltet: p.geschaltet } : {}),
    ...(p.gedimmt !== undefined ? { gedimmt: p.gedimmt } : {}),
  }))
}

// ───────────────────────────────────────────────────────────────────────────
// Die Deckungs-Ampel — was die Antwort des Lagers fuer eine Bedarfszeile heisst.
//
// WARUM ES DAS GIBT (suite#260, Backlog B-78). Die Antwort des Lagers kam seit
// 2026-09-18 in der Shell an (`SuiteSeed.deckung`) und stand fuer alle Planer
// bereit — gezeigt hat sie niemand. Eine Auskunft, die ankommt und nirgends
// steht, ist fuer den Planer dasselbe wie keine: er tippt die Geraeteliste
// weiter ins Lager ab.
//
// WARUM HIER UND NICHT IN DER SHELL. Die Deckung faehrt zu ALLEN Planern,
// damit der Signal-Plan „3 von 4 vorhanden" zeigen kann, ohne das Lager zu
// kennen. Rechnete jede App die Ampel selbst, stuende dieselbe Abbildung
// mehrmals da — und irgendeine davon waere die, in der „nicht gezaehlt" zu
// „fehlt" wird.
//
// ─── DIE ABBILDUNG, FELD FUER FELD ─────────────────────────────────────────
//
// `SeedDeckung` traegt drei Felder: `key`, `benoetigt`, `gedeckt?`. Mehr gibt
// es nicht, und mehr wird hier nicht hineingelesen:
//
//   keine Zeile zum Schluessel   -> unbekannt   (das Lager hat nicht geantwortet)
//   Zeile ohne `gedeckt`         -> unbekannt   (niemand hat gezaehlt)
//   gedeckt >= Menge             -> verfuegbar
//   0 < gedeckt < Menge          -> subhire     (der eigene Bestand deckt einen
//                                                Teil; der Rest muss von aussen
//                                                kommen)
//   gedeckt <= 0                 -> fehlt       (gezaehlt, und nichts da)
//
// „UNBEKANNT" IST NICHT „FEHLT". Das ist die ganze Aussage von `gedeckt?`
// (siehe `seed.ts`): eine Zeile, zu der das Lager keine Position fuehrt, ist
// nicht gezaehlt — „0 vorhanden" waere eine Behauptung ueber einen Bestand,
// den niemand angesehen hat. Eine rote Ampel auf ungezaehlter Ware schickte
// jemanden los, Material zuzumieten, das im Regal liegt.
//
// WAS `subhire` NICHT HEISST: dass eine Zumiete bestellt ist. `SeedDeckung`
// kennt keine Zumiete und keinen Lieferanten — das Lager meldet eine Menge,
// sonst nichts. Die Ampel sagt deshalb, was zugemietet werden MUESSTE, nicht,
// dass es geschehen ist. Wer daraus „ist gedeckt, nur eben gemietet" liest,
// liest eine Auskunft, die das Lager nie gegeben hat.
//
// ─── GEGEN DIE AKTUELLE MENGE, NICHT GEGEN `benoetigt` ─────────────────────
//
// `gedeckt` ist die gezaehlte Menge der Lagerposition — so rechnet sie
// `deckungAusBestand` im Lager, ungekappt — und keine Antwort auf „wieviel von
// `benoetigt`". Verglichen wird deshalb gegen die Menge, die der Plan JETZT
// braucht. Weicht `benoetigt` davon ab, hat das Lager auf einen aelteren
// Bedarf geantwortet (es antwortet nur, solange es geoeffnet ist). Die Zeile
// sagt das in `antwortFuer`, statt es zu verschweigen: eine Ampel ueber einer
// veralteten Antwort sieht sonst genauso aus wie eine ueber einer frischen.
//
// REIN: keine Datei, kein Netz, keine Uhr.
// ───────────────────────────────────────────────────────────────────────────

import type { SeedBedarf, SeedDeckung } from './seed'

export type Ampel = 'verfuegbar' | 'subhire' | 'fehlt' | 'unbekannt'

/** Die vier Zustaende in der Reihenfolge, in der sie jemand abarbeitet. */
export const AMPEL_STUFEN: readonly Ampel[] = ['fehlt', 'subhire', 'unbekannt', 'verfuegbar']

export interface DeckungsZeile {
  bedarf: SeedBedarf
  ampel: Ampel
  /** Die gezaehlte Menge — fehlt, wo niemand gezaehlt hat. */
  gedeckt?: number
  /** Was ueber den eigenen Bestand hinaus gebraucht wird. Nur, wo gezaehlt ist. */
  fehlmenge?: number
  /** Warum die Ampel `unbekannt` zeigt — zwei verschiedene Auskuenfte. */
  unbekanntWeil?: 'keine-antwort' | 'nicht-gezaehlt'
  /**
   * Fuer welche Menge das Lager geantwortet hat, WENN das nicht die heutige
   * ist. Fehlt das Feld, galt die Antwort genau diesem Bedarf.
   */
  antwortFuer?: number
}

/**
 * Je Bedarfszeile die Ampel. Die Reihenfolge ist die des Bedarfs; eine
 * Antwort des Lagers zu einer Zeile, die der Plan nicht mehr fuehrt, faellt
 * heraus — sie beantwortet eine Frage, die niemand mehr stellt.
 */
export function deckungsAmpel(
  bedarf: readonly SeedBedarf[],
  deckung: readonly SeedDeckung[],
): DeckungsZeile[] {
  const antwort = new Map(deckung.map((d) => [d.key, d]))
  return bedarf.map((b): DeckungsZeile => {
    const d = antwort.get(b.key)
    if (!d) return { bedarf: b, ampel: 'unbekannt', unbekanntWeil: 'keine-antwort' }
    const veraltet = d.benoetigt !== b.quantity ? { antwortFuer: d.benoetigt } : {}
    if (d.gedeckt === undefined) {
      return { bedarf: b, ampel: 'unbekannt', unbekanntWeil: 'nicht-gezaehlt', ...veraltet }
    }
    const gedeckt = d.gedeckt
    const fehlmenge = Math.max(0, b.quantity - gedeckt)
    const ampel: Ampel = gedeckt >= b.quantity ? 'verfuegbar' : gedeckt > 0 ? 'subhire' : 'fehlt'
    return { bedarf: b, ampel, gedeckt, fehlmenge, ...veraltet }
  })
}

/** Wie viele Zeilen je Ampel — fuer die Kopfzeile einer Liste. */
export function zaehleAmpeln(zeilen: readonly DeckungsZeile[]): Record<Ampel, number> {
  const n: Record<Ampel, number> = { verfuegbar: 0, subhire: 0, fehlt: 0, unbekannt: 0 }
  for (const z of zeilen) n[z.ampel] += 1
  return n
}

import { describe, expect, it } from 'vitest'
import { imKameraplan } from '../src/geraet'
import { emptySeed, type SeedVenue, type SuiteSeed } from '../src/seed'
import {
  SEED_VENUE_OWNER,
  acceptProposal,
  conflictFieldName,
  mergeSeedPatch,
  type SeedVenueField,
} from '../src/seedOwnership'

// ───────────────────────────────────────────────────────────────────────────
// Eigentum je Feld (E-21).
//
// Die Zusicherung, die hier haengt, ist EINE: ein Planer kann ein Feld, das
// eine andere Stelle haelt, nicht still aendern. Sie zerfaellt in zwei
// Haelften, und beide muessen stimmen, sonst ist die Regel nutzlos:
//
//   * der Wert bleibt stehen  — sonst haette „letzter gewinnt" nur ein
//     anderes Gewand;
//   * der Widerspruch wird gemeldet — sonst ist der Verlust still, und still
//     ist genau das, was ADR-003 verbietet.
//
// Deshalb prueft fast jeder Test hier BEIDES und nie nur eines.
// ───────────────────────────────────────────────────────────────────────────

const seed = (venue: SeedVenue, holds?: SuiteSeed['holds']): SuiteSeed => ({
  ...emptySeed(3),
  venue,
  holds,
})

const HALLE: SeedVenue = { name: 'Halle A', widthM: 24, heightM: 14, stage: { x: 8, y: 3, w: 8, h: 3.2 } }

/** Alle geteilten Felder, aus der Tabelle abgeleitet statt hier aufgezaehlt. */
const GETEILT = (Object.entries(SEED_VENUE_OWNER) as [keyof SeedVenue, string][])
  .filter(([, eigner]) => eigner === 'shared')
  .map(([feld]) => `venue.${feld}` as SeedVenueField)

/** Ein Wert, der sich vom bisherigen unterscheidet — je Feldform. */
const anders = (feld: keyof SeedVenue): SeedVenue[keyof SeedVenue] =>
  feld === 'stage' ? { x: 0, y: 0, w: 1, h: 1 } : feld === 'name' ? 'Halle Z' : 99

describe('Eigentum je Feld — der Raum geht zurueck', () => {
  it('nimmt die erste Setzung an und traegt den Halter ein', () => {
    const { seed: nach, conflicts } = mergeSeedPatch(seed(HALLE), {
      domain: 'cameras',
      revision: 3,
      at: 1000,
      venue: { name: HALLE.name, widthM: 30 },
    })
    expect(nach.venue.widthM).toBe(30)
    expect(nach.holds?.['venue.widthM']).toEqual({ by: 'cameras', at: 1000 })
    expect(conflicts).toEqual([])
  })

  it('laesst den Halter sein eigenes Feld weiter aendern', () => {
    const vorher = seed({ ...HALLE, widthM: 30 }, { 'venue.widthM': { by: 'cameras', at: 1000 } })
    const { seed: nach, conflicts } = mergeSeedPatch(vorher, {
      domain: 'cameras',
      revision: 3,
      at: 2000,
      venue: { widthM: 31 },
    })
    expect(nach.venue.widthM).toBe(31)
    expect(nach.holds?.['venue.widthM']).toEqual({ by: 'cameras', at: 2000 })
    expect(conflicts).toEqual([])
  })

  it('meldet den Widerspruch einer anderen Stelle, statt zu ueberschreiben', () => {
    const vorher = seed({ ...HALLE, widthM: 30 }, { 'venue.widthM': { by: 'cameras', at: 1000 } })
    const { seed: nach, conflicts } = mergeSeedPatch(vorher, {
      domain: 'fixtures',
      revision: 3,
      at: 2000,
      venue: { widthM: 26 },
    })
    // Beide Haelften der Zusicherung.
    expect(nach.venue.widthM).toBe(30)
    expect(conflicts).toEqual([
      {
        field: 'venue.widthM',
        held: { value: 30, by: 'cameras', at: 1000 },
        proposed: { value: 26, by: 'fixtures', at: 2000 },
      },
    ])
  })

  it('meldet NICHT, wenn die andere Stelle denselben Wert nennt', () => {
    // Zwei Planer, die dieselbe Halle vermessen, widersprechen sich nicht.
    const vorher = seed({ ...HALLE, widthM: 30 }, { 'venue.widthM': { by: 'cameras', at: 1000 } })
    const { seed: nach, conflicts } = mergeSeedPatch(vorher, {
      domain: 'fixtures',
      revision: 3,
      at: 2000,
      venue: { widthM: 30 },
    })
    expect(conflicts).toEqual([])
    // Zustimmung ist keine Uebernahme: der Halter bleibt.
    expect(nach.holds?.['venue.widthM']).toEqual({ by: 'cameras', at: 1000 })
  })

  it('vergleicht die Buehne ueber ihre Zahlen und nicht ueber die Schluessel-Reihenfolge', () => {
    const vorher = seed(HALLE, { 'venue.stage': { by: 'fixtures', at: 1000 } })
    const { conflicts } = mergeSeedPatch(vorher, {
      domain: 'cameras',
      revision: 3,
      at: 2000,
      // Dieselben vier Zahlen, andere Reihenfolge im Objektliteral.
      venue: { stage: { h: 3.2, w: 8, y: 3, x: 8 } },
    })
    expect(conflicts).toEqual([])
  })

  it('meldet einen Widerspruch zu einem statisch besessenen Feld, ohne es zu aendern', () => {
    // `venue.name` gehoert der Shell. Ein Planer, der ihn korrigieren will,
    // bekommt keine Aenderung — aber auch kein Schweigen.
    const { seed: nach, conflicts } = mergeSeedPatch(seed(HALLE), {
      domain: 'fixtures',
      revision: 3,
      at: 2000,
      venue: { name: 'Halle B' },
    })
    expect(nach.venue.name).toBe('Halle A')
    expect(conflicts).toEqual([
      {
        field: 'venue.name',
        // Ohne `at`: es gibt keine gestempelte Setzung, und eine erfundene 0
        // saehe aus wie 1970.
        held: { value: 'Halle A', by: 'shell' },
        proposed: { value: 'Halle B', by: 'fixtures', at: 2000 },
      },
    ])
  })

  it('laesst ein nicht genanntes Feld in Ruhe', () => {
    // `undefined` heisst „keine Aussage", nicht „leeren".
    const { seed: nach } = mergeSeedPatch(seed(HALLE), {
      domain: 'cameras',
      revision: 3,
      venue: { widthM: 30 },
    })
    expect(nach.venue.heightM).toBe(14)
    expect(nach.venue.stage).toEqual(HALLE.stage)
  })

  it('verwirft auch den Raum, wenn die Revision ueberholt ist', () => {
    const vorher = seed(HALLE)
    const { seed: nach, conflicts } = mergeSeedPatch(vorher, {
      domain: 'cameras',
      revision: 2,
      venue: { widthM: 30 },
    })
    expect(nach).toBe(vorher)
    expect(conflicts).toEqual([])
  })

  it('faehrt Raum und Domaene in derselben Meldung', () => {
    const { seed: nach } = mergeSeedPatch(seed(HALLE), {
      domain: 'cameras',
      revision: 3,
      at: 1000,
      venue: { widthM: 30 },
      geraete: [{ id: 'k9', name: 'CAM 9', kategorie: 'Cameras' }],
    })
    expect(nach.venue.widthM).toBe(30)
    expect(imKameraplan(nach.geraete).map((c) => c.id)).toEqual(['k9'])
  })
})

describe('Eigentum je Feld — jedes geteilte Feld, aus der Tabelle', () => {
  // Aus SEED_VENUE_OWNER abgeleitet und nicht hier aufgezaehlt: ein neues
  // geteiltes Feld ist damit automatisch mitgeprueft. Ein neues Feld, das
  // NIEMAND eintraegt, ist schon ein Typfehler (`satisfies`) — die beiden
  // zusammen lassen keine Luecke.
  it.each(GETEILT)('%s: fremde Setzung wird gemeldet und nicht uebernommen', (pfad) => {
    const feld = conflictFieldName(pfad)
    const vorher = seed(HALLE, { [pfad]: { by: 'cameras', at: 1000 } })
    const neu = anders(feld)
    const { seed: nach, conflicts } = mergeSeedPatch(vorher, {
      domain: 'fixtures',
      revision: 3,
      at: 2000,
      venue: { [feld]: neu },
    })
    expect(nach.venue[feld]).toEqual(HALLE[feld])
    expect(conflicts.map((c) => c.field)).toEqual([pfad])
  })
})

describe('Einen Befund aufloesen', () => {
  it('uebernimmt den Vorschlag und verschiebt den Halter', () => {
    const vorher = seed({ ...HALLE, widthM: 30 }, { 'venue.widthM': { by: 'cameras', at: 1000 } })
    const { conflicts } = mergeSeedPatch(vorher, {
      domain: 'fixtures',
      revision: 3,
      at: 2000,
      venue: { widthM: 26 },
    })
    const nach = acceptProposal(vorher, conflicts[0])
    expect(nach.venue.widthM).toBe(26)
    expect(nach.holds?.['venue.widthM']).toEqual({ by: 'fixtures', at: 2000 })
  })

  it('laesst bei einem statisch besessenen Feld die Zustaendigkeit, wo sie ist', () => {
    // Sonst haette ein Planer sich ueber einen angenommenen Vorschlag den
    // Raum-Namen angeeignet.
    const vorher = seed(HALLE)
    const { conflicts } = mergeSeedPatch(vorher, {
      domain: 'fixtures',
      revision: 3,
      at: 2000,
      venue: { name: 'Halle B' },
    })
    const nach = acceptProposal(vorher, conflicts[0])
    expect(nach.venue.name).toBe('Halle B')
    expect(nach.holds?.['venue.name' as SeedVenueField]).toBeUndefined()
  })
})

describe('Die Lage im Raum aus dem Signalplan', () => {
  // „Raum in 3D" zeigte Mischer und Switch nie: den Raum setzten nur Kamera-
  // und Lichtplan, und die platzieren keinen Mischer. Der Signalplan darf ihn
  // jetzt dorthin stellen — aber nur Geraete, die kein anderer Plan fuehrt.
  const mit = (geraete: SuiteSeed['geraete']): SuiteSeed => ({ ...seed(HALLE), geraete })

  it('stellt einen Mischer dorthin, wo er auf dem vermessenen Plan liegt', () => {
    const { seed: nach } = mergeSeedPatch(mit([{ id: 'atem', name: 'ATEM', kategorie: 'Video Mixer' }]), {
      domain: 'signal',
      revision: 3,
      geraete: [{ id: 'atem', name: 'ATEM', kategorie: 'Video Mixer', x: 18.5, y: 3.2 }],
    })
    expect(nach.geraete[0]).toMatchObject({ x: 18.5, y: 3.2 })
  })

  it('laesst die Stelle einer Kamera dem Kameraplan', () => {
    const { seed: nach } = mergeSeedPatch(mit([{ id: 'cam1', name: 'CAM 1', kamera: {}, x: 4.2, y: 10.8 }]), {
      domain: 'signal',
      revision: 3,
      geraete: [{ id: 'cam1', name: 'CAM 1', x: 9, y: 9 }],
    })
    expect(nach.geraete[0]).toMatchObject({ x: 4.2, y: 10.8 })
  })

  it('ohne Lage gemeldet heisst keine Aussage — die bisherige bleibt', () => {
    const { seed: nach } = mergeSeedPatch(mit([{ id: 'hub', name: 'Hub', x: 2, y: 3 }]), {
      domain: 'signal',
      revision: 3,
      geraete: [{ id: 'hub', name: 'Videohub' }],
    })
    expect(nach.geraete[0]).toMatchObject({ name: 'Videohub', x: 2, y: 3 })
  })

  it('nimmt keine halbe Lage', () => {
    const { seed: nach } = mergeSeedPatch(mit([{ id: 'hub', name: 'Hub' }]), {
      domain: 'signal',
      revision: 3,
      geraete: [{ id: 'hub', name: 'Hub', x: 2 }],
    })
    expect(nach.geraete[0].x).toBeUndefined()
  })
})

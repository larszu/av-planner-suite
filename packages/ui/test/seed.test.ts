import { describe, expect, it } from 'vitest'
import {
  SUITE_SEED_KIND,
  SUITE_SEED_VERSION,
  emptySeed,
  isSuiteSeed,
  seedContentCount,
  type SuiteSeed,
} from '../src/seed'
import { alsKameras, alsLeuchten, alsSignalGeraete } from '../src/geraet'
import { mergeSeedPatch } from '../src/seedOwnership'

// ───────────────────────────────────────────────────────────────────────────
// Das Protokoll selbst — vor allem die Revisions-Regel.
//
// Sie ist der Grund, warum diese Bruecke keine Schleife dreht: die Shell
// schiebt einen Seed, der Planer meldet seine Domaene zurueck, die Shell
// arbeitet sie ein — und wuerde ohne die Regel sofort einen neuen Seed mit
// hoeherer Revision schicken, den der Planer erneut uebernimmt. Das kostet
// nicht nur Runden, es ueberschreibt die naechste Aenderung im Planer.
// ───────────────────────────────────────────────────────────────────────────

// Seit ADR-011 Stufe 2 ist `geraete` die Wahrheit und die drei Listen sind
// Sichten. Der Aufbau hier baut deshalb die eine Liste und rechnet die
// Sichten daraus — genau wie die Shell es tut. Wer hier die Sichten von Hand
// setzte, pruefte einen Zustand, den es im Betrieb nicht gibt.
const geraete = [
  { id: 'd1', name: 'A' },
  { id: 'k1', name: 'CAM 1', kategorie: 'Cameras' },
  { id: 'f1', name: 'LX 1', kategorie: 'Lights' },
]

const seed = (over: Partial<SuiteSeed> = {}): SuiteSeed => ({
  ...emptySeed(3),
  geraete,
  devices: alsSignalGeraete(geraete),
  cables: [{ id: 'c1', label: 'V-1', type: '12G-SDI', from: 'd1', to: 'd1' }],
  cameras: alsKameras(geraete),
  fixtures: alsLeuchten(geraete),
  ...over,
})

describe('suite-seed — Formpruefung', () => {
  it('erkennt einen gueltigen Seed', () => {
    expect(isSuiteSeed(seed())).toBe(true)
  })

  it('weist alles zurueck, was nur so aussieht', () => {
    expect(isSuiteSeed(null)).toBe(false)
    expect(isSuiteSeed({ kind: SUITE_SEED_KIND })).toBe(false)
    expect(isSuiteSeed({ ...seed(), formatVersion: SUITE_SEED_VERSION + 1 })).toBe(false)
    expect(isSuiteSeed({ ...seed(), devices: 'viele' })).toBe(false)
  })

  it('zaehlt den Inhalt ueber alle Domaenen', () => {
    expect(seedContentCount(seed())).toBe(4)
    expect(seedContentCount(emptySeed())).toBe(0)
  })
})

describe('suite-seed — Rueckmeldung einarbeiten', () => {
  it('ruehrt nur an, was der Melder besitzt', () => {
    const vorher = seed()
    const nachher = mergeSeedPatch(vorher, { domain: 'cameras', revision: 3, cameras: [] }).seed

    // Der Kameraplan hat seine Kamera geloescht — das darf er, sie gehoert
    // ihm.
    expect(nachher.cameras).toEqual([])
    expect(nachher.geraete.map((g) => g.id)).toEqual(['d1', 'f1'])

    // Alles andere unangetastet: ein Kamera-Planer sagt nichts ueber Kabel,
    // ueber den Mischer im Signalweg oder ueber die Leuchte. Seit ADR-011
    // Stufe 2 haengt das nicht mehr daran, dass er eine andere LISTE
    // beschreibt, sondern daran, dass ihm diese GERAETE nicht gehoeren.
    expect(nachher.devices.map((d) => d.id)).toEqual(['d1', 'f1'])
    expect(nachher.cables).toEqual(vorher.cables)
    expect(nachher.fixtures).toEqual(vorher.fixtures)
  })

  it('und eine Meldung loescht nicht, was in einem anderen Plan steht', () => {
    // Der Kameraplan meldet nur seine eine Kamera. Der Mischer `d1` und die
    // Leuchte `f1` stehen nicht in seiner Meldung — und bleiben trotzdem.
    const nachher = mergeSeedPatch(seed(), {
      domain: 'cameras',
      revision: 3,
      cameras: [{ id: 'k1', name: 'CAM 1 neu', focalMm: 50 }],
    }).seed
    expect(nachher.geraete.map((g) => g.id).sort()).toEqual(['d1', 'f1', 'k1'])
    expect(nachher.geraete.find((g) => g.id === 'k1')!.kamera?.focalMm).toBe(50)
    // Und die Kategorie, die er nicht gemeldet hat, steht noch da.
    expect(nachher.geraete.find((g) => g.id === 'k1')!.kategorie).toBe('Cameras')
  })

  it('nimmt bei „signal" Geraete und Kabel zusammen', () => {
    const nachher = mergeSeedPatch(seed(), {
      domain: 'signal',
      revision: 3,
      devices: [{ id: 'd2', name: 'B' }],
      cables: [],
    }).seed
    // Der Signalplan zeigt ALLE Geraete und darf sie deshalb auch entfernen:
    // er hat `d1`, `k1` und `f1` nicht mehr gemeldet.
    expect(nachher.devices.map((d) => d.id)).toEqual(['d2'])
    expect(nachher.geraete.map((g) => g.id)).toEqual(['d2'])
    expect(nachher.cables).toEqual([])
  })

  it('verwirft eine Meldung, die auf einer alten Revision beruht', () => {
    // Der Planer hatte einen ueberholten Stand — seine Meldung wuerde neueren
    // Inhalt mit aelterem ueberschreiben.
    const vorher = seed()
    expect(mergeSeedPatch(vorher, { domain: 'cameras', revision: 2, cameras: [] }).seed).toBe(vorher)
  })

  it('laesst die Revision stehen', () => {
    // Genau das schneidet die Echo-Schleife ab: der eingearbeitete Stand ist
    // KEIN neuer Seed fuer den Planer, der ihn gerade gemeldet hat.
    const nachher = mergeSeedPatch(seed(), { domain: 'fixtures', revision: 3, fixtures: [] }).seed
    expect(nachher.revision).toBe(3)
  })

  it('aendert nichts, wenn die Domaene ohne Daten gemeldet wird', () => {
    const vorher = seed()
    expect(mergeSeedPatch(vorher, { domain: 'cameras', revision: 3 }).seed).toBe(vorher)
  })
})

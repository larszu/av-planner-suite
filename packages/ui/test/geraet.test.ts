// ───────────────────────────────────────────────────────────────────────────
// EIN Gerät, viele Pläne (ADR-011).
//
//  1. Die Kategorie ordnet zu — mehreren Plänen zugleich, nicht einem.
//  2. „Keine Kategorie" heißt Vorgabe, nicht „nirgends".
//  3. Zusammengelegt wird nur über die ERKLÄRTE Entsprechung.
//  4. Die alten Ids fahren mit, sonst wäre jede Kamera eine neue.
//  5. Der Signalplan sieht alles — das war der Auftrag.
//  6. „Nicht angegeben" bleibt weg und wird nicht zu null.
//  7. Derselbe Baum ergibt dieselbe Liste.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  alsKameras,
  alsLeuchten,
  alsSignalGeraete,
  gehoertZu,
  geraeteAus,
  gewerkeFuer,
} from '../src/geraet'

const knoten = { id: 'n_cam2', name: 'CAM 2 — Sony FX9', subtitle: '3x SDI Out', nx: 0.1, ny: 0.4 }
const kamera = { id: 'cam2', name: 'CAM 2', model: 'Sony FX9', lens: 'FE 24–105 f/4', focalMm: 85, hfovDeg: 12.4, x: 12, y: 11.6 }
const leuchte = { id: 'lx1', name: 'LX 1', model: 'ETC S4 19°', purpose: 'Key Host', dimmerPct: 82, dmxChannel: 1, x: 8.6, y: 5.6 }
const mischer = { id: 'n_atem', name: 'ATEM Constellation 8K', kategorie: 'Video Mixer', nx: 0.6, ny: 0.2 }

describe('ADR-011 — ein Gerät, viele Pläne', () => {
  it('1. die Kategorie ordnet zu, und zwar mehreren Plänen zugleich', () => {
    // Eine Kamera hat Anschlüsse UND einen Standort. Ein „entweder/oder" wäre
    // genau die Trennung, die das ADR aufhebt.
    expect(gewerkeFuer('Cameras')).toEqual(['kamera', 'signal'])
    expect(gewerkeFuer('Video Mixer')).toEqual(['signal'])
    expect(gehoertZu('Cameras', 'signal')).toBe(true)
    expect(gehoertZu('Video Mixer', 'kamera')).toBe(false)
  })

  it('2. „keine Kategorie" heißt Vorgabe, nicht „nirgends"', () => {
    // Ein von Hand angelegtes Gerät ohne Katalog-Zuordnung ist trotzdem ein
    // Gerät im Plan.
    expect(gewerkeFuer(undefined)).toEqual(['signal'])
    expect(gewerkeFuer('gibt-es-nicht')).toEqual(['signal'])
    expect(gehoertZu(undefined, 'signal')).toBe(true)
    expect(gehoertZu(undefined, 'kamera')).toBe(false)
  })

  it('3. zusammengelegt wird nur über die erklärte Entsprechung', () => {
    // MIT `represents`: ein Gerät.
    const eins = geraeteAus(
      [{ ...knoten, represents: { kind: 'camera' as const, id: 'cam2' } }],
      [kamera],
      [],
    )
    expect(eins).toHaveLength(1)
    expect(eins[0].kamera).toEqual({ lens: 'FE 24–105 f/4', focalMm: 85, hfovDeg: 12.4 })
    expect(eins[0].kategorie).toBe('Cameras')

    // OHNE: zwei Geräte — und das ist die richtige Antwort. Zwei Datensätze
    // ohne erklärte Verbindung SIND zwei Dinge, bis jemand etwas anderes
    // sagt (ADR-002). Die Namensähnlichkeit wird nicht ausgewertet.
    const zwei = geraeteAus([knoten], [kamera], [])
    expect(zwei).toHaveLength(2)
  })

  it('4. die alten Ids fahren mit', () => {
    // Ohne sie wäre jede Kamera in jedem bestehenden Projekt eine neue —
    // samt verlorener Ausrichtung, Brennweite und Höhe.
    const g = geraeteAus(
      [{ ...knoten, represents: { kind: 'camera' as const, id: 'cam2' } }],
      [kamera],
      [],
    )
    expect(g[0].id).toBe('n_cam2')
    expect(g[0].altIds).toEqual({ kamera: 'cam2' })
    expect(alsKameras(g)[0].id).toBe('cam2')
    expect(alsSignalGeraete(g)[0].id).toBe('n_cam2')
  })

  it('5. der Signalplan sieht alles — das war der Auftrag', () => {
    const g = geraeteAus([mischer], [kamera], [leuchte])
    // „Alle Kameras aus Multicam planner sind auch in Cable planner."
    expect(alsSignalGeraete(g).map((d) => d.id)).toEqual(['n_atem', 'cam2', 'lx1'])
    // Und die Fachsichten bleiben ihre Fachsichten.
    expect(alsKameras(g).map((c) => c.id)).toEqual(['cam2'])
    expect(alsLeuchten(g).map((f) => f.id)).toEqual(['lx1'])
  })

  it('6. „nicht angegeben" bleibt weg', () => {
    const g = geraeteAus([], [{ id: 'cam9', name: 'CAM 9' }], [])
    // Kein `x: 0`, kein `focalMm: 0`: die Null wäre eine Behauptung über
    // Standort und Optik. Der Schlüssel fehlt, und das ist die Aussage.
    expect('x' in g[0]).toBe(false)
    expect(g[0].kamera).toEqual({})
    const sicht = alsKameras(g)[0]
    expect('x' in sicht).toBe(false)
    expect('focalMm' in sicht).toBe(false)
  })

  it('7. derselbe Baum ergibt dieselbe Liste, in der Ordnung des Plans', () => {
    const bau = () => geraeteAus([mischer], [kamera], [leuchte])
    expect(bau()).toEqual(bau())
    // Erst die Knoten (der Signalplan führt die Hardware), dann was in keinem
    // Knoten aufging.
    expect(bau().map((g) => g.id)).toEqual(['n_atem', 'cam2', 'lx1'])
  })
})

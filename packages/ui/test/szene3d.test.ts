// suite#258 — die Show als 3D-Szene aus dem Seed, ohne WebGL gerechnet.
import { describe, expect, it } from 'vitest'
import { hauptGewerk, szeneAusSeed } from '../src/szene3d'
import type { SeedGeraet } from '../src/geraet'
import type { SeedCable } from '../src/seed'

const venue = { name: 'Halle 3', widthM: 40, heightM: 25, stage: { x: 10, y: 2, w: 20, h: 8 } }
const g = (id: string, over: Partial<SeedGeraet>): SeedGeraet => ({ id, name: id, ...over })
const kabel = (id: string, from: string, to: string): SeedCable => ({ id, label: id, type: '12G-SDI', from, to })

describe('szeneAusSeed', () => {
  const geraete = [
    g('cam1', { kamera: { lens: 'UA24x7.8', focalMm: 50 }, x: 20, y: 18 }),
    g('par1', { licht: { rigHeightM: 7.5 }, x: 15, y: 4 }),
    g('par2', { licht: {}, x: 25, y: 4 }),
    g('atem', { kategorie: 'Video Mixer', x: 38, y: 24 }),
    g('lose', { kategorie: 'Cameras' }),
  ]

  it('Raum, Buehne und platzierte Geraete in Metern, y nach oben', () => {
    const s = szeneAusSeed({ venue, geraete, cables: [] })
    expect(s.raum).toEqual({ name: 'Halle 3', breite: 40, tiefe: 25 })
    expect(s.buehne).toEqual({ x: 10, z: 2, breite: 20, tiefe: 8 })
    expect(s.geraete.find((x) => x.id === 'par1')).toMatchObject({ gewerk: 'licht', pos: { x: 15, y: 7.5, z: 4 }, hoeheBekannt: true })
    expect(s.geraete.find((x) => x.id === 'cam1')?.gewerk).toBe('kamera')
    expect(s.geraete.find((x) => x.id === 'atem')?.gewerk).toBe('signal')
  })

  it('erfindet nichts: ohne Lage nicht gezeichnet, ohne Haenge-Hoehe am Boden und so markiert', () => {
    const s = szeneAusSeed({ venue, geraete, cables: [] })
    expect(s.nichtPlatziert).toBe(1)
    expect(s.geraete.some((x) => x.id === 'lose')).toBe(false)
    expect(s.geraete.find((x) => x.id === 'par2')).toMatchObject({ pos: { y: 0 }, hoeheBekannt: false })
  })

  it('Kabel zwischen platzierten Geraeten; eines mit offenem Ende wird gezaehlt', () => {
    const s = szeneAusSeed({ venue, geraete, cables: [kabel('k1', 'cam1', 'atem'), kabel('k2', 'lose', 'atem')] })
    expect(s.kabel).toEqual([{ id: 'k1', label: 'k1', von: { x: 20, y: 0, z: 18 }, nach: { x: 38, y: 0, z: 24 } }])
    expect(s.kabelOhneLage).toBe(1)
  })

  it('ohne Raummasse kein Raum — und trotzdem eine Kamera-Ausdehnung', () => {
    const s = szeneAusSeed({ venue: { name: 'X' }, geraete: [], cables: [] })
    expect(s.raum).toBeNull()
    expect(s.groesse).toBeGreaterThan(0)
  })
})

describe('hauptGewerk', () => {
  it('die Gruppe am Geraet schlaegt die Kategorie', () => {
    expect(hauptGewerk({ kategorie: 'Lights', kamera: {} })).toBe('kamera')
    expect(hauptGewerk({ kategorie: 'Lights' })).toBe('licht')
    expect(hauptGewerk({})).toBe('signal')
  })
})

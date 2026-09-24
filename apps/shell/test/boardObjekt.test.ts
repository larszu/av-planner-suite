import { describe, expect, it } from 'vitest'
import { objektAnzeige, objektKandidaten, type PlanAusschnitt } from '../src/data/boardObjekt'
import { boardToMarkdown, cardHeight } from '../src/data/board'
import { PROJECT, heimatPlan, type BoardCard } from '../src/data/project'
import { suiteToSeed } from '../src/data/seed'

// ───────────────────────────────────────────────────────────────────────────
// suite#259 — Objekt-Karten: das Board zeigt, was der PLAN sagt.
//
// Die Karte fuehrt nur `{ art, id }`. Alles, was sie zeigt, wird aus dem Seed
// gelesen — die Tests halten deshalb fest, dass eine Aenderung am Plan ohne
// jeden Schreibzugriff auf die Karte auf ihr erscheint, und dass ein
// verschwundenes Objekt als verschwunden dasteht und nicht als leere Karte.
// ───────────────────────────────────────────────────────────────────────────

const plan: PlanAusschnitt = suiteToSeed(PROJECT, 0)

const karte = (art: 'geraet' | 'kabel', id: string): BoardCard => ({
  id: 'k1',
  type: 'object',
  x: 0,
  y: 0,
  w: 230,
  ref: { art, id },
})

describe('objektAnzeige', () => {
  it('eine Kamera zeigt Name, Modell, Kategorie und Objektiv samt Brennweite', () => {
    const a = objektAnzeige(karte('geraet', 'cam3'), plan)
    expect(a).toMatchObject({
      status: 'da',
      art: 'geraet',
      name: 'CAM 3',
      model: 'Sony VENICE 2',
      kategorie: 'Cameras',
      modul: 'cameras',
      kamera: { lens: 'FE 70–200 f/2.8', focalMm: 135, hfovDeg: 7.9 },
    })
  })

  it('eine Leuchte zeigt Zweck und DMX-Kanal und springt in den Lichtplan', () => {
    const a = objektAnzeige(karte('geraet', 'lx1'), plan)
    expect(a).toMatchObject({ status: 'da', modul: 'licht', licht: { purpose: 'Key Host', dmxChannel: 1 } })
    // Die Dimmer-Stellung ist eine Einstellung der Probe, keine Eigenschaft
    // des Objekts — sie steht nicht auf der Karte.
    expect((a as { licht?: Record<string, unknown> }).licht).not.toHaveProperty('dimmerPct')
  })

  it('ein Mischer ohne Gewerks-Felder springt in den Signalplan', () => {
    expect(objektAnzeige(karte('geraet', 'n_atem'), plan)).toMatchObject({
      status: 'da',
      modul: 'signal',
      sub: '40× 12G-SDI In',
    })
  })

  it('ein Kabel zeigt Typ, Laenge und die NAMEN seiner Enden', () => {
    expect(objektAnzeige(karte('kabel', 'v012'), plan)).toEqual({
      status: 'da',
      art: 'kabel',
      id: 'v012',
      label: 'V-012 · CAM2 PGM',
      type: '12G-SDI',
      lengthM: 45,
      von: { id: 'cam2', name: 'CAM 2 — Sony FX9' },
      nach: { id: 'n_atem', name: 'ATEM Constellation 8K' },
      modul: 'signal',
    })
  })

  it('ein Kabelende, dessen Geraet fehlt, behaelt seine Id und bekommt keinen Namen', () => {
    const ohneAtem: PlanAusschnitt = { ...plan, geraete: plan.geraete.filter((g) => g.id !== 'n_atem') }
    const a = objektAnzeige(karte('kabel', 'v012'), ohneAtem)
    expect(a).toMatchObject({ nach: { id: 'n_atem' } })
    expect((a as { nach: { name?: string } }).nach.name).toBeUndefined()
  })

  it('ein verschwundenes Objekt ist `weg` und nennt den letzten Verweis', () => {
    const ohneCam3: PlanAusschnitt = { ...plan, geraete: plan.geraete.filter((g) => g.id !== 'cam3') }
    expect(objektAnzeige(karte('geraet', 'cam3'), ohneCam3)).toEqual({
      status: 'weg',
      ref: { art: 'geraet', id: 'cam3' },
    })
  })

  it('ohne geoeffneten Plan ist nichts verschwunden — die Karte sagt `ohne-plan`', () => {
    // Der Notizzettel-Betrieb: kein Projekt, also nichts, wogegen die Karte
    // aufgeloest werden koennte. „Nicht mehr im Plan" behauptete hier einen
    // Verlust, den niemand festgestellt hat.
    expect(objektAnzeige(karte('geraet', 'cam3'), undefined)).toEqual({
      status: 'ohne-plan',
      ref: { art: 'geraet', id: 'cam3' },
    })
    // Ein LEERER Plan ist dagegen ein Plan: dort fehlt das Objekt wirklich.
    expect(objektAnzeige(karte('geraet', 'cam3'), { geraete: [], cables: [] }).status).toBe('weg')
  })

  it('sucht nur in der Liste, die der Verweis nennt', () => {
    // `v012` ist ein Kabel. Als Geraet gibt es das nicht — ueber Listen
    // hinweg zu suchen waere ein geratener Treffer.
    expect(objektAnzeige(karte('geraet', 'v012'), plan).status).toBe('weg')
  })

  it('liest LIVE: umbenannt im Plan heisst die Karte anders, ohne dass sie angefasst wird', () => {
    const k = karte('geraet', 'cam1')
    const umbenannt: PlanAusschnitt = {
      ...plan,
      geraete: plan.geraete.map((g) =>
        g.id === 'cam1' ? { ...g, name: 'CAM 1 — Totale', kamera: { ...g.kamera, focalMm: 28 } } : g,
      ),
    }
    expect(objektAnzeige(k, umbenannt)).toMatchObject({ name: 'CAM 1 — Totale', kamera: { focalMm: 28 } })
    // Und die Karte selbst traegt nichts davon.
    expect(Object.keys(k).sort()).toEqual(['id', 'ref', 'type', 'w', 'x', 'y'])
  })
})

describe('heimatPlan — derselbe Ort fuer Karte und Zeig-Bitte', () => {
  it('Kamera vor Licht vor Signal', () => {
    expect(heimatPlan({ kategorie: 'Cameras' })).toBe('cameras')
    expect(heimatPlan({ kategorie: 'Licht' })).toBe('licht')
    expect(heimatPlan({ kategorie: 'Video Mixer' })).toBe('signal')
    // Wer Kamerafelder traegt, steht im Kameraplan — was immer die Kategorie sagt.
    expect(heimatPlan({ kategorie: 'Other', kamera: { focalMm: 50 } })).toBe('cameras')
  })
})

describe('objektKandidaten — der Auswahl-Dialog', () => {
  it('bietet alle Geraete und alle Kabel an', () => {
    const alle = objektKandidaten(plan)
    expect(alle.filter((c) => c.ref.art === 'geraet')).toHaveLength(plan.geraete.length)
    expect(alle.filter((c) => c.ref.art === 'kabel')).toHaveLength(plan.cables.length)
  })

  it('findet ueber Modell, Kabeltyp und die Namen der Enden', () => {
    expect(objektKandidaten(plan, 'venice').map((c) => c.ref.id)).toEqual(['cam3'])
    expect(objektKandidaten(plan, 'dmx512').map((c) => c.ref.id)).toEqual(['dmx03'])
    expect(objektKandidaten(plan, 'constellation').map((c) => c.ref)).toContainEqual({ art: 'kabel', id: 'v021' })
  })
})

describe('Board-Logik kennt die Objekt-Karte', () => {
  it('hat eine feste Hoehe — sie waechst nicht mit den Live-Daten', () => {
    expect(cardHeight(karte('geraet', 'cam1'))).toBe(cardHeight(karte('kabel', 'v012')))
  })

  it('der Markdown-Export nennt, was der Plan jetzt sagt — und das Fehlen', () => {
    const md = boardToMarkdown(
      { cards: [karte('geraet', 'cam3'), { ...karte('geraet', 'weg'), id: 'k2' }], connections: [] },
      'Board',
      plan,
    )
    expect(md).toContain('- CAM 3 (Sony VENICE 2)')
    expect(md).toContain('- Objekt nicht mehr im Plan (weg)')
    expect(boardToMarkdown({ cards: [karte('kabel', 'v012')], connections: [] }, 'Board')).toContain(
      '- Plan-Objekt v012 (kein Plan geöffnet)',
    )
  })
})

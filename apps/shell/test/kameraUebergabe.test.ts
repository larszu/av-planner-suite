// ───────────────────────────────────────────────────────────────────────────
// Die Kamera aus dem Signalplan im Kameraplan (Nutzer-Auftrag 2026-09-19).
//
// Was hier geprüft wird, und warum jede Zeile davon nötig ist:
//
//  1. NUR DIE KATALOG-AUSSAGE ZÄHLT. Ein Knoten, der „Kamera 1" heißt, aber
//     keine Typaussage trägt, ergibt keinen Vorschlag — sonst wäre die
//     Namens-Heuristik wieder da, die ADR-002 abgeschafft hat.
//  2. WAS SCHON ENTSCHIEDEN IST, WIRD NICHT WIEDER GEFRAGT.
//  3. ÜBERNEHMEN HEISST BEIDES: Kamera anlegen UND Zuordnung erklären. Nur
//     das erste wäre die Doppelzählung, die `deriveBedarf` eigens vermeidet.
//  4. KEINE POSITION WIRD GERATEN.
//  5. DAS MODELL UND NICHT DER INSTANZNAME.
//  6. ZWEIMAL ÜBERNEHMEN LEGT NICHT ZWEIMAL AN.
//  7. DERSELBE BAUM ERGIBT DIESELBE LISTE.
// ───────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import {
  kameraIdFuer,
  kameraVorschlaege,
  lehneKameraAb,
  uebernimmKamera,
} from '../src/data/kameraUebergabe'
import { PROJECT } from '../src/data/project'
import type { SignalNode, SuiteProject } from '../src/data/project'

const knoten = (over: Partial<SignalNode> & { id: string }): SignalNode => ({
  name: 'Knoten',
  sub: '',
  group: 'floor',
  venue: true,
  nx: 0.5,
  ny: 0.5,
  ...over,
})

/** Ein Projekt ohne Kameras und ohne Knoten — die Fälle kommen je Test dazu. */
const leer = (nodes: SignalNode[], over: Partial<SuiteProject> = {}): SuiteProject => ({
  ...PROJECT,
  cameras: [],
  nodes,
  ...over,
})

describe('Kamera-Übergabe Signalplan → Kameraplan', () => {
  it('1. nur die Katalog-Aussage zählt, nicht der Name', () => {
    const p = leer([
      knoten({ id: 'n1', name: 'Kamera 1' }),
      knoten({ id: 'n2', name: 'Irgendwas', gewerk: 'camera' }),
    ])
    expect(kameraVorschlaege(p).map((v) => v.nodeId)).toEqual(['n2'])
  })

  it('2. was entschieden ist, wird nicht wieder gefragt', () => {
    const n = knoten({ id: 'n1', name: 'CAM 1', gewerk: 'camera' })

    // Zuordnung steht schon.
    expect(
      kameraVorschlaege(leer([{ ...n, represents: { kind: 'camera', id: 'cam1' } }])),
    ).toEqual([])

    // Abgelehnt.
    const abgelehnt = lehneKameraAb(leer([n]), 'n1')
    expect(kameraVorschlaege(abgelehnt)).toEqual([])
    // Die Ablehnung ist idempotent — zweimal „nein" ist ein Eintrag.
    expect(lehneKameraAb(abgelehnt, 'n1')).toBe(abgelehnt)
    // Und sie lässt die Katalog-Aussage stehen: abgelehnt ist die ÜBERNAHME.
    expect(abgelehnt.nodes[0].gewerk).toBe('camera')

    // Die Kamera existiert bereits unter der abgeleiteten Id (Zustand nach
    // einem Undo, bei dem `represents` zurückfiel).
    const mitKamera = leer([n], {
      cameras: [{ id: kameraIdFuer('n1'), name: 'CAM 1', model: '', lens: '', focalMm: 0, hfovDeg: 0, linked: false }],
    })
    expect(kameraVorschlaege(mitKamera)).toEqual([])
  })

  it('3. übernehmen legt die Kamera an UND erklärt die Zuordnung', () => {
    const p = leer([knoten({ id: 'n1', name: 'CAM 1', gewerk: 'camera', model: 'Sony FX9' })])
    const next = uebernimmKamera(p, 'n1')

    expect(next.cameras).toHaveLength(1)
    const id = kameraIdFuer('n1')
    expect(next.cameras[0].id).toBe(id)
    // Ohne die Zuordnung zählte der Bedarf Knoten und Kamera als zwei Geräte.
    expect(next.nodes[0].represents).toEqual({ kind: 'camera', id })
    // Das Projekt ist danach ungespeichert — sonst verschwände die Übernahme
    // beim nächsten Schließen, ohne dass jemand gefragt wird.
    expect(next.meta.saved).toBe(false)
  })

  it('4. keine Position wird geraten', () => {
    // Der Knoten steht rechts unten auf der Zeichenfläche. Mal Hallenbreite
    // gerechnet ergäbe das Meter — und die wären eine Behauptung.
    const p = leer([knoten({ id: 'n1', name: 'CAM 1', gewerk: 'camera', nx: 0.9, ny: 0.8 })])
    const cam = uebernimmKamera(p, 'n1').cameras[0]
    expect(cam.x).toBeUndefined()
    expect(cam.y).toBeUndefined()
    // Und genauso wenig wird eine Optik erfunden: das sind Angaben des
    // Kameraplans, und er meldet sie beim Platzieren zurück.
    expect(cam.lens).toBe('')
    expect(cam.focalMm).toBe(0)
    expect(cam.linked).toBe(false)
  })

  it('5. das Modell und nicht der Instanzname', () => {
    const p = leer([
      knoten({ id: 'n1', name: 'CAM 1', sub: '3x SDI Out', gewerk: 'camera', model: 'Sony FX9' }),
      knoten({ id: 'n2', name: 'CAM 2', sub: '3x SDI Out', gewerk: 'camera' }),
    ])
    // `sub` ist eine Beschreibung und taugt drüben zu nichts.
    expect(uebernimmKamera(p, 'n1').cameras[0].model).toBe('Sony FX9')
    expect(kameraVorschlaege(p)[0].model).toBe('Sony FX9')
    // Ohne Modell bleibt es leer — und der Streifen sagt es, statt drüben
    // stillschweigend auszulassen.
    expect(uebernimmKamera(p, 'n2').cameras[0].model).toBe('')
    expect(kameraVorschlaege(p)[1].model).toBeUndefined()
  })

  it('6. zweimal übernehmen legt nicht zweimal an', () => {
    const p = leer([knoten({ id: 'n1', name: 'CAM 1', gewerk: 'camera' })])
    const einmal = uebernimmKamera(p, 'n1')
    // Unverändert zurück, nicht als neues Objekt: der Aufrufer erkennt daran,
    // dass nichts passiert ist, und schreibt keinen Historien-Eintrag.
    expect(uebernimmKamera(einmal, 'n1')).toBe(einmal)
    expect(einmal.cameras).toHaveLength(1)

    // Ein Knoten, der gar keine Kamera ist, ebenso.
    const fremd = leer([knoten({ id: 'n9', name: 'ATEM' })])
    expect(uebernimmKamera(fremd, 'n9')).toBe(fremd)
    expect(uebernimmKamera(fremd, 'gibt-es-nicht')).toBe(fremd)
  })

  it('7. derselbe Baum ergibt dieselbe Liste, in der Ordnung des Plans', () => {
    const p = leer([
      knoten({ id: 'b', name: 'CAM 2', gewerk: 'camera' }),
      knoten({ id: 'a', name: 'CAM 1', gewerk: 'camera' }),
    ])
    expect(kameraVorschlaege(p)).toEqual(kameraVorschlaege(p))
    expect(kameraVorschlaege(p).map((v) => v.nodeId)).toEqual(['b', 'a'])
  })
})

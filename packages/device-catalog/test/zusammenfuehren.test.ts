// ───────────────────────────────────────────────────────────────────────────
// Ein Katalog aus mehreren Quellen (ADR-002 Eigentumsregel, Befund A).
//
//  1. Eine Id, ein Eintrag — und die Herkunft steht dabei.
//  2. Ergänzen ist kein Widerspruch: wo die eine Quelle schweigt, zieht die
//     andere ein. Genau dafür gibt es das Paket.
//  3. Widersprüche werden GEMELDET, nicht entschieden.
//  4. Die abgeleitete Id ist stabil und als abgeleitet erkennbar.
//  5. Hersteller UND Modell — sonst sind zwei Geräte eines.
//  6. Derselbe Baum ergibt denselben Katalog.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  abgeleiteteTypId,
  fuehreZusammen,
  istAbgeleitet,
  mehrfachGefuehrt,
  ohneBeleg,
} from '../src/index'

const cable = {
  name: 'cable',
  eintraege: [
    { id: 'guid-fx9', hersteller: 'Sony', modell: 'PXW-FX9', kategorie: 'Cameras' },
    { id: 'guid-atem', hersteller: 'Blackmagic', modell: 'ATEM 8K', kategorie: 'Video Mixer', datenblattUrl: 'https://b.md/atem' },
  ],
}
const multicam = {
  name: 'multicam',
  eintraege: [
    // Dieselbe Id, mit dem Datenblatt, das der andere Katalog nicht hat.
    { id: 'guid-fx9', hersteller: 'Sony', modell: 'PXW-FX9', kategorie: 'Cameras', datenblattUrl: 'https://sony/fx9' },
    // Eines von 368, die es drüben gar nicht gibt.
    { id: abgeleiteteTypId('Sony', 'HDC-3500'), hersteller: 'Sony', modell: 'HDC-3500', kategorie: 'Cameras', datenblattUrl: 'https://sony/hdc3500' },
  ],
}

describe('Gerätetyp-Katalog — eine Identität je Modell', () => {
  it('1. eine Id, ein Eintrag, mit Herkunft', () => {
    const { typen } = fuehreZusammen([cable, multicam])
    expect(typen).toHaveLength(3)
    const fx9 = typen.find((t) => t.id === 'guid-fx9')!
    expect(fx9.quellen).toEqual(['cable', 'multicam'])
    expect(mehrfachGefuehrt(typen).map((t) => t.id)).toEqual(['guid-fx9'])
  })

  it('2. ergänzen ist kein Widerspruch', () => {
    const { typen, befunde } = fuehreZusammen([cable, multicam])
    // Der Cable-Katalog hatte kein Datenblatt für die FX9; MultiCam schon.
    // Genau diese Lücke war Befund A: 368 von 377 Kameramodellen fehlten
    // drüben vollständig, und die übrigen ohne Beleg.
    expect(typen.find((t) => t.id === 'guid-fx9')!.datenblattUrl).toBe('https://sony/fx9')
    expect(befunde).toEqual([])
    expect(ohneBeleg(typen).map((t) => t.modell)).toEqual([])
  })

  it('3. Widersprüche werden gemeldet, nicht entschieden', () => {
    const anders = {
      name: 'fremd',
      eintraege: [{ id: 'guid-fx9', hersteller: 'Sony', modell: 'FX9', kategorie: 'Cameras' }],
    }
    const { typen, befunde } = fuehreZusammen([cable, anders])
    // Die erste Quelle hält das Feld — und der Befund nennt BEIDE Werte und
    // beide Quellen. Ein stiller Gewinner erzeugte eine Angabe, die in keiner
    // Quelle so steht.
    expect(typen.find((t) => t.id === 'guid-fx9')!.modell).toBe('PXW-FX9')
    expect(befunde).toEqual([
      {
        id: 'guid-fx9',
        feld: 'modell',
        gehalten: { wert: 'PXW-FX9', quelle: 'cable' },
        abweichend: { wert: 'FX9', quelle: 'fremd' },
      },
    ])
  })

  it('4. die abgeleitete Id ist stabil und erkennbar', () => {
    // Zweimal dasselbe Ergebnis, auch aus anders geschriebener Eingabe —
    // sonst hiesse dieselbe Kamera in zwei Repos anders.
    expect(abgeleiteteTypId('Sony', 'HDC-3500')).toBe(abgeleiteteTypId(' sony ', 'HDC 3500'))
    expect(istAbgeleitet(abgeleiteteTypId('Sony', 'HDC-3500'))).toBe(true)
    // Eine gewachsene GUID sieht anders aus — und das ist der Zweck des
    // Präfixes: sonst unterschiede sie später niemand mehr.
    expect(istAbgeleitet('guid-fx9')).toBe(false)
  })

  it('5. Hersteller UND Modell', () => {
    // „CM-1" gibt es bei mehreren Häusern. Wer nur das Modell nähme, führte
    // zwei verschiedene Geräte unter einer Id zusammen.
    expect(abgeleiteteTypId('Sony', 'CM-1')).not.toBe(abgeleiteteTypId('Canon', 'CM-1'))
  })

  it('6. derselbe Baum ergibt denselben Katalog', () => {
    expect(fuehreZusammen([cable, multicam])).toEqual(fuehreZusammen([cable, multicam]))
    // Reihenfolge des ersten Auftretens, nicht sortiert: der Katalog soll so
    // aussehen, wie die Quellen ihn führen.
    expect(fuehreZusammen([cable, multicam]).typen.map((t) => t.modell))
      .toEqual(['PXW-FX9', 'ATEM 8K', 'HDC-3500'])
  })
})

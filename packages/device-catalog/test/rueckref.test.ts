// ───────────────────────────────────────────────────────────────────────────
// Die Rueckrichtung: von der Liste EINES Planers zur Identitaet ALLER.
//
// ADR-012. Bis hierher konnte ein Planer seinen eigenen Eintrag nur ueber den
// NAMEN im Katalog wiederfinden — genau der Vergleich, den ADR-002 verbietet,
// und die Kameraliste fuehrt vor, warum: „FX9" und „PXW-FX9" sind dasselbe
// Geraet und nicht derselbe Name.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { alleTypen } from '../src/katalog'
import { fuehreZusammen, typFuerQuelle } from '../src/zusammenfuehren'

describe('refs — welche Quelle nennt diesen Typ wie', () => {
  it('fuehrt die eigene Id jeder Quelle mit', () => {
    const t = alleTypen()
    expect(typFuerQuelle(t, 'multicam', 'sony-hdc-3500')?.modell).toBe('HDC-3500')
    expect(typFuerQuelle(t, 'light', 'etc-s4-19')?.modell).toBe('Source Four 19°')
  })

  it('antwortet nicht auf die Id einer FREMDEN Quelle', () => {
    // Sonst hiesse die Antwort „deine Bibliothek kennt das", und das waere
    // eine Auskunft ueber einen Bestand, den dieser Planer nicht hat.
    const t = alleTypen()
    const nurCable = t.find((x) => x.quellen.length === 1 && x.quellen[0] === 'cable')!
    expect(typFuerQuelle(t, 'cable', nurCable.id)?.id).toBe(nurCable.id)
    expect(typFuerQuelle(t, 'light', nurCable.id)).toBeNull()
  })

  it('ohne Ref keine Antwort — geraten wird nichts', () => {
    expect(typFuerQuelle(alleTypen(), 'multicam', undefined)).toBeNull()
    expect(typFuerQuelle(alleTypen(), 'multicam', 'gibt-es-nicht')).toBeNull()
  })

  it('sammelt die Ids MEHRERER Quellen an einem Typ', () => {
    // Der Fall, um den es geht: dasselbe Blech, zwei Listen, eine Identitaet.
    const { typen } = fuehreZusammen([
      { name: 'cable', eintraege: [{ id: 'X', modell: 'Sony PXW-FX9', kategorie: 'Cameras', quellRef: 'guid-1' }] },
      { name: 'multicam', eintraege: [{ id: 'X', hersteller: 'Sony', modell: 'PXW-FX9', kategorie: 'Cameras', quellRef: 'sony-fx9' }] },
    ])
    expect(typen).toHaveLength(1)
    expect(typen[0].refs).toEqual({ cable: 'guid-1', multicam: 'sony-fx9' })
    expect(typFuerQuelle(typen, 'multicam', 'sony-fx9')?.id).toBe('X')
    expect(typFuerQuelle(typen, 'cable', 'guid-1')?.id).toBe('X')
  })

  it('`quellRef` steht NICHT im Typ — dort waere es die Id einer Quelle an einem Typ mehrerer', () => {
    const { typen } = fuehreZusammen([
      { name: 'cable', eintraege: [{ id: 'X', modell: 'A', kategorie: 'Video', quellRef: 'r1' }] },
    ])
    expect('quellRef' in typen[0]).toBe(false)
  })
})

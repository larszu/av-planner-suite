// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { dateiName, herunterladen } from '../src/herunterladen'

/**
 * DER DOWNLOAD — und der Fehler, der ihn zu `download` machte.
 *
 * Gemessen am 2026-09-20 in Chromium: der Film-Export landete als Datei
 * namens `download`, ohne Endung. Der Anker war nie im Dokument, und das
 * `download`-Attribut eines nicht eingehängten Ankers wird nicht in jedem
 * Fall beachtet. Vier Stellen der Suite machten es so, eine machte es
 * richtig — deshalb gibt es jetzt genau eine.
 */
describe('dateiName', () => {
  it('macht aus einem Titel einen Namen ohne Endung', () => {
    expect(dateiName('Sommershow 2026')).toBe('sommershow-2026')
  })

  it('lässt keinen Pfadtrenner durch', () => {
    // „Show / Tag 1" ergäbe sonst einen Namen mit einem Ordner darin — und
    // der Browser legte die Datei still woanders ab.
    expect(dateiName('Show / Tag 1')).toBe('show-tag-1')
    expect(dateiName('C:\\Show')).toBe('c-show')
  })

  it('bringt den Namen auf ASCII, statt ihn fallen zu lassen', () => {
    // Genau dieser Name kam als `download` heraus: Chromium liess den
    // Gedankenstrich nicht durch.
    expect(dateiName('Sommershow 2026 — Board')).toBe('sommershow-2026-board')
    // Umgeschrieben und nicht abgeschnitten — `grne-halle` fände niemand.
    expect(dateiName('Grüne Halle')).toBe('gruene-halle')
    expect(dateiName('Straße 5')).toBe('strasse-5')
  })

  it('macht keine versteckte Datei daraus', () => {
    expect(dateiName('.geheim')).toBe('geheim')
  })

  it('gibt nie einen leeren Namen zurück', () => {
    // Ein Download ohne Namen ist genau der Fehler, um den es hier geht.
    expect(dateiName('   ')).toBe('export')
    expect(dateiName('///')).toBe('export')
  })
})

describe('herunterladen', () => {
  it('hängt den Anker ins Dokument, klickt und räumt ihn wieder weg', () => {
    const gesehen: { imDokument: boolean; name: string }[] = []
    const echt = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      gesehen.push({ imDokument: document.body.contains(this), name: this.download })
    }
    try {
      herunterladen(new Blob(['x'], { type: 'text/plain' }), 'film.mp4')
    } finally {
      HTMLAnchorElement.prototype.click = echt
    }
    expect(gesehen).toEqual([{ imDokument: true, name: 'film.mp4' }])
    // Danach liegt nichts mehr herum.
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })

  it('gibt die Adresse NICHT im selben Schritt zurück', () => {
    // Der Klick startet die Übertragung, er beendet sie nicht. Ein sofortiges
    // `revokeObjectURL` zieht sie einem grossen Film unter den Füssen weg.
    vi.useFakeTimers()
    const frei = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const echt = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {}
    try {
      herunterladen(new Blob(['x']), 'x.bin')
      expect(frei).not.toHaveBeenCalled()
      vi.advanceTimersByTime(60_000)
      expect(frei).toHaveBeenCalledTimes(1)
    } finally {
      HTMLAnchorElement.prototype.click = echt
      frei.mockRestore()
      vi.useRealTimers()
    }
  })
})

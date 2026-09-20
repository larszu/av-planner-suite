import { describe, expect, it } from 'vitest'
import { abrufbar, parseVorschau } from '../src/linkVorschau'

/**
 * DIE LINK-VORSCHAU — und die Regel, die sie ehrlich hält.
 *
 * Der Grund, aus dem es sie nicht gab, stand in `docs/board.md`: sie braucht
 * einen Abruf, und eine erfundene Vorschau wäre eine Behauptung über eine
 * Seite, die niemand gelesen hat. Der Abruf ist jetzt da — und damit er die
 * Behauptung nicht durch die Hintertür wieder einführt, misst dieser Test
 * vor allem, was NICHT herauskommt.
 */
const seite = (kopf: string) => `<!doctype html><html><head>${kopf}</head><body><p>egal</p></body></html>`

describe('parseVorschau', () => {
  it('nimmt Open Graph vor dem Fenstertitel', () => {
    // `og:title` ist die Angabe FÜR eine Vorschau, `<title>` die für den
    // Fensterrahmen — „Sommershow 2026" gegen „Sommershow 2026 | Nordlicht".
    const v = parseVorschau(
      seite('<title>Sommershow 2026 | Nordlicht Media</title><meta property="og:title" content="Sommershow 2026">'),
      'https://nordlicht.example/show',
    )
    expect(v.titel).toBe('Sommershow 2026')
  })

  it('nimmt den Fenstertitel, wenn die Seite nichts anderes anbietet', () => {
    const v = parseVorschau(seite('<title>Nur ein Titel</title>'), 'https://x.example/')
    expect(v.titel).toBe('Nur ein Titel')
  })

  it('erfindet nichts, wenn die Seite nichts sagt', () => {
    // Kein Ersatztitel aus der URL, keine Beschreibung aus dem ersten
    // Absatz, kein Platzhalterbild. Das ist der Kern der Regel.
    const v = parseVorschau(seite(''), 'https://nordlicht.example/show/2026')
    expect(v.titel).toBeUndefined()
    expect(v.beschreibung).toBeUndefined()
    expect(v.bildUrl).toBeUndefined()
    // Der Host ist die einzige Ableitung — und er ist eine Aussage über die
    // Adresse, nicht über den Inhalt.
    expect(v.host).toBe('nordlicht.example')
  })

  it('löst ein relatives Vorschaubild gegen die Seite auf', () => {
    const v = parseVorschau(
      seite('<meta property="og:image" content="/bilder/vorschau.jpg">'),
      'https://nordlicht.example/show/2026',
    )
    // Ohne Auflösung wäre `/bilder/...` ein Bild auf DIESEM Rechner.
    expect(v.bildUrl).toBe('https://nordlicht.example/bilder/vorschau.jpg')
  })

  it('liest keine Angabe aus dem Körper der Seite', () => {
    // Ein `<meta>` unter dem `</head>` ist keins. Sonst könnte jede Seite
    // eine Vorschau in einen Kommentar schreiben.
    const html = `<html><head><title>Echt</title></head><body><meta property="og:title" content="Untergeschoben"></body></html>`
    expect(parseVorschau(html, 'https://x.example/').titel).toBe('Echt')
  })

  it('setzt HTML-Entitäten im Titel zurück', () => {
    const v = parseVorschau(seite('<meta property="og:title" content="Licht &amp; Ton">'), 'https://x.example/')
    expect(v.titel).toBe('Licht & Ton')
  })

  it('kommt mit einfachen Anführungszeichen und Attributreihenfolge zurecht', () => {
    const v = parseVorschau(
      seite("<meta content='Von hinten' property='og:description'>"),
      'https://x.example/',
    )
    expect(v.beschreibung).toBe('Von hinten')
  })

  it('hält den Abrufzeitpunkt fest, wenn einer genannt wird', () => {
    // Eine Vorschau ohne Zeitpunkt altert unbemerkt.
    const v = parseVorschau(seite('<title>x</title>'), 'https://x.example/', 1_700_000_000_000)
    expect(v.geholtAm).toBe(1_700_000_000_000)
    expect(parseVorschau(seite('<title>x</title>'), 'https://x.example/').geholtAm).toBeUndefined()
  })
})

describe('abrufbar', () => {
  it('lässt nur http und https durch', () => {
    expect(abrufbar('https://nordlicht.example/')).toBe(true)
    expect(abrufbar('http://192.168.1.10:8080/x')).toBe(true)
  })

  it('lehnt alles andere ab, statt es zu reparieren', () => {
    // Der Abruf läuft im Hauptprozess mit den Rechten der Anwendung. Genau
    // dort liest eine `file:`-Adresse aus einem fremden Projekt die Platte.
    expect(abrufbar('file:///etc/passwd')).toBe(false)
    expect(abrufbar('data:text/html,<h1>x')).toBe(false)
    expect(abrufbar('javascript:alert(1)')).toBe(false)
    expect(abrufbar('nordlicht.example')).toBe(false)
    expect(abrufbar('')).toBe(false)
  })
})

import { createServer, type Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseVorschau } from '@avplan/ui/embed'
// Der Abruf liegt im Hauptprozess und ist CommonJS — hier direkt geladen,
// weil genau er gemessen werden soll und nicht eine Nachbildung davon.
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const { hole, MAX_BYTES } = require_('../electron/linkVorschau.cjs') as {
  hole: (url: string) => Promise<{ ok: true; html: string; url: string } | { ok: false; grund: string }>
  MAX_BYTES: number
}

/**
 * DER ABRUF DER LINK-VORSCHAU — gegen einen echten Server.
 *
 * Der Grund, aus dem es die Vorschau nicht gab, war der Abruf. Hier wird er
 * gemessen, und zwar an einem Server, der in diesem Test läuft: das Netz
 * dieser Arbeitsumgebung ist gefiltert, und ein Test gegen eine fremde Seite
 * wäre entweder rot oder eine Wette auf deren Erreichbarkeit.
 *
 * Gemessen wird vor allem, was der Abruf ABLEHNT. Er läuft im Hauptprozess
 * mit den Rechten der Anwendung — das ist die Stelle, an der eine
 * `file:`-Adresse aus einem fremden Projekt die Platte ausliest.
 */
let server: Server
let basis = ''

beforeAll(async () => {
  server = createServer((req, res) => {
    const pfad = req.url ?? '/'
    if (pfad === '/seite') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(
        '<!doctype html><html><head><title>Fenstertitel</title>' +
          '<meta property="og:title" content="Sommershow 2026">' +
          '<meta property="og:description" content="Licht &amp; Ton">' +
          '<meta property="og:image" content="/bild.jpg">' +
          '</head><body>egal</body></html>',
      )
      return
    }
    if (pfad === '/riesig') {
      res.writeHead(200, { 'content-type': 'text/html' })
      // Deutlich mehr als die Grenze — der Leser muss abbrechen.
      res.end('<html><head><title>gross</title></head><body>' + 'x'.repeat(MAX_BYTES * 3) + '</body></html>')
      return
    }
    if (pfad === '/bild') {
      res.writeHead(200, { 'content-type': 'image/png' })
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      return
    }
    if (pfad === '/weiter') {
      res.writeHead(302, { location: '/seite' })
      res.end()
      return
    }
    if (pfad === '/weiter-zur-datei') {
      res.writeHead(302, { location: 'file:///etc/passwd' })
      res.end()
      return
    }
    if (pfad === '/schleife') {
      res.writeHead(302, { location: '/schleife' })
      res.end()
      return
    }
    res.writeHead(404)
    res.end()
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const adresse = server.address()
  basis = typeof adresse === 'object' && adresse ? `http://127.0.0.1:${adresse.port}` : ''
})

afterAll(() => new Promise<void>((r) => server.close(() => r())))

describe('Abruf', () => {
  it('holt eine Seite und der Parser liest ihre Angaben', async () => {
    const r = await hole(`${basis}/seite`)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const v = parseVorschau(r.html, r.url)
    expect(v.titel).toBe('Sommershow 2026')
    expect(v.beschreibung).toBe('Licht & Ton')
    expect(v.bildUrl).toBe(`${basis}/bild.jpg`)
  })

  it('folgt einer Weiterleitung', async () => {
    const r = await hole(`${basis}/weiter`)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.url).toBe(`${basis}/seite`)
    expect(parseVorschau(r.html, r.url).titel).toBe('Sommershow 2026')
  })

  it('folgt einer Weiterleitung NICHT in eine Datei-Adresse', async () => {
    // Ohne erneute Prüfung führte ein Kurzlink genau an der Prüfung vorbei,
    // die beim ersten Aufruf greift.
    const r = await hole(`${basis}/weiter-zur-datei`)
    expect(r).toEqual({ ok: false, grund: 'keine-webadresse' })
  })

  it('gibt nach drei Weiterleitungen auf', async () => {
    const r = await hole(`${basis}/schleife`)
    expect(r).toEqual({ ok: false, grund: 'zu-viele-weiterleitungen' })
  })

  it('bricht bei der Größengrenze ab, statt alles zu laden', async () => {
    const r = await hole(`${basis}/riesig`)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // Etwas Schlupf für den letzten Block des Lesers — aber nicht das
    // Dreifache, das der Server angeboten hat.
    expect(r.html.length).toBeLessThan(MAX_BYTES * 2)
    expect(parseVorschau(r.html, r.url).titel).toBe('gross')
  })

  it('nimmt kein Bild für eine Seite', async () => {
    const r = await hole(`${basis}/bild`)
    expect(r).toEqual({ ok: false, grund: 'kein-html' })
  })

  it('lehnt alles ab, was keine Webadresse ist', async () => {
    expect(await hole('file:///etc/passwd')).toEqual({ ok: false, grund: 'keine-webadresse' })
    expect(await hole('data:text/html,<h1>x')).toEqual({ ok: false, grund: 'keine-webadresse' })
    expect(await hole('')).toEqual({ ok: false, grund: 'keine-webadresse' })
  })

  it('meldet einen Server, der nicht antwortet, als nicht erreichbar', async () => {
    // Port 1 ist reserviert und hört hier niemand ab.
    expect(await hole('http://127.0.0.1:1/x')).toEqual({ ok: false, grund: 'nicht-erreichbar' })
  })
})

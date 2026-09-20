import { afterEach, describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
type Sendung = { url: string; titel?: string; beschreibung?: string; auswahl?: string; bildUrl?: string }
const einwurf = require_('../electron/einwurf.cjs') as {
  starte: (zustellen: (s: Sendung) => void, log?: (...a: unknown[]) => void) => Promise<{ ok: boolean; port?: number; geheimnis?: string }>
  beende: () => void
  zugang: () => { url: string; geheimnis: string } | null
  MAX_BYTES: number
}

/**
 * DER EINWURF — gegen den echten Server, nicht gegen eine Nachbildung.
 *
 * Er ist die Stelle, an der etwas von AUSSEN in ein Projekt kommt. Gemessen
 * wird deshalb vor allem, was er ABLEHNT: ohne das ist er eine Tür, durch
 * die jede besuchte Webseite im Hintergrund Karten anlegt.
 */
let offen = false
const auf = async () => {
  const zugestellt: Sendung[] = []
  const r = await einwurf.starte((s) => zugestellt.push(s))
  offen = true
  expect(r.ok).toBe(true)
  return { zugang: einwurf.zugang()!, zugestellt }
}
const post = (url: string, koerper: unknown) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof koerper === 'string' ? koerper : JSON.stringify(koerper) })

afterEach(() => {
  if (offen) einwurf.beende()
  offen = false
})

describe('Einwurf', () => {
  it('hört nur auf 127.0.0.1 und nennt Adresse und Geheimnis', async () => {
    const { zugang } = await auf()
    // Nicht 0.0.0.0: der Briefkasten ist für den Browser auf DIESEM Rechner.
    expect(zugang.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/einwurf$/)
    expect(zugang.geheimnis.length).toBeGreaterThanOrEqual(24)
  })

  it('nimmt eine Sendung mit dem richtigen Geheimnis an', async () => {
    const { zugang, zugestellt } = await auf()
    const r = await post(zugang.url, {
      geheimnis: zugang.geheimnis,
      url: 'https://nordlicht.example/show',
      titel: 'Sommershow 2026',
      beschreibung: 'Licht & Ton',
      bildUrl: '/bilder/v.jpg',
    })
    expect(r.status).toBe(200)
    expect(zugestellt).toHaveLength(1)
    expect(zugestellt[0]!.titel).toBe('Sommershow 2026')
    // Relativ wird gegen die Seite aufgelöst — sonst wäre `/bilder/v.jpg`
    // ein Bild auf DIESEM Rechner.
    expect(zugestellt[0]!.bildUrl).toBe('https://nordlicht.example/bilder/v.jpg')
  })

  it('lehnt ohne Geheimnis ab — und stellt NICHTS zu', async () => {
    const { zugang, zugestellt } = await auf()
    const r = await post(zugang.url, { url: 'https://x.example/', titel: 'Untergeschoben' })
    expect(r.status).toBe(403)
    expect(zugestellt).toHaveLength(0)
  })

  it('lehnt ein falsches Geheimnis ab, bevor es den Inhalt anschaut', async () => {
    // Sonst wäre eine Fehlermeldung über den Inhalt eine Auskunft an
    // jemanden, der nicht klopfen darf.
    const { zugang, zugestellt } = await auf()
    const r = await post(zugang.url, { geheimnis: 'falsch', url: 'nicht-mal-eine-adresse' })
    expect(r.status).toBe(403)
    expect(await r.json()).toEqual({ ok: false, grund: 'falsches-geheimnis' })
    expect(zugestellt).toHaveLength(0)
  })

  it('nimmt nur http und https als Fundort', async () => {
    const { zugang, zugestellt } = await auf()
    for (const url of ['file:///etc/passwd', 'data:text/html,<h1>x', 'javascript:alert(1)', '']) {
      const r = await post(zugang.url, { geheimnis: zugang.geheimnis, url })
      expect(r.status).toBe(400)
    }
    expect(zugestellt).toHaveLength(0)
  })

  it('erfindet keinen Titel aus der Adresse', async () => {
    const { zugang, zugestellt } = await auf()
    await post(zugang.url, { geheimnis: zugang.geheimnis, url: 'https://nordlicht.example/show/2026' })
    expect(zugestellt[0]!.titel).toBeUndefined()
    expect(zugestellt[0]!.beschreibung).toBeUndefined()
  })

  it('weist eine zu grosse Sendung ab', async () => {
    const { zugang, zugestellt } = await auf()
    const r = await post(zugang.url, JSON.stringify({
      geheimnis: zugang.geheimnis,
      url: 'https://x.example/',
      auswahl: 'x'.repeat(einwurf.MAX_BYTES + 1024),
    })).catch(() => ({ status: 413 }) as Response)
    expect(r.status).toBe(413)
    expect(zugestellt).toHaveLength(0)
  })

  it('kennt nur POST /einwurf und keinen Lese-Weg', async () => {
    const { zugang } = await auf()
    expect((await fetch(zugang.url)).status).toBe(404)
    expect((await post(zugang.url.replace('/einwurf', '/'), {})).status).toBe(404)
  })

  it('gibt nach dem Schliessen kein Geheimnis mehr her', async () => {
    await auf()
    einwurf.beende()
    offen = false
    expect(einwurf.zugang()).toBeNull()
  })

  it('vergibt bei jedem Start ein neues Geheimnis', async () => {
    // Ein gestohlenes gilt damit nur bis zum Beenden.
    const a = (await auf()).zugang.geheimnis
    einwurf.beende()
    const b = (await auf()).zugang.geheimnis
    expect(b).not.toBe(a)
  })
})

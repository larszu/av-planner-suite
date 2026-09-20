import { afterEach, describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const mit = require_('../electron/mitmachen.cjs') as {
  starte: (log?: (...a: unknown[]) => void) => Promise<{ ok: boolean; port?: number; geheimnis?: string }>
  beende: () => void
  zugang: () => { geheimnis: string; port: number; dabei: number } | null
  MAX_STROEME: number
}

/**
 * DAS OFFENE FENSTER — gegen den echten Server.
 *
 * Gemessen wird, was es WEITERREICHT und was es ABLEHNT. Das zweite ist
 * wichtiger: das Fenster steht im eigenen Netz offen, und ohne Geheimnis
 * dürfte niemand mithören.
 */
let offen = false

const auf = async () => {
  const r = await mit.starte()
  offen = true
  expect(r.ok).toBe(true)
  const z = mit.zugang()!
  return { ...z, basis: `http://127.0.0.1:${z.port}` }
}

/** Einen SSE-Strom öffnen und die Ereignisse einsammeln. */
async function strom(basis: string, geheimnis: string, sitzung: string) {
  const r = await fetch(`${basis}/mitmachen/strom?geheimnis=${encodeURIComponent(geheimnis)}&sitzung=${sitzung}`)
  const ereignisse: { art: string; daten: unknown }[] = []
  const leser = r.body!.getReader()
  const dec = new TextDecoder()
  let puffer = ''
  const lauf = (async () => {
    for (;;) {
      const { done, value } = await leser.read()
      if (done) break
      puffer += dec.decode(value, { stream: true })
      let i
      while ((i = puffer.indexOf('\n\n')) >= 0) {
        const block = puffer.slice(0, i)
        puffer = puffer.slice(i + 2)
        const art = /^event: (.+)$/m.exec(block)?.[1]
        const daten = /^data: (.+)$/m.exec(block)?.[1]
        if (art && daten) ereignisse.push({ art, daten: JSON.parse(daten) })
      }
    }
  })()
  return {
    status: r.status,
    ereignisse,
    zu: async () => {
      await leser.cancel().catch(() => {})
      await lauf.catch(() => {})
    },
  }
}

const warte = (ms = 120) => new Promise((r) => setTimeout(r, ms))

const melde = (basis: string, koerper: unknown) =>
  fetch(`${basis}/mitmachen/melden`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(koerper),
  })

afterEach(() => {
  if (offen) mit.beende()
  offen = false
})

describe('Mitmachen', () => {
  it('reicht die Meldung des einen an den anderen weiter — und nicht zurück', async () => {
    const { basis, geheimnis } = await auf()
    const anna = await strom(basis, geheimnis, 'anna')
    const bert = await strom(basis, geheimnis, 'bert')
    await warte()

    const r = await melde(basis, { geheimnis, sitzung: 'anna', staende: { k1: { wann: 5, wer: 'anna' } } })
    expect(r.status).toBe(200)
    await warte()

    // Bert hört es.
    expect(bert.ereignisse.filter((e) => e.art === 'stand')).toHaveLength(1)
    // Anna nicht — sie hat es schon, und ein Echo führte sie gegen sich selbst.
    expect(anna.ereignisse.filter((e) => e.art === 'stand')).toHaveLength(0)

    await anna.zu()
    await bert.zu()
  })

  it('sagt den anderen Bescheid, wenn jemand geht', async () => {
    // Sonst bliebe sein Zeiger stehen, und das sieht aus wie jemand, der
    // nur gerade nichts tut.
    const { basis, geheimnis } = await auf()
    const bleibt = await strom(basis, geheimnis, 'bleibt')
    const geht = await strom(basis, geheimnis, 'geht')
    await warte()
    await geht.zu()
    await warte(250)
    expect(bleibt.ereignisse.some((e) => e.art === 'tschuess')).toBe(true)
    await bleibt.zu()
  })

  it('lässt ohne Geheimnis niemanden mithören', async () => {
    const { basis, geheimnis } = await auf()
    const fremd = await fetch(`${basis}/mitmachen/strom?sitzung=fremd`)
    expect(fremd.status).toBe(403)
    await fremd.body?.cancel()
    const falsch = await fetch(`${basis}/mitmachen/strom?geheimnis=falsch&sitzung=x`)
    expect(falsch.status).toBe(403)
    await falsch.body?.cancel()
    expect(geheimnis.length).toBeGreaterThan(20)
  })

  it('lässt ohne Geheimnis niemanden hineinrufen', async () => {
    const { basis, geheimnis } = await auf()
    const hoert = await strom(basis, geheimnis, 'hoert')
    await warte()
    const r = await melde(basis, { sitzung: 'fremd', staende: { k1: { wann: 1, wer: 'fremd' } } })
    expect(r.status).toBe(403)
    await warte()
    expect(hoert.ereignisse.filter((e) => e.art === 'stand')).toHaveLength(0)
    await hoert.zu()
  })

  it('weist eine Meldung ohne Sitzung ab', async () => {
    // Ohne sie liefe das Echo zurück an den Absender.
    const { basis, geheimnis } = await auf()
    expect((await melde(basis, { geheimnis, staende: {} })).status).toBe(400)
  })

  it('kennt nur die zwei Wege', async () => {
    const { basis, geheimnis } = await auf()
    expect((await fetch(`${basis}/`)).status).toBe(404)
    expect((await melde(`${basis}/x`, { geheimnis, sitzung: 'a' })).status).toBe(404)
  })

  it('vergibt bei jedem Aufmachen ein neues Geheimnis', async () => {
    const a = (await auf()).geheimnis
    mit.beende()
    const b = (await auf()).geheimnis
    expect(b).not.toBe(a)
  })

  it('gibt nach dem Zumachen nichts mehr her', async () => {
    await auf()
    mit.beende()
    offen = false
    expect(mit.zugang()).toBeNull()
  })

  it('zählt, wer dabei ist', async () => {
    const { basis, geheimnis } = await auf()
    expect(mit.zugang()!.dabei).toBe(0)
    const a = await strom(basis, geheimnis, 'a')
    await warte()
    expect(mit.zugang()!.dabei).toBe(1)
    await a.zu()
  })
})

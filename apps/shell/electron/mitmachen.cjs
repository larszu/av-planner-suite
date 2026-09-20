// ───────────────────────────────────────────────────────────────────────────
// DAS OFFENE FENSTER. Einer macht auf, die anderen kommen dazu.
//
// ─── WARUM ES KEINEN GEMIETETEN SERVER BRAUCHT ────────────────────────────
//
// Der Grund gegen Echtzeit-Zusammenarbeit lautete „braucht einen Server".
// Er setzt „Server" mit „gemieteter Rechner im Netz" gleich, und genau da
// ist er falsch: die Leute, die zusammen an einer Show planen, sitzen in
// derselben Halle und damit im selben Netz. Der Rechner, auf dem die Suite
// schon läuft, ist der Server — solange das Fenster offen ist, und keine
// Minute länger.
//
// Was NICHT beantwortet ist: Zusammenarbeit über das Internet, mit Konten
// und Fremdverwahrung. Die offene Kette (`cable-planner#868`–`#871`) bleibt
// offen. Sie ist nur für den häufigen Fall nicht mehr nötig.
//
// ─── DER WEG, UND WARUM GERADE DIESER ─────────────────────────────────────
//
// SSE hinunter (`GET /mitmachen/strom`), POST hinauf
// (`POST /mitmachen/melden`). Beides ist im Browser eingebaut, also braucht
// WER MITMACHT KEINE INSTALLATION: das Telefon eines Kollegen im selben
// WLAN öffnet die Adresse und ist dabei. Nur wer AUFMACHT, braucht die
// Desktop-Fassung.
//
// Kein WebSocket, und das ist eine Entscheidung: der brächte eine
// Abhängigkeit mit (`ws`), und dafür kauft man hier nichts ein. Der Strom
// läuft in eine Richtung, die Meldungen in die andere, und beide sind kurz.
//
// ─── WAS ER ABLEHNT ───────────────────────────────────────────────────────
//
//   * OHNE GEHEIMNIS GEHT NICHTS. Es ist je Fenster neu und wird zeitgleich
//     verglichen. Im Strom steht es in der Adresse — `EventSource` kann
//     keine Kopfzeilen setzen. Das ist der Preis für „ohne Installation
//     mitmachen", und er ist in einem Hallen-WLAN vertretbar; im offenen
//     Internet wäre er es nicht, und dafür ist das hier auch nicht gedacht.
//   * GRÖSSENGRENZE je Meldung.
//   * OBERGRENZE für die Zahl der Ströme. Ein Rechner, der 500 offene
//     Antworten hält, antwortet keinem mehr.
//
// ─── WAS ER NICHT TUT ─────────────────────────────────────────────────────
//
// Er führt nichts zusammen und speichert nichts. Er reicht weiter, was
// ankommt — das Zusammenführen ist rein und liegt im Paket
// (`packages/ui/src/mitmachen.ts`), wo es geprüft wird. Ein Hauptprozess,
// der Stände zusammenrechnet, hätte eine zweite Fassung davon.
// ───────────────────────────────────────────────────────────────────────────
const http = require('node:http')
const crypto = require('node:crypto')
const os = require('node:os')

const MAX_BYTES = 2 * 1024 * 1024
const MAX_STROEME = 24
/** Alle paar Sekunden ein Doppelpunkt-Kommentar: sonst schliesst mancher
 *  Zwischenrechner eine stille Verbindung. */
const HERZSCHLAG_MS = 15_000

function gleich(a, b) {
  const x = Buffer.from(String(a ?? ''), 'utf8')
  const y = Buffer.from(String(b ?? ''), 'utf8')
  if (x.length !== y.length) return false
  return crypto.timingSafeEqual(x, y)
}

/** Die Adressen, unter denen dieser Rechner im eigenen Netz erreichbar ist.
 *  GEMESSEN und nicht geraten: was `os` nennt, und sonst nichts. */
function adressen(port) {
  const raus = []
  for (const [name, liste] of Object.entries(os.networkInterfaces())) {
    for (const n of liste ?? []) {
      if (n.family !== 'IPv4' || n.internal) continue
      raus.push({ name, url: `http://${n.address}:${port}` })
    }
  }
  return raus
}

let server = null
let geheimnis = null
let port = 0
let stroeme = new Set()
let herzschlag = null

function sende(antwort, art, nutzlast) {
  try {
    antwort.write(`event: ${art}\ndata: ${JSON.stringify(nutzlast)}\n\n`)
  } catch {
    /* eine tote Verbindung raeumt der Schliessen-Haken ab */
  }
}

/** An alle ausser dem Absender. Der hat es schon. */
function weiter(art, nutzlast, ausser) {
  for (const s of stroeme) {
    if (s.sitzung && s.sitzung === ausser) continue
    sende(s.antwort, art, nutzlast)
  }
}

function kopf(res, status, typ) {
  res.writeHead(status, {
    'content-type': typ,
    'cache-control': 'no-store',
    // Wer mitmacht, oeffnet die Adresse im Browser — die Seite kommt dann
    // von hier. Wer die Suite als Fenster benutzt, kommt von woanders.
    // Beides soll gehen; das Geheimnis, nicht die Herkunft, ist die Huerde.
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  })
}

function starte(log = () => {}) {
  if (server) return Promise.resolve({ ok: true, port, geheimnis, adressen: adressen(port) })
  geheimnis = crypto.randomBytes(24).toString('base64url')

  server = http.createServer((req, res) => {
    const adresse = new URL(req.url ?? '/', 'http://x')
    const weg = adresse.pathname

    if (req.method === 'OPTIONS') {
      kopf(res, 204, 'text/plain')
      return res.end()
    }

    // ── Der Strom hinunter ──
    if (req.method === 'GET' && weg === '/mitmachen/strom') {
      if (!gleich(adresse.searchParams.get('geheimnis'), geheimnis)) {
        kopf(res, 403, 'application/json')
        return res.end(JSON.stringify({ ok: false, grund: 'falsches-geheimnis' }))
      }
      if (stroeme.size >= MAX_STROEME) {
        kopf(res, 503, 'application/json')
        return res.end(JSON.stringify({ ok: false, grund: 'zu-viele' }))
      }
      kopf(res, 200, 'text/event-stream')
      const eintrag = { antwort: res, sitzung: adresse.searchParams.get('sitzung') || null }
      stroeme.add(eintrag)
      sende(res, 'hallo', { sitzung: eintrag.sitzung })
      req.on('close', () => {
        stroeme.delete(eintrag)
        // Die anderen sollen den Zeiger nicht stehen lassen.
        if (eintrag.sitzung) weiter('tschuess', { sitzung: eintrag.sitzung }, eintrag.sitzung)
      })
      return
    }

    // ── Die Meldung hinauf ──
    if (req.method === 'POST' && weg === '/mitmachen/melden') {
      const teile = []
      let gelesen = 0
      let abgebrochen = false
      req.on('data', (stueck) => {
        if (abgebrochen) return
        gelesen += stueck.length
        if (gelesen > MAX_BYTES) {
          abgebrochen = true
          kopf(res, 413, 'application/json')
          res.end(JSON.stringify({ ok: false, grund: 'zu-gross' }))
          req.destroy()
          return
        }
        teile.push(stueck)
      })
      req.on('end', () => {
        if (abgebrochen) return
        let m
        try {
          m = JSON.parse(Buffer.concat(teile).toString('utf8'))
        } catch {
          kopf(res, 400, 'application/json')
          return res.end(JSON.stringify({ ok: false, grund: 'kein-json' }))
        }
        // Erst das Geheimnis. Eine Meldung ueber den Inhalt waere eine
        // Auskunft an jemanden, der nicht klopfen darf.
        if (!gleich(m?.geheimnis, geheimnis)) {
          kopf(res, 403, 'application/json')
          return res.end(JSON.stringify({ ok: false, grund: 'falsches-geheimnis' }))
        }
        const { geheimnis: _weg, ...rein } = m
        if (typeof rein.sitzung !== 'string' || !rein.sitzung) {
          kopf(res, 400, 'application/json')
          return res.end(JSON.stringify({ ok: false, grund: 'keine-sitzung' }))
        }
        weiter('stand', rein, rein.sitzung)
        kopf(res, 200, 'application/json')
        res.end(JSON.stringify({ ok: true, dabei: stroeme.size }))
      })
      return
    }

    kopf(res, 404, 'application/json')
    res.end(JSON.stringify({ ok: false, grund: 'kein-weg' }))
  })

  return new Promise((fertig) => {
    server.on('error', (e) => {
      log('mitmachen: Start fehlgeschlagen', e)
      server = null
      geheimnis = null
      fertig({ ok: false, grund: 'kein-server' })
    })
    // 0.0.0.0, und DAS ist der Unterschied zum Briefkasten: hier sollen
    // andere Geraete im selben Netz herankommen. Deshalb steht es auch in
    // der Oberflaeche, bevor jemand aufmacht.
    server.listen(0, '0.0.0.0', () => {
      port = server.address().port
      herzschlag = setInterval(() => {
        for (const s of stroeme) {
          try {
            s.antwort.write(': hh\n\n')
          } catch {
            /* egal */
          }
        }
      }, HERZSCHLAG_MS)
      // `unref`, damit dieser Takt den Prozess nicht am Leben haelt.
      herzschlag.unref?.()
      log(`mitmachen: offen auf Port ${port}`)
      fertig({ ok: true, port, geheimnis, adressen: adressen(port) })
    })
  })
}

function zugang() {
  return server && geheimnis ? { geheimnis, port, adressen: adressen(port), dabei: stroeme.size } : null
}

function beende() {
  if (!server) return
  if (herzschlag) clearInterval(herzschlag)
  herzschlag = null
  for (const s of stroeme) {
    try {
      s.antwort.end()
    } catch {
      /* egal */
    }
  }
  stroeme = new Set()
  server.close()
  server = null
  geheimnis = null
  port = 0
}

module.exports = { starte, beende, zugang, adressen, gleich, MAX_BYTES, MAX_STROEME, HERZSCHLAG_MS }

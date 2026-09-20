// ───────────────────────────────────────────────────────────────────────────
// DER EINWURF. Ein Briefkasten am Fenster: hier legt etwas von AUSSEN etwas
// auf ein Board.
//
// ─── DER GRUND, AUS DEM ES IHN NICHT GAB ──────────────────────────────────
//
//   > Web-Clipper (Browser-Erweiterung) — eine eigene Auslieferung in zwei
//   > Browser-Läden.
//
// Der Satz beschreibt nicht das Hindernis, sondern einen Vertriebsweg, den
// niemand gehen muss: eine Erweiterung lässt sich in Chrome und Firefox aus
// dem Ordner laden, und für ein Werkzeug, das in einem Haus benutzt wird,
// ist das der normale Weg. Das ECHTE Hindernis war der Empfang — die Shell
// hatte keine Stelle, an der etwas von aussen ankommt. Die ist jetzt hier.
//
// ─── WARUM ER ENG IST ─────────────────────────────────────────────────────
//
// Ein offener Empfang im eigenen Rechner ist genau die Sorte Tür, durch die
// eine beliebige Webseite im Hintergrund Dinge in ein Projekt legt. Deshalb:
//
//   * NUR 127.0.0.1. Kein `0.0.0.0` — der Briefkasten ist für den Browser
//     AUF DIESEM Rechner und nicht für das Hallen-WLAN. Wer von einem
//     anderen Gerät etwas schicken will, nimmt die Mobil-Ansicht;
//   * EIN GEHEIMNIS je Programmlauf, zufällig, nirgends gespeichert. Ohne
//     es wird jede Sendung abgelehnt — auch eine von `localhost`, denn jede
//     Seite im Browser darf `localhost` anrufen;
//   * das Geheimnis wird ZEICHENWEISE-KONSTANT verglichen. Ein `===` auf
//     Zeichenketten bricht beim ersten Unterschied ab und verrät damit über
//     die Antwortzeit, wie weit ein Versuch gekommen ist;
//   * KEIN `Access-Control-Allow-Origin: *` mit Zugangsdaten und kein
//     GET-Weg: es gibt nur `POST /einwurf`, und er trägt sein Geheimnis im
//     Körper. Eine Seite, die ihn blind abschickt, bekommt die Antwort
//     wegen CORS nicht zu sehen — und ohne Geheimnis passiert ohnehin nichts;
//   * GRÖSSENGRENZE. Eine Sendung ist ein Fundstück und kein Upload.
//
// ─── WAS ER NICHT TUT ─────────────────────────────────────────────────────
//
// Er legt nichts ab. Er reicht die Sendung an das Fenster weiter; ob daraus
// eine Karte wird, auf welchem Board und ob der Nutzer sie behalten will,
// entscheidet die Oberfläche. Ein Hauptprozess, der in ein Projekt schreibt,
// hätte einen zweiten Schreibweg neben dem Store — und damit zwei Fassungen
// derselben Sache.
// ───────────────────────────────────────────────────────────────────────────
const http = require('node:http')
const crypto = require('node:crypto')

/** Eine Sendung ist ein Fundstück, kein Upload. */
const MAX_BYTES = 256 * 1024
const HOST = '127.0.0.1'

/** Zeitgleicher Vergleich — ein `===` verriete über die Dauer, wie weit
 *  ein Versuch gekommen ist. */
function gleich(a, b) {
  const x = Buffer.from(String(a ?? ''), 'utf8')
  const y = Buffer.from(String(b ?? ''), 'utf8')
  // `timingSafeEqual` wirft bei ungleicher Länge; die Länge ist ohnehin
  // öffentlich (das Geheimnis hat immer dieselbe).
  if (x.length !== y.length) return false
  return crypto.timingSafeEqual(x, y)
}

/**
 * Eine Sendung auf das Nötige zurückschneiden.
 *
 * ES WIRD NICHTS ERFUNDEN: fehlt ein Titel, fehlt er. Ein aus der Adresse
 * gebauter Ersatztitel sähe aus wie eine Angabe der Seite.
 */
function saubereSendung(roh) {
  if (!roh || typeof roh !== 'object') return null
  const text = (w, max) => {
    if (typeof w !== 'string') return undefined
    const s = w.trim().slice(0, max)
    return s || undefined
  }
  let url
  try {
    const u = new URL(String(roh.url ?? ''))
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    url = u.toString()
  } catch {
    return null
  }
  let bildUrl
  if (typeof roh.bildUrl === 'string') {
    try {
      const b = new URL(roh.bildUrl, url)
      if (b.protocol === 'http:' || b.protocol === 'https:') bildUrl = b.toString()
    } catch {
      /* ein Bild, das keine Webadresse ist, fehlt einfach */
    }
  }
  return {
    url,
    titel: text(roh.titel, 300),
    beschreibung: text(roh.beschreibung, 2000),
    auswahl: text(roh.auswahl, 8000),
    bildUrl,
    geholtAm: Date.now(),
  }
}

let server = null
let geheimnis = null
let port = 0

/**
 * Den Briefkasten aufmachen.
 *
 * `zustellen(sendung)` wird für jede angenommene Sendung gerufen — genau
 * einmal, und erst nachdem das Geheimnis stimmte.
 *
 * Gibt Adresse und Geheimnis zurück. BEIDES gehört dem Nutzer: er trägt es
 * in die Erweiterung ein. Es wird nicht abgelegt und nicht geloggt — beim
 * nächsten Start gilt ein neues, und das ist der Preis dafür, dass ein
 * gestohlenes nur bis zum Beenden gilt.
 */
function starte(zustellen, log = () => {}) {
  if (server) return { ok: true, port, geheimnis }
  geheimnis = crypto.randomBytes(24).toString('base64url')

  server = http.createServer((req, res) => {
    const schluss = (status, koerper) => {
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        // Die Erweiterung läuft unter der Adresse der besuchten Seite. Ohne
        // diesen Kopf sähe sie die Antwort nicht — und wüsste nicht, ob ihre
        // Sendung ankam. Erlaubt ist das LESEN der Antwort, nicht der
        // Zugriff: das Geheimnis steht im Körper und nicht in einem Keks.
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
      })
      res.end(JSON.stringify(koerper))
    }
    if (req.method === 'OPTIONS') return schluss(204, {})
    if (req.method !== 'POST' || (req.url ?? '').split('?')[0] !== '/einwurf') {
      return schluss(404, { ok: false, grund: 'kein-weg' })
    }

    const teile = []
    let gelesen = 0
    let abgebrochen = false
    req.on('data', (stueck) => {
      if (abgebrochen) return
      gelesen += stueck.length
      if (gelesen > MAX_BYTES) {
        abgebrochen = true
        schluss(413, { ok: false, grund: 'zu-gross' })
        req.destroy()
        return
      }
      teile.push(stueck)
    })
    req.on('end', () => {
      if (abgebrochen) return
      let roh
      try {
        roh = JSON.parse(Buffer.concat(teile).toString('utf8'))
      } catch {
        return schluss(400, { ok: false, grund: 'kein-json' })
      }
      // ERST das Geheimnis, dann alles andere. Eine Fehlermeldung über den
      // Inhalt wäre eine Auskunft an jemanden, der nicht klopfen darf.
      if (!gleich(roh?.geheimnis, geheimnis)) {
        return schluss(403, { ok: false, grund: 'falsches-geheimnis' })
      }
      const sendung = saubereSendung(roh)
      if (!sendung) return schluss(400, { ok: false, grund: 'keine-webadresse' })
      try {
        zustellen(sendung)
      } catch (e) {
        log('einwurf: Zustellung fehlgeschlagen', e)
        return schluss(500, { ok: false, grund: 'nicht-zugestellt' })
      }
      schluss(200, { ok: true })
    })
  })

  return new Promise((fertig) => {
    server.on('error', (e) => {
      log('einwurf: Start fehlgeschlagen', e)
      server = null
      geheimnis = null
      fertig({ ok: false, grund: 'kein-server' })
    })
    // Port 0: das Betriebssystem sucht einen freien. Eine feste Nummer
    // kollidierte mit dem nächsten Werkzeug, das sie auch für sich hält.
    server.listen(0, HOST, () => {
      port = server.address().port
      log(`einwurf: hört auf http://${HOST}:${port}/einwurf`)
      fertig({ ok: true, port, geheimnis })
    })
  })
}

/** Aktuelle Zugangsdaten — oder `null`, solange der Briefkasten zu ist. */
function zugang() {
  return server && geheimnis ? { url: `http://${HOST}:${port}/einwurf`, geheimnis } : null
}

function beende() {
  if (!server) return
  server.close()
  server = null
  geheimnis = null
  port = 0
}

module.exports = { starte, beende, zugang, saubereSendung, gleich, MAX_BYTES }

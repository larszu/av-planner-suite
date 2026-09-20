// ───────────────────────────────────────────────────────────────────────────
// LINK-VORSCHAU — was auf der Seite steht, und sonst nichts.
//
// ─── DER GRUND, AUS DEM ES SIE NICHT GAB ──────────────────────────────────
//
// Aus `docs/board.md`:
//
//   > Link-Vorschau (Titel und Bild von der Seite) — braucht einen Abruf.
//   > Eine erfundene Vorschau wäre eine Behauptung über eine Seite, die
//   > niemand gelesen hat.
//
// Der Grund war richtig und ist mit dem Abruf behoben, nicht mit einer
// Erfindung. Diese Datei ist die Hälfte, die OHNE Abruf auskommt: aus dem
// geholten HTML das herauslesen, was die Seite über sich selbst sagt.
//
// ─── DIE REGEL ────────────────────────────────────────────────────────────
//
// **Was nicht dasteht, kommt nicht heraus.** Kein Ersatztitel aus der URL,
// keine geratene Beschreibung aus dem ersten Absatz, kein Platzhalterbild.
// Ein Feld, das fehlt, bleibt `undefined` — und die Karte zeigt dann den
// Host, weil der wirklich dasteht.
//
// Der einzige abgeleitete Wert ist `host`, und er ist keine Behauptung über
// den INHALT der Seite, sondern über ihre Adresse.
//
// REIN: kein Netz. Wer holt, ist der Hauptprozess (`linkPreview:fetch`) —
// im Browser gibt es ihn nicht, und die Karte sagt das, statt eine Vorschau
// zu zeigen, die nicht von der Seite kommt.
// ───────────────────────────────────────────────────────────────────────────

export interface LinkVorschau {
  /** Die Adresse, wie sie abgerufen wurde. */
  url: string
  /** „vimeo.com" — abgeleitet, und zwar aus der ADRESSE, nicht aus dem Inhalt. */
  host: string
  titel?: string
  beschreibung?: string
  /** Absolute Adresse des Vorschaubilds. Relative Angaben werden aufgelöst. */
  bildUrl?: string
  /** Name der Seite/des Dienstes, wenn die Seite ihn nennt (`og:site_name`). */
  seitenName?: string
  /** Wann abgerufen wurde. Eine Vorschau ohne Zeitpunkt altert unbemerkt. */
  geholtAm?: number
}

/** Ein `<meta>`-Paar aus dem Kopf der Seite. */
interface MetaPaar {
  schluessel: string
  wert: string
}

/**
 * Die `<meta>`-Angaben eines HTML-Dokuments.
 *
 * Bewusst mit einem regulären Ausdruck und ohne HTML-Parser: das Paket läuft
 * auch im Browser-Bündel der Planer, und ein Parser dafür wäre ein halbes
 * Megabyte für vier Felder. Gelesen wird nur der KOPF — ein `<meta>` weiter
 * unten im Text ist keins, und ein Dokument, das keinen `</head>` hat, gibt
 * nichts her statt alles.
 */
function metaPaare(html: string): MetaPaar[] {
  const kopfEnde = html.search(/<\/head>/i)
  const kopf = kopfEnde >= 0 ? html.slice(0, kopfEnde) : html.slice(0, 50_000)
  const out: MetaPaar[] = []
  for (const m of kopf.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0]!
    const name =
      /\b(?:property|name)\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ??
      /\b(?:property|name)\s*=\s*'([^']*)'/i.exec(tag)?.[1]
    const content =
      /\bcontent\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? /\bcontent\s*=\s*'([^']*)'/i.exec(tag)?.[1]
    if (name && content !== undefined) out.push({ schluessel: name.toLowerCase(), wert: content })
  }
  return out
}

/** `&amp;` und Freunde. Nur die fünf, die in Titeln wirklich vorkommen. */
function entschaerfe(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

const hostVon = (url: string): string => {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Eine Vorschau aus dem HTML einer Seite.
 *
 * Reihenfolge je Feld: Open Graph, dann Twitter, dann das gewöhnliche HTML.
 * Das ist keine Geschmacksfrage — `og:title` ist die Angabe, die die Seite
 * FÜR eine Vorschau macht, `<title>` die für den Fensterrahmen, und die
 * beiden sind oft verschieden („Sommershow 2026" gegen „Sommershow 2026 |
 * Nordlicht Media | Startseite").
 */
export function parseVorschau(html: string, url: string, geholtAm?: number): LinkVorschau {
  const paare = metaPaare(html)
  const meta = (...namen: string[]): string | undefined => {
    for (const n of namen) {
      const treffer = paare.find((p) => p.schluessel === n && p.wert.trim())
      if (treffer) return entschaerfe(treffer.wert)
    }
    return undefined
  }

  const titelTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]
  const titel = meta('og:title', 'twitter:title') ?? (titelTag ? entschaerfe(titelTag) : undefined)
  const beschreibung = meta('og:description', 'twitter:description', 'description')
  const bildRoh = meta('og:image', 'og:image:url', 'twitter:image', 'twitter:image:src')

  let bildUrl: string | undefined
  if (bildRoh) {
    try {
      // Relative Bildadressen aufloesen. Ein `/bild.jpg` ohne Aufloesung
      // waere ein Bild auf DIESEM Rechner — im Zweifel keins.
      bildUrl = new URL(bildRoh, url).toString()
    } catch {
      bildUrl = undefined
    }
  }

  return {
    url,
    host: hostVon(url),
    ...(titel ? { titel } : {}),
    ...(beschreibung ? { beschreibung } : {}),
    ...(bildUrl ? { bildUrl } : {}),
    ...(meta('og:site_name') ? { seitenName: meta('og:site_name') } : {}),
    ...(geholtAm !== undefined ? { geholtAm } : {}),
  }
}

/**
 * Taugt diese Adresse für einen Abruf?
 *
 * Nur `http`/`https`. Alles andere — `file:`, `data:`, `javascript:` — wird
 * abgelehnt und nicht „repariert": ein Abruf, den der Hauptprozess mit den
 * Rechten der Anwendung ausführt, ist genau die Stelle, an der eine
 * `file:`-Adresse aus einem fremden Projekt die Platte ausliest.
 */
export function abrufbar(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

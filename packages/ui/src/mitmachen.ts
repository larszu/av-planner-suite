// ───────────────────────────────────────────────────────────────────────────
// MITMACHEN — zwei Leute an einem Board, ohne dass jemand einen Server mietet.
//
// ─── DER GRUND, AUS DEM ES DAS NICHT GAB ──────────────────────────────────
//
//   > Echtzeit-Zusammenarbeit (Milanote: Teams einladen) — braucht einen
//   > Server. Die Suite hat dafür eine eigene, offene Kette:
//   > `cable-planner#868`–`#871`, und die steht vor einem Nachfragetest.
//   > Ein halbes Echtzeit-Board wäre schlimmer als keins.
//
// Der Satz setzt „Server" mit „gemieteter Rechner im Netz" gleich, und genau
// da ist er falsch. Die Leute, die zusammen an einer Show planen, sitzen im
// selben Raum oder in derselben Halle — sie sind im selben Netz. Einer macht
// auf, die anderen kommen dazu. Das ist kein Dienst, den jemand betreibt,
// sondern ein Fenster, das jemand offenlässt; es kostet nichts, hält nichts
// vorrätig und ist weg, wenn er es zumacht.
//
// Die offene Kette bleibt offen: sie handelt von Zusammenarbeit ÜBER das
// Internet, mit Konten und Fremdverwahrung. Das hier beantwortet sie nicht —
// es macht sie nur für den häufigen Fall unnötig.
//
// ─── WAS HIER LIEGT, UND WARUM GERADE HIER ────────────────────────────────
//
// Nur das ZUSAMMENFÜHREN. Rein: keine Uhr, kein Netz, keine Speicherung.
// Deshalb ist es prüfbar — und deshalb liegt es im geteilten Paket: ein
// Verfahren, das nur die Shell kennt, hilft dem Licht-Planer nicht, und zwei
// Fassungen davon liefen beim ersten Konflikt auseinander.
//
// ─── DAS VERFAHREN, UND WARUM ES REICHT ───────────────────────────────────
//
// Je KARTE der jüngere Stand gewinnt, und Löschungen hinterlassen eine
// Spur. Das ist kein CRDT mit Zeichen-Auflösung — zwei Leute, die
// GLEICHZEITIG denselben Satz auf derselben Karte tippen, verlieren einen
// davon. Das ist eine bewusste Grenze und keine Lücke:
//
//   * Auf einem Board arbeiten Leute an VERSCHIEDENEN Karten. Der Fall, den
//     ein Zeichen-CRDT löst, ist der seltene; der Fall, den dieses Verfahren
//     löst — zwei Karten gleichzeitig bewegen, eine löschen, während die
//     andere schreibt — ist der häufige.
//   * Ein Zeichen-CRDT trägt seine Geschichte im Dokument mit. Das Projekt
//     ist eine Datei, die jemand weitergibt; eine Datei, die mit jeder
//     getippten Zeile wächst und nie kleiner wird, ist ein anderes Produkt.
//
// DIE STÄNDE STEHEN NICHT IM DOKUMENT. Sie leben in der Sitzung
// (`Staende`), und das ist Absicht: ein Projekt, das Bearbeitungsstände
// trägt, trägt sie auch dann noch, wenn niemand mehr mitmacht — und wer die
// Datei weitergibt, gäbe die Uhren fremder Rechner mit.
//
// ─── TOTE KARTEN ──────────────────────────────────────────────────────────
//
// Eine gelöschte Karte wird ein GRABSTEIN und verschwindet nicht einfach.
// Ohne ihn bringt der nächste Stand des anderen Rechners sie zurück: er
// kennt sie ja noch, und „ich habe sie nicht" ist ununterscheidbar von „ich
// habe sie noch nie gesehen".
// ───────────────────────────────────────────────────────────────────────────

/** Eine Karte, soweit das Zusammenführen sie kennen muss. */
export interface MitmachKarte {
  id: string
  [feld: string]: unknown
}

/** Was auf einer Fläche liegt und zusammengeführt wird. */
export interface MitmachFlaeche {
  cards: MitmachKarte[]
  connections?: { id: string; [feld: string]: unknown }[]
  [feld: string]: unknown
}

/**
 * Der Stand je Objekt: wann es zuletzt angefasst wurde, und von wem.
 *
 * `wann` ist die Uhr DES ÄNDERNDEN Rechners. Uhren gehen auseinander —
 * deshalb entscheidet bei Gleichstand `wer`, und zwar nach einer festen
 * Ordnung statt nach „wer zuerst kam": nur so kommen zwei Rechner, die
 * dieselben zwei Stände in anderer Reihenfolge sehen, auf dasselbe Ergebnis.
 */
export interface Stand {
  wann: number
  wer: string
  /** Gelöscht. Der Grabstein bleibt, sonst kehrt die Karte zurück. */
  tot?: boolean
}

export type Staende = Record<string, Stand>

/** Welcher der beiden Stände gewinnt? Ohne Seiteneffekt, ohne Uhr. */
export function juenger(a: Stand | undefined, b: Stand | undefined): Stand | undefined {
  if (!a) return b
  if (!b) return a
  if (a.wann !== b.wann) return a.wann > b.wann ? a : b
  // Gleichstand: die Kennung entscheidet. Nicht „meiner gewinnt" — das
  // ergäbe auf zwei Rechnern zwei verschiedene Ergebnisse.
  if (a.wer !== b.wer) return a.wer > b.wer ? a : b
  // Gleiche Uhr, gleicher Absender: eine Löschung ist die stärkere Aussage.
  // Sonst hinge das Ergebnis an der Reihenfolge der Zustellung.
  return a.tot ? a : b
}

export interface Zusammenfuehrung {
  flaeche: MitmachFlaeche
  staende: Staende
}

/**
 * Zwei Stände einer Fläche zusammenführen.
 *
 * REIHENFOLGE-UNABHÄNGIG: `f(a, b)` und `f(b, a)` liefern dieselbe Fläche.
 * Das ist die Eigenschaft, an der alles hängt — ohne sie sehen zwei Rechner,
 * die dieselben Änderungen in anderer Folge bekommen, dauerhaft Verschiedenes.
 *
 * `eigen`/`fremd` sind nur Namen für die zwei Seiten; keine ist bevorzugt.
 */
export function fuehreFlaecheZusammen(
  eigen: MitmachFlaeche,
  eigenStaende: Staende,
  fremd: MitmachFlaeche,
  fremdStaende: Staende,
): Zusammenfuehrung {
  const staende: Staende = {}
  for (const id of new Set([...Object.keys(eigenStaende), ...Object.keys(fremdStaende)])) {
    const s = juenger(eigenStaende[id], fremdStaende[id])
    if (s) staende[id] = s
  }

  const ausEigen = new Map(eigen.cards.map((k) => [k.id, k]))
  const ausFremd = new Map(fremd.cards.map((k) => [k.id, k]))

  const karten: MitmachKarte[] = []
  // Die Reihenfolge folgt der EIGENEN Fläche und hängt die unbekannten
  // Karten hinten an. Eine Sortierung nach Zeit würde die Anordnung auf dem
  // Board umwerfen — und die Anordnung IST der Inhalt (ADR-001).
  const gesehen = new Set<string>()
  const nimm = (id: string) => {
    if (gesehen.has(id)) return
    gesehen.add(id)
    if (staende[id]?.tot) return
    const e = ausEigen.get(id)
    const f = ausFremd.get(id)
    if (!e && !f) return
    if (e && !f) { karten.push(e); return }
    if (f && !e) { karten.push(f); return }
    // Beide kennen sie: die Fassung von dem, dessen Stand gewinnt.
    const s = staende[id]
    const ausFremdSeite = s && fremdStaende[id] && juenger(eigenStaende[id], fremdStaende[id]) === fremdStaende[id]
    karten.push(ausFremdSeite ? f! : e!)
  }
  for (const k of eigen.cards) nimm(k.id)
  for (const k of fremd.cards) nimm(k.id)

  // Eine Verbindung ohne beide Enden ist keine. Sie wird nicht „repariert" —
  // sie fällt weg, und das ist die ehrliche Folge einer gelöschten Karte.
  const ids = new Set(karten.map((k) => k.id))
  const verbindungen = [...(eigen.connections ?? []), ...(fremd.connections ?? [])]
  const vGesehen = new Set<string>()
  const connections = verbindungen.filter((v) => {
    if (vGesehen.has(v.id)) return false
    vGesehen.add(v.id)
    if (staende[v.id]?.tot) return false
    return ids.has(String(v.from)) && ids.has(String(v.to))
  })

  // Die Felder der FLÄCHE selbst (Format, Standzeit, Vertonung) sind nicht
  // je Karte versioniert. Sie folgen dem Stand unter dem Schlüssel
  // `FLAECHE` — eine eigene Zeile, damit „jemand hat das Format geändert"
  // nicht an einer beliebigen Karte hängt.
  const flaecheAusFremd =
    juenger(eigenStaende[FLAECHE], fremdStaende[FLAECHE]) === fremdStaende[FLAECHE] && !!fremdStaende[FLAECHE]
  const basis = flaecheAusFremd ? fremd : eigen

  return {
    flaeche: { ...basis, cards: karten, connections },
    staende,
  }
}

/** Der Schlüssel für die Felder der Fläche selbst (Format, Standzeit, Ton). */
export const FLAECHE = '__flaeche'

/**
 * Den Stand fortschreiben: diese Objekte hat `wer` gerade angefasst.
 *
 * Die Uhr kommt von aussen (`wann`), damit die Funktion rein bleibt — und
 * damit ein Test sie festhalten kann, statt eine Sekunde zu warten.
 */
export function markiere(staende: Staende, ids: readonly string[], wer: string, wann: number, tot = false): Staende {
  const neu: Staende = { ...staende }
  for (const id of ids) neu[id] = tot ? { wann, wer, tot: true } : { wann, wer }
  return neu
}

/**
 * Welche Objekte sind seit `seit` angefasst worden?
 *
 * Damit schickt ein Rechner nicht das ganze Board, sondern das Neue. Die
 * Grenze ist `>` und nicht `>=`: sonst käme bei jedem Takt wieder dasselbe.
 */
export function seither(staende: Staende, seit: number): string[] {
  return Object.keys(staende).filter((id) => staende[id]!.wann > seit)
}

// ─── WER GERADE DA IST ────────────────────────────────────────────────────

/**
 * Anwesenheit.
 *
 * Sie ist FLÜCHTIG und gehört niemals ins Projekt: ein Zeiger, der in einer
 * gespeicherten Datei steht, ist ein Zeiger von jemandem, der längst weg ist.
 */
export interface Anwesend {
  /** Kennung dieser Sitzung, nicht dieser Person. Zwei Fenster, zwei Kennungen. */
  sitzung: string
  name: string
  farbe: string
  initialen: string
  /** Wo der Zeiger steht, in Flächen-Koordinaten. Fehlt er, ist er ausserhalb. */
  x?: number
  y?: number
  /** Welches Objekt gerade ausgewählt ist — damit niemand daran zieht. */
  haelt?: string
  /** Zuletzt gehört. Wer zu lange schweigt, ist gegangen. */
  zuletzt: number
}

/** Nach dieser Stille gilt jemand als gegangen. Drei Takte, nicht einer:
 *  ein Zeiger, der bei jedem Aussetzer verschwindet, flackert. */
export const STILLE_MS = 9000

/** Wer ist jetzt noch da? Rein — die Uhr kommt von aussen. */
export function nochDa(alle: readonly Anwesend[], jetzt: number, eigeneSitzung?: string): Anwesend[] {
  return alle.filter((a) => a.sitzung !== eigeneSitzung && jetzt - a.zuletzt < STILLE_MS)
}

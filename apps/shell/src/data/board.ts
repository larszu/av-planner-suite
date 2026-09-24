import type { Board, BoardCard, BoardCardType, BoardConnection } from './project'
import { objektAnzeige, type PlanAusschnitt } from './boardObjekt'

/* Reine Board-Logik: Layout (inkl. Spalten), Vorlagen und Markdown-Export.
 * Bewusst ohne React, damit sie testbar bleibt. */

export interface Rect { x: number; y: number; w: number; h: number }

export const COL_HEADER = 34
export const COL_PAD = 8
export const COL_GAP = 8

/** Deterministische Höhe je Kartentyp (Spalten werden im Layout berechnet). */
export function cardHeight(card: BoardCard): number {
  switch (card.type) {
    case 'heading': return 44
    case 'note': return 104
    case 'link': return 70
    case 'todo': return 46 + (card.items?.length ?? 0) * 24
    case 'color': return 96
    case 'look': return 148
    case 'column': return COL_HEADER + 40
    case 'board': return 116
    case 'image': return Math.round(card.w / (card.ratio && card.ratio > 0 ? card.ratio : 1.5)) + 24
    // Ein Film bekommt dieselbe Rechnung wie ein Bild plus die Bedienleiste;
    // ohne sie schnitte die Karte genau die Knoepfe ab, die man braucht.
    case 'video': return Math.round(card.w / (card.ratio && card.ratio > 0 ? card.ratio : 16 / 9)) + 58
    case 'audio': return 84
    case 'file': return 92
    // Fest und nicht nach Inhalt: die Karte zeigt LIVE-Daten, und eine Hoehe,
    // die mit der Brennweite wuechse, schnitte die Karte darunter um, sobald
    // im Kameraplan jemand das Objektiv tauscht.
    case 'object': return 118
  }
}

const EMPTY: Board = { cards: [], connections: [] }

/** Das Board am angegebenen Pfad (Kette von Unterboard-Karten-IDs). */
export function getBoardAtPath(board: Board, path: string[]): Board {
  let cur = board
  for (const id of path) {
    const card = cur.cards.find((c) => c.id === id && c.type === 'board')
    if (!card?.board) return cur
    cur = card.board
  }
  return cur
}

/** Wendet `fn` auf das Board am Pfad an und gibt eine neue Wurzel zurück (immutabel). */
export function updateBoardAtPath(board: Board, path: string[], fn: (b: Board) => Board): Board {
  if (path.length === 0) return fn(board)
  const [head, ...rest] = path
  return {
    ...board,
    cards: board.cards.map((c) =>
      c.id === head && c.type === 'board'
        ? { ...c, board: updateBoardAtPath(c.board ?? EMPTY, rest, fn) }
        : c,
    ),
  }
}

/** Titel-Kette für die Breadcrumb-Navigation (Wurzel + jede Unterboard-Ebene). */
export function crumbTitles(board: Board, path: string[], rootTitle: string): { id: string; title: string }[] {
  const crumbs = [{ id: '', title: rootTitle }]
  let cur = board
  for (const id of path) {
    const card = cur.cards.find((c) => c.id === id)
    crumbs.push({ id, title: card?.title ?? 'Unterboard' })
    cur = card?.board ?? EMPTY
  }
  return crumbs
}

/**
 * Absolute Rechtecke aller Karten. Freie Karten liegen an ihrer eigenen
 * Position; Spalten-Mitglieder werden vertikal im Container gestapelt, sodass
 * sie mit der Spalte wandern. Anker für Verbindungslinien kommen aus dieser Map.
 */
export function layoutBoard(cards: BoardCard[]): Map<string, Rect> {
  const map = new Map<string, Rect>()
  for (const c of cards) {
    if (c.type === 'column' || c.columnId) continue
    map.set(c.id, { x: c.x, y: c.y, w: c.w, h: cardHeight(c) })
  }
  for (const col of cards.filter((c) => c.type === 'column')) {
    const members = cards.filter((c) => c.columnId === col.id)
    const innerW = col.w - COL_PAD * 2
    let y = col.y + COL_HEADER + COL_PAD
    for (const m of members) {
      const h = cardHeight(m)
      map.set(m.id, { x: col.x + COL_PAD, y, w: innerW, h })
      y += h + COL_GAP
    }
    const contentH = members.length ? y - COL_GAP - col.y : COL_HEADER + 40
    map.set(col.id, { x: col.x, y: col.y, w: col.w, h: Math.max(COL_HEADER + 40, contentH + COL_PAD) })
  }
  return map
}

/* ── Vorlagen ──────────────────────────────────────────────────────────────*/

export type TemplateId = 'moodboard' | 'brief' | 'storyboard'

export interface TemplateResult { cards: BoardCard[]; connections: BoardConnection[] }

const SWATCHES = ['#f5a623', '#38bdf8', '#a78bfa', '#34d399']

export function applyTemplate(id: TemplateId, gen: () => string): TemplateResult {
  if (id === 'moodboard') {
    const h = gen()
    const looks = ['Warmes Bühnenlicht', 'Kühle Akzente', 'Publikum im Dunkel']
    const cards: BoardCard[] = [
      { id: h, type: 'heading', x: 60, y: 40, w: 320, text: 'Look & Feel' },
      ...looks.map((t, i): BoardCard => ({ id: gen(), type: 'look', x: 60 + i * 210, y: 120, w: 190, title: t, color: SWATCHES[i] })),
      { id: gen(), type: 'note', x: 60, y: 300, w: 240, text: 'Stimmung, Kontrast, Key/Fill — Abgleich mit der Licht-Ebene.' },
    ]
    return { cards, connections: [{ id: gen(), from: h, to: cards[1].id }] }
  }
  if (id === 'brief') {
    const colId = gen()
    const col: BoardCard = { id: colId, type: 'column', x: 80, y: 60, w: 300, title: 'Kreativ-Brief' }
    const notes = [
      'Ziel: Sommershow als Broadcast-Event, warm & einladend.',
      'Stil: kinoartiges Licht, ruhige Kameraführung.',
      'Referenzen: Show 2025, Key/Fill 2,8 : 1.',
      'Rahmen: Budget & Zeitplan siehe Übersicht.',
    ]
    const members = notes.map((t): BoardCard => ({ id: gen(), type: 'note', x: 0, y: 0, w: 0, text: t, columnId: colId }))
    return { cards: [col, ...members], connections: [] }
  }
  // storyboard
  const h = gen()
  const scenes = ['Intro / Opener', 'Talk · Host + Gast', 'Live-Act', 'Outro']
  const cards: BoardCard[] = [
    { id: h, type: 'heading', x: 60, y: 40, w: 320, text: 'Storyboard' },
    ...scenes.map((t, i): BoardCard => ({ id: gen(), type: 'look', x: 60 + i * 200, y: 120, w: 180, title: `${i + 1}. ${t}`, color: SWATCHES[i % SWATCHES.length] })),
  ]
  return { cards, connections: [] }
}

/* ── Markdown-Export ───────────────────────────────────────────────────────*/

function cardMarkdown(c: BoardCard, plan?: PlanAusschnitt): string {
  switch (c.type) {
    case 'heading': return `## ${c.text ?? ''}`
    case 'note': return c.text ?? ''
    case 'link': return `- [${c.title ?? c.url ?? 'Link'}](${c.url ?? ''})`
    case 'todo': return [`**${c.title ?? 'To-do'}**`, ...(c.items ?? []).map((i) => `- [${i.done ? 'x' : ' '}] ${i.text}`)].join('\n')
    // Im Markdown steht der DATEINAME und nicht die data-URL: ein
    // eingebettetes Video waere dort ein Megabyte Zeichensalat, und der
    // Leser sucht den Namen.
    case 'video':
    case 'audio':
    case 'file':
      return `- ${c.title ?? c.fileName ?? ''}${c.fileName && c.title !== c.fileName ? ` (${c.fileName})` : ''}`
    case 'color': return `- ${c.title ?? 'Farbe'} \`${c.color ?? ''}\``
    case 'look': return `- Look: ${c.title ?? ''}`
    case 'image': return `- Bild: ${c.title ?? 'Foto'}`
    case 'column': return ''
    case 'board': return ''
    // Auch im Export steht, was der Plan JETZT sagt — und nicht, was beim
    // Anlegen der Karte galt. Ohne Plan bleibt nur der Verweis.
    case 'object': {
      const a = objektAnzeige(c, plan)
      if (a.status === 'ohne-plan') return `- Plan-Objekt ${c.ref?.id ?? '—'} (kein Plan geöffnet)`
      if (a.status === 'weg') return `- Objekt nicht mehr im Plan (${c.ref?.id ?? '—'})`
      if (a.art === 'geraet') return `- ${a.name}${a.model ? ` (${a.model})` : ''}`
      return `- ${a.label} · ${a.type} · ${a.von.name ?? a.von.id} → ${a.nach.name ?? a.nach.id}`
    }
  }
}

const hashes = (n: number) => '#'.repeat(Math.min(6, n))

/** Ein Board-Abschnitt inkl. Spalten und rekursiver Unterboards. */
function boardSection(board: Board, title: string, level: number, plan?: PlanAusschnitt): string[] {
  const lines: string[] = [`${hashes(level)} ${title}`, '']
  const rendered = new Set<string>()
  for (const col of board.cards.filter((c) => c.type === 'column')) {
    lines.push(`${hashes(level + 1)} ${col.title ?? 'Spalte'}`, '')
    for (const m of board.cards.filter((c) => c.columnId === col.id)) {
      lines.push(cardMarkdown(m, plan), '')
      rendered.add(m.id)
    }
    rendered.add(col.id)
  }
  const free = board.cards.filter((c) => !rendered.has(c.id) && c.type !== 'column' && !c.columnId)
  for (const c of free) {
    if (c.type === 'board') {
      lines.push(...boardSection(c.board ?? EMPTY, `${c.title ?? 'Unterboard'} (Unterboard)`, level + 1, plan))
    } else {
      lines.push(cardMarkdown(c, plan), '')
    }
  }
  return lines
}

/**
 * Wandelt ein Board (inkl. verschachtelter Unterboards) in ein Markdown-Dokument.
 * `plan` loest Objekt-Karten auf; fehlt er, steht dort nur ihr Verweis.
 */
export function boardToMarkdown(board: Board, title = 'Kreativ-Board', plan?: PlanAusschnitt): string {
  return `${boardSection(board, title, 1, plan).join('\n').trim()}\n`
}

/**
 * Welche Karten ein aufgezogener Rahmen einsammelt.
 *
 * ─── BERUEHRT, NICHT UMSCHLOSSEN ────────────────────────────────────────
 *
 * Eine Karte gehoert dazu, sobald der Rahmen sie SCHNEIDET — nicht erst,
 * wenn er sie ganz enthaelt. Das ist keine Bequemlichkeit: auf einem
 * Moodboard sind die Bilder gross, und ein Rahmen, der sie ganz umfassen
 * muss, zwingt dazu, ueber den halben Bildschirm zu ziehen, um drei Karten
 * zu erwischen, die nebeneinanderliegen. Milanote, Figma und jedes
 * Zeichenprogramm machen es so.
 *
 * Der Vergleich ist bewusst STRIKT (`<`, nicht `<=`): ein Rahmen, der eine
 * Kante genau beruehrt, hat die Karte nicht gemeint. Ohne das sammelte ein
 * Klick mit dem kleinsten Zittern alles ein, was zufaellig an derselben
 * Linie liegt.
 *
 * ─── EIN KLICK IST KEIN RAHMEN ──────────────────────────────────────────
 *
 * Unter `RAHMEN_MIN` Pixeln Kantenlaenge sammelt der Rahmen NICHTS ein. Ein
 * Klick auf die freie Flaeche erzeugt technisch einen Rahmen der Groesse
 * null, und der liegt mitten auf der Karte, ueber die man geklickt hat —
 * ohne diese Schwelle waehlte „danebenklicken" die Karte aus, statt
 * abzuwaehlen. Die Schwelle steht HIER und nicht im Ereignis-Handler, damit
 * sie mit der Trefferregel zusammen gemessen wird.
 *
 * Reine Rechnung, damit sie gemessen werden kann — im Ereignis-Handler der
 * Flaeche waere sie es nicht.
 */
export const RAHMEN_MIN = 4

export function imRahmen(
  cards: readonly BoardCard[],
  layout: ReadonlyMap<string, Rect>,
  rahmen: Rect,
): string[] {
  if (rahmen.w < RAHMEN_MIN && rahmen.h < RAHMEN_MIN) return []
  return cards
    .filter((c) => {
      const r = layout.get(c.id)
      return (
        !!r &&
        r.x < rahmen.x + rahmen.w &&
        r.x + r.w > rahmen.x &&
        r.y < rahmen.y + rahmen.h &&
        r.y + r.h > rahmen.y
      )
    })
    .map((c) => c.id)
}

// ───────────────────────────────────────────────────────────────────────────
// DAS BOARD ALS FILM — die Schnittfolge.
//
// NUTZER-AUFTRAG 2026-09-20: das Board soll auch wie `recceboard` sein. Dort
// ist ein Board keine Pinnwand, sondern eine FOLGE: die Einstellungen laufen
// der Reihe nach als Film, jede mit ihrer Standzeit, und heraus geht ein
// Kontaktabzug.
//
// Das Gegenteil von Milanote also — dort ist die Fläche frei, hier hat sie
// eine Reihenfolge. Beides zugleich geht, wenn die Reihenfolge NICHT
// zusätzlich verwaltet wird, sondern aus der Lage abgelesen: wer eine Karte
// verschiebt, schneidet damit um, und es gibt keine zweite Liste, die
// danach nicht mehr stimmt (ADR-001).
//
// ─── WIE DIE REIHENFOLGE ENTSTEHT ─────────────────────────────────────────
//
// Wie man liest: zeilenweise von oben, innerhalb einer Zeile von links. Eine
// „Zeile" ist dabei ein BAND und keine Linie — zwei Bilder, die um zwölf
// Pixel gegeneinander versetzt hängen, sind für das Auge nebeneinander und
// müssen es auch für den Schnitt sein. `ZEILEN_BAND` ist die Höhe dieses
// Bandes.
//
// Ohne das Band entschiede der Zufall des Ablegens: eine Karte, die zwei
// Pixel höher sitzt, käme eine Einstellung früher, und niemand sähe warum.
// ───────────────────────────────────────────────────────────────────────────

/** Vorgabe-Standzeit einer Einstellung, wenn weder Karte noch Board etwas sagen. */
export const DEFAULT_SHOT_S = 3

/** Höhe des Bandes, in dem zwei Karten als „nebeneinander" gelten. */
export const ZEILEN_BAND = 140

/** Welche Kartenarten eine Einstellung sind. Eine Notiz ist keine. */
export const SHOT_TYPES: readonly BoardCardType[] = ['image', 'look']

export interface Shot {
  card: BoardCard
  /** Laufende Nummer ab 1 — die Zahl, die auf dem Kontaktabzug steht. */
  nr: number
  /** Standzeit in Sekunden: Karte, sonst Board, sonst Vorgabe. */
  durationS: number
  /** Beginn im fertigen Film, in Sekunden. */
  startS: number
}

/**
 * Die Einstellungen dieses Boards, in Schnittfolge.
 *
 * Karten IN einer Spalte zählen mit und stehen an der Stelle der Spalte —
 * eine Spalte ist auf diesen Boards eine Sequenz, und sie zu überspringen
 * hiesse, den halben Film wegzulassen. Gerechnet wird gegen das LAYOUT und
 * nicht gegen `x`/`y`, weil ein Spalten-Mitglied seine eigene Lage gar nicht
 * kennt.
 */
export function shotSequence(board: Board, layout?: ReadonlyMap<string, Rect>): Shot[] {
  const lage = layout ?? layoutBoard(board.cards)
  const vorgabe = board.shotSeconds && board.shotSeconds > 0 ? board.shotSeconds : DEFAULT_SHOT_S

  const kandidaten = board.cards
    .filter((c) => SHOT_TYPES.includes(c.type))
    .map((c) => ({ card: c, r: lage.get(c.id) }))
    .filter((e): e is { card: BoardCard; r: Rect } => !!e.r)

  kandidaten.sort((a, b) => {
    const zeileA = Math.floor(a.r.y / ZEILEN_BAND)
    const zeileB = Math.floor(b.r.y / ZEILEN_BAND)
    if (zeileA !== zeileB) return zeileA - zeileB
    if (a.r.x !== b.r.x) return a.r.x - b.r.x
    // Gleiche Zeile, gleiche Spalte: die obere zuerst. Ohne diesen letzten
    // Vergleich haengt die Reihenfolge an der Reihenfolge im Array, und die
    // aendert sich beim Verschieben einer ganz anderen Karte.
    return a.r.y - b.r.y
  })

  let start = 0
  return kandidaten.map((e, i) => {
    const d = e.card.durationS && e.card.durationS > 0 ? e.card.durationS : vorgabe
    const shot: Shot = { card: e.card, nr: i + 1, durationS: d, startS: start }
    start += d
    return shot
  })
}

/** Gesamtlaufzeit in Sekunden. 0 heisst: keine Einstellung auf dem Board. */
export const sequenceSeconds = (shots: readonly Shot[]): number =>
  shots.reduce((n, s) => n + s.durationS, 0)

/** „1:04" — Minuten und Sekunden, wie eine Laufzeit gelesen wird. */
export function formatLaufzeit(sekunden: number): string {
  const ganz = Math.max(0, Math.round(sekunden))
  const m = Math.floor(ganz / 60)
  const s = ganz % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Welche Einstellung laeuft zur Zeit t? `null`, wenn der Film vorbei ist. */
export function shotAt(shots: readonly Shot[], t: number): Shot | null {
  for (const s of shots) if (t >= s.startS && t < s.startS + s.durationS) return s
  return null
}

// ───────────────────────────────────────────────────────────────────────────
// SZENEN — zwei Einstellungen nebeneinander sind eine Szene.
//
// Wörtlich aus der Hilfe von `recceboard`: „Shots placed close together on
// the same line are joined by a dotted line: they read as one scene. Pull one
// away and the link breaks."
//
// Das ist der Grund, warum das dort ein BOARD ist und keine Liste: die
// Gruppierung wird nicht verwaltet, sie entsteht aus der Lage. Wer eine
// Einstellung wegzieht, löst sie aus der Szene, und niemand muss eine Gruppe
// auflösen, die es nur in einer Datenstruktur gab.
//
// Dieselbe Regel wie bei der Schnittfolge, und aus demselben Grund (ADR-001):
// eine geführte Szenen-Liste wäre die zweite Wahrheit neben der Anordnung.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Abstand, bis zu dem zwei Einstellungen derselben Zeile als EINE Szene
 * gelesen werden.
 *
 * Gemessen zwischen rechter Kante und linker Kante, nicht zwischen den
 * Mittelpunkten: sonst hinge die Szene an der Breite der Karten, und zwei
 * grosse Bilder mit demselben sichtbaren Abstand fielen auseinander,
 * während zwei kleine zusammenblieben.
 */
export const SZENEN_LUECKE = 70

/**
 * Die Szenen dieses Boards, in Schnittfolge.
 *
 * Eine Szene ist immer mindestens eine Einstellung lang — eine einzeln
 * stehende Einstellung ist ihre eigene Szene und nicht „szenenlos". Das ist
 * keine Förmlichkeit: die Nummerierung soll durchlaufen, und ein Loch darin
 * wäre eine Aussage über das Board, die niemand gemacht hat.
 */
export function sceneGroups(
  shots: readonly Shot[],
  layout: ReadonlyMap<string, Rect>,
): Shot[][] {
  const gruppen: Shot[][] = []
  for (const s of shots) {
    const r = layout.get(s.card.id)
    const letzte = gruppen[gruppen.length - 1]
    const vorher = letzte?.[letzte.length - 1]
    const rv = vorher ? layout.get(vorher.card.id) : undefined

    const zusammen =
      !!r &&
      !!rv &&
      // Dieselbe Zeile — dasselbe Band wie bei der Schnittfolge, sonst
      // stimmten Reihenfolge und Szene nicht überein.
      Math.floor(r.y / ZEILEN_BAND) === Math.floor(rv.y / ZEILEN_BAND) &&
      r.x - (rv.x + rv.w) <= SZENEN_LUECKE &&
      r.x >= rv.x

    if (zusammen && letzte) letzte.push(s)
    else gruppen.push([s])
  }
  return gruppen
}

/** Zu welcher Szene (1-basiert) gehört eine Einstellung? */
export function sceneOf(gruppen: readonly Shot[][], cardId: string): number | null {
  for (let i = 0; i < gruppen.length; i += 1) {
    if (gruppen[i]!.some((s) => s.card.id === cardId)) return i + 1
  }
  return null
}

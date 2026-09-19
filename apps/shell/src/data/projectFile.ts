/**
 * Datei-Operationen der Shell für das SuiteProject: Serialisieren, Parsen,
 * Download („Speichern unter"), localStorage-Persistenz („Speichern") und ein
 * leeres Projekt („Neu"). Bewusst schlank und offline-tauglich — die eigentliche
 * Bearbeitung der Fachdaten passiert in den Planern; die Shell verwaltet den
 * Projekt-Container.
 */

import { PROJECT, emptyBoard, type SuiteGeraet, type SuiteProject } from './project'

const PERSIST_KEY = 'avplan.project'
const FILE_VERSION = 1

interface ProjectFile {
  format: 'avplanner-suite'
  version: number
  project: SuiteProject
}

/** Leeres, gültiges Projekt (alle Pflichtfelder gesetzt). */
export function blankProject(name = 'Neues Projekt'): SuiteProject {
  return {
    meta: { name, venue: '—', version: 1, saved: false },
    hall: { w: 20, h: 12 },
    stage: { x: 6, y: 2, w: 8, h: 3 },
    geraete: [],
    cables: [],
    show: {
      dateLabel: '',
      phase: 'planning',
      progress: 0,
      schedule: [],
      crew: [],
      budget: [],
      logistics: { vehicles: [], loadIn: '', distanceKm: 0 },
      contacts: [],
      tasks: [],
      board: emptyBoard(),
    },
    inventory: { items: [], nodes: [] },
  }
}

export function serializeProject(p: SuiteProject): string {
  const file: ProjectFile = { format: 'avplanner-suite', version: FILE_VERSION, project: p }
  return JSON.stringify(file, null, 2)
}

/**
 * Text (Dateiinhalt oder localStorage) zu einem Projekt parsen. Akzeptiert
 * sowohl das umhüllte Dateiformat als auch ein rohes Projekt-Objekt. Wirft bei
 * ungültigem Inhalt. Fehlende Felder werden aus blankProject aufgefüllt.
 */
export function parseProject(text: string): SuiteProject {
  const raw = JSON.parse(text) as unknown
  if (!raw || typeof raw !== 'object') throw new Error('Ungültige Projektdatei')
  const candidate =
    'project' in (raw as Record<string, unknown>) && (raw as { project?: unknown }).project
      ? (raw as { project: unknown }).project
      : raw
  const p = candidate as Partial<SuiteProject>
  if (!p.meta || typeof p.meta.name !== 'string') {
    throw new Error('Projektdatei ohne gültige Metadaten')
  }
  const base = blankProject()
  return {
    ...base,
    ...p,
    geraete: geraeteAusDatei(p),
    meta: { ...base.meta, ...p.meta, saved: true },
    hall: { ...base.hall, ...(p.hall ?? {}) },
    stage: { ...base.stage, ...(p.stage ?? {}) },
    show: { ...base.show, ...(p.show ?? {}) },
    inventory: { ...base.inventory, ...(p.inventory ?? {}) },
  } as SuiteProject
}

const sanitize = (s: string): string =>
  s.trim().replace(/[^\p{L}\p{N}\-_ ]/gu, '').replace(/\s+/g, '-').toLowerCase() || 'projekt'

/** „Speichern unter" — Projekt als .avsuite.json herunterladen. */
/**
 * Der Weg zu echten Dateien, wenn die Shell im Desktop-Fenster laeuft
 * (B-39.3). Im Browser gibt es ihn nicht — dort bleibt es beim Download und
 * beim Datei-Eingabefeld, und das ist keine Notloesung, sondern der einzige
 * Weg, den ein Browser hat.
 */
interface ProjectFileHost {
  save: (args: { path?: string; name: string; content: string }) => Promise<{
    ok: boolean; path?: string; canceled?: boolean; error?: string
  }>
  open: () => Promise<{ ok: boolean; path?: string; content?: string; canceled?: boolean; error?: string }>
}

/** Der Host, oder `null` im Browser. Nie werfen: die Shell laeuft in beidem. */
export function projectFileHost(): ProjectFileHost | null {
  try {
    const h = (window as unknown as { __suiteProjectFiles?: ProjectFileHost }).__suiteProjectFiles
    return h && typeof h.save === 'function' && typeof h.open === 'function' ? h : null
  } catch {
    return null
  }
}

export function downloadProject(p: SuiteProject): void {
  const blob = new Blob([serializeProject(p)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitize(p.meta.name)}.avsuite.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** „Speichern" — Projekt in localStorage ablegen. */
export function saveProjectLocal(p: SuiteProject): void {
  try {
    window.localStorage.setItem(PERSIST_KEY, serializeProject(p))
  } catch {
    /* Storage gesperrt/voll */
  }
}

/** Beim Start: zuletzt gespeichertes Projekt lesen (oder null). */
export function loadProjectLocal(): SuiteProject | null {
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY)
    if (!raw) return null
    return parseProject(raw)
  } catch {
    return null
  }
}

/** Demo-Projekt (Seed) — Startwert, wenn nichts gespeichert ist. */
export { PROJECT as DEMO_PROJECT }


// ───────────────────────────────────────────────────────────────────────────
// DIE MIGRATION: drei Listen -> eine (ADR-011, Stufe 2)
//
// Eine Projektdatei, die vor dem 2026-09-19 geschrieben wurde, traegt
// `cameras`, `fixtures` und `nodes` — und `SignalNode.represents`, die
// ERKLAERTE Zuordnung zwischen einem Knoten und der Kamera, fuer die er
// steht. Genau die braucht das Zusammenlegen, und genau deshalb hat sie so
// lange ueberlebt: das Geruest aus Stufe 1 ist jetzt die Migration.
//
// Wo niemand eine Zuordnung erklaert hat, entstehen ZWEI Geraete. Das ist die
// richtige Antwort und kein Verlust: zwei Datensaetze ohne erklaerte
// Verbindung SIND zwei Dinge, bis jemand etwas anderes sagt (ADR-002). Wer
// sie zusammenlegen will, tut es im Werkzeug — nicht ein Datei-Leser, der
// aus Namensaehnlichkeit raet.
//
// Die Funktion laeuft auf JEDE geladene Datei, auch auf neue: dort steht
// `geraete` schon, und dann gibt sie es unveraendert zurueck.
// ───────────────────────────────────────────────────────────────────────────

/** Die drei alten Listen, so wie eine alte Datei sie traegt. */
interface AlteListen {
  geraete?: SuiteGeraet[]
  cameras?: {
    id: string; name: string; model?: string; lens?: string; focalMm?: number
    hfovDeg?: number; x?: number; y?: number; linked?: boolean
  }[]
  fixtures?: {
    id: string; name: string; model?: string; purpose?: string; dimmerPct?: number
    dmxChannel?: number; universe?: number; rigHeightM?: number; x?: number; y?: number
  }[]
  nodes?: {
    id: string; name: string; sub?: string; group?: 'floor' | 'regie'; venue?: boolean
    nx?: number; ny?: number; kategorie?: string; model?: string
    represents?: { kind: 'camera' | 'fixture'; id: string }
  }[]
}

export function geraeteAusDatei(p: AlteListen): SuiteGeraet[] {
  if (p.geraete) return p.geraete

  const kameras = new Map((p.cameras ?? []).map((c) => [c.id, c]))
  const leuchten = new Map((p.fixtures ?? []).map((f) => [f.id, f]))
  const verbraucht = new Set<string>()

  const ausKnoten = (p.nodes ?? []).map((n): SuiteGeraet => {
    const k = n.represents?.kind === 'camera' ? kameras.get(n.represents.id) : undefined
    const l = n.represents?.kind === 'fixture' ? leuchten.get(n.represents.id) : undefined
    if (k) verbraucht.add(k.id)
    if (l) verbraucht.add(l.id)
    return {
      id: n.id,
      name: n.name,
      group: n.group ?? 'floor',
      venue: n.venue ?? true,
      ...(n.sub ? { sub: n.sub } : {}),
      ...(n.nx !== undefined ? { nx: n.nx } : {}),
      ...(n.ny !== undefined ? { ny: n.ny } : {}),
      // Die Kategorie des Knotens gewinnt; sonst sagt die erklaerte
      // Zuordnung, worum es sich handelt. Beides ist eine Aussage und keine
      // Ableitung aus dem Namen.
      ...(n.kategorie ?? (k ? 'Cameras' : l ? 'Licht' : undefined)
        ? { kategorie: n.kategorie ?? (k ? 'Cameras' : 'Licht') }
        : {}),
      ...(n.model ?? k?.model ?? l?.model ? { model: n.model ?? k?.model ?? l?.model } : {}),
      ...(k?.x ?? l?.x) !== undefined ? { x: k?.x ?? l?.x } : {},
      ...(k?.y ?? l?.y) !== undefined ? { y: k?.y ?? l?.y } : {},
      ...(k ? { kamera: kameraFelder(k) } : {}),
      ...(l ? { licht: lichtFelder(l) } : {}),
    }
  })

  const ausKameras = (p.cameras ?? [])
    .filter((c) => !verbraucht.has(c.id))
    .map((c): SuiteGeraet => ({
      id: c.id,
      name: c.name,
      kategorie: 'Cameras',
      group: 'floor',
      venue: true,
      ...(c.model ? { model: c.model } : {}),
      ...(c.x !== undefined ? { x: c.x } : {}),
      ...(c.y !== undefined ? { y: c.y } : {}),
      kamera: kameraFelder(c),
    }))

  const ausLeuchten = (p.fixtures ?? [])
    .filter((f) => !verbraucht.has(f.id))
    .map((f): SuiteGeraet => ({
      id: f.id,
      name: f.name,
      kategorie: 'Licht',
      group: 'floor',
      venue: true,
      ...(f.model ? { model: f.model } : {}),
      ...(f.x !== undefined ? { x: f.x } : {}),
      ...(f.y !== undefined ? { y: f.y } : {}),
      licht: lichtFelder(f),
    }))

  return [...ausKnoten, ...ausKameras, ...ausLeuchten]
}

const wenn = <T,>(wert: T | undefined, feld: string): Record<string, T> =>
  wert === undefined ? {} : ({ [feld]: wert } as Record<string, T>)

const kameraFelder = (c: NonNullable<AlteListen['cameras']>[number]) => ({
  ...wenn(c.lens, 'lens'),
  ...wenn(c.focalMm, 'focalMm'),
  ...wenn(c.hfovDeg, 'hfovDeg'),
  ...wenn(c.linked, 'linked'),
})

const lichtFelder = (f: NonNullable<AlteListen['fixtures']>[number]) => ({
  ...wenn(f.purpose, 'purpose'),
  ...wenn(f.dimmerPct, 'dimmerPct'),
  ...wenn(f.dmxChannel, 'dmxChannel'),
  ...wenn(f.universe, 'universe'),
  ...wenn(f.rigHeightM, 'rigHeightM'),
})

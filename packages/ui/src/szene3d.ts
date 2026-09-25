// ───────────────────────────────────────────────────────────────────────────
// suite#258 — die Show als 3D-Szene: Raum, Buehne, Kameras, Leuchten,
// Signalknoten und die Kabel dazwischen — aus EINEM Seed, also aus allen
// Planern zugleich.
//
// Gegenstueck im cable-planner: `lib/gebaeudeSzene.ts` (Raeume je Etage aus
// den Rahmen des Signalplans). Beide liefern dieselbe Form — Punkte in Metern,
// y nach oben —, damit eine Zeichnung beide lesen kann. Der Seed kennt heute
// EINEN Raum und keine Etagen; die Etagen-Sicht steht deshalb im Signalplan,
// die Gewerke-Sicht hier.
//
// NICHTS ERFINDEN. Ein Geraet ohne Lage (`x`/`y`) ist nicht platziert und
// fehlt in der Szene — gezaehlt, nicht an den Nullpunkt gelegt. Eine Leuchte
// ohne Haenge-Hoehe steht auf dem Boden und traegt `hoeheBekannt: false`;
// ein Kabel, dessen Ende nicht platziert ist, wird gezaehlt statt ins Leere
// gezeichnet.
//
// REIN: kein React, kein three.js — testbar ohne WebGL.
// ───────────────────────────────────────────────────────────────────────────
import { gewerkeFuer, type Gewerk, type SeedGeraet } from './geraet'
import type { SuiteSeed } from './seed'

export interface Punkt3D {
  x: number
  y: number
  z: number
}

export interface Szene3DGeraet {
  id: string
  name: string
  gewerk: Gewerk
  pos: Punkt3D
  /** false: die Hoehe ist nicht angegeben, das Geraet steht auf dem Boden. */
  hoeheBekannt: boolean
}

export interface Szene3DKabel {
  id: string
  label: string
  von: Punkt3D
  nach: Punkt3D
}

export interface Szene3D {
  /** Der Raum in Metern; null, wenn der Seed keine Masse nennt. */
  raum: { name: string; breite: number; tiefe: number } | null
  buehne: { x: number; z: number; breite: number; tiefe: number } | null
  geraete: Szene3DGeraet[]
  kabel: Szene3DKabel[]
  /** Geraete ohne Lage im Raum — nicht gezeichnet. */
  nichtPlatziert: number
  /**
   * Davon Signalgeraete. Eigens gezaehlt, weil ihr Weg in den Raum ein
   * anderer ist: Kamera und Leuchte platziert ihr Plan, ein Mischer steht
   * erst im Raum, wenn er im Signalplan auf dem Hallenplan mit Massstab liegt.
   */
  nichtPlatziertSignal: number
  /** Kabel mit mindestens einem nicht platzierten Ende. */
  kabelOhneLage: number
  mitte: Punkt3D
  groesse: number
}

/** Das Gewerk, in dem ein Geraet gezeichnet wird: die genaueste Angabe gewinnt. */
export function hauptGewerk(g: Pick<SeedGeraet, 'kategorie' | 'kamera' | 'licht'>): Gewerk {
  if (g.kamera) return 'kamera'
  if (g.licht) return 'licht'
  const gewerke = gewerkeFuer(g.kategorie)
  if (gewerke.includes('kamera')) return 'kamera'
  if (gewerke.includes('licht')) return 'licht'
  return 'signal'
}

const endlich = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function szeneAusSeed(seed: Pick<SuiteSeed, 'venue' | 'geraete' | 'cables'>): Szene3D {
  const { venue } = seed
  const raum =
    endlich(venue.widthM) && endlich(venue.heightM) && venue.widthM > 0 && venue.heightM > 0
      ? { name: venue.name, breite: venue.widthM, tiefe: venue.heightM }
      : null
  const buehne = venue.stage
    ? { x: venue.stage.x, z: venue.stage.y, breite: venue.stage.w, tiefe: venue.stage.h }
    : null

  const geraete: Szene3DGeraet[] = []
  let nichtPlatziert = 0
  let nichtPlatziertSignal = 0
  for (const g of seed.geraete) {
    const gewerk = hauptGewerk(g)
    if (!endlich(g.x) || !endlich(g.y)) {
      nichtPlatziert += 1
      if (gewerk === 'signal') nichtPlatziertSignal += 1
      continue
    }
    const haenge = gewerk === 'licht' && endlich(g.licht?.rigHeightM) ? g.licht!.rigHeightM! : undefined
    geraete.push({
      id: g.id,
      name: g.name,
      gewerk,
      pos: { x: g.x, y: haenge ?? 0, z: g.y },
      hoeheBekannt: haenge !== undefined,
    })
  }

  const byId = new Map(geraete.map((g) => [g.id, g]))
  const kabel: Szene3DKabel[] = []
  let kabelOhneLage = 0
  for (const c of seed.cables) {
    const von = byId.get(c.from)
    const nach = byId.get(c.to)
    if (!von || !nach) {
      kabelOhneLage += 1
      continue
    }
    kabel.push({ id: c.id, label: c.label, von: von.pos, nach: nach.pos })
  }

  const xs = [...geraete.map((g) => g.pos.x), ...(raum ? [0, raum.breite] : [])]
  const zs = [...geraete.map((g) => g.pos.z), ...(raum ? [0, raum.tiefe] : [])]
  const ys = [0, ...geraete.map((g) => g.pos.y)]
  const spanne = (a: number[]) => (a.length ? Math.max(...a) - Math.min(...a) : 0)
  const mitteVon = (a: number[]) => (a.length ? (Math.max(...a) + Math.min(...a)) / 2 : 0)
  return {
    raum,
    buehne,
    geraete,
    kabel,
    nichtPlatziert,
    nichtPlatziertSignal,
    kabelOhneLage,
    mitte: { x: mitteVon(xs), y: mitteVon(ys), z: mitteVon(zs) },
    groesse: Math.max(5, spanne(xs), spanne(zs), spanne(ys)),
  }
}

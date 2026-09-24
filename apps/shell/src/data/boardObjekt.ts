// ───────────────────────────────────────────────────────────────────────────
// OBJEKT-KARTEN — ein Geraet oder Kabel des Plans auf dem Board (suite#259).
//
// Bis hierher war das Board eine Insel: eine Notiz „CAM 3 als Beauty-Shot mit
// 135 mm" stand neben dem Plan und nicht an ihm. Benannte jemand die Kamera um
// oder schraubte ein anderes Objektiv an, stimmte die Notiz nicht mehr, und
// niemand sah es ihr an.
//
// ─── DIE KARTE FUEHRT NUR DEN VERWEIS ──────────────────────────────────────
//
// `BoardCard.ref` ist `{ art, id }` — sonst steht nichts vom Objekt auf der
// Karte (ADR-001). Was sie zeigt, rechnet `objektAnzeige` bei jedem Rendern
// aus dem Seed, den die Shell ohnehin an die Planer schickt. Umbenennen im
// Kameraplan heisst damit: die Karte heisst beim naechsten Bild anders.
//
// ─── „NICHT MEHR IM PLAN" IST EINE AUSSAGE ─────────────────────────────────
//
// Verschwindet das Objekt aus dem Plan, bleibt die Karte stehen und SAGT es —
// samt der Id, auf die sie zuletzt zeigte. Eine leere Karte saehe aus wie eine,
// die noch laedt; eine still geloeschte naehme dem Board die Stelle, an der
// jemand ueber genau dieses Objekt nachgedacht hat.
//
// „KEIN PLAN ZUR HAND" IST ETWAS ANDERES. Ohne geoeffnetes Projekt (der
// Notizzettel-Betrieb) gibt es nichts, wogegen die Karte aufgeloest werden
// koennte — „nicht mehr im Plan" behauptete dann einen Verlust, den niemand
// festgestellt hat. Dafuer steht `ohne-plan`.
//
// REIN: kein React, keine Uhr, kein Speicher.
// ───────────────────────────────────────────────────────────────────────────

import type { SeedCable, SeedGeraet, SuiteSeed } from '@avplan/ui/embed'
import { heimatPlan, type BoardCard, type ObjektVerweis } from './project'

/** Was eine Objekt-Karte vom Plan braucht — nicht mehr. */
export type PlanAusschnitt = Pick<SuiteSeed, 'geraete' | 'cables'>

export type HeimatModul = ReturnType<typeof heimatPlan>

export interface GeraetAnzeige {
  status: 'da'
  art: 'geraet'
  id: string
  name: string
  model?: string
  kategorie?: string
  /** Zweite Zeile am Knoten im Signalplan („3x SDI Out"). */
  sub?: string
  /** Wohin der Sprung fuehrt: der speziellste Plan, der das Geraet fuehrt. */
  modul: HeimatModul
  /** Nur, wo der Kameraplan etwas fuehrt. */
  kamera?: { lens?: string; focalMm?: number; hfovDeg?: number }
  /** Nur, wo der Lichtplan etwas fuehrt. */
  licht?: { purpose?: string; dmxChannel?: number; universe?: number }
}

/** Ein Ende eines Kabels. `name` fehlt, wenn das Geraet nicht mehr im Plan steht. */
export interface KabelEnde {
  id: string
  name?: string
}

export interface KabelAnzeige {
  status: 'da'
  art: 'kabel'
  id: string
  label: string
  type: string
  lengthM?: number
  von: KabelEnde
  nach: KabelEnde
  /** Kabel fuehrt nur der Signalplan. */
  modul: 'signal'
}

export interface WegAnzeige {
  status: 'weg'
  /** Der zuletzt bekannte Verweis — fehlt nur bei einer kaputten Karte. */
  ref?: ObjektVerweis
}

/** Es ist gar kein Plan geoeffnet — die Karte kann nichts nachsehen. */
export interface OhnePlanAnzeige {
  status: 'ohne-plan'
  ref?: ObjektVerweis
}

export type ObjektAnzeige = GeraetAnzeige | KabelAnzeige | WegAnzeige | OhnePlanAnzeige

/** Die beiden Anzeigen, in denen ein Objekt wirklich aufgeloest ist. */
export type ObjektDa = GeraetAnzeige | KabelAnzeige

/** Nur gesetzte Werte uebernehmen — `undefined` ist keine Aussage. */
const gesetzt = <T extends object>(o: T): Partial<T> | undefined => {
  const aus = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>
  return Object.keys(aus).length ? aus : undefined
}

function geraetAnzeige(g: SeedGeraet): GeraetAnzeige {
  const modul = heimatPlan(g)
  // Die Fachdaten des Gewerks, in dessen Modul gesprungen wird. Eine Kamera,
  // die ZUSAETZLICH Lichtfelder traegt, zeigt die Kamera-Seite: die Karte ist
  // klein, und die Angaben, nach denen jemand am Board fragt, sind die des
  // Plans, in dem er landet.
  const kamera = modul === 'cameras' && g.kamera
    ? gesetzt({ lens: g.kamera.lens, focalMm: g.kamera.focalMm, hfovDeg: g.kamera.hfovDeg })
    : undefined
  const licht = modul === 'licht' && g.licht
    ? gesetzt({ purpose: g.licht.purpose, dmxChannel: g.licht.dmxChannel, universe: g.licht.universe })
    : undefined
  return {
    status: 'da',
    art: 'geraet',
    id: g.id,
    name: g.name,
    modul,
    ...(g.model ? { model: g.model } : {}),
    ...(g.kategorie ? { kategorie: g.kategorie } : {}),
    ...(g.sub ? { sub: g.sub } : {}),
    ...(kamera ? { kamera } : {}),
    ...(licht ? { licht } : {}),
  }
}

function kabelAnzeige(k: SeedCable, geraete: readonly SeedGeraet[]): KabelAnzeige {
  const ende = (id: string): KabelEnde => {
    const g = geraete.find((x) => x.id === id)
    return g ? { id, name: g.name } : { id }
  }
  return {
    status: 'da',
    art: 'kabel',
    id: k.id,
    label: k.label,
    type: k.type,
    ...(k.lengthM !== undefined ? { lengthM: k.lengthM } : {}),
    von: ende(k.from),
    nach: ende(k.to),
    modul: 'signal',
  }
}

/**
 * Karte + Plan -> was die Karte zeigt.
 *
 * Gesucht wird NUR in der Liste, die der Verweis nennt. Eine Geraete-Id, die
 * zufaellig auch ein Kabel heisst, ist nicht dieses Kabel — ueber Listen
 * hinweg zu suchen hiesse, einen Treffer zu raten (ADR-002).
 */
export function objektAnzeige(card: Pick<BoardCard, 'ref'>, plan: PlanAusschnitt | undefined): ObjektAnzeige {
  const ref = card.ref
  if (!plan) return ref ? { status: 'ohne-plan', ref } : { status: 'ohne-plan' }
  if (!ref) return { status: 'weg' }
  if (ref.art === 'geraet') {
    const g = plan.geraete.find((x) => x.id === ref.id)
    return g ? geraetAnzeige(g) : { status: 'weg', ref }
  }
  const k = plan.cables.find((x) => x.id === ref.id)
  return k ? kabelAnzeige(k, plan.geraete) : { status: 'weg', ref }
}

/** Ein Eintrag im Auswahl-Dialog. */
export interface ObjektKandidat {
  ref: ObjektVerweis
  titel: string
  /** Zweite Zeile: Modell · Kategorie bzw. Typ · von → nach. */
  zeile: string
}

/**
 * Was der Auswahl-Dialog anbietet: alle Geraete, dann alle Kabel, gefiltert
 * nach dem Suchtext.
 *
 * Gesucht wird ueber das, was auf dem Eintrag STEHT (Name, Modell,
 * Kategorie, Typ, die Namen der Enden) und ueber die Id — nicht ueber
 * Felder, die man dem Eintrag nicht ansieht. Ein Treffer, dessen Grund man
 * nicht sieht, sieht aus wie ein Fehler der Suche.
 */
export function objektKandidaten(plan: PlanAusschnitt, suche = ''): ObjektKandidat[] {
  const q = suche.trim().toLowerCase()
  const name = new Map(plan.geraete.map((g) => [g.id, g.name]))
  const alle: ObjektKandidat[] = [
    ...plan.geraete.map((g) => ({
      ref: { art: 'geraet' as const, id: g.id },
      titel: g.name,
      zeile: [g.model, g.kategorie].filter(Boolean).join(' · '),
    })),
    ...plan.cables.map((k) => ({
      ref: { art: 'kabel' as const, id: k.id },
      titel: k.label,
      zeile: `${k.type} · ${name.get(k.from) ?? k.from} → ${name.get(k.to) ?? k.to}`,
    })),
  ]
  if (!q) return alle
  return alle.filter((c) => `${c.titel} ${c.zeile} ${c.ref.id}`.toLowerCase().includes(q))
}

/** Die Ueberschrift der Karte in Textform — fuer Markdown und Druck. */
export function objektTitel(a: ObjektAnzeige): string | undefined {
  if (a.status !== 'da') return undefined
  return a.art === 'geraet' ? a.name : a.label
}

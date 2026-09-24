// ───────────────────────────────────────────────────────────────────────────
// Die Crew der Shell auf `@avplan/crew-core` (suite#260).
//
// `show.crew` war eine eigene kleine Liste (Name, Funktion, Call-Time,
// bestaetigt/offen), waehrend crew-core Buchungsstaende und die
// Ueberschneidungspruefung laengst fuehrt. Die Shell rechnet nichts davon
// nach: sie bildet ihre Eintraege auf einen `CrewPlan` ab und fragt
// `bookingConflicts` — ADR-006, Punkt 4: „Nichts wird zweimal gerechnet."
//
// ─── DIE KLEINSTE EHRLICHE ABBILDUNG ───────────────────────────────────────
//
//   Name          -> CrewPerson.id und .name. Der Name IST die Identitaet der
//                    Shell-Crew (dieselbe, an die das Board Aufgaben
//                    verteilt); zwei Eintraege mit demselben Namen sind
//                    dieselbe Person mit zwei Schichten — genau der Fall,
//                    den `bookingConflicts` sucht.
//   booking       -> TimeEntry.booking, IMMER gesetzt. Fehlt es dort, liest
//                    crew-core `worked` — eine geleistete Schicht, die niemand
//                    geleistet hat.
//   date/call/end -> TimeEntry.date/startMinute/endMinute, NUR wenn alle drei
//                    da sind. Sonst entsteht kein Eintrag: ein Datum aus dem
//                    Show-Titel oder eine Schichtlaenge „bis Load-out" waere
//                    geraten, und eine Ueberschneidung auf geratenen Zeiten
//                    ist falscher Alarm oder falsche Ruhe.
//   Satz          -> gibt es in der Shell nicht. `rateId` bleibt leer, und
//                    nichts hier fragt nach Geld: `bookingConflicts` braucht
//                    keinen Satz, `labourCosts` wird nicht gerufen.
//
// REIN: keine Uhr, kein Speicher, kein DOM.
// ───────────────────────────────────────────────────────────────────────────

import {
  EMPTY_CREW_PLAN,
  bookingConflicts,
  type BookingState,
  type CrewPlan,
  type TimeEntry,
} from '@avplan/crew-core'
import type { CrewMember } from './project'

export const BUCHUNGSSTAENDE: readonly BookingState[] = ['pencil', 'hold', 'confirmed', 'worked']

const istStand = (v: unknown): v is BookingState =>
  typeof v === 'string' && (BUCHUNGSSTAENDE as readonly string[]).includes(v)

/** Vorgemerkt oder reserviert: noch keine Zusage. */
export const nochOffen = (b: BookingState): boolean => b === 'pencil' || b === 'hold'

/**
 * Crew aus einer Datei heilen — laeuft auf JEDES geladene Projekt.
 *
 * ─── `status` -> `booking` ────────────────────────────────────────────────
 *
 * Die alte Zweiteilung kannte „bestaetigt" und „offen". `confirmed` bleibt
 * `confirmed`. „offen" wird `pencil`, der schwaechste Stand, den crew-core
 * kennt: eine Vormerkung sagt nichts zu, was „offen" nicht auch gesagt haette.
 * `hold` dagegen behauptete eine Reservierung, die niemand erklaert hat.
 *
 * Das alte Feld wird NICHT mitgeschleppt: neben `booking` waere es eine
 * zweite Antwort auf dieselbe Frage, und beim ersten Bearbeiten stimmten die
 * beiden nicht mehr ueberein. Alles andere am Eintrag faehrt unveraendert mit
 * — diese Heilung migriert ein Feld und prueft nicht nebenbei die uebrigen.
 */
export function healCrew(raw: unknown): CrewMember[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => {
      const { status, ...rest } = r
      const booking: BookingState = istStand(r.booking)
        ? r.booking
        : status === 'confirmed'
          ? 'confirmed'
          : 'pencil'
      return { ...rest, booking } as unknown as CrewMember
    })
}

/**
 * „HH:MM" -> Minuten ab Mitternacht. Stunden bis 47, wie im Crew-Reiter des
 * Cable-Planers: „26:00" ist 02:00 am Folgetag und eine gueltige Angabe.
 */
export function uhrzeitMinuten(v: string | undefined): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec((v ?? '').trim())
  if (!m) return undefined
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 47 || min > 59) return undefined
  return h * 60 + min
}

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/

/** Was einem Eintrag zum Zeitfenster fehlt — in der Reihenfolge der Felder. */
export type FensterLuecke = 'name' | 'datum' | 'beginn' | 'ende'

export interface CrewFenster {
  date: string
  startMinute: number
  endMinute: number
}

/**
 * Das Zeitfenster eines Eintrags — oder, was dafuer fehlt.
 *
 * Ein Ende VOR dem Beginn ist eine Nachtschicht und laeuft in den Folgetag:
 * dieselbe Regel wie beim Zuschlagsband in crew-core („ueber Mitternacht ist
 * der Normalfall dieses Gewerbes"). Ein Ende GLEICH dem Beginn bleibt ohne
 * Fenster — ob null Minuten oder vierundzwanzig Stunden gemeint sind, sagt
 * die Angabe nicht.
 */
export function crewFenster(m: CrewMember): { fenster: CrewFenster } | { fehlt: FensterLuecke[] } {
  const fehlt: FensterLuecke[] = []
  if (!m.name.trim()) fehlt.push('name')
  const datum = m.date && ISO_DATUM.test(m.date) ? m.date : undefined
  if (!datum) fehlt.push('datum')
  const start = uhrzeitMinuten(m.call)
  if (start === undefined) fehlt.push('beginn')
  const ende = uhrzeitMinuten(m.end)
  if (ende === undefined || ende === start) fehlt.push('ende')
  if (fehlt.length || !datum || start === undefined || ende === undefined) return { fehlt }
  return { fenster: { date: datum, startMinute: start, endMinute: ende < start ? ende + 1440 : ende } }
}

/** Die Id, unter der ein Shell-Eintrag im `CrewPlan` steht. */
const eintragId = (index: number): string => `crew:${index}`

/** Die Shell-Crew als `CrewPlan` — nur, was sich belegen laesst. */
export function crewPlanAus(crew: readonly CrewMember[]): CrewPlan {
  const personen = new Map<string, { id: string; name: string }>()
  const entries: TimeEntry[] = []
  crew.forEach((m, i) => {
    const f = crewFenster(m)
    if (!('fenster' in f)) return
    const name = m.name.trim()
    personen.set(name, { id: name, name })
    entries.push({
      id: eintragId(i),
      personId: name,
      rateId: '',
      date: f.fenster.date,
      startMinute: f.fenster.startMinute,
      endMinute: f.fenster.endMinute,
      booking: m.booking,
    })
  })
  return { ...EMPTY_CREW_PLAN, people: [...personen.values()], entries }
}

export interface CrewBuchung {
  booking: BookingState
  fenster?: CrewFenster
  /** Leer, wenn es ein Fenster gibt. */
  fehlt: FensterLuecke[]
  /** Die Eintraege (Index in `crew`), mit denen sich dieser ueberschneidet. */
  ueberschneidet: number[]
}

/**
 * Je Crew-Eintrag: Buchungsstand, Zeitfenster und Ueberschneidungen — in der
 * Reihenfolge der Liste. Die Ueberschneidungen rechnet `bookingConflicts`;
 * hier werden sie nur auf beide Beteiligten zurueckgeschrieben.
 */
export function crewBuchungen(crew: readonly CrewMember[]): CrewBuchung[] {
  const aus = crew.map((m): CrewBuchung => {
    const f = crewFenster(m)
    return 'fenster' in f
      ? { booking: m.booking, fenster: f.fenster, fehlt: [], ueberschneidet: [] }
      : { booking: m.booking, fehlt: f.fehlt, ueberschneidet: [] }
  })
  const index = (id: string): number => Number(id.slice('crew:'.length))
  for (const k of bookingConflicts(crewPlanAus(crew))) {
    const a = index(k.a.id)
    const b = index(k.b.id)
    if (!aus[a]!.ueberschneidet.includes(b)) aus[a]!.ueberschneidet.push(b)
    if (!aus[b]!.ueberschneidet.includes(a)) aus[b]!.ueberschneidet.push(a)
  }
  return aus
}

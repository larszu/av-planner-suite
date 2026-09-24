import { describe, expect, it } from 'vitest'
import { crewBuchungen, crewFenster, crewPlanAus, healCrew } from '../src/data/crew'
import { parseProject, serializeProject } from '../src/data/projectFile'
import { PROJECT, type CrewMember } from '../src/data/project'
import { projectFromTemplate, templateFromProject } from '../src/data/projectTemplate'

// ───────────────────────────────────────────────────────────────────────────
// suite#260 — die Crew der Shell auf `@avplan/crew-core`.
//
// Drei Zusagen:
//   1. Alte Dateien bleiben lesbar: `status` wird zu `booking`, und das alte
//      Feld verschwindet, statt als zweite Antwort daneben zu stehen.
//   2. Ein Eintrag ohne Datum, Beginn und Ende hat KEIN Zeitfenster — es wird
//      nicht aus dem Show-Titel oder einer Schichtlaenge geraten.
//   3. Ueberschneidungen rechnet `bookingConflicts`; die Shell traegt sie nur
//      auf beide Beteiligten zurueck.
// ───────────────────────────────────────────────────────────────────────────

const person = (p: Partial<CrewMember>): CrewMember => ({
  name: 'M. Berg',
  role: 'Video-Engineer',
  dept: 'video',
  call: '08:00',
  booking: 'confirmed',
  ...p,
})

describe('healCrew — alte Dateien', () => {
  it('bestaetigt bleibt bestaetigt, offen wird vorgemerkt, und `status` ist weg', () => {
    const geheilt = healCrew([
      { name: 'Ben', role: 'Bildregie', dept: 'video', call: '07:30', status: 'confirmed' },
      { name: 'Cem', role: 'Licht', dept: 'light', call: '', status: 'pending' },
    ])
    expect(geheilt.map((c) => c.booking)).toEqual(['confirmed', 'pencil'])
    expect(geheilt.every((c) => !('status' in c))).toBe(true)
  })

  it('laesst einen gesetzten Buchungsstand und alle uebrigen Felder stehen', () => {
    const roh = { name: 'Ben', role: 'Bildregie', dept: 'video', call: '07:30', booking: 'hold', date: '2026-07-18', end: '18:00' }
    expect(healCrew([roh])).toEqual([roh])
  })

  it('eine Datei von vor suite#260 laedt mit Buchungsstand', () => {
    const alt = JSON.parse(serializeProject(PROJECT)) as { project: { show: { crew: Record<string, unknown>[] } } }
    alt.project.show.crew = [{ name: 'Ben', role: 'Bildregie', dept: 'video', call: '07:30', status: 'pending' }]
    const p = parseProject(JSON.stringify(alt))
    expect(p.show.crew).toEqual([{ name: 'Ben', role: 'Bildregie', dept: 'video', call: '07:30', booking: 'pencil' }])
  })

  it('eine Vorlage von vor suite#260 ergibt ein Projekt mit Buchungsstand', () => {
    const { project } = templateFromProject(PROJECT)
    const alteVorlage = {
      id: 't', name: 'Gala', createdAt: '2026-01-01', omitted: [],
      project: { ...project, show: { ...project.show, crew: [{ name: 'Ben', role: 'Bildregie', dept: 'video', call: '', status: 'pending' }] } },
    }
    const neu = projectFromTemplate(alteVorlage as unknown as Parameters<typeof projectFromTemplate>[0], 'Gala 2027')
    expect(neu.show.crew[0]).toEqual({ name: 'Ben', role: 'Bildregie', dept: 'video', call: '', booking: 'pencil' })
  })

  it('die Vorlage nimmt Datum, Zeiten und Zusage heraus und laesst die Besetzung stehen', () => {
    const { project } = templateFromProject(PROJECT)
    for (const c of project.show.crew) {
      expect(c).toMatchObject({ call: '', booking: 'pencil' })
      expect(c.date).toBeUndefined()
      expect(c.end).toBeUndefined()
    }
    expect(project.show.crew.map((c) => c.name)).toEqual(PROJECT.show.crew.map((c) => c.name))
  })
})

describe('crewFenster — nichts wird geraten', () => {
  it('ohne Datum und Ende gibt es kein Fenster, und es wird gesagt, was fehlt', () => {
    expect(crewFenster(person({}))).toEqual({ fehlt: ['datum', 'ende'] })
  })

  it('mit Datum, Beginn und Ende gibt es eines', () => {
    expect(crewFenster(person({ date: '2026-07-18', end: '20:00' }))).toEqual({
      fenster: { date: '2026-07-18', startMinute: 480, endMinute: 1200 },
    })
  })

  it('ein Ende vor dem Beginn ist eine Nachtschicht bis in den Folgetag', () => {
    const f = crewFenster(person({ call: '20:00', end: '02:00', date: '2026-07-18' }))
    expect(f).toEqual({ fenster: { date: '2026-07-18', startMinute: 1200, endMinute: 1560 } })
  })

  it('ein Ende gleich dem Beginn bleibt ohne Fenster — null oder vierundzwanzig Stunden sagt es nicht', () => {
    expect(crewFenster(person({ date: '2026-07-18', end: '08:00' }))).toEqual({ fehlt: ['ende'] })
  })

  it('ein fehlender Beginn meldet den Beginn und nicht auch noch das Ende', () => {
    expect(crewFenster(person({ call: '', date: '2026-07-18', end: '20:00' }))).toEqual({ fehlt: ['beginn'] })
  })
})

describe('crewPlanAus — die Abbildung auf crew-core', () => {
  it('nimmt nur Eintraege mit Fenster und setzt den Buchungsstand IMMER', () => {
    // Fehlt `booking` am TimeEntry, liest crew-core „geleistet".
    const plan = crewPlanAus([
      person({ date: '2026-07-18', end: '20:00', booking: 'pencil' }),
      person({ name: 'A. Roth' }),
    ])
    expect(plan.entries).toHaveLength(1)
    expect(plan.entries[0]).toMatchObject({ personId: 'M. Berg', booking: 'pencil', rateId: '' })
    expect(plan.people).toEqual([{ id: 'M. Berg', name: 'M. Berg' }])
    // Kein erfundener Satz.
    expect(plan.rates).toEqual([])
  })
})

describe('crewBuchungen — Ueberschneidungen aus bookingConflicts', () => {
  it('dieselbe Person in zwei Schichten zur selben Zeit steht bei BEIDEN Eintraegen', () => {
    const b = crewBuchungen([
      person({ role: 'Video-Engineer', date: '2026-07-18', call: '08:00', end: '14:00' }),
      person({ name: 'S. Klein', role: 'Kamera', date: '2026-07-18', call: '08:00', end: '14:00' }),
      person({ role: 'Bildregie', date: '2026-07-18', call: '12:00', end: '20:00', booking: 'hold' }),
    ])
    expect(b[0]!.ueberschneidet).toEqual([2])
    expect(b[2]!.ueberschneidet).toEqual([0])
    // Eine andere Person zur selben Zeit ist kein Konflikt.
    expect(b[1]!.ueberschneidet).toEqual([])
    expect(b[2]!.booking).toBe('hold')
  })

  it('aneinander anschliessende Schichten ueberschneiden sich nicht', () => {
    const b = crewBuchungen([
      person({ date: '2026-07-18', call: '08:00', end: '12:00' }),
      person({ date: '2026-07-18', call: '12:00', end: '18:00' }),
    ])
    expect(b.every((x) => x.ueberschneidet.length === 0)).toBe(true)
  })

  it('ohne Fenster keine Ueberschneidung — und das Fehlen steht dabei', () => {
    const b = crewBuchungen([person({ date: '2026-07-18', end: '20:00' }), person({})])
    expect(b[0]!.ueberschneidet).toEqual([])
    expect(b[1]).toMatchObject({ fehlt: ['datum', 'ende'], ueberschneidet: [] })
  })

  it('das Demo-Projekt hat keine Ueberschneidung und einen Eintrag ohne Fenster', () => {
    const b = crewBuchungen(PROJECT.show.crew)
    expect(b.filter((x) => x.ueberschneidet.length > 0)).toEqual([])
    expect(b.filter((x) => !x.fenster)).toHaveLength(1)
  })
})

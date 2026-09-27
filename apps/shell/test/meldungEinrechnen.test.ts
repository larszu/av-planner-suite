import { describe, expect, it } from 'vitest'
import { meldungEinrechnen } from '../src/data/seed'
import type { SeedHandoffRecord } from '../src/data/project'

// Nutzer-Meldung 2026-09-27: 18 Zeilen „1 geaendert" aus demselben Planer.
const leer = { neu: [] as string[], geaendert: [] as string[], entfernt: [] as string[] }
let n = 0
const neueId = () => `h${++n}`

describe('meldungEinrechnen', () => {
  it('haelt EINE offene Meldung je Planer, egal wie oft er meldet', () => {
    let liste: SeedHandoffRecord[] = []
    for (let i = 0; i < 15; i++) liste = meldungEinrechnen(liste, 'signal', { ...leer, geaendert: [`g:${i % 3}`] }, neueId, i).liste
    expect(liste).toHaveLength(1)
    expect(liste[0].zusammenfassung).toEqual({ neu: 0, geaendert: 3, entfernt: 0 })
  })

  it('rechnet Ids gegeneinander: neu+geaendert bleibt neu, neu+entfernt ist nichts, geaendert+entfernt ist entfernt', () => {
    let liste = meldungEinrechnen([], 'cameras', { neu: ['g:a'], geaendert: ['g:b'], entfernt: [] }, neueId, 1).liste
    liste = meldungEinrechnen(liste, 'cameras', { neu: [], geaendert: ['g:a'], entfernt: ['g:b'] }, neueId, 2).liste
    expect(liste[0].zusammenfassung).toEqual({ neu: 1, geaendert: 0, entfernt: 1 })
    const r = meldungEinrechnen(liste, 'cameras', { ...leer, entfernt: ['g:a'] }, neueId, 3)
    expect(r.liste[0].zusammenfassung).toEqual({ neu: 0, geaendert: 0, entfernt: 1 })
  })

  it('laesst die Meldung verschwinden, wenn sich alles aufhebt, und andere Planer unberuehrt', () => {
    let liste = meldungEinrechnen([], 'fixtures', { ...leer, neu: ['g:x'] }, neueId, 1).liste
    liste = meldungEinrechnen(liste, 'signal', { ...leer, geaendert: ['c:1'] }, neueId, 2).liste
    liste = meldungEinrechnen(liste, 'fixtures', { ...leer, entfernt: ['g:x'] }, neueId, 3).liste
    expect(liste.map((r) => r.domain)).toEqual(['signal'])
  })

  it('fasst Meldungen aus aelteren Projekten (ohne Ids) mit zusammen, statt sie stehen zu lassen', () => {
    const alt: SeedHandoffRecord[] = [1, 2, 3].map((i) => ({ id: `a${i}`, seenAt: i, domain: 'signal', zusammenfassung: { neu: 0, geaendert: 1, entfernt: 0 } }))
    const r = meldungEinrechnen(alt, 'signal', { ...leer, geaendert: ['g:z'] }, neueId, 9)
    expect(r.liste).toHaveLength(1)
    expect(r.liste[0].zusammenfassung.geaendert).toBe(4)
  })

  it('legt bei leerer Meldung nichts an', () => {
    const offen: SeedHandoffRecord[] = []
    expect(meldungEinrechnen(offen, 'signal', leer, neueId, 1).liste).toBe(offen)
  })
})

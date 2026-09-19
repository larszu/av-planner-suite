import { describe, expect, it } from 'vitest'
import { uebergabeAbschluss } from '../src/data/seed'
import type { SeedHandoffRecord } from '../src/data/project'

/**
 * SECHS MELDUNGEN, EIN KNOPF — und trotzdem eine Übergabe je Melder.
 *
 * Nutzer-Meldung 2026-09-20: „die Meldung … muss man auch alle auf einmal
 * akzeptieren oder ablehnen können und rückgängig machen können."
 *
 * Der Sammelknopf ist die eine Hälfte, und sie ist harmlos. Die andere ist
 * die Falle: der Seed trägt GENAU EINE Herkunft (`origin`), und der meldende
 * Planer erkennt daran seinen eigenen Hall. Wer drei Meldungen aus drei
 * Planern mit einer Herkunft hinausschöbe, nähme zwei Meldern diesen Schutz
 * — sie bekämen ihren eigenen Stand zurück und überschrieben damit, was sie
 * seither gearbeitet haben. Genau der Defekt, gegen den `origin` 2026-09-12
 * eingeführt wurde.
 *
 * Deshalb misst dieser Test nicht „der Knopf leert die Liste", sondern die
 * Zahl und die Reihenfolge der Übergaben.
 */
const r = (id: string, domain: SeedHandoffRecord['domain']): SeedHandoffRecord => ({
  id,
  seenAt: 0,
  domain,
  zusammenfassung: { neu: 0, geaendert: 0, entfernt: 1 },
})

describe('Sammel-Übergabe', () => {
  it('fasst mehrere Meldungen desselben Planers zu EINER Übergabe zusammen', () => {
    const alle = [r('a', 'fixtures'), r('b', 'fixtures'), r('c', 'fixtures')]
    const { rest, domaenen } = uebergabeAbschluss(alle, ['a', 'b', 'c'])
    expect(domaenen).toEqual(['fixtures'])
    expect(rest).toEqual([])
  })

  it('gibt für zwei Melder ZWEI Übergaben heraus, in der Reihenfolge der Meldungen', () => {
    const alle = [r('a', 'fixtures'), r('b', 'cameras'), r('c', 'fixtures')]
    const { domaenen } = uebergabeAbschluss(alle, ['a', 'b', 'c'])
    // Nicht eine: sonst verlöre einer der beiden Melder den Echo-Schutz.
    // Nicht drei: die zweite Licht-Meldung trüge nichts Neues.
    expect(domaenen).toEqual(['fixtures', 'cameras'])
  })

  it('beantwortet nur die gefragten Meldungen und lässt die anderen stehen', () => {
    const alle = [r('a', 'fixtures'), r('b', 'cameras'), r('c', 'signal')]
    const { rest, domaenen } = uebergabeAbschluss(alle, ['b'])
    expect(rest.map((x) => x.id)).toEqual(['a', 'c'])
    expect(domaenen).toEqual(['cameras'])
  })

  it('ist bei einer leeren Auswahl ein Nichts — kein Seed geht hinaus', () => {
    const alle = [r('a', 'fixtures')]
    const { rest, domaenen } = uebergabeAbschluss(alle, [])
    expect(rest).toEqual(alle)
    expect(domaenen).toEqual([])
  })

  it('übersieht eine Id, die es nicht gibt, statt etwas zu erfinden', () => {
    const alle = [r('a', 'fixtures')]
    const { rest, domaenen } = uebergabeAbschluss(alle, ['a', 'gibtsnicht'])
    expect(rest).toEqual([])
    expect(domaenen).toEqual(['fixtures'])
  })
})

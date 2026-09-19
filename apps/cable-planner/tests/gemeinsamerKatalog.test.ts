// ───────────────────────────────────────────────────────────────────────────
// Der Cable-Planer kennt die Geräte der ganzen Suite (ADR-002, Befund A).
//
// Der Auftrag des Eigentümers, 2026-09-19: „Alle Geräte sind in allen
// Planern verfügbar. […] Weil es für mich gerade sinnvoll erscheint zum
// Beispiel erst die Kameras und Objektive im Multicam planner zu zeichnen
// darf ich dann nicht die gleichen Kameras nochmal im Cable planner anlegen
// müssen. Das wäre manuelle doppelte Arbeit."
//
// Vorher: 23 Kameramodelle hier, 377 in der Suite, 9 mit gemeinsamer Id.
// 368 gab es hier gar nicht.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { listDeviceTypes, resolveDeviceType } from '../src/renderer/lib/deviceTypeRegistry'
import { alleTypen } from '@avplan/device-catalog'

const typen = listDeviceTypes()

describe('Der gemeinsame Katalog im Cable-Planer', () => {
  it('die Auswahl umfasst die Geräte der ganzen Suite', () => {
    // 467 eigene + die fremden aus dem Paket.
    expect(typen.length).toBe(alleTypen().length)
    expect(typen.length).toBeGreaterThan(800)
  })

  it('und darunter die Kameras, die vorher fehlten', () => {
    const kameras = typen.filter((t) => t.category === 'Cameras')
    expect(kameras.length).toBeGreaterThanOrEqual(377)
    // Eine, die es hier vorher nicht gab — mit Hersteller im Namen, weil die
    // Auswahlliste danach sortiert und gesucht wird.
    const hdc = typen.find((t) => t.name === 'Sony HDC-3500')
    expect(hdc, 'Sony HDC-3500 sollte jetzt auswählbar sein').toBeDefined()
    expect(hdc!.ohneDatenblatt).toBe(true)
  })

  it('„kein Datenblatt" ist eine Aussage und keine erfundenen Ports', () => {
    // Der Punkt, an dem dieses Repo sonst falsch würde: ein Modell zu kennen
    // heisst nicht, seine Anschlüsse zu kennen. `resolveDeviceType` gibt für
    // einen solchen Typ NULL zurück — und der Aufrufer legt das Gerät
    // daraufhin mit `portsUnknown` an, statt Ports zu erfinden.
    const fremd = typen.find((t) => t.ohneDatenblatt)!
    expect(resolveDeviceType(fremd.id)).toBeNull()

    // Und umgekehrt: die eigenen tragen weiter ihr Template.
    const eigen = typen.find((t) => !t.ohneDatenblatt)!
    expect(resolveDeviceType(eigen.id)).not.toBeNull()
  })

  it('keine Id kommt doppelt vor', () => {
    // Die neun gemeinsamen Modelle stehen EINMAL da — sonst stünde dasselbe
    // Gerät zweimal in der Auswahl, einmal mit und einmal ohne Ports.
    const ids = typen.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('die Liste bleibt nach Namen sortiert', () => {
    const namen = typen.map((t) => t.name)
    expect(namen).toEqual([...namen].sort((a, b) => a.localeCompare(b, 'de')))
  })
})

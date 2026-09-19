// ───────────────────────────────────────────────────────────────────────────
// DER Katalog — eine Liste, aus allen Quellen zusammengeführt.
//
// Das ist die Stelle, die ADR-002 meint: „Gerätetyp (Katalog) besitzt das
// Datenblatt." EINE Stelle, nicht drei. Wer wissen will, welche Modelle es
// gibt, fragt hier und nicht den Planer, der gerade offen ist.
//
// Die Reihenfolge der Quellen ist die Aussage, wer im Widerspruchsfall ein
// Feld hält — begründet in `quellen.ts`, nicht hier verstreut.
//
// REIN: keine Datei, kein Netz, keine Uhr.
// ───────────────────────────────────────────────────────────────────────────
import { CABLE_TYPEN } from './cableTypen'
import { KAMERA_TYPEN } from './kameraTypen'
import { fuehreZusammen, type KatalogErgebnis } from './zusammenfuehren'
import type { Geraetetyp } from './typ'

/**
 * Der zusammengeführte Katalog, einmal gerechnet.
 *
 * Lazy, damit der Modul-Import billig bleibt — dieselbe Bauform wie
 * `deviceTypeRegistry` im Cable-Planer, aus demselben Grund.
 */
let gerechnet: KatalogErgebnis | null = null

export function katalog(): KatalogErgebnis {
  gerechnet ??= fuehreZusammen([
    { name: 'cable', eintraege: CABLE_TYPEN },
    { name: 'multicam', eintraege: KAMERA_TYPEN },
  ])
  return gerechnet
}

/** Alle Gerätetypen der Suite. */
export const alleTypen = (): readonly Geraetetyp[] => katalog().typen

/**
 * Ein Typ zu seiner Id — oder `null`.
 *
 * `null` und nicht „der nächstbeste": eine Id, die keinen Typ trifft, ist
 * eine Auskunft („dieses Gerät kommt aus keinem Katalog"), und die
 * Oberflächen unterscheiden sie schon heute von „Typ ohne Datenblatt"
 * (`evidenceForType` im Cable-Planer).
 */
export function typFuer(id: string | undefined): Geraetetyp | null {
  if (!id) return null
  return alleTypen().find((t) => t.id === id) ?? null
}

/** Die Typen einer Kategorie, in der Reihenfolge des Katalogs. */
export const typenDerKategorie = (kategorie: string): Geraetetyp[] =>
  alleTypen().filter((t) => t.kategorie === kategorie)

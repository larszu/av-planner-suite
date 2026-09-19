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
import { OBJEKTIV_TYPEN } from './objektivTypen'
import { LICHT_TYPEN } from './lichtTypen'
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
    { name: 'multicam', eintraege: [...KAMERA_TYPEN, ...OBJEKTIV_TYPEN] },
    { name: 'light', eintraege: LICHT_TYPEN },
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

/**
 * Der Katalog OHNE die Einträge, die eine Quelle schon selbst führt.
 *
 * Warum es das gibt: der Cable-Planer trägt seine 467 Einträge bereits in
 * seinen eigenen Katalogdateien — mit Ports, Maßen und Leistung, die dieses
 * Paket bewusst nicht führt. Ihm die ganze Liste zu geben hiesse, 80 KB
 * Daten ein zweites Mal in sein Bündel zu legen, die dort schon liegen.
 *
 * Das ist kein Rückfall in „jeder hat seine Liste": die IDENTITÄT kommt
 * weiterhin von hier, und welche Einträge eine Quelle beisteuert, weiss
 * ebenfalls nur diese Stelle. Der Aufrufer sagt nur, wer er ist.
 */
export const typenAusser = (quelle: string): Geraetetyp[] =>
  alleTypen().filter((t) => !t.quellen.includes(quelle))

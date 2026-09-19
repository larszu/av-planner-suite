// ───────────────────────────────────────────────────────────────────────────
// Die Leuchten-Bibliothek dieses Planers und der gemeinsame Katalog — EINE
// Basis.
//
// WARUM ES DAS GIBT (ADR-012, 2026-09-19). Der Eigentuemer: „Inventory
// planner und der ganze Rest hat aber noch eigene Listen. Ausnahmslos alles
// soll sich die gleiche Basis teilen!"
//
// `fixtureLibrary` fuehrt 84 Modelle mit Lichtstrom, Abstrahlwinkel und
// Photometrie. Der gemeinsame Katalog fuehrt dieselben 84 als TYPEN, dazu die
// Kameras und die 467 Eintraege des Cable-Planers. Was hier zaehlt, ist nicht
// die Menge, sondern die IDENTITAET: eine Leuchte, die im Cable-Planer
// angelegt wurde, traegt dieselbe Id wie hier — bis heute entschied der
// Modellname, ob sie ankam.
//
// WAS HIER NICHT PASSIERT: Photometrie und Bauform wandern nicht in den
// Katalog. Die versteht dieser Planer (ADR-002, Eigentumstabelle).
//
// REIN: keine Datei, kein Netz, keine Uhr.
// ───────────────────────────────────────────────────────────────────────────
import { alleTypen, typFuerQuelle } from '@avplan/device-catalog';
import { fixtureLibrary } from './fixtureLibrary';
import type { Fixture } from '../types';

/** Der Name, unter dem dieser Planer im Katalog als Quelle steht. */
export const QUELLE = 'light';

/**
 * Die Katalog-Identitaet eines Modells DIESER Bibliothek.
 *
 * Gerechnet und nicht gespeichert: das Feld stuende sonst 84-mal in
 * `fixtureLibrary.ts` und driftete gegen die Fassung des Generators.
 */
export const typIdFuer = (f: Pick<Fixture, 'id'>): string | undefined =>
  typFuerQuelle(alleTypen(), QUELLE, f.id)?.id;

/** Das Leuchtenmodell hinter einer Katalog-Identitaet — oder `null`. */
export function fixtureFuerTyp(
  typId: string | undefined,
  eigene: Fixture[] = [],
): Fixture | null {
  if (!typId) return null;
  const ref = alleTypen().find((t) => t.id === typId)?.refs?.[QUELLE];
  if (!ref) return null;
  return [...fixtureLibrary, ...eigene].find((f) => f.id === ref) ?? null;
}

/** Ein Leuchtentyp der Suite, so wie eine Auswahl ihn zeigt. */
export interface LeuchtenTypWahl {
  typId: string;
  label: string;
  /** Das eigene Modell, wenn die Bibliothek es fuehrt — sonst `null`. */
  eigen: Fixture | null;
  /**
   * WAHR, wenn nur ein anderer Planer diesen Typ kennt.
   *
   * Dann fehlen Lichtstrom und Abstrahlwinkel. Das ist eine Auskunft: eine
   * Beleuchtungsrechnung ohne Photometrie waere eine erfundene Zahl. Die
   * Oberflaeche sagt es, statt das Modell zu verschweigen.
   */
  ohnePhotometrie: boolean;
}

/**
 * Alle Leuchtentypen der Suite — die eigenen zuerst, dann die fremden.
 *
 * Die Reihenfolge ist die Aussage: was dieser Planer rechnen kann, steht
 * oben.
 */
export function alleLeuchtenTypen(eigene: Fixture[] = []): LeuchtenTypWahl[] {
  const alle = [...fixtureLibrary, ...eigene];
  const wahl = alleTypen()
    .filter((t) => t.kategorie === 'Lights')
    .map((t) => {
      const ref = t.refs?.[QUELLE];
      const eigenesModell = (ref ? alle.find((f) => f.id === ref) : null) ?? null;
      return {
        typId: t.id,
        label: t.hersteller ? `${t.hersteller} ${t.modell}` : t.modell,
        eigen: eigenesModell,
        ohnePhotometrie: eigenesModell === null,
      };
    });
  return [...wahl.filter((w) => !w.ohnePhotometrie), ...wahl.filter((w) => w.ohnePhotometrie)];
}

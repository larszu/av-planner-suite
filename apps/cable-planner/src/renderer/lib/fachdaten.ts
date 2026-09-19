// ───────────────────────────────────────────────────────────────────────────
// Das Fach dieses Planers im geteilten Geraet (ADR-013).
//
// WARUM ES DAS GIBT. Eigentuemer, 2026-09-19: „Sie muessen aber in allen
// Planern bleiben. Damit ich sie von a nach b nach c und wieder nach a
// kopieren kann und nichts verloren geht."
//
// Der Rueckweg dieses Planers meldete Name, Untertitel, Modell, Kategorie und
// die Lage im Diagramm. Die ANSCHLUESSE nicht. Solange jedes Geraet sauber
// aus dem Katalog kam, fiel das nicht auf — `seedToCable` baut die Ports beim
// Lesen aus dem Datenblatt neu. Fuer ein Geraet, an dem jemand einen Port
// umbenannt, einen zusaetzlichen angelegt oder die Seite gedreht hat, war die
// Arbeit nach einem Umweg ueber einen anderen Planer weg — und fuer ein
// Geraet ohne Datenblatt (`portsUnknown`) gab es gar nichts mehr.
//
// Dasselbe gilt fuer Rack-Einbau, Panel-Bilder und die Fremdschluessel aus
// Rentman, NetBox und GraphML: die versteht kein anderer Planer, und keiner
// darf sie deshalb verlieren.
//
// ─── DIE EINE REGEL: KEINE ZWEITE WAHRHEIT ─────────────────────────────────
//
// Was das Protokoll schon fuehrt, gehoert NICHT ins Fach. Die Lage ist der
// Fall, bei dem man es uebersieht: `x`/`y` sind hier Bildpunkte auf der
// Zeichenflaeche, das Protokoll traegt `nx`/`ny` (0..1). Dieselbe Angabe in
// zwei Einheiten an zwei Stellen — und beim naechsten Umbau widersprechen sie
// sich.
// ───────────────────────────────────────────────────────────────────────────
import type { EquipmentItem } from '../types/equipment';

/** Der Name dieses Gewerks im geteilten Geraet. */
export const GEWERK = 'signal';

/** Die Felder, die das PROTOKOLL fuehrt — sie gehoeren nicht ins Fach. */
export const GETEILT = [
  'id',
  'name',
  'subtitle',
  'category',
  'deviceTypeId',
  'x',
  'y',
] as const satisfies readonly (keyof EquipmentItem)[];

type Geteilt = (typeof GETEILT)[number];

/** Was nur dieser Planer versteht: Ports, Rack, Panels, Fremdschluessel. */
export type SignalFach = Omit<EquipmentItem, Geteilt>;

/** Die Fachdaten eines Geraets fuer den Rueckweg. */
export function fachAus(e: EquipmentItem): Record<string, unknown> {
  const fach: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e)) {
    if ((GETEILT as readonly string[]).includes(k)) continue;
    // `undefined` heisst „nicht gesetzt" und faehrt nicht mit.
    if (v === undefined) continue;
    fach[k] = v;
  }
  return fach;
}

/**
 * Das Fach dieses Planers aus einem geteilten Geraet — oder `null`.
 *
 * `null` heisst „dieses Geraet lief hier noch nie durch". Dann baut
 * `seedToCable` die Anschluesse wie bisher aus dem Datenblatt — die Regel,
 * die es fuer ein Geraet aus einem anderen Planer braucht.
 */
export function fachVon(
  geraet: { fachdaten?: Readonly<Record<string, Readonly<Record<string, unknown>>>> },
): Partial<SignalFach> | null {
  const fach = geraet.fachdaten?.[GEWERK];
  return fach ? (fach as Partial<SignalFach>) : null;
}

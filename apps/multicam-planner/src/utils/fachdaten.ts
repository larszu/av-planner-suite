// ───────────────────────────────────────────────────────────────────────────
// Das Fach dieses Planers im geteilten Geraet (ADR-013).
//
// WARUM ES DAS GIBT. Eigentuemer, 2026-09-19: „Sie muessen aber in allen
// Planern bleiben. Damit ich sie von a nach b nach c und wieder nach a
// kopieren kann und nichts verloren geht."
//
// Gemessen am selben Tag: eine ausgerichtete Kamera (Schwenk 15°, Neigung
// -8°, Hoehe 2,4 m, Blende 5.6, Fokus 12 m, Farbe) kam aus
// `camerasToSeedPatch` mit DREI Feldern zurueck. Der Rest fiel heraus. Dass es
// im Betrieb nicht auffiel, lag an `vorhandene`: der Planer legte seinen
// eigenen Zustand wieder darueber. Ueber die DATEI — in A speichern, in B
// oeffnen, in C bearbeiten, in A wieder aufmachen — war es weg.
//
// ─── DIE EINE REGEL: KEINE ZWEITE WAHRHEIT ─────────────────────────────────
//
// Was das Protokoll schon fuehrt, gehoert NICHT ins Fach. `x`/`y` stehen im
// Geraet, die Brennweite in `kamera.focalMm`, das Modell in `typId`. Stuenden
// sie zusaetzlich hier, widersprechen sich zwei Stellen, sobald ein anderer
// Planer die eine aendert — und niemand wuesste, welche gilt.
//
// `GETEILT` ist deshalb die Ausschlussliste, und `fachdatenTest` prueft, dass
// sie vollstaendig ist: ein neues Feld in `VenueCamera` faellt automatisch ins
// Fach, ein neues GETEILTES Feld muss hier eingetragen werden.
// ───────────────────────────────────────────────────────────────────────────
import type { VenueCamera } from '../types';

/** Der Name dieses Gewerks im geteilten Geraet. */
export const GEWERK = 'cameras';

/**
 * Die Felder, die das PROTOKOLL fuehrt — sie gehoeren nicht ins Fach.
 *
 * `satisfies` haelt die Liste an `VenueCamera`: ein Feldname, den es dort
 * nicht gibt, ist ein Tippfehler und faellt beim Bauen auf.
 */
export const GETEILT = [
  'id',
  'label',
  'cameraId',
  'lensId',
  'x',
  'y',
  'focalLength',
] as const satisfies readonly (keyof VenueCamera)[];

type Geteilt = (typeof GETEILT)[number];

/** Was nur dieser Planer versteht — alles ausser den geteilten Feldern. */
export type KameraFach = Omit<VenueCamera, Geteilt>;

/** Die Fachdaten einer Kamera fuer den Rueckweg. */
export function fachAus(cam: VenueCamera): Record<string, unknown> {
  const fach: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cam)) {
    if ((GETEILT as readonly string[]).includes(k)) continue;
    // `undefined` heisst „nicht gesetzt" und faehrt nicht mit: es durch die
    // Datei zu tragen hiesse, ein Feld zu behaupten, das niemand gesetzt hat.
    if (v === undefined) continue;
    fach[k] = v;
  }
  return fach;
}

/**
 * Das Fach dieses Planers aus einem geteilten Geraet — oder `null`.
 *
 * `null` und nicht `{}`: „kein Fach" heisst, dass dieses Geraet noch nie
 * durch diesen Planer gelaufen ist, und dann gelten die Vorgaben. Ein leeres
 * Fach hiesse, jemand habe alles geloescht.
 */
export function fachVon(
  geraet: { fachdaten?: Readonly<Record<string, Readonly<Record<string, unknown>>>> },
): Partial<KameraFach> | null {
  const fach = geraet.fachdaten?.[GEWERK];
  return fach ? (fach as Partial<KameraFach>) : null;
}

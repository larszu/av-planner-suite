// ───────────────────────────────────────────────────────────────────────────
// Das Fach dieses Planers im geteilten Geraet (ADR-013).
//
// WARUM ES DAS GIBT. Eigentuemer, 2026-09-19: „Sie muessen aber in allen
// Planern bleiben. Damit ich sie von a nach b nach c und wieder nach a
// kopieren kann und nichts verloren geht."
//
// Der Rueckweg dieses Planers meldete Zweck, Dimmer, DMX-Adresse, Universum,
// Hoehe und Lage — und sonst nichts. Ausrichtung (`aimX`/`aimY`),
// Koerperdrehung, Zoomwinkel, Farbfolien, Torblenden, Farbtemperatur und
// Fokus-Notiz fielen heraus. Dass es im Betrieb nicht auffiel, lag an
// `vorhandene`: der Planer legte seinen eigenen Stand wieder darueber. Ueber
// die DATEI war es weg.
//
// ─── DIE EINE REGEL: KEINE ZWEITE WAHRHEIT ─────────────────────────────────
//
// Was das Protokoll schon fuehrt, gehoert NICHT ins Fach: Lage, Hoehe,
// Dimmer, Kanal, Universum, Zweck, Name. `GETEILT` ist die Ausschlussliste,
// und ein Test prueft sie gegen den Rueckweg.
//
// ─── DIE AUSNAHME, DIE DAZUGEHOERT ─────────────────────────────────────────
//
// `fixture` — der ganze Bibliothekseintrag — ist normalerweise KEINE eigene
// Angabe: er haengt an `typId` und kommt beim Lesen aus dem Katalog. Fuer
// einen SELBST ANGELEGTEN Scheinwerfer gibt es dort aber nichts, und dann ist
// dieses Feld die einzige Stelle, an der er existiert. Er faehrt deshalb
// genau dann mit, wenn der Katalog ihn nicht kennt — nicht immer (das waere
// die zweite Wahrheit fuer 84 Modelle) und nicht nie (das waere der Verlust,
// gegen den diese Datei geschrieben ist).
// ───────────────────────────────────────────────────────────────────────────
import type { Fixture, PlacedFixture } from '../types';

/** Der Name dieses Gewerks im geteilten Geraet. */
export const GEWERK = 'fixtures';

/** Die Felder, die das PROTOKOLL fuehrt — sie gehoeren nicht ins Fach. */
export const GETEILT = [
  'id',
  'fixture',
  'x',
  'y',
  'mountingHeight',
  'dimming',
  'channel',
  'universe',
  'purpose',
  'unitNumber',
] as const satisfies readonly (keyof PlacedFixture)[];

type Geteilt = (typeof GETEILT)[number];

/** Was nur dieser Planer versteht. */
export type LichtFach = Omit<PlacedFixture, Geteilt> & {
  /** Nur fuer einen Scheinwerfer, den der Katalog NICHT kennt. Siehe Kopf. */
  eigenesModell?: Fixture;
};

/**
 * Die Fachdaten eines Scheinwerfers fuer den Rueckweg.
 *
 * `imKatalog` sagt, ob sein Modell aus der gemeinsamen Bibliothek kommt.
 * Kommt es das nicht, faehrt es als `eigenesModell` mit — sonst waere ein
 * selbst angelegter Scheinwerfer nach einem Umweg ueber einen anderen Planer
 * ein Geraet ohne Modell.
 */
export function fachAus(p: PlacedFixture, imKatalog: boolean): Record<string, unknown> {
  const fach: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if ((GETEILT as readonly string[]).includes(k)) continue;
    if (v === undefined) continue;
    fach[k] = v;
  }
  if (!imKatalog) fach.eigenesModell = p.fixture;
  return fach;
}

/**
 * Was vom Fach uebrigbleibt, nachdem der Aufbau oben die bekannten Felder
 * gesetzt hat: Zoomwinkel, Farbfolien, Torblenden, Farbtemperatur,
 * Fokus-Notiz — und alles, was spaeter dazukommt, ohne dass diese Datei davon
 * erfahren muss.
 *
 * `aimX`/`aimY`/`bodyRotation` bleiben AUSSEN VOR: sie stehen oben schon, und
 * zwar mit einer Regel („ein Ziel, das auf der Lampe lag, wandert mit"), die
 * ein blindes Ueberschreiben von hier wieder kaputtmachte.
 *
 * `eigenesModell` ebenfalls: es ist oben zu `fixture` geworden.
 */
const SCHON_GESETZT = ['aimX', 'aimY', 'bodyRotation', 'eigenesModell'] as const;

export function uebrigesFach(fach: Partial<LichtFach> | null): Record<string, unknown> {
  if (!fach) return {};
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fach)) {
    if ((SCHON_GESETZT as readonly string[]).includes(k)) continue;
    if (v === undefined) continue;
    rest[k] = v;
  }
  return rest;
}

/**
 * Das Fach dieses Planers aus einem geteilten Geraet — oder `null`.
 *
 * `null` heisst „dieses Geraet lief hier noch nie durch"; dann gelten die
 * Vorgaben. Ein leeres Fach hiesse, jemand habe alles geloescht.
 */
export function fachVon(
  geraet: { fachdaten?: Readonly<Record<string, Readonly<Record<string, unknown>>>> },
): Partial<LichtFach> | null {
  const fach = geraet.fachdaten?.[GEWERK];
  return fach ? (fach as Partial<LichtFach>) : null;
}

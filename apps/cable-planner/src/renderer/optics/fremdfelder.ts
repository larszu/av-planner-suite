/**
 * ADR-005 — Felder eines eingelesenen Raums, die das Kamera-/Optik-Modell
 * nicht modelliert und darum unveraendert mitfuehrt.
 *
 * WARUM ES DAS HIER GIBT (2026-09-19): `optics/` ist die aus dem
 * MultiCam-Planer uebernommene Kamera-/Objektiv-Logik. `types.ts` verwies auf
 * `../utils/venueExchange` — eine Datei, die es nur in MultiCam gibt. Der
 * Import lief hier ins Leere, und weil `build:renderer` nur transpiliert, fiel
 * das vier Typpruefungs-Fehler lang niemandem auf. Die Felder stehen deshalb
 * neben dem Modell, das sie braucht, statt hinter einem Pfad, den dieses Repo
 * nicht hat. Die Fassungen sind byte-gleich mit
 * `apps/multicam-planner/src/utils/venueExchange.ts`.
 */

/** Podest-Hoehe, Drehung, Polygon-Umriss — je Buehnen-Id. */
export interface ForeignStageFields {
  height?: number;
  height2?: number;
  rotation?: number;
  points?: { x: number; y: number }[];
}

/** Name, Sperre, PDF-Herkunft, Seitenzahl eines uebernommenen Grundrisses. */
export interface ForeignFloorPlanFields {
  name?: string;
  locked?: boolean;
  kind?: 'image' | 'pdf';
  pageCount?: number;
  pageIndex?: number;
}

/** Kruemmung und Reflexionsgrad — je Wand-Id. */
export interface ForeignWallFields {
  cx?: number;
  cy?: number;
  reflectance?: number;
}

/** Pose und Blickrichtung — je Personen-Id. */
export interface ForeignPersonFields {
  pose?: 'standing' | 'sitting';
  facing?: number;
}

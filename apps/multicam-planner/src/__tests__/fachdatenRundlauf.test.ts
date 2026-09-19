// ───────────────────────────────────────────────────────────────────────────
// A NACH B NACH C UND WIEDER NACH A (ADR-013).
//
// Eigentuemer, 2026-09-19: „Sie muessen aber in allen Planern bleiben. Damit
// ich sie von a nach b nach c und wieder nach a kopieren kann und nichts
// verloren geht."
//
// WAS DIESE DATEI ANDERS MACHT ALS `shellSeed.test.ts`: sie gibt
// `seedToCameras` KEINE `vorhandene` mit. Das ist der Fall, um den es geht —
// das Projekt kommt aus der Datei, dieser Planer lief seither nicht, und sein
// lokaler Zustand ist leer. Genau dort ging bis heute alles verloren, was
// nicht `lens`, `focalMm` oder `hfovDeg` hiess.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { emptySeed, type SuiteSeed } from '@avplan/ui/embed';
import { camerasToSeedPatch, seedToCameras } from '../utils/shellSeed';
import { LENSES } from '../data/lenses';
import type { Venue } from '../types';

const venue: Venue = { name: 'Halle', widthM: 24, heightM: 14, stages: [] };
const vorauswahl = () => ({ mount: 'E', lens: LENSES[0] });

const seedMit = (geraete: SuiteSeed['geraete']): SuiteSeed => ({ ...emptySeed(1), geraete });

/** Eine Kamera, wie sie aus einem anderen Planer herueberkommt. */
const AUS_DEM_SIGNALPLAN = seedMit([
  { id: 'k1', name: 'CAM 1', kategorie: 'Cameras', model: 'Sony PXW-FX9', x: 4, y: 10, kamera: { focalMm: 50 } },
]);

describe('Die Ausrichtung ueberlebt den Umweg', () => {
  it('haelt Schwenk, Neigung, Hoehe, Blende, Fokus und Farbe ueber Seed und Datei', () => {
    // 1. Der Planer bekommt die Kamera und der Nutzer richtet sie aus.
    const { cameras } = seedToCameras(AUS_DEM_SIGNALPLAN, venue, vorauswahl);
    const gerichtet = [{
      ...cameras[0],
      pan: 15, tilt: -8, z: 2.4,
      aperture: 5.6, focusDistance: 12,
      color: '#ff00ff', mountType: 'dolly' as const,
    }];

    // 2. Zurueck in den Seed — das ist, was gespeichert wird.
    const gemeldet = camerasToSeedPatch(gerichtet).geraete;
    expect(gemeldet[0].fachdaten?.cameras).toMatchObject({
      pan: 15, tilt: -8, z: 2.4, aperture: 5.6, focusDistance: 12,
      color: '#ff00ff', mountType: 'dolly',
    });

    // 3. Projekt geschlossen, in zwei anderen Planern bearbeitet, wieder
    //    geoeffnet: KEIN lokaler Stand. Frueher stand die Kamera hier wieder
    //    auf -90°/0°/1,5 m und zeigte auf ihre eigenen Fuesse.
    const { cameras: wieder } = seedToCameras(seedMit(gemeldet), venue, vorauswahl);
    expect(wieder[0].pan).toBe(15);
    expect(wieder[0].tilt).toBe(-8);
    expect(wieder[0].z).toBe(2.4);
    expect(wieder[0].aperture).toBe(5.6);
    expect(wieder[0].focusDistance).toBe(12);
    expect(wieder[0].color).toBe('#ff00ff');
    expect(wieder[0].mountType).toBe('dolly');
  });

  it('der lokale Stand schlaegt das Fach — wer sie in der Hand hat, ist neuer', () => {
    const { cameras } = seedToCameras(AUS_DEM_SIGNALPLAN, venue, vorauswahl);
    const gemeldet = camerasToSeedPatch([{ ...cameras[0], pan: 15 }]).geraete;
    // Drueben steht 15°, hier hat jemand gerade auf 90° gedreht.
    const lokal = [{ ...cameras[0], pan: 90 }];
    const { cameras: wieder } = seedToCameras(seedMit(gemeldet), venue, vorauswahl, LENSES, lokal);
    expect(wieder[0].pan).toBe(90);
  });

  it('das Fach traegt nichts, was das Protokoll schon fuehrt', () => {
    // Die Regel gegen die zweite Wahrheit. Stuende die Brennweite auch im
    // Fach, widerspraechen sich zwei Stellen, sobald ein anderer Planer die
    // eine aendert — und niemand wuesste, welche gilt.
    const { cameras } = seedToCameras(AUS_DEM_SIGNALPLAN, venue, vorauswahl);
    const fach = camerasToSeedPatch(cameras).geraete[0].fachdaten!.cameras;
    for (const geteilt of ['id', 'label', 'cameraId', 'lensId', 'x', 'y', 'focalLength']) {
      expect(fach, `„${geteilt}" fuehrt das Protokoll — es gehoert nicht ins Fach`).not.toHaveProperty(geteilt);
    }
  });

  it('erfindet kein Feld, das niemand gesetzt hat', () => {
    const { cameras } = seedToCameras(AUS_DEM_SIGNALPLAN, venue, vorauswahl);
    const ohneRig = { ...cameras[0] };
    delete ohneRig.rigId;
    const fach = camerasToSeedPatch([ohneRig]).geraete[0].fachdaten!.cameras;
    expect('rigId' in fach).toBe(false);
  });
});

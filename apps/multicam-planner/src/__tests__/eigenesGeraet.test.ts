// ───────────────────────────────────────────────────────────────────────────
// SELBST ANGELEGTE GERAETE (ADR-014).
//
// Eigentuemer, 2026-09-19: „Ich muss aber auch selber Geräte anlegen können
// und dann in anderen Planern öffnen können."
//
// Gemessen am selben Tag: eine in DIESEM Planer selbst angelegte Kamera
// meldete `model: undefined` zurueck — `camerasToSeedPatch` suchte nur im
// festen Katalog (`CAMERAS.find`) und fand das eigene Modell nicht. Das
// Geraet stand danach OHNE MODELL im geteilten Projekt, und beim naechsten
// Seed fiel es hier als „im Katalog nicht eindeutig" heraus. Wer sich eine
// Kamera selbst anlegte, verlor sie beim naechsten Projektwechsel — und das
// war kein Seiteneffekt, sondern der Normalfall.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { emptySeed } from '@avplan/ui/embed';
import { camerasToSeedPatch, seedToCameras } from '../utils/shellSeed';
import { CAMERAS } from '../data/cameras';
import { LENSES } from '../data/lenses';
import type { Camera, Lens, Venue, VenueCamera } from '../types';

const halle: Venue = { name: 'Halle', widthM: 24, heightM: 14, stages: [] };
const vorauswahl = () => ({ mount: 'E', lens: LENSES[0] });

const EIGENE: Camera = { ...CAMERAS[0], id: 'eigen-1', manufacturer: 'Haus', model: 'Werkstatt-Kamera' };
const EIGENES_GLAS: Lens = { ...LENSES[0], id: 'eigen-glas', manufacturer: 'Haus', model: 'Werkstatt-Zoom' };

const platziert = (over: Partial<VenueCamera> = {}): VenueCamera => ({
  id: 'c1',
  label: 'CAM 1',
  cameraId: EIGENE.id,
  lensId: LENSES[0].id,
  x: 4, y: 10, z: 1.5, pan: 15, tilt: -8,
  focalLength: 50, aperture: 4, focusDistance: 8,
  color: '#ffffff', extenderActive: 1,
  ...over,
});

describe('Eine selbst angelegte Kamera ueberlebt den Weg', () => {
  it('meldet ihr Modell — statt gar keines', () => {
    const gemeldet = camerasToSeedPatch([platziert()], LENSES, [EIGENE]).geraete;
    expect(gemeldet[0].model).toBe('Haus Werkstatt-Kamera');
    // Sie steht in keinem Katalog, also traegt sie auch keine Katalog-Id —
    // eine erfundene waere schlimmer als keine (ADR-002).
    expect(gemeldet[0].typId).toBeUndefined();
    // Und das Modell selbst faehrt im Fach mit, weil es sonst nirgends steht.
    expect(gemeldet[0].fachdaten?.cameras).toMatchObject({ eigenesModell: { id: 'eigen-1' } });
  });

  it('kommt nach dem Umweg zurueck — ohne die eigene Bibliothek', () => {
    // So ist es, wenn das Projekt von einem anderen Rechner kommt: die
    // eigenen Modelle dieses Nutzers liegen dort nicht.
    const gemeldet = camerasToSeedPatch([platziert()], LENSES, [EIGENE]).geraete;
    const { cameras, ausgelassen } = seedToCameras(
      { ...emptySeed(1), geraete: gemeldet }, halle, vorauswahl,
    );
    expect(ausgelassen).toEqual([]);
    expect(cameras).toHaveLength(1);
    expect(cameras[0].cameraId).toBe('eigen-1');
    // Und die Ausrichtung ist auch noch da (ADR-013).
    expect(cameras[0].pan).toBe(15);
    expect(cameras[0].tilt).toBe(-8);
  });

  it('dasselbe fuer ein selbst angelegtes OBJEKTIV', () => {
    const gemeldet = camerasToSeedPatch(
      [platziert({ lensId: EIGENES_GLAS.id })],
      [...LENSES, EIGENES_GLAS],
      [EIGENE],
    ).geraete;
    expect(gemeldet[0].kamera?.lens).toBe('Haus Werkstatt-Zoom');
    expect(gemeldet[0].fachdaten?.cameras).toMatchObject({ eigenesObjektiv: { id: 'eigen-glas' } });

    const { cameras } = seedToCameras({ ...emptySeed(1), geraete: gemeldet }, halle, vorauswahl);
    expect(cameras[0].lensId).toBe('eigen-glas');
  });

  it('ein Modell AUS dem Katalog faehrt nicht im Fach mit', () => {
    // Sonst stuenden 377 Datenblaetter doppelt in jeder Projektdatei.
    const ausKatalog = camerasToSeedPatch([platziert({ cameraId: CAMERAS[0].id })]).geraete;
    expect('eigenesModell' in (ausKatalog[0].fachdaten?.cameras ?? {})).toBe(false);
  });
});

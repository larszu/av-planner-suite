// ───────────────────────────────────────────────────────────────────────────
// A NACH B NACH C UND WIEDER NACH A — die Licht-Seite (ADR-013).
//
// Ohne `vorhandene`: das Projekt kommt aus der Datei, dieser Planer lief
// seither nicht, sein lokaler Stand ist leer. Genau dort ging bis heute
// alles verloren, was nicht Zweck, Dimmer, Kanal, Universum oder Hoehe hiess —
// Ausrichtung, Koerperdrehung, Zoomwinkel, Farbfolien, Torblenden.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { emptySeed, type SuiteSeed } from '@avplan/ui/embed';
import { fixturesToSeedPatch, seedToFixtures } from '../src/core/shellSeed';
import { fixtureLibrary } from '../src/core/fixtureLibrary';
import type { Fixture } from '../src/types';

const VORGABE = 6;
const seedMit = (geraete: SuiteSeed['geraete']): SuiteSeed => ({ ...emptySeed(1), geraete });

const AUS_DEM_SIGNALPLAN = seedMit([
  { id: 'lx1', name: 'LX 1', kategorie: 'Licht', model: 'ETC Source Four 26°', x: 8, y: 5 },
]);

describe('Die Ausrichtung eines Scheinwerfers ueberlebt den Umweg', () => {
  it('haelt Ziel, Koerperdrehung, Zoom, Folien und Torblenden ueber Seed und Datei', () => {
    const { fixtures } = seedToFixtures(AUS_DEM_SIGNALPLAN, VORGABE);
    expect(fixtures).toHaveLength(1);

    const gerichtet = [{
      ...fixtures[0],
      aimX: 12, aimY: 3,
      bodyRotation: 35,
      currentBeamAngle: 19,
      gelFilterIds: ['r26'],
      barnDoors: { top: 10, bottom: 0, left: 5, right: 0 },
      focusNote: 'auf den Rednerpult-Kopf',
    }];

    const gemeldet = fixturesToSeedPatch(gerichtet).geraete;
    const { fixtures: wieder } = seedToFixtures(seedMit(gemeldet), VORGABE);

    expect(wieder[0].aimX).toBe(12);
    expect(wieder[0].aimY).toBe(3);
    expect(wieder[0].bodyRotation).toBe(35);
    expect(wieder[0].currentBeamAngle).toBe(19);
    expect(wieder[0].gelFilterIds).toEqual(['r26']);
    expect(wieder[0].barnDoors).toEqual({ top: 10, bottom: 0, left: 5, right: 0 });
    expect(wieder[0].focusNote).toBe('auf den Rednerpult-Kopf');
  });

  it('ein SELBST angelegter Scheinwerfer ueberlebt den Umweg ebenfalls', () => {
    // Er steht in keinem Katalog. Ohne sein Modell im Fach kaeme er nach dem
    // Umweg als „Modell nicht eindeutig" zurueck — also gar nicht.
    const eigenes: Fixture = {
      ...fixtureLibrary[0],
      id: 'eigenbau-1',
      name: 'Werkstatt-Fluter',
      manufacturer: 'Haus',
    };
    const seed = seedMit([{ id: 'lx9', name: 'LX 9', kategorie: 'Licht', model: 'Haus Werkstatt-Fluter', x: 2, y: 2 }]);
    const { fixtures } = seedToFixtures(seed, VORGABE, [eigenes]);
    expect(fixtures[0].fixture.id).toBe('eigenbau-1');

    // Rueckweg und zurueck — diesmal OHNE die eigene Bibliothek, so wie es
    // waere, wenn das Projekt von einem anderen Rechner kaeme.
    const gemeldet = fixturesToSeedPatch(fixtures).geraete;
    const { fixtures: wieder, ausgelassen } = seedToFixtures(seedMit(gemeldet), VORGABE);
    expect(ausgelassen).toEqual([]);
    expect(wieder[0].fixture.id).toBe('eigenbau-1');
    expect(wieder[0].fixture.name).toBe('Werkstatt-Fluter');
  });

  it('ein Modell AUS dem Katalog faehrt nicht im Fach mit', () => {
    // Sonst stuende dasselbe Datenblatt an zwei Stellen, und die Datei truege
    // 84 Modelle doppelt.
    const { fixtures } = seedToFixtures(AUS_DEM_SIGNALPLAN, VORGABE);
    const fach = fixturesToSeedPatch(fixtures).geraete[0].fachdaten!.fixtures;
    expect('eigenesModell' in fach).toBe(false);
  });

  it('das Fach traegt nichts, was das Protokoll schon fuehrt', () => {
    const { fixtures } = seedToFixtures(AUS_DEM_SIGNALPLAN, VORGABE);
    const fach = fixturesToSeedPatch(fixtures).geraete[0].fachdaten!.fixtures;
    for (const geteilt of ['id', 'fixture', 'x', 'y', 'mountingHeight', 'dimming', 'channel', 'universe', 'purpose', 'unitNumber']) {
      expect(fach, `„${geteilt}" fuehrt das Protokoll — es gehoert nicht ins Fach`).not.toHaveProperty(geteilt);
    }
  });
});

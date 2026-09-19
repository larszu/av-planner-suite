import { describe, expect, it } from 'vitest';
import { emptySeed, type SeedGeraet, type SuiteSeed } from '@avplan/ui/embed';
import { fixturesToSeedPatch, katalogFixture, seedToFixtures } from '../src/core/shellSeed';

// ───────────────────────────────────────────────────────────────────────────
// SUITE-OVERLAY-TEST: der Projekt-Seed der Shell im Light-Planer.
//
// Ein falsch aufgeloester Scheinwerfer bringt falschen Abstrahlwinkel,
// falsche Leistung und falsche Beleuchtungsstaerke in die Berechnung — und
// sieht dabei richtig aus. Deshalb misst dieser Test vor allem, was NICHT
// passiert.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Ein Seed fuer den Test.
 *
 * `fixtures` ist die bequeme Schreibweise und nicht mehr der Inhalt: seit
 * ADR-011 Stufe 3 liest der Planer `geraete`, und die Sicht `fixtures` wird
 * daraus gerechnet. Der Helfer legt die Leuchten deshalb als Geraete an — so
 * pruefen die Tests den Weg, den die Shell wirklich geht.
 */
type AlsLeuchte = {
  id: string; name: string; model?: string; purpose?: string; dimmerPct?: number
  dmxChannel?: number; universe?: number; rigHeightM?: number; x?: number; y?: number
}

const seed = (over: Partial<SuiteSeed> & { fixtures?: AlsLeuchte[] } = {}): SuiteSeed => {
  const { fixtures, ...rest } = over;
  const geraete: SeedGeraet[] = (fixtures ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    kategorie: 'Licht',
    ...(f.model !== undefined ? { model: f.model } : {}),
    ...(f.x !== undefined ? { x: f.x } : {}),
    ...(f.y !== undefined ? { y: f.y } : {}),
    licht: {
      ...(f.purpose !== undefined ? { purpose: f.purpose } : {}),
      ...(f.dimmerPct !== undefined ? { dimmerPct: f.dimmerPct } : {}),
      ...(f.dmxChannel !== undefined ? { dmxChannel: f.dmxChannel } : {}),
      ...(f.universe !== undefined ? { universe: f.universe } : {}),
      ...(f.rigHeightM !== undefined ? { rigHeightM: f.rigHeightM } : {}),
    },
  }));
  return { ...emptySeed(1), geraete, ...rest };
};

describe('shellSeed — Bibliotheks-Aufloesung', () => {
  it('findet einen Scheinwerfer ueber Hersteller + Name', () => {
    expect(katalogFixture({ model: 'ETC Source Four 19°', name: 'LX 1' })).toBeTruthy();
  });

  it('loest nicht auf, was die Bibliothek nicht fuehrt', () => {
    expect(katalogFixture({ model: 'PAR 64 CP62', name: 'LX 6' })).toBeNull();
  });
});

describe('shellSeed — Uebernahme', () => {
  it('platziert nur Aufgeloestes und meldet den Rest', () => {
    const { fixtures, ausgelassen } = seedToFixtures(
      seed({
        fixtures: [
          { id: 'lx1', name: 'LX 1', model: 'ETC Source Four 19°', x: 8.6, y: 5.6, dimmerPct: 82, dmxChannel: 1, purpose: 'Key Host' },
          { id: 'lx6', name: 'LX 6', model: 'PAR 64 CP62', x: 15.4, y: 5.6 },
        ],
      }),
      6,
    );
    expect(fixtures.map((f) => f.id)).toEqual(['lx1']);
    expect(fixtures[0].x).toBe(8.6);
    expect(fixtures[0].dimming).toBe(82);
    expect(fixtures[0].channel).toBe(1);
    expect(fixtures[0].purpose).toBe('Key Host');
    expect(ausgelassen.map((a) => a.id)).toEqual(['lx6']);
  });

  it('richtet nicht aus, was niemand ausgerichtet hat', () => {
    // Ohne Ziel im Seed zeigt die Lampe auf ihre eigene Stelle — dieselbe
    // Voreinstellung wie beim Platzieren von Hand. Ein erfundenes Ziel waere
    // eine Ausrichtungs-Aussage.
    const { fixtures } = seedToFixtures(
      seed({ fixtures: [{ id: 'lx1', name: 'LX 1', model: 'ETC Source Four 19°', x: 3, y: 4 }] }),
      6,
    );
    expect(fixtures[0].aimX).toBe(3);
    expect(fixtures[0].aimY).toBe(4);
    expect(fixtures[0].mountingHeight).toBe(6);
    // Ohne Dimmer-Angabe gilt 100 % — der Seed sagt nichts anderes.
    expect(fixtures[0].dimming).toBe(100);
  });
});

describe('shellSeed — Rueckweg', () => {
  it('meldet den Bestand mit dem Modellnamen der Bibliothek zurueck', () => {
    const { fixtures } = seedToFixtures(
      seed({ fixtures: [{ id: 'lx1', name: 'LX 1', model: 'ETC Source Four 19°', x: 8.6, y: 5.6, dimmerPct: 82 }] }),
      6,
    );
    // Der Rueckweg meldet `geraete`; die Licht-Felder stehen in der
    // Fachgruppe, damit die Shell nur schreibt, was dem Lichtplan gehoert.
    const gemeldet = fixturesToSeedPatch(fixtures).geraete[0];
    const zurueck = { ...gemeldet, ...gemeldet.licht };
    expect(zurueck.id).toBe('lx1');
    expect(zurueck.name).toBe('LX 1');
    expect(zurueck.model).toContain('Source Four 19°');
    expect(zurueck.dimmerPct).toBe(82);
    expect(zurueck.x).toBe(8.6);
  });
});

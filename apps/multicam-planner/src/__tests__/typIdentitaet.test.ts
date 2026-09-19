// ───────────────────────────────────────────────────────────────────────────
// EINE Basis fuer alle Listen (ADR-012).
//
// Der Eigentuemer, 2026-09-19: „Ausnahmslos alles soll sich die gleiche Basis
// teilen!" Diese Datei misst die Stelle, an der es bisher NICHT so war.
//
// Bis hierher trug die Shell nur `model` — freien Text —, und dieser Planer
// verglich ihn gegen seine eigene Liste. Das geht oft gut und manchmal
// falsch, und der Unterschied ist nicht zu sehen: ein Name, der ein anderes
// Modell trifft, liefert einen anderen Sensor und damit Bildwinkel, die
// voellig richtig aussehen. Mit `typId` ist die Zuordnung eine Tatsache.
//
// `katalogKamera` raet dabei nicht weniger als vorher — der Namensvergleich
// steht unveraendert darunter. Er kommt nur nicht mehr zum Zug, wenn es
// etwas Besseres gibt.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { katalogKamera } from '../utils/shellSeed';
import { alleKameraTypen, kameraFuerTyp, typIdFuer } from '../utils/typRegister';
import { CAMERAS } from '../data/cameras';

/** Dieselbe Kamera, die Cable-Katalog und Kameraliste teilen. */
const FX9 = '05d88e97-2f3d-4b16-868c-f13f202754c5';

describe('ADR-012 — die Identitaet schlaegt den Namen', () => {
  it('loest ueber die Katalog-Id auf, wo der Name scheitert', () => {
    // Ein Geraet, dessen Anzeigename nichts trifft — so heisst es im
    // Signalplan, wenn dort jemand die Beschriftung gesetzt hat.
    expect(katalogKamera({ name: 'Kamera Buehne links', model: 'Kamera Buehne links' })).toBeNull();
    // Mit der Id kommt die Kamera trotzdem an.
    expect(
      katalogKamera({ name: 'Kamera Buehne links', model: 'Kamera Buehne links', typId: FX9 })?.id,
    ).toBe('sony-fx9');
  });

  it('die Id gilt auch gegen einen Namen, der etwas ANDERES treffen wuerde', () => {
    // Der schlimmere Fall: nicht „nichts gefunden", sondern die falsche
    // Kamera — ein anderer Sensor, falsche Bildwinkel, und alles sieht
    // richtig aus.
    const andere = CAMERAS.find((c) => c.id !== 'sony-fx9' && c.model.length > 3)!;
    const treffer = katalogKamera({
      name: 'CAM 1',
      model: `${andere.manufacturer} ${andere.model}`,
      typId: FX9,
    });
    expect(treffer?.id).toBe('sony-fx9');
  });

  it('kennt die Rueckrichtung: eigenes Modell -> gemeinsame Id', () => {
    const cam = CAMERAS.find((c) => c.id === 'sony-fx9')!;
    expect(typIdFuer(cam)).toBe(FX9);
    expect(kameraFuerTyp(FX9)?.id).toBe('sony-fx9');
  });

  it('ohne Id bleibt es beim Namensvergleich — geraten wird nichts', () => {
    expect(kameraFuerTyp(undefined)).toBeNull();
    expect(kameraFuerTyp('gibt-es-nicht')).toBeNull();
  });

  it('die Auswahl zeigt ALLE Kameratypen der Suite, die eigenen zuerst', () => {
    const wahl = alleKameraTypen();
    expect(wahl.length).toBeGreaterThan(CAMERAS.length);
    // Die eigenen stehen vorn: was dieser Planer rechnen kann, ist die
    // bessere Wahl, und die Reihenfolge sagt es, statt es zu verschweigen.
    expect(wahl[0].ohneOptik).toBe(false);
    expect(wahl[wahl.length - 1].ohneOptik).toBe(true);
    // Und die fremden sind als solche gekennzeichnet: ohne Sensorbreite gibt
    // es keinen Bildwinkel, und eine gerechnete Zahl waere erfunden.
    const fremd = wahl.filter((w) => w.ohneOptik);
    expect(fremd.length).toBeGreaterThan(0);
    expect(fremd.every((w) => w.eigen === null)).toBe(true);
  });
});

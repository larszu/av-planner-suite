// ───────────────────────────────────────────────────────────────────────────
// EINEM GERAET EIN MODELL GEBEN (ADR-014, Abschluss).
//
// Die Liste „Im Projekt, hier ohne Modell" zeigte das Geraet — mehr nicht.
// Der letzte Schritt fehlte: ihm hier ein Modell zu geben und es damit in
// JEDEM Planer zu einem vollwertigen Geraet zu machen.
//
// WAS DABEI SCHIEFGEHEN KANN UND HIER GEMESSEN WIRD: eine NEUE Kamera
// anzulegen statt das vorhandene Geraet zu platzieren. Dann stuenden zwei
// Datensaetze fuer dasselbe Blech im Projekt — genau die Doppelung, gegen die
// ADR-011 geschrieben ist, und der Bedarf zaehlte zwei Kameras.
// ───────────────────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store/useStore';
import { CAMERAS } from '../data/cameras';
import { camerasToSeedPatch } from '../utils/shellSeed';

const GERAET = {
  id: 'e1',
  name: 'Werkstatt-Kamera',
  kategorie: 'Cameras',
  x: 6,
  y: 9,
};

describe('Modell zuordnen', () => {
  beforeEach(() => {
    useStore.setState({
      cameras: [],
      ohneModell: [{ id: 'e1', name: 'Werkstatt-Kamera', grund: 'kein Modell angegeben', geraet: GERAET }],
    });
  });

  it('platziert DAS GERAET — mit seiner Id, seinem Namen, seiner Lage', () => {
    useStore.getState().geraetPlatzieren('e1', CAMERAS[0].id);
    const { cameras, ohneModell } = useStore.getState();

    expect(cameras).toHaveLength(1);
    // SEINE Id. Eine neue waere ein zweites Geraet fuer dasselbe Blech.
    expect(cameras[0].id).toBe('e1');
    expect(cameras[0].label).toBe('Werkstatt-Kamera');
    expect(cameras[0].x).toBe(6);
    expect(cameras[0].y).toBe(9);
    expect(cameras[0].cameraId).toBe(CAMERAS[0].id);
    // Und es steht nicht mehr in der offenen Liste.
    expect(ohneModell).toEqual([]);
  });

  it('und die Zuordnung faehrt zu den anderen Planern zurueck', () => {
    useStore.getState().geraetPlatzieren('e1', CAMERAS[0].id);
    const gemeldet = camerasToSeedPatch(useStore.getState().cameras).geraete;
    expect(gemeldet[0].id).toBe('e1');
    expect(gemeldet[0].model).toBe(`${CAMERAS[0].manufacturer} ${CAMERAS[0].model}`);
    // Ueber die Katalog-Identitaet findet der Signalplan sein Datenblatt und
    // das Lager seine Position (ADR-012).
    expect(gemeldet[0].typId).toBeTruthy();
  });

  it('tut nichts, wenn die Id oder das Modell nicht passt', () => {
    useStore.getState().geraetPlatzieren('gibt-es-nicht', CAMERAS[0].id);
    expect(useStore.getState().cameras).toEqual([]);
    useStore.getState().geraetPlatzieren('e1', 'kein-modell');
    expect(useStore.getState().cameras).toEqual([]);
    // Und die offene Liste bleibt stehen — nichts wurde stillschweigend
    // verworfen.
    expect(useStore.getState().ohneModell).toHaveLength(1);
  });

  it('nimmt die Lage NICHT an, wo das Geraet keine hat', () => {
    // Ein Geraet aus dem Signalplan hat `nx`/`ny` im Diagramm, aber keine
    // Meter im Raum. `0/0` waere die Ecke der Halle — als Tatsache gezeichnet.
    useStore.setState({
      ohneModell: [{ id: 'e2', name: 'Ohne Ort', grund: 'kein Modell angegeben', geraet: { id: 'e2', name: 'Ohne Ort' } }],
    });
    useStore.getState().geraetPlatzieren('e2', CAMERAS[0].id);
    const cam = useStore.getState().cameras.find((c) => c.id === 'e2')!;
    const { venue } = useStore.getState();
    expect(cam.x).toBe(venue.widthM / 2);
    expect(cam.y).toBe(venue.heightM * 0.75);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Die Kameraliste dieses Planers und der gemeinsame Katalog — EINE Basis.
//
// WARUM ES DAS GIBT (ADR-012, 2026-09-19). Der Eigentuemer: „Inventory
// planner und der ganze Rest hat aber noch eigene Listen. Ausnahmslos alles
// soll sich die gleiche Basis teilen!"
//
// `data/cameras.ts` fuehrt 377 Modelle mit Sensor, Bajonett und Sensormodi.
// Der gemeinsame Katalog fuehrt 385 Kamera-TYPEN — dieselben 377 plus acht,
// die nur der Cable-Planer kennt. Diese acht waren hier bis heute unsichtbar:
// wer sie drueben in den Plan legte, bekam hier „Modell nicht eindeutig".
//
// WAS HIER NICHT PASSIERT: die fachlichen Fakten wandern nicht in den
// Katalog. Sensor und Bajonett versteht dieser Planer, und ein Paket, das sie
// fuehrte, waere dieser Planer mit anderem Namen (ADR-002, Eigentumstabelle).
// Geteilt wird die IDENTITAET, nicht das Datenblatt.
//
// REIN: keine Datei, kein Netz, keine Uhr.
// ───────────────────────────────────────────────────────────────────────────
import { alleTypen, typFuerQuelle, type Geraetetyp } from '@avplan/device-catalog';
import { CAMERAS } from '../data/cameras';
import { LENSES } from '../data/lenses';
import type { Camera, Lens } from '../types';

/** Der Name, unter dem dieser Planer im Katalog als Quelle steht. */
export const QUELLE = 'multicam';

/**
 * Die Katalog-Identitaet eines Modells DIESER Liste.
 *
 * Gerechnet und nicht gespeichert: das Feld stuende sonst 377-mal in
 * `cameras.ts` und driftete gegen die Fassung, die der Generator errechnet.
 */
export const typIdFuer = (cam: Pick<Camera, 'id'>): string | undefined =>
  typFuerQuelle(alleTypen(), QUELLE, cam.id)?.id;

/** Das Kameramodell hinter einer Katalog-Identitaet — oder `null`. */
export function kameraFuerTyp(typId: string | undefined): Camera | null {
  if (!typId) return null;
  const typ = alleTypen().find((t) => t.id === typId);
  const ref = typ?.refs?.[QUELLE];
  return (ref ? CAMERAS.find((c) => c.id === ref) : null) ?? null;
}

/** Ein Kameratyp der Suite, so wie eine Auswahl ihn zeigt. */
export interface KameraTypWahl {
  typId: string;
  /** Der Anzeigename: Hersteller und Modell, wie der Katalog sie fuehrt. */
  label: string;
  /** Das eigene Modell, wenn diese Liste es fuehrt — sonst `null`. */
  eigen: Camera | null;
  /**
   * WAHR, wenn nur ein anderer Planer diesen Typ kennt.
   *
   * Dann fehlen Sensor und Bajonett, und das ist eine Auskunft und kein
   * Fehler: eine Bildwinkel-Rechnung ohne Sensorbreite waere eine erfundene
   * Zahl, die voellig richtig aussieht. Die Oberflaeche sagt es, statt das
   * Modell zu verschweigen.
   */
  ohneOptik: boolean;
}

/**
 * Alle Kameratypen der Suite — die eigenen zuerst, dann die fremden.
 *
 * Die Reihenfolge ist die Aussage: was dieser Planer rechnen kann, steht
 * oben. Wer weiter unten waehlt, waehlt bewusst ein Modell ohne Optik-Daten.
 */
export function alleKameraTypen(): KameraTypWahl[] {
  const typen = alleTypen().filter((t: Geraetetyp) => t.kategorie === 'Cameras');
  const wahl = typen.map((t) => {
    const ref = t.refs?.[QUELLE];
    const eigen = (ref ? CAMERAS.find((c) => c.id === ref) : null) ?? null;
    return {
      typId: t.id,
      label: t.hersteller ? `${t.hersteller} ${t.modell}` : t.modell,
      eigen,
      ohneOptik: eigen === null,
    };
  });
  return [...wahl.filter((w) => !w.ohneOptik), ...wahl.filter((w) => w.ohneOptik)];
}

// ───────────────────────────────────────────────────────────────────────────
// Dasselbe fuer OBJEKTIVE.
//
// 835 Eintraege — die groesste Liste der Suite und bis zum 2026-09-19 die
// letzte, die niemand ausser diesem Planer kannte. Ein Objektiv ist Geraet
// wie jedes andere: Hersteller, Modell, Datenblatt, Case, Tagesmiete. Das
// Lager fuehrt es, der Kostenplan rechnet damit.
//
// Was NICHT wandert: Brennweiten, Blende, Bildkreis, Squeeze. Die rechnet
// dieser Planer.
// ───────────────────────────────────────────────────────────────────────────

/** Die Katalog-Identitaet eines Objektivs DIESER Liste. */
export const typIdFuerObjektiv = (l: Pick<Lens, 'id'>): string | undefined =>
  typFuerQuelle(alleTypen(), QUELLE, l.id)?.id;

/** Das Objektivmodell hinter einer Katalog-Identitaet — oder `null`. */
export function objektivFuerTyp(typId: string | undefined): Lens | null {
  if (!typId) return null;
  const ref = alleTypen().find((t) => t.id === typId)?.refs?.[QUELLE];
  return (ref ? LENSES.find((l) => l.id === ref) : null) ?? null;
}

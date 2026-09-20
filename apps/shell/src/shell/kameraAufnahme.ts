/**
 * Ein Foto mit der Kamera dieses Rechners.
 *
 * ─── DER GRUND, AUS DEM ES DAS NICHT GAB ──────────────────────────────────
 *
 *   > Kamera, Trimmen, Vertonung (recceboard) — ein Telefon-Werkzeug und ein
 *   > Schnittprogramm; die Suite läuft auf dem Rechner.
 *
 * Die zweite Hälfte des Satzes stimmt, die Schlussfolgerung nicht. Eine
 * Motivbesichtigung läuft mit dem Telefon — und das Telefon ist genau das
 * Gerät, auf dem `src/mobile` der Planer ohnehin läuft. Ein Rechner am Ort
 * hat eine Kamera, ein Laptop im Besprechungsraum auch, und was fehlte, war
 * nicht das Gerät, sondern der Knopf.
 *
 * ─── WAS DIESE STELLE NICHT TUT ───────────────────────────────────────────
 *
 * Sie filmt nicht. Ein Board trägt Standbilder in ihrer Standzeit; ein
 * Video-Schnipsel darauf wäre ein Inhalt, den weder der Kontaktabzug noch
 * der Druck zeigen kann, und er läge als zweite Wahrheit neben dem Film,
 * der aus dem Board selbst entsteht.
 *
 * Sie legt auch nichts ab. Sie liefert ein Bild zurück; ob daraus eine Karte
 * wird und ob es unter die Einbettungs-Grenze passt, entscheidet die Fläche
 * — dieselbe Prüfung wie für jede andere Datei, an einer Stelle.
 */
export type KameraErgebnis =
  | { ok: true; dataUrl: string; breite: number; hoehe: number; groesse: number }
  | { ok: false; grund: KameraAbsageGrund }

export type KameraAbsageGrund = 'keine-kamera' | 'abgelehnt' | 'abgebrochen' | 'kein-bild'

export interface LaufendeKamera {
  /** Das Live-Bild. Gehört an ein `<video>`, damit jemand sieht, was er knipst. */
  strom: MediaStream
  /** Auslösen: das aktuelle Bild als JPEG. */
  ausloesen: () => KameraErgebnis
  /** Kamera schliessen. MUSS laufen — sonst bleibt die Leuchte an. */
  schliessen: () => void
}

/** Wie stark das Foto verdichtet wird. Hoch genug für ein Motiv, klein genug
 *  für ein Projekt, das per Mail weitergeht. */
const QUALITAET = 0.82

/**
 * Kamera öffnen.
 *
 * Eine Ablehnung ist eine ANTWORT und kein Fehler — wie beim Mikrofon. Die
 * Oberfläche sagt dann, was fehlt, statt einen Knopf ins Leere laufen zu
 * lassen.
 */
export async function oeffneKamera(): Promise<LaufendeKamera | { ok: false; grund: KameraAbsageGrund }> {
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, grund: 'keine-kamera' }
  let strom: MediaStream
  try {
    strom = await navigator.mediaDevices.getUserMedia({
      // Die RÜCKSEITE, wo es eine gibt: auf einem Telefon im Hallenumlauf
      // zeigt die Frontkamera den Träger und nicht das Motiv. `ideal` und
      // nicht `exact`, damit ein Laptop mit nur einer Kamera nicht abgelehnt
      // wird.
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
  } catch {
    return { ok: false, grund: 'abgelehnt' }
  }

  // Das `<video>` gehört HIERHER und nicht in die Oberfläche: der Auslöser
  // liest das aktuelle Bild daraus, und ein Element, das die Fläche verwaltet,
  // wäre beim Auslösen vielleicht schon abgeräumt.
  const bildschirm = document.createElement('video')
  bildschirm.srcObject = strom
  bildschirm.muted = true
  bildschirm.playsInline = true
  void bildschirm.play().catch(() => {})

  const schliessen = () => {
    for (const spur of strom.getTracks()) spur.stop()
    bildschirm.srcObject = null
  }

  return {
    strom,
    schliessen,
    ausloesen: () => {
      const w = bildschirm.videoWidth
      const h = bildschirm.videoHeight
      // Kein Bild heisst kein Bild. Eine Leinwand in Vorgabegrösse ergäbe
      // eine schwarze Karte, die aussieht wie ein misslungenes Foto.
      if (!w || !h) return { ok: false, grund: 'kein-bild' }
      const leinwand = document.createElement('canvas')
      leinwand.width = w
      leinwand.height = h
      const ctx = leinwand.getContext('2d')
      if (!ctx) return { ok: false, grund: 'kein-bild' }
      ctx.drawImage(bildschirm, 0, 0, w, h)
      const dataUrl = leinwand.toDataURL('image/jpeg', QUALITAET)
      // Die Grösse wird HIER gemessen und nicht geschätzt: die Fläche prüft
      // sie gegen dieselbe Einbettungs-Grenze wie jede andere Datei, und eine
      // geschätzte Zahl wäre dort eine Vorgabe, die wie eine Messung aussieht.
      const groesse = Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4)
      return { ok: true, dataUrl, breite: w, hoehe: h, groesse }
    },
  }
}

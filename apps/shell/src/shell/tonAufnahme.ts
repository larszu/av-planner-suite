/**
 * Eine Tonaufnahme im Browser.
 *
 * ─── DER GRUND, AUS DEM ES SIE NICHT GAB ──────────────────────────────────
 *
 *   > Voice-over, Musikbett, Audio-Panel — ein Schnittprogramm.
 *
 * Fuer eine MISCHUNG stimmt das: drei Spuren, Pegel, Blenden. Fuer das, was
 * ein Storyboard braucht — eine gesprochene Erklaerung ueber den laufenden
 * Film — stimmt es nicht. Das kann der Browser seit `MediaRecorder` selbst.
 *
 * ─── WAS SIE NICHT TUT ────────────────────────────────────────────────────
 *
 * Sie mischt nicht. Es gibt EINE Tonspur zum Board, kein Musikbett darunter
 * und keinen Pegelsteller — wer das braucht, braucht wirklich ein
 * Schnittprogramm, und ein halber Mischer waere schlechter als keiner.
 */
export type TonErgebnis =
  | { ok: true; dataUrl: string; sekunden: number; groesse: number }
  | { ok: false; grund: 'kein-mikrofon' | 'abgelehnt' | 'kein-recorder' }

export interface LaufendeAufnahme {
  /** Beendet die Aufnahme und liefert das Ergebnis. */
  stop: () => Promise<TonErgebnis>
  /** Bricht ab und wirft weg — fuer den Fall, dass jemand es sich anders ueberlegt. */
  verwerfen: () => void
}

const besterTonTyp = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined') return undefined
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return undefined
}

/**
 * Aufnahme starten.
 *
 * Der Mikrofon-Zugriff wird vom Browser erfragt — und eine Ablehnung ist
 * eine ANTWORT und kein Fehler: sie kommt als `abgelehnt` zurueck, damit die
 * Oberflaeche sagen kann, was fehlt, statt einen Knopf ins Leere laufen zu
 * lassen.
 */
export type AufnahmeAbsage = { ok: false; grund: 'kein-mikrofon' | 'abgelehnt' | 'kein-recorder' }

export async function starteAufnahme(): Promise<LaufendeAufnahme | AufnahmeAbsage> {
  const typ = besterTonTyp()
  if (!typ) return { ok: false, grund: 'kein-recorder' }
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, grund: 'kein-mikrofon' }

  let strom: MediaStream
  try {
    strom = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    return { ok: false, grund: 'abgelehnt' }
  }

  const recorder = new MediaRecorder(strom, { mimeType: typ })
  const teile: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) teile.push(e.data)
  }
  const start = performance.now()
  recorder.start(250)

  const aufraeumen = () => {
    for (const s of strom.getTracks()) s.stop()
  }

  return {
    async stop() {
      const fertig = new Promise<void>((r) => {
        recorder.onstop = () => r()
      })
      recorder.stop()
      await fertig
      aufraeumen()
      const blob = new Blob(teile, { type: typ })
      const dataUrl = await new Promise<string>((r) => {
        const leser = new FileReader()
        leser.onload = () => r(String(leser.result))
        leser.readAsDataURL(blob)
      })
      return {
        ok: true,
        dataUrl,
        sekunden: (performance.now() - start) / 1000,
        groesse: blob.size,
      }
    },
    verwerfen() {
      try {
        recorder.stop()
      } catch {
        /* schon gestoppt */
      }
      aufraeumen()
    },
  }
}

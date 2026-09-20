import type { Shot } from '../data/board'
import { BOARD_FORMAT_RATIO, type BoardFormat } from '../data/project'

// ───────────────────────────────────────────────────────────────────────────
// DEN FILM ALS DATEI. Der Grund, aus dem es ihn nicht gab, war:
//
//   > MP4-Export des Films — ein Schnittprogramm. Der Kontaktabzug ist der
//   > Weg nach draussen.
//
// Das stimmte für einen SCHNITT — Blenden, Tonmischung, Farbkorrektur. Es
// stimmt nicht für das, was dieses Board ist: Standbilder, jedes seine
// Standzeit lang, in Schnittfolge. Das kann der Browser selbst, seit es
// `captureStream` und `MediaRecorder` gibt, und dafür braucht niemand ein
// Schnittprogramm.
//
// ─── WARUM IN ECHTZEIT UND NICHT SCHNELLER ────────────────────────────────
//
// `MediaRecorder` stempelt jedes Bild mit dem Zeitpunkt, an dem es ankommt.
// Wer schneller einspeist, bekommt einen Film, der zu schnell läuft — die
// Standzeiten wären dann eine Behauptung im Dokument und nicht das, was man
// sieht. Ein Export dauert also so lang wie der Film. Das steht in der
// Oberfläche, damit niemand auf einen Fehler wartet.
//
// ─── WELCHES FORMAT ───────────────────────────────────────────────────────
//
// Was der Browser aufnehmen KANN, und nicht, was schöner klänge: `mp4` wird
// bevorzugt und `webm` genommen, wenn der Browser kein mp4 aufnimmt. Welches
// es wurde, steht im Ergebnis — ein `.mp4`, in dem WebM liegt, ist eine
// Datei, die der Empfänger nicht öffnen kann.
// ───────────────────────────────────────────────────────────────────────────

export type FilmTyp = { mime: string; endung: 'mp4' | 'webm' }

/**
 * Das beste Format, das dieser Browser wirklich aufnimmt.
 *
 * Gefragt wird `MediaRecorder.isTypeSupported` und nicht der Name des
 * Browsers: die Antwort hängt an der Fassung und am Betriebssystem, und eine
 * Liste von Browser-Namen wäre nach dem nächsten Herbst falsch.
 */
export function besterTyp(): FilmTyp | null {
  if (typeof MediaRecorder === 'undefined') return null
  const kandidaten: FilmTyp[] = [
    { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', endung: 'mp4' },
    { mime: 'video/mp4', endung: 'mp4' },
    { mime: 'video/webm;codecs=vp9,opus', endung: 'webm' },
    { mime: 'video/webm', endung: 'webm' },
  ]
  return kandidaten.find((k) => MediaRecorder.isTypeSupported(k.mime)) ?? null
}

export type FilmErgebnis =
  | { ok: true; blob: Blob; typ: FilmTyp; sekunden: number }
  | { ok: false; grund: 'kein-recorder' | 'keine-einstellung' | 'abgebrochen' }

/** Ein Bild laden — fertig dekodiert, damit das Zeichnen nicht stockt. */
function ladeBild(src: string): Promise<HTMLImageElement | null> {
  return new Promise((fertig) => {
    const img = new Image()
    img.onload = () => fertig(img)
    img.onerror = () => fertig(null)
    img.src = src
  })
}

/**
 * Den Film aufnehmen.
 *
 * Gezeichnet wird auf eine Leinwand im Bildformat des Boards; ein Bild, das
 * nicht hineinpasst, wird EINGEPASST und nicht beschnitten (`contain`) —
 * dieselbe Regel wie bei den Bildgrenzen auf der Fläche: was ausserhalb
 * liegt, ist die Information, die beim Schneiden gebraucht wird.
 */
export async function exportiereFilm(opts: {
  shots: readonly Shot[]
  format?: BoardFormat
  /** Breite der Leinwand. Die Höhe folgt dem Bildformat. */
  breite?: number
  /** Vertonung als data-URL. Fehlt sie, bleibt der Film stumm. */
  tonSrc?: string
  onFortschritt?: (anteil: number) => void
  abbruch?: () => boolean
}): Promise<FilmErgebnis> {
  const { shots, format, breite = 1280, tonSrc, onFortschritt, abbruch } = opts
  if (shots.length === 0) return { ok: false, grund: 'keine-einstellung' }
  const typ = besterTyp()
  if (!typ) return { ok: false, grund: 'kein-recorder' }

  const ratio = format ? BOARD_FORMAT_RATIO[format] : (shots[0]!.card.ratio ?? 16 / 9)
  const w = Math.round(breite / 2) * 2
  const h = Math.round(w / ratio / 2) * 2
  const leinwand = document.createElement('canvas')
  leinwand.width = w
  leinwand.height = h
  const ctx = leinwand.getContext('2d')
  if (!ctx) return { ok: false, grund: 'kein-recorder' }

  // Alle Bilder VORHER laden. Ein Bild, das mitten im Film dekodiert wird,
  // hinterlaesst ein schwarzes Einzelbild — und das steht dann in der Datei.
  const bilder = new Map<string, HTMLImageElement | null>()
  for (const s of shots) {
    if (s.card.src && !bilder.has(s.card.id)) bilder.set(s.card.id, await ladeBild(s.card.src))
  }

  const strom = leinwand.captureStream(30)

  // Der Ton laeuft ueber einen Audio-Graphen in denselben Strom. Ohne das
  // waere die Vertonung eine Datei neben dem Film, und wer ihn weitergibt,
  // gaebe sie nicht mit.
  let audioCtx: AudioContext | undefined
  let quelle: AudioBufferSourceNode | undefined
  if (tonSrc) {
    try {
      audioCtx = new AudioContext()
      const daten = await (await fetch(tonSrc)).arrayBuffer()
      const puffer = await audioCtx.decodeAudioData(daten)
      const ziel = audioCtx.createMediaStreamDestination()
      quelle = audioCtx.createBufferSource()
      quelle.buffer = puffer
      quelle.connect(ziel)
      for (const spur of ziel.stream.getAudioTracks()) strom.addTrack(spur)
    } catch {
      // Ein Ton, der sich nicht dekodieren laesst, macht den Film nicht
      // kaputt — er fehlt dann, und das ist besser als kein Film.
      audioCtx = undefined
      quelle = undefined
    }
  }

  const recorder = new MediaRecorder(strom, { mimeType: typ.mime })
  const teile: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) teile.push(e.data)
  }

  const gesamt = shots.reduce((n, s) => n + s.durationS, 0)
  const fertig = new Promise<void>((r) => {
    recorder.onstop = () => r()
  })

  recorder.start(200)
  quelle?.start()
  const start = performance.now()
  let abgebrochen = false

  await new Promise<void>((r) => {
    const zeichne = () => {
      const t = (performance.now() - start) / 1000
      if (abbruch?.()) {
        abgebrochen = true
        r()
        return
      }
      if (t >= gesamt) {
        r()
        return
      }
      const shot = shots.find((s) => t >= s.startS && t < s.startS + s.durationS) ?? shots[0]!
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)
      const bild = bilder.get(shot.card.id)
      if (bild) {
        // EINPASSEN statt beschneiden.
        const bRatio = bild.naturalWidth / bild.naturalHeight
        const zw = bRatio > ratio ? w : h * bRatio
        const zh = bRatio > ratio ? w / bRatio : h
        ctx.drawImage(bild, (w - zw) / 2, (h - zh) / 2, zw, zh)
      } else if (shot.card.color) {
        ctx.fillStyle = shot.card.color
        ctx.fillRect(0, 0, w, h)
      }
      onFortschritt?.(Math.min(1, t / gesamt))
      requestAnimationFrame(zeichne)
    }
    requestAnimationFrame(zeichne)
  })

  recorder.stop()
  await fertig
  quelle?.stop()
  await audioCtx?.close().catch(() => {})
  for (const spur of strom.getTracks()) spur.stop()

  if (abgebrochen) return { ok: false, grund: 'abgebrochen' }
  return { ok: true, blob: new Blob(teile, { type: typ.mime }), typ, sekunden: gesamt }
}

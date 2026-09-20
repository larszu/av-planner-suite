import { farbeVon, initialenVon, type Anwesend, type MitmachFlaeche, type Staende } from '@avplan/ui/embed'

/**
 * Mitmachen, vom Fenster aus.
 *
 * ─── DIE ASYMMETRIE IST DER GANZE TRICK ───────────────────────────────────
 *
 * AUFMACHEN braucht die Desktop-Fassung: nur dort gibt es einen Prozess, der
 * einen Zuhörer im Netz aufmachen kann. MITMACHEN braucht gar nichts — der
 * Strom ist ein `EventSource`, die Meldung ein `fetch`, und beides steht in
 * jedem Browser. Das Telefon eines Kollegen im selben WLAN ist damit dabei,
 * ohne dass jemand etwas installiert.
 *
 * Genau das war die Antwort auf „braucht einen Server": es braucht einen
 * Rechner, der aufmacht, und den gibt es schon — er steht auf dem Tisch.
 */
export interface MitmachZugang {
  geheimnis: string
  port: number
  adressen: { name: string; url: string }[]
  dabei: number
}

interface MitmachIPC {
  starte: () => Promise<{ ok: boolean; port?: number; geheimnis?: string; adressen?: { name: string; url: string }[] }>
  beende: () => Promise<boolean>
  zugang: () => Promise<MitmachZugang | null>
}

const ipc = (): MitmachIPC | null => {
  const w = window as unknown as { __suiteMitmachen?: MitmachIPC }
  return w.__suiteMitmachen ?? null
}

/** Kann DIESES Fenster aufmachen? Die Oberfläche fragt das VOR dem Knopf. */
export const aufmachenMoeglich = (): boolean => ipc() !== null

export async function macheAuf(): Promise<{ ok: true; zugang: MitmachZugang } | { ok: false; grund: 'nur-im-desktop' | 'kein-server' }> {
  const h = ipc()
  if (!h) return { ok: false, grund: 'nur-im-desktop' }
  const r = await h.starte()
  if (!r.ok) return { ok: false, grund: 'kein-server' }
  const z = await h.zugang()
  if (!z) return { ok: false, grund: 'kein-server' }
  return { ok: true, zugang: z }
}

export async function macheZu(): Promise<void> {
  await ipc()?.beende()
}

export async function mitmachZugang(): Promise<MitmachZugang | null> {
  return (await ipc()?.zugang()) ?? null
}

// ─── DIE SITZUNG ──────────────────────────────────────────────────────────

/**
 * Eine Kennung für DIESES Fenster, nicht für diese Person.
 *
 * Zwei Fenster derselben Person sind zwei Mitmachende — und das ist richtig
 * so: sie haben zwei Zeiger und können einander in die Quere kommen wie
 * zwei Leute.
 */
export const sitzungsKennung = (): string => {
  const w = window as unknown as { __avSitzung?: string }
  if (!w.__avSitzung) {
    w.__avSitzung =
      typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  }
  return w.__avSitzung
}

export interface Meldung {
  sitzung: string
  anwesend?: Omit<Anwesend, 'zuletzt'>
  flaeche?: MitmachFlaeche
  staende?: Staende
  /** Der ging gerade. Kommt vom Server, nicht von einem Mitmachenden. */
  fort?: string
}

export interface Verbindung {
  /** Etwas melden. Antwortet `false`, wenn die Gegenstelle gerade weg ist. */
  melde: (m: Omit<Meldung, 'sitzung'>) => Promise<boolean>
  trenne: () => void
}

export type VerbindungsErgebnis =
  | { ok: true; verbindung: Verbindung }
  | { ok: false; grund: 'keine-webadresse' | 'falsches-geheimnis' | 'nicht-erreichbar' }

/**
 * Bei einem offenen Fenster mitmachen.
 *
 * `basis` ist die Adresse, die der Gastgeber vorliest
 * (`http://192.168.1.23:44685`). `aufMeldung` bekommt jede Meldung der
 * anderen — das Zusammenführen macht der Aufrufer mit
 * `fuehreFlaecheZusammen`, weil es rein ist und geprüft wird.
 *
 * DIE VERBINDUNG STIRBT NICHT LEISE: bricht der Strom ab, ruft
 * `aufMeldung` nichts mehr, und `melde` antwortet `false`. Wer das nicht
 * zeigt, lässt jemanden weiterarbeiten in dem Glauben, die anderen sähen es.
 */
export function machMit(
  basis: string,
  geheimnis: string,
  aufMeldung: (m: Meldung) => void,
  aufAbbruch?: () => void,
): VerbindungsErgebnis {
  let url: URL
  try {
    url = new URL(basis)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, grund: 'keine-webadresse' }
  } catch {
    return { ok: false, grund: 'keine-webadresse' }
  }
  const sitzung = sitzungsKennung()
  const stamm = url.origin
  const quelle = new EventSource(
    `${stamm}/mitmachen/strom?geheimnis=${encodeURIComponent(geheimnis)}&sitzung=${encodeURIComponent(sitzung)}`,
  )
  let lebt = true

  quelle.addEventListener('stand', (e) => {
    try {
      aufMeldung(JSON.parse((e as MessageEvent).data) as Meldung)
    } catch {
      /* eine unlesbare Meldung ist keine Meldung */
    }
  })
  quelle.addEventListener('tschuess', (e) => {
    try {
      const { sitzung: fort } = JSON.parse((e as MessageEvent).data) as { sitzung: string }
      aufMeldung({ sitzung: fort, fort })
    } catch {
      /* egal */
    }
  })
  quelle.onerror = () => {
    // `EventSource` versucht von selbst weiter. Gemeldet wird trotzdem —
    // wer gerade schreibt, soll sehen, dass es nicht ankommt.
    if (lebt) aufAbbruch?.()
  }

  return {
    ok: true,
    verbindung: {
      melde: async (m) => {
        if (!lebt) return false
        try {
          const r = await fetch(`${stamm}/mitmachen/melden`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ...m, sitzung, geheimnis }),
          })
          return r.ok
        } catch {
          return false
        }
      },
      trenne: () => {
        lebt = false
        quelle.close()
      },
    },
  }
}

/** Die eigene Anwesenheit aus der Identität — ohne Namen kein Zeiger. */
export function eigeneAnwesenheit(name: string | undefined, x?: number, y?: number, haelt?: string): Omit<Anwesend, 'zuletzt'> | null {
  const sauber = name?.trim()
  if (!sauber) return null
  return {
    sitzung: sitzungsKennung(),
    name: sauber,
    farbe: farbeVon(sauber),
    initialen: initialenVon(sauber),
    x,
    y,
    haelt,
  }
}

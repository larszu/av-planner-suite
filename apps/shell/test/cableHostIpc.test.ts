import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ───────────────────────────────────────────────────────────────────────────
// DER NATIVE CABLE-HOST REGISTRIERT, WAS DIE EINZEL-APP REGISTRIERT.
//
// `cableHost.cjs` fuehrt eine eigene Abschrift der IPC-Module aus
// `cable-planner/src/main/index.ts`. Gemessen 2026-09-27 fehlten darin acht
// (netbox, attachment, mcp, switcher, documentLog, receipt, showControl,
// tally): jedes Vendoring brachte neue Handler, und niemand trug sie nach.
// Der Smoke-Test sah es nicht — er meldet Module, die SCHEITERN, nicht
// solche, die gar nicht erst in der Liste stehen.
//
// Ausnahmen stehen hier mit Grund. Eine neue braucht einen neuen Grund.
// ───────────────────────────────────────────────────────────────────────────

const WURZEL = join(__dirname, '..', '..', '..')
const lies = (p: string) => readFileSync(join(WURZEL, p), 'utf8')

const AUSNAHMEN: Record<string, string> = {
  // E-12: Lexware ist eine eigene Shell-Domaene (`lexware.cjs`).
  'lexwareIpc.js': 'E-12',
}

/** Die `registerXIpc()`-Aufrufe der Einzel-App, in Aufrufreihenfolge, als
 *  [Datei, Funktion] — die Datei aus dem Import, nicht aus dem Namen. */
function einzelApp(): [string, string][] {
  const src = lies('apps/cable-planner/src/main/index.ts')
  const datei = new Map<string, string>()
  for (const m of src.matchAll(/import \{([^}]+)\} from '\.\/ipc\/([A-Za-z]+Ipc)\.js'/g)) {
    for (const name of m[1].split(',').map((n) => n.trim())) {
      if (/^register\w+Ipc$/.test(name)) datei.set(name, `${m[2]}.js`)
    }
  }
  const aufrufe = [...src.matchAll(/^\s*(register\w+Ipc)\(\)/gm)].map((m) => m[1])
  return aufrufe.map((fn) => [datei.get(fn) ?? `?${fn}`, fn])
}

function suiteHost(): [string, string][] {
  const src = lies('apps/shell/electron/cableHost.cjs')
  const block = /const IPC_MODULES = \[([\s\S]*?)\n\]/.exec(src)?.[1] ?? ''
  return [...block.matchAll(/^\s*\['([^']+)', '([^']+)'\]/gm)].map((m) => [m[1], m[2]])
}

describe('cableHost — IPC-Module wie in der Einzel-App', () => {
  it('liest beide Listen (sonst prueft der Vergleich nichts)', () => {
    expect(einzelApp().length).toBeGreaterThan(15)
    expect(suiteHost().length).toBeGreaterThan(15)
  })

  it('registriert jedes Modul der Einzel-App, in derselben Reihenfolge', () => {
    const erwartet = einzelApp().filter(([datei]) => !(datei in AUSNAHMEN))
    expect(suiteHost()).toEqual(erwartet)
  })

  it('jede Ausnahme gibt es in der Einzel-App wirklich', () => {
    const dateien = einzelApp().map(([d]) => d)
    for (const d of Object.keys(AUSNAHMEN)) expect(dateien).toContain(d)
  })
})

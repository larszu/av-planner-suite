// Nativer Cable-Host (experimentell, hinter SUITE_NATIVE_CABLE).
//
// Betreibt den *echten* Cable-Planer im Signal-Feld der Suite: eine
// WebContentsView mit Cables echtem Preload (window.cablePlanner) lädt den
// gebündelten Cable-Renderer über planner-signal://, und Cables echte
// IPC-Handler werden im Suite-Hauptprozess registriert (Datei-I/O, ATEM,
// Videohub, Lexware/keytar …). Im Gegensatz zum iframe-Pfad (Phase 1, kein
// Preload → webFallbackApi) bekommt Cable hier volle native Funktionalität.
//
// Bewusst defensiv: fehlt der gebündelte Cable-Main oder scheitert ein Import,
// bleibt der Host inaktiv und meldet das — der Renderer fällt dann auf den
// iframe-Pfad zurück. Der native Modus ist opt-in (Flag), damit der
// ausgelieferte Standard-Build unverändert der stabile iframe-Pfad bleibt.
const path = require('node:path')
const fs = require('node:fs')
const { pathToFileURL } = require('node:url')

const CABLE_URL = 'planner-signal://app/index.html'

// Cables IPC-Registrierungen (parameterlos, registrieren globale ipcMain.handle).
// Reihenfolge und Umfang wie in cable-planner/src/main/index.ts; der Test
// `apps/shell/test/cableHostIpc.test.ts` haelt beide Listen gegeneinander.
// Bis 2026-09-27 fehlten hier acht Module (netbox, attachment, mcp u. a.) —
// der eingebettete Planer zeigte die Knoepfe, und der Aufruf endete mit
// „No handler registered". Alle Kanaele tragen Cables Praefixe; die Shell
// selbst registriert nur `suiteHost:*`, eine Kollision ist also ausgeschlossen.
const IPC_MODULES = [
  ['credentialsIpc.js', 'registerCredentialsIpc'],
  ['rentmanIpc.js', 'registerRentmanIpc'],
  ['netboxIpc.js', 'registerNetboxIpc'],
  ['deviceLibraryIpc.js', 'registerDeviceLibraryIpc'],
  ['streamPreviewIpc.js', 'registerStreamPreviewIpc'],
  ['cloudIpc.js', 'registerCloudIpc'],
  ['projectIpc.js', 'registerProjectIpc'],
  ['atemIpc.js', 'registerAtemIpc'],
  ['videohubIpc.js', 'registerVideohubIpc'],
  ['switcherIpc.js', 'registerSwitcherIpc'],
  ['logIpc.js', 'registerLogIpc'],
  ['documentLogIpc.js', 'registerDocumentLogIpc'],
  ['receiptIpc.js', 'registerReceiptIpc'],
  ['attachmentIpc.js', 'registerAttachmentIpc'],
  ['showControlIpc.js', 'registerShowControlIpc'],
  ['tallyIpc.js', 'registerTallyIpc'],
  ['syncIpc.js', 'registerSyncIpc'],
  ['graphmlIpc.js', 'registerGraphmlIpc'],
  ['mobileShareIpc.js', 'registerMobileShareIpc'],
  // Nur die Handler; der MCP-Server startet erst, wenn jemand ihn in den
  // Einstellungen einschaltet (`mcp:start`) — wie in der Einzel-App.
  ['mcpIpc.js', 'registerMcpIpc'],
  ['collabDiscoveryIpc.js', 'registerCollabDiscoveryIpc'],
  ['printIpc.js', 'registerPrintIpc'],
  ['libraryIpc.js', 'registerLibraryIpc'],
  ['signalingIpc.js', 'registerSignalingIpc'],
  // E-12: KEIN lexwareIpc. Lexware ist eine eigene Shell-Domaene
  // (`lexware.cjs`), und die laeuft in BEIDEN Betriebsarten. Cables Handler
  // hier zusaetzlich zu registrieren gaebe zwei Wege zu derselben API — und
  // im nativen Modus haette der Nutzer je nach Fenster einen anderen
  // Beleg-Weg unter denselben Knoepfen.
]

function mainDir() {
  return path.join(__dirname, '..', 'planners', 'signal-main')
}

/** Ist der gebündelte Cable-Main vorhanden? */
function available() {
  return fs.existsSync(path.join(mainDir(), 'index.js')) &&
    fs.existsSync(path.join(mainDir(), 'preload.cjs'))
}

let registered = false
async function registerCableIpc(log) {
  if (registered) return
  registered = true
  const dir = mainDir()
  for (const [file, fn] of IPC_MODULES) {
    const abs = path.join(dir, 'ipc', file)
    try {
      const mod = await import(pathToFileURL(abs).href)
      if (typeof mod[fn] === 'function') {
        mod[fn]()
      } else {
        log(`[cableHost] ${file}: Export ${fn} fehlt — übersprungen.`)
      }
    } catch (err) {
      // Ein fehlender optionaler Dienst darf den Rest nicht blockieren.
      log(`[cableHost] ${file} konnte nicht registriert werden: ${err && err.message}`)
    }
  }
}

/**
 * Host-Fabrik. Bindet die Cable-View an das Suite-Fenster und liefert eine
 * schmale Steuer-API (Bounds/Sichtbarkeit), die der Suite-Main über IPC an den
 * Renderer weiterreicht. Kein Effekt, wenn der Cable-Main fehlt.
 */
function createCableHost(win, { WebContentsView }, log = console.warn) {
  if (!available()) {
    log('[cableHost] Cable-Main nicht gebündelt (planners/signal-main) — nativer Modus inaktiv.')
    return null
  }

  let view = null
  let visible = false
  let lastBounds = { x: 0, y: 0, width: 0, height: 0 }

  async function ensureView() {
    if (view) return view
    await registerCableIpc(log)
    view = new WebContentsView({
      webPreferences: {
        preload: path.join(mainDir(), 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })
    // Externe Links in den Standardbrowser (wie im iframe-Pfad).
    view.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/.test(url)) require('electron').shell.openExternal(url)
      return { action: 'deny' }
    })
    win.contentView.addChildView(view)
    view.setBounds(lastBounds)
    await view.webContents.loadURL(CABLE_URL)
    return view
  }

  return {
    async show(bounds) {
      if (bounds) lastBounds = bounds
      const v = await ensureView()
      v.setBounds(lastBounds)
      v.setVisible(true)
      visible = true
    },
    setBounds(bounds) {
      lastBounds = bounds
      if (view && visible) view.setBounds(bounds)
    },
    hide() {
      visible = false
      if (view) view.setVisible(false)
    },
    isAvailable: true,
  }
}

module.exports = { createCableHost, cableNativeAvailable: available }

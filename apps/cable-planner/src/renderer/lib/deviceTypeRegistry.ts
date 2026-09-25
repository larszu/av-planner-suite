// ───────────────────────────────────────────────────────────────────────────
// Zentrales Register der stabilen Geraetetyp-Identitaeten (GUID).
//
// GDTF/DIN-SPEC-15800-analog (FixtureTypeID): jede Katalog-Zeile traegt eine
// einmalig gemintete, versionsstabile GUID. Dieses Register loest eine solche
// ID autoritativ auf ihr Datenblatt-Template und — wo vorhanden — auf die
// Geraete-Rolle (ATEM/Videohub bzw. Switch/Router) auf. Damit ersetzt die
// ID-Aufloesung schrittweise die Namens-Heuristiken (deviceKind.ts): fuer
// Katalog-Geraete ist die Rolle eine Datenblatt-Tatsache, kein Regex-Treffer.
// Namens-Heuristik bleibt nur Fallback fuer Geraete OHNE deviceTypeId
// (manuell angelegt, Rentman/GraphML-Import ohne Katalog-Zuordnung).
// ───────────────────────────────────────────────────────────────────────────
import { typenAusser } from '@avplan/device-catalog'
import type { EquipmentTemplate } from '../types/equipment'
import type { RecordingCapability } from './recording'
import { CAMERA_CATALOG } from './cameraCatalog'
import { BLACKMAGIC_CATALOG } from './blackmagicCatalog'
import { GREENGO_CATALOG } from './greengoCatalog'
import { LED_PROCESSOR_CATALOG } from './ledProcessorCatalog'
import { MONITOR_CATALOG } from './monitorCatalog'
import { UBIQUITI_CATALOG } from './ubiquitiCatalog'
import { MISC_CATALOG } from './miscCatalog'
import { AJA_CATALOG } from './ajaCatalog'
import { ROSS_CATALOG } from './rossCatalog'
import { LYNX_CATALOG } from './lynxCatalog'
import { SWITCHER_CATALOG } from './switcherCatalog'
import { AVNETWORK_CATALOG } from './avNetworkCatalog'
import { BROADCAST_TOOLS_CATALOG } from './broadcastToolsCatalog'
import { AUDIO_CATALOG } from './audioCatalog'
import { WIRELESS_AUDIO_CATALOG } from './wirelessAudioCatalog'
import { MIC_CATALOG } from './micCatalog'
import { MEDIA_STATION_CATALOG } from './mediaStationCatalog'

export interface DeviceTypeInfo {
  /** Datenblatt-Template (inkl. deviceTypeId). */
  template: EquipmentTemplate
  /** Autoritative Geraete-Rolle (Datenblatt), wenn eine spezialisierte UI existiert. */
  kind?: 'videohub' | 'atem' | 'multiviewer' | 'greengo'
  /** Autoritative Netzwerk-Rolle (Datenblatt). */
  networkKind?: 'switch' | 'router'
  /** Videohubs: expliziter Export-Preset-Key (Datenblatt-Fakt). */
  videohubPresetKey?: string
  /**
   * Zeichnet dieses Modell auf, und in welcher Form (Bedarf 62)?
   *
   * Eigenes Feld neben `kind`, weil beides zugleich gilt: ein ATEM Mini Pro
   * ISO ist Mischer UND Recorder. Fehlt das Feld bei einem Katalog-Eintrag,
   * ist das die Datenblatt-Aussage „zeichnet nicht auf" — `detectRecording`
   * laesst die Namens-Heuristik dann bewusst nicht mehr darueber.
   */
  records?: RecordingCapability
}

/** Lazy aufgebaut, damit der Modul-Import billig bleibt. */
let registry: Map<string, DeviceTypeInfo> | null = null

const buildRegistry = (): Map<string, DeviceTypeInfo> => {
  const map = new Map<string, DeviceTypeInfo>()
  const put = (id: string, info: DeviceTypeInfo) => {
    if (map.has(id)) {
      // Doppelte GUID waere ein Katalog-Pflegefehler — laut, nicht still.
      console.warn(`deviceTypeRegistry: doppelte deviceTypeId ${id}`)
      return
    }
    map.set(id, info)
  }
  for (const e of CAMERA_CATALOG) {
    put(e.deviceTypeId, { template: { ...e.template, deviceTypeId: e.deviceTypeId } })
  }
  for (const e of BLACKMAGIC_CATALOG) {
    put(e.deviceTypeId, {
      template: { ...e.template, deviceTypeId: e.deviceTypeId },
      kind: e.kind,
      videohubPresetKey: e.videohubPresetKey,
      records: e.records,
    })
  }
  for (const e of GREENGO_CATALOG) {
    // GreenGo-Katalog: die Rolle ist fuer alle Eintraege 'greengo' (Intercom).
    put(e.deviceTypeId, {
      template: { ...e.template, deviceTypeId: e.deviceTypeId },
      kind: 'greengo',
    })
  }
  for (const e of LED_PROCESSOR_CATALOG) {
    put(e.deviceTypeId, {
      template: { ...e.template, deviceTypeId: e.deviceTypeId },
    })
  }
  for (const e of MONITOR_CATALOG) {
    put(e.deviceTypeId, {
      template: { ...e.template, deviceTypeId: e.deviceTypeId },
      records: e.records,
    })
  }
  for (const e of UBIQUITI_CATALOG) {
    put(e.deviceTypeId, {
      template: { ...e.template, deviceTypeId: e.deviceTypeId },
      networkKind: e.networkKind,
    })
  }
  for (const e of MISC_CATALOG) {
    put(e.deviceTypeId, {
      template: { ...e.template, deviceTypeId: e.deviceTypeId },
      records: e.records,
    })
  }
  // AJA/Ross/Lynx/Switcher: KEIN kind 'videohub' fuer fremde Router (KUMO,
  // Ultrix, NK) — der Videohub-Export spricht das Blackmagic-Protokoll
  // (Port 9990), das diese Geraete nicht verstehen. Rolle bleibt null.
  for (const e of AJA_CATALOG) {
    put(e.deviceTypeId, {
      template: { ...e.template, deviceTypeId: e.deviceTypeId },
      records: e.records,
    })
  }
  for (const e of ROSS_CATALOG) {
    put(e.deviceTypeId, { template: { ...e.template, deviceTypeId: e.deviceTypeId } })
  }
  for (const e of LYNX_CATALOG) {
    put(e.deviceTypeId, { template: { ...e.template, deviceTypeId: e.deviceTypeId } })
  }
  for (const e of SWITCHER_CATALOG) {
    put(e.deviceTypeId, { template: { ...e.template, deviceTypeId: e.deviceTypeId } })
  }
  for (const e of BROADCAST_TOOLS_CATALOG) {
    put(e.deviceTypeId, { template: { ...e.template, deviceTypeId: e.deviceTypeId } })
  }
  for (const e of AUDIO_CATALOG) {
    put(e.deviceTypeId, { template: { ...e.template, deviceTypeId: e.deviceTypeId } })
  }
  for (const e of WIRELESS_AUDIO_CATALOG) {
    put(e.deviceTypeId, { template: { ...e.template, deviceTypeId: e.deviceTypeId } })
  }
  for (const e of MIC_CATALOG) {
    put(e.deviceTypeId, { template: { ...e.template, deviceTypeId: e.deviceTypeId } })
  }
  for (const e of MEDIA_STATION_CATALOG) {
    put(e.deviceTypeId, { template: { ...e.template, deviceTypeId: e.deviceTypeId } })
  }
  for (const e of AVNETWORK_CATALOG) {
    put(e.deviceTypeId, {
      template: { ...e.template, deviceTypeId: e.deviceTypeId },
      networkKind: e.networkKind,
    })
  }
  return map
}

/**
 * Loest eine stabile Geraetetyp-ID autoritativ auf — oder null, wenn die ID
 * (noch) nicht in unseren Katalogen liegt. Kein Raten: null heisst unbekannt.
 */
export interface DeviceTypeChoice {
  id: string
  /** Modellname aus dem Datenblatt-Template. */
  name: string
  category?: string
  /**
   * Dieser Typ kommt aus dem gemeinsamen Katalog der Suite und hat HIER kein
   * Datenblatt-Template — also keine Ports, Masse oder Leistungsaufnahme.
   *
   * Eine AUSSAGE und kein Mangel: das Modell gibt es, seine Anschluesse kennt
   * dieser Planer nicht. Wer ein solches Geraet anlegt, bekommt es mit
   * `portsUnknown` — das ist der Mechanismus, den dieses Repo dafuer hat, und
   * er ist besser als erfundene Ports (Pruefung 18 fordert das Datenblatt
   * dann weiter ein).
   */
  ohneDatenblatt?: boolean
}

/**
 * ADR-002 — alle Katalog-Typen zur Auswahl.
 *
 * Bis hierher konnte eine `deviceTypeId` NUR ueber ein Katalog-Template in ein
 * Geraet gelangen: Wer eines von Hand anlegt oder importiert, bekam nie eine
 * Identitaet — und ohne sie bleibt die Lager-Deckung fuer immer ein
 * Namensvergleich. Diese Liste ist die Voraussetzung dafuer, sie nachtraeglich
 * zuzuweisen.
 */
export const listDeviceTypes = (): DeviceTypeChoice[] => {
  registry ??= buildRegistry()
  const eigene: DeviceTypeChoice[] = [...registry.entries()].map(([id, info]) => ({
    id,
    name: info.template.name,
    ...(info.template.category ? { category: info.template.category } : {}),
  }))

  // ── Der gemeinsame Katalog der Suite (ADR-002, Befund A) ────────────────
  //
  // Bis 2026-09-19 kannte dieser Planer 23 Kameramodelle, waehrend die Suite
  // 377 fuehrte — 368 davon hatten hier ueberhaupt keine Identitaet. Wer eine
  // im MultiCam-Planer gezeichnete Kamera hier wiederfinden wollte, legte sie
  // ein zweites Mal von Hand an. Genau die Doppelarbeit, gegen die das
  // Werkzeug gebaut ist.
  //
  // `typenAusser('cable')` und nicht der ganze Katalog: die eigenen 467
  // stehen schon oben, mit Ports und Massen, die das Paket bewusst nicht
  // fuehrt. Die IDENTITAET kommt trotzdem von dort — hier steht nur, wer
  // fragt.
  const fremde: DeviceTypeChoice[] = typenAusser('cable').map((t) => ({
    id: t.id,
    name: t.hersteller ? `${t.hersteller} ${t.modell}` : t.modell,
    category: t.kategorie,
    ohneDatenblatt: true,
  }))

  return [...eigene, ...fremde].sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

export const resolveDeviceType = (deviceTypeId: string | undefined): DeviceTypeInfo | null => {
  if (!deviceTypeId) return null
  registry ??= buildRegistry()
  return registry.get(deviceTypeId) ?? null
}

// ───────────────────────────────────────────────────────────────────────────
// SUITE-OVERLAY (nicht upstream): der Projekt-Seed der Shell wird hier auf das
// native Modell des Cable-Planers abgebildet — und zurueck.
//
// WOFUER. Die Suite-Shell fuehrt ein bewusst einfaches Projektmodell (Raum,
// Kameras, Leuchten, Signalknoten, Kabel) und schiebt davon die Teilmenge, die
// diesen Planer angeht, als `suite-seed` durch den postMessage-Bus. Ohne diese
// Datei zeigte das Signal-Modul der Suite links die Geraete des Shell-Projekts
// und in der Mitte einen leeren Cable-Planer mit seinem Erst-Start-Dialog.
//
// DER GRUNDSATZ, DER JEDE ENTSCHEIDUNG HIER BESTIMMT: nichts erfinden. Der
// Seed kennt keine Port-Belegung. Ein erfundener „SDI Out" waere eine
// plausible-aber-falsche Tatsache, die still in Stueckliste, Patchliste und
// Verkabelung eingeht — genau das, wogegen `portsUnknown` und Pruefung 18
// geschrieben sind. Daraus folgen drei Regeln, und die dritte ist die, die
// wehtut:
//
//   1. AUFLOESEN STATT RATEN. Ein Seed-Geraet bekommt nur dann echte Ports,
//      wenn sein Name GENAU EIN Katalog-Template trifft. Mehrdeutig oder kein
//      Treffer heisst „unbekannt", nicht „nimm das naechstbeste".
//
//   2. PORTS NUR AUF UNAUFGELOESTEN GERAETEN. Sagt der Seed „Kabel V-012 geht
//      von CAM 2 zum ATEM", dann ist EIN Anschlusspunkt je Seite von dieser
//      Aussage GEDECKT — sie waere sonst sinnlos. Erfunden waere die Gesamtzahl
//      der Ports, ihre Nummerierung oder ihr Steckertyp; die kommen deshalb aus
//      dem Kabel selbst, und das Geraet behaelt `portsUnknown` samt
//      `specSource`, damit Pruefung 18 die Datenblatt-Ergaenzung weiter
//      einfordert und dabei die richtige Quelle nennt (cable#700).
//
//   3. AUF AUFGELOESTEN GERAETEN NICHT. Ein ATEM Constellation 8K hat genau 40
//      Eingaenge. Ist keiner mehr frei, waere ein 41. keine Ergaenzung, sondern
//      eine Falschaussage ueber echte Hardware. Das Kabel wird dann NICHT
//      angelegt, sondern als ausgelassen gemeldet — sichtbar, nicht still.
// ───────────────────────────────────────────────────────────────────────────
import { imSignalplan, type SeedCable, type SeedGeraet, type SuiteSeed } from '@avplan/ui/embed'
import type { ConnectorType, EquipmentItem, EquipmentTemplate, KameraOptik, Port } from '../types/equipment'
import type { Cable, CableType } from '../types/cable'
import type { SignalStandard } from '../types/cableSpec'
import { listDeviceTypes, resolveDeviceType } from './deviceTypeRegistry'
import { fachAus, fachVon, GEWERK, type SignalFach } from './fachdaten'

/**
 * #910 — die Kamera-Gruppe des Seeds als Optik am Geraet, oder `undefined`.
 * Nur, was der Kameraplan nennt: eine fehlende Brennweite ist keine von 0.
 */
export function optikAusSeed(k: SeedGeraet['kamera']): KameraOptik | undefined {
  if (!k) return undefined
  const o: KameraOptik = {}
  if (typeof k.lens === 'string' && k.lens.trim()) o.objektivModell = k.lens.trim()
  if (typeof k.focalMm === 'number' && Number.isFinite(k.focalMm) && k.focalMm > 0) o.brennweiteMm = k.focalMm
  if (typeof k.hfovDeg === 'number' && Number.isFinite(k.hfovDeg) && k.hfovDeg > 0) o.bildwinkelGrad = k.hfovDeg
  return Object.keys(o).length > 0 ? o : undefined
}

/** Belegtext fuer alles, was aus dem Seed statt aus einem Datenblatt stammt. */
export const SEED_BELEG = 'dem Suite-Projekt der Shell — nicht aus einem Datenblatt'

/** Der Seed fuehrt normalisierte Lagen (0..1); der Canvas rechnet in Pixeln. */
const CANVAS_W = 1800
const CANVAS_H = 1000

/**
 * Kabeltyp der Shell -> Stecker + Signal-Standard. Bewusst eine Tabelle und
 * keine Heuristik: was hier nicht steht, wird nicht geraten, sondern gemeldet.
 * Ein falsch geratener Stecker steht sonst in der Bestell-Liste.
 */
const KABEL_TABELLE: Record<string, { connector: ConnectorType; standard?: SignalStandard }> = {
  '12g-sdi': { connector: 'BNC', standard: 'SDI-12G' },
  '6g-sdi': { connector: 'BNC', standard: 'SDI-6G' },
  '3g-sdi': { connector: 'BNC', standard: 'SDI-3G' },
  'hd-sdi': { connector: 'BNC', standard: 'SDI-HD' },
  sdi: { connector: 'BNC', standard: 'SDI-HD' },
  hdmi: { connector: 'HDMI', standard: 'HDMI-2.0' },
  cat5e: { connector: 'Ethernet/RJ45', standard: 'Eth-1G' },
  cat6: { connector: 'Ethernet/RJ45', standard: 'Eth-1G' },
  cat6a: { connector: 'Ethernet/RJ45', standard: 'Eth-10G' },
  cat7: { connector: 'Ethernet/RJ45', standard: 'Eth-10G' },
  ethernet: { connector: 'Ethernet/RJ45', standard: 'Eth-1G' },
  dmx512: { connector: 'XLR' },
  dmx: { connector: 'XLR' },
  xlr: { connector: 'XLR', standard: 'Analog-Audio' },
  aes3: { connector: 'XLR', standard: 'AES3' },
  fiber: { connector: 'Fiber' },
  lwl: { connector: 'Fiber' },
}

const normalisiere = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[×✕]/g, 'x')
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Kandidaten-Bezeichnungen eines Seed-Geraets, gegen die der Katalog geprueft
 * wird. Das Shell-Label traegt oft eine Instanz davor („CAM 1 — Sony FX9"),
 * deshalb zaehlt auch der Teil hinter dem Gedankenstrich als Kandidat.
 */
export function kandidaten(device: Pick<SeedGeraet, 'name' | 'model'>): string[] {
  const roh = [device.model, device.name].filter((s): s is string => !!s && s.trim().length > 0)
  const aus: string[] = []
  for (const r of roh) {
    const n = normalisiere(r)
    if (n) aus.push(n)
    const teile = n.split(' - ')
    if (teile.length > 1) {
      const hinten = teile[teile.length - 1].trim()
      if (hinten) aus.push(hinten)
    }
  }
  return [...new Set(aus)]
}

/**
 * Genau-ein-Treffer oder null. Getroffen wird, wenn ein Template-Name dem
 * Kandidaten entspricht oder auf `" " + Kandidat` endet — Katalognamen tragen
 * den Hersteller vorn („Blackmagic ATEM Constellation 8K"), das Shell-Label
 * meist nicht. Treffen mehrere, ist das Ergebnis ausdruecklich null: bei
 * Mehrdeutigkeit raten waere schlimmer als nicht aufloesen.
 */
export function katalogTemplate(
  device: Pick<SeedGeraet, 'name' | 'model' | 'typId'>,
): EquipmentTemplate | null {
  // ZUERST DIE ID, DANN DER NAME (ADR-012). Traegt das Geraet eine
  // Katalog-Identitaet, ist die Zuordnung eine Tatsache; alles darunter ist
  // ein Namensvergleich, den ADR-002 nur deshalb duldet, weil es fuer
  // handgelegte Geraete nichts Besseres gibt. Wer beides hat und den Namen
  // nimmt, wirft die Tatsache weg.
  const ueberId = resolveDeviceType(device.typId)
  if (ueberId) return ueberId.template

  const typen = listDeviceTypes()
  for (const kandidat of kandidaten(device)) {
    const treffer = typen.filter((typ) => {
      const name = normalisiere(typ.name)
      return name === kandidat || name.endsWith(` ${kandidat}`)
    })
    // Seit der Katalog der ganzen Suite in dieser Liste steht, kann derselbe
    // Name zweimal auftauchen: einmal als hiesiges Datenblatt-Template und
    // einmal als Typ, den nur ein anderer Planer fuehrt. Das ist KEINE
    // Mehrdeutigkeit — es ist dasselbe Modell, und eines der beiden kennt
    // seine Anschluesse. Ohne diese Zeile fiele der Treffer unter die
    // Rate-Sperre darunter, und ein Geraet verloere beim naechsten Seed
    // seine Ports. Still.
    const mitDatenblatt = treffer.filter((t) => !t.ohneDatenblatt)
    const eindeutig = mitDatenblatt.length === 1 ? mitDatenblatt : treffer
    if (eindeutig.length === 1) {
      const info = resolveDeviceType(eindeutig[0].id)
      if (info) return info.template
    }
  }
  return null
}

const klonPort = (p: Port, praefix: string, i: number): Port => ({
  ...p,
  id: `${praefix}-${i}-${p.id}`,
})

/**
 * Ein Geraet IM AUFBAU, waehrend der Seed gelesen wird.
 *
 * Hiess bis 2026-09-19 `SeedGeraet` — derselbe Name, den seit ADR-011 der
 * Geraete-Typ des Protokolls traegt. Zwei verschiedene Dinge unter einem
 * Namen in derselben Datei: genau die Sorte Verwechslung, die dieser Umbau
 * gerade abschafft.
 */
interface ImAufbau {
  item: EquipmentItem
  /** true = kein eindeutiger Katalog-Treffer, Ports duerfen ergaenzt werden. */
  offen: boolean
}

export interface SeedUebernahme {
  equipment: EquipmentItem[]
  cables: Cable[]
  /** Was nicht angelegt werden konnte — gehoert sichtbar gemacht, nicht verschluckt. */
  ausgelassen: { id: string; label: string; grund: string }[]
}

/**
 * Seed -> Equipment + Kabel. Reine Funktion ohne Store-Zugriff, damit sie
 * headless getestet werden kann.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `vorhandene` IST KEIN ZUSATZ, SONDERN DIE HALBE FUNKTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Gemessen 2026-09-09 am gebauten Stand: `connectShellSeed` wendet JEDE
 * hoehere Revision an, und die Shell zaehlt sie bei Projektwechsel, Undo/Redo
 * und Kopf-Aenderung hoch. Diese Funktion baute jedes Geraet daraufhin NEU AUS
 * DEM KATALOG-TEMPLATE — mit frisch geklonten Ports, Katalog-Massen und ohne
 * jede Angabe, die jemand am Geraet gemacht hat: Leistungsaufnahme,
 * Rack-Platz, Notizen, Port-Beschriftungen, Steckertypen.
 *
 * Der Seed sagt von alldem nichts. Er nennt Id, Name, Untertitel und Lage.
 * Ein Projektwechsel in der Shell warf also die halbe Geraete-Pflege weg, und
 * zwar still.
 *
 * ZWEITER GRUND, UND ER WIEGT SCHWERER: `katalogTemplate` loest ueber den
 * NAMEN auf. Wer ein Geraet in der Shell umbenennt, trifft danach vielleicht
 * ein anderes Template — und ein bereits eingerichtetes Geraet wuerde durch
 * einen Katalog-Standardstand ERSETZT, samt anderer Ports. Ein bekanntes
 * Geraet wird deshalb nicht neu aufgeloest: es ist, was es ist.
 */
export function seedToCable(seed: SuiteSeed, vorhandene: EquipmentItem[] = []): SeedUebernahme {
  const ausgelassen: SeedUebernahme['ausgelassen'] = []
  const geraete = new Map<string, ImAufbau>()
  const schonDa = new Map(vorhandene.map((e) => [e.id, e]))

  // ── Gelesen wird die EINE Liste (ADR-011, Stufe 3) ──────────────────────
  //
  // `alsSignalGeraete` ist dieselbe Sicht, die die Shell bisher mitschickte —
  // gerechnet statt uebertragen. Sie traegt ALLE Geraete, Kameras und
  // Leuchten eingeschlossen: die haengen an Kabeln und gehoeren in diesen
  // Plan. Wer sie hier vermisste, legte sie ein zweites Mal an.
  imSignalplan(seed.geraete).forEach((d, i) => {
    const basis = {
      id: d.id,
      name: d.name,
      ...(d.sub ? { subtitle: d.sub } : {}),
      x: Math.round((d.nx ?? (i % 4) * 0.25) * CANVAS_W),
      y: Math.round((d.ny ?? Math.floor(i / 4) * 0.25) * CANVAS_H),
      // #910 — Objektiv, Brennweite, Bildwinkel aus dem Kameraplan. Immer
      // gesetzt (auch `undefined`), damit ein entferntes Objektiv am
      // vorhandenen Geraet nicht stehen bleibt.
      optik: optikAusSeed(d.kamera),
    }

    // Bekanntes Geraet: der Seed setzt, was er NENNT — Name, Untertitel, Lage.
    // Alles andere bleibt, wie der Nutzer es eingerichtet hat. `offen` haengt
    // an den Ports und nicht am Katalog: ein Geraet ohne aufgeloeste Ports
    // darf weiter welche aus einer Kabel-Aussage bekommen (Regel 2).
    const alt = schonDa.get(d.id)
    if (alt) {
      geraete.set(d.id, {
        offen: alt.portsUnknown === true,
        item: { ...alt, ...basis },
      })
      return
    }

    // DAS EIGENE FACH (ADR-013). Es traegt, was dieser Planer beim letzten
    // Mal an diesem Geraet stehen hatte: Anschluesse, Rack-Einbau,
    // Panel-Bilder, Fremdschluessel. Es steht VOR dem Katalog, und das ist
    // der Punkt — ein Port, den jemand umbenannt oder zusaetzlich angelegt
    // hat, ist eine Aussage ueber DIESES Geraet, das Datenblatt eine ueber
    // seinen TYP. Die Aussage ueber das einzelne Geraet ist die neuere.
    const fach = fachVon(d)
    if (fach?.inputs && fach.outputs) {
      geraete.set(d.id, {
        offen: fach.portsUnknown === true,
        item: {
          ...(fach as SignalFach),
          ...basis,
          // Die Kategorie fuehrt das PROTOKOLL und nicht das Fach — sie steht
          // deshalb nicht darin und kommt von hier. Ohne Angabe „Other": das
          // ist die Auskunft „nicht zugeordnet" und keine Behauptung.
          category: d.kategorie ?? 'Other',
        },
      })
      return
    }

    const tmpl = katalogTemplate(d)
    if (tmpl) {
      geraete.set(d.id, {
        offen: false,
        item: {
          ...tmpl,
          ...basis,
          // Der Katalogname ist die belegte Angabe; das Shell-Label bleibt als
          // Untertitel stehen, damit der Nutzer sein Geraet wiedererkennt.
          name: d.name,
          inputs: tmpl.inputs.map((p, k) => klonPort(p, d.id, k)),
          outputs: tmpl.outputs.map((p, k) => klonPort(p, d.id, k)),
          width: tmpl.width ?? 240,
          height: tmpl.height ?? 200,
        },
      })
    } else {
      geraete.set(d.id, {
        offen: true,
        item: {
          ...basis,
          // #822/#835 — der kanonische Wert ist englisch. `Sonstiges` stand
          // hier noch, weil diese Datei nur in der Suite liegt und die
          // Umbenennung upstream vorbeilief. Der Waechter fuer ausgelieferte
          // Kategorien hat sie beim Vendorieren gefunden.
          category: 'Other',
          inputs: [],
          outputs: [],
          width: 240,
          height: 200,
          portsUnknown: true,
        },
      })
    }
  })

  const belegt = new Set<string>()
  const cables: Cable[] = []

  /**
   * Anschlusspunkt fuer ein Kabelende suchen. Auf aufgeloesten Geraeten nur
   * unter den echten Ports (Regel 3); auf unaufgeloesten wird einer aus der
   * Kabel-Aussage selbst angelegt (Regel 2).
   */
  const anschluss = (
    deviceId: string,
    richtung: 'inputs' | 'outputs',
    kabel: SeedCable,
    connector: ConnectorType,
    standard?: SignalStandard,
  ): string | null => {
    const g = geraete.get(deviceId)
    if (!g) return null
    const frei = g.item[richtung].find((p) => p.connectorType === connector && !belegt.has(`${deviceId}:${p.id}`))
    if (frei) {
      belegt.add(`${deviceId}:${frei.id}`)
      return frei.id
    }
    if (!g.offen) return null
    const port: Port = {
      id: `seed-${richtung === 'inputs' ? 'in' : 'out'}-${kabel.id}`,
      name: kabel.label,
      type: connector,
      connectorType: connector,
      ...(standard ? { standard } : {}),
    }
    g.item = { ...g.item, [richtung]: [...g.item[richtung], port] }
    belegt.add(`${deviceId}:${port.id}`)
    return port.id
  }

  for (const c of seed.cables) {
    const eintrag = KABEL_TABELLE[normalisiere(c.type)]
    if (!eintrag) {
      ausgelassen.push({ id: c.id, label: c.label, grund: `Kabeltyp „${c.type}" ist hier nicht bekannt` })
      continue
    }
    if (!geraete.has(c.from) || !geraete.has(c.to)) {
      ausgelassen.push({ id: c.id, label: c.label, grund: 'Endgerät fehlt im Projekt' })
      continue
    }
    const von = anschluss(c.from, 'outputs', c, eintrag.connector, eintrag.standard)
    const nach = von ? anschluss(c.to, 'inputs', c, eintrag.connector, eintrag.standard) : null
    if (!von || !nach) {
      ausgelassen.push({
        id: c.id,
        label: c.label,
        grund: `kein freier ${eintrag.connector}-Anschluss laut Datenblatt`,
      })
      continue
    }
    cables.push({
      id: c.id,
      name: c.label,
      type: eintrag.connector as CableType,
      length: c.lengthM ?? 0,
      color: '#94a3b8',
      fromEquipmentId: c.from,
      fromPortId: von,
      toEquipmentId: c.to,
      toPortId: nach,
      notes: '',
      ...(eintrag.standard ? { standard: eintrag.standard } : {}),
    })
  }

  // Der Beleg wird erst jetzt gesetzt: vorher steht nicht fest, wie viele
  // Ports aus dem Seed entstanden sind, und `value` soll die Zahl nennen, die
  // wirklich im Plan steht.
  const equipment = [...geraete.values()].map(({ item, offen }) => {
    if (!offen || (item.inputs.length === 0 && item.outputs.length === 0)) return item
    const beleg = { value: `${item.inputs.length} In / ${item.outputs.length} Out`, source: SEED_BELEG }
    return { ...item, specSource: { ...(item.specSource ?? {}), inputs: beleg, outputs: beleg } }
  })

  return { equipment, cables, ausgelassen }
}

/**
 * Die Kategorie aus dem KATALOG, nicht aus dem Namen.
 *
 * Sie ordnet das Geraet in der Suite den Plaenen zu (ADR-011): eine Kamera
 * steht im Kameraplan UND im Signalplan, ein Mischer nur im Signalplan.
 * Welche Kategorie in welchen Plan gehoert, entscheidet die Tabelle in
 * `@avplan/ui/embed` — dieser Planer sagt nur, was sein Katalog sagt, und
 * nicht, wohin es gehört. Zwei Stellen mit dieser Zuordnung wären eine zu
 * viel.
 *
 * ZWEI QUELLEN, in dieser Reihenfolge, und die zweite ist kein Notbehelf:
 *
 *   1. Das Datenblatt-Template hinter der `deviceTypeId`. Die belegte
 *      Angabe — sie gewinnt.
 *   2. Sonst die Kategorie, die der NUTZER am Geraet gesetzt hat
 *      (`categorySchemas.ts`: Kameras, Licht, Audio, …). Ein von Hand
 *      angelegtes Geraet hat keine `deviceTypeId`, und genau davon spricht
 *      der Auftrag: „Geräte im Cable planner haben eine Kategorie. Diese
 *      heißt dann zum Beispiel Kamera. […] durch die Kategorie lässt es
 *      sich zuordnen."
 *
 * Das widerspricht ADR-002 nicht, sondern liest es genau: verboten ist das
 * RATEN. Aus „Kamera 1" auf eine Kamera zu schliessen wäre geraten; dass
 * jemand „Licht" angekreuzt hat, ist gesagt. Was die Kategorie NICHT tut,
 * ist ein Datenblatt ersetzen — Ports und Leistungsaufnahme kommen weiter
 * nur aus dem Katalog.
 *
 * `undefined` heisst „keine Aussage" und ausdruecklich nicht „gehoert
 * nirgends hin": ein Geraet ohne beides faellt auf die Vorgabe `['signal']`
 * und steht damit im Plan, der seine Anschluesse fuehrt.
 */
const kategorieAus = (e: EquipmentItem): string | undefined =>
  resolveDeviceType(e.deviceTypeId)?.template.category ?? (e.category?.trim() || undefined)

/** Rueckweg: das native Modell als Seed-Domaene „signal". */
export function cableToSeedPatch(project: {
  equipment?: EquipmentItem[]
  cables?: Cable[]
}): { geraete: SeedGeraet[]; cables: SeedCable[] } {
  const equipment = project.equipment ?? []
  return {
    // Gemeldet wird auf der EINEN Liste (Stufe 3). Die Fachgruppen `kamera`
    // und `licht` fasst dieser Planer NICHT an — sie gehoeren dem Kamera-
    // bzw. Lichtplan, und die Shell laesst sie deshalb stehen, auch wenn
    // dieser Planer ein Geraet meldet, das drueben eine Brennweite hat.
    geraete: equipment.map((e) => {
      // Das MODELL, nicht der Instanzname. `e.name` ist „Kamera 1"; was fuer
      // ein Geraet dahintersteht, sagt allein das Template hinter der
      // `deviceTypeId` (ADR-002). Der Kameraplan loest sein Katalog-Modell
      // daraus auf — mit dem Instanznamen koennte er es nicht.
      const modell = resolveDeviceType(e.deviceTypeId)?.template.name
      const kategorie = kategorieAus(e)
      return {
        id: e.id,
        name: e.name,
        ...(e.subtitle ? { sub: e.subtitle } : {}),
        ...(modell ? { model: modell } : {}),
        // Die Katalog-Identitaet faehrt MIT (ADR-012). Fuer diesen Planer ist
        // sie `deviceTypeId` — dieselbe Id, unter der der gemeinsame Katalog
        // den Typ fuehrt. Damit muss der Kameraplan drueben nicht mehr
        // „Sony FX9" gegen „Sony PXW-FX9" halten.
        ...(e.deviceTypeId ? { typId: e.deviceTypeId } : {}),
        ...(kategorie ? { kategorie } : {}),
        // DAS FACH DIESES PLANERS (ADR-013): Anschluesse, Rack-Einbau,
        // Panel-Bilder, Fremdschluessel aus Rentman/NetBox/GraphML. Niemand
        // sonst liest es; es wird getragen, damit ein umbenannter Port einen
        // Umweg ueber zwei andere Planer und die Datei ueberlebt.
        fachdaten: { [GEWERK]: fachAus(e) },
        nx: Math.min(1, Math.max(0, e.x / CANVAS_W)),
        ny: Math.min(1, Math.max(0, e.y / CANVAS_H)),
      }
    }),
    cables: (project.cables ?? []).map((c) => ({
      id: c.id,
      label: c.name,
      // Zurueck geht der Standard, wenn er bekannt ist — er ist die
      // aussagekraeftigere Angabe („SDI-12G" statt „BNC"). Sonst der Stecker.
      type: c.standard ?? c.type,
      lengthM: c.length,
      from: c.fromEquipmentId,
      to: c.toEquipmentId,
    })),
  }
}

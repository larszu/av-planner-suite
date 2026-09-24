# Die Schnittstellen der Suite — wo Daten die Werkzeuggrenze überqueren

**Stand: 2026-09-18. Gemessen am Quelltext der zehn Repos, nicht aus dem
Gedächtnis.** Jede Zeile nennt die Datei, in der sie steht; wo eine
Schnittstelle nur in der vendorierten Kopie lebt und nicht im eigenständigen
Repo, steht das dabei.

Diese Seite entstand aus einer Frage des Eigentümers — „wo sind alle
Schnittstellen?" —, und sie beantwortet sie einmal an einer Stelle, statt
dass die Antwort in einem Chat wegscrollt.

## Die drei Arten, wie hier Daten wandern

1. **Dateien**, die ein Mensch von Hand trägt. Eine Datei ist die Berührung;
   es gibt keinen Dienst dazwischen. Das ist Absicht (offline-first) und
   zugleich die Stelle, an der ein Stand veraltet.
2. **Der laufende Austausch in der Suite** über `postMessage` zwischen Schale
   und eingebettetem Planer — nur dort, wo die Schale läuft.
3. **Erklärte Verknüpfungen**: ein Mensch sagt, dass dieses Ding und jenes
   dasselbe meinen. Nie geraten — geraten sieht genauso aus wie gewusst.

## 1 · Dateiformate

Jedes trägt einen Marker, damit eine fremde Datei auffällt statt halb gelesen
zu werden.

| Marker | Was es trägt | Wo definiert |
| --- | --- | --- |
| `avplan` | das Show-Projekt (Kabel, Geräte, Locations) | `cable-planner/src/renderer/lib/avplan.ts`, `light-planner/src/core/avplan.ts`, `multicam-planner/src/utils/avplan.ts` |
| `avplan-inventory` v8 | der Bestand — **byte-gleich in mehreren Repos**; v8 = `transport` + `stellplatz`, abgeglichen 2026-09-24 in allen Kopien | `inventory-planner/src/domain/lib/inventoryPortable.ts` |
| `avplan-rack-belegung` v1 | was der Signal-Plan in ein Rack gebaut hat (HE von unten) — das Lager prüft es gegen das Rack-Case | `cable-planner/src/renderer/lib/rackBelegungFormat.ts` → `inventory-planner/src/lib/rackBelegungFormat.ts` (zeichengleich) |
| `avplan-facility` v1 | die Gebäude-Auskunft | `larszu-facility-planner/src/domain/gebaeudeDatei.ts` |
| `avplan-intercom` | die Intercom-Matrix | `Broadcast-intercom` |
| `camera-list` | Kameras vom MultiCam- in den Cable-Planner | `multicam-planner/src/utils/cameraExport.ts` → `cable-planner/src/renderer/lib/multicamCameraImport.ts` |
| `av-source-map` | die Quellen-Zuordnung | `cable-planner/src/renderer/lib/sourceMap.ts` |
| `suite-rundown` | der Ablauf | `av-planner-suite/packages/ui/src/rundown.ts` |

**Die Richtung ist bei fast allen eine Einbahnstrasse.** Eine Änderung, die
jemand nach dem Export im Ziel macht, kommt nicht zurück — das ist dieselbe
Bruchstelle, die die Recherche für die Kette Vectorworks → Lightwright → Pult
beschreibt (`research/workflow-chain.md`, Zeile 172).

## 2 · Der laufende Austausch: `suite-seed`

`packages/ui/src/seed.ts`, Formatversion **3**. Die Schale schickt ein
neutrales Projektmodell an jeden eingebetteten Planer; der Planer schickt
`SeedPatch` zurück.

- **Fünf Domänen:** `cameras`, `fixtures`, `signal`, `lager`, `gebaeude`.
- **Eine Geräteliste:** `geraete` — seit ADR-011 (2026-09-19) steht jedes
  Gerät genau **einmal** darin, mit seiner Kategorie und den Feldern aller
  Planer. `cameras`, `fixtures` und `devices` sind seither **Sichten** darauf
  (`alsKameras`, `alsLeuchten`, `alsSignalGeraete`) und keine eigenen
  Wahrheiten mehr. Die Kategorie ordnet ein Gerät **mehreren** Plänen zugleich
  zu: eine Kamera steht im Kameraplan *und* im Signalplan.
- **Inhalt:** `venue`, `geraete`, `cameras`, `fixtures`, `devices`, `cables`,
  `bedarf`, `deckung`, `anschluesse`.
- **`bedarf` ist abgeleitet und wird nie geführt** — `suiteToSeed` rechnet ihn
  bei jedem Senden neu (ADR-001: eine gespeicherte Ableitung ist eine zweite
  Wahrheit; ADR-006: der Plan rechnet seinen Bedarf selbst).
- **`deckung` ist die Antwort des Lagers**, weitergereicht an alle anderen
  Planer, damit der Signal-Plan „3 von 4 vorhanden" zeigen kann, ohne das
  Lager-Modell zu kennen.
- **`anschluesse` sind die Auskunft des Gebäudes** — geführt, nicht
  abgeleitet. Leer heisst „keine gemeldet" und nicht „das Haus hat keine
  Dosen".
- **Gegen die Echo-Schleife:** `revision` und `origin`. Ein Planer übernimmt
  einen Seed nur, wenn dessen Revision neuer ist als die zuletzt übernommene.
- **Eigentum am Rückweg:** `mergeSeedPatch` in `packages/ui/src/seedOwnership.ts`
  entscheidet, welche Domäne welches Feld überhaupt ändern darf — `lager` nur
  `deckung`, `gebaeude` nur `anschluesse`.

**Gemessen und wichtig: `connectShellSeed` steht ausschliesslich in
`av-planner-suite/apps/*`, in keinem eigenständigen Repo.** Die
Vendoring-Richtung der Suite ist „Planer → Suite"; diese Brücke ist den
umgekehrten Weg gegangen. Wer den Planer einzeln startet, hat den laufenden
Austausch nicht — und wer die Suite neu vendoriert, muss aufpassen, dass er
ihn nicht überschreibt.

## 3 · Erklärte Verknüpfungen

| Verknüpfung | Was sie sagt | Wo |
| --- | --- | --- |
| `deviceTypeId` | dieses Plan-Gerät ist dieser Bestands-Artikel (ADR-002 — **nie über den Instanznamen**) | `decisions/ADR-002-…` |
| `Zuordnung` | dieses Plan-Kabel benutzt diese Hausstrecke, **von einem Menschen erklärt** | `larszu-facility-planner/src/domain/modell.ts` |
| `BedarfsZeile[]` / `seedAusBedarf` | der einzige Schreibweg vom Plan ins Lager (ADR-006) | `inventory-planner/src/domain/types/bedarf.ts` |
| `mangelMelden` | der einzige Rückweg vom Plan ins Gebäude | `larszu-facility-planner/src/domain/vertrag.ts` |

## 4 · Fremdsysteme

Nur der `cable-planner` spricht mit fremden Systemen, und ausschliesslich über
IPC im Hauptprozess (`src/main/ipc/<domain>Ipc.ts`): Rentman, NetBox, GraphML,
ATEM, Videohub, Show-Control, Stream-Keys, Signaling, Collab-Discovery,
Dokument-Log, Beleg. Tokens liegen im OS-Credential-Store (`keytar`) und
niemals in der Projektdatei.

## Der Gebäude-Vertrag im Einzelnen

`larszu-facility-planner/src/domain/vertrag.ts` — sechs Fragen und **ein**
Rückweg, maschinell gegen die ADR-006-Tabelle geprüft:

`einspeisung` · `ort` · `kreisGeschwister` · `verfuegbarkeit` ·
`steuerklinken` · `hausStrecke` — Rückweg `mangelMelden`.

Die Regel, die alle sechs teilen: **„nicht angegeben" ist nicht „nein".**
`{ bekannt: false, grund }` statt einer leeren Liste, `undefined` statt
`false`, `watt: null` statt einer gerechneten Zahl.

## Was es NICHT gibt — gemessen, nicht vermutet

Diese Liste ist so wichtig wie die oberen vier Abschnitte: sie verhindert,
dass jemand eine Auskunft erwartet, die niemand gibt.

- **Keine Etagen-Darstellung.** `Raum.etage` ist ein Freitext-Feld im Modell
  und im Vertrag — und wird in **keiner** Sicht des Gebäude-Werkzeugs
  gelesen. Es gibt keine Etagen-Auswahl, keinen Stapel, keinen Filter. Der
  Grundriss hängt am **Raum** (`Raum.grundriss`), nicht an der Etage.
- **Keinen geometrischen Kabelweg.** `Trasse` und `HausStrecke` gehen von
  **Raum zu Raum**. Die Auskunft ist „von A nach B, belegt/frei/teilbelegt,
  freier Querschnitt in mm²" — nicht „3,2 m über Boden in der Nordwand".
  Kein Linienzug, keine Höhe, keine Durchführung zwischen Etagen.
- **Kein Grundriss-Bild als Hintergrund im Lager.** Der Gebäude-Planer trägt
  eine Adresse und einen Massstab (`meterProBild`), kein Bild; der
  Inventory-Planner zeichnet seine Halle, statt einen Scan zu unterlegen. Der
  Cable-Planner nennt dieselbe Lücke in
  `cable-planner/docs/festinstallation-readiness.md`.
- **Keinen Weg vom Show-Plan in den Gebäude-Vertrag.** Der Planer fragt die
  sechs Fragen noch nicht ab; das steht so im README des Gebäude-Werkzeugs.
- **Keine Geometrie im `suite-seed`.** Er trägt Geräte, Kabel, Bedarf,
  Deckung und Anschlusspunkte — keine Grundrisse, keine Lagen in Metern.

Für alles hier Genannte gibt es **keinen Issue und keinen ADR-Eintrag**: der
Gebäude-Planer hat zwei Issues, eines davon geschlossen. „Bisher geplant" ist
also: nicht.

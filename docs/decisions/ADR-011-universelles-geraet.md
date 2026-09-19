# ADR-011: Ein universelles Gerät — nicht eines je Planer

Status: entschieden · Datum: 2026-09-19 · Betrifft: `suite-seed`, alle eingebetteten Planer ·
Verschärft [ADR-001](ADR-001-identity-spine.md) auf die Suite-Ebene

## Die Entscheidung des Eigentümers

> „Geräte im Cable planner haben eine Kategorie. Diese heißt dann zum Beispiel Kamera.
> Alle Geräte sind in allen Planern verfügbar. Also alle Kameras aus Multicam planner sind auch
> in Cable planner. Es gibt nur ein universelles device pro Gerät und nicht pro planner. Dieses
> device hat alle Felder und Inhalte von Cable planner, multicam planner, light planner und
> allen anderen Planern. So sollte es auch im Plan gestanden haben. Damit ist jedes Gerät
> identifizierbar durch eine id und durch die Kategorie lässt es sich zuordnen."

## Der Eigentümer hat recht, und das Papier gab ihm schon recht

ADR-001 steht seit dem 2026-08-29 im Baum, erster Absatz, wörtlich:

> **Eine Identität, viele Projektionen.** Jedes reale Ding bekommt genau einen Datensatz; jedes
> Label, Blatt, Export und jede Geräte-Konfiguration ist eine *Darstellung* davon, nie eine
> zweite Wahrheit.

Der `suite-seed` hielt sich daran **innerhalb** eines Planers und brach es **dazwischen**:
`cameras`, `fixtures` und `devices` waren drei Listen mit drei Eigentümern. Die Kamera `cam2`
und ihr Knoten `n_cam2` waren zwei Datensätze für dasselbe Blech — verbunden nur durch
`SignalNode.represents`, und das wurde im ganzen Baum ausschließlich in den Demo-Daten gesetzt.

Das ist keine neue Anforderung. Es ist ADR-001, eine Ebene höher gemessen, und dort war es
verletzt.

## Wie die Verletzung entstanden ist

Nicht aus Nachlässigkeit, sondern aus einer richtigen Regel an der falschen Stelle:
**`mergeSeedPatch` teilt das Eigentum je Liste zu.** Der Cable-Planer schreibt `devices` und
`cables`, der MultiCam-Planer `cameras`, der Licht-Planer `fixtures`. Das verhindert, dass zwei
Planer sich gegenseitig überschreiben — eine Zusicherung, auf die hier nicht verzichtet wird.

Die Regel brauchte nur Listen, um zu greifen. Und wer Listen braucht, baut Listen.

## Die Entscheidung

**Eine Liste `geraete` im Seed.** Jedes Gerät steht genau einmal, mit `id`, `kategorie`, den
gemeinsamen Feldern und je einer benannten Gruppe für die Felder eines Gewerks (`kamera`,
`licht`). Die Kategorie ordnet es den Plänen zu — **mehreren zugleich**: eine Kamera steht im
Kameraplan *und* im Signalplan, ein Mischer nur im Signalplan. Ein „entweder/oder" wäre genau
die Trennung, die hier aufgehoben wird.

**Das Eigentum wandert von „je Liste" auf „je Feldgruppe".** Dass alle Planer dasselbe Gerät
*sehen*, heißt nicht, dass alle alles daran *schreiben* dürfen. Die Brennweite gehört dem
Kameraplan, die DMX-Adresse dem Lichtplan, die Ports dem Signalplan. Dieselbe Zusicherung, eine
Ebene feiner — und deshalb sind die Felder in Gruppen gefasst: „der Kameraplan darf `kamera`
schreiben" ist eine Regel, die man prüfen kann; „der Kameraplan darf `lens`, `focalMm` und
`hfovDeg` schreiben" ist eine Liste, die beim nächsten Feld veraltet, ohne dass es jemand merkt.

**Die Kategorie wird deklariert, nie geraten — und der Nutzer darf sie erklären.** Zwei Quellen,
in dieser Reihenfolge: das **Datenblatt-Template** hinter der `deviceTypeId` (die belegte Angabe,
sie gewinnt), sonst die **Kategorie, die der Nutzer am Gerät gesetzt hat** (`categorySchemas.ts`:
Kameras, Licht, Audio, …). Der Eigentümer hat genau das verlangt: „Geräte im Cable planner haben
eine Kategorie. Diese heißt dann zum Beispiel Kamera. […] durch die Kategorie lässt es sich
zuordnen."

Das widerspricht ADR-002 nicht, sondern liest es genau: verboten ist das **Raten**. Aus „Kamera 1"
auf eine Kamera zu schließen wäre geraten; dass jemand „Licht" angekreuzt hat, ist **gesagt**. Was
die Kategorie nicht tut, ist ein Datenblatt ersetzen — Ports und Leistungsaufnahme kommen weiter
nur aus dem Katalog.

Fehlt beides, gilt die Vorgabe `['signal']`: ein Gerät ohne Zuordnung ist trotzdem ein Gerät im
Plan. „Nicht angegeben" ist nicht „nirgends".

## Der Weg dorthin — in Stufen, jede mit lauffähigem Stand

Ein Umbau, der die drei Listen gleichzeitig in drei Planern austauscht, wäre ein Tag ohne
lauffähigen Stand.

| Stufe | Was | Stand |
| --- | --- | --- |
| 1 | `geraete` ist die Wahrheit **im Seed**; `cameras`/`fixtures`/`devices` werden daraus abgeleitet (`alsKameras`, `alsLeuchten`, `alsSignalGeraete`). Die Kategorie fährt mit. Der Signalplan sieht ab hier alle Geräte. | **gebaut, 2026-09-19** |
| 2 | Das Shell-Projekt führt `geraete` statt drei Listen. Damit verschwindet die Sonderregel auf dem Rückweg (siehe unten) und `altIds`. | **gebaut, 2026-09-19** |
| 3 | Die drei Planer lesen und melden `geraete` statt ihrer Liste. | **gebaut, 2026-09-19** |
| 4 | `cameras`, `fixtures`, `devices` und `altIds` fallen aus dem Seed. | offen |

### Was Stufe 3 gebracht hat

Alle drei Planer lesen `seed.geraete` und melden `patch.geraete`. Die Sichten werden dabei aus der
einen Liste **gerechnet** (`alsKameras`, `alsLeuchten`, `alsSignalGeraete`) statt übertragen — was
der Planer sieht, ist damit definitionsgemäß dasselbe, was die Shell führt.

Zwei Dinge, die dabei auffielen und ohne den Umbau nicht auffallen konnten:

* **Der Signalplan bekommt jetzt wirklich alle Geräte**, Kameras und Leuchten eingeschlossen. Sie
  hängen an Kabeln und gehören dorthin; wer sie dort vermisste, legte sie ein zweites Mal an.
* **Ein Feld hieß in zwei Welten verschieden**: die Shell führte `sub`, das Protokoll `subtitle`.
  Beim Zusammenlegen verschwand der Untertitel auf dem Weg zum Planer — still, weil `undefined`
  nirgends auffällt. Das Protokoll heißt jetzt auch `sub`; die Sicht `devices` übersetzt es noch
  nach `subtitle`, weil das alte Protokoll so hieß, und mit Stufe 4 fällt die Übersetzung mit der
  Sicht weg.

### Was Stufe 2 abgeräumt hat

Drei Dinge sind **weg**, nicht abgeschaltet:

* **`SignalNode.represents`.** Mit einer Liste gibt es nichts mehr zu verbinden. Das Feld überlebt
  genau an einer Stelle: in `projectFile.ts`, wo es alte Projektdateien zusammenlegt. Das Gerüst
  aus Stufe 1 ist damit zur Migration geworden — die ehrliche Art, wie Gerüst endet.
* **`altIds`.** Es trug die alte Id je Sicht durch die Übergangszeit. Die Shell führt jetzt eine
  Liste, also gibt es nur noch eine Id.
* **Die Sonderregel auf dem Rückweg**, die Kameras und Leuchten aus der Signal-Meldung heraushielt,
  damit sie nicht als Knoten zurückkamen. Sie war die Naht zwischen den zwei Modellen.

Und zwei Dinge sind **kleiner** geworden statt umgebaut:

* **Die Kamera-Übergabe aus B-79** (`kameraUebergabe.ts`, `KameraUebergabeBar.tsx`) ist gelöscht.
  Sie fragte, ob eine im Signalplan angelegte Kamera auch in den Kameraplan soll — eine Frage, die
  nur im Drei-Listen-Modell entstand. Ein Gerät mit der Kategorie „Cameras" steht jetzt in beiden
  Plänen, und der Eigentümer hat genau das verlangt: „Alle Geräte sind in allen Planern verfügbar."
* **Der Cross-Link (B-18)** löst nichts mehr auf. `knotenFuer` gibt dieselbe Id zurück und
  antwortet nur noch auf die verbliebene Frage: steht das Gerät im Ziel-Plan überhaupt?

### Was Stufe 1 an Gerüst brauchte, und warum

**`altIds`.** Das zusammengelegte Gerät hat eine Id. Die Planer stehen aber noch auf ihren
Listen und kennen dort ihre eigene: der Kameraplan `cam2`, der Signalplan `n_cam2`. Nähme die
Sicht plötzlich die andere, wäre jede Kamera in jedem bestehenden Projekt eine neue — samt
verlorener Ausrichtung, Brennweite und Hängehöhe. `altIds` trägt sie durch die Übergangszeit und
fällt mit Stufe 3.

**Die Sonderregel auf dem Rückweg.** Seit Stufe 1 trägt die Sicht `devices` auch die Kameras.
Auf dem Rückweg kämen sie als Knoten zurück — und beim nächsten Senden stünden Kamera und
Knoten wieder als zwei Datensätze da. Deshalb übernimmt `applyPatchToSuite` aus der
Signal-Meldung keine Geräte, deren Id einer Kamera oder Leuchte gehört. Das ist keine
Sonderregel, sondern die Eigentumsregel an der Stelle, an der sie ohnehin gilt: der
Signal-Planer darf `cameras` nicht schreiben. Sie fällt mit Stufe 2.

## Was NICHT entschieden ist

**Ob der Signal-Planer eine Kamera ändern darf.** Er sieht sie jetzt; ändern kann er an ihr
nichts, weil ihm die Feldgruppe `kamera` nicht gehört. Ob er wenigstens Name und Lage im
Diagramm setzen darf, entscheidet Stufe 3 — vorher wäre es eine Ausnahme ohne Regel drumherum.

**Der Zusammenfall über Werkzeuggrenzen hinweg.** Dass Lager (`avplan-inventory`) und Gebäude
(`avplan-facility`) dieselbe Id verwenden, folgt hieraus nicht. ADR-006 zieht die
Werkzeuggrenze, und die Verbindung dorthin bleibt eine erklärte Verknüpfung.

## Folgen

- Der Seed springt auf **Formatversion 3**. Ungefährlich, weil er nur suite-intern fährt:
  Sender und Empfänger liegen beide in diesem Repo.
- `SeedDevice.gewerk` aus B-79 **entfällt**. Es war die enge Fassung genau dieser Idee — „ist
  das auch eine Kamera?" —, und die Kategorie beantwortet sie allgemeiner. Beides zu führen
  wären zwei Wahrheiten über dieselbe Sache, in einem ADR gegen zweite Wahrheiten.
- Die Übergabe aus B-79 bleibt und ist jetzt **die Brücke zwischen Stufe 1 und 2**: solange das
  Shell-Projekt drei Listen führt, ist eine im Signalplan angelegte Kamera erst dann eine Kamera
  des Kameraplans, wenn jemand die Entsprechung erklärt. Mit Stufe 2 entfällt die Frage, weil es
  nichts mehr zu verbinden gibt.

## Guards

`packages/ui/test/geraet.test.ts` (7) — die Kategorie ordnet mehreren Plänen zu,
„keine Kategorie" heißt Vorgabe, zusammengelegt wird nur über die erklärte Entsprechung, die
alten Ids fahren mit, der Signalplan sieht alles, „nicht angegeben" bleibt weg, derselbe Baum
ergibt dieselbe Liste. Dazu `apps/shell/test/kategorieAussage.test.ts` für den Rundlauf und
zwei Fälle in `apps/cable-planner/tests/shellSeed.test.ts` für die Herkunft der Kategorie.

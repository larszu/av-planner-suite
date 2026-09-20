# Das Board

Die Kreativ-Fläche der Suite. Sie steht zwischen zwei Vorbildern, und beide
hat der Eigentümer benannt: **Milanote** (freie Fläche, vielseitige Elemente)
und **recceboard** (das Board ist eine Schnittfolge und läuft als Film).

Code: `apps/shell/src/shell/BoardCanvas.tsx`, `BoardPlayer.tsx`,
`apps/shell/src/data/board.ts`. Tests: `apps/shell/test/board*.test.ts`.

## Die eine Regel

**Was aus der Anordnung folgt, wird abgelesen und nicht geführt.**

Die Schnittfolge, die Szenen-Zusammengehörigkeit, die Nummer einer
Einstellung — nichts davon steht im Dokument. Es entsteht bei jedem Rendern
aus der Lage der Karten. Wer eine Karte verschiebt, schneidet damit um; wer
eine wegzieht, löst sie aus der Szene.

Der Grund ist ADR-001: eine geführte Reihenfolge neben der Anordnung wäre die
zweite Wahrheit, und sie stimmte genau bis zum ersten Zug.

## Die Fläche

| | |
|---|---|
| Zoom | 25–200 %, Knöpfe, Strg/Cmd + Mausrad auf den Zeiger, Strg +/−/0, „Alles zeigen" |
| Schieben | Leertaste oder mittlere Maustaste; die Fläche wächst mit dem Inhalt |
| Auswahl | Rahmen aufziehen (sammelt ein, was er **berührt**), Umschalt+Klick, Strg+A |
| Mehrere | ziehen, löschen, verdoppeln, Pfeiltasten — als Ganzes, um denselben Versatz |
| Raster | Fangen am gezeichneten Punktraster, Alt legt frei ab |
| Tastatur | Strg+D verdoppeln, Strg+C/V kopieren, Entf löschen, Esc abwählen, Strg+Z/Y (Projekt-Historie) |
| Einfügen | Rechtsklick auf die freie Fläche legt die Karte **genau dorthin** |
| Tauschen | eine Karte auf eine andere ziehen tauscht die Plätze — und damit die Schnittfolge |

## Die Karten

Überschrift · Notiz · Link · To-do · Farbe · Look · Spalte · Unterboard ·
**Bild · Film · Ton · Datei**

Die letzten vier entstehen, indem man eine Datei auf die Fläche zieht (oder
einfügt). Welche Art es wird, sagt der **MIME-Typ** und nicht die Endung.

Jede Karte außer Spalte und Unterboard kann eine **Farbe** tragen — als
Lasur, nicht als Fläche: eine Notiz in vollem Orange trägt keinen lesbaren
Text mehr, und auf einem solchen Board ist Farbe Ordnung („alles Gelbe ist
offen").

Eine **eingefügte http(s)-Adresse** wird eine Link-Karte mit dem Host als
Titel.

**To-dos lassen sich verteilen** — an die Crew *dieses* Projekts. Die Namen
kommen aus `show.crew` und nicht aus einem freien Feld: eine Aufgabe an „Max"
ist keine Zuteilung, solange niemand weiß, welcher Max. Wer aus der Crew
verschwindet, lässt seinen Namen an der Aufgabe stehen, statt sie still
herrenlos zu machen.

### Die Einbettungsgrenze

Eine abgelegte Datei wandert bis **8 MiB** als data-URL mit ins Projekt.
Darüber entsteht die Karte trotzdem — mit Name, Größe und Typ — und sagt auf
dem Bild:

> Inhalt nicht im Projekt · 9,0 MB — über der Grenze von 8,0 MB. Die Datei
> liegt nur auf diesem Rechner.

Beides ist Absicht. Ein 400-MB-Mitschnitt im Projekt macht es unspeicherbar,
und zwar erst beim Speichern — lange nachdem jemand ihn abgelegt hat. Eine
verschluckte Datei wäre die andere schlechte Antwort: wer sie ablegt, hat
eine Absicht, und die gehört aufs Board.

## Verbindungen

Eine Verbindung trägt eine **Pfeilspitze** und lässt sich auf eine schlichte
Linie umstellen. Das ist eine Aussage und keine Verzierung: die Linie sagt
„das gehört zusammen", der Pfeil „daraus folgt das".

Eine falsch gezogene Verbindung lässt sich anklicken und löschen — unter der
sichtbaren Kurve liegt eine breite, unsichtbare Trefferlinie, weil niemand
eine 1,6 px dünne Kurve mit der Maus trifft.

## Das Board als Film

Bild- und Look-Karten sind **Einstellungen**. Eine Notiz ist keine.

- **Schnittfolge**: zeilenweise von oben, in der Zeile von links. Eine „Zeile"
  ist ein **Band** und keine Linie — zwei Bilder, die um zwölf Pixel versetzt
  hängen, sind fürs Auge nebeneinander.
- **Szenen**: Einstellungen, die in derselben Zeile dicht beieinander liegen,
  sind eine Szene und werden mit einer gepunkteten Linie verbunden. Die Lücke
  misst zwischen den **Kanten**, nicht zwischen den Mittelpunkten.
- **Standzeit**: je Karte, sonst je Board, sonst 3 s. Eine fehlende Angabe ist
  **keine Null** — `0` hieße „wird übersprungen", und das hat niemand gesagt.
- **Abspielen**: Vollbild; Mitte hält an, die Seiten schneiden vor und zurück,
  Zeitleiste, Schleife, Leertaste und Pfeiltasten. Es entsteht **kein Video**:
  gezeigt werden Standbilder in ihrer Standzeit. Das ist, was ein Storyboard
  ist, und ehrlicher als eine Vorschau, die eine Bewegung andeutet, die
  niemand gedreht hat.
- **Bildformat** am Board (16:9, 2.39:1, 2:1, 4:3, 1:1, 9:16). Die Grenzen
  liegen **über** dem Bild und schneiden es nicht weg: was außerhalb liegt,
  ist die Information, die beim Schneiden gebraucht wird. „Ohne" ist eine
  echte Wahl — ein Moodboard hat kein Bildformat.

## Hinaus

| Weg | Was |
|---|---|
| Markdown | das ganze Board als Text, rekursiv über Unterboards; bei Datei-Karten steht der **Dateiname**, nicht die data-URL |
| PDF (Druck) | das Board als Dokument mit Notizen, To-dos und Unterboards |
| Kontaktabzug (PDF) | die Einstellungen als Raster, drei je Zeile, mit Nummer, Name, Startzeit, Standzeit und mitgedruckten Bildgrenzen |

Das Dokument ist für den, der das Board **bespricht**; der Kontaktabzug für
den, der es **dreht**.

## Was bewusst NICHT gebaut ist

Diese Tabelle ist am 2026-09-20 von sechs Zeilen auf eine geschrumpft. Die
Gründe stehen NICHT als Abschrift daneben — wer wissen will, warum es eine
Sache vorher nicht gab, findet den Grund im Kopf des Moduls, das sie jetzt
tut (`filmExport.ts`, `tonAufnahme.ts`, `kameraAufnahme.ts`,
`linkVorschau.ts`, `kommentare.ts`, `einwurf.cjs`, `mitmachen.ts`). Dort
steht er bei dem Code, der ihn widerlegt, und driftet nicht davon weg.

| Aus dem Vorbild | Warum nicht |
|---|---|
| **Ein Schnitt-Programm** (Blenden, Tonmischung, Farbkorrektur) | Ein Board ist eine Folge von Standbildern, jedes seine Standzeit lang. Genau das nimmt der Film-Export auf. Eine Blende, ein zweites Tonbett, ein Pegelsteller wären der Anfang eines Werkzeugs, das die Suite nicht sein will — und ein halber Mischer ist schlechter als keiner |
| **Zusammenarbeit über das Internet** (Konten, Fremdverwahrung) | Im eigenen Netz geht es seit 2026-09-20 (siehe unten). Über das Internet ist es eine andere Frage — sie hängt an Konten und daran, wem die Daten unterwegs gehören, und sie steht in `cable-planner#868`–`#871` vor einem Nachfragetest |

### Was dazugekommen ist, und wo

| Sache | Wo sie lebt |
|---|---|
| **Kommentare** mit Urheber | `packages/ui/src/kommentare.ts`, Identität in `identitaet.ts` — sie steht im Seed und gilt damit für alle Planer |
| **Link-Vorschau** | `packages/ui/src/linkVorschau.ts` (liest), `apps/shell/electron/linkVorschau.cjs` (holt). Im Browser sagt die Karte, dass sie den Abruf nicht hat — statt eine Vorschau zu erfinden |
| **Film als Datei** | `apps/shell/src/shell/filmExport.ts`. In Echtzeit, weil `MediaRecorder` jedes Bild mit seiner Ankunftszeit stempelt; die Endung sagt, was wirklich drin liegt |
| **Vertonung** | `apps/shell/src/shell/tonAufnahme.ts`. Eine Spur, kein Mischer. Sie läuft im Film mit und liegt mit ihm in der Datei |
| **Kamera** | `apps/shell/src/shell/kameraAufnahme.ts` + `KameraDialog.tsx`. Das Foto geht denselben Ablage-Weg wie jede Datei — und damit durch dieselbe Prüfung gegen die Einbettungs-Grenze |
| **Standzeit je Einstellung** | im Eigenschaften-Feld der Karte. Das ist das „Trimmen" eines Storyboards |
| **Zusammen an einem Board** | `packages/ui/src/mitmachen.ts` (das Zusammenführen, rein und geprüft), `apps/shell/electron/mitmachen.cjs` (das offene Fenster im eigenen Netz). Einer macht auf, die anderen kommen im Browser dazu — ohne Installation und ohne gemieteten Rechner |
| **Web-Clipper** | `tools/web-clipper/` (die Erweiterung, aus dem Ordner geladen) und `apps/shell/electron/einwurf.cjs` (der Briefkasten). Er steht NICHT von selbst offen: aufgemacht wird er in den Einstellungen, und er hört nur auf 127.0.0.1 mit einem Geheimnis, das je Programmlauf neu ist |

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

| Aus dem Vorbild | Warum nicht |
|---|---|
| **Echtzeit-Zusammenarbeit** (Milanote: Teams einladen) | braucht einen Server. Die Suite hat dafür eine eigene, offene Kette: `cable-planner#868`–`#871`, und die steht vor einem Nachfragetest. Ein halbes Echtzeit-Board wäre schlimmer als keins |
| **Kommentare** | ein Kommentar braucht einen Urheber. Diese Anwendung kennt keinen angemeldeten Benutzer; ein Kommentar ohne Namen ist eine Notiz, und die gibt es schon |
| **Web-Clipper** (Browser-Erweiterung) | eine eigene Auslieferung in zwei Browser-Läden. Der Griff, um den es geht — im Netz etwas finden, kopieren, aufs Board werfen — ist über das Einfügen einer Adresse da |
| **Link-Vorschau** (Titel und Bild von der Seite) | braucht einen Abruf. Eine erfundene Vorschau wäre eine Behauptung über eine Seite, die niemand gelesen hat. Die Karte zeigt den Host — das ist, was dasteht |
| **MP4-Export** des Films | ein Schnittprogramm. Der Kontaktabzug ist der Weg nach draußen |
| **Kamera, Trimmen, Vertonung** (recceboard) | ein Telefon-Werkzeug und ein Schnittprogramm; die Suite läuft auf dem Rechner |

# ADR-009: Die B4-Firmware läuft unter ESP-IDF

Status: entschieden · Datum: 2026-09-18 · Betrifft: `sony-camera-bridge/packages/firmware-b4`,
offengebliebener Punkt aus [ADR-008](ADR-008-b4-objektivsteuerung-ablage.md)

## Das Problem

ADR-008 hat die Ablage entschieden — die B4-Objektivsteuerung zieht in die Camera Bridge —
und dabei ausdrücklich zwei Punkte offengelassen. Der erste war die Runtime des ESP32:
**ESP-IDF oder Arduino-Core?**

Die Frage ist keine Geschmacksfrage, und ADR-008 hat auch gleich gesagt, warum.

## Das Kriterium

Das serielle Protokoll auf Pin 11/12 des Hirose-12-Pin läuft mit **invertierter Polarität** —
logisch 0 entspricht 5 V, logisch 1 entspricht 0 V. Die Invertierung gehört in die
**Hardware-Einstellung der UART**, nicht in Software.

Der Grund steht in `docs/b4/b4-lens-control.md` §6 und ist kein Stilargument: wer die Bits
nachträglich dreht, behält falsches Framing und kaputte Break-Erkennung. Der Fehler fällt dann
erst bei der CRC-Prüfung auf — also an der falschen Stelle und mit der falschen Begründung.
Bei 78400 Baud, einer nicht standardisierten Rate, ist das die Art Fehler, an der eine
Messsitzung scheitert, ohne dass jemand merkt warum.

Dazu kommen zwei Nebenbedingungen: PoE-Ethernet (der vorhandene ESP32 hat es) und eben jene
78400 Baud, die aus dem Taktteiler abgeleitet werden müssen.

## Die Entscheidung

Der Eigentümer hat am 2026-09-18 entschieden: **ESP-IDF.**

Beide Wege können die Invertierung grundsätzlich — der Arduino-Core reicht sie an dieselbe
Peripherie durch, die er ohnehin unter sich hat. Der Unterschied ist die Sicht darauf: unter
ESP-IDF ist die Signalinvertierung eine benannte Einstellung der UART, unter dem Arduino-Core
ein Parameter, dessen Wirkung man glauben muss. Bei einer Schnittstelle, deren sämtliche
Angaben aus fremder Rekonstruktion stammen, ist der Unterschied zwischen „eingestellt" und
„vermutlich eingestellt" genau der, um den es hier geht.

PoE-Ethernet fällt in dieselbe Richtung: der Ethernet-Treiber ist ESP-IDF-eigen, und der
Arduino-Core wickelt ihn nur ein.

**Der Preis ist Einarbeitung**, und er wird bewusst bezahlt. Die Phasen 1 und 2 (Iris regeln,
Protokoll mitlesen) wären unter dem Arduino-Core schneller am Laufen. Sie sind aber auch die
Phasen, in denen ein falsch verstandenes Framing am teuersten ist.

## Der zweite offene Punkt: CI

ADR-008 liess auch offen, ob `firmware-b4` in der Pipeline gebaut wird. Das ist keine
Eigentümer-Frage, und es wird hier mitentschieden:

**Zunächst nicht.** Es gibt noch keine Firmware; ein CI-Schritt, der ein leeres Paket baut,
prüft nichts und kostet bei jedem Lauf Zeit. Er kommt mit dem ersten Stück Firmware, das
gebaut werden kann — und dann als eigener Job, damit ein fehlender ESP-IDF-Container nicht die
neun bestehenden Gates der Bridge rot färbt.

Die Entscheidung fällt damit an dem Tag, an dem es etwas zu bauen gibt, und nicht vorher.

## Folgen

- `packages/firmware-b4` wird ein ESP-IDF-Projekt (`CMakeLists.txt`, `sdkconfig.defaults`),
  nicht ein Arduino-Sketch.
- Das vorhandene `packages/firmware` (bare-metal `arm-none-eabi-gcc` für den WIZnet W7500P)
  bleibt unberührt. Zwei eingebettete Toolchains in einem Repo sind der Preis, den ADR-008
  benannt und angenommen hat.
- Die Invertierung wird über die UART-Einstellung gesetzt und **nicht** in Software
  nachgebildet. Wer das später ändert, ändert damit die Begründung dieses ADR mit.
- `sony-camera-bridge#34` ist damit beantwortet.

## Was dieses ADR nicht entscheidet

Nichts über die Schaltung, die Pinbelegung oder das Protokoll. Alle elektrischen Angaben
bleiben unverifiziert und sind vor dem Anschluss nachzumessen; daran ändert die Wahl der
Runtime nichts.

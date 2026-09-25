// ───────────────────────────────────────────────────────────────────────────
// suite#258 — die Show in 3D: Raum, Buehne, Kameras, Leuchten, Signalknoten
// und die Kabel dazwischen, aus dem Seed aller Planer.
//
// Die Szene rechnet `szeneAusSeed` (@avplan/ui) ohne WebGL; hier wird nur
// gezeichnet. Diese Datei wird LAZY geladen (`dashboard.tsx`) und nur
// gemountet, wenn der Dialog offen ist: three.js gehoert nicht in den Chunk,
// den jeder Start der Shell laedt — dieselbe Grenze wie im cable-planner.
// ───────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Edges, Html, Line, OrbitControls } from '@react-three/drei'
import { Modal } from '@avplan/ui'
import type { Gewerk, Szene3D } from '@avplan/ui/embed'
import { useT, format } from '../i18n'

/** Farben je Gewerk aus den Modul-Akzenten der Suite (ADR-007). */
const GEWERK_FARBE: Record<Gewerk, string> = {
  kamera: 'var(--mod-cameras)',
  licht: 'var(--mod-licht)',
  signal: 'var(--mod-signal)',
}

/** three.js kann keine CSS-Variablen — aufgeloest zur Laufzeit am Dokument. */
function farbe(css: string): string {
  const m = /^var\((--[^)]+)\)$/.exec(css)
  if (!m || typeof document === 'undefined') return '#94a3b8'
  const v = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim()
  return v || '#94a3b8'
}

function Szene({ szene, beschriftung }: { szene: Szene3D; beschriftung: boolean }) {
  const text = farbe('var(--av-text)')
  const rahmen = farbe('var(--av-border)')
  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[20, 40, 20]} intensity={0.6} />
      {szene.raum && (
        <group position={[szene.raum.breite / 2, 0, szene.raum.tiefe / 2]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[szene.raum.breite, szene.raum.tiefe]} />
            <meshStandardMaterial color={rahmen} transparent opacity={0.25} />
            <Edges color={rahmen} />
          </mesh>
          {beschriftung && (
            <Html position={[-szene.raum.breite / 2, 0.2, -szene.raum.tiefe / 2]}>
              <span style={{ color: text, fontSize: 11, whiteSpace: 'nowrap' }}>{szene.raum.name}</span>
            </Html>
          )}
        </group>
      )}
      {szene.buehne && (
        <mesh position={[szene.buehne.x + szene.buehne.breite / 2, 0.4, szene.buehne.z + szene.buehne.tiefe / 2]}>
          <boxGeometry args={[szene.buehne.breite, 0.8, szene.buehne.tiefe]} />
          <meshStandardMaterial color={rahmen} transparent opacity={0.5} />
          <Edges color={rahmen} />
        </mesh>
      )}
      {szene.geraete.map((g) => {
        const c = farbe(GEWERK_FARBE[g.gewerk])
        return (
          <group key={g.id} position={[g.pos.x, g.pos.y, g.pos.z]}>
            {/* Leuchten an ihrer Haenge-Hoehe: ein Lot zum Boden zeigt, wo sie
                ueber dem Plan haengen. */}
            {g.pos.y > 0 && (
              <Line points={[[0, 0, 0], [0, -g.pos.y, 0]]} color={c} lineWidth={1} dashed dashSize={0.3} gapSize={0.2} />
            )}
            <mesh>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshStandardMaterial color={c} />
            </mesh>
            {beschriftung && (
              <Html position={[0, 0.6, 0]} center>
                <span style={{ color: text, fontSize: 10.5, whiteSpace: 'nowrap', pointerEvents: 'none' }}>{g.name}</span>
              </Html>
            )}
          </group>
        )
      })}
      {szene.kabel.map((k) => (
        <Line
          key={k.id}
          points={[
            [k.von.x, k.von.y, k.von.z],
            [k.nach.x, k.nach.y, k.nach.z],
          ]}
          color={farbe('var(--mod-signal)')}
          lineWidth={1.5}
        />
      ))}
      <OrbitControls target={[szene.mitte.x, szene.mitte.y, szene.mitte.z]} makeDefault />
    </>
  )
}

export default function Szene3DDialog({ szene, onClose }: { szene: Szene3D; onClose: () => void }) {
  const t = useT()
  const [beschriftung, setBeschriftung] = useState(true)
  const abstand = szene.groesse * 1.3
  const ohneHoehe = szene.geraete.filter((g) => g.gewerk === 'licht' && !g.hoeheBekannt).length
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t('overview.raum3d.dialogTitle', 'Raum in 3D')}
      footer={
        <label className="mr-auto flex items-center gap-1.5 text-[12px] text-av-text-secondary">
          <input type="checkbox" checked={beschriftung} onChange={(e) => setBeschriftung(e.target.checked)} />
          {t('overview.raum3d.labels', 'Beschriftung')}
        </label>
      }
    >
      <div className="h-[60vh] w-full overflow-hidden rounded-av-card border border-av-border-muted bg-av-surface-2">
        <Canvas camera={{ position: [szene.mitte.x + abstand, szene.mitte.y + abstand * 0.7, szene.mitte.z + abstand], fov: 45, near: 0.1, far: abstand * 20 }}>
          <Szene szene={szene} beschriftung={beschriftung} />
        </Canvas>
      </div>
      <p className="mt-2 text-[11px] text-av-text-muted">
        {format(
          t(
            'overview.raum3d.footer',
            '{geraete} Geräte, {kabel} Kabel — ziehen zum Drehen, scrollen zum Zoomen. Nicht platziert: {offen} Geräte, {kabelOffen} Kabel.',
          ),
          { geraete: szene.geraete.length, kabel: szene.kabel.length, offen: szene.nichtPlatziert, kabelOffen: szene.kabelOhneLage },
        )}
      </p>
      {szene.nichtPlatziertSignal > 0 && (
        <p className="mt-1 text-[11px] text-av-text-muted">
          {format(
            t(
              'overview.raum3d.signalOhneLage',
              '{n} Signalgeräte ohne Lage im Raum — sie erscheinen, sobald sie im Signalplan auf dem Hallenplan mit Maßstab liegen.',
            ),
            { n: szene.nichtPlatziertSignal },
          )}
        </p>
      )}
      {ohneHoehe > 0 && (
        <p className="mt-1 text-[11px] text-av-text-muted">
          {format(t('overview.raum3d.noHeight', '{n} Leuchten ohne Hänge-Höhe stehen auf dem Boden — angegeben ist sie nicht.'), { n: ohneHoehe })}
        </p>
      )}
    </Modal>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { liesThema, wendeAn } from './lib/thema'
import { initShellSeed } from './lib/shellSeedBridge'
import { initTypKatalog } from './lib/typKatalogSuite'
import './index.css'

// VOR dem ersten Rendern, nicht danach. Wer die Entscheidung erst in einem
// Effekt anwendet, zeigt einen Lidschlag lang das falsche Thema — und auf
// einem hellen Schirm ist das ein dunkles Aufblitzen.
wendeAn(liesThema())

// SUITE-OVERLAY (nicht upstream): der Projekt-Fluss der Shell. No-op, wenn das
// Lager allein laeuft — `connectShellSeed` prueft `window.parent !== window`.
initShellSeed()

// SUITE-OVERLAY (nicht upstream): der gemeinsame Geraetetyp-Katalog (ADR-012).
// Ohne ihn legt das Lager Artikel ohne Identitaet an, und die Deckung gegen
// den Plan faellt auf den Namensvergleich zurueck. Anders als der Seed laeuft
// das NICHT nur eingebettet: ein Katalog ist auch im Alleinbetrieb richtig,
// solange das Paket danebenliegt.
initTypKatalog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

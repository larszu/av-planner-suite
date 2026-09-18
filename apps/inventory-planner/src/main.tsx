import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { liesThema, wendeAn } from './lib/thema'
import { initShellSeed } from './lib/shellSeedBridge'
import './index.css'

// VOR dem ersten Rendern, nicht danach. Wer die Entscheidung erst in einem
// Effekt anwendet, zeigt einen Lidschlag lang das falsche Thema — und auf
// einem hellen Schirm ist das ein dunkles Aufblitzen.
wendeAn(liesThema())

// SUITE-OVERLAY (nicht upstream): der Projekt-Fluss der Shell. No-op, wenn das
// Lager allein laeuft — `connectShellSeed` prueft `window.parent !== window`.
initShellSeed()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

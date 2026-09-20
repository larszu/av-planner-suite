// Die Zugangsdaten stehen HIER und nicht in der Suite: sie gelten für einen
// Programmlauf, und der Nutzer trägt sie einmal ein. Sie liegen im Speicher
// der Erweiterung und gehen nirgendwo sonst hin.
const api = globalThis.browser ?? globalThis.chrome
const feld = (id) => document.getElementById(id)
const sage = (text, art) => {
  const p = feld('meldung')
  p.textContent = text
  p.className = art ?? ''
}

api.storage.local.get(['adresse', 'geheimnis']).then((s) => {
  feld('adresse').value = s.adresse ?? ''
  feld('geheimnis').value = s.geheimnis ?? ''
})

feld('senden').addEventListener('click', async () => {
  const adresse = feld('adresse').value.trim()
  const geheimnis = feld('geheimnis').value
  if (!adresse || !geheimnis) {
    sage('Address and secret come from the suite settings, under “Web clipper”.', 'fehler')
    return
  }
  await api.storage.local.set({ adresse, geheimnis })

  const [tab] = await api.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    sage('No page open.', 'fehler')
    return
  }
  let gelesen
  try {
    const ergebnis = await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['lesen.js'] })
    gelesen = ergebnis?.[0]?.result
  } catch {
    // Eine Seite, die kein Skript zulässt (Einstellungs-Seiten des Browsers,
    // ein PDF), ist kein Fehler dieser Erweiterung — und die Adresse allein
    // ist immer noch ein brauchbares Fundstück.
    gelesen = undefined
  }
  const sendung = gelesen ?? { url: tab.url, titel: tab.title || undefined }
  if (!sendung.url) {
    sage('This page has no web address.', 'fehler')
    return
  }

  try {
    const antwort = await fetch(adresse, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...sendung, geheimnis }),
    })
    if (antwort.ok) {
      sage('On the board.', 'gut')
      setTimeout(() => window.close(), 700)
      return
    }
    const grund = await antwort.json().catch(() => ({}))
    sage(
      grund.grund === 'falsches-geheimnis'
        ? 'The secret does not match. It is new after every start of the suite.'
        : `The suite declined the clip (${antwort.status}).`,
      'fehler',
    )
  } catch {
    // Ehrlich: das ist fast immer „die Suite läuft nicht", und genau das
    // steht da — statt „Netzwerkfehler".
    sage('No answer. Is the suite running and the inbox open?', 'fehler')
  }
})

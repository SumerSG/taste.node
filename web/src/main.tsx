import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;color:red">Fatal: #root not found</div>'
} else {
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (err: any) {
    rootEl.innerHTML = `
      <div style="padding:40px;font-family:sans-serif">
        <h1 style="color:red">App crashed on load</h1>
        <pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow:auto">${err?.stack || err?.message || String(err)}</pre>
      </div>
    `
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { installDomTranslateGuard } from './domTranslateGuard'
import './api/http'
import './index.css'
import App from './App.tsx'
import { API_BASE_URL } from './config'

installDomTranslateGuard()

try {
  const origin = new URL(API_BASE_URL, window.location.origin).origin
  if (origin && origin !== window.location.origin) {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = origin
    document.head.appendChild(link)
  }
} catch {
  /* ignore invalid API_BASE_URL */
}

installDomTranslateGuard()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

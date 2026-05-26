// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register PWA service worker with auto-update
// When a new version is available, it will be installed automatically
const updateSW = registerSW({
  onNeedRefresh() {
    // New content available — auto-update the SW
    updateSW(true)
  },
  onOfflineReady() {
    console.log('Setsound est prêt pour une utilisation hors ligne.')
  },
  onRegisteredSW(_swUrl, registration) {
    // Check for updates periodically (every 60 minutes)
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
  onRegisterError(error) {
    console.error('Erreur lors de l\'enregistrement du Service Worker:', error)
  }
})
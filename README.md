<div align="center">

<img src="public/pwa-192x192.png" width="96" height="96" alt="SetSound logo" />

# SetSound

### The complete audio toolkit that runs entirely in your browser

[![Made by Jema Technology](https://img.shields.io/badge/Made%20by-Jema%20Technology-8286ef)](https://www.jematechnology.fr)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-FFmpeg-654ff0?logo=webassembly&logoColor=white)](https://webassembly.org)
[![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-8286ef)](#-install-as-a-pwa)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-contributing)

**Cut · Join · Convert · Record · Compress · Detect BPM** — all locally, no upload, no account.

[Features](#-features) · [Screenshots](#-screenshots) · [Getting started](#-getting-started) · [Tech stack](#-tech-stack) · [License](#-license)

</div>

![SetSound — Audio Cutter](screenshots/main.png)

---

## ✨ Features

| Tool | What it does |
| --- | --- |
| ✂️ **Cutter** | Trim audio on a precise waveform viewer with zoom and undo/redo |
| 🔗 **Joiner** | Merge several tracks into a single file |
| 🥁 **BPM Detector** | Detect the tempo of any track in one click |
| 🎙️ **Recorder** | Record straight from your microphone, in the browser |
| 🔄 **Converter** | Convert between MP3, WAV, FLAC and more |
| 🗜️ **Compressor** | Shrink file size while keeping the quality you need |

Plus:

- 🖱️ **Drag & drop** — drop a file and start editing
- 🌗 **Light / dark theme**
- 🌍 **English / French UI**
- ⌨️ **Keyboard shortcuts** (undo `Ctrl/Cmd+Z`, …)
- 📶 **Works offline** — installable PWA
- 🔒 **100% private** — nothing ever leaves your device

---

## 📸 Screenshots

| Light | Dark |
| :---: | :---: |
| <img src="screenshots/main.png" alt="SetSound — light" /> | <img src="screenshots/main-dark.png" alt="SetSound — dark" /> |

---

## 🚀 Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- npm

### Development

```bash
git clone https://github.com/JemaOS/setsound.git
cd setsound
npm install
npm run dev
```

### Build

```bash
npm run build      # production build in dist/
npm run preview    # preview the build locally
```

### Tests

```bash
npm test           # unit tests (Vitest)
npm run test:e2e   # end-to-end tests (Playwright)
```

### Install as a PWA

Open the deployed app in Chrome, Edge, Brave or Safari and click **Install**. It then works offline.

---

## 🛠️ Tech stack

- **React 18** + **TypeScript**
- **Vite** build tooling
- **WebAssembly**: `@ffmpeg/ffmpeg`, `mediabunny`, `lamejs`, `@wasm-audio-decoders/flac`, `web-audio-beat-detector`
- **Web Audio API** for playback, waveforms and recording
- **Vitest** + **Playwright** for tests

---

## 📁 Project structure

```
src/
├── components/     # UI (cutter, joiner, recorder, …)
├── hooks/          # audio + state hooks
├── i18n/           # English / French translations
└── SubscriptionGuard.tsx   # JemaOS Pro session handling
```

---

## 🤝 Contributing

Contributions are welcome! Fork the repo, create a branch, and open a pull request.

```bash
git checkout -b feat/my-feature
git commit -m "feat: my feature"
git push origin feat/my-feature
```

---

## 📄 License

Released under the **MIT License** — see [LICENSE](LICENSE).

<div align="center">
Made with ❤️ by <a href="https://www.jematechnology.fr">Jema Technology</a>
</div>

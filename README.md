# DocConverter

> **Convert documents instantly — PDF, DOCX, PPTX, HTML, EPUB — all server-side. No cloud. No tracking. Your files never leave your machine.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Supported Conversions](#supported-conversions)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Production Deployment](#production-deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

DocConverter is a self-hosted document conversion tool built with **Next.js 16** and **TypeScript**. It runs entirely on your own machine or server — no third-party APIs, no file uploads to the cloud, no usage limits.

It uses **LibreOffice** and **Pandoc** under the hood — the same battle-tested open-source tools used by enterprises and universities worldwide — exposed through a clean drag-and-drop UI.

---

## Features

- 🔄 **10 conversion routes** across 5 formats — PDF, DOCX, PPTX, HTML, EPUB
- 📦 **Batch conversion** — drop multiple files and convert them all at once
- ⚡ **Parallel processing** — up to 4 jobs run simultaneously via an in-process queue
- 🧠 **Smart PDF detection** — automatically detects scanned vs text-based PDFs
- 🔍 **OCR support** — scanned PDFs are rasterised with Poppler then OCR'd with Tesseract
- 🔁 **Job polling** — non-blocking API keeps the UI responsive during long conversions
- ⬇️ **Auto-download** — converted files download automatically when ready
- 🧹 **Zero persistence** — temp files are deleted immediately; jobs purge from memory after 5 minutes
- 🏠 **Self-hosted** — runs on your machine, a VPS, or a Docker container

---

## Supported Conversions

| From | To |
|------|----|
| PDF | DOCX, HTML, EPUB |
| DOCX | PDF, HTML, EPUB |
| PPTX | PDF, HTML |
| HTML | PDF, DOCX |
| EPUB | PDF, DOCX |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 + CSS custom properties |
| Fonts | `next/font/google` — self-hosted DM Mono & Fraunces |
| PDF / Office conversion | [LibreOffice](https://www.libreoffice.org) headless |
| Document conversion | [Pandoc](https://pandoc.org) |
| PDF rasterisation | [Poppler](https://poppler.freedesktop.org) (`pdftoppm`) |
| OCR | [Tesseract](https://github.com/tesseract-ocr/tesseract) |
| PDF text detection | [pdfjs-dist](https://github.com/mozilla/pdf.js) |
| Queue | In-process TypeScript queue (no Redis needed) |

---

## Prerequisites

You need **Node.js LTS** plus the following system tools.

### Windows

| Tool | Link |
|------|------|
| Node.js LTS | https://nodejs.org |
| LibreOffice | https://www.libreoffice.org/download/download-libreoffice/ |
| Pandoc | https://pandoc.org/installing.html or `winget install JohnMacFarlane.Pandoc` |
| Tesseract OCR | https://github.com/UB-Mannheim/tesseract/wiki |
| Poppler | https://github.com/oschwartz10612/poppler-windows/releases — extract the zip and note the path to `pdftoppm.exe` |

> After installing Poppler, update `BIN.pdftoppm` in `app/api/convert/route.ts` with the full path to your `pdftoppm.exe`. See [Configuration](#configuration).

### macOS

```bash
brew install node libreoffice pandoc tesseract poppler
```

### Ubuntu / Debian

```bash
sudo apt-get update
sudo apt-get install -y nodejs libreoffice pandoc tesseract-ocr poppler-utils
```

### Fedora / RHEL

```bash
sudo dnf install nodejs libreoffice pandoc tesseract poppler-utils
```

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/eenock/doc-converter.git
cd doc-converter

# 2. Install Node dependencies
npm install

# 3. Configure binary paths if on Windows (see Configuration)

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Configuration

Binary paths live at the top of `app/api/convert/route.ts`:

```ts
const BIN = {
  libreoffice: `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`,
  tesseract:   `"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"`,
  pdftoppm:    `"C:\\path\\to\\poppler\\Library\\bin\\pdftoppm.exe"`,
  pandoc:      `pandoc`,
}
```

On **macOS / Linux**, all four tools are on PATH after installation so you can use short names:

```ts
const BIN = {
  libreoffice: `libreoffice`,
  tesseract:   `tesseract`,
  pdftoppm:    `pdftoppm`,
  pandoc:      `pandoc`,
}
```

### Other settings

| Setting | File | Default | Description |
|---------|------|---------|-------------|
| Max concurrent jobs | `convertQueue.ts` → `MAX_CONCURRENT` | `4` | Parallel conversions |
| Job TTL | `convertQueue.ts` → `JOB_TTL_MS` | `300000` | ms before completed jobs are purged |
| Max upload size | `next.config.js` → `bodySizeLimit` | `50mb` | Raise for large files |

---

## How It Works

### API

```
POST /api/convert
  body: FormData { file(s), mode: "pdf-to-docx" }
  → 200 { jobIds: string[] }

GET /api/convert?id=<jobId>
  → 200 { status: "queued" | "processing" }     poll every 1.5 s
  → 500 { status: "error", error: string }
  → 200 <file stream>                            triggers browser download
```

The frontend submits files, receives job IDs immediately, then polls each ID in parallel. When a job finishes the same GET endpoint streams the file directly to the browser.

### PDF Intelligence

When converting PDF → DOCX the server checks whether the PDF has selectable text via `pdfjs-dist`:

- **Text-based PDF** → Pandoc → LibreOffice fallback
- **Scanned PDF** → `pdftoppm` rasterises pages to PNG at 300 DPI → Tesseract OCRs batches of 4 pages in parallel → Pandoc builds the DOCX

### Queue

`convertQueue.ts` is a lightweight in-process queue with no external dependencies. It caps parallel execution at `MAX_CONCURRENT`, queues overflow jobs, and auto-purges completed results after `JOB_TTL_MS`.

---

## Project Structure

```
doc-converter/
├── app/
│   ├── api/
│   │   └── convert/
│   │       ├── route.ts          # POST (enqueue) + GET (poll / download)
│   │       └── convertQueue.ts   # In-process job queue
│   ├── page.tsx                  # Root page — thin orchestrator
│   ├── layout.tsx                # Root layout + next/font setup
│   └── globals.css               # Tailwind directives + CSS variables
├── components/
│   ├── DropZone.tsx              # Drag-and-drop file input
│   ├── FileIcon.tsx              # Coloured file-type badge
│   ├── JobList.tsx               # Per-job status list
│   ├── ModeSelector.tsx          # Grouped conversion format tabs
│   └── StatusBadge.tsx           # Global error / status pill
├── lib/
│   ├── constants.ts              # FORMAT_GROUPS, ALL_MODES
│   ├── pollAndDownload.ts        # Polling + auto-download logic
│   └── types.ts                  # Shared TypeScript types
├── next.config.js
├── tailwind.config.js            # Design tokens + custom animations
├── tsconfig.json
├── package.json
└── README.md
```

---

## Production Deployment

### Build & run

```bash
npm run build
npm start
```

### Docker

```dockerfile
FROM node:20-alpine

RUN apk add --no-cache \
    libreoffice \
    font-noto \
    pandoc \
    tesseract-ocr \
    poppler-utils

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t doc-converter .
docker run -p 3000:3000 doc-converter
```

### Production tips

- Allocate at least **1 GB RAM** — LibreOffice headless is memory-hungry on large files.
- Set `MAX_CONCURRENT` to match your server's CPU core count.
- `os.tmpdir()` is used for temp files — ensure the partition has enough headroom for `MAX_CONCURRENT × max file size`.

---

## Contributing

Contributions are welcome!

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org): `git commit -m "feat: add your feature"`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

Please open an issue first for any significant changes so we can align on the approach before you invest time building it.

---

## License

```
MIT License

Copyright (c) 2025 DocConverter Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<p align="center">Built with ❤️ using Next.js, LibreOffice, and Pandoc</p>
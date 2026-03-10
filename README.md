# DocConverter

A Next.js app to convert PDF ↔ DOCX using LibreOffice and Pandoc — all server-side, files never leave your machine.

## Prerequisites

Install system dependencies:

```bash
# macOS
brew install libreoffice pandoc

# Ubuntu / Debian
sudo apt-get install libreoffice pandoc

# Fedora / RHEL
sudo dnf install libreoffice pandoc
```

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

- **PDF → DOCX**: LibreOffice imports the PDF using its built-in writer filter, preserving layout as best as possible.
- **DOCX → PDF**: LibreOffice headless renders the Word document to PDF with full fidelity.

The API route writes the uploaded file to a temp directory, runs the conversion, streams the result back as a download, then cleans up. No files are persisted.

## Production Deployment

Make sure LibreOffice is installed on your server. For Docker:

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache libreoffice font-noto
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["npm", "start"]
```

## File Size Limit

Default is 50MB (set in `next.config.js` → `serverActions.bodySizeLimit`). Increase as needed.

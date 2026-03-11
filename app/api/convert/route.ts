/**
 * 
 * POST /api/convert   — accepts file(s) + mode, enqueues jobs, returns { jobIds }
 * GET  /api/convert   — ?id=<jobId> polls status; streams file on "done"
 *
 * Supported modes:
 *   pdf-to-docx | pdf-to-html | pdf-to-epub
 *   docx-to-pdf | docx-to-html | docx-to-epub
 *   pptx-to-pdf | pptx-to-html
 *   html-to-pdf | html-to-docx
 *   epub-to-pdf | epub-to-docx
 */

import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, readFile, mkdir, rm, readdir, rename } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import os from "os"
import { randomUUID } from "crypto"
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"
import { enqueue, getJob } from "./convertQueue"

const execAsync = promisify(exec)

/* ===================================================================
    Binary paths — Windows
   =================================================================== */

const BIN = {
  libreoffice: `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`,
  tesseract: `"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"`,
  pdftoppm: `"C:\\Users\\enock\\Downloads\\Compressed\\Release-25.12.0-0\\poppler-25.12.0\\Library\\bin\\pdftoppm.exe"`,
  pandoc: `pandoc`,
}

/* ===================================================================
   MIME map
   =================================================================== */

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  epub: "application/epub+zip",
  html: "text/html",
}

/* ===================================================================
   Supported conversion matrix  from → [to, to, …]
   =================================================================== */

const SUPPORTED: Record<string, string[]> = {
  pdf: ["docx", "html", "epub"],
  docx: ["pdf", "html", "epub"],
  pptx: ["pdf", "html"],
  html: ["pdf", "docx"],
  epub: ["pdf", "docx"],
}

/* ===================================================================
   Helpers
   =================================================================== */

function parseMode(mode: string): { from: string; to: string } | null {
  // expects "pdf-to-docx", "docx-to-pdf", etc.
  const match = mode.match(/^(\w+)-to-(\w+)$/)
  if (!match) return null
  const [, from, to] = match
  if (!SUPPORTED[from]?.includes(to)) return null
  return { from, to }
}

async function pdfHasText(buffer: Buffer): Promise<boolean> {
  try {
    const pdf = await pdfjs.getDocument({ data: buffer }).promise
    let text = ""
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map((item: any) => item.str ?? "").join(" ")
    }
    return text.trim().length > 100
  } catch {
    return false
  }
}

/** Rasterise each PDF page with pdftoppm, then OCR in parallel batches */
async function ocrPdf(inputPath: string, tmpDir: string): Promise<string> {
  const imgPrefix = path.join(tmpDir, "page")

  await execAsync(
    `${BIN.pdftoppm} -r 300 -png "${inputPath}" "${imgPrefix}"`,
    { timeout: 120_000 }
  )

  const files = await readdir(tmpDir)
  const images = files
    .filter((f) => f.startsWith("page") && f.endsWith(".png"))
    .sort()
    .map((f) => path.join(tmpDir, f))

  if (images.length === 0) {
    throw new Error("pdftoppm produced no images — is poppler installed?")
  }

  // OCR pages in parallel batches of 4
  const BATCH = 4
  let fullText = ""

  for (let i = 0; i < images.length; i += BATCH) {
    const batch = images.slice(i, i + BATCH)
    const texts = await Promise.all(
      batch.map(async (img) => {
        const ocrBase = img.replace(/\.png$/, "_ocr")
        await execAsync(
          `${BIN.tesseract} "${img}" "${ocrBase}" -l eng`,
          { timeout: 60_000 }
        )
        const txtPath = `${ocrBase}.txt`
        return existsSync(txtPath) ? readFile(txtPath, "utf-8") : ""
      })
    )
    fullText += texts.join("\n\n")
  }

  if (!fullText.trim()) throw new Error("Tesseract produced no text")

  const combined = path.join(tmpDir, "ocr_combined.txt")
  await writeFile(combined, fullText, "utf-8")
  return combined
}

/* ===================================================================
   Core conversion — single file
   =================================================================== */

async function convertFile(
  inputPath: string,
  buffer: Buffer,
  originalName: string,
  from: string,
  to: string,
  tmpDir: string
): Promise<{ outputPath: string; outputName: string; mimeType: string }> {

  const baseName = path.basename(originalName, `.${from}`)
  const outputName = `${baseName}.${to}`
  const outputPath = path.join(tmpDir, outputName)
  const mimeType = MIME[to] ?? "application/octet-stream"

  /* ---------- PDF → * ---------- */

  if (from === "pdf") {

    if (to === "docx") {
      const hasText = await pdfHasText(buffer)

      if (hasText) {
        try {
          await execAsync(
            `${BIN.pandoc} "${inputPath}" -o "${outputPath}"`,
            { timeout: 60_000 }
          )
        } catch {
          console.log("Pandoc failed — falling back to LibreOffice")
        }
      } else {
        try {
          const ocrTxt = await ocrPdf(inputPath, tmpDir)
          await execAsync(
            `${BIN.pandoc} "${ocrTxt}" -o "${outputPath}"`,
            { timeout: 60_000 }
          )
        } catch (e) {
          console.error("OCR pipeline failed:", e)
        }
      }

      // LibreOffice fallback
      if (!existsSync(outputPath)) {
        await execAsync(
          `${BIN.libreoffice} --headless --infilter="writer_pdf_import" --convert-to docx "${inputPath}" --outdir "${tmpDir}"`,
          { timeout: 60_000 }
        )
      }

    } else if (to === "html") {
      await execAsync(
        `${BIN.pandoc} "${inputPath}" -o "${outputPath}" --standalone`,
        { timeout: 60_000 }
      )

    } else if (to === "epub") {
      await execAsync(
        `${BIN.pandoc} "${inputPath}" -o "${outputPath}"`,
        { timeout: 60_000 }
      )
    }
  }

  /* ---------- DOCX → * ---------- */

  else if (from === "docx") {

    if (to === "pdf") {
      await execAsync(
        `${BIN.libreoffice} --headless --convert-to pdf "${inputPath}" --outdir "${tmpDir}"`,
        { timeout: 60_000 }
      )
    } else if (to === "html") {
      await execAsync(
        `${BIN.pandoc} "${inputPath}" -o "${outputPath}" --standalone`,
        { timeout: 60_000 }
      )
    } else if (to === "epub") {
      await execAsync(
        `${BIN.pandoc} "${inputPath}" -o "${outputPath}"`,
        { timeout: 60_000 }
      )
    }
  }

  /* ---------- PPTX → * ---------- */

  else if (from === "pptx") {

    if (to === "pdf") {
      await execAsync(
        `${BIN.libreoffice} --headless --convert-to pdf "${inputPath}" --outdir "${tmpDir}"`,
        { timeout: 60_000 }
      )
    } else if (to === "html") {
      await execAsync(
        `${BIN.libreoffice} --headless --convert-to html "${inputPath}" --outdir "${tmpDir}"`,
        { timeout: 60_000 }
      )
    }
  }

  /* ---------- HTML → * ---------- */

  else if (from === "html") {

    if (to === "pdf") {
      await execAsync(
        `${BIN.libreoffice} --headless --convert-to pdf "${inputPath}" --outdir "${tmpDir}"`,
        { timeout: 60_000 }
      )
    } else if (to === "docx") {
      await execAsync(
        `${BIN.pandoc} "${inputPath}" -o "${outputPath}" --from html`,
        { timeout: 60_000 }
      )
    }
  }

  /* ---------- EPUB → * ---------- */

  else if (from === "epub") {

    if (to === "pdf") {
      // EPUB → DOCX → PDF (LibreOffice can't open EPUB directly)
      const tmpDocx = path.join(tmpDir, `${baseName}_tmp.docx`)
      await execAsync(
        `${BIN.pandoc} "${inputPath}" -o "${tmpDocx}"`,
        { timeout: 60_000 }
      )
      await execAsync(
        `${BIN.libreoffice} --headless --convert-to pdf "${tmpDocx}" --outdir "${tmpDir}"`,
        { timeout: 60_000 }
      )
      const loOut = path.join(tmpDir, `${baseName}_tmp.pdf`)
      if (existsSync(loOut) && loOut !== outputPath) {
        await rename(loOut, outputPath)
      }
    } else if (to === "docx") {
      await execAsync(
        `${BIN.pandoc} "${inputPath}" -o "${outputPath}"`,
        { timeout: 60_000 }
      )
    }
  }

  if (!existsSync(outputPath)) {
    throw new Error(`Output file not generated for ${outputName}`)
  }

  return { outputPath, outputName, mimeType }
}

/* ===================================================================
   POST — enqueue job(s), return jobIds immediately
   =================================================================== */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const rawFiles = formData.getAll("file")
    const mode = formData.get("mode") as string | null

    if (!rawFiles.length || !mode) {
      return NextResponse.json({ error: "Missing file(s) or mode" }, { status: 400 })
    }

    const parsed = parseMode(mode)
    if (!parsed) {
      return NextResponse.json(
        { error: `Unsupported mode "${mode}". Valid example: "pdf-to-docx"` },
        { status: 400 }
      )
    }

    const files = rawFiles.filter((f): f is File => f instanceof File)

    // Read all file buffers up-front before handing off to queue
    const fileData = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
      }))
    )

    // Enqueue each file — jobs run in parallel up to MAX_CONCURRENT
    const jobIds = fileData.map(({ name, buffer }) => {
      const id = randomUUID()

      enqueue(id, async () => {
        const tmpDir = path.join(os.tmpdir(), `convert-${id}`)
        await mkdir(tmpDir, { recursive: true })

        try {
          const inputPath = path.join(tmpDir, name)
          await writeFile(inputPath, buffer)

          const { outputPath, outputName, mimeType } = await convertFile(
            inputPath, buffer, name, parsed.from, parsed.to, tmpDir
          )

          const result = await readFile(outputPath)
          return { filename: outputName, mimeType, result }
        } finally {
          await rm(tmpDir, { recursive: true, force: true }).catch(() => { })
        }
      })

      return id
    })

    return NextResponse.json({ jobIds })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/* ===================================================================
   GET — poll status or download completed file
   =================================================================== */

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 })
  }

  const job = getJob(id)

  if (!job) {
    return NextResponse.json(
      { error: "Job not found — it may have expired (5 min TTL)" },
      { status: 404 }
    )
  }

  if (job.status === "queued" || job.status === "processing") {
    return NextResponse.json({ id, status: job.status })
  }

  if (job.status === "error") {
    return NextResponse.json({ id, status: "error", error: job.error }, { status: 500 })
  }

  // status === "done" — stream the converted file
  return new NextResponse(new Uint8Array(job.result!), {
    status: 200,
    headers: {
      "Content-Type": job.mimeType!,
      "Content-Disposition": `attachment; filename="${job.filename}"`,
      "Content-Length": job.result!.length.toString(),
    },
  })
}
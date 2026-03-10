import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink, mkdir, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

// Windows LibreOffice path
const LIBREOFFICE = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`

export async function POST(request: NextRequest) {
  const tmpDir = path.join(
    os.tmpdir(),
    `convert-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )

  await mkdir(tmpDir, { recursive: true })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const mode = formData.get('mode') as string | null

    if (!file || !mode) {
      return NextResponse.json(
        { error: 'Missing file or mode' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const inputPath = path.join(tmpDir, file.name)
    await writeFile(inputPath, buffer)

    let outputPath: string
    let outputName: string
    let mimeType: string

    if (mode === 'pdf-to-docx') {
      outputName = file.name.replace(/\.pdf$/i, '.docx')
      outputPath = path.join(tmpDir, outputName)

      await execAsync(
        `${LIBREOFFICE} --headless --infilter="writer_pdf_import" --convert-to docx "${inputPath}" --outdir "${tmpDir}"`,
        { timeout: 60000 }
      )

      const loOutput = path.join(
        tmpDir,
        path.basename(file.name, '.pdf') + '.docx'
      )

      if (!existsSync(loOutput)) {
        await execAsync(
          `pandoc "${inputPath}" -o "${outputPath}" --from pdf`,
          { timeout: 60000 }
        )
      } else {
        outputPath = loOutput
      }

      mimeType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    } else if (mode === 'docx-to-pdf') {
      outputName = file.name.replace(/\.docx$/i, '.pdf')
      outputPath = path.join(tmpDir, outputName)

      await execAsync(
        `${LIBREOFFICE} --headless --convert-to pdf "${inputPath}" --outdir "${tmpDir}"`,
        { timeout: 60000 }
      )

      outputPath = path.join(
        tmpDir,
        path.basename(file.name, '.docx') + '.pdf'
      )

      mimeType = 'application/pdf'

    } else {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    if (!existsSync(outputPath)) {
      return NextResponse.json(
        { error: 'Conversion failed — output file not generated' },
        { status: 500 }
      )
    }

    const outputBuffer = await readFile(outputPath)

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': outputBuffer.length.toString(),
      },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Conversion error:', message)

    return NextResponse.json(
      { error: `Conversion failed: ${message}` },
      { status: 500 }
    )

  } finally {
    // Cross-platform cleanup
    await rm(tmpDir, { recursive: true, force: true }).catch(() => { })
  }
}
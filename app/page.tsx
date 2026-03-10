'use client';

import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react';

type Mode = 'pdf-to-docx' | 'docx-to-pdf';
type Status = 'idle' | 'converting' | 'done' | 'error';

const MODES: { id: Mode; label: string; from: string; to: string; accept: string; icon: string }[] = [
  {
    id: 'pdf-to-docx',
    label: 'PDF → Word',
    from: 'PDF',
    to: 'DOCX',
    accept: '.pdf,application/pdf',
    icon: '📄',
  },
  {
    id: 'docx-to-pdf',
    label: 'Word → PDF',
    from: 'DOCX',
    to: 'PDF',
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    icon: '📝',
  },
];

function FileIcon({ ext }: { ext: string }) {
  return (
    <div
      style={{
        background: ext === 'PDF' ? '#c4471a' : '#1a6bc4',
        color: '#fff',
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        fontWeight: 500,
        width: 36,
        height: 44,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: 1,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 10,
          height: 10,
          background: 'rgba(255,255,255,0.25)',
          borderBottomLeftRadius: 4,
        }}
      />
      {ext}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('pdf-to-docx');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMode = MODES.find((m) => m.id === mode)!;

  const handleFile = useCallback(
    (f: File) => {
      // Basic validation
      const isPdf = f.type === 'application/pdf' || f.name.endsWith('.pdf');
      const isDocx =
        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        f.name.endsWith('.docx');

      if (mode === 'pdf-to-docx' && !isPdf) {
        setError('Please upload a PDF file.');
        return;
      }
      if (mode === 'docx-to-pdf' && !isDocx) {
        setError('Please upload a .docx file.');
        return;
      }

      setError('');
      setStatus('idle');
      setFile(f);
    },
    [mode]
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const convert = async () => {
    if (!file) return;
    setStatus('converting');
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', mode);

      const res = await fetch('/api/convert', { method: 'POST', body: fd });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error || 'Conversion failed');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? (mode === 'pdf-to-docx' ? 'output.docx' : 'output.pdf');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'var(--paper)',
      }}
    >
      {/* Header */}
      <div
        className="animate-fade-up"
        style={{ textAlign: 'center', marginBottom: '2.5rem' }}
      >
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 600,
            color: 'var(--ink)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          DocConverter
        </div>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 13,
            color: 'var(--muted)',
            marginTop: '0.5rem',
            letterSpacing: '0.05em',
          }}
        >
          PDF ↔ DOCX — runs on your server, files never leave
        </p>
      </div>

      {/* Card */}
      <div
        className="animate-fade-up"
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#fff',
          borderRadius: 16,
          border: '1px solid var(--border)',
          boxShadow: '0 4px 40px rgba(26,20,18,0.06)',
          overflow: 'hidden',
          animationDelay: '0.1s',
        }}
      >
        {/* Mode tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
              style={{
                padding: '1rem',
                fontFamily: "'DM Mono', monospace",
                fontSize: 13,
                fontWeight: mode === m.id ? 500 : 400,
                color: mode === m.id ? 'var(--rust)' : 'var(--muted)',
                background: mode === m.id ? 'rgba(196,71,26,0.05)' : 'transparent',
                border: 'none',
                borderBottom: mode === m.id ? '2px solid var(--rust)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                letterSpacing: '0.04em',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '1.75rem' }}>
          {/* Drop zone */}
          <div
            className={`drop-zone${dragging ? ' active' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={() => setDragging(false)}
            style={{
              borderRadius: 10,
              padding: '2rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              background: dragging ? 'rgba(196,71,26,0.04)' : 'var(--cream)',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={currentMode.accept}
              onChange={onFileInput}
              style={{ display: 'none' }}
            />

            {file ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  justifyContent: 'center',
                }}
              >
                <FileIcon ext={currentMode.from} />
                <div style={{ textAlign: 'left' }}>
                  <div
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--ink)',
                      maxWidth: 260,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {(file.size / 1024).toFixed(1)} KB · click to change
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{currentMode.icon}</div>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13,
                    color: 'var(--muted)',
                  }}
                >
                  Drop your <strong style={{ color: 'var(--ink)' }}>.{currentMode.from.toLowerCase()}</strong>{' '}
                  here or{' '}
                  <span style={{ color: 'var(--rust)', textDecoration: 'underline' }}>
                    browse
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'rgba(196,71,26,0.08)',
                border: '1px solid rgba(196,71,26,0.2)',
                borderRadius: 8,
                fontFamily: "'DM Mono', monospace",
                fontSize: 12,
                color: 'var(--rust)',
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Success */}
          {status === 'done' && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'rgba(22,120,50,0.07)',
                border: '1px solid rgba(22,120,50,0.2)',
                borderRadius: 8,
                fontFamily: "'DM Mono', monospace",
                fontSize: 12,
                color: '#167832',
              }}
            >
              ✓ Conversion complete — file downloaded
            </div>
          )}

          {/* Convert button */}
          <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
            <button
              onClick={convert}
              disabled={!file || status === 'converting'}
              style={{
                flex: 1,
                padding: '0.85rem 1.5rem',
                background: file && status !== 'converting' ? 'var(--rust)' : 'var(--border)',
                color: file && status !== 'converting' ? '#fff' : 'var(--muted)',
                border: 'none',
                borderRadius: 8,
                fontFamily: "'DM Mono', monospace",
                fontSize: 13,
                fontWeight: 500,
                cursor: file && status !== 'converting' ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s, transform 0.1s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                letterSpacing: '0.04em',
              }}
              onMouseDown={(e) => {
                if (file) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            >
              {status === 'converting' ? (
                <>
                  <span
                    className="animate-spin-slow"
                    style={{ display: 'inline-block', fontSize: 14 }}
                  >
                    ⟳
                  </span>
                  Converting…
                </>
              ) : (
                `Convert to ${currentMode.to}`
              )}
            </button>

            {file && (
              <button
                onClick={reset}
                style={{
                  padding: '0.85rem 1rem',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Arrow indicator */}
          <div
            style={{
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: 'var(--muted)',
              letterSpacing: '0.08em',
            }}
          >
            <span
              style={{
                padding: '2px 8px',
                background: 'var(--cream)',
                borderRadius: 4,
                color: 'var(--ink)',
                fontWeight: 500,
              }}
            >
              {currentMode.from}
            </span>
            <span>——→</span>
            <span
              style={{
                padding: '2px 8px',
                background: 'var(--cream)',
                borderRadius: 4,
                color: 'var(--ink)',
                fontWeight: 500,
              }}
            >
              {currentMode.to}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p
        className="animate-fade-up"
        style={{
          marginTop: '2rem',
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: 'var(--muted)',
          letterSpacing: '0.05em',
          animationDelay: '0.2s',
        }}
      >
        Powered by LibreOffice & Pandoc · Files processed locally
      </p>
    </main>
  );
}

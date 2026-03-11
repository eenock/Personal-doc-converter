'use client';

import { useState, useCallback } from 'react';

import { ModeSelector }     from '@/components/ModeSelector';
import { DropZone }         from '@/components/DropZone';
import { JobList }          from '@/components/JobList';
import { StatusBadge }      from '@/components/StatusBadge';

import { FORMAT_GROUPS, ALL_MODES } from '@/lib/constants';
import { pollAndDownload }           from '@/lib/pollAndDownload';
import type { Status, ConversionJob } from '@/lib/types';

/* ===================================================================
   Page
   =================================================================== */

export default function Home() {
  const [mode,         setMode]         = useState(ALL_MODES[0].mode);
  const [files,        setFiles]        = useState<File[]>([]);
  const [jobs,         setJobs]         = useState<ConversionJob[]>([]);
  const [globalStatus, setGlobalStatus] = useState<Status>('idle');
  const [error,        setError]        = useState('');
  const [dragging,     setDragging]     = useState(false);

  const currentMode = ALL_MODES.find((m) => m.mode === mode)!;
  const isRunning   = globalStatus === 'queued' || globalStatus === 'processing';
  const doneCount   = jobs.filter((j) => j.status === 'done').length;

  /* ── File validation ── */
  const handleFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const ext = currentMode.from.toLowerCase();
    const valid = arr.filter(
      (f) => f.name.toLowerCase().endsWith(`.${ext}`) ||
             (ext === 'html' && f.name.toLowerCase().endsWith('.htm')),
    );
    if (!valid.length) {
      setError(`Please upload ${currentMode.from} file(s).`);
      return;
    }
    setError('');
    setGlobalStatus('idle');
    setJobs([]);
    setFiles(valid);
  }, [currentMode]);

  /* ── Per-job state update ── */
  const updateJob = (jobId: string, status: Status, err?: string) => {
    setJobs((prev) =>
      prev.map((j) => j.jobId === jobId ? { ...j, status, error: err } : j),
    );
  };

  /* ── Convert ── */
  const convert = async () => {
    if (!files.length || isRunning) return;
    setGlobalStatus('queued');
    setError('');

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('file', f));
      fd.append('mode', mode);

      const res  = await fetch('/api/convert', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to enqueue');

      const { jobIds } = data as { jobIds: string[] };

      const initialJobs: ConversionJob[] = jobIds.map((jobId, i) => ({
        jobId,
        filename: files[i]?.name ?? jobId,
        status: 'queued',
      }));
      setJobs(initialJobs);
      setGlobalStatus('processing');

      await Promise.all(
        jobIds.map((jobId) =>
          pollAndDownload(jobId, (status, err) => updateJob(jobId, status, err)),
        ),
      );

      setGlobalStatus('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      setGlobalStatus('error');
    }
  };

  /* ── Reset ── */
  const reset = () => {
    setFiles([]);
    setJobs([]);
    setGlobalStatus('idle');
    setError('');
  };

  const switchMode = (m: string) => { setMode(m); reset(); };

  /* ===================================================================
     Render
     =================================================================== */
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-paper">

      {/* ── Header ── */}
      <header className="animate-fade-up text-center mb-10">
        <h1 className="font-serif text-[clamp(2rem,5vw,3.5rem)] font-semibold text-ink leading-[1.1] tracking-[-0.02em]">
          DocConverter
        </h1>
        <p className="font-mono text-[13px] text-muted mt-2 tracking-[0.05em]">
          PDF · DOCX · PPTX · HTML · EPUB — runs on your server
        </p>
      </header>

      {/* ── Card ── */}
      <div
        className="animate-fade-up w-full max-w-[560px] bg-white rounded-2xl border border-border shadow-card overflow-hidden"
        style={{ animationDelay: '0.1s' }}
      >
        <ModeSelector groups={FORMAT_GROUPS} activeMode={mode} onSelect={switchMode} />

        <div className="p-6">

          <DropZone
            currentMode={currentMode}
            files={files}
            dragging={dragging}
            onFiles={handleFiles}
            onDragStart={() => setDragging(true)}
            onDragEnd={() => setDragging(false)}
          />

          <JobList jobs={jobs} />

          {error && <StatusBadge status="error" error={error} />}

          {/* ── Action buttons ── */}
          <div className="flex gap-2.5 mt-5">
            <button
              onClick={convert}
              disabled={!files.length || isRunning}
              aria-busy={isRunning}
              className={[
                'flex-1 flex items-center justify-center gap-2',
                'py-3.5 px-6 rounded-lg font-mono text-[13px] font-medium tracking-[0.04em]',
                'transition-colors duration-150',
                files.length && !isRunning
                  ? 'bg-rust text-white cursor-pointer hover:bg-rust/90'
                  : 'bg-border text-muted cursor-not-allowed',
              ].join(' ')}
            >
              {isRunning ? (
                <>
                  <span className="animate-spin-slow inline-block" aria-hidden="true">⟳</span>
                  Converting {doneCount}/{jobs.length}…
                </>
              ) : (
                `Convert to ${currentMode.to}${files.length > 1 ? ` (${files.length} files)` : ''}`
              )}
            </button>

            {(files.length > 0 || jobs.length > 0) && (
              <button
                onClick={reset}
                className="px-4 py-3.5 bg-transparent border border-border rounded-lg font-mono text-xs text-muted cursor-pointer hover:border-muted transition-colors duration-150"
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Format pill indicator ── */}
          <div className="flex items-center justify-center gap-3 mt-5 font-mono text-[11px] text-muted tracking-[0.08em]">
            {[currentMode.from, '——→', currentMode.to].map((s, i) =>
              s === '——→'
                ? <span key={i} aria-hidden="true">{s}</span>
                : <span key={i} className="px-2 py-0.5 bg-cream rounded text-ink font-medium">{s}</span>,
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        className="animate-fade-up mt-8 font-mono text-[11px] text-muted tracking-[0.05em]"
        style={{ animationDelay: '0.2s' }}
      >
        Powered by LibreOffice &amp; Pandoc · Files processed locally
      </footer>
    </main>
  );
}

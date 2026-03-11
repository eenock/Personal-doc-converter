'use client';

import { useRef, ChangeEvent, DragEvent } from 'react';
import { FileIcon } from './FileIcon';
import type { FormatOption } from '@/lib/types';

interface DropZoneProps {
  currentMode: FormatOption;
  files: File[];
  dragging: boolean;
  onFiles: (files: FileList | File[]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function DropZone({
  currentMode,
  files,
  dragging,
  onFiles,
  onDragStart,
  onDragEnd,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDragEnd();
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onFiles(e.target.files);
  };

  const open = () => inputRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Drop or click to upload a ${currentMode.from} file`}
      className={`drop-zone rounded-xl p-7 text-center cursor-pointer select-none ${dragging ? 'active' : 'bg-cream'}`}
      onClick={open}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open()}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); onDragStart(); }}
      onDragLeave={onDragEnd}
    >
      <input
        ref={inputRef}
        type="file"
        accept={currentMode.accept}
        multiple
        onChange={handleFileInput}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {files.length > 0 ? (
        <div className="flex flex-col gap-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 justify-center">
              <FileIcon ext={currentMode.from} />
              <div className="text-left">
                <div className="font-mono text-sm font-medium text-ink max-w-[300px] truncate">
                  {f.name}
                </div>
                <div className="font-mono text-[11px] text-muted mt-0.5">
                  {(f.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
          ))}
          <div className="font-mono text-[11px] text-muted mt-1">click to change</div>
        </div>
      ) : (
        <div>
          <div className="text-3xl mb-2" aria-hidden="true">{currentMode.icon}</div>
          <div className="font-mono text-sm text-muted">
            Drop <strong className="text-ink font-medium">.{currentMode.from.toLowerCase()}</strong> file(s) or{' '}
            <span className="text-rust underline">browse</span>
          </div>
          <div className="font-mono text-[11px] text-muted mt-1">Multiple files supported</div>
        </div>
      )}
    </div>
  );
}

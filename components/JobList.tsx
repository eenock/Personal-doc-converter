import type { ConversionJob } from '@/lib/types';

const STATUS_STYLE: Record<string, string> = {
  queued:     'text-muted',
  processing: 'text-blue-600',
  done:       'text-green-700',
  error:      'text-rust',
};

const STATUS_LABEL: Record<string, string> = {
  queued:     '⏳ queued',
  processing: '⟳ converting',
  done:       '✓ done',
};

interface JobListProps {
  jobs: ConversionJob[];
}

export function JobList({ jobs }: JobListProps) {
  if (!jobs.length) return null;

  return (
    <ul className="mt-4 flex flex-col gap-1.5" aria-label="Conversion jobs">
      {jobs.map((job) => (
        <li
          key={job.jobId}
          className="flex items-center justify-between gap-2 px-3 py-2 bg-cream rounded-lg font-mono text-xs"
        >
          <span className="text-ink max-w-[260px] truncate" title={job.filename}>
            {job.filename}
          </span>
          <span className={`flex-shrink-0 ${STATUS_STYLE[job.status] ?? 'text-muted'}`}>
            {job.status === 'error'
              ? `⚠ ${job.error ?? 'failed'}`
              : (STATUS_LABEL[job.status] ?? job.status)}
          </span>
        </li>
      ))}
    </ul>
  );
}

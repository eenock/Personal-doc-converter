import type { Status } from '@/lib/types';

interface BadgeConfig {
  className: string;
  text: string;
}

const BADGE_MAP: Partial<Record<Status, BadgeConfig>> = {
  queued:     { className: 'bg-amber-50  border border-amber-200  text-amber-800',  text: '⏳ Queued'       },
  processing: { className: 'bg-blue-50   border border-blue-200   text-blue-700',   text: '⟳ Converting…'  },
  done:       { className: 'bg-green-50  border border-green-200  text-green-800',  text: '✓ Downloaded'   },
  error:      { className: 'bg-rust/5    border border-rust/20    text-rust',        text: ''               },
};

interface StatusBadgeProps {
  status: Status;
  error?: string;
}

export function StatusBadge({ status, error }: StatusBadgeProps) {
  const badge = BADGE_MAP[status];
  if (!badge) return null;

  const label = status === 'error' ? `⚠ ${error ?? 'Failed'}` : badge.text;

  return (
    <div className={`mt-1.5 px-3.5 py-2.5 rounded-lg font-mono text-xs ${badge.className}`}>
      {label}
    </div>
  );
}

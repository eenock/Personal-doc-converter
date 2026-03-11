'use client';

import type { FormatGroup } from '@/lib/types';

interface ModeSelectorProps {
  groups: FormatGroup[];
  activeMode: string;
  onSelect: (mode: string) => void;
}

export function ModeSelector({ groups, activeMode, onSelect }: ModeSelectorProps) {
  return (
    <div className="border-b border-border px-5 pt-4">
      {groups.map((group) => (
        <div key={group.label} className="mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted mb-1.5">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.options.map((opt) => {
              const active = activeMode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  onClick={() => onSelect(opt.mode)}
                  aria-pressed={active}
                  className={[
                    'px-3 py-1 rounded-full font-mono text-xs whitespace-nowrap border',
                    'transition-all duration-150 cursor-pointer focus-visible:outline-none',
                    'focus-visible:ring-2 focus-visible:ring-rust focus-visible:ring-offset-1',
                    active
                      ? 'bg-rust text-white border-rust font-medium'
                      : 'bg-cream text-muted border-border hover:border-rust/50 hover:text-ink',
                  ].join(' ')}
                >
                  {opt.icon} {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

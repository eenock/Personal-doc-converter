const EXT_COLORS: Record<string, string> = {
  PDF:  '#c4471a',
  DOCX: '#1a6bc4',
  PPTX: '#b7472a',
  HTML: '#e8940a',
  EPUB: '#167832',
};

interface FileIconProps {
  ext: string;
}

export function FileIcon({ ext }: FileIconProps) {
  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0 rounded text-white font-mono"
      style={{
        background: EXT_COLORS[ext] ?? '#555',
        width: 36,
        height: 44,
        fontSize: 9,
        fontWeight: 500,
        letterSpacing: 1,
      }}
    >
      {/* Folded corner */}
      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-white/25 rounded-bl" />
      {ext}
    </div>
  );
}

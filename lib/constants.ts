import type { FormatGroup } from './types';

export const FORMAT_GROUPS: FormatGroup[] = [
  {
    label: '→ PDF',
    options: [
      { mode: 'docx-to-pdf', label: 'Word → PDF',        from: 'DOCX', to: 'PDF',  accept: '.docx',      icon: '📝' },
      { mode: 'pptx-to-pdf', label: 'PowerPoint → PDF',  from: 'PPTX', to: 'PDF',  accept: '.pptx',      icon: '📊' },
      { mode: 'html-to-pdf', label: 'HTML → PDF',         from: 'HTML', to: 'PDF',  accept: '.html,.htm', icon: '🌐' },
      { mode: 'epub-to-pdf', label: 'EPUB → PDF',         from: 'EPUB', to: 'PDF',  accept: '.epub',      icon: '📚' },
    ],
  },
  {
    label: '→ Word',
    options: [
      { mode: 'pdf-to-docx',  label: 'PDF → Word',   from: 'PDF',  to: 'DOCX', accept: '.pdf',        icon: '📄' },
      { mode: 'html-to-docx', label: 'HTML → Word',  from: 'HTML', to: 'DOCX', accept: '.html,.htm',  icon: '🌐' },
      { mode: 'epub-to-docx', label: 'EPUB → Word',  from: 'EPUB', to: 'DOCX', accept: '.epub',       icon: '📚' },
    ],
  },
  {
    label: '→ HTML',
    options: [
      { mode: 'pdf-to-html',  label: 'PDF → HTML',        from: 'PDF',  to: 'HTML', accept: '.pdf',   icon: '📄' },
      { mode: 'docx-to-html', label: 'Word → HTML',        from: 'DOCX', to: 'HTML', accept: '.docx', icon: '📝' },
      { mode: 'pptx-to-html', label: 'PowerPoint → HTML',  from: 'PPTX', to: 'HTML', accept: '.pptx', icon: '📊' },
    ],
  },
  {
    label: '→ EPUB',
    options: [
      { mode: 'pdf-to-epub',  label: 'PDF → EPUB',  from: 'PDF',  to: 'EPUB', accept: '.pdf',  icon: '📄' },
      { mode: 'docx-to-epub', label: 'Word → EPUB', from: 'DOCX', to: 'EPUB', accept: '.docx', icon: '📝' },
    ],
  },
];

export const ALL_MODES = FORMAT_GROUPS.flatMap((g) => g.options);

import type { Metadata } from 'next';
import { DM_Mono, Fraunces } from 'next/font/google';
import './globals.css';

const dmMono = DM_Mono({
  subsets:  ['latin'],
  weight:   ['400', '500'],
  variable: '--font-mono',
  display:  'swap',
});

const fraunces = Fraunces({
  subsets:  ['latin'],
  weight:   ['300', '600'],
  style:    ['normal', 'italic'],
  variable: '--font-serif',
  display:  'swap',
});

export const metadata: Metadata = {
  title:       'DocConverter — PDF · DOCX · PPTX · HTML · EPUB',
  description: 'Convert between PDF, Word, PowerPoint, HTML and EPUB — processed locally on your server.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmMono.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocConverter — PDF ↔ DOCX',
  description: 'Convert PDF to Word and Word to PDF instantly',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

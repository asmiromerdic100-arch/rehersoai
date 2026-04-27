import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils/cn';

import './globals.css';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RehersoAI — Practice. Rehearse. Close.',
  description: 'AI-powered rehearsal and coaching for early-career sales reps.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen antialiased', fontSans.variable, fontMono.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

'use client';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Sidebar } from '@/components/Sidebar';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Turnex',
  description: 'Sistema de gestión para complejo deportivo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden lg:ml-64">
            <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-6 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Turnex</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">Demo Mode</span>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
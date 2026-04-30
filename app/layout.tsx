import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from './components/Navigation';
import ToastProvider from './components/ToastProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ContrôleBanqueDGSF - Contrôle des Banques',
  description: 'Plateforme de contrôle des banques par des agents de terrain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-theme="dark" className="overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden`}>
        <Navigation />
        <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 pt-20 sm:pt-24 overflow-x-hidden w-full">{children}</main>
        <ToastProvider />
      </body>
    </html>
  );
}


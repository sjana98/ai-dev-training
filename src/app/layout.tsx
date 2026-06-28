import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'TaskCo',
  description: 'Your personal task manager',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        <Providers>
          <NavBar />
          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

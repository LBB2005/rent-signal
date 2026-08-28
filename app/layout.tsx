import type { Metadata } from 'next';
import { Geist, Inter, Source_Serif_4 } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '600', '700', '800'] });
const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-source-serif', weight: ['400', '500', '600'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Rent Signal — Smart Neighborhood Research',
  description:
    'AI-powered rental research. Compare neighborhoods, check fair pricing, and see what real renters say — powered by live web data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${inter.variable} ${sourceSerif.variable} h-full`} suppressHydrationWarning>
      <body className="h-full font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

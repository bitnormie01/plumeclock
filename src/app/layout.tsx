import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'PlumeClock',
  description:
    'On-chain response clocks for satellite-detected methane super-emitters (UNEP IMEO MARS data, Base Sepolia testnet).',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

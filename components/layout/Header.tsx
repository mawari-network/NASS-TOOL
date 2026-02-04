'use client';

import { ConnectButton } from '@/components/ConnectButton';

export function Header() {
  return (
    <header className="flex justify-between items-center px-6 py-4 border-b border-gray-700/50 bg-[#0F0B1E]/80 backdrop-blur-sm sticky top-0 z-50">
      <h1 className="font-semibold text-lg text-white">NASS Tool</h1>
      <ConnectButton />
    </header>
  );
}

'use client';

import { Header } from '@/components/layout/Header';
import { StakeAndDelegate } from '@/components/deploy/StakeAndDelegate';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F0B1E] text-white flex flex-col">
      <Header />

      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#13111C]/80 rounded-xl p-8">
            <h2 className="text-2xl font-semibold mb-6">Stake & Delegate Licenses</h2>
            <StakeAndDelegate />
          </div>
        </div>
      </main>
    </div>
  );
}

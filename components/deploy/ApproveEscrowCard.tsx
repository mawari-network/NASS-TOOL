'use client';

import { Loader2 } from 'lucide-react';

export interface ApproveEscrowCardProps {
  onApprove: () => void;
  isApproving: boolean;
}

export function ApproveEscrowCard({ onApprove, isApproving }: ApproveEscrowCardProps) {
  return (
    <div className="bg-[#1A1525] p-6 rounded-lg border border-gray-700 space-y-4">
      <h3 className="text-lg font-semibold text-white">Approve Escrow</h3>
      <p className="text-sm text-gray-400">
        Approve the escrow contract once so you can create delegation offers.
      </p>
      <button
        onClick={onApprove}
        disabled={isApproving}
        className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium flex justify-center items-center gap-2"
      >
        {isApproving && <Loader2 className="w-4 h-4 animate-spin" />}
        {isApproving ? 'Approving...' : 'Approve Escrow Contract'}
      </button>
    </div>
  );
}

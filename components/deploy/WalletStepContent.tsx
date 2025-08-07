'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Loader2 } from 'lucide-react';

interface WalletStepContentProps {
  step: number;
  isConnected: boolean;
  address?: string;
  walletLabel: string;
  isVerified: boolean;
  isSigningMessage: boolean;
  isSaving?: boolean;
  onLabelChange: (label: string) => void;
  onVerify: () => void;
  onNext: (step: number) => void;
  onFinish: () => void;
}

export function WalletStepContent({
  step,
  isConnected,
  address,
  walletLabel,
  isVerified,
  isSigningMessage,
  isSaving = false,
  onLabelChange,
  onVerify,
  onNext,
  onFinish,
}: WalletStepContentProps) {
  const buttonBaseClass = "w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const primaryButtonClass = `${buttonBaseClass} bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/20`;
  
  switch (step) {
    case 0:
      return (
        <div className="mt-6 space-y-4">
          <div className="flex justify-center">
            <ConnectButton />
          </div>
          {isConnected && (
            <button
              onClick={() => onNext(1)}
              className={primaryButtonClass}
            >
              Continue
            </button>
          )}
        </div>
      );

    case 1:
      return (
        <div className="mt-6 space-y-4">
          <p className="text-gray-400 text-sm">
            Sign a message to verify you own this wallet
          </p>
          <button
            onClick={onVerify}
            disabled={isSigningMessage}
            className={primaryButtonClass}
          >
            {isSigningMessage ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing...</span>
              </div>
            ) : (
              'Sign Message'
            )}
          </button>
        </div>
      );

    case 2:
      return (
        <div className="mt-6 space-y-4">
          <input
            type="text"
            value={walletLabel}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Enter wallet name"
            className="w-full bg-[#2D2438] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
          />
          <button
            onClick={() => onNext(3)}
            disabled={!walletLabel.trim()}
            className={primaryButtonClass}
          >
            Continue
          </button>
        </div>
      );

    case 3:
      return (
        <div className="mt-6 space-y-4">
          <div className="bg-[#2D2438] p-4 rounded-lg border border-gray-700/50">
            <div className="text-sm text-gray-400">Wallet Address</div>
            <div className="text-white font-mono mt-1">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            <div className="text-sm text-gray-400 mt-3">Label</div>
            <div className="text-white mt-1">{walletLabel}</div>
          </div>
          <button
            onClick={onFinish}
            disabled={isSaving}
            className={primaryButtonClass}
          >
            {isSaving ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Wallet...</span>
              </div>
            ) : (
              'Save Wallet'
            )}
          </button>
        </div>
      );

    default:
      return null;
  }
}
'use client';

import { type Address } from 'viem';
import { Loader2, Copy, RefreshCw, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDelegatedNodes, useNodeDelegation } from '@/hooks/use-stake-info';
import { TIER_LABELS } from '@/config/deploy-constants';

function useHasAnyDelegations(staker: Address) {
  const n1 = useDelegatedNodes({ staker, tier: 1, enabled: !!staker });
  const n2 = useDelegatedNodes({ staker, tier: 2, enabled: !!staker });
  const n3 = useDelegatedNodes({ staker, tier: 3, enabled: !!staker });
  const isLoading = n1.isLoading || n2.isLoading || n3.isLoading;
  const hasAny = Boolean(
    (n1.delegatedNodes?.length ?? 0) > 0 ||
    (n2.delegatedNodes?.length ?? 0) > 0 ||
    (n3.delegatedNodes?.length ?? 0) > 0
  );
  return { hasAny, isLoading };
}

export interface ActiveDelegationsSectionProps {
  staker: Address;
  onUndelegate: (tier: number, node: Address, amount: bigint) => void;
  undelegatingKey: string | null;
  onRefreshClick: () => void;
}

export function ActiveDelegationsSection({
  staker,
  onUndelegate,
  undelegatingKey,
  onRefreshClick,
}: ActiveDelegationsSectionProps) {
  const tiers = [1, 2, 3] as const;
  const { hasAny: hasAnyDelegations, isLoading: isLoadingDelegations } = useHasAnyDelegations(staker);

  return (
    <div className="bg-[#1A1525] p-6 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">Active Stakes & Delegations</h3>
          <Info className="w-4 h-4 text-gray-500" />
        </div>
        <button
          onClick={onRefreshClick}
          className="p-2 rounded-lg hover:bg-[#2D2438] text-gray-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="pb-3 pr-4">Tier</th>
              <th className="pb-3 pr-4">Delegated To</th>
              <th className="pb-3 pr-4">Amount</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingDelegations ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                  Loading delegations...
                </td>
              </tr>
            ) : !hasAnyDelegations ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                  No active delegations. Create delegation offers or delegate licenses below to get started.
                </td>
              </tr>
            ) : (
              tiers.map((t) => (
                <DelegationRows
                  key={t}
                  staker={staker}
                  tier={t}
                  onUndelegate={onUndelegate}
                  undelegatingKey={undelegatingKey}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DelegationRows({
  staker,
  tier,
  onUndelegate,
  undelegatingKey,
}: {
  staker: Address;
  tier: 1 | 2 | 3;
  onUndelegate: (tier: number, node: Address, amount: bigint) => void;
  undelegatingKey: string | null;
}) {
  const { delegatedNodes } = useDelegatedNodes({
    staker,
    tier,
    enabled: !!staker,
  });

  if (!delegatedNodes?.length) return null;

  return (
    <>
      {delegatedNodes.map((node) => (
        <DelegationRow
          key={`${tier}-${node}`}
          staker={staker}
          tier={tier}
          node={node}
          onUndelegate={onUndelegate}
          undelegatingKey={undelegatingKey}
        />
      ))}
    </>
  );
}

function DelegationRow({
  staker,
  tier,
  node,
  onUndelegate,
  undelegatingKey,
}: {
  staker: Address;
  tier: 1 | 2 | 3;
  node: Address;
  onUndelegate: (tier: number, node: Address, amount: bigint) => void;
  undelegatingKey: string | null;
}) {
  const { toast } = useToast();
  const { delegation } = useNodeDelegation({ staker, tier, node });
  const key = `${tier}-${node}`;
  const isUndelegating = undelegatingKey === key;

  const amount =
    delegation && typeof delegation === 'object' && 'amount' in delegation
      ? (delegation as { amount: bigint }).amount
      : Array.isArray(delegation) && delegation[0] !== undefined
        ? (delegation as [bigint])[0]
        : undefined;

  const copyAddress = () => {
    navigator.clipboard.writeText(node);
    toast({ title: 'Copied', description: 'Address copied to clipboard' });
  };

  if (!amount || amount === 0n) return null;

  return (
    <tr className="border-b border-gray-700/50 hover:bg-[#2D2438]/30">
      <td className="py-3 pr-4 text-white">{TIER_LABELS[tier]}</td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-gray-300">{`${node.slice(0, 6)}...${node.slice(-6)}`}</span>
          <button
            onClick={copyAddress}
            className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-white"
            title="Copy address"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
      <td className="py-3 pr-4 text-white">{amount.toString()} licenses</td>
      <td className="py-3 pr-4">
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Active</span>
      </td>
      <td className="py-3 text-right">
        <button
          onClick={() => onUndelegate(tier, node, amount)}
          disabled={isUndelegating}
          className="px-4 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {isUndelegating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isUndelegating ? 'Processing...' : 'Undelegate'}
        </button>
      </td>
    </tr>
  );
}

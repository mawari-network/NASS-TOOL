'use client';

import { useState, useMemo } from 'react';
import { type Address, isAddress } from 'viem';
import { useAccount } from 'wagmi';
import { Loader2, CheckCircle2, Copy, RefreshCw, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useStakingDelegation } from '@/hooks/use-staking-delegation';
import { useEscrowApproval } from '@/hooks/use-escrow';
import { useDelegatedNodes, useNodeDelegation } from '@/hooks/use-stake-info';
import { useLicenseBalance } from '@/hooks/use-license-balance';

type ProcessStep = 'approve' | 'depositAndDelegate';

const TIER_LABELS: Record<number, string> = { 1: 'Gold (Tier 1)', 2: 'Silver (Tier 2)', 3: 'Bronze (Tier 3)' };

export function StakeAndDelegate() {
  const { address } = useAccount();
  const { toast } = useToast();

  const [tier, setTier] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<string>('');
  const [nodeAddress, setNodeAddress] = useState<string>('');
  const [undelegatingKey, setUndelegatingKey] = useState<string | null>(null);

  const { isApproved: isEscrowApproved, approve: approveEscrow, isTransactionPending: isApproving } = useEscrowApproval(address as Address);
  const { depositAndDelegate, undelegateAndWithdraw, refetch: refetchDelegations, isLoading: isDepositing, nodeCap } = useStakingDelegation();
  const { getBalanceForTier, isLoading: isBalanceLoading, refetch: refetchLicenseBalance } = useLicenseBalance();

  const isNotConnected = !address;
  const isValidAmount = useMemo(() => Number(amount) > 0, [amount]);
  const isValidAddress = useMemo(() => isAddress(nodeAddress), [nodeAddress]);

  const currentStep: ProcessStep = useMemo(() => {
    if (!isEscrowApproved) return 'approve';
    return 'depositAndDelegate';
  }, [isEscrowApproved]);

  const handleApprove = async () => {
    try {
      await approveEscrow();
      toast({ title: 'Approved!', description: 'You can now deposit and delegate licenses.' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Approval failed', variant: 'destructive' });
    }
  };

  const handleDepositAndDelegate = async () => {
    if (!address || !isValidAmount || !isValidAddress) return;
    try {
      await depositAndDelegate({
        tier,
        amount: BigInt(amount),
        nodeAddress: nodeAddress as Address,
      });
      toast({ title: 'Success!', description: 'Licenses deposited and delegated. Active next epoch.' });
      setAmount('');
      setNodeAddress('');
      refetchLicenseBalance();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Deposit and delegate failed', variant: 'destructive' });
    }
  };

  const handleUndelegate = async (t: number, node: Address, amt: bigint) => {
    const key = `${t}-${node}`;
    setUndelegatingKey(key);
    try {
      await undelegateAndWithdraw({ tier: t, nodeAddress: node, amount: amt });
      toast({ title: 'Success!', description: 'Licenses undelegated and withdrawn.' });
      refetchLicenseBalance();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Undelegate failed', variant: 'destructive' });
    } finally {
      setUndelegatingKey(null);
    }
  };

  const getStepStatus = (step: ProcessStep) => {
    const order = { approve: 1, depositAndDelegate: 2 };
    const currentOrder = order[currentStep];
    const stepOrder = order[step];
    if (stepOrder < currentOrder) return 'completed';
    if (stepOrder === currentOrder) return 'active';
    return 'pending';
  };

  if (isNotConnected) {
    return (
      <div className="p-6 bg-[#1A1525] border border-gray-700 rounded-lg text-center">
        <p className="text-gray-400 mb-2">Connect your wallet to deposit, delegate, and manage licenses.</p>
        <p className="text-sm text-gray-500">Use the Connect Wallet button in the top right.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Stakes & Delegations */}
      <ActiveDelegationsSection
        staker={address as Address}
        onUndelegate={handleUndelegate}
        undelegatingKey={undelegatingKey}
        onRefreshClick={refetchDelegations}
      />

      <h3 className="text-lg font-semibold text-white">Deposit & Delegate New Licenses</h3>

      <div className="flex items-center justify-between px-2">
        <StepIndicator number="1" label="Approve Escrow" status={getStepStatus('approve')} />
        <div className={`flex-1 h-[1px] mx-4 ${getStepStatus('approve') === 'completed' ? 'bg-pink-500' : 'bg-gray-700'}`} />
        <StepIndicator number="2" label="Deposit & Delegate" status={getStepStatus('depositAndDelegate')} />
      </div>

      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
        <div>
          <p className="text-green-400 font-medium text-sm">Correct wallet connected</p>
          <p className="text-green-300 text-sm opacity-80">Deposit licenses from your wallet and delegate to a node in one step</p>
        </div>
      </div>

      <div className="bg-[#1A1525] p-6 rounded-lg border border-gray-700 space-y-5">
        {currentStep === 'depositAndDelegate' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-2">License Tier</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(Number(e.target.value) as 1 | 2 | 3)}
                  className="w-full bg-[#2D2438] border border-gray-600 rounded p-2 text-white text-sm"
                  disabled={isApproving || isDepositing}
                >
                  <option value={1}>Tier 1 - Gold</option>
                  <option value={2}>Tier 2 - Silver</option>
                  <option value={3}>Tier 3 - Bronze</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2">Number of Licenses</label>
                <input
                  type="number"
                  placeholder="Enter number of licenses"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#2D2438] border border-gray-600 rounded p-2 text-white text-sm"
                  disabled={isApproving || isDepositing}
                />
                <p className="text-[12px] text-[#737373] mt-1.5">
                  Available: {isBalanceLoading ? '...' : Number(getBalanceForTier(tier)?.total ?? 0)} licenses (Max per node: {nodeCap ? Number(nodeCap) : 100})
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-2">Node Address to Delegate</label>
              <input
                type="text"
                placeholder="0x..."
                value={nodeAddress}
                onChange={(e) => setNodeAddress(e.target.value)}
                className={`w-full bg-[#2D2438] border rounded p-2 text-white text-sm font-mono ${
                  nodeAddress && !isValidAddress ? 'border-red-500' : 'border-gray-600'
                }`}
                disabled={isApproving || isDepositing}
              />
            </div>
          </>
        )}

        <div className="pt-2">
          {currentStep === 'approve' && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium flex justify-center items-center gap-2"
            >
              {isApproving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isApproving ? 'Approving Escrow...' : 'Approve Escrow Contract'}
            </button>
          )}

          {currentStep === 'depositAndDelegate' && (
            <button
              onClick={handleDepositAndDelegate}
              disabled={isDepositing || !isValidAmount || !isValidAddress}
              className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {isDepositing && <Loader2 className="w-4 h-4 animate-spin" />}
              {isDepositing ? 'Processing...' : `Deposit & Delegate ${amount || 0} Licenses`}
            </button>
          )}
        </div>

        <p className="text-xs text-center text-gray-500">
          {currentStep === 'approve' && 'Approve the escrow contract so licenses can be deposited and delegated.'}
          {currentStep === 'depositAndDelegate' && 'Licenses will be deposited from your wallet and delegated in one transaction. Active next epoch.'}
        </p>
      </div>
    </div>
  );
}

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

/* ──────────────────────────────────────────────────────────────────── */
/* Active Delegations Table                                             */
/* ──────────────────────────────────────────────────────────────────── */
function ActiveDelegationsSection({
  staker,
  onUndelegate,
  undelegatingKey,
  onRefreshClick,
}: {
  staker: Address;
  onUndelegate: (tier: number, node: Address, amount: bigint) => void;
  undelegatingKey: string | null;
  onRefreshClick: () => void;
}) {
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
                  No active delegations. Deposit and delegate licenses below to get started.
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

  const amount = delegation && typeof delegation === 'object' && 'amount' in delegation
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
          <span className="font-mono text-gray-300">
            {`${node.slice(0, 6)}...${node.slice(-6)}`}
          </span>
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

function StepIndicator({
  number,
  label,
  status,
}: {
  number: string;
  label: string;
  status: 'active' | 'completed' | 'pending';
}) {
  const circleBase = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300';
  const textBase = 'ml-3 text-sm font-medium whitespace-nowrap transition-colors duration-300';

  let circleColor = 'bg-gray-700 text-gray-400';
  let textColor = 'text-gray-500';

  if (status === 'active') {
    circleColor = 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]';
    textColor = 'text-pink-400';
  } else if (status === 'completed') {
    circleColor = 'bg-green-500 text-white';
    textColor = 'text-green-400';
  }

  return (
    <div className="flex items-center">
      <div className={`${circleBase} ${circleColor}`}>
        {status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : number}
      </div>
      <span className={`${textBase} ${textColor}`}>{label}</span>
    </div>
  );
}

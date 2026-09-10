'use client';

import { useState, useCallback, useMemo } from 'react';
import { type Address, isAddress } from 'viem';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLicense } from '@/hooks/use-license';
import { useDelegationNode } from '@/hooks/use-delegation-node';
import { useDelegationOffers, type BatchOfferParam } from '@/hooks/use-delegation-offers';
import {
  TIER_LABELS,
  TIERS,
  NODE_CAP,
  MAX_OFFER_ROWS,
  type Tier,
} from '@/config/deploy-constants';

interface OfferRow {
  id: string;
  tier: Tier;
  nodeAddress: string;
  amount: string;
}

function createEmptyRow(): OfferRow {
  return {
    id: crypto.randomUUID(),
    tier: 1,
    nodeAddress: '',
    amount: '',
  };
}

function mergeOfferRows(rows: OfferRow[]): BatchOfferParam[] {
  const merged = new Map<string, BatchOfferParam>();

  for (const row of rows) {
    if (!isAddress(row.nodeAddress) || !row.amount || Number(row.amount) <= 0) continue;

    const key = `${row.tier}-${row.nodeAddress.toLowerCase()}`;
    const existing = merged.get(key);
    const amount = Number(row.amount);

    if (existing) {
      existing.amount += amount;
    } else {
      merged.set(key, {
        to: row.nodeAddress as Address,
        tier: row.tier,
        amount,
      });
    }
  }

  return Array.from(merged.values());
}

export function CreateOfferForm() {
  const { toast } = useToast();
  const { balances, isLoading, isApprovedForDelegation, approve, isApproving, refetch } =
    useLicense();
  const { getNodeTotalActiveCount } = useDelegationNode();
  const { batchCreateOffer } = useDelegationOffers();

  const [rows, setRows] = useState<OfferRow[]>([createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nodeCapacities, setNodeCapacities] = useState<Map<string, bigint>>(new Map());

  const getAvailableLicenses = useCallback(
    (tier: Tier) => {
      const balance = balances.find((b) => b.tier === tier);
      return balance ? Number(balance.total) : 0;
    },
    [balances],
  );

  const fetchNodeCapacity = useCallback(
    async (nodeAddress: string) => {
      if (!isAddress(nodeAddress)) return;
      const key = nodeAddress.toLowerCase();
      try {
        const count = await getNodeTotalActiveCount(nodeAddress as Address);
        setNodeCapacities((prev) => {
          if (prev.has(key)) return prev;
          return new Map(prev).set(key, count);
        });
      } catch {
        setNodeCapacities((prev) => {
          if (prev.has(key)) return prev;
          return new Map(prev).set(key, 0n);
        });
      }
    },
    [getNodeTotalActiveCount],
  );

  const updateRow = useCallback((id: string, updates: Partial<OfferRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...updates } : row)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => (prev.length >= MAX_OFFER_ROWS ? prev : [...prev, createEmptyRow()]));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
  }, []);

  const nodeOfferTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of rows) {
      if (!isAddress(row.nodeAddress) || !row.amount || Number(row.amount) <= 0) continue;
      const key = row.nodeAddress.toLowerCase();
      totals.set(key, (totals.get(key) ?? 0) + Number(row.amount));
    }
    return totals;
  }, [rows]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    const tierTotals: Record<Tier, number> = { 1: 0, 2: 0, 3: 0 };
    const nodeTotals = new Map<string, number>();

    for (const row of rows) {
      if (!row.nodeAddress || !row.amount) continue;

      if (!isAddress(row.nodeAddress)) {
        errors.push('Invalid node address');
        continue;
      }

      const amount = Number(row.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push('Amount must be positive');
        continue;
      }

      tierTotals[row.tier] += amount;

      const nodeKey = row.nodeAddress.toLowerCase();
      nodeTotals.set(nodeKey, (nodeTotals.get(nodeKey) ?? 0) + amount);
    }

    for (const tier of TIERS) {
      const available = getAvailableLicenses(tier);
      if (tierTotals[tier] > available) {
        errors.push(
          `Insufficient Tier ${tier} licenses (need ${tierTotals[tier]}, have ${available})`,
        );
      }
    }

    for (const [nodeKey, total] of nodeTotals) {
      const currentCount = nodeCapacities.get(nodeKey) ?? 0n;
      const projectedTotal = Number(currentCount) + total;
      if (projectedTotal > NODE_CAP) {
        errors.push(
          `Node ${nodeKey.slice(0, 6)}... exceeds capacity (${projectedTotal}/${NODE_CAP})`,
        );
      }
    }

    const validRows = rows.filter(
      (r) => isAddress(r.nodeAddress) && r.amount && Number(r.amount) > 0,
    );

    return {
      isValid: errors.length === 0 && validRows.length > 0,
      errors: [...new Set(errors)],
      validRowCount: validRows.length,
    };
  }, [rows, getAvailableLicenses, nodeCapacities]);

  const handleSubmit = async () => {
    if (!validation.isValid) return;

    setIsSubmitting(true);
    try {
      if (!isApprovedForDelegation) {
        await approve();
      }

      const params = mergeOfferRows(rows);
      await batchCreateOffer(params);

      toast({
        title: 'Offers created',
        description: `Created ${params.length} delegation offer${params.length > 1 ? 's' : ''}.`,
      });

      setRows([createEmptyRow()]);
      setNodeCapacities(new Map());
      refetch();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create offers',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || isApproving;

  return (
    <div className="bg-[#1A1525] p-6 rounded-lg border border-gray-700 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Create delegation offers</h3>
        <p className="text-sm text-gray-400 mt-1">
          Offer licenses to node addresses. Recipients can accept later. Up to {MAX_OFFER_ROWS}{' '}
          rows; duplicate tier+node entries are merged on submit.
        </p>
      </div>

      {!isApprovedForDelegation && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Escrow approval required before creating offers. Submit will prompt approval first.
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => {
          const nodeKey = row.nodeAddress.toLowerCase();
          const currentCount = nodeCapacities.get(nodeKey);
          const nodeOfferTotal = nodeOfferTotals.get(nodeKey) ?? 0;
          const projectedTotal =
            currentCount !== undefined ? Number(currentCount) + nodeOfferTotal : null;
          const capacityPct =
            projectedTotal !== null ? Math.min((projectedTotal / NODE_CAP) * 100, 100) : null;

          return (
            <div
              key={row.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_1fr_auto] gap-3 items-end p-3 rounded-lg bg-[#2D2438]/50 border border-gray-700/50"
            >
              <div>
                <label className="text-xs text-gray-400 block mb-1">Tier</label>
                <select
                  value={row.tier}
                  onChange={(e) => updateRow(row.id, { tier: Number(e.target.value) as Tier })}
                  className="w-full bg-[#2D2438] border border-gray-600 rounded p-2 text-white text-sm"
                  disabled={isBusy}
                >
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {TIER_LABELS[t]} ({getAvailableLicenses(t)} avail.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Node address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={row.nodeAddress}
                  onChange={(e) => updateRow(row.id, { nodeAddress: e.target.value })}
                  onBlur={() => fetchNodeCapacity(row.nodeAddress)}
                  className={`w-full bg-[#2D2438] border rounded p-2 text-white text-sm font-mono ${
                    row.nodeAddress && !isAddress(row.nodeAddress)
                      ? 'border-red-500'
                      : 'border-gray-600'
                  }`}
                  disabled={isBusy}
                />
                {capacityPct !== null && (
                  <div className="mt-1.5">
                    <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                      <span>Node capacity</span>
                      <span>
                        {projectedTotal}/{NODE_CAP}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          projectedTotal !== null && projectedTotal > NODE_CAP
                            ? 'bg-red-500'
                            : capacityPct > 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount</label>
                <input
                  type="number"
                  min={1}
                  placeholder="0"
                  value={row.amount}
                  onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                  className="w-full bg-[#2D2438] border border-gray-600 rounded p-2 text-white text-sm"
                  disabled={isBusy}
                />
              </div>

              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1 || isBusy}
                className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Remove row"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {rows.length < MAX_OFFER_ROWS && (
        <button
          type="button"
          onClick={addRow}
          disabled={isBusy}
          className="flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add row ({rows.length}/{MAX_OFFER_ROWS})
        </button>
      )}

      {validation.errors.length > 0 && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 space-y-1">
          {validation.errors.map((err) => (
            <p key={err} className="text-sm text-red-300">
              {err}
            </p>
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isBusy || isLoading || !validation.isValid}
        className="w-full py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {(isBusy || isLoading) && <Loader2 className="w-4 h-4 animate-spin" />}
        {isApproving
          ? 'Approving escrow...'
          : isSubmitting
            ? 'Creating offers...'
            : !isApprovedForDelegation
              ? 'Approve & create offers'
              : `Create ${validation.validRowCount} offer${validation.validRowCount !== 1 ? 's' : ''}`}
      </button>
    </div>
  );
}

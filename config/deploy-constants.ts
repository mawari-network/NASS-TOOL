export const TIER_LABELS: Record<number, string> = {
  1: 'Gold (Tier 1)',
  2: 'Silver (Tier 2)',
  3: 'Bronze (Tier 3)',
};

export const TIERS = [1, 2, 3] as const;
export type Tier = (typeof TIERS)[number];

/** Max licenses a node can hold (delegation contract NODE_CAP). */
export const NODE_CAP = 100;

export const MAX_OFFER_ROWS = 20;

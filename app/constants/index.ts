// ─── Subscription ────────────────────────────────────────────────
export const SUBSCRIPTION_KEY = 'signmypdf_subscribed';
export const DAILY_LIMIT = 2;

// ─── Paddle ──────────────────────────────────────────────────────
export const PADDLE_CLIENT_TOKEN = 'live_63effd9da9446a56e2d73f7a280';
export const PADDLE_PRICE_MONTHLY = 'pri_01kpea3gjy6wkgdha3qwbhr1dd';
export const PADDLE_PRICE_ANNUAL  = 'pri_01kpea99a37j2ecg9vxq8xr9zt';

// ─── Paywall display pricing (single source of truth) ────────────
// Keep in sync with Paddle; price IDs above are the billing source of truth.
// Annual "savings" = monthly*12 − annualTotal = $9*12 − $90 = $18.
export const PAYWALL_PRICES = {
  monthly: {
    label: 'Monthly',
    displayPrice: '$9',
    displayUnit: '/mo',
    subtitle: 'Billed monthly · Cancel anytime',
    ctaText: 'Start Monthly — $9/mo',
  },
  annual: {
    label: 'Annual',
    displayPrice: '$7.50',
    displayUnit: '/mo',
    subtitle: 'Billed $90/year · Unlimited PDFs',
    badge: 'SAVE 17%',
    ctaText: 'Start Annual — $90/year · Save $18',
  },
} as const;

export const PAYWALL_DEFAULT_TARIFF: 'monthly' | 'annual' = 'annual';

// ─── Draft (Fill tool) ───────────────────────────────────────────
export const DRAFT_KEY = 'signmypdf_draft_v1';

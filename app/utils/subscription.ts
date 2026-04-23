import { SUBSCRIPTION_KEY, DAILY_LIMIT } from '../constants';

// ─── Today's signing count (shared by /sign and /fill) ────────────
function todayKey(): string {
  const today = new Date().toISOString().split('T')[0];
  return `signmypdf_count_${today}`;
}

export function getTodayCount(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(todayKey());
  return raw ? parseInt(raw, 10) : 0;
}

export function incrementTodayCount(): void {
  const count = getTodayCount();
  localStorage.setItem(todayKey(), String(count + 1));
}

export function isOverDailyLimit(): boolean {
  return getTodayCount() >= DAILY_LIMIT;
}

// ─── Today's /protect count (independent from /sign and /fill) ────
function todayProtectKey(): string {
  const today = new Date().toISOString().split('T')[0];
  return `signmypdf_protect_count_${today}`;
}

export function getTodayProtectCount(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(todayProtectKey());
  return raw ? parseInt(raw, 10) : 0;
}

export function incrementTodayProtectCount(): void {
  const count = getTodayProtectCount();
  localStorage.setItem(todayProtectKey(), String(count + 1));
}

export function isOverDailyProtectLimit(): boolean {
  return getTodayProtectCount() >= DAILY_LIMIT;
}

// ─── Subscription status ─────────────────────────────────────────
export function isSubscribed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SUBSCRIPTION_KEY) === 'true';
}

export function activateSubscription(): void {
  localStorage.setItem(SUBSCRIPTION_KEY, 'true');
}

export function isProActive(): boolean {
  if (typeof window === 'undefined') return false;
  const devMode = window.location.search.includes('dev=1');
  return isSubscribed() || devMode;
}

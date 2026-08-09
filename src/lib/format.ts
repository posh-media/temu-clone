/**
 * Currency handling. The Firestore `orders` documents use Paystack + Nigerian
 * addresses and product prices sit in the tens-of-thousands range, so the
 * catalogue is priced in NGN. Kept in one place so it can be swapped later.
 */
export const CURRENCY = { code: "NGN", symbol: "\u20A6", locale: "en-NG" } as const;

const money = new Intl.NumberFormat(CURRENCY.locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const moneyWhole = new Intl.NumberFormat(CURRENCY.locale, { maximumFractionDigits: 0 });

/** `12,499.00` with the currency symbol, e.g. ₦12,499.00 */
export function formatPrice(value: number, opts: { decimals?: boolean } = {}) {
  const decimals = opts.decimals ?? true;
  const safe = Number.isFinite(value) ? value : 0;
  return `${CURRENCY.symbol}${decimals ? money.format(safe) : moneyWhole.format(safe)}`;
}

/** Splits a price so the UI can render the fraction at a smaller size. */
export function splitPrice(value: number) {
  const safe = Number.isFinite(value) ? Math.max(value, 0) : 0;
  const [whole, fraction = "00"] = money.format(safe).split(".");
  return { symbol: CURRENCY.symbol, whole, fraction };
}

/** `6,000` -> `6K+`, `1,200,000` -> `1.2M+` (Temu-style sold counts). */
export function formatCompact(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value < 1000) return String(Math.round(value));
  if (value < 1_000_000) {
    const k = value / 1000;
    return `${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}K`;
  }
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function formatRating(value: number) {
  return (Number.isFinite(value) ? value : 0).toFixed(1);
}

export function formatPercent(value: number) {
  return `${Math.round(Number.isFinite(value) ? value : 0)}%`;
}

/** Tolerant date parsing: Firestore Timestamps, ISO strings and Dates. */
export function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const fn = (value as { toDate: () => Date }).toDate;
    if (typeof fn === "function") return fn.call(value);
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

export function formatDate(value: unknown, opts?: Intl.DateTimeFormatOptions) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", opts ?? { day: "numeric", month: "short", year: "numeric" });
}

/** `Mar 12` style short label used in delivery estimates. */
export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Relative label used in review lists, e.g. "3 months ago". */
export function formatRelative(value: unknown) {
  const date = toDate(value);
  if (!date) return "";
  const diffDays = Math.round((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays < 0) return formatDate(date);
  if (diffDays < 1) return "Today";
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7);
    return `${w} week${w > 1 ? "s" : ""} ago`;
  }
  if (diffDays < 365) {
    const m = Math.floor(diffDays / 30);
    return `${m} month${m > 1 ? "s" : ""} ago`;
  }
  const y = Math.floor(diffDays / 365);
  return `${y} year${y > 1 ? "s" : ""} ago`;
}

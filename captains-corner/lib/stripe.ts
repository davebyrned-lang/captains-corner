import Stripe from "stripe";

/**
 * All Stripe wiring in one place.
 *
 * The season pass is deliberately built on a yearly subscription rather than a
 * one-off payment, because Stripe only offers free trials on subscriptions.
 * We immediately schedule it to cancel at the end of the season, so it takes a
 * single payment and never renews. Premier has no trial, so it is a plain
 * one-off payment.
 */

export const PRICE_CLASSIC = process.env.STRIPE_PRICE_CLASSIC ?? "";
export const PRICE_PREMIER = process.env.STRIPE_PRICE_PREMIER ?? "";
/**
 * The difference between the two tiers, for someone who has already paid for
 * Classic. Charging the full $25 on top of their $10 would mean $35 for a $25
 * product, which is how you generate refund requests instead of upgrades.
 */
export const PRICE_UPGRADE = process.env.STRIPE_PRICE_UPGRADE ?? "";

export const TRIAL_DAYS = Math.max(
  0,
  Math.min(90, parseInt(process.env.TRIAL_DAYS ?? "30", 10) || 30)
);

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-10-29.clover" as Stripe.LatestApiVersion });
}

export const stripeConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && PRICE_CLASSIC && PRICE_PREMIER);

/** Unix seconds for the end of this season, used to stop the pass renewing. */
export function seasonEndUnix(now = new Date()): number {
  const year = now.getUTCMonth() >= 5 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return Math.floor(Date.UTC(year, 4, 31, 23, 59, 59) / 1000);
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

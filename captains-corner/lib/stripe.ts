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

/**
 * Four prices: each tier billed monthly or annually. Monthly carries the free
 * first month; annual is discounted instead, so it charges straight away.
 */
export const PRICES = {
  classic: {
    monthly: process.env.STRIPE_PRICE_CLASSIC_MONTHLY ?? "",
    annual: process.env.STRIPE_PRICE_CLASSIC_ANNUAL ?? "",
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIER_MONTHLY ?? "",
    annual: process.env.STRIPE_PRICE_PREMIER_ANNUAL ?? "",
  },
} as const;

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
  Boolean(
    process.env.STRIPE_SECRET_KEY &&
      PRICES.classic.monthly &&
      PRICES.classic.annual &&
      PRICES.premium.monthly &&
      PRICES.premium.annual
  );

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

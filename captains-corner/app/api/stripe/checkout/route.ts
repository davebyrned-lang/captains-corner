import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getProfile } from "@/lib/user";
import { stripeClient, stripeConfigured, PRICES, TRIAL_DAYS, siteUrl } from "@/lib/stripe";
import type { Period, TierId } from "@/lib/tiers";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not switched on yet." }, { status: 503 });
  }

  const profile = await getProfile();
  if (!profile.userId) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  let tier: TierId;
  let period: Period;
  try {
    const body = await req.json();
    tier = String(body.tier ?? "") as TierId;
    period = (String(body.period ?? "monthly") === "annual" ? "annual" : "monthly") as Period;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (tier !== "classic" && tier !== "premium") {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const stripe = stripeClient()!;

  /**
   * Someone who already subscribes is switching plans, not buying a new one.
   * Stripe's billing portal handles that with correct proration, so send them
   * there rather than creating a second subscription they would be billed for.
   */
  if (profile.plan !== "free" && profile.stripeCustomerId) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripeCustomerId,
        return_url: siteUrl(),
      });
      return NextResponse.json({ url: session.url, switching: true });
    } catch (e) {
      console.warn("Portal switch failed, falling through to checkout:", e);
    }
  }

  const price = PRICES[tier][period];
  if (!price) {
    return NextResponse.json({ error: "That plan is not available yet." }, { status: 503 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      // The free first month is a monthly-plan promise. Annual is discounted
      // instead, so it charges straight away.
      subscription_data: {
        ...(period === "monthly" ? { trial_period_days: TRIAL_DAYS } : {}),
        metadata: { clerkUserId: profile.userId, tier, period },
      },
      client_reference_id: profile.userId,
      customer: profile.stripeCustomerId ?? undefined,
      customer_email: profile.stripeCustomerId ? undefined : email,
      metadata: { clerkUserId: profile.userId, tier, period },
      success_url: `${siteUrl()}/?upgraded=${tier}`,
      cancel_url: `${siteUrl()}/?cancelled=1`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("Checkout failed:", detail);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again.", detail },
      { status: 500 }
    );
  }
}

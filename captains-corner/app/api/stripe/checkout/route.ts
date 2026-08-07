import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getProfile } from "@/lib/user";
import {
  stripeClient,
  stripeConfigured,
  PRICE_CLASSIC,
  PRICE_PREMIER,
  PRICE_UPGRADE,
  TRIAL_DAYS,
  siteUrl,
} from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not switched on yet." },
      { status: 503 }
    );
  }

  const profile = await getProfile();
  if (!profile.userId) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  let tier: string;
  try {
    const body = await req.json();
    tier = String(body.tier ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (tier !== "classic" && tier !== "premium") {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const stripe = stripeClient()!;
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  /**
   * Someone on Classic who has actually been charged pays only the difference.
   * Someone still inside their free month has paid nothing yet, so they pay the
   * full Premier price. Telling those two apart matters: getting it wrong means
   * either overcharging a customer or giving the product away.
   */
  let premierPrice = PRICE_PREMIER;
  let upgrading = false;

  if (tier === "premium" && profile.plan === "classic" && profile.stripeCustomerId) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: profile.stripeCustomerId,
        status: "all",
        limit: 20,
      });
      const hasPaid = subs.data.some((s) => s.status === "active");
      if (hasPaid && PRICE_UPGRADE) {
        premierPrice = PRICE_UPGRADE;
        upgrading = true;
      }
    } catch (e) {
      // If we cannot tell, charge full price rather than risk undercharging.
      console.warn("Could not check subscription status:", e instanceof Error ? e.message : e);
    }
  }

  try {
    const session = await stripe.checkout.sessions.create(
      tier === "classic"
        ? {
            // Subscription purely so Stripe can run the free trial for us.
            // The webhook schedules it to cancel at the end of the season.
            mode: "subscription",
            line_items: [{ price: PRICE_CLASSIC, quantity: 1 }],
            subscription_data: {
              trial_period_days: TRIAL_DAYS,
              metadata: { clerkUserId: profile.userId, tier: "classic" },
            },
            client_reference_id: profile.userId,
            customer_email: profile.stripeCustomerId ? undefined : email,
            customer: profile.stripeCustomerId ?? undefined,
            metadata: { clerkUserId: profile.userId, tier: "classic" },
            success_url: `${siteUrl()}/?upgraded=classic`,
            cancel_url: `${siteUrl()}/?cancelled=1`,
            allow_promotion_codes: true,
          }
        : {
            mode: "payment",
            line_items: [{ price: premierPrice, quantity: 1 }],
            client_reference_id: profile.userId,
            customer_email: profile.stripeCustomerId ? undefined : email,
            customer: profile.stripeCustomerId ?? undefined,
            metadata: {
              clerkUserId: profile.userId,
              tier: "premium",
              upgrade: upgrading ? "1" : "0",
            },
            success_url: `${siteUrl()}/?upgraded=premier`,
            cancel_url: `${siteUrl()}/?cancelled=1`,
            allow_promotion_codes: true,
          }
    );

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

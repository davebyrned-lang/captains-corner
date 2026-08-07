import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripeClient, seasonEndUnix } from "@/lib/stripe";
import { setPlan, seasonEnd, type Plan } from "@/lib/user";
import { clerkClient } from "@clerk/nextjs/server";

/** Reads a user's current plan without needing a request session. */
async function getProfile2(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const md = (user.privateMetadata ?? {}) as Record<string, unknown>;
    return typeof md.plan === "string" ? md.plan : "free";
  } catch {
    return "free";
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Stripe tells us when money actually moves. Never trust the browser for this:
 * a user can fake a redirect to the success page, but they cannot fake a signed
 * webhook.
 */
export async function POST(req: NextRequest) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (e) {
    console.error("Webhook signature check failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id ?? s.metadata?.clerkUserId;
        const tier = (s.metadata?.tier ?? "classic") as Plan;
        if (!userId) break;

        await setPlan(
          userId,
          tier,
          seasonEnd(),
          typeof s.customer === "string" ? s.customer : undefined
        );

        // A season pass must not quietly renew next August. Stripe has no
        // "one billing cycle then stop", so we schedule the cancellation now.
        if (s.mode === "subscription" && typeof s.subscription === "string") {
          await stripe.subscriptions.update(s.subscription, {
            cancel_at: seasonEndUnix(),
            metadata: { clerkUserId: userId, tier: "classic" },
          });
        }

        // Upgrading to Premier mid-trial must not leave the Classic
        // subscription running, or they get billed $10 on top of the $25.
        if (tier === "premium" && typeof s.customer === "string") {
          const subs = await stripe.subscriptions.list({
            customer: s.customer,
            status: "all",
            limit: 20,
          });
          for (const sub of subs.data) {
            if (sub.status === "trialing" || sub.status === "active") {
              await stripe.subscriptions.cancel(sub.id);
            }
          }
        }
        break;
      }

      // Trial ended and the card was declined, or the pass was cancelled.
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const obj = event.data.object as
          | Stripe.Subscription
          | Stripe.Invoice;
        const userId =
          (obj as Stripe.Subscription).metadata?.clerkUserId ??
          (obj as Stripe.Invoice).metadata?.clerkUserId;
        if (!userId) break;

        // Only downgrade if they are still on the plan this subscription paid
        // for. A Premier upgrade cancels the Classic sub on purpose, and that
        // must not strip the Premier access we just granted.
        const tierOfSub = (obj as Stripe.Subscription).metadata?.tier ?? "classic";
        const current = await getProfile2(userId);
        if (current === tierOfSub) {
          await setPlan(userId, "free", new Date().toISOString());
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("Webhook handling failed:", e instanceof Error ? e.message : e);
    // 500 makes Stripe retry, which is what we want for a transient failure.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

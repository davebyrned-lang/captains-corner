import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripeClient } from "@/lib/stripe";
import { setPlan, seasonEnd, type Plan } from "@/lib/user";
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

        if (s.mode === "subscription" && typeof s.subscription === "string") {
          await stripe.subscriptions.update(s.subscription, {
            metadata: { clerkUserId: userId, tier },
          });
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
        if (userId) await setPlan(userId, "free", new Date().toISOString());
        break;
      }

      // A switch between Classic and Premier happens in the billing portal,
      // so Stripe is the source of truth for which plan someone is on.
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.clerkUserId;
        if (!userId) break;

        if (sub.status === "active" || sub.status === "trialing") {
          const tier = (sub.metadata?.tier ?? "classic") as Plan;
          await setPlan(userId, tier, seasonEnd());
        } else if (["canceled", "unpaid", "incomplete_expired"].includes(sub.status)) {
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

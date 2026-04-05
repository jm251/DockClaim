import { NextResponse } from "next/server";
import Stripe from "stripe";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/billing";

export const runtime = "nodejs";

function mapStripeStatus(status: string) {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
      return "CANCELED";
    default:
      return "INACTIVE";
  }
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: true, configured: false });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const organizationId = session.metadata?.organizationId;
      if (organizationId) {
        await prisma.subscription.upsert({
          where: { organizationId },
          update: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            status: "ACTIVE",
          },
          create: {
            organizationId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            status: "ACTIVE",
          },
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const currentPeriodEnd =
        (subscription as unknown as { current_period_end?: number }).current_period_end ??
        (subscription as unknown as { items?: { data?: Array<{ current_period_end?: number }> } }).items?.data?.[0]
          ?.current_period_end;
      await prisma.subscription.updateMany({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          status: mapStripeStatus(subscription.status) as
            | "ACTIVE"
            | "TRIALING"
            | "PAST_DUE"
            | "CANCELED"
            | "INACTIVE",
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
        },
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

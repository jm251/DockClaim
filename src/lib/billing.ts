import Stripe from "stripe";

import { env, featureFlags } from "@/lib/env";

export function getSubscriptionPresentation(
  subscription:
    | {
        status: string;
        trialEndsAt: Date | null;
        currentPeriodEnd: Date | null;
      }
    | null
    | undefined,
  authMode: "demo" | "supabase",
) {
  const now = new Date();
  const trialActive = Boolean(subscription?.trialEndsAt && subscription.trialEndsAt > now);
  const active = subscription?.status === "ACTIVE";
  const gated = featureFlags.isStripeConfigured && authMode !== "demo" && !active && !trialActive;

  return {
    configured: featureFlags.isStripeConfigured,
    gated,
    active,
    trialActive,
    status: subscription?.status ?? "UNCONFIGURED",
    trialEndsAt: subscription?.trialEndsAt ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
  };
}

export function getStripeClient() {
  if (!featureFlags.isStripeConfigured || !env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(env.STRIPE_SECRET_KEY);
}

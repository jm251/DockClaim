import Link from "next/link";
import { ArrowRight, CheckCircle2, FileStack, TimerReset, WalletCards } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Import loads from your TMS CSV",
    description: "Map columns once, preview rows, and convert exported spreadsheet noise into structured claim-ready loads.",
    icon: FileStack,
  },
  {
    title: "Review evidence and timestamps",
    description: "Upload BOLs, PODs, lumper receipts, screenshots, and emails, then reconcile extracted data with manual review.",
    icon: CheckCircle2,
  },
  {
    title: "Calculate missed accessorials deterministically",
    description: "Detention, layover, TONU, and lumper reimbursement use customer and facility rules, not guesswork.",
    icon: TimerReset,
  },
  {
    title: "Send clean claims and track recovery",
    description: "Generate claim packages, send draft emails, and monitor recovered revenue without another spreadsheet.",
    icon: WalletCards,
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-[40px] border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-panel sm:p-8 lg:p-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-6">
            <p className="text-eyebrow text-[var(--primary)]">DockClaim for freight brokers</p>
            <div className="space-y-4">
              <h1 className="font-display text-fluid-4xl max-w-4xl font-semibold text-balance text-[var(--foreground)]">
                Recover missed detention, layover, TONU, and lumper revenue without spreadsheet churn.
              </h1>
              <p className="text-fluid-lg max-w-2xl text-[var(--muted-foreground)]">
                DockClaim imports loads, centralizes support docs, applies deterministic rules, and turns stalled
                accessorial work into a claim queue your ops and billing teams can actually manage.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link href="/signup">
                <Button size="lg">
                  Start DockClaim
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid w-full max-w-xl gap-4 md:grid-cols-2">
            <Card className="bg-[var(--secondary)] text-[var(--secondary-foreground)]">
              <CardHeader>
                <CardTitle className="font-display text-fluid-lg text-[var(--secondary-foreground)]">4 claim types</CardTitle>
                <CardDescription className="text-white/80">Detention, layover, TONU, lumper</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-fluid-lg">CSV to claim package</CardTitle>
                <CardDescription>Import, review, calculate, and send from one workflow.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-fluid-lg">Deterministic math</CardTitle>
                <CardDescription>AI suggests evidence only. Billing logic remains explicit and reviewable.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-fluid-lg">Billing-aware MVP</CardTitle>
                <CardDescription>14-day trial, Stripe checkout, and graceful fallbacks when integrations are missing.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardHeader>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(192,118,59,0.14)] text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="font-display mt-4 text-fluid-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-fluid-xl">Simple pricing posture for the MVP</CardTitle>
            <CardDescription>
              One monthly subscription, invite-based team access, demo mode for evaluation, and no dependency on direct
              TMS integrations for v1.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-fluid-sm max-w-2xl text-[var(--muted-foreground)]">
              DockClaim is built for brokerages still living in shared inboxes, PDFs, and spreadsheets. It focuses on
              revenue recovery workflows instead of trying to replace your TMS.
            </p>
            <Link href="/signup">
              <Button>Start 14-day trial</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

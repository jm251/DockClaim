# DockClaim Architecture

## Stack

- Next.js App Router with React 19 and Tailwind CSS.
- Prisma ORM on PostgreSQL.
- Supabase Auth for primary auth state.
- Cloudinary for document storage.
- SMTP via Nodemailer for outbound email.
- FastRouter as the AI extraction and email-polish provider.
- Stripe for subscription checkout and webhook state sync.

## Application shape

- `src/app`: routes, layouts, server actions, route handlers.
- `src/components`: UI primitives, app shell, tables, and forms.
- `src/lib`: env/config, auth/session bootstrap, provider adapters, claim/rules/import services, and data queries.
- `prisma`: schema and seed logic.
- `tests`: Vitest unit/integration tests plus Playwright E2E coverage.

## Tenant model

- Every domain record is tied to `organizationId`.
- Server-side queries scope by the active organization before returning data.
- First authenticated access bootstraps a `User`, `Organization`, `Membership`, `Subscription`, and default `RuleSet`.
- Demo mode bypasses Supabase session requirements with a seeded organization-scoped cookie.

## Core workflow

1. User signs in with Supabase or enters demo mode.
2. CSV import creates loads and stops, then recalculates accessorial candidates.
3. Documents upload to Cloudinary and optionally run through FastRouter extraction.
4. Reviewed timestamps and amounts feed the deterministic rules engine.
5. Eligible candidates roll into a single claim per load.
6. Claim drafts generate outbound email content and a downloadable PDF.
7. Billing state is enforced at the workspace route-group level when Stripe is configured.

## Rules engine

- Rule precedence: facility-specific customer rule, then customer-wide rule, then organization default.
- Detention math is deterministic and stored with calculation metadata.
- Layover and TONU are evidence-driven with `NEEDS_REVIEW` when support is incomplete.
- Lumper reimbursement uses receipt/manual amounts with optional caps.

## Degradation strategy

- Missing Stripe: billing page shows unconfigured state, app remains usable.
- Missing SMTP: invite and claim-send flows expose copyable links/drafts instead of failing.
- Missing AI: document upload still works, extraction becomes manual review.
- Missing Supabase config: demo mode remains available, but production auth flows are unavailable.

# DockClaim

DockClaim is a production-sensible MVP micro-SaaS for freight brokers recovering missed accessorial revenue from detention, layover, TONU, and lumper reimbursement.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Supabase Auth
- Cloudinary uploads
- SMTP mail delivery via Nodemailer
- FastRouter AI extraction
- Stripe subscriptions
- Vitest + Playwright

## Local setup

1. Install dependencies:

```bash
corepack pnpm install
```

2. Copy the example env file and fill in the values you have:

```bash
copy .env.example .env
```

3. Generate Prisma client and run migrations:

```bash
corepack pnpm db:generate
corepack pnpm db:migrate
```

For production deployments, use:

```bash
corepack pnpm db:migrate:deploy
```

4. Seed demo data:

```bash
corepack pnpm db:seed
```

5. Start the app:

```bash
corepack pnpm dev
```

## Environment variables

The app reads the following variables from [`.env.example`](e:\DockClaim\.env.example):

- `APP_NAME`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `DEMO_MODE`
- `FASTROUTER_API_KEY`
- `FASTROUTER_API_URL`
- `FASTROUTER_MODEL`
- `AI_FEATURES_ENABLED`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `SMTP_FROM_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_ID`
- `SUPABASE_SERVICE_ROLE_KEY` optional for seed/admin helpers only

Only `NEXT_PUBLIC_*` values are safe for the browser.

## Commands

```bash
corepack pnpm dev
corepack pnpm build
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:migrate:deploy
corepack pnpm db:push
corepack pnpm db:seed
```

## Demo data

The seed script creates:

- 1 demo organization
- 1 demo owner user
- 3 customers
- 6 facilities
- 2 carriers
- 30 loads
- seeded detention, layover, TONU, and lumper scenarios
- at least 6 claims in mixed statuses

Demo login:

- email: `demo@dockclaim.dev`
- password: `DockClaim123!`

If Supabase auth is unavailable, `DEMO_MODE=true` still allows a seeded cookie-based demo session from the login page.

## Graceful degradation

- Missing or invalid Stripe billing config: billing page stays visible and checkout returns a safe configuration error instead of breaking.
- Missing SMTP: invite and claim send flows fall back to copyable invite links and draft email content.
- Missing FastRouter or `AI_FEATURES_ENABLED=false`: document uploads still succeed, but extraction becomes manual review.
- Missing Supabase config: production auth is unavailable, but demo mode can still be used locally.

## Deployment

### Vercel

1. Create a Vercel project from this repository.
2. Set all environment variables from `.env.example`.
3. Point `NEXT_PUBLIC_APP_URL` at the production domain.
4. Deploy the Next.js app.
5. Run `corepack pnpm db:migrate:deploy` against the production database during release.

### Supabase

1. Provision a PostgreSQL-backed Supabase project.
2. Set `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Add the service role key for optional seed/auth admin helpers.

### Stripe

1. Create one recurring monthly price.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_ID`, and `STRIPE_WEBHOOK_SECRET`.
3. Point the Stripe webhook to `/api/stripe/webhook`.

## Project structure

- [`src/app`](e:\DockClaim\src\app): routes, layouts, server actions, API handlers
- [`src/components`](e:\DockClaim\src\components): UI primitives, tables, forms, shell
- [`src/lib`](e:\DockClaim\src\lib): services, providers, auth, env, rules, billing, PDF
- [`prisma`](e:\DockClaim\prisma): schema and seed
- [`examples`](e:\DockClaim\examples): sample CSV input
- [`docs`](e:\DockClaim\docs): architecture and product notes
- [`tests`](e:\DockClaim\tests): Vitest and Playwright coverage

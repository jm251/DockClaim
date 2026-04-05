# DockClaim PRD

## Problem

Freight brokers routinely miss collectible accessorial revenue because detention, layover, TONU, and lumper claims live across CSV exports, PDFs, screenshots, and email threads. The recovery work is operationally important but usually too fragmented to run consistently.

## MVP users

- Owner / Admin
- Ops user
- Billing / AR user
- Viewer

## MVP jobs to be done

- Import loads from TMS CSV exports.
- Associate customers, facilities, and accessorial rule sets.
- Upload support documents per load.
- Extract timestamps and amounts with optional AI assistance.
- Review/edit extracted fields manually.
- Calculate claimability and amounts deterministically.
- Create and track claims through draft, sent, disputed, and paid states.
- Generate claim email drafts and PDF claim summaries.

## Non-goals

- Full TMS replacement
- Direct TMS or EDI integrations in v1
- Mobile app
- Accounting sync
- Enterprise-grade permission modeling beyond the four MVP roles

## Success criteria

- Local environment boots with the documented setup.
- Demo seed produces a working workspace with realistic claim scenarios.
- CSV import creates loads and stops successfully.
- Rules engine calculates candidates with unit-test coverage.
- Claims can be created and moved through the main lifecycle.
- Email draft and PDF summary generation work with graceful fallback behavior.

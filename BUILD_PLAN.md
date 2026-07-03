# Ardena B2B — Fleet & Rental Management Platform

A B2B SaaS spin-off of [ardena.co.ke](https://ardena.co.ke): a multi-tenant platform that lets
car rental / fleet businesses run their entire operation — fleet, bookings, staff, identity
verification, and payments — from one clean dashboard. Billed monthly, per business account.

---

## 1. Vision

Give any car rental or fleet business in Kenya (and beyond) the same operational backbone
Ardena built for itself, without building it from scratch. Businesses sign up, onboard their
fleet and staff, and immediately get:

- A bookings/reservations engine
- Identity-verified customers (via Dojah)
- Payment prompting to collect from customers directly
- Role-based staff access
- Notifications across the booking lifecycle

Positioning: **premium, minimal, fast** — not a bloated legacy fleet ERP. Think "Stripe
dashboard" energy applied to car rental ops.

---

## 2. Who It's For (Personas)

| Persona | Needs |
|---|---|
| **Fleet business owner/admin** | Onboard company, invite staff, see fleet + revenue at a glance, manage subscription |
| **Ops / booking staff** | Create & manage reservations, check vehicle availability, verify renters |
| **Finance staff** | Trigger payment prompts, track payment status, reconcile |
| **Renter/customer** (end user of the business, not our direct customer) | Gets verified via Dojah, receives booking + payment prompts |
| **Ardena (platform owner)** | Manage tenants, subscriptions, plan limits, platform-wide health |

---

## 3. Core Modules (MVP Scope)

### 3.1 Client / Tenant Management
- Business sign-up → onboarding wizard (company details, branding logo, fleet size)
- Each business = isolated tenant (own fleet, staff, customers, bookings)
- Subscription plan & billing status tied to tenant
- Platform admin (Ardena) console to view/manage all tenants

### 3.2 Fleet Management
- Vehicle registry: make, model, plate, category, status (available / booked / in maintenance / out of service)
- Vehicle documents (insurance, inspection) with expiry tracking + alerts
- Availability calendar per vehicle
- Pricing per vehicle/category (daily/weekly rate)

### 3.3 Bookings & Reservations
- Create reservation: customer, vehicle, dates, pickup/drop-off
- Availability conflict checks
- Booking statuses: pending → confirmed → active → completed / cancelled
- Booking history per customer and per vehicle

### 3.4 Identity Verification (Dojah)
- Business gets access to Dojah endpoints **through our platform** (we proxy/manage the API key,
  they don't need their own Dojah account)
- Verify renter identity before confirming a booking: ID lookup, selfie/liveness match, driver's
  license validation
- Verification result stored against the customer profile (pass/fail + confidence, not raw
  documents unless legally required — see §11)
- Usage-metered: verification calls could be part of plan quota or billed as add-on

### 3.5 Payments & Payment Prompting
- Prompt customer to pay (M-Pesa STK push as primary rail for Kenya; card as secondary)
- Payment linked to a booking; staff can trigger/resend prompt from booking view
- Payment status tracking: pending, success, failed, refunded
- Payout/reconciliation view for the business (what they've collected)
- Separate from **our** revenue: platform subscription billing (see §5)

### 3.6 Staff & Roles
- Invite staff by email, assign role
- Default roles: Owner/Admin, Manager, Booking Agent, Finance, Read-only/Viewer
- Permission matrix per module (fleet, bookings, payments, verification, staff)
- Activity log per staff member (who did what, when)

### 3.7 Notifications
- In-app + email (and SMS/WhatsApp later) for:
  - New booking created / confirmed / cancelled
  - Verification passed/failed
  - Payment prompt sent / paid / failed
  - Vehicle document expiring soon
  - Staff invited / role changed
- Notification preferences per staff member

---

## 4. Multi-Tenancy & Access Model

- **Tenant-scoped data isolation** — every table keyed by `tenant_id`; no cross-tenant leakage.
- **Platform (super-admin) layer** sits above all tenants — for Ardena's internal ops only.
- Auth: email/password + optional SSO later. Staff invites scoped to a tenant.
- API design should assume tenant context on every request (via subdomain, header, or JWT claim).

---

## 5. Monetization (Monthly SaaS Billing)

| Plan | Fleet size | Verification calls | Staff seats | Notes |
|---|---|---|---|---|
| **Starter** | up to ~10 vehicles | limited/mo | 3 | entry price |
| **Growth** | up to ~50 vehicles | higher cap | 10 | most businesses land here |
| **Scale** | unlimited | pay-as-you-go overage | unlimited | larger fleets |

- Billed monthly via card/M-Pesa; platform itself needs a billing engine (Stripe or local
  equivalent) separate from the "payment prompting" feature businesses use on *their* customers.
- Metering needed for: Dojah verification calls, SMS notifications (if added), possibly booking volume.
- Trial period (e.g. 14 days) recommended for conversion.

---

## 6. Design System

**Principle: minimal, premium, confident whitespace. No visual noise.**

- **Brand color:** `#007FFA` — used for primary actions, active states, key data highlights, links. Not for large background fills.
- **Base palette:** clean white (`#FFFFFF`) backgrounds, near-black text (`#0A0A0A`–`#111111`),
  a neutral gray scale (`#F5F6F8`, `#E7E9EC`, `#8A8F98`) for surfaces/borders/muted text.
- **Accent restraint:** brand blue used sparingly — buttons, active nav, key metrics, focus rings.
  Status colors (success/warn/error) kept desaturated and consistent, not clashing with brand blue.
- **Typography:** a premium, geometric/grotesk sans — e.g. **Inter**, **General Sans**, or
  **Satoshi** for UI text; consider a slightly distinct display face (e.g. **Clash Display** or
  **Aeonik**) for headings/dashboard hero numbers if a more "premium" feel is wanted. Fallback:
  Inter everywhere at first, revisit once brand is set.
- **Layout language:** generous padding, soft large-radius cards (12–16px), subtle shadows (not
  skeuomorphic), thin 1px borders over heavy dividers.
- **Data density:** dashboards should favor a few clear, large numbers over cramped tables where
  possible — this is an operational tool used daily, so speed of scanning matters more than
  decoration.
- **Motion:** minimal, fast, purposeful (150–200ms) — no bouncy/playful easing.
- Component baseline: build on a headless system (Radix primitives) + Tailwind, so styling stays
  fully custom to the brand rather than looking like a template.

---

## 7. Suggested Tech Stack (proposal, not locked)

- **Frontend:** Next.js (React) + TypeScript + Tailwind CSS + Radix UI primitives
- **Backend:** Next.js API routes or a separate Node/NestJS service if complexity grows
- **DB:** PostgreSQL (multi-tenant via `tenant_id` column + row-level security)
- **Auth:** NextAuth / Clerk / custom JWT — needs to support tenant-scoped roles
- **Payments:** M-Pesa Daraja API (STK push) for customer prompting; Stripe (or Paystack/Flutterwave) for our own subscription billing
- **Identity verification:** Dojah API (server-side proxy — client businesses never see the raw key)
- **Notifications:** Email (Resend/Postmark), SMS later (Africa's Talking), in-app via websockets or polling
- **Hosting:** Vercel (frontend) + managed Postgres (Supabase/Neon/RDS)

*(All swappable — flag if you already have preferences, e.g. existing infra from ardena.co.ke.)*

---

## 8. Core Data Model (sketch)

```
Tenant (business)
 ├── Users (staff) — role, permissions
 ├── Vehicles — status, docs, pricing
 ├── Customers (end renters) — verification status
 ├── Bookings — vehicle, customer, dates, status
 ├── Payments — booking, amount, method, status
 ├── VerificationChecks — customer, provider(Dojah), result, timestamp
 ├── Notifications — recipient, type, payload, read status
 └── Subscription — plan, status, renewal date, usage counters
```

---

## 9. Integrations

- **Dojah** — KYC/identity verification (ID lookup, liveness, license validation). We hold the
  master API key; usage is proxied and metered per tenant.
- **M-Pesa Daraja (STK Push)** — customer-facing payment prompting.
- **Stripe / Paystack / Flutterwave** — our own monthly subscription billing from tenants to us.
- **Email/SMS provider** — transactional notifications.

---

## 10. Roadmap

**Phase 0 — Foundations**
Auth, multi-tenant scaffolding, design system/component library, tenant onboarding flow.

**Phase 1 — MVP**
Fleet management, bookings/reservations, staff & roles, basic notifications, Dojah verification
on booking flow, M-Pesa payment prompting.

**Phase 2 — Monetization**
Subscription plans, billing engine, usage metering (verification calls), plan limits/upgrades.

**Phase 3 — Polish & Scale**
Analytics dashboard, document expiry alerts, SMS notifications, platform admin console,
white-label options per tenant (their logo/colors on customer-facing prompts).

---

## 11. Non-Functional Requirements

- **Data sensitivity:** identity verification data (ID numbers, selfies) is highly sensitive —
  minimize storage, encrypt at rest, define a retention policy, and confirm what Kenyan data
  protection law (ODPC/Data Protection Act 2019) requires before storing raw documents.
- **Tenant isolation:** must be airtight — a bug leaking one business's bookings/customers to
  another is the single worst failure mode for this product.
- **Auditability:** every payment prompt, verification check, and role change should be logged.
- **Uptime:** this becomes mission-critical for tenants running daily operations through it —
  plan for monitoring/alerting from day one, not later.

---

## 12. Open Questions

- [ ] Confirm final tech stack (any constraints from existing ardena.co.ke infra to reuse/share?)
- [ ] Confirm payment rails needed beyond M-Pesa (card via Stripe? bank transfer?)
- [ ] Pricing tiers — actual KES figures per plan
- [ ] Do tenants need their own branding on customer-facing screens (white-label), or is Ardena
      brand always visible?
- [ ] Data retention rules for Dojah verification artifacts
- [ ] Final typography pick (Inter as safe default vs. a paid premium font)

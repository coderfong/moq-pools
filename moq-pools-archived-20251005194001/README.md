# MOQ Pools – Complete MVP (Supplier Drop‑Ship)

## Quick Start
```bash
pnpm install
cp .env.example .env
# set DATABASE_URL and APP_BASE_URL
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

## Routes
- `/products` – list pools
- `/p/:id` – product page → join & pay (Stripe)
- `/pay/success` – success
- `/admin/pools` – export CSV & place order
- `/admin/payments` – list payments
- `/admin/shipments` – upload tracking CSV

## Stripe (dev)
```bash
stripe listen --events checkout.session.completed --forward-to http://localhost:3000/api/webhooks/stripe
```

Then put the printed `whsec_...` in `.env` as `STRIPE_WEBHOOK_SECRET`.

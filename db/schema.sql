-- Orders database (Cloudflare D1 / SQLite). Apply with:
--   npx wrangler d1 execute <database> --remote --file=db/schema.sql
CREATE TABLE IF NOT EXISTS orders (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number      TEXT NOT NULL UNIQUE,
  payment_provider  TEXT NOT NULL,               -- SQUARE | STRIPE
  payment_id        TEXT NOT NULL UNIQUE,        -- Square payment id / Stripe PaymentIntent id (dedupes retries)
  payment_status    TEXT NOT NULL DEFAULT 'PAID',
  status            TEXT NOT NULL DEFAULT 'AWAITING', -- AWAITING | PROCESSING | SHIPPED | READY_FOR_PICKUP | DELIVERED | CANCELLED
  customer_name     TEXT NOT NULL,
  customer_email    TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  fulfillment       TEXT NOT NULL,               -- SHIPPING | LOCAL_PICKUP
  address_json      TEXT,
  items_json        TEXT NOT NULL,
  subtotal_cents    INTEGER NOT NULL,
  shipping_cents    INTEGER NOT NULL,
  tax_cents         INTEGER NOT NULL,
  total_cents       INTEGER NOT NULL,
  carrier           TEXT,
  service           TEXT,
  tracking_number   TEXT,
  tracking_url      TEXT,
  label_url         TEXT,
  label_cost_cents  INTEGER,
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_email   ON orders(customer_email);

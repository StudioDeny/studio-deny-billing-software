# STUDIO DENY COMMERCE OS — BACKEND INTEGRATION KIT

This directory provides the complete, production-ready backend integration artifacts and database definitions for connecting **DENY OS** to your existing backend infrastructure and database.

---

## 1. Directory Structure

```
backend-integration/
├── schema.prisma             # Production Prisma schema (PostgreSQL 14+)
├── schema.sql                # Raw PostgreSQL DDL migration script with indexes
├── openapi.yaml              # OpenAPI 3.0 specification for all endpoints & models
└── src/
    ├── dto/
    │   └── orders.dto.ts     # Request payload DTO and input validator
    ├── middleware/
    │   ├── auth.middleware.ts # JWT verification & Bearer token parsing
    │   └── rbac.middleware.ts # Role-based access control (OWNER, MANAGER, BILLING)
    └── services/
        └── orders.service.ts  # ACID transaction for POS checkout & stock reservation
```

---

## 2. Database Migration Setup

### Option A: Using Prisma
1. Copy `schema.prisma` into your backend project's `prisma/` folder (or merge into your existing schema).
2. Set your `DATABASE_URL` in `.env`:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/deny_commerce?schema=public"
   ```
3. Run the migration:
   ```bash
   npx prisma migrate dev --name init_deny_commerce_os
   npx prisma generate
   ```

### Option B: Using Raw SQL / Flyway / Knex
Execute `schema.sql` against your PostgreSQL 14+ database:
```bash
psql -h <host> -U <user> -d <dbname> -f backend-integration/schema.sql
```

---

## 3. Endpoints Checklist & Roles

| Endpoint | Method | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | Public | Operator sign-in, returns JWT and sets refresh cookie |
| `/api/v1/auth/me` | `GET` | Authenticated | Returns current session operator profile & permissions |
| `/api/v1/orders` | `GET` | `BILLING`, `MANAGER`, `OWNER` | List settled bills & online orders with filters |
| `/api/v1/orders` | `POST` | `BILLING`, `MANAGER`, `OWNER` | POS checkout with inventory decrement & split tenders |
| `/api/v1/orders/:id` | `GET` | `BILLING`, `MANAGER`, `OWNER` | Full bill detail with payment splits & timeline |
| `/api/v1/orders/:id/fulfillment` | `PATCH` | `FULFILLMENT`, `MANAGER`, `OWNER` | Update fulfillment state (`PACKED`, `SHIPPED`, `DELIVERED`) |
| `/api/v1/products` | `GET` | All | Master products and variant inventory |
| `/api/v1/inventory/adjust` | `POST` | `MANAGER`, `OWNER` | Adjust variant stock level with reason log |
| `/api/v1/customers` | `GET` / `POST` | `BILLING`, `MANAGER`, `OWNER` | CRM patron records & spend metrics |
| `/api/v1/reports/sales-audit` | `GET` | `MANAGER`, `OWNER` | Cash drawer & multi-tender daily sales reconciliation |

---

## 4. Concurrency & Inventory Protection
When settling an order via `POST /api/v1/orders`, ensure variant stock is queried with **pessimistic row-level locking**:
```sql
SELECT id, stock, sku FROM product_variants WHERE id = $1 FOR UPDATE;
```
See [`src/services/orders.service.ts`](./src/services/orders.service.ts) for the reference transaction flow.

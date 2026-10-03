# Distribution System — Flow & Change Log

> **Keep this file updated** every time a new feature, model, route, or UI page is added.
> Document the business flow it covers, what files changed, and any DB migrations.

---

## Business Daily Flow (Full Coverage)

```
Sales Rep → takes orders from shops
    ↓
[Sales Order] — DRAFT → CONFIRMED (warehouse approves)
    ↓
[Loading Sheet] — vehicle loaded with confirmed orders + extra stock
    ↓
Driver visits route, delivers to customers
    ├── Customer takes full order → [Invoice / Van Sale]
    ├── Customer takes partial, returns rest → [Customer Return Note] + [Credit Note]
    ├── Sales Rep gives free items (FOC) → recorded on Invoice Line (free_quantity)
    └── Items damaged / lost during trip → recorded at Day-End Close (damaged_qty / lost_qty)
    ↓
Driver returns to warehouse
    ├── Close Loading Sheet → returned stock restocked, damage/loss audit movements created
    └── Van sales invoices already posted during route
    ↓
[Commission] — generated monthly, 5% of net profit on cash sales, paid 1 month later
```

---

## Modules & Files

### 1. Sales Order
**Flow:** Sales rep creates order in field → warehouse confirms.

| Layer | File |
|-------|------|
| Model | `server/models/SalesOrder.js`, `server/models/SalesOrderLine.js` |
| Route | `server/routes/salesOrders.js` |
| UI    | `client/src/pages/sales/SalesOrderCreate.jsx`, `SalesOrderList.jsx` |

**SalesOrderLine fields:** `product_id`, `quantity`, `free_quantity` *(FOC — added migration 007)*, `unit_price`, `discount_rate`, `vat_rate`, `line_total`

---

### 2. Invoice & Credit Note
**Flow:** Converted from sales order or created directly. Auto-posts journal entries and stock movements on creation.

| Layer | File |
|-------|------|
| Model | `server/models/Invoice.js`, `server/models/InvoiceLine.js` |
| Controller | `server/controllers/invoiceController.js` |
| Route | `server/routes/invoices.js` |
| UI    | `client/src/pages/sales/InvoiceCreate.jsx`, `InvoiceList.jsx`, `InvoiceDetail.jsx` |
| UI    | `client/src/pages/sales/CreditNoteCreate.jsx`, `CreditNoteList.jsx` |

**InvoiceLine fields:** `quantity`, `free_quantity` *(FOC — migration 007)*, `unit_price`, `discount_rate`, `vat_rate`, `cost_price`, `line_subtotal`, `vat_amount`, `line_total`

**Stock logic:** Ships `quantity + free_quantity` from warehouse. Revenue is on `quantity` only.

**invoice_type values:** `TAX_INVOICE` | `CASH_INVOICE` | `CREDIT_NOTE` | `PROFORMA`

---

### 3. Loading Sheet (Van Sales)
**Flow:** Warehouse loads vehicle → driver sells during route → day-end close reconciles stock.

| Layer | File |
|-------|------|
| Model | `server/models/LoadingSheet.js`, `server/models/LoadingSheetLine.js` |
| Route | `server/routes/loadingSheets.js` |
| UI    | `client/src/pages/vanSales/LoadingSheetCreate.jsx`, `LoadingSheetList.jsx`, `LoadingSheetDetail.jsx` |
| UI    | `client/src/pages/vanSales/VanStock.jsx` |

**LoadingSheetLine fields:** `loaded_quantity`, `sold_quantity`, `returned_quantity`, `damaged_quantity` *(migration 008)*, `lost_quantity` *(migration 008)*, `damage_notes` *(migration 008)*, `unit_cost`

**Day-End Close payload:**
```json
{
  "returns": [
    { "line_id": 1, "returned_quantity": 10, "damaged_quantity": 2, "lost_quantity": 1, "damage_notes": "dropped during unload" }
  ],
  "cash_collected": 5000
}
```

**Stock movements created at close:**
- Returned good → `movement_type: IN`, `source_type: VAN_RETURN`
- Damaged → `movement_type: ADJUSTMENT`, `source_type: VAN_DAMAGE` *(audit only, stock already deducted at load)*
- Lost → `movement_type: ADJUSTMENT`, `source_type: VAN_LOSS` *(audit only)*

---

### 4. Customer Return Note
**Flow:** Driver picks up goods from customer → creates Return Note (DRAFT) → warehouse confirms (restocks) → credit note raised separately.

| Layer | File |
|-------|------|
| Model | `server/models/CustomerReturn.js`, `server/models/CustomerReturnLine.js` |
| Route | `server/routes/customerReturns.js` |
| UI    | `client/src/pages/returns/CustomerReturnCreate.jsx`, `CustomerReturnList.jsx`, `CustomerReturnDetail.jsx` |

**Return Note number format:** `RN-YYYYMMDD-001`

**Status flow:** `DRAFT → CONFIRMED` (stock returned to warehouse) `→ CANCELLED`

**Confirm action:** Creates `StockMovement IN / CUSTOMER_RETURN` per line.

**Print:** CustomerReturnDetail has a printable document with driver + customer signature sections.

---

### 5. Sales Commission
**Flow:** Manager generates commission at month-end → approves next month → pays.

| Layer | File |
|-------|------|
| Model | `server/models/SalesCommission.js` |
| Route | `server/routes/commission.js` |
| UI    | `client/src/pages/sales/CommissionList.jsx` |

**Rules:**
- 5% of net profit (`qty × (unit_price × (1 − discount%) − cost_price)`)
- **Cash invoices only** (`invoice_type = 'CASH_INVOICE'`)
- Due date = 1st of the month after the sale month
- One record per `(sales_rep_id, sale_year, sale_month)` — unique constraint

**Status flow:** `PENDING → APPROVED → PAID` | `PENDING/APPROVED → CANCELLED`

**API:**
- `POST /api/commission/generate` — `{ year, month }` — idempotent, recalculates PENDING records
- `PUT /api/commission/:id/approve`
- `PUT /api/commission/:id/pay` — `{ paid_date, payment_notes }`

### 6. Credit Limit Enforcement
**Flow:** When creating a Sales Order, if the customer has a credit limit set and their outstanding balance >= limit, the order is rejected (HTTP 422). A near-limit warning (≥80%) shows in the UI.

| Layer | File |
|-------|------|
| Backend check | `server/routes/salesOrders.js` — before transaction, checks `Customer.credit_limit` vs `outstanding_balance` |
| UI warning | `client/src/pages/sales/SalesOrderCreate.jsx` — red banner (over limit) or amber banner (near limit) shown when customer is selected |

**Error code:** `CREDIT_LIMIT_EXCEEDED`

---

### 7. Route Visit Order Planning
**Flow:** Manager sets the sequence in which a driver visits customers on a route. Stored as `visit_order` on the Customer record.

| Layer | File |
|-------|------|
| Model field | `server/models/Customer.js` — `visit_order: INTEGER` |
| API | `server/routes/routes_api.js` — `GET /:id/customers` (sorted by visit_order), `PUT /:id/visit-order` (bulk update) |
| UI | `client/src/pages/customers/RouteDetail.jsx` — arrow up/down reordering, credit limit indicator per customer, save button |

**Migration:** `010_add_visit_order_and_expense_loading_sheet.js`

---

### 8. Reorder → Purchase Order Workflow
**Flow:** From Reorder Suggestions report, user selects low-stock items with checkboxes → clicks "Create PO" → navigated to PurchaseOrderCreate with lines pre-filled.

| Layer | File |
|-------|------|
| Report | `client/src/pages/reports/ReorderSuggestions.jsx` — multi-select checkboxes + bulk/single "Create PO" button |
| PO create | `client/src/pages/purchasing/PurchaseOrderCreate.jsx` — reads `location.state.lines` and `location.state.warehouse_id` to pre-fill |
| API data | `server/routes/reports.js` — reorder-suggestions query now returns `product_id` (aliased) + `cost_price` |

---

### 9. Route Expenses (linked to Loading Sheet)
**Flow:** Driver/manager records expenses (fuel, transport, etc.) against a specific loading sheet trip.

| Layer | File |
|-------|------|
| Model field | `server/models/Expense.js` — `loading_sheet_id: INTEGER` |
| API filter | `server/routes/expenses.js` — crudFactory passes `?loading_sheet_id=N` as WHERE clause |
| UI | `client/src/pages/vanSales/LoadingSheetDetail.jsx` — "Route Expenses" card at bottom: list + inline quick-add form |

**Migration:** `010_add_visit_order_and_expense_loading_sheet.js`

---

## DB Migrations

| # | File | What it does |
|---|------|-------------|
| 001 | `001_add_vehicle_id_to_loading_sheets.js` | Adds `vehicle_id` to loading sheets |
| 002 | `002_add_cash_collected_to_loading_sheets.js` | Adds `cash_collected` to loading sheets |
| 003 | `003_add_loading_sheet_id_to_invoices.js` | Links invoices to loading sheets (van sales) |
| 004 | `004_extend_journal_source_type_enum.js` | Extends journal source_type enum |
| 005 | `005_add_category_to_expenses.js` | Adds category to expenses |
| 006 | `006_add_fcm_token_to_users.js` | FCM push token for mobile notifications |
| 007 | `007_add_free_quantity_and_customer_returns.js` | `free_quantity` on order/invoice lines; `customer_returns` + `customer_return_lines` tables |
| 008 | `008_add_damage_loss_to_loading_sheet_lines.js` | `damaged_quantity`, `lost_quantity`, `damage_notes` on loading sheet lines |
| 009 | `009_add_sales_commissions.js` | `sales_commissions` table |
| 010 | `010_add_visit_order_and_expense_loading_sheet.js` | `visit_order` on customers; `loading_sheet_id` on expenses |

---

## API Route Index

| Prefix | File | Notes |
|--------|------|-------|
| `/api/sales-orders` | `salesOrders.js` | CRUD + confirm; credit limit check on create |
| `/api/invoices` | `invoices.js` | Create (auto-posts) + post |
| `/api/customer-returns` | `customerReturns.js` | CRUD + confirm + cancel |
| `/api/loading-sheets` | `loadingSheets.js` | CRUD + load + close |
| `/api/commission` | `commission.js` | List + generate + approve + pay + cancel |
| `/api/deliveries` | `deliveries.js` | CRUD + dispatch + deliver + return |
| `/api/routes` | `routes_api.js` | CRUD + `GET /:id/customers` + `PUT /:id/visit-order` |
| `/api/expenses` | `expenses.js` | CRUD; filterable by `loading_sheet_id` |

---

## Seed Credentials
- **URL:** `http://localhost:5000` (API), `http://localhost:5173` (UI)
- **Admin:** `admin@lankadist.lk` / `Admin@123`

---

*Last updated: 2026-10-03*

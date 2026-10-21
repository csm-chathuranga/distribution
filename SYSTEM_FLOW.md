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

**LoadingSheet fields:** `driver_id` (FK → users, delivery role), `vehicle_id` (FK → vehicles), `sales_rep_id`, `route_id`, `warehouse_id`, `branch_id`, `total_loaded_value`, `cash_collected`

**LoadingSheetLine fields:** `loaded_quantity`, `sold_quantity`, `returned_quantity`, `damaged_quantity` *(migration 008)*, `lost_quantity` *(migration 008)*, `damage_notes` *(migration 008)*, `unit_cost`

**Invoice linking:** POSTED invoices can be linked to a sheet at creation time (admin/manager) or from the detail page via "Add Existing" button. `Invoice.loading_sheet_id` tracks the link. Invoices can also be unlinked (removed) from DRAFT/LOADED sheets.

**Driver access:** Delivery role has `sales.create` permission *(migration 012)*. Active sheet detection checks both `driver_id` OR `sales_rep_id` so drivers see their own sheet.

**Key endpoints added:**
- `GET /api/loading-sheets/available-invoices` — POSTED invoices without a sheet (for create form; requires `sales.approve`)
- `GET /api/loading-sheets/:id/available-invoices` — same but scoped to sheet's branch
- `PUT /api/loading-sheets/:id/invoices` — link invoice_ids to a sheet
- `DELETE /api/loading-sheets/:id/invoices/:invoiceId` — unlink invoice
- `GET /api/users/for-select?role=delivery` — lightweight users list for dropdowns
- `PATCH /api/loading-sheets/:id` — update `driver_id` / `sales_rep_id` on non-CLOSED sheets (requires `sales.approve`); used by inline driver assignment on detail page

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

### 9. Van Delivery Tracking (Mark Delivered)
**Flow:** After a van invoice is posted, the driver marks it as physically delivered at the customer premises.

| Layer | File |
|-------|------|
| Model field | `server/models/Invoice.js` — `delivered_at DATETIME`, `delivered_by INT` |
| Route | `server/routes/invoices.js` — `PUT /:id/deliver` (requires `sales.create`) |
| UI | `client/src/pages/sales/InvoiceDetail.jsx` — teal "Mark Delivered" button (van invoices only, canCreate, not yet delivered) |

**Business rule:** Only invoices with `loading_sheet_id` show the Mark Delivered button. Status must be `POSTED`, `PARTIAL`, or `OVERDUE`. Idempotent guard prevents double-delivery.

**Notifications on deliver:** admin + manager + super_admin notified (`INVOICE_DELIVERED`). If `sales_rep_id ≠ driver`, sales rep also notified.

**Migration:** 013

---

### 10. Van Damage & Loss — P&L Write-off
**Flow:** At Day-End Close, if any damaged_quantity or lost_quantity is recorded, the system auto-creates a journal entry to write off stock cost to the Van Damage & Loss expense account.

| Layer | File |
|-------|------|
| Journal logic | `server/routes/loadingSheets.js` — close endpoint, inside transaction |
| Account | `6800 Van Damage & Loss` (EXPENSE, sub_type=VAN_LOSS, is_system=true) |
| Report | `client/src/pages/reports/VanDamageLoss.jsx` |
| API | `server/routes/reports.js` — `GET /van-damage-loss?from=&to=` |

**Journal entry:** `DR 6800 Van Damage & Loss / CR 1301 Stock` — amount = sum(damaged_qty + lost_qty) × unit_cost per line.

**Migrations:** 014 (enum + account)

---

### 11. Free Item Allocations (Promotional Quota)
**Flow:** Manager/admin assigns a product quota to a sales rep (warehouse-specific). When the rep creates an invoice, they can attach free items from their quota as zero-price lines. Quota is deducted atomically within the invoice transaction.

| Layer | File |
|-------|------|
| Models | `server/models/FreeItemAllocation.js`, `server/models/FreeItemUsage.js` |
| Route | `server/routes/freeAllocations.js` |
| Controller | `server/controllers/invoiceController.js` — `free_items` param handled in `exports.create` |
| UI management | `client/src/pages/vanSales/FreeItems.jsx` — quota cards, top-up, history |
| UI on invoice | `client/src/pages/sales/InvoiceCreate.jsx` — purple "Free Items" panel, +/− controls per product |

**FreeItemAllocation fields:** `company_id`, `sales_rep_id`, `product_id`, `warehouse_id`, `allocated_quantity`, `used_quantity`, `notes`

**FreeItemUsage fields:** `allocation_id`, `customer_id`, `invoice_id`, `quantity`, `notes`, `given_by`

**Invoice create body addition:**
```json
{ "free_items": [{ "allocation_id": 3, "quantity": 2 }] }
```
Each free item is injected as a zero-price line (`unit_price: 0, vat_rate: 0, cost_price: 0`). Stock deducted same as regular lines via `performPost`. Quota deducted after post succeeds.

**Migrations:** 015

---

### 12. Route Expenses (linked to Loading Sheet)
**Flow:** Driver/manager records expenses (fuel, transport, etc.) against a specific loading sheet trip.

| Layer | File |
|-------|------|
| Model field | `server/models/Expense.js` — `loading_sheet_id: INTEGER` |
| API filter | `server/routes/expenses.js` — crudFactory passes `?loading_sheet_id=N` as WHERE clause |
| UI | `client/src/pages/vanSales/LoadingSheetDetail.jsx` — "Route Expenses" card at bottom: list + inline quick-add form |

**Migration:** `010_add_visit_order_and_expense_loading_sheet.js`

---

### 13. Customer GPS & Directions
**Flow:** GPS coordinates captured when a sales order is created in the field → stored on the Customer record → used to show a "Get Directions" button on the CustomerList mobile card.

| Layer | File |
|-------|------|
| Model fields | `server/models/Customer.js` — `last_latitude DECIMAL(10,7)`, `last_longitude DECIMAL(10,7)` |
| Update logic | `server/routes/salesOrders.js` — after order committed, silently updates customer GPS if `data.latitude`/`data.longitude` present |
| UI | `client/src/pages/customers/CustomerList.jsx` — Google Maps directions link shown when `c.last_latitude && c.last_longitude` |

**Migration:** `019_add_location_to_customers.js` (raw SQL, SHOW COLUMNS guard pattern)

**Directions URL:** `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

---

### 16. Electron Desktop App + Silent POS Print
**Flow:** Electron wraps the web app in a desktop window. Print buttons that previously opened a browser popup now print silently to the configured POS thermal printer — no dialog.

| Layer | File |
|-------|------|
| Electron main | `electron/main.js` — BrowserWindow, IPC handlers: `pos-print`, `get-printers`, `get-print-settings`, `save-print-settings`; spawns Express server in production |
| Electron preload | `electron/preload.js` — exposes `window.electronAPI` via contextBridge |
| Electron build | `electron/package.json` — electron-builder config, bundles `server/` + `client/dist/` |
| Print utility | `client/src/utils/print.js` — `printPOS()` reads `window.electronAPI?.isElectron`; if true, sends HTML to main via IPC instead of opening popup |
| Settings modal | `client/src/components/PrintSettingsModal.jsx` — printer picker, paper width (76/80mm), copies |
| Header trigger | `client/src/components/Header.jsx` — Printer icon button (Electron only) + native menu `File → Printer Settings` |

**Settings persisted to:** `%APPDATA%/lankadist-desktop/print-settings.json` (auto-created).

**Dev startup:**
```bash
# 3 terminals
node server/index.js           # API on :5000
cd client && npm run dev       # Vite on :5173
cd electron && npm run dev     # Electron loads localhost:5173
```

**Production build:**
```bash
cd client && npm run build
cd electron && npm install && npm run dist   # outputs electron/build/*.exe
```

**Excluded from git:** `electron/` is in `.gitignore`.

---

### 15. My Collections (Driver Self-View)
**Flow:** Driver/sales rep sees a date-filtered list of receipts they personally collected, with totals by payment method (cash / cheque / transfer). Accessible via the "My Coll." bottom-nav tab.

| Layer | File |
|-------|------|
| API endpoint | `server/routes/receipts.js` — `GET /my` (filters by `created_by = req.user.id`, defaults to today) |
| RTK hook | `client/src/api/salesApi.js` — `useGetMyCollectionsQuery` |
| UI page | `client/src/pages/vanSales/MyCollection.jsx` |
| Route | `client/src/App.jsx` — `/driver/collections` |
| Nav | `client/src/components/BottomNav.jsx` — `DRIVER_TABS` "My Coll." tab (replaces "Payments") |

**Response shape:** `{ receipts: [...], totals: { CASH, CHEQUE, BANK_TRANSFER, total } }`

**Outstanding customers link:** MyCollection page has an amber button to navigate to `/driver/payments` (DriverPayments) for seeing who still owes.

---

### 14. Free Issue via GRN (Bulk Topup)
**Flow:** When receiving goods, warehouse manager can link a sales rep for free issue allocation. Each GRN line can have a `free_issue_qty`. On GRN post, the system auto-topups (creates or increments) `FreeItemAllocation` records for the linked rep.

| Layer | File |
|-------|------|
| Model field | `server/models/GoodsReceived.js` — `free_sales_rep_id INT NULL` |
| Model field | `server/models/GoodsReceivedLine.js` — `free_issue_qty DECIMAL(12,4) DEFAULT 0` |
| Association | `server/models/index.js` — `GoodsReceived.belongsTo(User, { as: 'FreeRep', foreignKey: 'free_sales_rep_id' })` |
| Post logic | `server/routes/goodsReceived.js` — POST /:id/post, after stock movements, topups FreeItemAllocation per line with qty > 0 |
| UI create | `client/src/pages/purchasing/GRNCreate.jsx` — card-per-item layout; product search full-width top; Qty/Cost/FreeQty/Amount in row below; free issue qty column shown only when rep selected |
| UI detail | `client/src/pages/purchasing/GRNDetail.jsx` — "Free Issue Rep" in receipt details (amber); "Free Issue" column in items table |
| UI list | `client/src/pages/purchasing/GRNList.jsx` — "Free Issue Rep" column |
| RTK | `client/src/api/purchasingApi.js` — postGRN invalidates `['GoodsReceived', 'Stock', 'FreeAlloc']` |

**Migration:** `020_grn_free_issue.js` — adds `free_sales_rep_id` to `goods_received` and `free_issue_qty` to `goods_received_lines`

**Topup logic (idempotent):**
```js
FreeItemAllocation.findOrCreate({ where: { sales_rep_id, product_id }, defaults: { allocated_quantity: 0, ... } })
alloc.increment('allocated_quantity', { by: freeQty, transaction: t })
```

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
| 011 | `011_add_notifications_table.js` | `notifications` table for push/in-app notifications |
| 012 | `012_delivery_role_sales_create.js` | Grants `sales.create` permission to `delivery` role (van drivers can create invoices) |
| 013 | `013_add_delivered_at_to_invoices.js` | Adds `delivered_at DATETIME NULL` and `delivered_by INT NULL` to `invoices` table for van delivery tracking |
| 014 | `014_van_damage_loss_journal.js` | Extends `journal_entries.source_type` enum with `VAN_CLOSE`; adds account `6800 Van Damage & Loss` (EXPENSE, sub_type=VAN_LOSS, is_system=true) |
| 015 | `015_free_item_allocations.js` | Creates `free_item_allocations` (manager assigns promo quota per product/rep/warehouse) and `free_item_usages` (tracks each zero-price invoice line) tables |
| 019 | `019_add_location_to_customers.js` | Adds `last_latitude DECIMAL(10,7)` and `last_longitude DECIMAL(10,7)` to `customers` table |
| 020 | `020_grn_free_issue.js` | Adds `free_sales_rep_id INT NULL` to `goods_received`; `free_issue_qty DECIMAL(12,4) DEFAULT 0` to `goods_received_lines` |
| 021 | `021_damaged_expired_stock.js` | Adds `damaged_quantity DECIMAL(12,4)` and `expired_quantity DECIMAL(12,4)` to `stock` table for separate tracking of unsellable inventory |

---

## API Route Index

| Prefix | File | Notes |
|--------|------|-------|
| `/api/sales-orders` | `salesOrders.js` | CRUD + confirm; credit limit check on create |
| `/api/invoices` | `invoices.js` | Create (auto-posts) + post + `PUT /:id/deliver` (van delivery tracking) |
| `/api/customer-returns` | `customerReturns.js` | CRUD + confirm + cancel |
| `/api/loading-sheets` | `loadingSheets.js` | CRUD + load + close |
| `/api/commission` | `commission.js` | List + generate + approve + pay + cancel |
| `/api/deliveries` | `deliveries.js` | CRUD + dispatch + deliver + return |
| `/api/routes` | `routes_api.js` | CRUD + `GET /:id/customers` + `PUT /:id/visit-order` |
| `/api/expenses` | `expenses.js` | CRUD; filterable by `loading_sheet_id` |
| `/api/free-allocations` | `freeAllocations.js` | GET (list), POST (create), PUT /:id/topup, GET /:id/history |

---

## Notification Flow

| Event | Trigger | Recipients |
|-------|---------|------------|
| Sales order created | `POST /api/sales-orders` | admin, manager, super_admin |
| Sales order confirmed | `PUT /api/sales-orders/:id/confirm` | order creator (`created_by`) |
| Loading sheet created/assigned | `POST /api/loading-sheets` | driver (`driver_id`), sales rep (`sales_rep_id`) if different |
| Invoice delivered (van) | `PUT /api/invoices/:id/deliver` | admin, manager, super_admin; sales rep if different from driver |

**notify() signature:** `notify({ userId?, roleName?, type, title, body, link })`
- `userId` → specific user; `roleName` → all users with that role (both optional but one required)

---

## Seed Credentials
- **URL:** `http://localhost:5000` (API), `http://localhost:5173` (UI)
- **Admin:** `admin@lankadist.lk` / `Admin@123`

---

*Last updated: 2026-10-22*

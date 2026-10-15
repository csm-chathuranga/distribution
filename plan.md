# Plan: Warehouse-Scoped Access + Free Item Integration

---

## Part A — Warehouse Assignment & Scoped Access

### Goal
Each sales rep / driver is assigned to one warehouse. On login they only see
their warehouse's stock, their orders, and their free item quotas.
Admins and managers see everything unchanged.

---

### A1. Database — New Junction Table

**Table:** `warehouse_users`

| Column         | Type    | Notes                          |
|----------------|---------|--------------------------------|
| `warehouse_id` | INTEGER | FK → `warehouses.id`, NOT NULL |
| `user_id`      | INTEGER | FK → `users.id`, NOT NULL      |

- Composite PK `(warehouse_id, user_id)`, `timestamps: false`
- A sales rep / driver is assigned to **one** warehouse (enforced at API level)

---

### A2. Backend

#### A2a. New Model — `server/models/WarehouseUser.js`
Junction model, composite PK, no timestamps.

#### A2b. Update `server/models/index.js`
```js
Warehouse.belongsToMany(User, { through: WarehouseUser, foreignKey: 'warehouse_id', as: 'AssignedUsers' });
User.belongsToMany(Warehouse, { through: WarehouseUser, foreignKey: 'user_id', as: 'AssignedWarehouses' });
```
Table auto-creates on next server start (Sequelize sync).

#### A2c. Update `server/routes/auth.js` — `/auth/me`
Include `assigned_warehouse` (id + name, null for admins) in the response.
This is the single source of truth consumed by the whole frontend.

#### A2d. Update `server/routes/warehouses.js`
- `GET /warehouses` — if caller is `sales_rep` or `driver`, return only their assigned warehouse
- **3 new assignment endpoints** (admin only, `inventory.create` permission):

| Method | Path                            | Action                                         |
|--------|---------------------------------|------------------------------------------------|
| GET    | `/warehouses/:id/users`         | List assigned users (name + role)              |
| POST   | `/warehouses/:id/users`         | Assign user `{ user_id }` — enforce 1 warehouse per rep |
| DELETE | `/warehouses/:id/users/:userId` | Remove assignment                               |

#### A2e. Scope inventory routes
`GET /inventory/stock-on-hand` — if `sales_rep`/`driver`, auto-filter by their
assigned warehouse even if no `warehouse_id` param is passed.

---

### A3. Frontend

#### A3a. `client/src/store/authSlice.js`
Store `assigned_warehouse` from `/me` response.
Add `selectAssignedWarehouse` selector.

#### A3b. `client/src/api/warehousesApi.js`
Add 3 RTK Query endpoints: `getWarehouseUsers`, `assignWarehouseUser`, `removeWarehouseUser`.

#### A3c. `client/src/pages/warehouses/WarehouseList.jsx`
- Add "Manage Staff" action button (admin/manager only)
- New `AssignmentsModal` component:
  - Lists assigned users with role badge + remove button
  - Dropdown filtered to `sales_rep` / `driver` roles to add new assignment
  - Warns if user is already assigned to another warehouse

#### A3d. `client/src/pages/sales/SalesOrderCreate.jsx`
- If `assigned_warehouse` exists in auth state:
  - Pre-fill and **hide** the warehouse selector (lock to their warehouse)
  - Stock query uses their warehouse automatically

---

## Part B — Free Item Integration in Sales Order Create

### What Already Exists (do NOT rebuild)
| Item | File | Status |
|------|------|--------|
| `FreeItemAllocation` model | `server/models/FreeItemAllocation.js` | ✅ Done |
| `FreeItemUsage` model | `server/models/FreeItemUsage.js` | ✅ Done |
| Free allocation routes (list, create, topup, distribute, history) | `server/routes/freeAllocations.js` | ✅ Done |
| Free item page (admin create quota, rep views quota + history) | `client/src/pages/vanSales/FreeItems.jsx` | ✅ Done |
| `free_quantity` field per line in order create payload | `SalesOrderCreate.jsx` line 137 | ✅ Done |

### What Is Missing

#### B1. Show quota during order creation — Frontend
In `SalesOrderCreate.jsx`, fetch the sales rep's free allocations
(`useGetFreeAllocationsQuery`) and per product line show:
- "Free quota: X remaining" badge next to the free qty input
- Disable free input if quota is 0 or product has no allocation
- Live validation: entered free qty cannot exceed remaining quota for that product

#### B2. Link free_quantity to allocation on order submit — Backend
In the sales order creation route (`server/routes/salesOrders.js`),
after inserting order lines, for each line where `free_quantity > 0`:
1. Find the `FreeItemAllocation` for `(sales_rep_id, product_id)`
2. Check remaining balance (`allocated - used >= free_quantity`)
3. Create a `FreeItemUsage` record (`allocation_id`, `customer_id`, `quantity`, `given_by`)
4. Increment `used_quantity` on the allocation
5. Deduct from warehouse stock (same as the existing distribute endpoint does)
6. All inside the same DB transaction as the order itself

> This means free items given via a sales order are tracked the same way as manual
> distributions — the sales rep's quota balance is always accurate.

---

## Full File Change Summary

| File | Change |
|------|--------|
| `server/models/WarehouseUser.js` | **New** — junction model |
| `server/models/index.js` | Register WarehouseUser + associations |
| `server/routes/auth.js` | Include `assigned_warehouse` in `/me` |
| `server/routes/warehouses.js` | Scope list + 3 assignment endpoints |
| `server/routes/inventory.js` | Scope stock-on-hand for scoped roles |
| `server/routes/salesOrders.js` | On create, deduct free_quantity from allocation + create usage records |
| `client/src/store/authSlice.js` | Store + expose `assigned_warehouse` |
| `client/src/api/warehousesApi.js` | 3 new RTK Query hooks |
| `client/src/pages/warehouses/WarehouseList.jsx` | "Manage Staff" button + `AssignmentsModal` |
| `client/src/pages/sales/SalesOrderCreate.jsx` | Lock warehouse picker + show free quota per line |

---

## Implementation Order

### Backend first
1. `WarehouseUser.js` model + `models/index.js`
2. `routes/warehouses.js` — assignment endpoints + scoped list
3. `routes/auth.js` — include `assigned_warehouse` in `/me`
4. `routes/inventory.js` — scope stock-on-hand
5. `routes/salesOrders.js` — free item deduction on order create

### Frontend after
6. `authSlice.js` — store assigned warehouse
7. `warehousesApi.js` — new RTK hooks
8. `WarehouseList.jsx` — assignment UI
9. `SalesOrderCreate.jsx` — lock warehouse + quota display per line

---

## Out of Scope (future)
- Scoping loading sheets / delivery notes by warehouse
- Multi-warehouse assignment per rep
- Dashboard charts filtered by assigned warehouse
- Free item quota alerts / notifications

# Graph Report - .  (2026-08-05)

## Corpus Check
- 218 files · ~86,187 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 926 nodes · 2116 edges · 117 communities (35 shown, 82 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Sales & Purchasing Frontend
- App Shell & Navigation
- Auth & JWT Backend
- Products, Suppliers & Warehouse UI
- Reports & UI Components
- Node.js Backend Dependencies
- Accounting & Finance Backend
- Auth Middleware & Core Models
- Frontend Build Tooling
- Dashboard & Analytics
- Express Server Setup
- Database Config & Purchasing Models
- Authorization Middleware & Routes
- Invoice Management Backend
- API Client Layer
- Delivery & Customer Routes
- Product Catalog & Sales Routes
- Inventory & Loading Sheets
- Admin List Pages
- Database Seed Data
- PWA Manifest
- Finance Account Management
- React & State Management
- Project Scripts
- Payment Models & Routes
- Stock Adjustment Routes
- Stock Transfer Routes
- Invoice Create Page
- Cheque Routes
- Brand Identity & PWA Assets
- Notifications
- Axios & Auth Store
- User Model
- Axios Dependency
- Capacitor Android
- Capacitor App Plugin
- Capacitor CLI
- Capacitor Core
- Capacitor Geolocation
- Capacitor Splash Screen
- Capacitor Status Bar
- Claude & Graphify Tooling
- Inter Font
- HookForm Resolvers
- Leaflet Mapping
- Lucide Icons
- React DOM
- React Hook Form
- React Hot Toast
- React IS
- React Leaflet
- React Leaflet Core
- React Router DOM
- React To Print
- Socket.IO Client
- TanStack Query
- Yup Validation
- Zustand State
- CRUD Factory
- Account Model
- Accounting Period Model
- Branch Model
- Category Model
- Cheque Model
- Company Model
- Customer Model
- Delivery Note Model
- Expense Model
- Goods Received Model
- Goods Received Line Model
- Invoice Model
- Invoice Line Model
- Journal Entry Model
- Journal Line Model
- Loading Sheet Model
- Loading Sheet Line Model
- Notification Model
- Payment Model
- Permission Model
- Price List Model
- Price List Item Model
- Product Model
- Purchase Order Model
- Purchase Order Line Model
- Receipt Model
- Role Model
- Route Model
- Sales Order Model
- Sales Order Line Model
- Stock Model
- Stock Adjustment Model
- Stock Adjustment Line Model
- Stock Movement Model
- Stock Transfer Model
- Stock Transfer Line Model
- Supplier Model
- Supplier Return Model
- Supplier Return Line Model
- Unit Model
- Warehouse Model
- Auth API Hooks
- Customers API Hooks
- Finance API Hooks
- Inventory API Hooks
- Notifications API Hooks
- Products API Hooks
- Purchasing API Hooks
- Reports API Hooks
- Sales API Hooks
- Settings API Hooks
- Suppliers API Hooks
- Warehouses API Hooks
- Project Structure Docs

## God Nodes (most connected - your core abstractions)
1. `fmtCurrency()` - 98 edges
2. `usePermission()` - 67 edges
3. `fmtDate()` - 62 edges
4. `today()` - 33 edges
5. `Table()` - 29 edges
6. `PageHeader()` - 26 edges
7. `selectCurrentUser()` - 24 edges
8. `sequelize` - 24 edges
9. `StatusBadge()` - 23 edges
10. `Account` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Lanka Dist Client Entry Point (index.html)` --conceptually_related_to--> `Lanka Dist Brand Identity`  [INFERRED]
  client/index.html → client/public/logo.svg
- `Lanka Dist PWA Icon 192x192` --conceptually_related_to--> `Lanka Dist Progressive Web App`  [INFERRED]
  client/public/icons/icon-192.svg → client/index.html
- `usePermission()` --indirect_call--> `selectCurrentUser()`  [INFERRED]
  client/src/hooks/usePermission.js → client/src/store/authSlice.js
- `usePermission()` --indirect_call--> `selectPermissions()`  [INFERRED]
  client/src/hooks/usePermission.js → client/src/store/authSlice.js
- `DeliveryDetail()` --indirect_call--> `selectCurrentUser()`  [INFERRED]
  client/src/pages/delivery/DeliveryDetail.jsx → client/src/store/authSlice.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Lanka Dist Visual Brand System** — client_public_icons_icon_192, client_public_logo, lanka_dist_brand_identity [INFERRED 0.90]
- **Lanka Dist PWA Entry Stack** — client_index, client_public_icons_icon_192, lanka_dist_pwa [INFERRED 0.75]

## Communities (117 total, 82 thin omitted)

### Community 0 - "Sales & Purchasing Frontend"
Cohesion: 0.05
Nodes (98): purchasingApi, salesApi, MapModal(), DeliveryNotePrint(), InvoicePrint(), LoadingSheetPrint(), ConfirmDialog(), VARIANTS (+90 more)

### Community 1 - "App Shell & Navigation"
Cohesion: 0.06
Nodes (30): App(), BottomNav(), DRIVER_ROLES, SALES_ROLES, C, GettingStartedGuide(), ROLES, Header() (+22 more)

### Community 2 - "Auth & JWT Backend"
Cohesion: 0.06
Nodes (39): changePassword(), jwt, login(), refresh(), signAccess(), signRefresh(), { User, Role, Permission }, userInclude (+31 more)

### Community 3 - "Products, Suppliers & Warehouse UI"
Cohesion: 0.08
Nodes (29): productsApi, suppliersApi, warehousesApi, CheckboxField, SelectField, TextareaField, TextField, OpeningStock() (+21 more)

### Community 4 - "Reports & UI Components"
Cohesion: 0.15
Nodes (15): reportsApi, PageHeader(), getPages(), Pagination(), Table(), schema, lineSchema, schema (+7 more)

### Community 5 - "Node.js Backend Dependencies"
Cohesion: 0.06
Nodes (33): bcryptjs, cors, dotenv, express, express-validator, helmet, jsonwebtoken, morgan (+25 more)

### Community 6 - "Accounting & Finance Backend"
Cohesion: 0.10
Nodes (26): { Account, JournalEntry, JournalLine, AccountingPeriod, sequelize }, create(), get(), ledger(), list(), { Op, QueryTypes }, openingBalance(), update() (+18 more)

### Community 7 - "Auth Middleware & Core Models"
Cohesion: 0.08
Nodes (25): jwt, { User, Role, Permission, RolePermission, UserPermission }, Branch, Company, Permission, RolePermission, Warehouse, authorize (+17 more)

### Community 8 - "Frontend Build Tooling"
Cohesion: 0.07
Nodes (26): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/react, vite, vite-plugin-pwa (+18 more)

### Community 9 - "Dashboard & Analytics"
Cohesion: 0.09
Nodes (17): SkeletonTable(), COLOR_MAP, StatsCard(), STATUS_COLORS, AmtCell(), fmt(), TYPE_LABELS, TYPE_ORDER (+9 more)

### Community 10 - "Express Server Setup"
Cohesion: 0.08
Nodes (17): ALLOWED_ORIGINS, app, cors, errorHandler, express, helmet, http, morgan (+9 more)

### Community 11 - "Database Config & Purchasing Models"
Cohesion: 0.11
Nodes (20): { Sequelize }, PriceList, PriceListItem, PurchaseOrder, PurchaseOrderLine, Supplier, SupplierReturn, SupplierReturnLine (+12 more)

### Community 12 - "Authorization Middleware & Routes"
Cohesion: 0.08
Nodes (18): authorize, c, router, authorize, crud, { Expense, Account }, router, authorize (+10 more)

### Community 13 - "Invoice Management Backend"
Cohesion: 0.18
Nodes (21): create(), generateInvoiceNumber(), get(), include, { Invoice, InvoiceLine, Customer, Product, JournalEntry, JournalLine, Account, AccountingPeriod, Stock, StockMovement, sequelize }, list(), notify, { Op } (+13 more)

### Community 14 - "API Client Layer"
Cohesion: 0.13
Nodes (12): authApi, baseApi, baseQueryWithReauth(), rawBaseQuery, customersApi, financeApi, inventoryApi, notificationsApi (+4 more)

### Community 15 - "Delivery & Customer Routes"
Cohesion: 0.10
Nodes (18): DeliveryNote, Route, authorize, crud, { Customer, Route, Branch, Account }, router, authorize, { DeliveryNote, Invoice, Customer, User, Route } (+10 more)

### Community 16 - "Product Catalog & Sales Routes"
Cohesion: 0.11
Nodes (16): Category, Product, SalesOrder, SalesOrderLine, authorize, { Category }, crud, router (+8 more)

### Community 17 - "Inventory & Loading Sheets"
Cohesion: 0.11
Nodes (16): LoadingSheet, LoadingSheetLine, sequelize, StockMovement, { QueryTypes }, router, { sequelize }, authorize (+8 more)

### Community 18 - "Admin List Pages"
Cohesion: 0.17
Nodes (7): Modal(), schema, schema, EXPENSE_CATS, ExpenseForm(), schema, MODULE_LABELS

### Community 19 - "Database Seed Data"
Cohesion: 0.35
Nodes (10): bcrypt, createJE(), ensure(), log(), nextJE(), { QueryTypes }, rawIns(), seed() (+2 more)

### Community 20 - "PWA Manifest"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 21 - "Finance Account Management"
Cohesion: 0.22
Nodes (8): ACCOUNT_TYPES, AccountList(), AccountNode(), countDescendants(), schema, TYPE_BG, TYPE_LABELS, TYPE_ORDER

### Community 22 - "React & State Management"
Cohesion: 0.22
Nodes (9): dependencies, react, react-redux, recharts, @reduxjs/toolkit, react, react-redux, recharts (+1 more)

### Community 23 - "Project Scripts"
Cohesion: 0.22
Nodes (8): name, scripts, build, dev:client, dev:server, install:all, seed, version

### Community 24 - "Payment Models & Routes"
Cohesion: 0.25
Nodes (8): Payment, PaymentAllocation, authorize, generatePaymentNumber(), notify, { Op, QueryTypes }, router, {
  sequelize, Payment, PaymentAllocation, GoodsReceived,
  Supplier, Account, JournalEntry, JournalLine, AccountingPeriod,
}

### Community 25 - "Stock Adjustment Routes"
Cohesion: 0.28
Nodes (8): StockAdjustment, StockAdjustmentLine, authorize, nextAdjNumber(), { Op }, pad(), router, { StockAdjustment, StockAdjustmentLine, Warehouse, Product, Stock, StockMovement, sequelize }

### Community 26 - "Stock Transfer Routes"
Cohesion: 0.28
Nodes (8): StockTransfer, StockTransferLine, authorize, nextTrfNumber(), { Op }, pad(), router, { StockTransfer, StockTransferLine, Warehouse, Product, Stock, StockMovement, sequelize }

### Community 27 - "Invoice Create Page"
Cohesion: 0.40
Nodes (5): BLANK_LINE, getLocation(), InvoiceCreate(), lineSchema, schema

### Community 28 - "Cheque Routes"
Cohesion: 0.33
Nodes (5): Cheque, authorize, { Cheque, Receipt, Customer }, crud, router

### Community 29 - "Brand Identity & PWA Assets"
Cohesion: 0.60
Nodes (5): Lanka Dist Client Entry Point (index.html), Lanka Dist PWA Icon 192x192, Lanka Dist Logo 512x512, Lanka Dist Brand Identity, Lanka Dist Progressive Web App

### Community 30 - "Notifications"
Cohesion: 0.40
Nodes (4): Notification, { Notification }, { Op }, router

## Knowledge Gaps
- **396 isolated node(s):** `name`, `version`, `type`, `dev`, `build` (+391 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **82 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fmtCurrency()` connect `Sales & Purchasing Frontend` to `Products, Suppliers & Warehouse UI`, `Reports & UI Components`, `Dashboard & Analytics`, `API Client Layer`, `Admin List Pages`, `Finance Account Management`, `Invoice Create Page`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `sequelize` connect `Inventory & Loading Sheets` to `Auth & JWT Backend`, `Accounting & Finance Backend`, `Auth Middleware & Core Models`, `Express Server Setup`, `Database Config & Purchasing Models`, `Authorization Middleware & Routes`, `Invoice Management Backend`, `Product Catalog & Sales Routes`, `Database Seed Data`, `Payment Models & Routes`, `Stock Adjustment Routes`, `Stock Transfer Routes`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `usePermission()` connect `Sales & Purchasing Frontend` to `App Shell & Navigation`, `Products, Suppliers & Warehouse UI`, `Reports & UI Components`, `API Client Layer`, `Admin List Pages`, `Finance Account Management`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `usePermission()` (e.g. with `selectCurrentUser()` and `selectPermissions()`) actually correct?**
  _`usePermission()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `type` to the rest of the system?**
  _396 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Sales & Purchasing Frontend` be split into smaller, more focused modules?**
  _Cohesion score 0.05046017137416693 - nodes in this community are weakly interconnected._
- **Should `App Shell & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.05889724310776942 - nodes in this community are weakly interconnected._
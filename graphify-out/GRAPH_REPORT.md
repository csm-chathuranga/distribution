# Graph Report - .  (2026-10-03)

## Corpus Check
- 89 files · ~105,191 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1063 nodes · 2288 edges · 153 communities (65 shown, 88 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Purchasing API
- Bottom Navigation
- Node.js Dependencies
- GRN Controller
- Inventory Controller
- UI Cards & Stats
- Client Build Config
- Account Controller
- Inventory Controller
- Reports API
- Project Structure Docs
- Auth Middleware & Routes
- Invoice Controller
- Delivery Pages
- Auth & Base API
- Price List Models
- Server Entry & CORS
- Sales Order Models
- Modal & Route UI
- Roles & Permissions
- Core Data Models
- User Controller
- Client API Layer
- UI Form Fields
- Database Seeders
- Client Public Manifest
- Client API Layer
- Finance Pages
- Server Controllers
- Database Models
- Database Models
- Core Data Models
- Client Build Config
- Package
- Database Models
- Database Models
- Database Models
- Database Models
- Roles & Permissions
- Roles & Permissions
- GRN Controller
- Application Pages
- Server Config Database
- Application Pages
- Sales Pages
- Sales Pages
- Sales Pages
- Database Models
- Client Index
- Application Pages
- API Routes
- Server Socket
- Client API Layer
- Application Pages
- Van Sales Pages
- Application Pages
- API Routes
- API Routes
- Client Public Firebase
- Server Models User
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Claude
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Client Build Config
- Server Controllers
- Server Models Account
- Server Models Accountingperiod
- Server Models Branch
- Server Models Category
- Server Models Cheque
- Server Models Company
- Server Models Customer
- Server Models Deliverynote
- Server Models Expense
- GRN Controller
- GRN Controller
- Server Models Invoice
- Server Models Invoiceline
- Server Models Journalentry
- Server Models Journalline
- Server Models Loadingsheet
- Server Models Loadingsheetline
- Server Models Notification
- Server Models Payment
- Roles & Permissions
- Server Models Pricelist
- Server Models Pricelistitem
- Server Models Product
- Server Models Purchaseorder
- Server Models Purchaseorderline
- Server Models Receipt
- Server Models Role
- Server Models Route
- Server Models Salesorder
- Server Models Salesorderline
- Server Models Stock
- Server Models Stockadjustment
- Server Models Stockadjustmentline
- Server Models Stockmovement
- Server Models Stocktransfer
- Server Models Stocktransferline
- Server Models Supplier
- Server Models Supplierreturn
- Server Models Supplierreturnline
- Server Models Unit
- Server Models Vehicle
- Server Models Warehouse
- Auth & Base API
- Client API Layer
- Client API Layer
- Inventory Controller
- Client API Layer
- Inventory & Products API
- Purchasing API
- Reports API
- Client API Layer
- Roles & Permissions
- Client API Layer
- Client API Layer
- Client API Layer

## God Nodes (most connected - your core abstractions)
1. `fmtCurrency()` - 92 edges
2. `usePermission()` - 62 edges
3. `fmtDate()` - 62 edges
4. `today()` - 26 edges
5. `sequelize` - 26 edges
6. `Table()` - 24 edges
7. `Account` - 23 edges
8. `PageHeader()` - 22 edges
9. `User` - 22 edges
10. `TextField` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Profile()` --indirect_call--> `selectCurrentUser()`  [INFERRED]
  client/src/pages/Profile.jsx → client/src/store/authSlice.js
- `Lanka Dist Client Entry Point (index.html)` --conceptually_related_to--> `Lanka Dist Brand Identity`  [INFERRED]
  client/index.html → client/public/logo.svg
- `Lanka Dist PWA Icon 192x192` --conceptually_related_to--> `Lanka Dist Progressive Web App`  [INFERRED]
  client/public/icons/icon-192.svg → client/index.html
- `CategoryList()` --calls--> `usePermission()`  [EXTRACTED]
  client/src/pages/categories/CategoryList.jsx → client/src/hooks/usePermission.js
- `UnitList()` --calls--> `usePermission()`  [EXTRACTED]
  client/src/pages/products/UnitList.jsx → client/src/hooks/usePermission.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Van Sales Daily Cycle** — project_structure_loading_sheet, project_structure_van_mode, project_structure_invoice, project_structure_receipt, project_structure_day_end_close [EXTRACTED 0.95]
- **Purchasing Inbound Flow** — project_structure_purchase_order, project_structure_goods_received_note, project_structure_supplier_payment [EXTRACTED 0.98]
- **Automatic Journal Entry Triggers** — project_structure_receipt, project_structure_supplier_payment, project_structure_goods_received_note, project_structure_journal_entries [EXTRACTED 0.95]
- **Lanka Dist Visual Brand System** — client_public_icons_icon_192, client_public_logo, lanka_dist_brand_identity [INFERRED 0.90]
- **Lanka Dist PWA Entry Stack** — client_index, client_public_icons_icon_192, lanka_dist_pwa [INFERRED 0.75]

## Communities (153 total, 88 thin omitted)

### Community 0 - "Purchasing API"
Cohesion: 0.06
Nodes (70): purchasingApi, DeliveryNotePrint(), GRNPrint(), InvoicePrint(), LoadingSheetPrint(), PurchaseOrderPrint(), METHOD_LABEL, ReceiptPrint() (+62 more)

### Community 1 - "Bottom Navigation"
Cohesion: 0.05
Nodes (24): BottomNav(), DRIVER_TABS, SALES_TABS, C, GettingStartedGuide(), ROLES, Header(), LocationTracker() (+16 more)

### Community 2 - "Node.js Dependencies"
Cohesion: 0.05
Nodes (36): bcryptjs, cors, dotenv, express, express-validator, firebase-admin, helmet, jsonwebtoken (+28 more)

### Community 3 - "GRN Controller"
Cohesion: 0.12
Nodes (30): Category, Customer, Expense, GoodsReceived, GoodsReceivedLine, InvoiceLine, Product, ReceiptAllocation (+22 more)

### Community 4 - "Inventory Controller"
Cohesion: 0.10
Nodes (22): CheckboxField, SelectField, TextareaField, TextField, lineSchema, REASONS, schema, StockAdjustmentCreate() (+14 more)

### Community 5 - "UI Cards & Stats"
Cohesion: 0.08
Nodes (19): SkeletonTable(), COLOR_MAP, StatsCard(), Dashboard(), STATUS_COLORS, AmtCell(), fmt(), TrialBalance() (+11 more)

### Community 6 - "Client Build Config"
Cohesion: 0.07
Nodes (26): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/react, vite, vite-plugin-pwa (+18 more)

### Community 7 - "Account Controller"
Cohesion: 0.11
Nodes (23): { Account, JournalEntry, JournalLine, AccountingPeriod, sequelize }, create(), get(), ledger(), list(), { Op, QueryTypes }, openingBalance(), update() (+15 more)

### Community 8 - "Inventory Controller"
Cohesion: 0.12
Nodes (13): inventoryApi, productsApi, warehousesApi, SearchableSelect(), StockOverview(), lineSchema, schema, StockTransferCreate() (+5 more)

### Community 9 - "Reports API"
Cohesion: 0.18
Nodes (9): reportsApi, PageHeader(), Table(), CategoryList(), schema, UnitList(), ProductProfitability(), SalesRepKPI() (+1 more)

### Community 10 - "Project Structure Docs"
Cohesion: 0.15
Nodes (24): Back-Order (Items Not on Van), Cheque Tracking, Credit Note, Day-End Close, Delivery, Distribution App, Finance Module, Goods Received Note (GRN) (+16 more)

### Community 11 - "Auth Middleware & Routes"
Cohesion: 0.08
Nodes (17): authorize, c, router, authorize, { Category }, crud, router, authorize (+9 more)

### Community 12 - "Invoice Controller"
Cohesion: 0.15
Nodes (21): create(), generateInvoiceNumber(), get(), include, { Invoice, InvoiceLine, Customer, Product, JournalEntry, JournalLine, Account, AccountingPeriod, Stock, StockMovement, LoadingSheetLine, LoadingSheet, sequelize }, list(), notify, { Op } (+13 more)

### Community 13 - "Delivery Pages"
Cohesion: 0.10
Nodes (13): DeliveryList(), JournalList(), lineSchema, schema, schema, STATUS_BADGE, STATUS_OPTS, VehicleList() (+5 more)

### Community 14 - "Auth & Base API"
Cohesion: 0.18
Nodes (10): authApi, baseApi, baseQueryWithReauth(), rawBaseQuery, financeApi, notificationsApi, suppliersApi, vehiclesApi (+2 more)

### Community 15 - "Price List Models"
Cohesion: 0.11
Nodes (14): PriceList, PriceListItem, sequelize, { QueryTypes }, router, { sequelize }, authorize, { PriceList, PriceListItem, Product, sequelize } (+6 more)

### Community 16 - "Server Entry & CORS"
Cohesion: 0.13
Nodes (11): ALLOWED_ORIGINS, app, cors, errorHandler, express, helmet, morgan, routes (+3 more)

### Community 17 - "Sales Order Models"
Cohesion: 0.14
Nodes (13): SalesOrder, SalesOrderLine, authorize, crud, { Customer, Route, Branch, Account, Invoice, Receipt, SalesOrder, sequelize }, { Op }, router, authorize (+5 more)

### Community 18 - "Modal & Route UI"
Cohesion: 0.18
Nodes (7): Modal(), RouteList(), schema, BranchList(), schema, MODULE_LABELS, RoleList()

### Community 19 - "Roles & Permissions"
Cohesion: 0.16
Nodes (12): allPermissions(), Branch, Permission, bcrypt, CHART_OF_ACCOUNTS, PERMISSIONS, ROLE_PERMISSIONS, seed() (+4 more)

### Community 20 - "Core Data Models"
Cohesion: 0.16
Nodes (12): Cheque, Receipt, authorize, { Cheque, Receipt, Customer }, crud, router, authorize, crud (+4 more)

### Community 21 - "User Controller"
Cohesion: 0.27
Nodes (11): create(), get(), include, list(), { Op }, remove(), setPermissions(), update() (+3 more)

### Community 22 - "Client API Layer"
Cohesion: 0.20
Nodes (7): customersApi, settingsApi, DeliveryCreate(), schema, BLANK_LINE, lineSchema, schema

### Community 23 - "UI Form Fields"
Cohesion: 0.27
Nodes (8): FormField(), schema, SupplierReturnCreate(), firstDayOfMonth(), SalesSummary(), CreditNoteCreate(), schema, today()

### Community 24 - "Database Seeders"
Cohesion: 0.35
Nodes (10): bcrypt, createJE(), ensure(), log(), nextJE(), { QueryTypes }, rawIns(), seed() (+2 more)

### Community 25 - "Client Public Manifest"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 26 - "Client API Layer"
Cohesion: 0.29
Nodes (7): salesApi, INVALIDATION_MAP, NotificationContext, NotificationProvider(), registerFcmToken(), saveFcmToken(), firebaseConfig

### Community 27 - "Finance Pages"
Cohesion: 0.22
Nodes (8): ACCOUNT_TYPES, AccountList(), AccountNode(), countDescendants(), schema, TYPE_BG, TYPE_LABELS, TYPE_ORDER

### Community 28 - "Server Controllers"
Cohesion: 0.29
Nodes (8): changePassword(), jwt, login(), refresh(), signAccess(), signRefresh(), { User, Role, Permission }, userInclude

### Community 29 - "Database Models"
Cohesion: 0.22
Nodes (7): Notification, { db, messaging }, getModels(), notify(), { Notification }, { Op }, router

### Community 30 - "Database Models"
Cohesion: 0.22
Nodes (8): Company, authorize, { Branch, Company }, crud, router, CHART_OF_ACCOUNTS, seedAccounts(), { sequelize, Company, Account, AccountingPeriod }

### Community 31 - "Core Data Models"
Cohesion: 0.20
Nodes (9): DeliveryNote, authorize, { DeliveryNote, Invoice, Customer, User, Route }, include, includeDetail, { InvoiceLine, Product }, notify, { Op } (+1 more)

### Community 32 - "Client Build Config"
Cohesion: 0.22
Nodes (9): @capacitor/cli, dependencies, @capacitor/cli, react-leaflet, @reduxjs/toolkit, @tanstack/react-query, react-leaflet, @reduxjs/toolkit (+1 more)

### Community 33 - "Package"
Cohesion: 0.22
Nodes (8): name, scripts, build, dev:client, dev:server, install:all, seed, version

### Community 34 - "Database Models"
Cohesion: 0.25
Nodes (8): Payment, PaymentAllocation, authorize, generatePaymentNumber(), notify, { Op, QueryTypes }, router, {
  sequelize, Payment, PaymentAllocation, GoodsReceived,
  Supplier, Account, JournalEntry, JournalLine, AccountingPeriod,
}

### Community 35 - "Database Models"
Cohesion: 0.25
Nodes (8): PurchaseOrder, PurchaseOrderLine, authorize, crud, generatePONumber(), { Op }, { PurchaseOrder, PurchaseOrderLine, Supplier, Product, Warehouse }, router

### Community 36 - "Database Models"
Cohesion: 0.28
Nodes (8): StockAdjustment, StockAdjustmentLine, authorize, nextAdjNumber(), { Op }, pad(), router, { StockAdjustment, StockAdjustmentLine, Warehouse, Product, Stock, StockMovement, sequelize }

### Community 37 - "Database Models"
Cohesion: 0.28
Nodes (8): StockTransfer, StockTransferLine, authorize, nextTrfNumber(), { Op }, pad(), router, { StockTransfer, StockTransferLine, Warehouse, Product, Stock, StockMovement, sequelize }

### Community 38 - "Roles & Permissions"
Cohesion: 0.50
Nodes (7): create(), get(), list(), { Role, Permission, RolePermission }, setPermissions(), update(), Role

### Community 39 - "Roles & Permissions"
Cohesion: 0.25
Nodes (6): jwt, { User, Role, Permission, RolePermission, UserPermission }, RolePermission, auth, c, router

### Community 40 - "GRN Controller"
Cohesion: 0.25
Nodes (7): SupplierReturn, SupplierReturnLine, authorize, include, { Op }, router, { SupplierReturn, SupplierReturnLine, Supplier, GoodsReceived, Product, JournalEntry, JournalLine, Account, AccountingPeriod, Stock, StockMovement, sequelize }

### Community 41 - "Application Pages"
Cohesion: 0.29
Nodes (5): CUSTOMER_TYPES, CustomerList(), schema, TYPE_AVATAR, TYPE_COLORS

### Community 42 - "Server Config Database"
Cohesion: 0.29
Nodes (4): { Sequelize }, fs, path, sequelize

### Community 43 - "Application Pages"
Cohesion: 0.47
Nodes (5): firstDayOfMonth(), MOVEMENT_COLORS, StockMovement(), StockView(), fmtNumber()

### Community 44 - "Sales Pages"
Cohesion: 0.33
Nodes (4): EXPENSE_CATS, ExpenseList(), PAYMENT_METHODS, schema

### Community 45 - "Sales Pages"
Cohesion: 0.40
Nodes (5): BLANK_LINE, getLocation(), InvoiceCreate(), lineSchema, schema

### Community 46 - "Sales Pages"
Cohesion: 0.53
Nodes (4): isStale(), makeIcon(), SalesRepMap(), timeAgo()

### Community 47 - "Database Models"
Cohesion: 0.33
Nodes (5): Vehicle, authorize, crud, router, { Vehicle }

### Community 48 - "Client Index"
Cohesion: 0.60
Nodes (5): Lanka Dist Client Entry Point (index.html), Lanka Dist PWA Icon 192x192, Lanka Dist Logo 512x512, Lanka Dist Brand Identity, Lanka Dist Progressive Web App

### Community 49 - "Application Pages"
Cohesion: 0.40
Nodes (3): createSchema, editSchema, UserList()

### Community 50 - "API Routes"
Cohesion: 0.40
Nodes (4): authorize, crud, { Route, Branch, User }, router

### Community 53 - "Application Pages"
Cohesion: 0.83
Nodes (3): firstDayOfMonth(), ProfitLoss(), today()

### Community 54 - "Van Sales Pages"
Cohesion: 0.83
Nodes (3): fmtQty(), pillStyle(), VanStock()

### Community 56 - "API Routes"
Cohesion: 0.50
Nodes (3): authorize, c, router

### Community 57 - "API Routes"
Cohesion: 0.50
Nodes (3): authorize, c, router

## Knowledge Gaps
- **431 isolated node(s):** `name`, `short_name`, `description`, `start_url`, `display` (+426 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **88 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fmtCurrency()` connect `Purchasing API` to `Inventory Controller`, `UI Cards & Stats`, `Inventory Controller`, `Application Pages`, `Reports API`, `Application Pages`, `Sales Pages`, `Delivery Pages`, `Sales Pages`, `Application Pages`, `Client API Layer`, `UI Form Fields`, `Application Pages`, `Finance Pages`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `usePermission()` connect `Purchasing API` to `Bottom Navigation`, `Inventory Controller`, `Reports API`, `Application Pages`, `Sales Pages`, `Delivery Pages`, `Sales Pages`, `Application Pages`, `Modal & Route UI`, `Client API Layer`, `Application Pages`, `Finance Pages`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `sequelize` connect `Price List Models` to `Database Models`, `GRN Controller`, `Database Models`, `Database Models`, `Database Models`, `Account Controller`, `GRN Controller`, `Invoice Controller`, `Server Entry & CORS`, `Sales Order Models`, `Roles & Permissions`, `Core Data Models`, `Database Seeders`, `Database Models`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `usePermission()` (e.g. with `selectCurrentUser()` and `selectPermissions()`) actually correct?**
  _`usePermission()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `short_name`, `description` to the rest of the system?**
  _431 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Purchasing API` be split into smaller, more focused modules?**
  _Cohesion score 0.05682951146560319 - nodes in this community are weakly interconnected._
- **Should `Bottom Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.05333333333333334 - nodes in this community are weakly interconnected._
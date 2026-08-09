# Distribution App — Day-to-Day Process Guide

---

## Purchasing (Inbound Stock)

### Step 1 — Create Purchase Order
- Go to **Purchasing → Purchase Orders → New**
- Select supplier, receiving warehouse, add product lines with quantities and unit costs
- Submit → status: `pending`

### Step 2 — Receive Goods (GRN)
- When physical stock arrives, go to **Purchasing → Goods Received → New GRN**
- Link it to the PO (optional), enter received quantities and actual unit cost
- Submit → stock levels are updated immediately in the warehouse

### Step 3 — Pay the Supplier
- Go to **Purchasing → Supplier Payments → New**
- Record the payment amount and method
- If goods were damaged/wrong, create a **Supplier Return** instead

---

## Sales (Outbound)

### Step 4 — Create Invoice
- Go to **Sales → Invoices → New**
- Select customer, add product lines (price, qty, discount, VAT)
- Submit → invoice is issued, stock is reserved

### Step 5 — Create Delivery
- Go to **Delivery → New Delivery**
- Link to the invoice, assign driver and route
- Driver completes delivery → print Delivery Note

### Step 6 — Collect Payment
- Go to **Sales → Receipts → New Receipt**
- Link to the customer/invoice, enter amount and payment method (cash/cheque)
- For cheques, track them under **Sales → Cheques**
- For returns/cancellations, issue a **Credit Note**

---

## Van Sales (Mobile Sales Rep with Printer)

> Van sales replace the standard Invoice → Delivery flow. Stock is tracked at the loading sheet level, not per-invoice warehouse deduction.

### Step 4a — Create Loading Sheet
- Go to **Van Sales → Loading Sheets → New**
- Select sales rep, driver, route, vehicle, and warehouse
- Add products and quantities to load onto the van
- Submit → status: `DRAFT`

### Step 4b — Load Van
- Open the loading sheet → click **Load Van**
- System deducts loaded quantities from warehouse stock
- Status changes to `LOADED` — van is now on the road

### Step 4c — Invoice Each Customer (on the road)
- Open the loading sheet → click **Create Invoice**
- System enters **Van Mode**: only products on the van are shown, with remaining quantities visible
- Select customer, enter quantities sold and prices
- Submit → **Post Invoice** immediately
- System accumulates sold quantities on the loading sheet lines (no extra warehouse deduction)
- Click **Print** → print on portable Bluetooth printer and hand to customer

### Step 4d — Collect Payment (on the spot)
- On the Invoice Detail page, click **Collect Payment**
- Enter amount (pre-filled with full balance)
- Choose method:
  - **Cash** → invoice marked `PAID` or `PARTIAL`
  - **Cheque** → enter cheque number, bank, and date; tracked under Sales → Cheques
  - **Credit** → leave it; invoice stays `POSTED`, customer outstanding balance increases
- Repeat Steps 4c–4d for each customer on the route

### Step 4e — Items Not on Van (Back-Order)
- If a customer wants a product not loaded on the van, create a **regular Invoice** (Sales → Invoices → New, no van mode)
- Stock deducts from warehouse on posting
- Assign to driver via **Delivery → New Delivery** for a future visit

### Step 4f — Day-End Close
- Return to the loading sheet → click **Day-End Close**
- Modal shows each product: **Loaded | Invoiced | Expected Back | Returned**
- Enter physical return quantities (pre-filled from expected returns)
- Enter **Cash Collected** — system shows variance vs. total invoiced
- Submit → returned stock goes back to warehouse, sheet status: `CLOSED`

```
Morning:   Create Loading Sheet → Load Van

On Route:  Visit customer → Create Invoice (Van Mode)
                          → Post Invoice
                          → Print invoice on portable printer
                          → Collect Payment (cash / cheque / credit)
           [Repeat per customer]

Evening:   Day-End Close → enter returns + cash collected
                        → warehouse restocked with returns
                        → sheet closed and reconciled
```

---

## Inventory Management (As Needed)

| Action | When to Use |
|---|---|
| **Stock Transfer** | Move stock between warehouses |
| **Stock Adjustment** | Correct discrepancies (damage, counting errors) |
| **Opening Stock** | One-time entry when setting up a new warehouse |

---

## Typical Daily Cycle

```
Morning:   Check stock levels → Create POs if needed
           Create Loading Sheets → Load Vans

Daytime:   Receive GRNs as supplier deliveries arrive
           Office: Sales team creates Invoices + assigns Deliveries
           Van: Sales rep invoices each customer on the road,
                collects cash/cheque, prints receipt on the spot

Evening:   Van sales reps submit Day-End Close (returns + cash)
           Finance reconciles cheques (deposit/clear/bounce)
           Review low-stock report
```

---

## Finance

Accounts & Journals run in the background — receipts, payments, and GRNs all post journal entries automatically. Use **Finance → Trial Balance** and **Reports** for end-of-period reconciliation.

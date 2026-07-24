import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, MapPin, Navigation, CheckCircle2, Receipt,
  Truck, Package, UserCheck, ChevronRight, AlertCircle,
  Camera, CreditCard, ClipboardList, Eye, PlusCircle,
  LogIn, Smartphone, ArrowRight, Info, ShieldCheck,
  BookOpen, Settings, BarChart2, Building2, Users,
} from 'lucide-react';
import SlideOver from './ui/SlideOver';

/* ── role tabs ─────────────────────────────────────────────────── */
const ROLES = [
  { id: 'admin',   label: 'Admin',      icon: ShieldCheck,  color: 'slate'  },
  { id: 'sales',   label: 'Sales Rep',  icon: FileText,     color: 'blue'   },
  { id: 'driver',  label: 'Driver',     icon: Truck,        color: 'green'  },
  { id: 'manager', label: 'Manager',    icon: ClipboardList, color: 'purple' },
  { id: 'cashier', label: 'Cashier',    icon: CreditCard,   color: 'amber'  },
];

/* ── colour tokens ──────────────────────────────────────────────── */
const C = {
  slate:  { badge: 'bg-slate-700',  light: 'bg-slate-50',  border: 'border-slate-300',  text: 'text-slate-700',  icon: 'text-slate-600'  },
  blue:   { badge: 'bg-blue-600',   light: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   icon: 'text-blue-600'   },
  green:  { badge: 'bg-green-600',  light: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  icon: 'text-green-600'  },
  purple: { badge: 'bg-purple-600', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' },
  amber:  { badge: 'bg-amber-500',  light: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  icon: 'text-amber-600'  },
};

/* ── step component ─────────────────────────────────────────────── */
function Step({ num, icon: Icon, title, desc, tip, color, link, linkLabel, onNav }) {
  const c = C[color];
  return (
    <div className="relative flex gap-3">
      {/* vertical line */}
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full ${c.badge} flex items-center justify-center flex-shrink-0 z-10`}>
          <span className="text-white text-xs font-bold">{num}</span>
        </div>
        <div className="w-px flex-1 bg-gray-200 mt-1" />
      </div>

      {/* card */}
      <div className={`flex-1 mb-4 rounded-xl border ${c.border} ${c.light} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg bg-white border ${c.border} flex items-center justify-center flex-shrink-0`}>
            <Icon size={15} className={c.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{desc}</p>
            {tip && (
              <div className="flex items-start gap-1.5 mt-2 p-2 bg-white rounded-lg border border-gray-200">
                <Info size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-500 leading-relaxed">{tip}</p>
              </div>
            )}
          </div>
        </div>
        {link && (
          <button
            onClick={() => onNav(link)}
            className={`mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg border ${c.border} ${c.text} bg-white hover:opacity-80 transition-opacity`}
          >
            <PlusCircle size={12} /> {linkLabel} <ChevronRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── divider with label ─────────────────────────────────────────── */
function SectionLabel({ label }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-1">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

/* ── role content ───────────────────────────────────────────────── */
function AdminGuide({ onNav }) {
  return (
    <div>
      <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-300 rounded-xl mb-5">
        <ShieldCheck size={14} className="text-slate-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-700 leading-relaxed">
          Admin has <strong>full access</strong> to all modules. Use this guide to complete the initial system setup before users start working.
        </p>
      </div>

      <SectionLabel label="Step 1 — Company & System Setup" />
      <Step num={1} color="slate" icon={Building2} onNav={onNav}
        title="Verify Company & Branch"
        desc="Go to Settings → Branches. Confirm the company name, address, phone and email are correct. These appear on invoices and reports."
        link="/settings/branches" linkLabel="View Branches"
      />
      <Step num={2} color="slate" icon={BookOpen} onNav={onNav}
        title="Review Chart of Accounts"
        desc="Go to Accounts. The system pre-creates all required GL accounts (Debtors, Revenue, VAT Payable, Stock, COGS, Cash). Add any extra expense or asset accounts your business needs."
        link="/accounts" linkLabel="View Accounts"
      />
      <Step num={3} color="slate" icon={Settings} onNav={onNav}
        title="Open Accounting Period"
        desc="Go to Settings → Accounting Periods. Click 'Open Period' for the current month (e.g. July 2026). Without an open period, no invoices or GRNs can be posted."
        link="/settings/periods" linkLabel="Accounting Periods"
        tip="Open a new period at the start of every month. Close the previous month once all entries are finalised."
      />

      <SectionLabel label="Step 2 — Roles & Users" />
      <Step num={4} color="slate" icon={ShieldCheck} onNav={onNav}
        title="Review Roles & Permissions"
        desc="Go to Settings → Roles. Each role (Sales Rep, Driver, Cashier, Manager) has pre-set permissions. You can add or remove individual permissions per role."
        link="/settings/roles" linkLabel="View Roles"
      />
      <Step num={5} color="slate" icon={Users} onNav={onNav}
        title="Create User Accounts"
        desc="Go to Settings → Users and create accounts for every staff member. Assign each user their role (Sales Rep, Driver, Cashier, Manager). They log in with their email and password."
        link="/settings/users" linkLabel="Create Users"
        tip="Default passwords should be changed by each user on first login via Settings → Change Password."
      />

      <SectionLabel label="Step 3 — Products & Inventory" />
      <Step num={6} color="slate" icon={Package} onNav={onNav}
        title="Add Categories & Products"
        desc="Go to Products. First create categories (e.g. Dairy, Beverages), then add products with SKU, cost price, selling price, VAT rate and reorder point."
        link="/products" linkLabel="Manage Products"
      />
      <Step num={7} color="slate" icon={Building2} onNav={onNav}
        title="Set Up Warehouses"
        desc="Go to Warehouses and create your storage locations (main store, van stock etc.). Stock levels are tracked separately per warehouse."
        link="/warehouses" linkLabel="Manage Warehouses"
      />

      <SectionLabel label="Step 4 — Customers & Routes" />
      <Step num={8} color="slate" icon={MapPin} onNav={onNav}
        title="Create Delivery Routes"
        desc="Go to Routes. Create each delivery route and assign a Sales Rep and a Driver. Routes group customers geographically for efficient delivery planning."
        link="/routes" linkLabel="Manage Routes"
      />
      <Step num={9} color="slate" icon={UserCheck} onNav={onNav}
        title="Add Customers"
        desc="Go to Customers. Add each customer with their credit limit, credit days and assign them to a route. A GL account is linked automatically for debtor tracking."
        link="/customers" linkLabel="Manage Customers"
      />

      <SectionLabel label="Step 5 — First Stock Purchase" />
      <Step num={10} color="slate" icon={ClipboardList} onNav={onNav}
        title="Create a Purchase Order"
        desc="Go to Purchase Orders → New. Select supplier, warehouse and the products you are buying. Submit the PO — status becomes PENDING."
        link="/purchase-orders/new" linkLabel="New Purchase Order"
      />
      <Step num={11} color="slate" icon={Truck} onNav={onNav}
        title="Receive goods (GRN)"
        desc="When goods arrive, go to Goods Received → New GRN. Link it to the PO, confirm quantities received. Post the GRN — stock levels increase automatically."
        link="/goods-received" linkLabel="Goods Received"
      />

      <SectionLabel label="Ongoing — Monitoring" />
      <Step num={12} color="slate" icon={BarChart2} onNav={onNav}
        title="Dashboard & Reports"
        desc="The dashboard shows live sales, collections, outstanding balances and low-stock alerts. Go to Reports for Sales Summary, Aged Debtors, Stock Movement and P&L."
        link="/" linkLabel="Open Dashboard"
      />
    </div>
  );
}

function SalesRepGuide({ onNav }) {
  return (
    <div>
      {/* login note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-5">
        <LogIn size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Log in with your <strong>sales rep account</strong> (e.g. sales1@lankadist.lk). You can use the <strong>web browser</strong> or the <strong>Android app</strong> installed on your phone.
        </p>
      </div>

      <SectionLabel label="Creating an Invoice" />
      <Step num={1} color="blue" icon={PlusCircle} onNav={onNav}
        title="Go to Invoices → New Invoice"
        desc="Tap the 'Invoices' menu in the sidebar, then click the '+ New Invoice' button at the top right."
        link="/invoices/new" linkLabel="Open New Invoice Form"
      />
      <Step num={2} color="blue" icon={MapPin} onNav={onNav}
        title="GPS location is captured automatically"
        desc="As soon as the form opens, the app fetches your current GPS coordinates. You will see a green banner showing your latitude and longitude — this pins the customer visit to a map location."
        tip="On Android, tap 'Allow' if the app asks for location permission. On the web browser, click 'Allow' in the browser permission popup."
      />
      <Step num={3} color="blue" icon={UserCheck} onNav={onNav}
        title="Select the customer"
        desc="Choose the customer from the dropdown. The form will pre-fill their credit days and terms."
      />
      <Step num={4} color="blue" icon={Package} onNav={onNav}
        title="Add products"
        desc="Click '+ Add Line' to add each product. Select the product, enter quantity. The unit price and VAT fill automatically from the product master."
        tip="Discount can be entered as a percentage per line. The totals (subtotal, VAT, grand total) update in real time."
      />
      <Step num={5} color="blue" icon={FileText} onNav={onNav}
        title="Save as Draft"
        desc="Click 'Save Invoice'. The invoice is saved as DRAFT — no stock is deducted yet and no journal entry is created. You can edit it before posting."
      />
      <Step num={6} color="blue" icon={CheckCircle2} onNav={onNav}
        title="Post the Invoice"
        desc="From the invoice list, click the ✓ (post) button next to the draft invoice, or open it and click 'Post Invoice'. Posting deducts stock, creates the journal entry, and updates the customer's outstanding balance."
        tip="An open Accounting Period must exist for the invoice date. If posting fails, ask your manager to open the period in Settings → Accounting Periods."
      />

      <SectionLabel label="Collecting Payment from Customer" />
      <Step num={7} color="blue" icon={Receipt} onNav={onNav}
        title="Go to Receipts → New Receipt"
        desc="After the customer pays (cash or cheque), go to Receipts in the sidebar and create a new receipt."
        link="/receipts/new" linkLabel="Open New Receipt Form"
      />
      <Step num={8} color="blue" icon={CreditCard} onNav={onNav}
        title="Fill receipt details"
        desc="Select the customer, enter the amount received, choose payment method (Cash / Cheque / Bank Transfer). If cheque, enter cheque number and bank name."
      />
      <Step num={9} color="blue" icon={ClipboardList} onNav={onNav}
        title="Allocate to invoices"
        desc="The form shows all open invoices for that customer. Enter the amount to allocate against each invoice. The total allocated must equal the receipt amount."
        tip="If the customer pays more than one invoice at once, split the amount across multiple invoices. Partial allocation is also allowed."
      />

      <SectionLabel label="Issuing a Credit Note" />
      <Step num={10} color="blue" icon={AlertCircle} onNav={onNav}
        title="When a customer returns goods"
        desc="Go to Credit Notes in the sidebar, click '+ New Credit Note'. Select the original invoice, then enter the returned product quantities. Posting the credit note restores stock and reduces the customer balance."
        link="/credit-notes" linkLabel="Open Credit Notes"
      />
    </div>
  );
}

function DriverGuide({ onNav }) {
  return (
    <div>
      <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-5">
        <Smartphone size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-green-700 leading-relaxed">
          Log in with your <strong>driver account</strong> (e.g. driver1@lankadist.lk). Use the <strong>Android app</strong> on your phone for best GPS navigation experience.
        </p>
      </div>

      <SectionLabel label="Starting Your Delivery Round" />
      <Step num={1} color="green" icon={ClipboardList} onNav={onNav}
        title="Check your delivery list"
        desc="Go to 'Deliveries' in the sidebar. You will see all Delivery Notes assigned to you by the manager, showing the customer name, route and status."
        link="/deliveries" linkLabel="Open Deliveries"
      />
      <Step num={2} color="green" icon={Eye} onNav={onNav}
        title="Open a Delivery Note"
        desc="Tap on any delivery to open the detail page. You will see the customer name, address, the invoice items to deliver, and a Navigate button if GPS was captured."
      />
      <Step num={3} color="green" icon={Navigation} onNav={onNav}
        title="Navigate to the customer"
        desc="Tap the blue 'Navigate' button. This opens Google Maps on your phone with turn-by-turn directions to the customer's GPS location captured when the invoice was created."
        tip="The Navigate button only appears if the sales rep captured a GPS location when creating the invoice. If missing, use the customer address shown on the delivery note."
      />

      <SectionLabel label="Completing a Delivery" />
      <Step num={4} color="green" icon={Package} onNav={onNav}
        title="Hand over the goods"
        desc="Deliver the items listed in the delivery note to the customer. Check each item against the list."
      />
      <Step num={5} color="green" icon={CheckCircle2} onNav={onNav}
        title="Mark delivery as Delivered"
        desc="In the delivery detail page, tap 'Mark as Delivered'. The delivery note status changes from DISPATCHED to DELIVERED, and the manager can see it completed in real time."
        tip="You cannot mark a delivery as delivered if it hasn't been dispatched first. The manager dispatches it from their view."
      />

      <SectionLabel label="Viewing Your Invoices" />
      <Step num={6} color="green" icon={FileText} onNav={onNav}
        title="View invoice details"
        desc="From the delivery note, you can also tap to view the full invoice — showing what was ordered, prices, and the customer's outstanding balance."
        link="/invoices" linkLabel="View Invoices"
      />
    </div>
  );
}

function ManagerGuide({ onNav }) {
  return (
    <div>
      <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl mb-5">
        <ClipboardList size={14} className="text-purple-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-purple-700 leading-relaxed">
          As manager you control the full workflow — from setup to assigning deliveries to drivers and monitoring the dashboard.
        </p>
      </div>

      <SectionLabel label="One-time Setup" />
      <Step num={1} color="purple" icon={UserCheck} onNav={onNav}
        title="Create users for each role"
        desc="Go to Settings → Users and create accounts for each sales rep, driver, cashier and accountant. Assign the correct role so they only see what they need."
        link="/settings/users" linkLabel="Manage Users"
      />
      <Step num={2} color="purple" icon={MapPin} onNav={onNav}
        title="Set up Routes and assign staff"
        desc="Go to Routes and create delivery routes. Assign a Sales Rep and a Driver to each route. Customers are then linked to routes."
        link="/routes" linkLabel="Manage Routes"
      />
      <Step num={3} color="purple" icon={Package} onNav={onNav}
        title="Open an Accounting Period"
        desc="Go to Settings → Accounting Periods and make sure the current month's period is OPEN. Invoices and GRNs cannot be posted without an open period."
        link="/settings/periods" linkLabel="Manage Periods"
      />

      <SectionLabel label="Daily Operations — Sending Stock to Sales Reps" />
      <Step num={4} color="purple" icon={Truck} onNav={onNav}
        title="Create a Loading Sheet"
        desc="Before the sales rep goes out, create a Loading Sheet (Inventory → Loading Sheets). Select the route, sales rep, driver and the products loaded on the vehicle. This records what stock left the warehouse."
        link="/loading-sheets" linkLabel="Loading Sheets"
      />

      <SectionLabel label="Assigning Deliveries to Drivers" />
      <Step num={5} color="purple" icon={FileText} onNav={onNav}
        title="Review posted invoices"
        desc="Go to Invoices and filter by status POSTED. These are invoices ready for delivery."
        link="/invoices" linkLabel="View Invoices"
      />
      <Step num={6} color="purple" icon={Truck} onNav={onNav}
        title="Create a Delivery Note"
        desc="Open an invoice and click 'Create Delivery Note'. Select the driver and route. The delivery note is now visible to the assigned driver in their Deliveries list."
        link="/deliveries" linkLabel="View Deliveries"
      />
      <Step num={7} color="purple" icon={CheckCircle2} onNav={onNav}
        title="Dispatch the delivery"
        desc="In the Delivery Note detail, click 'Mark as Dispatched' to confirm the driver has left with the goods. The driver can then mark it Delivered after completing the drop."
      />

      <SectionLabel label="Monitoring" />
      <Step num={8} color="purple" icon={ClipboardList} onNav={onNav}
        title="Dashboard overview"
        desc="The dashboard shows today's sales, monthly collections, outstanding balances and low-stock alerts. Charts show the 30-day sales trend and invoice status breakdown."
        link="/" linkLabel="Open Dashboard"
      />
    </div>
  );
}

function CashierGuide({ onNav }) {
  return (
    <div>
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-5">
        <CreditCard size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          As cashier you record all incoming payments from customers and manage cheques.
        </p>
      </div>

      <SectionLabel label="Recording a Cash Receipt" />
      <Step num={1} color="amber" icon={Receipt} onNav={onNav}
        title="Go to Receipts → New Receipt"
        desc="When a customer pays at the counter or a sales rep hands in cash collected on the road, create a new receipt."
        link="/receipts/new" linkLabel="New Receipt"
      />
      <Step num={2} color="amber" icon={UserCheck} onNav={onNav}
        title="Select the customer"
        desc="Choose the customer who paid. The system shows their current outstanding balance and all open invoices."
      />
      <Step num={3} color="amber" icon={CreditCard} onNav={onNav}
        title="Enter amount and payment method"
        desc="Enter the total amount received. Choose Cash, Cheque or Bank Transfer. For cheques, enter the cheque number, bank and branch name."
      />
      <Step num={4} color="amber" icon={ClipboardList} onNav={onNav}
        title="Allocate to invoices"
        desc="The form lists all open invoices. Enter how much of the receipt applies to each invoice. Click Save — the invoice balances update instantly and the customer's outstanding drops."
        tip="You can partially allocate — e.g. receive LKR 5,000 and apply LKR 3,000 to invoice #1 and LKR 2,000 to invoice #2."
      />

      <SectionLabel label="Managing Cheques" />
      <Step num={5} color="amber" icon={CreditCard} onNav={onNav}
        title="View pending cheques"
        desc="Go to Cheques in the sidebar. Cheques received with receipts appear here with status PENDING."
        link="/cheques" linkLabel="View Cheques"
      />
      <Step num={6} color="amber" icon={CheckCircle2} onNav={onNav}
        title="Mark cheque as cleared"
        desc="Once the bank confirms the cheque has cleared, open the cheque record and mark it as CLEARED. If the cheque bounces, mark it BOUNCED — the manager will handle the reversal."
      />

      <SectionLabel label="Supplier Payments" />
      <Step num={7} color="amber" icon={Truck} onNav={onNav}
        title="Record payments to suppliers"
        desc="Go to Payments in the sidebar to record cash or cheque payments made to suppliers against their Goods Received Notes (GRNs)."
        link="/payments" linkLabel="View Payments"
      />
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────── */
export default function GettingStartedGuide({ open, onClose }) {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState('admin');

  const onNav = (link) => { onClose(); navigate(link); };

  const role = ROLES.find(r => r.id === activeRole);
  const c = C[role.color];

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      size="lg"
      title="User Guide"
      subtitle="Step-by-step instructions for each role in the system."
    >
      {/* Role tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {ROLES.map(r => {
          const rc = C[r.color];
          const Icon = r.icon;
          const active = r.id === activeRole;
          return (
            <button
              key={r.id}
              onClick={() => setActiveRole(r.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                active
                  ? `${rc.badge} text-white border-transparent shadow-sm`
                  : `bg-white ${rc.border} ${rc.text} hover:${rc.light}`
              }`}
            >
              <Icon size={13} />
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Role heading */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${c.light} border ${c.border} mb-5`}>
        <div className={`w-7 h-7 rounded-lg ${c.badge} flex items-center justify-center flex-shrink-0`}>
          {(() => { const Icon = role.icon; return <Icon size={14} className="text-white" />; })()}
        </div>
        <div>
          <p className={`text-sm font-bold ${c.text}`}>{role.label} Workflow</p>
          <p className="text-xs text-gray-500">Follow these steps in order</p>
        </div>
      </div>

      {/* Content */}
      {activeRole === 'admin'   && <AdminGuide     onNav={onNav} />}
      {activeRole === 'sales'   && <SalesRepGuide  onNav={onNav} />}
      {activeRole === 'driver'  && <DriverGuide    onNav={onNav} />}
      {activeRole === 'manager' && <ManagerGuide   onNav={onNav} />}
      {activeRole === 'cashier' && <CashierGuide   onNav={onNav} />}
    </SlideOver>
  );
}

import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import {
  LayoutDashboard, Package, Users, ShoppingCart, FileText, Truck,
  CreditCard, BarChart2, Settings, ChevronDown, Warehouse, BookOpen,
  Receipt, ArrowLeftRight, Building2, LogOut, MapPin, ClipboardList,
  RotateCcw, Navigation, Tag, Scale, Calendar, TrendingUp, AlertTriangle, Zap,
} from 'lucide-react';
import { logout, selectCurrentUser } from '../store/authSlice';
import { usePermission, useCanAny } from '../hooks/usePermission';

function NavGroup({ icon: Icon, label, children, isOpen, onToggle }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-text hover:bg-slate-800 hover:text-white transition-colors"
      >
        <Icon size={17} />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 text-slate-600 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3 py-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-green-800 text-white font-semibold'
            : 'text-sidebar-text hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      {Icon && <Icon size={15} />}
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const canInventory = usePermission('inventory.view');
  const canPurchase = usePermission('purchase.view');
  const canSales = useCanAny('sales.view_own', 'sales.view_all');
  const canSalesCreate = usePermission('sales.create');
  const canFinance = usePermission('finance.view');
  const canJournals = usePermission('finance.journals');
  const canReports = usePermission('reports.sales');
  const canSettings = usePermission('settings.users');

  const [openGroup, setOpenGroup] = useState(null);
  const toggle = (name) => setOpenGroup(prev => prev === name ? null : name);

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-text flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
            <Truck size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">Lanka Dist.</p>
            <p className="text-xs text-slate-300 mt-0.5">Distribution System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Dashboard */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-green-800 text-white font-semibold' : 'text-sidebar-text hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <LayoutDashboard size={17} />
          Dashboard
        </NavLink>

        {canInventory && (
          <>
            <p className="sidebar-section-label">Inventory</p>
            <NavGroup icon={Package} label="Products & Stock" isOpen={openGroup === 'products'} onToggle={() => toggle('products')}>
              <NavItem to="/products" icon={Package} label="Products" />
              <NavItem to="/categories" icon={ClipboardList} label="Categories" />
              <NavItem to="/units" icon={Scale} label="Units" />
              <NavItem to="/warehouses" icon={Warehouse} label="Warehouses" />
              <NavItem to="/stock-adjustments" icon={ClipboardList} label="Stock Adjustments" />
              <NavItem to="/stock-transfers" icon={ArrowLeftRight} label="Stock Transfers" />
              <NavItem to="/opening-stock" icon={Package} label="Opening Stock" />
              <NavItem to="/price-lists" icon={Tag} label="Price Lists" />
            </NavGroup>
          </>
        )}

        {canPurchase && (
          <>
            <p className="sidebar-section-label">Purchasing</p>
            <NavItem to="/suppliers" icon={Building2} label="Suppliers" />
            <NavItem to="/purchase-orders" icon={ShoppingCart} label="Purchase Orders" />
            <NavItem to="/grn" icon={ArrowLeftRight} label="Goods Received" />
            <NavItem to="/supplier-returns" icon={RotateCcw} label="Supplier Returns" />
            <NavItem to="/supplier-payments" icon={CreditCard} label="Supplier Payments" />
          </>
        )}

        {canSales && (
          <>
            <p className="sidebar-section-label">Sales</p>
            <NavItem to="/customers" icon={Users} label="Customers" />
            <NavItem to="/routes" icon={MapPin} label="Routes" />
            <NavItem to="/sales-orders" icon={ClipboardList} label="Sales Orders" />
            <NavItem to="/invoices" icon={FileText} label="Invoices" />
            <NavItem to="/credit-notes" icon={RotateCcw} label="Credit Notes" />
            <NavItem to="/deliveries" icon={Truck} label="Deliveries" />
          </>
        )}

        {canSalesCreate && (
          <>
            <p className="sidebar-section-label">Van Sales</p>
            <NavItem to="/loading-sheets" icon={Navigation} label="Loading Sheets" />
          </>
        )}

        {canFinance && (
          <>
            <p className="sidebar-section-label">Finance</p>
            <NavItem to="/receipts" icon={Receipt} label="Receipts" />
            <NavItem to="/cheques" icon={CreditCard} label="Cheques" />
            <NavItem to="/expenses" icon={CreditCard} label="Expenses" />
          </>
        )}

        {canJournals && (
          <>
            <p className="sidebar-section-label">Accounting</p>
            <NavItem to="/accounts" icon={BookOpen} label="Chart of Accounts" />
            <NavItem to="/trial-balance" icon={Scale} label="Trial Balance" />
            <NavItem to="/journals" icon={BookOpen} label="Journal Entries" />
            <NavItem to="/opening-balance" icon={BookOpen} label="Opening Balance" />
          </>
        )}

        {canReports && (
          <>
            <p className="sidebar-section-label">Reports</p>
            <NavGroup icon={BarChart2} label="Reports" isOpen={openGroup === 'reports'} onToggle={() => toggle('reports')}>
              <NavItem to="/reports/sales-summary" label="Sales Summary" />
              <NavItem to="/reports/sales-rep-kpi" label="Sales Rep KPI" />
              <NavItem to="/reports/aged-debtors" label="Aged Debtors" />
              <NavItem to="/reports/aged-creditors" label="Aged Creditors (AP)" />
              <NavItem to="/reports/customer-statement" label="Customer Statement" />
              <NavItem to="/reports/stock-movement" label="Stock Movement" />
              <NavItem to="/reports/low-stock" label="Low Stock Alert" />
              <NavItem to="/reports/reorder-suggestions" label="Reorder Suggestions" />
              <NavItem to="/reports/product-profitability" label="Product Profitability" />
              <NavItem to="/reports/vat" label="VAT Report" />
              <NavItem to="/reports/profit-loss" label="Profit & Loss" />
            </NavGroup>
            <NavItem to="/analytics" icon={Zap} label="Analytics" />
          </>
        )}

        {canSettings && (
          <>
            <p className="sidebar-section-label">Settings</p>
            <NavGroup icon={Settings} label="Settings" isOpen={openGroup === 'settings'} onToggle={() => toggle('settings')}>
              <NavItem to="/settings/company" label="Company" />
              <NavItem to="/settings/branches" label="Branches" />
              <NavItem to="/settings/periods" label="Accounting Periods" />
              <NavItem to="/settings/users" label="Users" />
              <NavItem to="/settings/roles" label="Roles" />
            </NavGroup>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="m-3 bg-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-text truncate">{user?.Role?.display_name}</p>
          </div>
          <button
            onClick={() => dispatch(logout())}
            title="Sign out"
            className="p-1.5 rounded-lg text-sidebar-text hover:text-red-400 hover:bg-slate-700 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

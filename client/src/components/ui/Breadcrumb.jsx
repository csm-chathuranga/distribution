import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const CRUMBS = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/categories': 'Categories',
  '/warehouses': 'Warehouses',
  '/suppliers': 'Suppliers',
  '/customers': 'Customers',
  '/routes': 'Routes',
  '/purchase-orders': 'Purchase Orders',
  '/purchase-orders/new': 'New Purchase Order',
  '/grn': 'Goods Received',
  '/grn/new': 'New GRN',
  '/invoices': 'Invoices',
  '/invoices/new': 'New Invoice',
  '/receipts': 'Receipts',
  '/receipts/new': 'New Receipt',
  '/cheques': 'Cheques',
  '/expenses': 'Expenses',
  '/credit-notes': 'Credit Notes',
  '/credit-notes/new': 'New Credit Note',
  '/deliveries': 'Deliveries',
  '/deliveries/new': 'New Delivery',
  '/loading-sheets': 'Loading Sheets',
  '/loading-sheets/new': 'New Loading Sheet',
  '/supplier-returns': 'Supplier Returns',
  '/supplier-returns/new': 'New Supplier Return',
  '/accounts': 'Chart of Accounts',
  '/journals': 'Journal Entries',
  '/reports/sales-summary': 'Sales Summary',
  '/reports/aged-debtors': 'Aged Debtors',
  '/reports/stock-movement': 'Stock Movement',
  '/reports/profit-loss': 'Profit & Loss',
  '/settings/users': 'Users',
  '/settings/roles': 'Roles',
  '/settings/branches': 'Branches',
};

const GROUPS = {
  '/reports/': 'Reports',
  '/settings/': 'Settings',
};

export default function Breadcrumb() {
  const { pathname } = useLocation();

  const current = CRUMBS[pathname] || '';
  const group = Object.entries(GROUPS).find(([prefix]) => pathname.startsWith(prefix));

  const crumbs = [];
  if (group) crumbs.push({ label: group[1], to: null });
  if (current) crumbs.push({ label: current, to: null });

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
        <Home size={15} />
      </Link>
      {crumbs.map(({ label, to }, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={14} className="text-gray-300" />
          {to ? (
            <Link to={to} className="text-gray-500 hover:text-gray-700 font-medium">{label}</Link>
          ) : (
            <span className={i === crumbs.length - 1 ? 'text-gray-800 font-semibold' : 'text-gray-500 font-medium'}>
              {label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

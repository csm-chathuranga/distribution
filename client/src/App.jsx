import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

// Inventory
import ProductList from './pages/products/ProductList';
import CategoryList from './pages/categories/CategoryList';
import WarehouseList from './pages/warehouses/WarehouseList';
import UnitList from './pages/products/UnitList';
import StockAdjustmentList from './pages/inventory/StockAdjustmentList';
import StockAdjustmentCreate from './pages/inventory/StockAdjustmentCreate';
import StockTransferList from './pages/inventory/StockTransferList';
import StockTransferCreate from './pages/inventory/StockTransferCreate';
import PriceListList from './pages/pricing/PriceListList';
import PriceListCreate from './pages/pricing/PriceListCreate';

// Purchasing
import SupplierList from './pages/suppliers/SupplierList';
import PurchaseOrderList from './pages/purchasing/PurchaseOrderList';
import PurchaseOrderCreate from './pages/purchasing/PurchaseOrderCreate';
import GRNList from './pages/purchasing/GRNList';
import GRNCreate from './pages/purchasing/GRNCreate';
import SupplierReturnList from './pages/purchasing/SupplierReturnList';
import SupplierReturnCreate from './pages/purchasing/SupplierReturnCreate';
import SupplierPaymentList from './pages/purchasing/SupplierPaymentList';
import SupplierPaymentCreate from './pages/purchasing/SupplierPaymentCreate';
import SupplierPaymentDetail from './pages/purchasing/SupplierPaymentDetail';

// Sales
import CustomerList from './pages/customers/CustomerList';
import RouteList from './pages/routes/RouteList';
import SalesOrderList from './pages/sales/SalesOrderList';
import SalesOrderCreate from './pages/sales/SalesOrderCreate';
import InvoiceList from './pages/sales/InvoiceList';
import InvoiceCreate from './pages/sales/InvoiceCreate';
import InvoiceDetail from './pages/sales/InvoiceDetail';
import ReceiptList from './pages/sales/ReceiptList';
import ReceiptCreate from './pages/sales/ReceiptCreate';
import ChequeList from './pages/sales/ChequeList';
import ExpenseList from './pages/sales/ExpenseList';
import CreditNoteList from './pages/sales/CreditNoteList';
import CreditNoteCreate from './pages/sales/CreditNoteCreate';

// Delivery
import DeliveryList from './pages/delivery/DeliveryList';
import DeliveryCreate from './pages/delivery/DeliveryCreate';
import DeliveryDetail from './pages/delivery/DeliveryDetail';

// Van Sales
import LoadingSheetList from './pages/vanSales/LoadingSheetList';
import LoadingSheetCreate from './pages/vanSales/LoadingSheetCreate';
import LoadingSheetDetail from './pages/vanSales/LoadingSheetDetail';

// Finance / Accounting
import AccountList from './pages/finance/AccountList';
import JournalList from './pages/finance/JournalList';
import OpeningBalance from './pages/finance/OpeningBalance';
import TrialBalance from './pages/finance/TrialBalance';
import OpeningStock from './pages/inventory/OpeningStock';

// Settings
import UserList from './pages/settings/UserList';
import RoleList from './pages/settings/RoleList';
import BranchList from './pages/settings/BranchList';
import CompanySettings from './pages/settings/CompanySettings';
import PeriodsManagement from './pages/settings/PeriodsManagement';

// Reports
import SalesSummary from './pages/reports/SalesSummary';
import AgedDebtors from './pages/reports/AgedDebtors';
import AgedCreditors from './pages/reports/AgedCreditors';
import StockMovement from './pages/reports/StockMovement';
import ProfitLoss from './pages/reports/ProfitLoss';
import LowStockReport from './pages/reports/LowStockReport';
import VatReport from './pages/reports/VatReport';
import CustomerStatement from './pages/reports/CustomerStatement';
import ProductProfitability from './pages/reports/ProductProfitability';
import ReorderSuggestions from './pages/reports/ReorderSuggestions';
import SalesRepKPI from './pages/reports/SalesRepKPI';
import Analytics from './pages/reports/Analytics';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />

          {/* Inventory */}
          <Route path="products" element={<ProtectedRoute permission="inventory.view"><ProductList /></ProtectedRoute>} />
          <Route path="categories" element={<ProtectedRoute permission="inventory.view"><CategoryList /></ProtectedRoute>} />
          <Route path="warehouses" element={<ProtectedRoute permission="inventory.view"><WarehouseList /></ProtectedRoute>} />
          <Route path="units" element={<ProtectedRoute permission="inventory.view"><UnitList /></ProtectedRoute>} />
          <Route path="stock-adjustments" element={<ProtectedRoute permission="inventory.view"><StockAdjustmentList /></ProtectedRoute>} />
          <Route path="stock-adjustments/new" element={<ProtectedRoute permission="inventory.create"><StockAdjustmentCreate /></ProtectedRoute>} />
          <Route path="stock-transfers" element={<ProtectedRoute permission="inventory.view"><StockTransferList /></ProtectedRoute>} />
          <Route path="stock-transfers/new" element={<ProtectedRoute permission="inventory.view"><StockTransferCreate /></ProtectedRoute>} />
          <Route path="price-lists" element={<ProtectedRoute permission="inventory.view"><PriceListList /></ProtectedRoute>} />
          <Route path="price-lists/new" element={<ProtectedRoute permission="inventory.create"><PriceListCreate /></ProtectedRoute>} />

          {/* Purchasing */}
          <Route path="suppliers" element={<ProtectedRoute permission="purchase.view"><SupplierList /></ProtectedRoute>} />
          <Route path="purchase-orders" element={<ProtectedRoute permission="purchase.view"><PurchaseOrderList /></ProtectedRoute>} />
          <Route path="purchase-orders/new" element={<ProtectedRoute permission="purchase.create"><PurchaseOrderCreate /></ProtectedRoute>} />
          <Route path="grn" element={<ProtectedRoute permission="purchase.view"><GRNList /></ProtectedRoute>} />
          <Route path="grn/new" element={<ProtectedRoute permission="purchase.create"><GRNCreate /></ProtectedRoute>} />
          <Route path="supplier-returns" element={<ProtectedRoute permission="purchase.view"><SupplierReturnList /></ProtectedRoute>} />
          <Route path="supplier-returns/new" element={<ProtectedRoute permission="purchase.create"><SupplierReturnCreate /></ProtectedRoute>} />
          <Route path="supplier-payments" element={<ProtectedRoute permission="finance.payments"><SupplierPaymentList /></ProtectedRoute>} />
          <Route path="supplier-payments/new" element={<ProtectedRoute permission="finance.payments"><SupplierPaymentCreate /></ProtectedRoute>} />
          <Route path="supplier-payments/:id" element={<ProtectedRoute permission="finance.payments"><SupplierPaymentDetail /></ProtectedRoute>} />

          {/* Sales — sales.view_own is enough to enter; backend filters data per role */}
          <Route path="customers" element={<ProtectedRoute permission="sales.view_own"><CustomerList /></ProtectedRoute>} />
          <Route path="routes" element={<ProtectedRoute permission="sales.view_all"><RouteList /></ProtectedRoute>} />
          <Route path="sales-orders" element={<ProtectedRoute permission="sales.view_own"><SalesOrderList /></ProtectedRoute>} />
          <Route path="sales-orders/new" element={<ProtectedRoute permission="sales.create"><SalesOrderCreate /></ProtectedRoute>} />
          <Route path="invoices" element={<ProtectedRoute permission="sales.view_own"><InvoiceList /></ProtectedRoute>} />
          <Route path="invoices/new" element={<ProtectedRoute permission="sales.create"><InvoiceCreate /></ProtectedRoute>} />
          <Route path="invoices/:id" element={<ProtectedRoute permission="sales.view_own"><InvoiceDetail /></ProtectedRoute>} />
          <Route path="credit-notes" element={<ProtectedRoute permission="sales.view_own"><CreditNoteList /></ProtectedRoute>} />
          <Route path="credit-notes/new" element={<ProtectedRoute permission="sales.create"><CreditNoteCreate /></ProtectedRoute>} />

          {/* Delivery — driver role may have sales.view_all instead of sales.view_own */}
          <Route path="deliveries" element={<ProtectedRoute permission={["sales.view_own","sales.view_all"]}><DeliveryList /></ProtectedRoute>} />
          <Route path="deliveries/new" element={<ProtectedRoute permission="sales.create"><DeliveryCreate /></ProtectedRoute>} />
          <Route path="deliveries/:id" element={<ProtectedRoute permission={["sales.view_own","sales.view_all"]}><DeliveryDetail /></ProtectedRoute>} />

          {/* Van Sales */}
          <Route path="loading-sheets" element={<ProtectedRoute permission="sales.create"><LoadingSheetList /></ProtectedRoute>} />
          <Route path="loading-sheets/new" element={<ProtectedRoute permission="sales.create"><LoadingSheetCreate /></ProtectedRoute>} />
          <Route path="loading-sheets/:id" element={<ProtectedRoute permission="sales.create"><LoadingSheetDetail /></ProtectedRoute>} />

          {/* Finance */}
          <Route path="receipts" element={<ProtectedRoute permission="finance.receipts"><ReceiptList /></ProtectedRoute>} />
          <Route path="receipts/new" element={<ProtectedRoute permission="sales.create"><ReceiptCreate /></ProtectedRoute>} />
          <Route path="cheques" element={<ProtectedRoute permission="finance.receipts"><ChequeList /></ProtectedRoute>} />
          <Route path="expenses" element={<ProtectedRoute permission="finance.view"><ExpenseList /></ProtectedRoute>} />

          {/* Accounting */}
          <Route path="accounts" element={<ProtectedRoute permission="finance.view"><AccountList /></ProtectedRoute>} />
          <Route path="journals" element={<ProtectedRoute permission="finance.journals"><JournalList /></ProtectedRoute>} />
          <Route path="opening-balance" element={<ProtectedRoute permission="finance.journals"><OpeningBalance /></ProtectedRoute>} />
          <Route path="trial-balance" element={<ProtectedRoute permission="finance.view"><TrialBalance /></ProtectedRoute>} />
          <Route path="opening-stock" element={<ProtectedRoute permission="inventory.adjust"><OpeningStock /></ProtectedRoute>} />

          {/* Reports — canonical paths from sidebar/breadcrumb */}
          <Route path="reports/sales-summary" element={<ProtectedRoute permission="reports.sales"><SalesSummary /></ProtectedRoute>} />
          <Route path="reports/aged-debtors" element={<ProtectedRoute permission="reports.finance"><AgedDebtors /></ProtectedRoute>} />
          <Route path="reports/aged-creditors" element={<ProtectedRoute permission="reports.finance"><AgedCreditors /></ProtectedRoute>} />
          <Route path="reports/stock-movement" element={<ProtectedRoute permission="reports.inventory"><StockMovement /></ProtectedRoute>} />
          <Route path="reports/profit-loss" element={<ProtectedRoute permission="reports.finance"><ProfitLoss /></ProtectedRoute>} />
          <Route path="reports/low-stock" element={<ProtectedRoute permission="reports.inventory"><LowStockReport /></ProtectedRoute>} />
          <Route path="reports/vat" element={<ProtectedRoute permission="reports.finance"><VatReport /></ProtectedRoute>} />
          <Route path="reports/customer-statement" element={<ProtectedRoute permission="reports.finance"><CustomerStatement /></ProtectedRoute>} />
          <Route path="reports/product-profitability" element={<ProtectedRoute permission="reports.finance"><ProductProfitability /></ProtectedRoute>} />
          <Route path="reports/reorder-suggestions" element={<ProtectedRoute permission="reports.inventory"><ReorderSuggestions /></ProtectedRoute>} />
          <Route path="reports/sales-rep-kpi" element={<ProtectedRoute permission="reports.sales"><SalesRepKPI /></ProtectedRoute>} />
          <Route path="analytics" element={<ProtectedRoute permission="reports.sales"><Analytics /></ProtectedRoute>} />
          {/* Legacy path redirects */}
          <Route path="reports/sales" element={<Navigate to="/reports/sales-summary" replace />} />
          <Route path="reports/stock" element={<Navigate to="/reports/stock-movement" replace />} />
          <Route path="reports/pl" element={<Navigate to="/reports/profit-loss" replace />} />

          {/* Settings */}
          <Route path="settings/users" element={<ProtectedRoute permission="settings.users"><UserList /></ProtectedRoute>} />
          <Route path="settings/roles" element={<ProtectedRoute permission="settings.roles"><RoleList /></ProtectedRoute>} />
          <Route path="settings/branches" element={<ProtectedRoute permission="settings.company"><BranchList /></ProtectedRoute>} />
          <Route path="settings/company" element={<ProtectedRoute permission="settings.company"><CompanySettings /></ProtectedRoute>} />
          <Route path="settings/periods" element={<ProtectedRoute permission="settings.company"><PeriodsManagement /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

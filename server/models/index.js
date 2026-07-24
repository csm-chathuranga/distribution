const sequelize = require('../config/database');

const Company = require('./Company')(sequelize);
const Branch = require('./Branch')(sequelize);
const Role = require('./Role')(sequelize);
const Permission = require('./Permission')(sequelize);
const User = require('./User')(sequelize);
const AccountingPeriod = require('./AccountingPeriod')(sequelize);
const Account = require('./Account')(sequelize);
const JournalEntry = require('./JournalEntry')(sequelize);
const JournalLine = require('./JournalLine')(sequelize);
const Category = require('./Category')(sequelize);
const Unit = require('./Unit')(sequelize);
const Product = require('./Product')(sequelize);
const Warehouse = require('./Warehouse')(sequelize);
const Stock = require('./Stock')(sequelize);
const StockMovement = require('./StockMovement')(sequelize);
const Supplier = require('./Supplier')(sequelize);
const Route = require('./Route')(sequelize);
const Customer = require('./Customer')(sequelize);
const PurchaseOrder = require('./PurchaseOrder')(sequelize);
const PurchaseOrderLine = require('./PurchaseOrderLine')(sequelize);
const GoodsReceived = require('./GoodsReceived')(sequelize);
const GoodsReceivedLine = require('./GoodsReceivedLine')(sequelize);
const SalesOrder = require('./SalesOrder')(sequelize);
const SalesOrderLine = require('./SalesOrderLine')(sequelize);
const Invoice = require('./Invoice')(sequelize);
const InvoiceLine = require('./InvoiceLine')(sequelize);
const Receipt = require('./Receipt')(sequelize);
const Cheque = require('./Cheque')(sequelize);
const Payment = require('./Payment')(sequelize);
const Expense = require('./Expense')(sequelize);
const DeliveryNote = require('./DeliveryNote')(sequelize);
const LoadingSheet = require('./LoadingSheet')(sequelize);
const LoadingSheetLine = require('./LoadingSheetLine')(sequelize);
const SupplierReturn = require('./SupplierReturn')(sequelize);
const SupplierReturnLine = require('./SupplierReturnLine')(sequelize);
const StockAdjustment = require('./StockAdjustment')(sequelize);
const StockAdjustmentLine = require('./StockAdjustmentLine')(sequelize);
const StockTransfer = require('./StockTransfer')(sequelize);
const StockTransferLine = require('./StockTransferLine')(sequelize);
const PriceList = require('./PriceList')(sequelize);
const PriceListItem = require('./PriceListItem')(sequelize);
const Notification = require('./Notification')(sequelize);

// Junction tables
const RolePermission = sequelize.define('RolePermission', {}, { tableName: 'role_permissions', timestamps: false });
const UserPermission = sequelize.define('UserPermission', {
  granted: { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'user_permissions', timestamps: false });
const ReceiptAllocation = sequelize.define('ReceiptAllocation', {
  allocated_amount: { type: require('sequelize').DataTypes.DECIMAL(15, 2), allowNull: false },
}, { tableName: 'receipt_allocations', timestamps: false });
const PaymentAllocation = sequelize.define('PaymentAllocation', {
  allocated_amount: { type: require('sequelize').DataTypes.DECIMAL(15, 2), allowNull: false },
}, { tableName: 'payment_allocations', timestamps: false });

// ── Company ──────────────────────────────────────────────
Company.hasMany(Branch, { foreignKey: 'company_id' });
Branch.belongsTo(Company, { foreignKey: 'company_id' });

// ── Roles & Permissions ──────────────────────────────────
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id' });

// ── Users ────────────────────────────────────────────────
User.belongsTo(Role, { foreignKey: 'role_id' });
Role.hasMany(User, { foreignKey: 'role_id' });
User.belongsTo(Branch, { foreignKey: 'branch_id' });
Branch.hasMany(User, { foreignKey: 'branch_id' });
User.belongsToMany(Permission, { through: UserPermission, foreignKey: 'user_id' });
Permission.belongsToMany(User, { through: UserPermission, foreignKey: 'permission_id' });

// ── Accounting ───────────────────────────────────────────
Company.hasMany(AccountingPeriod, { foreignKey: 'company_id' });
AccountingPeriod.belongsTo(Company, { foreignKey: 'company_id' });
Company.hasMany(Account, { foreignKey: 'company_id' });
Account.belongsTo(Company, { foreignKey: 'company_id' });
Account.hasMany(Account, { as: 'Children', foreignKey: 'parent_id' });
Account.belongsTo(Account, { as: 'Parent', foreignKey: 'parent_id' });
AccountingPeriod.hasMany(JournalEntry, { foreignKey: 'period_id' });
JournalEntry.belongsTo(AccountingPeriod, { foreignKey: 'period_id' });
JournalEntry.hasMany(JournalLine, { foreignKey: 'journal_id', as: 'Lines' });
JournalLine.belongsTo(JournalEntry, { foreignKey: 'journal_id' });
JournalLine.belongsTo(Account, { foreignKey: 'account_id' });
Account.hasMany(JournalLine, { foreignKey: 'account_id' });

// ── Products ─────────────────────────────────────────────
Company.hasMany(Category, { foreignKey: 'company_id' });
Category.belongsTo(Company, { foreignKey: 'company_id' });
Category.hasMany(Category, { as: 'SubCategories', foreignKey: 'parent_id' });
Category.belongsTo(Category, { as: 'ParentCategory', foreignKey: 'parent_id' });
Company.hasMany(Product, { foreignKey: 'company_id' });
Product.belongsTo(Company, { foreignKey: 'company_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(Product, { foreignKey: 'category_id' });
Product.belongsTo(Unit, { as: 'BaseUnit', foreignKey: 'base_unit_id' });

// ── Warehouse & Stock ────────────────────────────────────
Branch.hasMany(Warehouse, { foreignKey: 'branch_id' });
Warehouse.belongsTo(Branch, { foreignKey: 'branch_id' });
Warehouse.hasMany(Stock, { foreignKey: 'warehouse_id' });
Stock.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });
Product.hasMany(Stock, { foreignKey: 'product_id' });
Stock.belongsTo(Product, { foreignKey: 'product_id' });
Warehouse.hasMany(StockMovement, { foreignKey: 'warehouse_id' });
Product.hasMany(StockMovement, { foreignKey: 'product_id' });

// ── Suppliers ────────────────────────────────────────────
Company.hasMany(Supplier, { foreignKey: 'company_id' });
Supplier.belongsTo(Company, { foreignKey: 'company_id' });
Supplier.belongsTo(Account, { foreignKey: 'account_id' });

// ── Customers & Routes ───────────────────────────────────
Branch.hasMany(Route, { foreignKey: 'branch_id' });
Route.belongsTo(Branch, { foreignKey: 'branch_id' });
Route.belongsTo(User, { as: 'SalesRep', foreignKey: 'sales_rep_id' });
Route.belongsTo(User, { as: 'Driver', foreignKey: 'driver_id' });
Company.hasMany(Customer, { foreignKey: 'company_id' });
Customer.belongsTo(Company, { foreignKey: 'company_id' });
Customer.belongsTo(Branch, { foreignKey: 'branch_id' });
Customer.belongsTo(Route, { foreignKey: 'route_id' });
Route.hasMany(Customer, { foreignKey: 'route_id' });
Customer.belongsTo(Account, { foreignKey: 'account_id' });

// ── Purchase Orders ──────────────────────────────────────
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplier_id' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplier_id' });
PurchaseOrder.belongsTo(Branch, { foreignKey: 'branch_id' });
PurchaseOrder.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });
PurchaseOrder.hasMany(PurchaseOrderLine, { as: 'Lines', foreignKey: 'po_id' });
PurchaseOrderLine.belongsTo(PurchaseOrder, { foreignKey: 'po_id' });
PurchaseOrderLine.belongsTo(Product, { foreignKey: 'product_id' });

// ── GRN ──────────────────────────────────────────────────
GoodsReceived.belongsTo(Supplier, { foreignKey: 'supplier_id' });
GoodsReceived.belongsTo(PurchaseOrder, { foreignKey: 'po_id' });
GoodsReceived.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });
GoodsReceived.hasMany(GoodsReceivedLine, { as: 'Lines', foreignKey: 'grn_id' });
GoodsReceivedLine.belongsTo(GoodsReceived, { foreignKey: 'grn_id' });
GoodsReceivedLine.belongsTo(Product, { foreignKey: 'product_id' });

// ── Sales ────────────────────────────────────────────────
Customer.hasMany(SalesOrder, { foreignKey: 'customer_id' });
SalesOrder.belongsTo(Customer, { foreignKey: 'customer_id' });
SalesOrder.belongsTo(Branch, { foreignKey: 'branch_id' });
SalesOrder.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });
SalesOrder.belongsTo(User, { as: 'SalesRep', foreignKey: 'sales_rep_id' });
SalesOrder.hasMany(SalesOrderLine, { as: 'Lines', foreignKey: 'order_id' });
SalesOrderLine.belongsTo(SalesOrder, { foreignKey: 'order_id' });
SalesOrderLine.belongsTo(Product, { foreignKey: 'product_id' });

// ── Invoices ─────────────────────────────────────────────
Customer.hasMany(Invoice, { foreignKey: 'customer_id' });
Invoice.belongsTo(Customer, { foreignKey: 'customer_id' });
Invoice.belongsTo(SalesOrder, { foreignKey: 'order_id' });
Invoice.belongsTo(Branch, { foreignKey: 'branch_id' });
Invoice.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });
Invoice.belongsTo(JournalEntry, { foreignKey: 'journal_id' });
Invoice.hasMany(InvoiceLine, { as: 'Lines', foreignKey: 'invoice_id' });
InvoiceLine.belongsTo(Invoice, { foreignKey: 'invoice_id' });
InvoiceLine.belongsTo(Product, { foreignKey: 'product_id' });

// ── Receipts ─────────────────────────────────────────────
Customer.hasMany(Receipt, { foreignKey: 'customer_id' });
Receipt.belongsTo(Customer, { foreignKey: 'customer_id' });
Receipt.belongsTo(Branch, { foreignKey: 'branch_id' });
Receipt.belongsTo(JournalEntry, { foreignKey: 'journal_id' });
Receipt.hasMany(Cheque, { foreignKey: 'receipt_id' });
Cheque.belongsTo(Receipt, { foreignKey: 'receipt_id' });
Receipt.belongsToMany(Invoice, { through: ReceiptAllocation, foreignKey: 'receipt_id' });
Invoice.belongsToMany(Receipt, { through: ReceiptAllocation, foreignKey: 'invoice_id' });

// ── Payments ─────────────────────────────────────────────
Supplier.hasMany(Payment, { foreignKey: 'supplier_id' });
Payment.belongsTo(Supplier, { foreignKey: 'supplier_id' });
Payment.belongsTo(Branch, { foreignKey: 'branch_id' });
Payment.belongsTo(JournalEntry, { foreignKey: 'journal_id' });
Payment.belongsToMany(GoodsReceived, { through: PaymentAllocation, foreignKey: 'payment_id' });
GoodsReceived.belongsToMany(Payment, { through: PaymentAllocation, foreignKey: 'grn_id' });

// ── Expenses ─────────────────────────────────────────────
Expense.belongsTo(Account, { foreignKey: 'account_id' });
Expense.belongsTo(Branch, { foreignKey: 'branch_id' });
Expense.belongsTo(JournalEntry, { foreignKey: 'journal_id' });

// ── Delivery Notes ────────────────────────────────────────
DeliveryNote.belongsTo(Invoice, { foreignKey: 'invoice_id' });
Invoice.hasMany(DeliveryNote, { foreignKey: 'invoice_id' });
DeliveryNote.belongsTo(Customer, { foreignKey: 'customer_id' });
DeliveryNote.belongsTo(Branch, { foreignKey: 'branch_id' });
DeliveryNote.belongsTo(User, { as: 'Driver', foreignKey: 'driver_id' });
DeliveryNote.belongsTo(Route, { foreignKey: 'route_id' });

// ── Loading Sheets ────────────────────────────────────────
LoadingSheet.belongsTo(Branch, { foreignKey: 'branch_id' });
LoadingSheet.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });
LoadingSheet.belongsTo(Route, { foreignKey: 'route_id' });
LoadingSheet.belongsTo(User, { as: 'SalesRep', foreignKey: 'sales_rep_id' });
LoadingSheet.belongsTo(User, { as: 'Driver', foreignKey: 'driver_id' });
LoadingSheet.hasMany(LoadingSheetLine, { as: 'Lines', foreignKey: 'sheet_id' });
LoadingSheetLine.belongsTo(LoadingSheet, { foreignKey: 'sheet_id' });
LoadingSheetLine.belongsTo(Product, { foreignKey: 'product_id' });

// ── Supplier Returns ──────────────────────────────────────
SupplierReturn.belongsTo(Supplier, { foreignKey: 'supplier_id' });
SupplierReturn.belongsTo(GoodsReceived, { foreignKey: 'goods_received_id' });
SupplierReturn.belongsTo(Branch, { foreignKey: 'branch_id' });
SupplierReturn.belongsTo(JournalEntry, { foreignKey: 'journal_entry_id' });
SupplierReturn.hasMany(SupplierReturnLine, { as: 'Lines', foreignKey: 'return_id' });
SupplierReturnLine.belongsTo(SupplierReturn, { foreignKey: 'return_id' });
SupplierReturnLine.belongsTo(Product, { foreignKey: 'product_id' });

// ── Stock Adjustments ─────────────────────────────────────
StockAdjustment.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });
StockAdjustment.belongsTo(Branch, { foreignKey: 'branch_id' });
StockAdjustment.hasMany(StockAdjustmentLine, { as: 'Lines', foreignKey: 'adjustment_id' });
StockAdjustmentLine.belongsTo(StockAdjustment, { foreignKey: 'adjustment_id' });
StockAdjustmentLine.belongsTo(Product, { foreignKey: 'product_id' });

// ── Stock Transfers ───────────────────────────────────────
StockTransfer.belongsTo(Warehouse, { as: 'FromWarehouse', foreignKey: 'from_warehouse_id' });
StockTransfer.belongsTo(Warehouse, { as: 'ToWarehouse', foreignKey: 'to_warehouse_id' });
StockTransfer.belongsTo(Branch, { foreignKey: 'branch_id' });
StockTransfer.hasMany(StockTransferLine, { as: 'Lines', foreignKey: 'transfer_id' });
StockTransferLine.belongsTo(StockTransfer, { foreignKey: 'transfer_id' });
StockTransferLine.belongsTo(Product, { foreignKey: 'product_id' });

// ── Price Lists ───────────────────────────────────────────
PriceList.belongsTo(Company, { foreignKey: 'company_id' });
PriceList.hasMany(PriceListItem, { as: 'Items', foreignKey: 'price_list_id' });
PriceListItem.belongsTo(PriceList, { foreignKey: 'price_list_id' });
PriceListItem.belongsTo(Product, { foreignKey: 'product_id' });

// ── Notifications ─────────────────────────────────────────
User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  Company, Branch,
  Role, Permission, RolePermission,
  User, UserPermission,
  AccountingPeriod, Account, JournalEntry, JournalLine,
  Category, Unit, Product,
  Warehouse, Stock, StockMovement,
  Supplier, Route, Customer,
  PurchaseOrder, PurchaseOrderLine,
  GoodsReceived, GoodsReceivedLine,
  SalesOrder, SalesOrderLine,
  Invoice, InvoiceLine,
  Receipt, ReceiptAllocation, Cheque,
  Payment, PaymentAllocation,
  Expense,
  DeliveryNote,
  LoadingSheet, LoadingSheetLine,
  SupplierReturn, SupplierReturnLine,
  StockAdjustment, StockAdjustmentLine,
  StockTransfer, StockTransferLine,
  PriceList, PriceListItem,
  Notification,
};

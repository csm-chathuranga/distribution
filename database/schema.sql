-- ============================================================
-- Distribution Management System — Sri Lanka
-- Full Database Schema (MySQL 8.0+)
-- ============================================================

CREATE DATABASE IF NOT EXISTS distribution_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE distribution_db;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- COMPANY & BRANCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  tin_number VARCHAR(50),
  vat_number VARCHAR(50),
  logo_url VARCHAR(500),
  currency CHAR(3) DEFAULT 'LKR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  is_head_office TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_branch_code (code),
  FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

-- ============================================================
-- ROLES & PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_perm_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT,
  role_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  employee_id VARCHAR(50),
  is_active TINYINT(1) DEFAULT 1,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_email (email),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted TINYINT(1) DEFAULT 1,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- ACCOUNTING PERIODS
-- ============================================================
CREATE TABLE IF NOT EXISTS accounting_periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  year INT NOT NULL,
  month TINYINT NOT NULL,
  is_open TINYINT(1) DEFAULT 1,
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  closed_by INT NULL,
  UNIQUE KEY uq_period (company_id, year, month),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (closed_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- CHART OF ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  parent_id INT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE','COGS') NOT NULL,
  sub_type VARCHAR(50) NULL COMMENT 'TRADE_DEBTORS, TRADE_CREDITORS, VAT_PAYABLE, SALES_REVENUE, COGS, STOCK, MAIN_BANK, etc.',
  is_system TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  allow_manual_entry TINYINT(1) DEFAULT 1,
  balance DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_account_code (company_id, code),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (parent_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- ============================================================
-- JOURNAL ENTRIES (Double-Entry Bookkeeping)
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  branch_id INT NULL,
  period_id INT NOT NULL,
  entry_number VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL,
  source_type ENUM('MANUAL','INVOICE','RECEIPT','PAYMENT','GRN','STOCK_ADJ','TRANSFER','EXPENSE') NOT NULL,
  source_id INT NULL,
  reference VARCHAR(100) NULL,
  description TEXT,
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  is_posted TINYINT(1) DEFAULT 1,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_entry_number (entry_number),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (period_id) REFERENCES accounting_periods(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS journal_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journal_id INT NOT NULL,
  account_id INT NOT NULL,
  debit DECIMAL(15,2) DEFAULT 0.00,
  credit DECIMAL(15,2) DEFAULT 0.00,
  description VARCHAR(255) NULL,
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- ============================================================
-- PRODUCT CATALOG
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  parent_id INT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (parent_id) REFERENCES categories(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  abbreviation VARCHAR(10) NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  category_id INT NULL,
  base_unit_id INT NULL,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  barcode VARCHAR(100) NULL,
  cost_price DECIMAL(12,2) DEFAULT 0.00,
  selling_price DECIMAL(12,2) DEFAULT 0.00,
  wholesale_price DECIMAL(12,2) DEFAULT 0.00,
  vat_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage e.g. 18.00',
  reorder_point INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_sku (company_id, sku),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (base_unit_id) REFERENCES units(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_unit_conversions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  from_unit_id INT NOT NULL,
  to_unit_id INT NOT NULL,
  factor DECIMAL(10,4) NOT NULL COMMENT 'Multiply from_unit qty by factor to get to_unit qty',
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (from_unit_id) REFERENCES units(id),
  FOREIGN KEY (to_unit_id) REFERENCES units(id)
) ENGINE=InnoDB;

-- ============================================================
-- WAREHOUSES & STOCK
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NULL,
  address TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(12,4) DEFAULT 0.0000,
  reserved_quantity DECIMAL(12,4) DEFAULT 0.0000,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stock (warehouse_id, product_id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  product_id INT NOT NULL,
  movement_type ENUM('IN','OUT','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT') NOT NULL,
  source_type VARCHAR(50) NULL,
  source_id INT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  balance_after DECIMAL(12,4) NOT NULL,
  unit_cost DECIMAL(12,2) NULL,
  notes TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  adjustment_number VARCHAR(50) NOT NULL,
  adjustment_date DATE NOT NULL,
  reason ENUM('DAMAGE','EXPIRY','COUNT','OTHER') NOT NULL,
  notes TEXT NULL,
  status ENUM('DRAFT','APPROVED','CANCELLED') DEFAULT 'DRAFT',
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_adj_number (adjustment_number),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_adjustment_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adjustment_id INT NOT NULL,
  product_id INT NOT NULL,
  system_quantity DECIMAL(12,4) NOT NULL,
  actual_quantity DECIMAL(12,4) NOT NULL,
  unit_cost DECIMAL(12,2) NULL,
  FOREIGN KEY (adjustment_id) REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_warehouse_id INT NOT NULL,
  to_warehouse_id INT NOT NULL,
  transfer_number VARCHAR(50) NOT NULL,
  transfer_date DATE NOT NULL,
  status ENUM('DRAFT','DISPATCHED','RECEIVED','CANCELLED') DEFAULT 'DRAFT',
  notes TEXT NULL,
  dispatched_by INT NULL,
  dispatched_at TIMESTAMP NULL,
  received_by INT NULL,
  received_at TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_transfer_number (transfer_number),
  FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_transfer_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transfer_id INT NOT NULL,
  product_id INT NOT NULL,
  requested_quantity DECIMAL(12,4) NOT NULL,
  dispatched_quantity DECIMAL(12,4) NULL,
  received_quantity DECIMAL(12,4) NULL,
  FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NULL,
  contact_person VARCHAR(100) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(100) NULL,
  address TEXT NULL,
  tin_number VARCHAR(50) NULL,
  vat_number VARCHAR(50) NULL,
  credit_days INT DEFAULT 30,
  credit_limit DECIMAL(15,2) DEFAULT 0.00,
  payment_terms TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  account_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  branch_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  supplier_id INT NOT NULL,
  po_number VARCHAR(50) NOT NULL,
  po_date DATE NOT NULL,
  expected_date DATE NULL,
  status ENUM('DRAFT','APPROVED','PARTIAL','RECEIVED','CANCELLED') DEFAULT 'DRAFT',
  subtotal DECIMAL(15,2) DEFAULT 0.00,
  discount_amount DECIMAL(15,2) DEFAULT 0.00,
  vat_amount DECIMAL(15,2) DEFAULT 0.00,
  total_amount DECIMAL(15,2) DEFAULT 0.00,
  notes TEXT NULL,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_po_number (po_number),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  received_quantity DECIMAL(12,4) DEFAULT 0.0000,
  unit_cost DECIMAL(12,2) NOT NULL,
  discount_rate DECIMAL(5,2) DEFAULT 0.00,
  vat_rate DECIMAL(5,2) DEFAULT 0.00,
  line_total DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ============================================================
-- GOODS RECEIVED NOTES (GRN)
-- ============================================================
CREATE TABLE IF NOT EXISTS goods_received (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  branch_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  supplier_id INT NOT NULL,
  po_id INT NULL,
  grn_number VARCHAR(50) NOT NULL,
  grn_date DATE NOT NULL,
  supplier_invoice_number VARCHAR(100) NULL,
  supplier_invoice_date DATE NULL,
  status ENUM('DRAFT','POSTED','CANCELLED') DEFAULT 'DRAFT',
  subtotal DECIMAL(15,2) DEFAULT 0.00,
  discount_amount DECIMAL(15,2) DEFAULT 0.00,
  vat_amount DECIMAL(15,2) DEFAULT 0.00,
  total_amount DECIMAL(15,2) DEFAULT 0.00,
  journal_id INT NULL,
  notes TEXT NULL,
  posted_by INT NULL,
  posted_at TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_grn_number (grn_number),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS goods_received_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_id INT NOT NULL,
  product_id INT NOT NULL,
  po_line_id INT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  discount_rate DECIMAL(5,2) DEFAULT 0.00,
  vat_rate DECIMAL(5,2) DEFAULT 0.00,
  line_total DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (grn_id) REFERENCES goods_received(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (po_line_id) REFERENCES purchase_order_lines(id)
) ENGINE=InnoDB;

-- ============================================================
-- CUSTOMERS & ROUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NULL,
  sales_rep_id INT NULL,
  driver_id INT NULL,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (sales_rep_id) REFERENCES users(id),
  FOREIGN KEY (driver_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  branch_id INT NULL,
  route_id INT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NULL,
  customer_type ENUM('WHOLESALER','RETAILER','DIRECT','INSTITUTION') DEFAULT 'RETAILER',
  contact_person VARCHAR(100) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(100) NULL,
  address TEXT NULL,
  tin_number VARCHAR(50) NULL,
  credit_days INT DEFAULT 0,
  credit_limit DECIMAL(15,2) DEFAULT 0.00,
  outstanding_balance DECIMAL(15,2) DEFAULT 0.00,
  is_vat_registered TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  account_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (route_id) REFERENCES routes(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- ============================================================
-- PRICE LISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS price_lists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('RETAIL','WHOLESALE','SPECIAL') DEFAULT 'RETAIL',
  valid_from DATE NULL,
  valid_to DATE NULL,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS price_list_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  price_list_id INT NOT NULL,
  product_id INT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  UNIQUE KEY uq_price_item (price_list_id, product_id),
  FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ============================================================
-- SALES ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  branch_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  customer_id INT NOT NULL,
  sales_rep_id INT NULL,
  route_id INT NULL,
  order_number VARCHAR(50) NOT NULL,
  order_date DATE NOT NULL,
  delivery_date DATE NULL,
  status ENUM('DRAFT','CONFIRMED','PARTIAL','DELIVERED','CANCELLED') DEFAULT 'DRAFT',
  order_type ENUM('CREDIT','CASH') DEFAULT 'CREDIT',
  subtotal DECIMAL(15,2) DEFAULT 0.00,
  discount_amount DECIMAL(15,2) DEFAULT 0.00,
  vat_amount DECIMAL(15,2) DEFAULT 0.00,
  total_amount DECIMAL(15,2) DEFAULT 0.00,
  notes TEXT NULL,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_order_number (order_number),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (sales_rep_id) REFERENCES users(id),
  FOREIGN KEY (route_id) REFERENCES routes(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sales_order_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  delivered_quantity DECIMAL(12,4) DEFAULT 0.0000,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_rate DECIMAL(5,2) DEFAULT 0.00,
  vat_rate DECIMAL(5,2) DEFAULT 0.00,
  line_total DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  branch_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  customer_id INT NOT NULL,
  sales_rep_id INT NULL,
  order_id INT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NULL,
  invoice_type ENUM('TAX_INVOICE','CASH_INVOICE','CREDIT_NOTE','PROFORMA') DEFAULT 'TAX_INVOICE',
  status ENUM('DRAFT','POSTED','PAID','PARTIAL','OVERDUE','CANCELLED') DEFAULT 'DRAFT',
  subtotal DECIMAL(15,2) DEFAULT 0.00,
  discount_amount DECIMAL(15,2) DEFAULT 0.00,
  vat_amount DECIMAL(15,2) DEFAULT 0.00,
  total_amount DECIMAL(15,2) DEFAULT 0.00,
  paid_amount DECIMAL(15,2) DEFAULT 0.00,
  balance_due DECIMAL(15,2) DEFAULT 0.00,
  journal_id INT NULL,
  notes TEXT NULL,
  posted_by INT NULL,
  posted_at TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invoice_number (invoice_number),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (sales_rep_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES sales_orders(id),
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoice_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  order_line_id INT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_rate DECIMAL(5,2) DEFAULT 0.00,
  vat_rate DECIMAL(5,2) DEFAULT 0.00,
  line_subtotal DECIMAL(15,2) NOT NULL,
  vat_amount DECIMAL(15,2) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  cost_price DECIMAL(12,2) NULL COMMENT 'Cost at time of sale for GP calc',
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (order_line_id) REFERENCES sales_order_lines(id)
) ENGINE=InnoDB;

-- ============================================================
-- DELIVERY NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  branch_id INT NOT NULL,
  invoice_id INT NOT NULL,
  customer_id INT NOT NULL,
  driver_id INT NULL,
  route_id INT NULL,
  dn_number VARCHAR(50) NOT NULL,
  dn_date DATE NOT NULL,
  status ENUM('PENDING','DISPATCHED','DELIVERED','RETURNED') DEFAULT 'PENDING',
  delivery_address TEXT NULL,
  notes TEXT NULL,
  dispatched_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dn_number (dn_number),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (driver_id) REFERENCES users(id),
  FOREIGN KEY (route_id) REFERENCES routes(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- CUSTOMER RECEIPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  branch_id INT NOT NULL,
  customer_id INT NOT NULL,
  collected_by INT NULL,
  receipt_number VARCHAR(50) NOT NULL,
  receipt_date DATE NOT NULL,
  payment_method ENUM('CASH','CHEQUE','BANK_TRANSFER','CARD') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  reference VARCHAR(100) NULL,
  notes TEXT NULL,
  journal_id INT NULL,
  status ENUM('DRAFT','POSTED','CANCELLED') DEFAULT 'POSTED',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_receipt_number (receipt_number),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (collected_by) REFERENCES users(id),
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS receipt_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_id INT NOT NULL,
  invoice_id INT NOT NULL,
  allocated_amount DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
) ENGINE=InnoDB;

-- ============================================================
-- CHEQUE MANAGEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS cheques (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  receipt_id INT NULL,
  cheque_number VARCHAR(100) NOT NULL,
  bank_name VARCHAR(100) NULL,
  branch_name VARCHAR(100) NULL,
  amount DECIMAL(15,2) NOT NULL,
  cheque_date DATE NOT NULL,
  status ENUM('RECEIVED','DEPOSITED','CLEARED','BOUNCED','CANCELLED') DEFAULT 'RECEIVED',
  deposited_date DATE NULL,
  cleared_date DATE NULL,
  bounced_date DATE NULL,
  bounce_reason TEXT NULL,
  bank_account_id INT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (receipt_id) REFERENCES receipts(id),
  FOREIGN KEY (bank_account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- ============================================================
-- SUPPLIER PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  branch_id INT NOT NULL,
  supplier_id INT NOT NULL,
  payment_number VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('CASH','CHEQUE','BANK_TRANSFER') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  reference VARCHAR(100) NULL,
  notes TEXT NULL,
  journal_id INT NULL,
  status ENUM('DRAFT','POSTED','CANCELLED') DEFAULT 'POSTED',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment_number (payment_number),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  grn_id INT NOT NULL,
  allocated_amount DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (grn_id) REFERENCES goods_received(id)
) ENGINE=InnoDB;

-- ============================================================
-- LOADING SHEETS (Van / Truck Sales)
-- ============================================================
CREATE TABLE IF NOT EXISTS loading_sheets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  route_id INT NOT NULL,
  sales_rep_id INT NOT NULL,
  driver_id INT NULL,
  vehicle_number VARCHAR(50) NULL,
  sheet_number VARCHAR(50) NOT NULL,
  sheet_date DATE NOT NULL,
  status ENUM('DRAFT','LOADED','RETURNED','CLOSED') DEFAULT 'DRAFT',
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sheet_number (sheet_number),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (route_id) REFERENCES routes(id),
  FOREIGN KEY (sales_rep_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS loading_sheet_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  product_id INT NOT NULL,
  loaded_quantity DECIMAL(12,4) NOT NULL,
  returned_quantity DECIMAL(12,4) DEFAULT 0.0000,
  FOREIGN KEY (sheet_id) REFERENCES loading_sheets(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  branch_id INT NOT NULL,
  account_id INT NOT NULL,
  expense_number VARCHAR(50) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method ENUM('CASH','CHEQUE','BANK_TRANSFER') NOT NULL,
  reference VARCHAR(100) NULL,
  journal_id INT NULL,
  status ENUM('DRAFT','APPROVED','POSTED','CANCELLED') DEFAULT 'DRAFT',
  approved_by INT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_expense_number (expense_number),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_stock_summary AS
SELECT
  w.name AS warehouse, w.id AS warehouse_id,
  p.id AS product_id, p.sku, p.name AS product_name,
  p.reorder_point, s.quantity, s.reserved_quantity,
  s.quantity - s.reserved_quantity AS available_quantity,
  p.cost_price,
  s.quantity * p.cost_price AS stock_value,
  CASE WHEN s.quantity <= p.reorder_point AND p.reorder_point > 0 THEN 1 ELSE 0 END AS is_low_stock
FROM stock s
JOIN products p ON p.id = s.product_id
JOIN warehouses w ON w.id = s.warehouse_id;

CREATE OR REPLACE VIEW v_aged_debtors AS
SELECT
  c.id AS customer_id, c.name, c.code, c.phone, c.credit_days,
  SUM(i.balance_due) AS total_outstanding,
  SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) <= 0 THEN i.balance_due ELSE 0 END) AS current_amount,
  SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 1 AND 30 THEN i.balance_due ELSE 0 END) AS days_1_30,
  SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 31 AND 60 THEN i.balance_due ELSE 0 END) AS days_31_60,
  SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 61 AND 90 THEN i.balance_due ELSE 0 END) AS days_61_90,
  SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) > 90 THEN i.balance_due ELSE 0 END) AS over_90_days
FROM customers c
JOIN invoices i ON i.customer_id = c.id
WHERE i.status IN ('POSTED','PARTIAL','OVERDUE') AND i.balance_due > 0
GROUP BY c.id;

CREATE OR REPLACE VIEW v_trial_balance AS
SELECT
  a.code, a.name, a.type, a.sub_type,
  COALESCE(SUM(jl.debit), 0) AS total_debit,
  COALESCE(SUM(jl.credit), 0) AS total_credit,
  COALESCE(SUM(jl.debit) - SUM(jl.credit), 0) AS net_balance
FROM accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
WHERE a.is_active = 1
GROUP BY a.id
ORDER BY a.code;

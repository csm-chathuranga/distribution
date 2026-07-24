-- Migration: New modules — Supplier Returns
-- Run this if delivery_notes and loading_sheets tables are not yet created.
-- The schema.sql already includes delivery_notes and loading_sheets.

CREATE TABLE IF NOT EXISTS supplier_returns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL,
  branch_id INT NOT NULL,
  supplier_id INT NOT NULL,
  goods_received_id INT,
  return_number VARCHAR(50) NOT NULL UNIQUE,
  return_date DATE NOT NULL,
  status ENUM('DRAFT','POSTED') DEFAULT 'DRAFT',
  total_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  journal_entry_id INT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (goods_received_id) REFERENCES goods_received(id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS supplier_return_lines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  return_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  unit_cost DECIMAL(15,4) NOT NULL,
  line_total DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (return_id) REFERENCES supplier_returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

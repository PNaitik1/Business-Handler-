-- ============================================================================
-- Project: SupplySync - Supplier, Procurement and Purchase Management System
-- Purpose: Complete Normalized MySQL Schema & Seed Data
-- Database: supplysync
-- Target: MySQL 8.0+
-- ============================================================================

DROP DATABASE IF EXISTS `supplysync`;
CREATE DATABASE `supplysync` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `supplysync`;

-- ============================================================================
-- 1. USERS TABLE
-- Stores staff credentials, roles, and status with salted password hashes.
-- ============================================================================
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'procurement_manager', 'inventory_manager', 'finance_officer') NOT NULL,
    `phone` VARCHAR(20) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_is_active` (`is_active`)
) ENGINE=InnoDB;

-- ============================================================================
-- 2. SUPPLIERS TABLE
-- Master repository for vendor profiles, ratings, tax IDs, and commercial terms.
-- ============================================================================
CREATE TABLE `suppliers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `company_name` VARCHAR(150) NOT NULL,
    `contact_person` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(25) NOT NULL,
    `address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NULL,
    `country` VARCHAR(100) NOT NULL DEFAULT 'India',
    `tax_id` VARCHAR(50) NOT NULL UNIQUE COMMENT 'GSTIN or VAT Identification Number',
    `payment_terms` ENUM('immediate', 'net15', 'net30', 'net45', 'net60', 'advance') NOT NULL DEFAULT 'net30',
    `rating` DECIMAL(3, 2) NOT NULL DEFAULT 5.00 COMMENT 'Quality & on-time delivery score 1.00 to 5.00',
    `status` ENUM('active', 'inactive', 'blacklisted', 'under_review') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_supplier_rating` CHECK (`rating` >= 1.00 AND `rating` <= 5.00),
    INDEX `idx_suppliers_status` (`status`),
    INDEX `idx_suppliers_company` (`company_name`)
) ENGINE=InnoDB;

-- ============================================================================
-- 3. CATEGORIES TABLE
-- Classification taxonomy for raw materials, components, and inventory items.
-- ============================================================================
CREATE TABLE `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_categories_code` (`code`)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. PRODUCTS TABLE
-- Master item catalog tracking SKUs, unit costs, stock on hand, and reorder alerts.
-- ============================================================================
CREATE TABLE `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_id` INT NOT NULL,
    `sku` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `uom` VARCHAR(20) NOT NULL COMMENT 'Unit of Measure: pcs, kg, box, meter, liter',
    `unit_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `current_stock` INT NOT NULL DEFAULT 0,
    `reorder_level` INT NOT NULL DEFAULT 10,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) 
        REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_products_unit_cost` CHECK (`unit_cost` >= 0.00),
    CONSTRAINT `chk_products_current_stock` CHECK (`current_stock` >= 0),
    CONSTRAINT `chk_products_reorder_level` CHECK (`reorder_level` >= 0),
    INDEX `idx_products_sku` (`sku`),
    INDEX `idx_products_category` (`category_id`),
    INDEX `idx_products_stock_reorder` (`current_stock`, `reorder_level`)
) ENGINE=InnoDB;

-- ============================================================================
-- 5. SUPPLIER_QUOTES TABLE
-- Captures negotiated supplier rates, validity periods, minimum order quantities, and lead times.
-- ============================================================================
CREATE TABLE `supplier_quotes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quote_ref_number` VARCHAR(50) NOT NULL,
    `supplier_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `minimum_order_qty` INT NOT NULL DEFAULT 1,
    `lead_time_days` INT NOT NULL DEFAULT 7,
    `valid_until` DATE NOT NULL,
    `status` ENUM('draft', 'active', 'accepted', 'rejected', 'expired') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_quotes_supplier` FOREIGN KEY (`supplier_id`) 
        REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_quotes_product` FOREIGN KEY (`product_id`) 
        REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_quotes_unit_price` CHECK (`unit_price` > 0.00),
    CONSTRAINT `chk_quotes_moq` CHECK (`minimum_order_qty` >= 1),
    CONSTRAINT `chk_quotes_lead_time` CHECK (`lead_time_days` >= 0),
    INDEX `idx_quotes_supplier_product` (`supplier_id`, `product_id`),
    INDEX `idx_quotes_status` (`status`),
    INDEX `idx_quotes_validity` (`valid_until`)
) ENGINE=InnoDB;

-- ============================================================================
-- 6. PURCHASE_ORDERS TABLE
-- Header for official procurement orders issued to suppliers with monetary totals and status flags.
-- ============================================================================
CREATE TABLE `purchase_orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `po_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Format: PO-YYYYMM-XXXX',
    `supplier_id` INT NOT NULL,
    `created_by` INT NOT NULL,
    `order_date` DATE NOT NULL,
    `expected_delivery_date` DATE NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tax_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    `tax_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('draft', 'issued', 'partially_delivered', 'delivered', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    `payment_status` ENUM('unpaid', 'partially_paid', 'paid') NOT NULL DEFAULT 'unpaid',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) 
        REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_po_user` FOREIGN KEY (`created_by`) 
        REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_po_subtotal` CHECK (`subtotal` >= 0.00),
    CONSTRAINT `chk_po_total_amount` CHECK (`total_amount` >= 0.00),
    INDEX `idx_po_supplier` (`supplier_id`),
    INDEX `idx_po_status` (`status`),
    INDEX `idx_po_payment_status` (`payment_status`),
    INDEX `idx_po_order_date` (`order_date`)
) ENGINE=InnoDB;

-- ============================================================================
-- 7. PURCHASE_ORDER_ITEMS TABLE
-- Line items under each PO detailing ordered quantities, agreed unit rates, and totals.
-- ============================================================================
CREATE TABLE `purchase_order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `po_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `ordered_qty` INT NOT NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `total_price` DECIMAL(12, 2) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_poi_po` FOREIGN KEY (`po_id`) 
        REFERENCES `purchase_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_poi_product` FOREIGN KEY (`product_id`) 
        REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `uq_po_product` UNIQUE (`po_id`, `product_id`),
    CONSTRAINT `chk_poi_ordered_qty` CHECK (`ordered_qty` > 0),
    CONSTRAINT `chk_poi_unit_price` CHECK (`unit_price` >= 0.00),
    CONSTRAINT `chk_poi_total_price` CHECK (`total_price` >= 0.00),
    INDEX `idx_poi_po` (`po_id`),
    INDEX `idx_poi_product` (`product_id`)
) ENGINE=InnoDB;

-- ============================================================================
-- 8. DELIVERIES TABLE (Goods Received Note / GRN Header)
-- Tracks incoming consignments against purchase orders to support partial & multiple shipments.
-- ============================================================================
CREATE TABLE `deliveries` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `delivery_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Format: GRN-YYYYMM-XXXX',
    `po_id` INT NOT NULL,
    `received_by` INT NOT NULL,
    `delivery_date` DATE NOT NULL,
    `delivery_challan_number` VARCHAR(100) NOT NULL,
    `vehicle_number` VARCHAR(50) NULL,
    `status` ENUM('partial', 'completed', 'rejected') NOT NULL DEFAULT 'completed',
    `inspection_remarks` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_deliveries_po` FOREIGN KEY (`po_id`) 
        REFERENCES `purchase_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_deliveries_user` FOREIGN KEY (`received_by`) 
        REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_deliveries_po` (`po_id`),
    INDEX `idx_deliveries_date` (`delivery_date`),
    INDEX `idx_deliveries_status` (`status`)
) ENGINE=InnoDB;

-- ============================================================================
-- 9. DELIVERY_ITEMS TABLE
-- Granular receiving lines tracking accepted vs. rejected counts and QA rejection reasons.
-- ============================================================================
CREATE TABLE `delivery_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `delivery_id` INT NOT NULL,
    `po_item_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `received_qty` INT NOT NULL,
    `accepted_qty` INT NOT NULL,
    `rejected_qty` INT NOT NULL DEFAULT 0,
    `rejection_reason` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_di_delivery` FOREIGN KEY (`delivery_id`) 
        REFERENCES `deliveries` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_di_po_item` FOREIGN KEY (`po_item_id`) 
        REFERENCES `purchase_order_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_di_product` FOREIGN KEY (`product_id`) 
        REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_di_received_qty` CHECK (`received_qty` >= 0),
    CONSTRAINT `chk_di_accepted_qty` CHECK (`accepted_qty` >= 0),
    CONSTRAINT `chk_di_rejected_qty` CHECK (`rejected_qty` >= 0),
    CONSTRAINT `chk_di_qty_sum` CHECK (`received_qty` = `accepted_qty` + `rejected_qty`),
    INDEX `idx_di_delivery` (`delivery_id`),
    INDEX `idx_di_po_item` (`po_item_id`),
    INDEX `idx_di_product` (`product_id`)
) ENGINE=InnoDB;

-- ============================================================================
-- 10. PAYMENTS TABLE
-- Accounts payable disbursements against purchase orders supporting installment / partial payments.
-- ============================================================================
CREATE TABLE `payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `payment_reference` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Format: PAY-YYYYMM-XXXX',
    `po_id` INT NOT NULL,
    `supplier_id` INT NOT NULL,
    `processed_by` INT NOT NULL,
    `payment_date` DATE NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `payment_mode` ENUM('bank_transfer', 'upi', 'cheque', 'credit_card', 'cash') NOT NULL,
    `transaction_reference` VARCHAR(100) NULL COMMENT 'Bank UTR / Cheque No / UPI ID',
    `payment_status` ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'completed',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_payments_po` FOREIGN KEY (`po_id`) 
        REFERENCES `purchase_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_payments_supplier` FOREIGN KEY (`supplier_id`) 
        REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_payments_user` FOREIGN KEY (`processed_by`) 
        REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_payment_amount` CHECK (`amount` > 0.00),
    INDEX `idx_payments_po` (`po_id`),
    INDEX `idx_payments_supplier` (`supplier_id`),
    INDEX `idx_payments_date` (`payment_date`),
    INDEX `idx_payments_status` (`payment_status`)
) ENGINE=InnoDB;

-- ============================================================================
-- 11. INVENTORY_TRANSACTIONS TABLE
-- Immutable ledger recording every stock movement (inward, adjustments, returns, write-offs).
-- ============================================================================
CREATE TABLE `inventory_transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `delivery_item_id` INT NULL COMMENT 'References GRN line item for audit trace',
    `transaction_type` ENUM('INITIAL_STOCK', 'PURCHASE_RECEIPT', 'PURCHASE_RETURN', 'DAMAGED_LOSS', 'STOCK_ADJUSTMENT') NOT NULL,
    `quantity` INT NOT NULL COMMENT 'Positive for stock addition, negative for stock reduction',
    `balance_after` INT NOT NULL COMMENT 'Stock balance immediately following transaction',
    `performed_by` INT NOT NULL,
    `transaction_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `remarks` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_it_product` FOREIGN KEY (`product_id`) 
        REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_it_delivery_item` FOREIGN KEY (`delivery_item_id`) 
        REFERENCES `delivery_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_it_user` FOREIGN KEY (`performed_by`) 
        REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_it_quantity_nonzero` CHECK (`quantity` != 0),
    CONSTRAINT `chk_it_balance_positive` CHECK (`balance_after` >= 0),
    INDEX `idx_it_product` (`product_id`),
    INDEX `idx_it_delivery_item` (`delivery_item_id`),
    INDEX `idx_it_type` (`transaction_type`),
    INDEX `idx_it_date` (`transaction_date`)
) ENGINE=InnoDB;

-- ============================================================================
-- REALISTIC SEED DATA FOR TESTING & VIVA DEMONSTRATION
-- Passwords below are hashed using bcrypt (10 rounds) for "Password@123":
-- $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
-- ============================================================================

-- 1. USERS
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `phone`, `is_active`) VALUES
(1, 'Aarav Sharma', 'admin@supplysync.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', '+91 98765 43210', TRUE),
(2, 'Priya Patel', 'procurement@supplysync.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'procurement_manager', '+91 98765 43211', TRUE),
(3, 'Rohan Verma', 'store@supplysync.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'inventory_manager', '+91 98765 43212', TRUE),
(4, 'Neha Gupta', 'finance@supplysync.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'finance_officer', '+91 98765 43213', TRUE);

-- 2. SUPPLIERS
INSERT INTO `suppliers` (`id`, `company_name`, `contact_person`, `email`, `phone`, `address`, `city`, `state`, `country`, `tax_id`, `payment_terms`, `rating`, `status`) VALUES
(1, 'Apex Industrial Hardware Ltd', 'Vikram Malhotra', 'sales@apexhardware.in', '+91 22 2589 1234', 'Plot 45, MIDC Industrial Area, Andheri East', 'Mumbai', 'Maharashtra', 'India', '27AAACA1234A1Z5', 'net30', 4.85, 'active'),
(2, 'Bharat Packagings Pvt Ltd', 'Sunita Reddy', 'contact@bharatpack.com', '+91 80 4123 9876', '12/A, Peenya 2nd Phase', 'Bengaluru', 'Karnataka', 'India', '29BBBCB5678B1Z2', 'net15', 4.50, 'active'),
(3, 'Zenith Electronics & Cables', 'Deepak Mehta', 'orders@zenithelec.com', '+91 11 2678 4567', 'B-88, Okhla Industrial Area Phase-I', 'New Delhi', 'Delhi', 'India', '07CCCC19012C1Z8', 'net45', 4.20, 'active'),
(4, 'Delta Chem Logistics', 'Amitabh Ghosh', 'support@deltachem.in', '+91 33 2244 5566', '88, Strand Road, Burrabazar', 'Kolkata', 'West Bengal', 'India', '19DDDCD3456D1Z1', 'advance', 3.40, 'under_review');

-- 3. CATEGORIES
INSERT INTO `categories` (`id`, `code`, `name`, `description`) VALUES
(1, 'RAW-MTL', 'Raw Materials', 'Metals, industrial sheets, fasteners, and basic fabrication inputs'),
(2, 'PKG-MAT', 'Packaging Materials', 'Corrugated boxes, protective bubble wraps, and packaging tapes'),
(3, 'ELEC-CMP', 'Electrical & Wiring', 'Copper wiring, circuit breakers, power switches, and terminal connectors'),
(4, 'SAFE-EQP', 'Safety & PPE', 'Industrial safety helmets, high-visibility vests, and protective gloves');

-- 4. PRODUCTS (Initial stock reflects quantities before transactions)
INSERT INTO `products` (`id`, `category_id`, `sku`, `name`, `description`, `uom`, `unit_cost`, `current_stock`, `reorder_level`) VALUES
(1, 1, 'SKU-HEX-M10', 'Stainless Steel Hex Bolt M10 x 50mm', 'Grade 304 stainless steel hex head fasteners', 'pcs', 12.50, 1500, 500),
(2, 1, 'SKU-ALU-SHT', 'Aluminium Sheet 2mm x 4ft x 8ft', 'Commercial grade 1100 alloy sheet for metal enclosures', 'pcs', 1450.00, 45, 20),
(3, 2, 'SKU-BOX-3PLY', 'Corrugated Box 12x10x8 inch (3-Ply)', 'Standard brown export shipping cartons', 'box', 28.00, 400, 150),
(4, 3, 'SKU-CBL-2.5', 'Industrial Flexible Copper Cable 2.5 sq mm', 'Flame retardant multi-strand copper roll (100 meters)', 'box', 2150.00, 30, 15),
(5, 4, 'SKU-GLV-NIT', 'Nitrile Coated Work Safety Gloves', 'Heavy duty abrasion resistant safety gloves (Pack of 10 pairs)', 'box', 350.00, 85, 30);

-- Initial baseline inventory transactions
INSERT INTO `inventory_transactions` (`product_id`, `delivery_item_id`, `transaction_type`, `quantity`, `balance_after`, `performed_by`, `remarks`) VALUES
(1, NULL, 'INITIAL_STOCK', 1500, 1500, 1, 'Opening stock migration'),
(2, NULL, 'INITIAL_STOCK', 45, 45, 1, 'Opening stock migration'),
(3, NULL, 'INITIAL_STOCK', 400, 400, 1, 'Opening stock migration'),
(4, NULL, 'INITIAL_STOCK', 30, 30, 1, 'Opening stock migration'),
(5, NULL, 'INITIAL_STOCK', 85, 85, 1, 'Opening stock migration');

-- 5. SUPPLIER_QUOTES
INSERT INTO `supplier_quotes` (`id`, `quote_ref_number`, `supplier_id`, `product_id`, `unit_price`, `minimum_order_qty`, `lead_time_days`, `valid_until`, `status`) VALUES
(1, 'QT-2026-APX-01', 1, 1, 11.80, 500, 5, '2026-12-31', 'accepted'),
(2, 'QT-2026-APX-02', 1, 2, 1400.00, 10, 7, '2026-12-31', 'accepted'),
(3, 'QT-2026-BPK-01', 2, 3, 26.50, 200, 3, '2026-12-31', 'accepted'),
(4, 'QT-2026-ZEN-01', 3, 4, 2050.00, 5, 6, '2026-12-31', 'active');

-- 6. PURCHASE_ORDERS
-- PO #1: Apex Industrial Hardware (Fully delivered & fully paid)
-- Subtotal: (1000 * 11.80) + (20 * 1400.00) = 11,800 + 28,000 = 39,800.00
-- Tax 18%: 7,164.00, Total: 46,964.00
INSERT INTO `purchase_orders` (`id`, `po_number`, `supplier_id`, `created_by`, `order_date`, `expected_delivery_date`, `subtotal`, `tax_percentage`, `tax_amount`, `discount_amount`, `total_amount`, `status`, `payment_status`, `notes`) VALUES
(1, 'PO-202611-0001', 1, 2, '2026-11-01', '2026-11-10', 39800.00, 18.00, 7164.00, 0.00, 46964.00, 'completed', 'paid', 'Priority fabrication run materials'),
-- PO #2: Bharat Packagings (Partially delivered with multiple deliveries & partial payment)
-- Subtotal: (500 * 26.50) = 13,250.00, Tax 18%: 2,385.00, Total: 15,635.00
(2, 'PO-202611-0002', 2, 2, '2026-11-15', '2026-11-25', 13250.00, 18.00, 2385.00, 0.00, 15635.00, 'partially_delivered', 'partially_paid', 'Standard carton replenishment batch');

-- 7. PURCHASE_ORDER_ITEMS
INSERT INTO `purchase_order_items` (`id`, `po_id`, `product_id`, `ordered_qty`, `unit_price`, `total_price`) VALUES
(1, 1, 1, 1000, 11.80, 11800.00),
(2, 1, 2, 20, 1400.00, 28000.00),
(3, 2, 3, 500, 26.50, 13250.00);

-- 8. DELIVERIES (Demonstrating complete delivery on PO 1, partial deliveries on PO 2)
-- Delivery 1 for PO #1 (Complete fulfillment)
INSERT INTO `deliveries` (`id`, `delivery_number`, `po_id`, `received_by`, `delivery_date`, `delivery_challan_number`, `vehicle_number`, `status`, `inspection_remarks`) VALUES
(1, 'GRN-202611-0001', 1, 3, '2026-11-08', 'CH-APX-9821', 'MH-02-CB-1290', 'completed', 'All items verified against physical specifications. 0 rejections.');

-- Delivery Items for Delivery 1 (PO 1)
INSERT INTO `delivery_items` (`id`, `delivery_id`, `po_item_id`, `product_id`, `received_qty`, `accepted_qty`, `rejected_qty`, `rejection_reason`) VALUES
(1, 1, 1, 1, 1000, 1000, 0, NULL),
(2, 1, 2, 2, 20, 20, 0, NULL);

-- Stock updates for Delivery 1
UPDATE `products` SET `current_stock` = `current_stock` + 1000 WHERE `id` = 1;
INSERT INTO `inventory_transactions` (`product_id`, `delivery_item_id`, `transaction_type`, `quantity`, `balance_after`, `performed_by`, `remarks`) VALUES
(1, 1, 'PURCHASE_RECEIPT', 1000, 2500, 3, 'Receipt under GRN-202611-0001 (PO-202611-0001)');

UPDATE `products` SET `current_stock` = `current_stock` + 20 WHERE `id` = 2;
INSERT INTO `inventory_transactions` (`product_id`, `delivery_item_id`, `transaction_type`, `quantity`, `balance_after`, `performed_by`, `remarks`) VALUES
(2, 2, 'PURCHASE_RECEIPT', 20, 65, 3, 'Receipt under GRN-202611-0001 (PO-202611-0001)');

-- Delivery 2 for PO #2: Shipment Batch 1 (Partial: 300 received, 280 accepted, 20 rejected due to water damage)
INSERT INTO `deliveries` (`id`, `delivery_number`, `po_id`, `received_by`, `delivery_date`, `delivery_challan_number`, `vehicle_number`, `status`, `inspection_remarks`) VALUES
(2, 'GRN-202611-0002', 2, 3, '2026-11-18', 'CH-BPK-4401', 'KA-05-MN-4491', 'partial', '20 corrugated boxes arrived wet/punctured; rejected on delivery.');

-- Delivery Items for Delivery 2 (PO 2)
INSERT INTO `delivery_items` (`id`, `delivery_id`, `po_item_id`, `product_id`, `received_qty`, `accepted_qty`, `rejected_qty`, `rejection_reason`) VALUES
(3, 2, 3, 3, 300, 280, 20, 'Water damaged packaging corners during transit');

-- Stock updates for Delivery 2 (Only accepted items increment stock)
UPDATE `products` SET `current_stock` = `current_stock` + 280 WHERE `id` = 3;
INSERT INTO `inventory_transactions` (`product_id`, `delivery_item_id`, `transaction_type`, `quantity`, `balance_after`, `performed_by`, `remarks`) VALUES
(3, 3, 'PURCHASE_RECEIPT', 280, 680, 3, 'Partial receipt under GRN-202611-0002 (PO-202611-0002)');

-- 10. PAYMENTS (Demonstrating multiple payments)
-- Payments for PO #1 (Paid in full via Bank Transfer)
INSERT INTO `payments` (`id`, `payment_reference`, `po_id`, `supplier_id`, `processed_by`, `payment_date`, `amount`, `payment_mode`, `transaction_reference`, `payment_status`, `notes`) VALUES
(1, 'PAY-202611-0001', 1, 1, 4, '2026-11-12', 46964.00, 'bank_transfer', 'HDFCN26315891002', 'completed', 'Full settlement for PO-202611-0001');

-- Payments for PO #2 (Installment 1: 50% Advance via UPI)
INSERT INTO `payments` (`id`, `payment_reference`, `po_id`, `supplier_id`, `processed_by`, `payment_date`, `amount`, `payment_mode`, `transaction_reference`, `payment_status`, `notes`) VALUES
(2, 'PAY-202611-0002', 2, 2, 4, '2026-11-16', 7817.50, 'upi', 'UPI/20261116/88491038102', 'completed', '50% advance disbursement for PO-202611-0002');

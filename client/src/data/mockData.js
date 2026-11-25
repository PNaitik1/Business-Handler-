export const mockSuppliers = [
  { id: 1, company_name: "Apex Industrial Hardware Ltd", contact_person: "Vikram Malhotra", email: "sales@apexhardware.in", phone: "+91 22 2589 1234", city: "Mumbai", tax_id: "27AAACA1234A1Z5", payment_terms: "net30", rating: 4.85, status: "active" },
  { id: 2, company_name: "Bharat Packagings Pvt Ltd", contact_person: "Sunita Reddy", email: "contact@bharatpack.com", phone: "+91 80 4123 9876", city: "Bengaluru", tax_id: "29BBBCB5678B1Z2", payment_terms: "net15", rating: 4.50, status: "active" },
  { id: 3, company_name: "Zenith Electronics & Cables", contact_person: "Deepak Mehta", email: "orders@zenithelec.com", phone: "+91 11 2678 4567", city: "New Delhi", tax_id: "07CCCC19012C1Z8", payment_terms: "net45", rating: 4.20, status: "active" },
  { id: 4, company_name: "Delta Chem Logistics", contact_person: "Amitabh Ghosh", email: "support@deltachem.in", phone: "+91 33 2244 5566", city: "Kolkata", tax_id: "19DDDCD3456D1Z1", payment_terms: "advance", rating: 3.40, status: "under_review" }
];

export const mockProducts = [
  { id: 1, sku: "SKU-HEX-M10", name: "Stainless Steel Hex Bolt M10", category: "Raw Materials", uom: "pcs", unit_cost: 12.50, current_stock: 2500, reorder_level: 500, status: "In Stock" },
  { id: 2, sku: "SKU-ALU-SHT", name: "Aluminium Sheet 2mm x 4x8ft", category: "Raw Materials", uom: "pcs", unit_cost: 1450.00, current_stock: 65, reorder_level: 20, status: "In Stock" },
  { id: 3, sku: "SKU-BOX-3PLY", name: "Corrugated Box 12x10x8 inch", category: "Packaging Materials", uom: "box", unit_cost: 28.00, current_stock: 680, reorder_level: 150, status: "In Stock" },
  { id: 4, sku: "SKU-CBL-2.5", name: "Copper Cable 2.5 sq mm (100m)", category: "Electrical & Wiring", uom: "box", unit_cost: 2150.00, current_stock: 12, reorder_level: 15, status: "Low Stock" },
  { id: 5, sku: "SKU-GLV-NIT", name: "Nitrile Work Safety Gloves (10pk)", category: "Safety & PPE", uom: "box", unit_cost: 350.00, current_stock: 85, reorder_level: 30, status: "In Stock" }
];

export const mockPurchaseOrders = [
  { id: 1, po_number: "PO-202611-0001", supplier_name: "Apex Industrial Hardware Ltd", order_date: "2026-11-01", expected_delivery: "2026-11-10", items_count: 2, total_amount: 46964.00, status: "completed", payment_status: "paid" },
  { id: 2, po_number: "PO-202611-0002", supplier_name: "Bharat Packagings Pvt Ltd", order_date: "2026-11-15", expected_delivery: "2026-11-25", items_count: 1, total_amount: 15635.00, status: "partially_delivered", payment_status: "partially_paid" },
  { id: 3, po_number: "PO-202611-0003", supplier_name: "Zenith Electronics & Cables", order_date: "2026-11-20", expected_delivery: "2026-11-30", items_count: 3, total_amount: 32400.00, status: "issued", payment_status: "unpaid" },
  { id: 4, po_number: "PO-202611-0004", supplier_name: "Apex Industrial Hardware Ltd", order_date: "2026-11-24", expected_delivery: "2026-12-05", items_count: 1, total_amount: 8850.00, status: "draft", payment_status: "unpaid" }
];

export const mockDeliveries = [
  { id: 1, grn_number: "GRN-202611-0001", po_number: "PO-202611-0001", supplier_name: "Apex Industrial Hardware Ltd", delivery_date: "2026-11-08", challan_no: "CH-APX-9821", received_qty: 1020, accepted_qty: 1020, rejected_qty: 0, status: "completed" },
  { id: 2, grn_number: "GRN-202611-0002", po_number: "PO-202611-0002", supplier_name: "Bharat Packagings Pvt Ltd", delivery_date: "2026-11-18", challan_no: "CH-BPK-4401", received_qty: 300, accepted_qty: 280, rejected_qty: 20, status: "partial" }
];

export const mockPayments = [
  { id: 1, ref_no: "PAY-202611-0001", po_number: "PO-202611-0001", supplier_name: "Apex Industrial Hardware Ltd", payment_date: "2026-11-12", amount: 46964.00, mode: "Bank Transfer", txn_ref: "HDFCN26315891002", status: "completed" },
  { id: 2, ref_no: "PAY-202611-0002", po_number: "PO-202611-0002", supplier_name: "Bharat Packagings Pvt Ltd", payment_date: "2026-11-16", amount: 7817.50, mode: "UPI", txn_ref: "UPI/88491038102", status: "completed" }
];

export const mockQuotations = [
  { id: 1, quote_ref: "QT-2026-APX-01", supplier_name: "Apex Industrial Hardware Ltd", product: "Stainless Steel Hex Bolt M10", unit_price: 11.80, moq: 500, lead_time: "5 Days", valid_until: "2026-12-31", status: "accepted" },
  { id: 2, quote_ref: "QT-2026-BPK-01", supplier_name: "Bharat Packagings Pvt Ltd", product: "Corrugated Box 12x10x8 inch", unit_price: 26.50, moq: 200, lead_time: "3 Days", valid_until: "2026-12-31", status: "accepted" },
  { id: 3, quote_ref: "QT-2026-ZEN-01", supplier_name: "Zenith Electronics & Cables", product: "Copper Cable 2.5 sq mm", unit_price: 2050.00, moq: 5, lead_time: "6 Days", valid_until: "2026-12-31", status: "active" }
];

export const mockDashboardStats = {
  totalSpendMonth: 103849.00,
  activeSuppliers: 14,
  pendingDeliveries: 3,
  lowStockItems: 1,
  spendChange: "+12.4% from last month",
  supplierChange: "+2 new this quarter",
  poApprovalRate: "94.2%"
};

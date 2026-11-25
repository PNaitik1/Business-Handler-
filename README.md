# SupplySync – Supplier, Procurement and Purchase Management ERP

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-lightgrey.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x%2F9.x-orange.svg)](https://www.mysql.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38bdf8.svg)](https://tailwindcss.com/)
[![i18next](https://img.shields.io/badge/i18n-English%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80-teal.svg)](https://www.i18next.com/)

**SupplySync** is a full-stack, enterprise-grade **Procure-to-Pay (P2P)** management system engineered for Micro, Small, and Medium Enterprises (MSMEs). It bridges the gap between commercial financial procurement and real-world warehouse operations, providing strict auditability, multi-supplier quote scoring, goods receipt quality inspections, three-way accounts payable reconciliation, executive business analytics, and bilingual localization (English & हिन्दी) with dark/light themes.

---

## 📌 Key Architectural Highlights & Core Business Rules

1. **Procurement vs. Inventory Decoupling**:
   - Creating or confirming a Purchase Order represents a commercial commitment and **does NOT** increase physical inventory.
   - Physical inventory strictly increments **only** upon Goods Received Note (GRN) acceptance in the Delivery module.
2. **Quality Inspection & Defect Segregation**:
   - Deliveries record Gross Received, Damaged, and Missing items.
   - Stock increases strictly for $$\text{Net Accepted} = \text{Gross Received} - (\text{Damaged} + \text{Missing})$$.
   - Defective goods are quarantined with mandatory audit remarks.
3. **Accounts Payable Safeguard**:
   - Outstanding liability is calculated as:
     $$\text{Outstanding Balance} = \text{Purchase Order Total} - \sum \text{Payments Recorded}$$
   - Overpayments exceeding the remaining balance are automatically blocked by backend integrity rules.
4. **MCDA Multi-Criteria Supplier Quote Scoring**:
   - Multi-criteria decision analysis (65% Price Weight, 35% Delivery Speed) identifies the optimal vendor rather than naively choosing the cheapest.
5. **Dual-Mode Persistence Architecture**:
   - Operates seamlessly with a live MySQL 8.x/9.x database.
   - If MySQL is offline or not yet configured, automatically falls back to an in-memory schema cache initialized with project seed data, ensuring zero downtime during college demonstrations or offline testing.

---

## 🏗️ Technology Stack

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS 3, Lucide React Icons, Chart.js, `react-chartjs-2`, `react-router-dom` v6 |
| **Backend** | Node.js (v18+), Express.js (Modular Layered Architecture), `mysql2/promise`, `cors`, `dotenv` |
| **Security** | JWT (JSON Web Tokens), `bcrypt` (10 rounds password hashing), RBAC middleware, `express-validator` |
| **Localization** | `i18next`, `react-i18next`, Noto Sans Devanagari typography, `localStorage` persistence |
| **Theming** | Centralized CSS variables, Tailwind `dark:` classes, dynamic Chart.js theme re-rendering |
| **Database** | MySQL 8.x/9.x (11 normalized tables with foreign key cascades, unique constraints, and check constraints) |

---

## 📂 Project Directory Structure

```text
SupplySync/
├── client/                          # React + Vite Frontend
│   ├── public/                      # Static assets & favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/              # Button, Card, Modal, StatusBadge, DataTable
│   │   │   ├── dashboard/           # ExpenseLineChart, SupplierBarChart, POStatusDoughnutChart
│   │   │   └── layout/              # AppLayout, Navbar, Sidebar
│   │   ├── context/                 # AuthContext (JWT, i18n), ThemeContext (Dark/Light)
│   │   ├── i18n/                    # i18next configuration & en.json, hi.json locales
│   │   ├── pages/                   # Login, Dashboard, Suppliers, Products, Quotations,
│   │   │                            # PurchaseOrders, Deliveries, Inventory, Payments, Reports, Settings
│   │   ├── services/                # Axios API instance with Bearer interceptors
│   │   ├── App.jsx                  # React Router DOM route definitions
│   │   ├── index.css                # Tailwind CSS + centralized theme variables
│   │   └── main.jsx                 # Application entry point with i18n bootstrap
│   ├── index.html                   # HTML entry with Google Fonts (Inter + Noto Sans Devanagari)
│   ├── package.json
│   └── vite.config.js
│
├── server/                          # Node.js + Express.js Backend
│   ├── src/
│   │   ├── config/                  # env.js, db.js (MySQL pool with connection error handling)
│   │   ├── controllers/             # auth, supplier, product, quotation, po, delivery, payment, report, dashboard
│   │   ├── middleware/              # authMiddleware (JWT & RBAC), validator, errorHandler
│   │   ├── routes/                  # Modular express routers for every entity
│   │   ├── app.js                   # Express application setup, CORS, request parsing
│   │   └── server.js                # Port listener & startup banners
│   ├── .env                         # Server environment variables
│   └── package.json
│
├── scratch/                         # Automated integration test scripts
│   ├── master_e2e_test.js           # 38-step end-to-end master test suite
│   ├── test_deliveries.js           # Delivery & GRN stock sync verification
│   ├── test_payments.js             # Overpayment protection & balance tests
│   ├── test_reports.js              # All 8 business reports test script
│   └── test_theme_i18n.js           # Locale parity & theme combination verification
│
├── supplysync_database.sql          # 11 normalized MySQL tables with foreign keys and seed data
└── README.md                        # Project documentation & manual
```

---

## ⚡ Installation & Step-by-Step Setup

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **MySQL Server** (v8.0 or v9.0)

---

### Step 1: Database Setup
1. Open your MySQL terminal or GUI client (e.g. MySQL Workbench, phpMyAdmin):
   ```bash
   mysql -u root -p
   ```
2. Execute the included SQL schema file to create the `supplysync` database, all 11 tables, and initial seed records:
   ```sql
   SOURCE /path/to/SupplySync/supplysync_database.sql;
   ```
   *(Alternatively, run from terminal: `mysql -u root -p < supplysync_database.sql`)*

---

### Step 2: Backend Setup
1. Navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Configure your database credentials in `server/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173

   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=supplysync
   DB_PORT=3306

   JWT_SECRET=super_secure_enterprise_jwt_secret_key_2026
   JWT_EXPIRES_IN=24h
   ```
4. Start the backend server:
   ```bash
   npm run dev
   # Server will start on http://localhost:5000
   ```

---

### Step 3: Frontend Setup
1. Open a new terminal and navigate to the `client/` directory:
   ```bash
   cd client
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev
   # Vite will start on http://localhost:5173
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## 🔑 Demo Login Credentials

The application provides four role-based accounts out of the box with sample data:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@supplysync.com` | `Password@123` | Full access across all 10 modules |
| **Procurement Manager** | `procurement@supplysync.com` | `Password@123` | Suppliers, Quotes, Purchase Orders, Reports |
| **Store / Inventory Manager** | `store@supplysync.com` | `Password@123` | Goods Received Notes (GRN), Stock Adjustments |
| **Finance Manager** | `finance@supplysync.com` | `Password@123` | Accounts Payable, Disbursements, Reconciliation |

*(A 1-click credential selector is available directly on the login screen for easy viva demonstration).*

---

## 🧪 Running the Automated Test Suite

SupplySync includes an automated end-to-end integration test runner validating all 38 functional checkpoints:

```bash
# From the project root:
NODE_PATH=client/node_modules node scratch/master_e2e_test.js
```

### Verified Test Areas:
- **Authentication**: JWT token issuance, password hashing, invalid credentials rejection, protected routes.
- **Supplier Master**: CRUD operations, GSTIN validation, status deactivation safety.
- **Product & Category**: SKU uniqueness, minimum stock threshold alerts.
- **Quotation Comparison**: MCDA scoring, price vs delivery speed matrix.
- **Purchase Orders**: Multi-item line calculation, tax computation, stock isolation check.
- **Deliveries (GRN)**: Partial delivery, physical stock sync for accepted quantities only, damage quarantine.
- **Payments**: Overpayment rejection, partial installments, PO payment status transitions.
- **Reports**: All 8 reports, date filters, and CSV export generation.

---

## 📊 Summary of Completed Modules

1. **Authentication & RBAC**: JWT Bearer token system, role checks, password hashing via `bcrypt`.
2. **Dashboard Overview**: 7 real-time KPI cards, Expense Trend (Line), Supplier Spend (Bar), PO Status (Doughnut).
3. **Supplier Management**: Profile management, GSTIN formatting, purchase history tracking.
4. **Product Catalog**: SKU management, units of measure, baseline cost, category grouping.
5. **Inventory & Ledger**: Live stock valuation, low-stock warnings, immutable `inventory_transactions` ledger.
6. **Supplier Quotations**: Multi-vendor bidding, price and delivery comparison matrix, MCDA recommendation.
7. **Purchase Orders**: Multi-product line generator, GST tax calculation, printable purchase order dossier.
8. **Deliveries (GRN)**: Inward inspection, accepted vs damaged/missing quantities, automatic stock increment.
9. **Payments**: Accounts payable tracking, overpayment protection, printable disbursement vouchers.
10. **Reports & Analytics**: 8 dedicated reports, interactive charts, date range filtering, 1-click CSV export.
11. **Multilingual Localization**: English and Hindi bilingual interface powered by `i18next`.
12. **Theme Engine**: Dark Charcoal and Crisp Light modes with contrast compliance and persistence.

---

## 📜 License & Acknowledgements

Developed as a Capstone Project combining Business Process Engineering and Modern Web Development. Designed for academic presentation, college vivas, and enterprise MSME deployment.

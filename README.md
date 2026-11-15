# TruckOps Frontend — UI Architecture, Design Tokens & User Operations Manual

TruckOps Frontend is a production-grade single-operator management web application built with **Next.js 16 (App Router)**, **React 19**, **TypeScript 5**, and **Tailwind CSS v4**. It interfaces directly with the Laravel Sanctum API to provide an intuitive, high-speed interface for managing daily hauling trips, fleet status, employee compensation, expenses, and payroll vouchers.

---

## Table of Contents
1. [Tech Stack & Architecture](#1-tech-stack--architecture)
2. [Design Tokens & Theme Architecture](#2-design-tokens--theme-architecture)
3. [Responsive Layout & Mobile-First Principles](#3-responsive-layout--mobile-first-principles)
4. [Dedicated Print Engine & 1-Page Payslip Voucher](#4-dedicated-print-engine--1-page-payslip-voucher)
5. [Page Inventory & User Workflows](#5-page-inventory--user-workflows)
   - [Authentication (`/login`)](#authentication-login)
   - [Operations Dashboard (`/dashboard`)](#operations-dashboard-dashboard)
   - [Daily Trips & Verification (`/trips`)](#daily-trips--verification-trips)
   - [AB Collections & Reconciliation (`/collections`)](#ab-collections--reconciliation-collections)
   - [Business & Maintenance Expenses (`/expenses`)](#business--maintenance-expenses-expenses)
   - [Payroll & Cash Advances (`/payroll`)](#payroll--cash-advances-payroll)
   - [Fleet Management (`/trucks`)](#fleet-management-trucks)
   - [Employee Registry (`/employees`)](#employee-registry-employees)
   - [Reports & Tax Exports (`/reports`)](#reports--tax-exports-reports)
6. [API Client & Error Handling Architecture](#6-api-client--error-handling-architecture)
7. [Installation, Environment & Build Commands](#7-installation-environment--build-commands)

---

## 1. Tech Stack & Architecture

- **Framework:** Next.js 16.4.6 (App Router with Turbopack)
- **Library:** React 19.0.0 (Client Components with strict hydration safety)
- **Language:** TypeScript 5 (Strict type checking, zero `any` usage)
- **Styling:** Tailwind CSS v4 with custom CSS variable design tokens
- **Iconography:** Lucide React (`lucide-react`)
- **State Management:** React `useState`, `useCallback`, `useMemo`, and Context API (`AuthContext`)
- **Client Architecture:** Strongly typed REST API client in `src/lib/api.ts` with error normalization

```
truckops-frontend/
├── src/
│   ├── app/                    # Next.js App Router Pages
│   │   ├── collections/        # AB Remittance Ledger
│   │   ├── dashboard/          # Operations Overview & Cash Flow KPIs
│   │   ├── employees/          # Driver & Helper Rate Registry
│   │   ├── expenses/           # Categorized Operational Expenses
│   │   ├── login/              # Single Operator Login
│   │   ├── payroll/            # Cutoff Payroll & Printable Payslips
│   │   ├── reports/            # Ledger Reports & UTF-8 CSV Exports
│   │   ├── trips/              # Daily Multi-Trip Logging & Verification
│   │   ├── trucks/             # Fleet & Registration Expiry Management
│   │   ├── globals.css         # Print engine, typography, and base CSS
│   │   ├── layout.tsx          # Root Layout & Auth Provider Wrapper
│   │   └── page.tsx            # Root redirect to /dashboard
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppShell.tsx    # Responsive Shell (Desktop Sidebar + Mobile Drawer)
│   │   └── ui/
│   │       ├── DateRangeBar.tsx# Standard Date Presets (1st Half, 2nd Half, Month)
│   │       ├── FormField.tsx   # Reusable Form Input with Validation Error text
│   │       ├── Modal.tsx       # Accessible Dialog with Print-Backdrop suppression
│   │       └── StatusBadge.tsx # Semantic Status Indicators
│   ├── context/
│   │   └── AuthContext.tsx     # Session persistence, login/logout, route guard
│   ├── lib/
│   │   ├── api.ts              # Typed API Client & Error handling
│   │   ├── format.ts           # Currency (PHP), Date, and ISO formatters
│   │   └── types.ts            # Complete TypeScript interfaces for all models
│   └── styles/
│       ├── design-tokens.css   # 3-tier CSS custom properties
│       └── design-tokens.json  # Design token definitions
```

---

## 2. Design Tokens & Theme Architecture

The interface is driven by a 3-layer design token architecture (`design-tokens.json` mapped to `design-tokens.css`):
1. **Primitive Tokens:** Base color values (Slate, Blue, Emerald, Amber, Rose neutrals).
2. **Semantic Tokens:** Functional tokens mapped to application context (`--color-primary: #2563eb`, `--color-background: #f8fafc`, `--color-card: #ffffff`, `--color-border: #e2e8f0`).
3. **Component Tokens:** Specific component metrics:
   - Button backgrounds: `var(--button-bg)`
   - Input borders: `var(--input-border)`
   - Status badge color pairs (`var(--badge-completed-bg)`, `var(--badge-completed-fg)`, etc.).

---

## 3. Responsive Layout & Mobile-First Principles

TruckOps is fully optimized for mobile devices (`375px` viewport, iPhone SE / Android), tablets (`768px`), and wide desktops (`1024px+`):

1. **Unified Header Standard:**
   - Every operational page uses `AppShell.tsx` with a clean, consistent header layout:
     - **Left:** Title + Subtitle (accompanied by a touch-friendly hamburger button on mobile).
     - **Right:** Exactly **ONE primary blue action button** (`+ Log Expense`, `+ Add Truck`, `+ Encode Daily Log`, etc.).
     - On mobile (`< 640px`), the action button spans full width beneath the title with `min-h-[44px]`.
2. **Vertical Space Optimization:**
   - Secondary controls, tabs, and filters live inside the page body.
   - Date inputs in `DateRangeBar.tsx` render side-by-side on mobile in a 2-column grid (`grid grid-cols-2 lg:flex`), preventing excessive vertical bloat.
   - Filter dropdowns sit side-by-side (`grid grid-cols-2 sm:flex`), recovering over 220px of vertical space so tabular cards appear immediately above the fold.
3. **Touch Targets:**
   - All interactive buttons and form inputs adhere to the mobile accessibility minimum height standard of `44px` (`min-h-[44px]`).

---

## 4. Dedicated Print Engine & 1-Page Payslip Voucher

TruckOps includes a custom print engine designed for paper billing and accounting audits without third-party PDF generators:

### Margin & Sheet Layout (`globals.css`)
- Strict sheet margins: `@page { margin: 8mm; size: auto; }`.
- Background reset: forces pure white `#ffffff` background and dark text `#0f172a` for high contrast.
- Elements hidden automatically in print:
  - Desktop sidebar `<aside>` and mobile navigation drawer.
  - Web navigation headers, hamburgers, and action buttons (`print:hidden`).
  - Interactive filter dropdowns, search inputs, and modal overlay backdrops.

### Official 1-Page Payslip Voucher Engine (`/payroll`)
When viewing an employee payslip in the modal and clicking **Print Payslip**:
1. The web modal dialog and entire background page are suppressed (`print:hidden`).
2. Replaced with a formal **Official Cutoff Payroll Voucher** (`.print-single-page`):
   - **Company Header:** *"TRUCKOPS TRUCKING SERVICES • Asia Brewery Logistics Operations (Cabuyao, Laguna)"*.
   - **Voucher Metadata:** Voucher number, cutoff period, print date, and status (*OFFICIAL RECEIPT (PAID)* vs. *PAYROLL VOUCHER (UNPAID)*).
   - **Employee Box:** Name, role (Driver/Helper), assigned truck, and daily/trip pay basis.
   - **Earnings Breakdown:** Regular completed trips pay + Overtime trip bonuses = Gross Compensation.
   - **Deductions:** Cash advance (vale) deduction with remaining balance.
   - **Net Take-Home Pay:** High-contrast bordered banner with large tabular currency value.
   - **Signatures:** Formal dual signature blocks: *"Prepared By (Operations / Payroll)"* and *"Received By (Employee Signature / Date)"*.
3. **1/1 Single Page Guarantee:** With a budgeted height of ~420px and `break-inside: avoid !important`, the voucher is guaranteed to fit on **1 single page** without spilling over.

---

## 5. Page Inventory & User Workflows

### Authentication (`/login`)
- Authenticates the single operator via email and password against `/api/v1/auth/login`.
- Automatically stores the Sanctum token in `localStorage` and redirects to `/dashboard`.
- Unauthenticated users attempting to access protected routes are intercepted by `AppShell` and routed to `/login`.

### Operations Dashboard (`/dashboard`)
- Real-time KPI cards:
  - **Active Fleet & Crew:** Trucks and employees currently available for dispatch.
  - **Completed Trips:** Total hauling runs completed within the selected period.
  - **Gross Revenue:** Expected earnings from Asia Brewery.
  - **Total Collections:** Actual payments received from AB.
  - **Outstanding AB Balance:** Client balance pending collection.
  - **Operating Expenses & Disbursed Payroll:** Total out-of-pocket operational costs.
  - **Net Cash Flow:** Net cash position ($\text{Collections} - [\text{Expenses} + \text{Payroll}]$).
- Features quick-action buttons directly jumping to Trip Encoding, Expense Logging, and Payroll Generation.

### Daily Trips & Verification (`/trips`)
- **Daily Multi-Trip Logging:** Encodes daily dispatch logs per truck and crew:
  - Selects Date, Assigned Truck, Driver, and optional Helper.
  - Sets number of **Regular Trips** and **Overtime Trips**.
  - Total trips are automatically computed (`regular_trips + overtime_trips`).
- **Generalized AB Rate Configuration:**
  - Includes a dedicated **AB Rate Per Trip** badge in the header displaying the active flat rate (default ₱1,500.00).
  - Clicking the badge opens the **Global Rate Manager Modal**, allowing the operator to update the rate site-wide.
  - Updating the rate automatically recalculates all open `Draft` trips while preserving locked snapshots on `Completed` trips.
- **Physical Monitoring Sheet Verification:**
  - Enter the physical Monitoring Sheet reference number (`reference_no`).
  - Verify trips against paper records before transitioning status from `Draft` to `Completed`.
  - Trips can also be marked as `Cancelled` if hauling was aborted.

### AB Collections & Reconciliation (`/collections`)
- Logs client payment remittances received from Asia Brewery Treasury.
- Records payment date, check/bank reference notes, and amount received.
- Real-time reconciliation banner calculates:
  $$\text{Outstanding Balance} = \text{Total Completed Trip Revenue} - \text{Total Collections Received}$$

### Business & Maintenance Expenses (`/expenses`)
- Tracks operating expenditures with flexible scoping:
  - **General Business Overhead:** Fuel, administrative expenses, permits, utilities.
  - **Truck-Specific Maintenance:** Repairs, tires, and oil changes tied to a specific truck plate number.
- **Category Management:** A `Manage Categories` button in the filter bar opens a modal to view existing categories and create custom categories.
- Header features a single, clean `+ Log Expense` action button.

### Payroll & Cash Advances (`/payroll`)
- **Dual Section Tabs:** Seamlessly toggle between **Payroll Register** and **Cash Advances (Vale)**.
- **Generate Payroll Modal:**
  - Select cutoff period (e.g. 1st–15th or 16th–End).
  - Automatically calculates regular base pay (Daily rate per distinct active date or Trip rate per trip) and overtime bonuses.
  - Automatically factors in active cash advance fixed deductions.
- **Cash Advances (Vale) Management:**
  - Issues loans with total amount and fixed deduction per payday.
  - Tracks real-time remaining balance until amortized.
- **Payslip Inspection & Payment Disbursal:**
  - View individual payslip breakdown dialog.
  - One-click **Mark as Paid** updates payroll status and automatically decrements the employee's active cash advance balance.
  - One-click **Print Payslip** renders the official 1-page voucher.

### Fleet Management (`/trucks`)
- Master list of the 4 company trucks.
- Tracks plate numbers, descriptions, and registration expiration dates.
- Status filters: `All`, `Available`, `Assigned`, `Under Maintenance`, `Inactive`.
- Automatic alert badges warn the operator if registration is expiring within 30 days or has expired.

### Employee Registry (`/employees`)
- Master list of drivers and helpers.
- Configures role (`Driver` vs. `Helper`), status (`Active` vs. `Inactive`), and pay agreement:
  - **Pay Type:** `Daily` vs. `Trip`.
  - **Base Rate (₱):** Daily rate or per-trip rate.
  - **Overtime Rate (₱/trip):** Fixed bonus rate for overtime runs.

### Reports & Tax Exports (`/reports`)
- Generates 3 core operational and financial reports:
  1. **Gross Revenue Ledger:** Detailed trip-by-trip earnings and fleet dispatch counts.
  2. **Expense Breakdown:** Itemized operational expenses by category and truck.
  3. **Payroll Register:** Employee compensation, overtime earnings, and cash advance deductions.
- Includes interactive tabular preview and one-click **Export CSV** producing Excel-ready UTF-8 formatted CSV files.

---

## 6. API Client & Error Handling Architecture

- Located at `src/lib/api.ts`.
- Uses native `fetch` with an automatic `Authorization: Bearer <token>` interceptor.
- Error handling class `ApiError` captures backend validation error responses (`422 Unprocessable Content`) and maps field errors directly to UI `FormField` components:
  ```ts
  try {
    await api.trips.create(payload);
  } catch (err) {
    if (err instanceof ApiError) {
      setFormError(err.message);
      setFieldErrors(err.errors); // Maps field => ["Error message"]
    }
  }
  ```

---

## 7. Installation, Environment & Build Commands

### Prerequisites
- Node.js 18.18+ or Node.js 20+
- npm 9+

### Setup
```bash
# 1. Navigate to the frontend directory
cd truckops-frontend

# 2. Install dependencies
npm install

# 3. Create .env.local file
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1

# 4. Start the Turbopack development server
npm run dev
```

### Verification & Quality Scripts
```bash
# Run ESLint validation
npm run lint

# Run strict TypeScript compiler verification
npx tsc --noEmit
```
Both commands must pass with **0 errors**.

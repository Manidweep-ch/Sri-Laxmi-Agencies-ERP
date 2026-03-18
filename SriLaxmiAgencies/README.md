# Sri Laxmi Agencies — Frontend

React + Vite frontend for the Sri Laxmi Agencies ERP system.

## Setup

```bash
npm install
npm run dev       # development server on http://localhost:5173
npm run build     # production build → dist/
npm run preview   # preview production build
```

## Environment

Copy `.env.example` to `.env` and set your backend URL:

```bash
cp .env.example .env
```

```env
VITE_API_BASE_URL=http://localhost:8081/api
```

## Role Access Summary

| Role      | Access                                                      |
|-----------|-------------------------------------------------------------|
| OWNER     | Full access                                                 |
| ADMIN     | Full access                                                 |
| MANAGER   | Full access                                                 |
| SALES     | Customers, Orders, Invoices, Payments, Inventory, Deliveries |
| ACCOUNTS  | Payments, Reports, Invoices, Payroll, Wallet                |
| WAREHOUSE | Inventory, GRN, Purchase Orders, Suppliers, Price List      |
| DRIVER    | My Deliveries only                                          |

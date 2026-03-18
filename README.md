# Sri Laxmi Agencies — ERP System

A full-stack ERP system for pipes and sanitary distribution businesses. Built with Spring Boot (backend) and React + Vite (frontend).

---

## Project Structure

```
/                          ← Spring Boot backend (Java 17, Maven)
SriLaxmiAgencies/          ← React frontend (Vite)
```

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Java 17, Spring Boot 4, Spring Security, JWT, JPA/Hibernate |
| Database  | MySQL 8+                            |
| Frontend  | React 19, Vite 8, React Router 7, Axios |

---

## Features

- **Inventory** — Stock batches, FIFO consumption, low-stock alerts
- **Purchase Orders** — Smart ordering by brand/category, GRN, supplier payments
- **Sales Orders** — Full order lifecycle, invoice generation, payments
- **Invoicing** — Auto-generated invoices, GST calculation, payment tracking
- **Delivery Management** — Vehicle fleet, driver assignment, delivery status tracking
- **Sales Returns** — Return processing with refunds
- **Follow-Up Tracker** — Customer follow-up notes and reminders
- **Team Management** — Staff, roles, salary tracking
- **Payroll** — Monthly payroll runs
- **Reports & Dashboard** — Financial summaries, outstanding balances
- **Role-Based Access** — OWNER, ADMIN, MANAGER, SALES, ACCOUNTS, WAREHOUSE, DRIVER

---

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.8+
- MySQL 8+
- Node.js 18+

### Backend Setup

1. Create the MySQL database:
   ```sql
   CREATE DATABASE srilaxmi_erp;
   ```

2. Copy the environment config:
   ```bash
   cp src/main/resources/application.properties.example src/main/resources/application.properties
   ```

3. Edit `application.properties` with your DB credentials.

4. Run the backend:
   ```bash
   ./mvnw spring-boot:run
   ```
   The API will start on `http://localhost:8081`

### Frontend Setup

```bash
cd SriLaxmiAgencies
npm install
npm run dev
```
The app will start on `http://localhost:5173`

---

## Default Login

On first run, a default Owner account is created automatically:

| Username | Password  |
|----------|-----------|
| `owner`  | `owner123` |

> Change the password immediately after first login.

---

## Environment Variables

See [`application.properties.example`](src/main/resources/application.properties.example) for backend config.
See [`SriLaxmiAgencies/.env.example`](SriLaxmiAgencies/.env.example) for frontend config.

---

## License

Private — Sri Laxmi Agencies. All rights reserved.

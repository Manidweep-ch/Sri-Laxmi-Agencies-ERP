# Sri Laxmi Agencies — ERP System

A full-stack ERP application built for **Sri Laxmi Agencies**, a pipes and sanitary distribution business.

---

## Tech Stack

### Backend
- Java 17
- Spring Boot 4.x
- Spring Security + JWT Authentication
- Spring Data JPA + Hibernate
- MySQL
- Lombok
- Maven

### Frontend
- React 19
- Vite 8
- React Router DOM 7
- Axios
- Pure CSS (no UI library) — custom industrial theme

---

## Project Structure

```
srilaxmi-erp/
├── src/                        # Spring Boot backend
│   └── main/java/com/srilaxmi/erp/
│       ├── config/             # CORS, Security, Exception Handler
│       ├── controller/         # REST API controllers
│       ├── dto/                # Data Transfer Objects
│       ├── entity/             # JPA entities
│       ├── repository/         # Spring Data repositories
│       └── service/            # Business logic
├── SriLaxmiAgencies/           # React frontend
│   └── src/
│       ├── api/                # Axios config
│       ├── components/         # Sidebar, Navbar
│       ├── context/            # Theme context
│       ├── hooks/              # usePageStyles
│       ├── layout/             # MainLayout
│       ├── pages/              # All page components
│       ├── routes/             # App routes
│       ├── services/           # API service functions
│       └── theme.js            # Dark/light theme tokens
├── pom.xml
└── README.md
```

---

## Modules

| Module | Description |
|---|---|
| Auth | JWT login, role-based access |
| Dashboard | Business overview, financial snapshot |
| Products | Catalogue with brand, category, GST |
| Price List | Base price, cost price, discount per product |
| Customers | Customer master data |
| Suppliers | Supplier master data |
| Purchase Orders | PO creation, status flow, GRN, supplier payments |
| Goods Receipt (GRN) | Stock receiving against PO |
| Sales Orders | SO creation, discount, status flow, invoice generation |
| Invoices | Auto-generated from sales orders |
| Payments | Customer payment tracking |
| Supplier Payments | Supplier payment tracking |
| Credit Notes | Credit adjustments |
| Sales Returns | Return management with refunds |
| Inventory | Stock batch tracking, low stock alerts |
| Reports | Financial, sales, purchase, inventory charts |

---

## Getting Started

### Prerequisites
- Java 17+
- Node.js 18+
- MySQL 8+
- Maven 3.8+

### Backend Setup

1. Create a MySQL database:
```sql
CREATE DATABASE srilaxmi_erp;
```

2. Configure `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/srilaxmi_erp
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
```

3. Run the backend:
```bash
./mvnw spring-boot:run
```
Backend runs on `http://localhost:8081`

### Frontend Setup

```bash
cd SriLaxmiAgencies
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

---

## Environment

- Backend API base URL: `http://localhost:8081/api`
- JWT token stored in `localStorage`
- Dark / Light mode toggle available in navbar

---

## License

Private — Sri Laxmi Agencies. All rights reserved.

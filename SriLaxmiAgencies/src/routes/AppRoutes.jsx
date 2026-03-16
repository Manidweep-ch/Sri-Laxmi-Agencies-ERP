import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import Dashboard from "../pages/Dashboard";
import PriceListPage from "../pages/PriceListPage";
import InventoryPage from "../pages/InventoryPage";
import StockManagementPage from "../pages/StockManagementPage";
import SuppliersPage from "../pages/SuppliersPage";
import PurchaseOrdersPage from "../pages/PurchaseOrderPage";
import PurchaseOrderItemsPage from "../pages/PurchaseOrderItemsPage";
import PurchaseOrderDetailsPage from "../pages/PurchaseOrderDetailsPage";
import GRNPage from "../pages/GRNPage";
import GRNItemsPage from "../pages/GRNItemsPage";
import CustomersPage from "../pages/CustomersPage";
import SalesOrdersPage from "../pages/SalesOrederPage";
import SalesOrderItemsPage from "../pages/SalesOrderItemsPage";
import SalesOrderDetailsPage from "../pages/SalesOrderDetailsPage";
import InvoicePage from "../pages/InvoicePage";
import InvoiceDetailsPage from "../pages/InvoiceDetailsPage";
import InvoiceItemsPage from "../pages/InvoiceItemsPage";
import PaymentsPage from "../pages/PaymentsPage";
import CreditNotePage from "../pages/CreditNotePage";
import SalesReturnsPage from "../pages/SalesReturnsPage";
import ReportsPage from "../pages/ReportsPage";

function AppRoutes() {

  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/stock-management" element={<StockManagementPage />} />
        <Route path="/prices" element={<PriceListPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/purchase" element={<PurchaseOrdersPage />} />
        <Route path="/purchase-order/:id/items" element={<PurchaseOrderItemsPage />} />
        <Route path="/purchase-order/:id/details" element={<PurchaseOrderDetailsPage />}/>
        <Route path="/grn" element={<GRNPage />} />
        <Route path="/grn/:id/items" element={<GRNItemsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/sales-orders" element={<SalesOrdersPage />} />
        <Route path="/sales-order/:id/items" element={<SalesOrderItemsPage />} />
        <Route path="/sales-order/:id/details" element={<SalesOrderDetailsPage />} />
        <Route path="/invoices" element={<InvoicePage />} />
        <Route path="/invoice/:id/details" element={<InvoiceDetailsPage />} />
        <Route path="/invoice/:id/items" element={<InvoiceItemsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/credit-notes" element={<CreditNotePage />} />
        <Route path="/sales-returns" element={<SalesReturnsPage />} />
        <Route path="/reports" element={<ReportsPage />} />

      </Routes>

    </BrowserRouter>
  );
}

export default AppRoutes;
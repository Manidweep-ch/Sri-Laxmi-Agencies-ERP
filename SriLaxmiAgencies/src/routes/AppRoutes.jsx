import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";

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
import SalesOrderDetailsPage from "../pages/SalesOrderDetailsPage";
import InvoicePage from "../pages/InvoicePage";
import InvoiceDetailsPage from "../pages/InvoiceDetailsPage";
import InvoiceItemsPage from "../pages/InvoiceItemsPage";
import PaymentsPage from "../pages/PaymentsPage";
import SalesReturnsPage from "../pages/SalesReturnsPage";
import ReportsPage from "../pages/ReportsPage";
import TeamPage from "../pages/TeamPage";
import PayrollPage from "../pages/PayrollPage";
import WalletPage from "../pages/WalletPage";

import FollowUpPage from "../pages/FollowUpPage";
import VehiclesPage from "../pages/VehiclesPage";
import DeliveriesPage from "../pages/DeliveriesPage";
import DriverDashboardPage from "../pages/DriverDashboardPage";

const P = ({ page, children }) => <ProtectedRoute page={page}>{children}</ProtectedRoute>;

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard"                    element={<P page="dashboard"><Dashboard /></P>} />
        <Route path="/inventory"                    element={<P page="inventory"><InventoryPage /></P>} />
        <Route path="/stock-management"             element={<P page="inventory"><StockManagementPage /></P>} />
        <Route path="/prices"                       element={<P page="prices"><PriceListPage /></P>} />
        <Route path="/suppliers"                    element={<P page="suppliers"><SuppliersPage /></P>} />
        <Route path="/purchase"                     element={<P page="purchase"><PurchaseOrdersPage /></P>} />
        <Route path="/purchase-order/:id/items"     element={<P page="purchase"><PurchaseOrderItemsPage /></P>} />
        <Route path="/purchase-order/:id/details"   element={<P page="purchase"><PurchaseOrderDetailsPage /></P>} />
        <Route path="/grn"                          element={<P page="grn"><GRNPage /></P>} />
        <Route path="/grn/:id/items"                element={<P page="grn"><GRNItemsPage /></P>} />
        <Route path="/customers"                    element={<P page="customers"><CustomersPage /></P>} />
        <Route path="/sales-orders"                 element={<P page="sales-orders"><SalesOrdersPage /></P>} />
        <Route path="/sales-order/:id/details"      element={<P page="sales-orders"><SalesOrderDetailsPage /></P>} />
        <Route path="/invoices"                     element={<P page="invoices"><InvoicePage /></P>} />
        <Route path="/invoice/:id/details"          element={<P page="invoices"><InvoiceDetailsPage /></P>} />
        <Route path="/invoice/:id/items"            element={<P page="invoices"><InvoiceItemsPage /></P>} />
        <Route path="/payments"                     element={<P page="payments"><PaymentsPage /></P>} />
        <Route path="/sales-returns"                element={<P page="sales-returns"><SalesReturnsPage /></P>} />
        <Route path="/reports"                      element={<P page="reports"><ReportsPage /></P>} />
        <Route path="/team"                         element={<P page="team"><TeamPage /></P>} />
        <Route path="/payroll"                      element={<P page="payroll"><PayrollPage /></P>} />
        <Route path="/wallet"                       element={<P page="wallet"><WalletPage /></P>} />
        <Route path="/follow-ups"                   element={<P page="follow-ups"><FollowUpPage /></P>} />
        <Route path="/vehicles"                     element={<P page="vehicles"><VehiclesPage /></P>} />
        <Route path="/deliveries"                   element={<P page="deliveries"><DeliveriesPage /></P>} />
        <Route path="/driver-dashboard"             element={<P page="driver-dashboard"><DriverDashboardPage /></P>} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;

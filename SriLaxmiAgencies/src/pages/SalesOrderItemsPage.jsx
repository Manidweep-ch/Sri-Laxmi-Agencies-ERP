import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function SalesOrderItemsPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/sales-orders", { replace: true }); }, [navigate]);
  return null;
}

export default SalesOrderItemsPage;

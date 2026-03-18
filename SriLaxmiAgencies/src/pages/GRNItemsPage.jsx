import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function GRNItemsPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/grn", { replace: true }); }, [navigate]);
  return null;
}

export default GRNItemsPage;

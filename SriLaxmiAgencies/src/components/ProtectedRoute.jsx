import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_HOME } from "../context/AuthContext";

export default function ProtectedRoute({ children, page }) {
  const { user, hasAccess } = useAuth();

  if (!user) return <Navigate to="/" replace />;
  if (page && !hasAccess(page)) {
    const home = ROLE_HOME[user?.role] || "/dashboard";
    return <Navigate to={home} replace />;
  }

  return children;
}

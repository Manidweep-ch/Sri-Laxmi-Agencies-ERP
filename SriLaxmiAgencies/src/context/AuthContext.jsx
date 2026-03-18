import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

// Role hierarchy — what each role can access
export const ROLE_PERMISSIONS = {
  OWNER:     ["dashboard","prices","inventory","suppliers","purchase","grn","customers","sales-orders","invoices","payments","sales-returns","reports","team","payroll","wallet","follow-ups","vehicles","deliveries"],
  ADMIN:     ["dashboard","prices","inventory","suppliers","purchase","grn","customers","sales-orders","invoices","payments","sales-returns","reports","team","payroll","wallet","follow-ups","vehicles","deliveries"],
  MANAGER:   ["dashboard","prices","inventory","suppliers","purchase","grn","customers","sales-orders","invoices","payments","sales-returns","reports","team","payroll","wallet","follow-ups","vehicles","deliveries"],
  SALES:     ["customers","sales-orders","invoices","payments","sales-returns","follow-ups","vehicles","deliveries","inventory"],
  ACCOUNTS:  ["dashboard","payments","sales-returns","reports","invoices","team","payroll","wallet","follow-ups"],
  WAREHOUSE: ["inventory","grn","purchase","suppliers","prices"],
  DRIVER:    ["driver-dashboard"],
};

// The first page each role lands on after login
export const ROLE_HOME = {
  OWNER:     "/dashboard",
  ADMIN:     "/dashboard",
  MANAGER:   "/dashboard",
  SALES:     "/sales-orders",
  ACCOUNTS:  "/dashboard",
  WAREHOUSE: "/inventory",
  DRIVER:    "/driver-dashboard",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");
    if (token && username) return { token, username, role: role || "USER", userId };
    return null;
  });

  const login = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("username", data.username);
    localStorage.setItem("role", data.role || "USER");
    localStorage.setItem("userId", data.userId || "");
    setUser({ token: data.token, username: data.username, role: data.role || "USER", userId: data.userId });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    setUser(null);
    window.location.href = "/";
  };

  const hasAccess = (page) => {
    if (!user) return false;
    const role = user.role && ROLE_PERMISSIONS[user.role] ? user.role : "ADMIN";
    const perms = ROLE_PERMISSIONS[role] || [];
    return perms.includes(page);
  };

  const getHome = () => {
    const role = user?.role;
    return ROLE_HOME[role] || "/dashboard";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasAccess, getHome }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import { useState } from "react";
import { login } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { ROLE_HOME } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { dark, toggle } = useTheme();
  const t = getTheme(dark);
  const { login: authLogin } = useAuth();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) { setError("Please enter both username and password"); return; }
    try {
      setLoading(true); setError("");
      const response = await login({ username, password });
      authLogin(response);
      const home = ROLE_HOME[response.role] || "/dashboard";
      window.location.href = home;
    } catch { setError("Invalid username or password"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: dark
        ? "linear-gradient(135deg, #070d14 0%, #0f2035 50%, #070d14 100%)"
        : "linear-gradient(135deg, #0f2035 0%, #1a3352 50%, #0a1a2e 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "60px", position: "relative",
      }}>
        <div style={{ position: "absolute", top: "20%", left: "10%", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(30,111,191,0.08)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "5%", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(59,158,222,0.06)", filter: "blur(60px)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "40px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #1e6fbf, #0e4d8a)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 4px 16px rgba(30,111,191,0.4)" }}>
              <img src="/lakshmi.png" alt="SLA" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { e.target.style.display = "none"; e.target.parentElement.innerHTML = "<span style='color:white;font-size:18px;font-weight:800'>SL</span>"; }} />
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Sri Laxmi Agencies</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>ERP System</div>
            </div>
          </div>

          <div style={{ color: "white", fontSize: "36px", fontWeight: 800, lineHeight: 1.2, marginBottom: "16px" }}>
            Manage your<br />
            <span style={{ color: "#3b9ede" }}>business</span> smarter
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: 1.7, maxWidth: "360px" }}>
            Complete ERP solution for pipes and sanitary distribution — inventory, orders, invoicing and more.
          </div>

          <div style={{ display: "flex", gap: "24px", marginTop: "40px" }}>
            {[["📦","Inventory"],["🛒","Orders"],["🧾","Invoicing"],["📊","Reports"]].map(([icon, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "22px", marginBottom: "4px" }}>{icon}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: "420px", minWidth: "420px", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px",
        background: dark ? "rgba(17,24,39,0.95)" : "rgba(255,255,255,0.97)",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ width: "100%" }}>
          <button onClick={toggle} style={{
            position: "absolute", top: "20px", right: "20px",
            width: "34px", height: "34px", borderRadius: "8px",
            border: `1px solid ${t.border}`, background: t.surfaceAlt,
            cursor: "pointer", fontSize: "14px", color: t.text,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{dark ? "☀️" : "🌙"}</button>

          <div style={{ marginBottom: "32px" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: t.text, marginBottom: "6px" }}>Sign in</div>
            <div style={{ fontSize: "13px", color: t.textMuted }}>Enter your credentials to continue</div>
          </div>

          {error && (
            <div style={{ background: t.dangerBg, color: t.danger, border: `1px solid ${t.dangerBorder}`, padding: "10px 14px", borderRadius: "8px", marginBottom: "18px", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "7px" }}>Username</label>
            <input className="erp-input" style={{
              width: "100%", padding: "11px 14px", borderRadius: "8px",
              border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text,
              fontSize: "14px", outline: "none", boxSizing: "border-box",
            }}
              placeholder="Enter username" value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "7px" }}>Password</label>
            <input className="erp-input" style={{
              width: "100%", padding: "11px 14px", borderRadius: "8px",
              border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text,
              fontSize: "14px", outline: "none", boxSizing: "border-box",
            }}
              type="password" placeholder="Enter password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>

          <button className="erp-btn" onClick={handleLogin} disabled={loading} style={{
            width: "100%", padding: "13px", borderRadius: "9px", border: "none",
            background: loading ? t.border : "linear-gradient(135deg, #1e6fbf, #155fa0)",
            color: loading ? t.textMuted : "white",
            fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 4px 16px rgba(30,111,191,0.35)",
          }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "11px", color: t.textMuted }}>
            Sri Laxmi Agencies ERP v1.0
          </div>
        </div>
      </div>
    </div>
  );
}

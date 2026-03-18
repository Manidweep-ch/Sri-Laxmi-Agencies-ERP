import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

export default function MainLayout({ children }) {
  const { dark } = useTheme();
  const t = getTheme(dark);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Navbar />
        <main style={{ flex: 1, padding: "24px 28px", background: t.bg }}>
          {children}
        </main>
      </div>
    </div>
  );
}

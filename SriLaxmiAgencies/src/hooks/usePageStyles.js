import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

export function usePageStyles() {
  const { dark } = useTheme();
  const t = getTheme(dark);

  return {
    t, dark,
    pageHeader: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: "24px", paddingBottom: "16px",
      borderBottom: `1px solid ${t.border}`,
    },
    pageTitle: { fontSize: "20px", fontWeight: 700, color: t.text, margin: 0 },
    card: {
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: "12px", padding: "18px 20px", boxShadow: t.shadow,
    },
    statCard: {
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: "12px", padding: "18px 20px",
      boxShadow: t.shadow, cursor: "pointer",
    },
    cardLabel: { fontSize: "11px", color: t.textMuted, marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" },
    cardValue: { fontSize: "22px", fontWeight: 800, color: t.text },
    cardSub: { fontSize: "11px", color: t.textMuted, marginTop: "4px" },
    formBox: {
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: "12px", padding: "22px 24px", marginBottom: "20px",
      boxShadow: t.shadowMd,
    },
    label: {
      display: "block", fontSize: "11px", color: t.textSub,
      marginBottom: "5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
    },
    input: {
      width: "100%", padding: "9px 12px",
      border: `1px solid ${t.inputBorder}`, borderRadius: "8px",
      fontSize: "13px", background: t.inputBg, color: t.text,
      boxSizing: "border-box", outline: "none",
      transition: "border-color 0.15s, box-shadow 0.15s",
    },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
    tableWrap: {
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: "12px", overflow: "hidden", boxShadow: t.shadow,
    },
    thead: { background: t.tableHead },
    th: {
      padding: "12px 16px", color: t.tableHeadText,
      textAlign: "left", fontWeight: 600, fontSize: "11px",
      textTransform: "uppercase", letterSpacing: "0.6px", whiteSpace: "nowrap",
    },
    tr: { borderBottom: `1px solid ${t.border}`, transition: "background 0.15s" },
    td: { padding: "12px 16px", color: t.text, verticalAlign: "middle" },
    tdSub: { padding: "12px 16px", color: t.textSub, verticalAlign: "middle", fontSize: "12px" },
    btnPrimary: {
      padding: "9px 18px", background: t.primary, color: "white",
      border: "none", borderRadius: "8px", cursor: "pointer",
      fontSize: "13px", fontWeight: 600, display: "inline-flex",
      alignItems: "center", gap: "6px", transition: "filter 0.15s, transform 0.1s",
    },
    btnSuccess: {
      padding: "9px 18px", background: t.success, color: "white",
      border: "none", borderRadius: "8px", cursor: "pointer",
      fontSize: "13px", fontWeight: 600, transition: "filter 0.15s, transform 0.1s",
    },
    btnDanger: {
      padding: "9px 18px", background: t.danger, color: "white",
      border: "none", borderRadius: "8px", cursor: "pointer",
      fontSize: "13px", fontWeight: 600, transition: "filter 0.15s, transform 0.1s",
    },
    btnGhost: {
      padding: "9px 18px", background: "transparent", color: t.textSub,
      border: `1px solid ${t.border}`, borderRadius: "8px", cursor: "pointer",
      fontSize: "13px", fontWeight: 500, transition: "background 0.15s",
    },
    btnPurple: {
      padding: "9px 18px", background: t.purple, color: "white",
      border: "none", borderRadius: "8px", cursor: "pointer",
      fontSize: "13px", fontWeight: 600,
    },
    btnSmSuccess: {
      padding: "5px 12px", background: t.success, color: "white",
      border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600,
    },
    btnSmDanger: {
      padding: "5px 12px", background: t.danger, color: "white",
      border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600,
    },
    btnSmGhost: {
      padding: "5px 12px", background: "transparent", color: t.textSub,
      border: `1px solid ${t.border}`, borderRadius: "6px", cursor: "pointer", fontSize: "12px",
    },
    btnSmPrimary: {
      padding: "5px 12px", background: t.primary, color: "white",
      border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600,
    },
    btnSmPurple: {
      padding: "5px 12px", background: t.purple, color: "white",
      border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600,
    },
    alertError: {
      background: t.dangerBg, color: t.danger, border: `1px solid ${t.dangerBorder}`,
      padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px",
      display: "flex", alignItems: "center", gap: "8px",
    },
    alertInfo: {
      background: t.surfaceAlt, color: t.textSub, border: `1px solid ${t.border}`,
      padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px",
    },
    alertSuccess: {
      background: t.successBg, color: t.success, border: `1px solid ${t.successBorder}`,
      padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px",
    },
    alertWarning: {
      background: t.warningBg, color: t.warning, border: `1px solid ${t.warningBorder}`,
      padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px",
    },
    badge: {
      padding: "3px 10px", borderRadius: "20px", fontSize: "11px",
      fontWeight: 700, display: "inline-block", letterSpacing: "0.3px",
    },
    searchInput: {
      padding: "9px 12px", border: `1px solid ${t.inputBorder}`,
      borderRadius: "8px", fontSize: "13px", background: t.inputBg,
      color: t.text, outline: "none", width: "240px",
      transition: "border-color 0.15s, box-shadow 0.15s",
    },
    filterPill: (active, color) => ({
      padding: "5px 14px", border: `1px solid ${active ? color : t.border}`,
      borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: 600,
      background: active ? color : t.surfaceAlt,
      color: active ? "white" : t.textSub,
      transition: "all 0.15s",
    }),
    tabBtn: (active, color) => ({
      padding: "9px 20px", border: "none", cursor: "pointer",
      fontSize: "13px", fontWeight: 600, borderRadius: "8px 8px 0 0",
      background: active ? color : "transparent",
      color: active ? "white" : t.textSub,
      transition: "all 0.15s",
    }),
    expandedRow: { background: t.surfaceAlt, borderBottom: `2px solid ${t.border}` },
    expandedContent: { padding: "20px 28px" },
    overlay: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      backdropFilter: "blur(3px)",
    },
    modal: {
      background: t.surface, borderRadius: "14px", padding: "28px",
      width: "660px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
      boxShadow: t.shadowLg, border: `1px solid ${t.border}`,
    },
    sectionTitle: {
      fontSize: "12px", fontWeight: 700, color: t.textSub,
      textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px",
      display: "flex", alignItems: "center", gap: "8px",
    },
    totalsBox: {
      background: t.surfaceAlt, border: `1px solid ${t.border}`,
      borderRadius: "10px", padding: "14px 18px", minWidth: "240px",
    },
    totalRow: {
      display: "flex", justifyContent: "space-between",
      padding: "4px 0", fontSize: "13px", color: t.text,
    },
  };
}

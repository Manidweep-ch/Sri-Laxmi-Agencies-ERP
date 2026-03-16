function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      paddingBottom: "10px",
      borderBottom: "1px solid #eee"
    }}>
      <div>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ margin: "5px 0 0 0", color: "#666" }}>{subtitle}</p>}
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        {actions}
      </div>
    </div>
  );
}

export default PageHeader;

function Alert({ message, type = "error" }) {
  if (!message) return null;

  const styles = {
    padding: "10px 15px",
    borderRadius: "4px",
    marginBottom: "20px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  };

  if (type === "error") {
    styles.backgroundColor = "#ffe6e6";
    styles.color = "#cc0000";
    styles.border = "1px solid #ffcccc";
  } else if (type === "success") {
    styles.backgroundColor = "#e6ffed";
    styles.color = "#006621";
    styles.border = "1px solid #ccffda";
  }

  return (
    <div style={styles}>
      <span>{message}</span>
    </div>
  );
}

export default Alert;

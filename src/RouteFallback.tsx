export function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6b7280",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: 14,
      }}
    >
      Cargando…
    </div>
  );
}

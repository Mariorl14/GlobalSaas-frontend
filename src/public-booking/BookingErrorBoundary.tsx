import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Public booking has no shop shell — a render crash would otherwise be a blank page. */
export class BookingErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Public booking crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="pb-root"
          style={{
            minHeight: "100vh",
            background: "#ffffff",
            color: "#0f172a",
            padding: "1.5rem",
          }}
        >
          <p style={{ fontWeight: 700, margin: "0 0 0.5rem" }}>
            No pudimos mostrar este paso.
          </p>
          <p style={{ margin: "0 0 1rem", color: "#475569" }}>
            Recarga la página e inténtalo de nuevo.
          </p>
          <button
            type="button"
            className="pb-btn pb-btn-primary"
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

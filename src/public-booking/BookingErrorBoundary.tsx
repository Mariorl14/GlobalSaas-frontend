import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null; remount: number };

function isTranslateDomError(error: Error): boolean {
  const m = `${error.name} ${error.message}`.toLowerCase();
  return (
    m.includes("removechild") ||
    m.includes("insertbefore") ||
    m.includes("not a child") ||
    m.includes("no es hijo")
  );
}

let recoveredTranslateError = false;

/** Public booking has no shop shell — a render crash would otherwise be a blank page. */
export class BookingErrorBoundary extends Component<Props, State> {
  state: State = { error: null, remount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    if (isTranslateDomError(error) && !recoveredTranslateError) {
      recoveredTranslateError = true;
      return { error: null, remount: Date.now() };
    }
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
          {this.state.error?.message ? (
            <pre
              style={{
                margin: "0 0 1rem",
                padding: "0.75rem",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                color: "#334155",
                fontSize: 12,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </pre>
          ) : null}
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
    return <div key={this.state.remount}>{this.props.children}</div>;
  }
}

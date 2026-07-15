import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onReset?: () => void;
};

type State = { error: Error | null };

/** Keeps the shop shell visible if a page crashes while rendering. */
export class ShopErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Shop page crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bp-alert bp-alert--error" style={{ margin: 24 }}>
          <span>
            Esta pantalla falló al renderizar. Recarga o vuelve a intentar.{" "}
            <button
              type="button"
              className="bp-btn bp-btn--ghost bp-btn--sm"
              onClick={() => {
                this.setState({ error: null });
                this.props.onReset?.();
                window.location.reload();
              }}
            >
              Recargar
            </button>
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}

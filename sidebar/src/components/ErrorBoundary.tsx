import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, any render-time error in any screen takes down the whole
// sidebar to a blank white iframe with no way to recover short of closing
// and reopening the Sheet — a bad failure mode for a production add-on.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ReportPilot sidebar crashed:', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="screen screen-center">
          <h2>Something went wrong</h2>
          <p className="muted small">
            ReportPilot hit an unexpected error. Reloading usually fixes this.
          </p>
          <button className="btn btn-primary" onClick={this.reset}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

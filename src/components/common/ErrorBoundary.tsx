import { TriangleAlert } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui/Button";

interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes so one broken section cannot blank the whole app.
 * Wrapped around the router and around each independent page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <TriangleAlert className="h-10 w-10 text-deal" strokeWidth={1.6} />
        <h1 className="mt-4 text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 max-w-md text-md text-ink-3">{error.message}</p>
        <div className="mt-5 flex gap-2">
          <Button onClick={() => this.setState({ error: null })} variant="outline">
            Try again
          </Button>
          <Button onClick={() => window.location.assign("/")}>Back to home</Button>
        </div>
      </div>
    );
  }
}

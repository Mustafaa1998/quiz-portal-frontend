import React from "react";

type State = { hasError: boolean; error?: any };
export default class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: any) { console.error("App crash:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-slate-500 mt-2">Please refresh or try again later.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background text-foreground font-sans">
          <div className="max-w-md w-full p-6 rounded-2xl border border-border bg-card shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                Ops! Ocorreu um erro no aplicativo
              </h2>
              <p className="text-xs text-muted-foreground">
                Um erro inesperado impediu a renderização da interface.
              </p>
            </div>

            {this.state.error && (
              <pre className="p-3 rounded-xl bg-muted/60 border border-border/80 text-[11px] font-mono text-destructive text-left overflow-x-auto max-h-36 custom-scrollbar whitespace-pre-wrap">
                {this.state.error.toString()}
              </pre>
            )}

            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-2 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recarregar Aplicativo</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

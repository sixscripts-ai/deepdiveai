import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshIcon, HomeIcon } from './icons/Icons';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900/80 rounded-xl border border-red-500/30 p-8 text-center backdrop-blur-xl">
            <div className="text-red-400 mb-6">
              <svg className="h-16 w-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-2xl font-bold text-red-400 mb-2">Something went wrong</h2>
              <p className="text-gray-400 mb-6">
                The application encountered an unexpected error. Don't worry, your data is safe.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-all duration-200 border border-cyan-500/30 hover:border-cyan-500/50"
              >
                <HomeIcon className="h-5 w-5" />
                <span>Return to Home</span>
              </button>
              
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 rounded-lg transition-all duration-200 border border-gray-600/30 hover:border-gray-600/50"
              >
                <RefreshIcon className="h-5 w-5" />
                <span>Reload Application</span>
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-400 bg-gray-800/50 p-3 rounded overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
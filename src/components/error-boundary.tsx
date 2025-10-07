import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

export class DiscountErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Generate a unique error ID for tracking
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error details
    console.error('Discount page error caught by boundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.logToMonitoringService(error, errorInfo);
    }
  }

  private logToMonitoringService(error: Error, errorInfo: ErrorInfo) {
    // In a real application, you would send this to a monitoring service
    // like Sentry, LogRocket, or your own logging endpoint
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          errorInfo: {
            componentStack: errorInfo.componentStack
          },
          errorId: this.state.errorId,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          retryCount: this.retryCount
        })
      }).catch(logError => {
        console.warn('Failed to log error to monitoring service:', logError);
      });
    } catch (logError) {
      console.warn('Error logging failed:', logError);
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    } else {
      // Reload the page as last resort
      window.location.reload();
    }
  };

  private handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/discounts';
    }
  };

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // Copy error details to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2)).then(() => {
      alert('Error details copied to clipboard. Please share this with the development team.');
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId } = this.state;
      const isDevMode = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 text-destructive mb-4">
                <AlertCircle className="w-full h-full" />
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  We encountered an unexpected error while loading the discount page. 
                  Don't worry - your data is safe.
                </p>
                {errorId && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Error ID: {errorId}
                  </p>
                )}
              </div>

              {/* Error Details (Development Mode) */}
              {isDevMode && error && (
                <div className="space-y-2">
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                      Show technical details
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <div className="text-xs font-mono space-y-1">
                        <div><span className="font-semibold">Error:</span> {error.message}</div>
                        {error.stack && (
                          <div className="mt-2">
                            <span className="font-semibold">Stack:</span>
                            <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                              {error.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                  disabled={this.retryCount >= this.maxRetries}
                >
                  <RefreshCw className="w-4 h-4" />
                  {this.retryCount >= this.maxRetries ? 'Reload Page' : 'Try Again'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoBack}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </Button>

                {isDevMode && (
                  <Button 
                    variant="outline" 
                    onClick={this.handleReportError}
                    className="flex items-center gap-2"
                  >
                    Copy Error Details
                  </Button>
                )}
              </div>

              {/* Helpful Information */}
              <div className="text-center space-y-2 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  If this problem persists, try:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Refreshing the page</li>
                  <li>• Clearing your browser cache</li>
                  <li>• Checking your internet connection</li>
                  <li>• Contacting support if the issue continues</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <DiscountErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </DiscountErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Hook for manually reporting errors
export const useErrorReporting = () => {
  const reportError = (error: Error, context?: any) => {
    console.error('Manual error report:', error, context);
    
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          context,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          type: 'manual'
        })
      }).catch(logError => {
        console.warn('Failed to report error:', logError);
      });
    }
  };

  return { reportError };
};

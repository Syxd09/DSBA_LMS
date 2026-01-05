import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the entire app.
 * 
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
    this.setState({ errorInfo });
    
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //   sendToErrorTracking(error, errorInfo);
    // }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred while rendering this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {process.env.NODE_ENV !== 'production' && this.state.error && (
                <div className="bg-muted p-4 rounded-md border">
                  <p className="font-mono text-sm text-destructive font-semibold mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="text-xs text-muted-foreground overflow-auto max-h-40 mt-2">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
              {process.env.NODE_ENV === 'production' && (
                <p className="text-sm text-muted-foreground">
                  Please try refreshing the page or contact support if the problem persists.
                </p>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={this.handleReload} variant="default">
                Reload Page
              </Button>
              <Button onClick={this.handleGoHome} variant="outline">
                Go to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

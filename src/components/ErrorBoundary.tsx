import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return this.renderErrorUI();
    }

    return this.props.children;
  }

  renderErrorUI() {
    return (
      <div className="py-8 px-4">
        <Card className="border shadow-sm w-full">
          <CardHeader>
            <CardTitle className="text-red-500">Something went wrong</CardTitle>
            <CardDescription>
              An unexpected error occurred in the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto">
              <p className="font-mono text-sm">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={this.handleReset}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
}

export default ErrorBoundary; 
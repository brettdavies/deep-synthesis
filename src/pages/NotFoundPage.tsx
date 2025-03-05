import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

const NotFoundPage: React.FC = () => {
  return (
    <div className="container mx-auto py-16 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <span className="text-6xl font-bold">404</span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link to="/">Return to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default NotFoundPage; 
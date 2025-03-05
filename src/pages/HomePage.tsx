import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faBook, faFlask, faChartPie } from '@fortawesome/free-solid-svg-icons';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="py-12">
      <div className="space-y-12">
        {/* Welcome Section */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to Deep Synthesis</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Your AI-powered research assistant for exploring scientific literature
          </p>
          <Button 
            size="lg" 
            className="mt-4 h-12 px-6 text-base"
            onClick={() => navigate('/new-report')}
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            Start a New Report
          </Button>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>
                <FontAwesomeIcon icon={faFlask} className="mr-2 h-5 w-5 text-blue-500" />
                AI-Powered Research
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                Deep Synthesis searches through academic papers and uses AI to generate comprehensive reports. Get insights faster without spending hours reading dozens of papers.
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>
                <FontAwesomeIcon icon={faBook} className="mr-2 h-5 w-5 text-green-500" />
                Local Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                Your papers and reports are stored locally in your browser using IndexedDB. No data is sent to external servers, ensuring complete privacy for your research.
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>
                <FontAwesomeIcon icon={faChartPie} className="mr-2 h-5 w-5 text-purple-500" />
                Structured Process
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                Our step-by-step workflow guides you from topic selection to paper curation and report generation, making research easier and more efficient.
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>
                <FontAwesomeIcon icon={faBook} className="mr-2 h-5 w-5 text-amber-500" />
                Paper & Report Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                Easily access your research papers and generated reports. Browse, search, and manage your research materials in dedicated sections.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Get Started Section */}
        <div className="text-center space-y-4 py-6">
          <h2 className="text-2xl font-bold">Ready to Start?</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Begin your research journey with Deep Synthesis. Create a report, refine your focus with AI, and discover key insights in minutes.
          </p>
          <Button 
            size="lg" 
            className="mt-4 h-12 px-6 text-base"
            onClick={() => navigate('/new-report')}
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            Create Your First Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

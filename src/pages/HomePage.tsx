import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loading } from '@/components/ui/loading';
import { Progress } from '@/components/ui/progress';
import { searchArxiv } from '@/lib/services/arxiv';
import { PaperOperations } from '@/lib/db/operations';
import { ReportOperations } from '@/lib/db/operations';
import toast from 'react-hot-toast';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [paperCount, setPaperCount] = useState('10');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsLoading(true);
    setProgress(0);
    setStatusMessage('Searching arXiv for papers...');
    
    try {
      // Convert paperCount to number
      const maxResults = parseInt(paperCount);
      
      // Search arXiv for papers
      const searchResults = await searchArxiv({
        query: query.trim(),
        maxResults,
        sortBy: 'relevance',
      });
      
      // Update progress
      setProgress(40);
      setStatusMessage(`Found ${searchResults.papers.length} papers. Processing...`);
      
      // Store papers in IndexedDB
      const papers = searchResults.papers;
      const progressIncrement = 40 / papers.length;
      
      for (let i = 0; i < papers.length; i++) {
        const paper = papers[i];
        
        // Update status message
        setStatusMessage(`Processing paper ${i + 1} of ${papers.length}...`);
        
        // Store paper in IndexedDB
        await PaperOperations.create({
          ...paper,
          pdfDownloaded: false,
          pdfDownloadProgress: undefined
        });
        
        // Update progress
        setProgress(40 + (i + 1) * progressIncrement);
      }
      
      // Update progress
      setProgress(80);
      setStatusMessage('Creating report...');
      
      // Create a new report
      const reportId = await ReportOperations.create({
        title: `Report: ${query}`,
        query,
        references: papers.map(paper => ({
          paperId: paper.id,
          text: `${paper.authors.join(', ')}. ${paper.title}. ${paper.year}.`,
          pdfUrl: paper.pdfUrl,
        })),
        bibtex: papers.map(paper => paper.bibtex).join('\n\n'),
        review: '',
        date: new Date(),
      });
      
      // Complete progress
      setProgress(100);
      setStatusMessage('Report generated!');
      
      // Navigate to the report page
      setTimeout(() => {
        setIsLoading(false);
        navigate(`/report/${reportId}`);
      }, 500);
    } catch (error) {
      console.error('Error generating report:', error);
      setStatusMessage('Error generating report. Please try again.');
      
      // Show error toast notification
      toast.error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Research Report Generator</CardTitle>
          <CardDescription>
            Enter a research topic to generate a comprehensive literature review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="query">Research Query</Label>
              <Input
                id="query"
                placeholder="e.g., Recent advances in quantum computing"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paperCount">Number of Papers</Label>
              <Select 
                value={paperCount} 
                onValueChange={setPaperCount}
                disabled={isLoading}
              >
                <SelectTrigger id="paperCount">
                  <SelectValue placeholder="Select number of papers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 papers</SelectItem>
                  <SelectItem value="10">10 papers</SelectItem>
                  <SelectItem value="15">15 papers</SelectItem>
                  <SelectItem value="20">20 papers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {isLoading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{statusMessage}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? <Loading size="small" message="" className="mr-2" /> : null}
              {isLoading ? 'Processing...' : 'Generate Report'}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            All processing happens in your browser. Your data stays private.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default HomePage; 
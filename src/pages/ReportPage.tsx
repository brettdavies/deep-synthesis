import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportOperations } from '@/lib/db/operations';
import type { Report } from '@/lib/db/schema/report';
import ReactMarkdown from 'react-markdown';
import { ensureHttps } from '@/lib/utils/network/url';

const ReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('review');

  useEffect(() => {
    const loadReport = async () => {
      if (!id) {
        setError('Report ID is missing');
        setIsLoading(false);
        return;
      }

      try {
        const reportData = await ReportOperations.getById(id);
        if (!reportData) {
          setError('Report not found');
        } else {
          setReport(reportData);
        }
      } catch (err) {
        console.error('Error loading report:', err);
        setError('Failed to load report');
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [id]);

  const handleExport = () => {
    if (!report) return;

    // Create a blob with the report content
    const blob = new Blob([
      `# ${report.title}\n\n`,
      `Generated on: ${new Date(report.date).toLocaleDateString()}\n\n`,
      report.review || 'No review content available.',
      '\n\n## References\n\n',
      report.references.map((ref, index) => 
        `[${index + 1}] ${ref.text}`
      ).join('\n\n'),
      '\n\n## BibTeX\n\n```\n',
      report.bibtex || 'No BibTeX available.',
      '\n```'
    ], { type: 'text/markdown' });

    // Create a download link and trigger it
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this report?')) return;

    try {
      await ReportOperations.delete(id);
      navigate('/library');
    } catch (err) {
      console.error('Error deleting report:', err);
      setError('Failed to delete report');
    }
  };

  const handleViewPdf = (pdfUrl: string) => {
    if (pdfUrl) {
      window.open(ensureHttps(pdfUrl), '_blank');
    } else {
      alert('PDF URL not available for this reference.');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-16">
        <Loading size="large" message="Loading report..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/library')}>Back to Library</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Report Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested report could not be found.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/library')}>Back to Library</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{report.title}</CardTitle>
              <CardDescription>
                Generated on {new Date(report.date).toLocaleDateString()} • 
                Based on {report.references.length} papers
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExport}>
                Export
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="review">Literature Review</TabsTrigger>
              <TabsTrigger value="references">References</TabsTrigger>
              {report.bibtex && <TabsTrigger value="bibtex">BibTeX</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="review" className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none">
              {report.review ? (
                <ReactMarkdown>
                  {report.review}
                </ReactMarkdown>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md mb-6">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    This report doesn't have a review yet. Enable AI review generation in the AI Settings section on the home page.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="references">
              <h2 className="text-xl font-semibold mb-4">References</h2>
              <ol className="list-decimal pl-5 space-y-4">
                {report.references.map((ref, index) => (
                  <li key={index} className="flex justify-between items-start">
                    <span>{ref.text}</span>
                    {ref.pdfUrl && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-2 shrink-0"
                        onClick={() => handleViewPdf(ref.pdfUrl)}
                      >
                        PDF
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </TabsContent>
            
            {report.bibtex && (
              <TabsContent value="bibtex">
                <h2 className="text-xl font-semibold mb-4">BibTeX</h2>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                  {report.bibtex}
                </pre>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/library')}>Back to Library</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ReportPage; 
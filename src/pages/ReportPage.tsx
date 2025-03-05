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
import { formatDate } from '@/lib/utils/formatting/date';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Loader } from '@/components/ui/loader';

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
      `Generated on: ${formatDate(report.date)}\n\n`,
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
      navigate('/reports');
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
      <div className="pt-3 pb-6">
        <Card className="border shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
              <Loader className="h-8 w-8 mb-4" />
              <span className="text-muted-foreground">Loading report...</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate('/reports')}>Back to Reports</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-3 pb-6">
        <Card className="border shadow-sm">
          <CardContent className="py-8">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => navigate('/reports')}>Back to Reports</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="pt-3 pb-6">
        <Card className="border shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
              <Loader className="h-8 w-8 mb-4" />
              <span className="text-muted-foreground">Report not found...</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate('/reports')}>Back to Reports</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-3 pb-6">
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/reports')} 
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Reports
        </Button>
      </div>
      <Card className="border shadow-sm w-full">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">{report.title}</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Generated on {formatDate(report.date)} • 
                Based on {report.references.length} paper{report.references.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex gap-2 self-start">
              <Button variant="outline" onClick={handleExport} size="sm">
                Export
              </Button>
              <Button variant="destructive" onClick={handleDelete} size="sm">
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 bg-muted">
              <TabsTrigger value="review">Literature Review</TabsTrigger>
              <TabsTrigger value="references">References ({report.references.length})</TabsTrigger>
              {report.bibtex && <TabsTrigger value="bibtex">BibTeX</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="review" className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert">
              {report.review ? (
                <div className="bg-card border rounded-md p-4 mb-4">
                  <ReactMarkdown>
                    {report.review}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md mb-6 border border-yellow-200 dark:border-yellow-900">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    This report doesn't have a review yet. Enable AI review generation in the AI Settings section on the home page.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="references">
              <div className="bg-card border rounded-md p-4 mb-4">
                <h2 className="text-xl font-semibold mb-4">References</h2>
                <ol className="list-decimal pl-5 space-y-4">
                  {report.references.map((ref, index) => (
                    <li key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 pb-3 border-b last:border-0">
                      <span className="text-sm">{ref.text}</span>
                      {ref.pdfUrl && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="self-start shrink-0"
                          onClick={() => handleViewPdf(ref.pdfUrl)}
                        >
                          View PDF
                        </Button>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </TabsContent>
            
            {report.bibtex && (
              <TabsContent value="bibtex">
                <div className="bg-card border rounded-md p-4 mb-4">
                  <h2 className="text-xl font-semibold mb-4">BibTeX</h2>
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap text-sm font-mono">
                    {report.bibtex}
                  </pre>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
        <CardFooter className="pt-4">
          <div className="w-full flex justify-between">
            <Button variant="outline" onClick={() => navigate('/reports')}>Back to Reports</Button>
            <Button variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Back to Top
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ReportPage; 
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BriefOperations } from '@/lib/db/operations';
import type { Brief } from '@/lib/db/schema/brief';
import ReactMarkdown from 'react-markdown';
import { ensureHttps } from '@/lib/utils/network/url';
import { formatDate } from '@/lib/utils/formatting/date';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Pencil, Check, X, RefreshCw, Download } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { useBriefOperations } from '@/hooks/useBriefOperations';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useLLM } from '@/lib/llm/use-llm';
import { generateBrief, updateBriefWithGeneratedContent } from '@/lib/brief/generateBrief';
import { DeleteConfirmationDialog } from '@/components/common/DeleteConfirmationDialog';
import { RegenerateConfirmationDialog } from '@/components/common/RegenerateConfirmationDialog';
import { ExportFormatDialog } from '@/components/brief/ExportFormatDialog';
import { exportBrief } from '@/lib/utils/export/briefExport';
import type { ExportFormat } from '@/lib/utils/export/briefExport';

const BriefPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('review');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showRegenerateConfirmation, setShowRegenerateConfirmation] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Get brief operations helpers
  const { handleEditBrief } = useBriefOperations();
  // Get LLM functionality for regeneration
  const { completeWithAI } = useLLM();

  useEffect(() => {
    const loadBrief = async () => {
      if (!id) {
        setError('Brief ID is missing');
        setIsLoading(false);
        return;
      }

      try {
        const briefData = await BriefOperations.getById(id);
        if (!briefData) {
          setError('Brief not found');
        } else {
          setBrief(briefData);
        }
      } catch (err) {
        console.error('Error loading brief:', err);
        setError('Failed to load brief');
      } finally {
        setIsLoading(false);
      }
    };

    loadBrief();
  }, [id]);

  const handleExport = () => {
    setShowExportDialog(true);
  };

  const handleExportFormat = async (format: ExportFormat) => {
    if (!brief) return;
    
    setIsExporting(true);
    setShowExportDialog(false);
    
    try {
      await exportBrief(brief, format);
      toast.success(`Brief exported to ${format.toUpperCase()} successfully`);
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      toast.error(`Failed to export brief to ${format}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await BriefOperations.delete(id);
      navigate('/briefs');
    } catch (err) {
      console.error('Error deleting brief:', err);
      setError('Failed to delete brief');
    }
  };

  const confirmDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const handleViewPdf = (pdfUrl: string) => {
    if (pdfUrl) {
      window.open(ensureHttps(pdfUrl), '_blank');
    } else {
      alert('PDF URL not available for this reference.');
    }
  };

  const handleStartEditingTitle = () => {
    if (brief) {
      setEditedTitle(brief.title);
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = async () => {
    if (!brief || !id || !editedTitle.trim()) return;

    try {
      await BriefOperations.update(id, {
        title: editedTitle.trim(),
        updatedAt: new Date()
      });
      
      setBrief({
        ...brief,
        title: editedTitle.trim(),
        updatedAt: new Date()
      });
      
      setIsEditingTitle(false);
      toast.success('Title updated successfully');
    } catch (error) {
      console.error('Error updating title:', error);
      toast.error('Failed to update title');
    }
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    if (brief) {
      setEditedTitle(brief.title);
    }
  };

  // Handle regenerating the brief
  const handleRegenerateBrief = async () => {
    if (!brief || !id) return;
    
    setIsRegenerating(true);
    
    try {
      // Use the shared utility function to generate the brief
      const result = await generateBrief(brief, completeWithAI);
      
      if (result.success && result.content && result.bibtex) {
        // Use the shared utility function to update the brief with generated content
        // Pass 'regenerate' to indicate this is a regeneration workflow
        const success = await updateBriefWithGeneratedContent(id, result.content, result.bibtex, 'regenerate');
        
        if (success) {
          // Update the local brief state to reflect changes
          setBrief({
            ...brief,
            review: result.content,
            bibtex: result.bibtex,
            updatedAt: new Date()
          });
          
          // Ensure we're on the review tab to see the new content
          setActiveTab('review');
        }
      }
    } catch (error) {
      console.error('Error regenerating brief:', error);
      // Toast error is handled in the updateBriefWithGeneratedContent function
    } finally {
      setIsRegenerating(false);
      setShowRegenerateConfirmation(false);
    }
  };

  const confirmRegenerate = () => {
    setShowRegenerateConfirmation(true);
  };

  if (isLoading) {
    return (
      <div className="pt-3 pb-6">
        <Card className="border shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
              <Loader className="h-8 w-8 mb-4" />
              <span className="text-muted-foreground">Loading brief...</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate('/briefs')}>Back to Briefs</Button>
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
              <Button variant="outline" onClick={() => navigate('/briefs')}>Back to Briefs</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="pt-3 pb-6">
        <Card className="border shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
              <Loader className="h-8 w-8 mb-4" />
              <span className="text-muted-foreground">Brief not found...</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate('/briefs')}>Back to Briefs</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-3 pb-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/briefs')} 
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Briefs
          </Button>
        </div>
      </div>
      <Card className="border shadow-sm w-full">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 w-full max-w-2xl">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveTitle();
                        } else if (e.key === 'Escape') {
                          handleCancelEditTitle();
                        }
                      }}
                      className="text-2xl font-bold py-1 px-2"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveTitle}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditTitle}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-2xl font-bold">{brief.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEditingTitle}
                      className="text-muted-foreground hover:text-foreground p-1 h-auto"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <CardDescription className="text-muted-foreground mt-1">
                Generated on {formatDate(brief.date)} • 
                Based on {brief.references.length} paper{brief.references.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex gap-2 self-start">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => id && handleEditBrief(id)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={confirmRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-1"
              >
                {isRegenerating ? (
                  <>
                    <Loader className="h-3 w-3 mr-1" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Regenerate
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExport} 
                size="sm"
                disabled={isExporting}
                className="flex items-center gap-1"
              >
                {isExporting ? (
                  <>
                    <Loader className="h-3 w-3 mr-1" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </>
                )}
              </Button>
              <Button variant="destructive" onClick={confirmDelete} size="sm">
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 bg-muted">
              <TabsTrigger value="review">Literature Review</TabsTrigger>
              <TabsTrigger value="references">References ({brief.references.length})</TabsTrigger>
              {brief.bibtex && <TabsTrigger value="bibtex">BibTeX</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="review" className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none">
              {brief.review ? (
                <div className="bg-card border rounded-md p-4 mb-4">
                  <ReactMarkdown className="markdown-content">
                    {brief.review}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md mb-6 border border-yellow-200 dark:border-yellow-900">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    This brief doesn't have a review yet. Enable AI review generation in the AI Settings section on the home page.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="references">
              <div className="bg-card border rounded-md p-4 mb-4">
                <h2 className="text-xl font-semibold mb-4">References</h2>
                <ol className="list-decimal pl-5 space-y-4">
                  {brief.references.map((ref, index) => (
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
            
            {brief.bibtex && (
              <TabsContent value="bibtex">
                <div className="bg-card border rounded-md p-4 mb-4">
                  <h2 className="text-xl font-semibold mb-4">BibTeX</h2>
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap text-sm font-mono">
                    {brief.bibtex}
                  </pre>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
        <CardFooter className="pt-4">
          <div className="w-full flex justify-between">
            <Button variant="outline" onClick={() => navigate('/briefs')}>Back to Briefs</Button>
            <Button variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Back to Top
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Confirmation dialogs */}
      <DeleteConfirmationDialog
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
        title="Delete Brief"
        description="Are you sure you want to delete this brief? This action cannot be undone."
        onConfirm={handleDelete}
      />
      
      <RegenerateConfirmationDialog
        open={showRegenerateConfirmation}
        onOpenChange={setShowRegenerateConfirmation}
        title="Regenerate Brief"
        description="Are you sure you want to regenerate this brief? This will replace the current content with a new AI-generated review."
        onConfirm={handleRegenerateBrief}
      />

      {/* Export format dialog */}
      <ExportFormatDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onSelectFormat={handleExportFormat}
      />
    </div>
  );
};

export default BriefPage; 
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  PaperOperations,
  ReportOperations
} from '@/lib/db/operations';
import type { Paper } from '@/lib/db/schema/paper';
import type { Report } from '@/lib/db/schema/report';
import { ensureHttps } from '@/lib/utils/network/url';
import { downloadQueue, getPdfFromChunks } from '@/lib/services/pdf';
import { Download, FileDown, ExternalLink, Book, Quote, Copy, Trash } from 'lucide-react';
import { formatFileSize } from '@/lib/utils/formatting/size';
import { formatDate } from '@/lib/utils/formatting/date';
import { copyToClipboard } from '@/lib/utils/clipboard/clipboard';
import toast from 'react-hot-toast';

const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'papers' | 'reports'>('reports');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [showAbstractModal, setShowAbstractModal] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        // Load papers
        const papersData = await PaperOperations.getAll();
        setPapers(papersData);
        
        // Calculate total size
        const size = papersData.reduce((sum, paper) => sum + (paper.pdfSize || 0), 0);
        setTotalSize(size);
        
        // Load reports
        const reportsData = await ReportOperations.getAll();
        setReports(reportsData);
      } catch (error) {
        console.error('Error loading library data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLibrary();
  }, []);

  const handleDeletePaper = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this paper?')) return;
    
    try {
      await PaperOperations.delete(id);
      setPapers(prev => {
        const filtered = prev.filter(paper => paper.id !== id);
        setTotalSize(filtered.reduce((sum, paper) => sum + (paper.pdfSize || 0), 0));
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting paper:', error);
    }
  };

  const handleDeleteAllPapers = async () => {
    if (!window.confirm('Are you sure you want to delete all papers? This cannot be undone.')) return;
    
    try {
      await PaperOperations.bulkDelete(papers.map(p => p.id));
      setPapers([]);
      setTotalSize(0);
    } catch (error) {
      console.error('Error deleting all papers:', error);
    }
  };

  const handleDeleteAllPdfs = async () => {
    if (!window.confirm('Are you sure you want to delete all downloaded PDFs? The papers will remain in your library.')) return;
    
    try {
      // Update all papers in the database to remove PDF data
      const updates = papers.map(paper => ({
        ...paper,
        pdfChunks: undefined,
        pdfSize: undefined,
        pdfDownloaded: false,
        updatedAt: new Date()
      }));
      
      await Promise.all(updates.map(paper => PaperOperations.update(paper.id, paper)));
      
      // Update state
      setPapers(updates);
      setTotalSize(0);
      
      toast.success("All downloaded PDFs have been removed from your library");
    } catch (error) {
      console.error('Error deleting all PDFs:', error);
      toast.error("Failed to delete all PDFs. Please try again.");
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    
    try {
      await ReportOperations.delete(id);
      setReports(prev => prev.filter(report => report.id !== id));
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  const handleViewReport = (id: string) => {
    navigate(`/report/${id}`);
  };

  const handleViewPdf = async (paper: Paper) => {
    console.warn('Attempting to view PDF:', {
      id: paper.id,
      downloaded: paper.pdfDownloaded,
      hasChunks: !!paper.pdfChunks,
      url: paper.pdfUrl
    });
    
    if (!paper.pdfDownloaded || !paper.pdfChunks) {
      // If not downloaded, open the arXiv PDF URL directly
      window.open(ensureHttps(paper.pdfUrl), '_blank');
      return;
    }

    try {
      // Get complete PDF from chunks
      const pdfBlob = await getPdfFromChunks(paper);
      if (!pdfBlob) {
        throw new Error('Could not load PDF from storage');
      }
      
      // Create a URL for the PDF blob
      const url = URL.createObjectURL(pdfBlob);
      
      // Open the PDF in a new tab
      window.open(url, '_blank');
      
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error("Error loading PDF from storage");
    }
  };

  const handleDownloadPdf = async (paper: Paper) => {
    try {
      // Show download starting toast
      toast("Starting download...");

      // Get total size first
      const response = await fetch(ensureHttps(paper.pdfUrl), { method: 'HEAD' });
      const totalSize = parseInt(response.headers.get('content-length') || '0');
      
      if (!totalSize) {
        throw new Error('Could not determine PDF size');
      }

      // Add to download queue and wait for completion
      await downloadQueue.add(paper);

      // Get the updated paper from the database to ensure we have the chunks
      const updatedPaper = await PaperOperations.getById(paper.id);
      if (!updatedPaper?.pdfChunks) {
        throw new Error('PDF chunks not found after download');
      }

      // Update papers state with downloaded status and verify database update
      const paperUpdate = {
        ...paper,
        pdfDownloaded: true,
        pdfSize: totalSize,
        pdfChunks: updatedPaper.pdfChunks,
        updatedAt: new Date()
      };
      
      // Update database first
      await PaperOperations.update(paper.id, paperUpdate);
      
      // Then update UI state
      setPapers(prev => prev.map(p => 
        p.id === paper.id ? paperUpdate : p
      ));
      
      // Update total size
      setTotalSize(prev => prev + totalSize);

      // Show success toast
      toast.success("PDF has been downloaded successfully");

    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error("Failed to download PDF. Please try again.");
    }
  };

  const handleRemovePdf = async (paper: Paper) => {
    try {
      await PaperOperations.update(paper.id, {
        pdfChunks: undefined,
        pdfSize: undefined,
        pdfDownloaded: false,
        updatedAt: new Date()
      });
      
      // Update papers state
      setPapers(prev => prev.map(p => 
        p.id === paper.id 
          ? { ...p, pdfChunks: undefined, pdfSize: undefined, pdfDownloaded: false }
          : p
      ));
      
      // Update total size
      setTotalSize(prev => prev - (paper.pdfSize || 0));
    } catch (error) {
      console.error('Error removing PDF:', error);
      toast.error("Failed to remove PDF. Please try again.");
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await copyToClipboard(text);
      toast.success("Text copied to clipboard");
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error("Failed to copy. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-16">
        <Loading size="large" message="Loading library..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Your Library</CardTitle>
              <CardDescription>
                {activeTab === 'papers' 
                  ? `${papers.length} papers stored (${formatFileSize(totalSize)})`
                  : `${reports.length} reports generated`
                }
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant={activeTab === 'reports' ? 'default' : 'outline'} 
                onClick={() => setActiveTab('reports')}
              >
                Reports
              </Button>
              <Button 
                variant={activeTab === 'papers' ? 'default' : 'outline'} 
                onClick={() => setActiveTab('papers')}
              >
                Papers
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'reports' ? (
            reports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No reports generated yet.</p>
                <Button onClick={() => navigate('/')} className="mt-4">
                  Generate a Report
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Title</th>
                      <th className="text-left py-2 px-4 hidden sm:table-cell">Date</th>
                      <th className="text-left py-2 px-4 hidden sm:table-cell">Papers</th>
                      <th className="text-right py-2 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">{report.title}</td>
                        <td className="py-3 px-4 hidden sm:table-cell">{formatDate(report.date)}</td>
                        <td className="py-3 px-4 hidden sm:table-cell">{report.references.length}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewReport(report.id!)}
                            >
                              View
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDeleteReport(report.id!)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            papers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No papers in your library yet.</p>
                <Button onClick={() => navigate('/')} className="mt-4">
                  Search for Papers
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Title</th>
                      <th className="text-left py-3 px-4 hidden md:table-cell">Authors</th>
                      <th className="text-left py-3 px-4 hidden sm:table-cell">Year</th>
                      <th className="text-left py-3 px-4 hidden sm:table-cell">arXiv ID</th>
                      <th className="text-left py-3 px-4 hidden sm:table-cell">Size</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {papers.map(paper => (
                      <tr key={paper.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <span className="mr-2">{paper.title}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyToClipboard(paper.title)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy Title</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="flex items-center justify-between">
                            <span className="mr-2">
                              {paper.authors.slice(0, 2).join(', ')}
                              {paper.authors.length > 2 && ' et al.'}
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyToClipboard(paper.authors.join(', '))}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy Authors</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">{paper.year}</td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <div className="flex items-center justify-between">
                            <a 
                              href={paper.abstractUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline mr-2"
                            >
                              {paper.arxivId}
                            </a>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyToClipboard(paper.arxivId)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy arXiv ID</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          {paper.pdfSize ? formatFileSize(paper.pdfSize) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPaper(paper);
                                      setShowAbstractModal(true);
                                    }}
                                  >
                                    <Book className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Abstract</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPaper(paper);
                                      setShowCitationModal(true);
                                    }}
                                  >
                                    <Quote className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Citation</TooltipContent>
                              </Tooltip>

                              {paper.pdfDownloaded ? (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleViewPdf(paper)}
                                      >
                                        <FileDown className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View PDF</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleRemovePdf(paper)}
                                      >
                                        <Trash className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete PDF</TooltipContent>
                                  </Tooltip>
                                </>
                              ) : (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => window.open(ensureHttps(paper.pdfUrl), '_blank')}
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View on arXiv</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleDownloadPdf(paper)}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Download PDF</TooltipContent>
                                  </Tooltip>
                                </>
                              )}

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    onClick={() => handleDeletePaper(paper.id!)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Paper</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </CardContent>
        {activeTab === 'papers' && papers.length > 0 && (
          <CardFooter className="flex justify-between">
            <p className="text-sm text-gray-500">
              Total storage: {formatFileSize(totalSize)}
            </p>
            <div className="flex space-x-2">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDeleteAllPdfs}
              >
                Delete All PDFs
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDeleteAllPapers}
              >
                Delete All Papers
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Abstract Modal */}
      <Dialog open={showAbstractModal} onOpenChange={setShowAbstractModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abstract</DialogTitle>
            <DialogDescription>
              {selectedPaper?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {selectedPaper?.abstract}
            </p>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyToClipboard(selectedPaper?.abstract || '')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Citation Modal */}
      <Dialog open={showCitationModal} onOpenChange={setShowCitationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Citation</DialogTitle>
            <DialogDescription>
              {selectedPaper?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
              {selectedPaper?.bibtex}
            </pre>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyToClipboard(selectedPaper?.bibtex || '')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LibraryPage; 
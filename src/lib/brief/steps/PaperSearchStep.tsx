import { useState, useEffect } from 'react';
import type { Brief } from '@/lib/db/schema/brief';
import type { BriefEditStep, StepProps } from './types';
import { registerStep } from './registry';
import { BriefOperations } from '@/lib/db/operations/briefs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Plus, X } from 'lucide-react';
import { useStepLogic } from './useStepLogic';

// Interface for search terms
interface SearchTerm {
  id: string;
  term: string;
  isActive: boolean;
}

// Interface for search results (papers)
interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: string;
  journal?: string;
  pdfUrl?: string;
  isSelected: boolean;
}

function PaperSearchStepComponent({ briefId, onComplete, onBack }: StepProps) {
  // Use the shared step logic
  const { brief, isLoading, setIsLoading, handleError, updateBrief } = useStepLogic(briefId);
  
  // State for search terms
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [newTerm, setNewTerm] = useState('');
  
  // State for search results
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  
  // Generate initial search terms based on query
  useEffect(() => {
    if (brief?.query && searchTerms.length === 0) {
      // Generate some example search terms from query
      // In a real implementation, this could come from an AI suggestion
      const generatedTerms: SearchTerm[] = [
        { id: '1', term: brief.query, isActive: true },
        { id: '2', term: `${brief.query} review`, isActive: false },
        { id: '3', term: `${brief.query} recent`, isActive: false }
      ];
      
      setSearchTerms(generatedTerms);
    }
  }, [brief?.query, searchTerms.length]);
  
  // Handle adding a new search term
  const handleAddTerm = () => {
    if (!newTerm.trim()) return;
    
    const newSearchTerm: SearchTerm = {
      id: Date.now().toString(),
      term: newTerm.trim(),
      isActive: true
    };
    
    setSearchTerms(prev => [...prev, newSearchTerm]);
    setNewTerm('');
  };
  
  // Handle toggling a search term
  const handleToggleTerm = (id: string) => {
    setSearchTerms(prev => 
      prev.map(term => 
        term.id === id ? { ...term, isActive: !term.isActive } : term
      )
    );
  };
  
  // Handle removing a search term
  const handleRemoveTerm = (id: string) => {
    setSearchTerms(prev => prev.filter(term => term.id !== id));
  };
  
  // Handle paper selection
  const handleTogglePaper = (paperId: string) => {
    setPapers(prev => 
      prev.map(paper => 
        paper.id === paperId ? { ...paper, isSelected: !paper.isSelected } : paper
      )
    );
    
    setSelectedPapers(prev => {
      if (prev.includes(paperId)) {
        return prev.filter(id => id !== paperId);
      } else {
        return [...prev, paperId];
      }
    });
  };
  
  // Handle searching for papers
  const handleSearch = async () => {
    const activeTerms = searchTerms.filter(term => term.isActive);
    
    if (activeTerms.length === 0) {
      toast.error("Please add at least one active search term");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real implementation, this would call an actual API
      // For now, we'll simulate a search with mock data
      
      // Clear previous results if doing a new search
      setPapers([]);
      setSelectedPapers([]);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock papers based on search terms
      const mockPapers: Paper[] = [];
      
      activeTerms.forEach((term, idx) => {
        // Generate 3 mock papers per term
        for (let i = 1; i <= 3; i++) {
          const paperId = `paper-${term.id}-${i}`;
          
          mockPapers.push({
            id: paperId,
            title: `Research on ${term.term} - Study ${i}`,
            authors: ['Author One', 'Author Two'],
            abstract: `This paper explores ${term.term} and provides insights into the latest developments in this field. The study examines various aspects and proposes new methodologies.`,
            year: `202${i}`,
            journal: `Journal of ${term.term} Research`,
            pdfUrl: 'https://example.com/paper.pdf',
            isSelected: false
          });
        }
      });
      
      setPapers(mockPapers);
      
      toast.success(`Found ${mockPapers.length} papers`);
    } catch (error) {
      console.error('Error searching papers:', error);
      toast.error("Failed to search for papers");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle continuing to the next step
  const handleContinue = async () => {
    const selectedPaperObjects = papers.filter(paper => paper.isSelected);
    
    if (selectedPaperObjects.length === 0) {
      toast.error("Please select at least one paper");
      return;
    }
    
    // Transform papers to the format expected by the brief schema
    const paperReferences = selectedPaperObjects.map(paper => ({
      paperId: paper.id,
      text: `${paper.authors.join(', ')} (${paper.year}). ${paper.title}`,
      pdfUrl: paper.pdfUrl || ''
    }));
    
    // Save the selected papers to the brief using updateBrief
    const success = await updateBrief({
      references: paperReferences
    });
    
    if (success) {
      toast.success(`Saved ${selectedPaperObjects.length} papers`);
      onComplete();
    }
  };
  
  if (!brief) {
    return <div className="animate-pulse h-32"></div>;
  }
  
  return (
    <div className="paper-search-step">
      <h2 className="text-2xl font-bold mb-4">Search for Papers</h2>
      <p className="text-muted-foreground mb-6">
        Search for relevant papers to include in your brief. You can use multiple search terms
        and select the papers that best match your research question.
      </p>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {searchTerms.map(term => (
                <div 
                  key={term.id}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    term.isActive 
                      ? 'bg-primary/10 text-primary border border-primary/30' 
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  <Checkbox 
                    id={`term-${term.id}`}
                    checked={term.isActive}
                    onCheckedChange={() => handleToggleTerm(term.id)}
                  />
                  <Label htmlFor={`term-${term.id}`} className="cursor-pointer">
                    {term.term}
                  </Label>
                  <button
                    type="button"
                    onClick={() => handleRemoveTerm(term.id)}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Add a new search term..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddTerm}
                disabled={!newTerm.trim()}
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={handleSearch}
            disabled={isLoading || searchTerms.filter(t => t.isActive).length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search size={16} className="mr-2" />
                Search
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">
            Search Results {papers.length > 0 && `(${papers.length} papers)`}
          </h3>
          <div className="text-sm text-muted-foreground">
            {selectedPapers.length} papers selected
          </div>
        </div>
        
        {papers.length === 0 && !isLoading && (
          <div className="p-8 text-center text-muted-foreground border rounded-lg">
            No papers found. Try searching with different terms.
          </div>
        )}
        
        {isLoading && (
          <div className="p-8 text-center border rounded-lg">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Searching for papers...</p>
          </div>
        )}
        
        <div className="space-y-4">
          {papers.map(paper => (
            <Card key={paper.id} className={paper.isSelected ? 'border-primary' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start">
                  <Checkbox 
                    id={`paper-${paper.id}`}
                    checked={paper.isSelected}
                    onCheckedChange={() => handleTogglePaper(paper.id)}
                    className="mt-1 mr-2"
                  />
                  <div>
                    <CardTitle className="text-base">
                      <Label htmlFor={`paper-${paper.id}`} className="cursor-pointer">
                        {paper.title}
                      </Label>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      {paper.authors.join(', ')} • {paper.year} • {paper.journal}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm">{paper.abstract}</p>
              </CardContent>
              {paper.pdfUrl && (
                <CardFooter>
                  <a 
                    href={paper.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View PDF
                  </a>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={selectedPapers.length === 0}
        >
          Continue with {selectedPapers.length} papers
        </Button>
      </div>
    </div>
  );
}

// Define the step
export const PaperSearchStep: BriefEditStep = {
  id: 'paper-search',
  title: 'Paper Search',
  description: 'Search for relevant papers',
  component: PaperSearchStepComponent,
  // Only show if we have a query
  shouldRender: (brief) => !!brief.query && brief.query.trim().length > 0,
  // Determine completion based on brief data
  isComplete: (brief: Brief) => brief.references && brief.references.length > 0
};

// Do NOT register the step here - it will be registered by the registry
export default PaperSearchStep; 
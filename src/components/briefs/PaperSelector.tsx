import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Paper } from '@/lib/db/schema/paper';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faChevronDown, faListCheck } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

interface PaperSelectorProps {
  papers: Paper[];
  onSelectionConfirmed: (selectedPapers: Paper[]) => void;
  onBack?: () => void;
  maxSelections?: number;
}

interface PaperWithSelection extends Paper {
  selected: boolean;
}

const PaperSelector: React.FC<PaperSelectorProps> = ({
  papers,
  onSelectionConfirmed,
  onBack,
  maxSelections = 10
}) => {
  const [paperList, setPaperList] = useState<PaperWithSelection[]>(
    papers.map(paper => ({ ...paper, selected: false }))
  );
  
  const selectedCount = paperList.filter(p => p.selected).length;
  
  // Toggle paper selection
  const handlePaperSelection = (paperId: string) => {
    setPaperList(paperList.map(paper => {
      if (paper.id === paperId) {
        // If paper is not selected and we're at the limit, prevent selection
        if (!paper.selected && selectedCount >= maxSelections) {
          toast.error(`You can select up to ${maxSelections} papers`);
          return paper;
        }
        return { ...paper, selected: !paper.selected };
      }
      return paper;
    }));
  };
  
  // Confirm selection
  const handleConfirmSelection = () => {
    const selectedPapers = paperList.filter(p => p.selected);
    
    if (selectedPapers.length === 0) {
      toast.error('Please select at least one paper');
      return;
    }
    
    onSelectionConfirmed(selectedPapers);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Select Papers</CardTitle>
        <CardDescription>
          Choose the most relevant papers for your research brief (up to {maxSelections})
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Available Papers</h3>
          <div className="text-sm text-gray-500">
            {selectedCount}/{maxSelections} selected
          </div>
        </div>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {paperList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No papers found. Try modifying your search query.
            </div>
          ) : (
            paperList.map((paper) => (
              <Card 
                key={paper.id} 
                className={`cursor-pointer transition-all ${
                  paper.selected ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div 
                    className="mt-1 text-xl" 
                    onClick={() => handlePaperSelection(paper.id)}
                  >
                    {paper.selected ? (
                      <FontAwesomeIcon icon={faCheckCircle} className="text-primary" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  <div className="flex-1" onClick={() => handlePaperSelection(paper.id)}>
                    <h4 className="font-medium">{paper.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {paper.authors.join(', ')} ({paper.year})
                    </p>
                    <Collapsible className="mt-2">
                      <CollapsibleTrigger className="flex items-center text-sm text-gray-500">
                        Show abstract <FontAwesomeIcon icon={faChevronDown} className="ml-1 h-3 w-3" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="mt-2 text-sm text-gray-600">{paper.abstract}</p>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
          >
            Back
          </Button>
        )}
        <Button 
          onClick={handleConfirmSelection}
          disabled={selectedCount === 0}
          className={onBack ? '' : 'ml-auto'}
        >
          <FontAwesomeIcon icon={faListCheck} className="mr-2" />
          Confirm Selection ({selectedCount})
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PaperSelector; 
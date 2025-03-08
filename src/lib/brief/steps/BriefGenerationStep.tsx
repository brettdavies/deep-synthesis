import { useState, useEffect } from 'react';
import type { Brief } from '@/lib/db/schema/brief';
import type { BriefEditStep, StepProps } from './types';
import { registerStep } from './registry';
import { BriefOperations } from '@/lib/db/operations/briefs';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useStepLogic } from './useStepLogic';

function BriefGenerationStepComponent({ briefId, onComplete, onBack }: StepProps) {
  // Use the shared step logic
  const { brief, isLoading, setIsLoading, handleError, updateBrief } = useStepLogic(briefId);
  
  const [isCompleted, setIsCompleted] = useState(false);
  const [briefContent, setBriefContent] = useState('');
  const [bibtexContent, setBibtexContent] = useState('');
  
  // Load content from brief if exists
  useEffect(() => {
    if (brief) {
      if (brief.review) {
        setBriefContent(brief.review);
        setIsCompleted(true);
      }
      
      if (brief.bibtex) {
        setBibtexContent(brief.bibtex);
      }
    }
  }, [brief]);
  
  // Handle generating the brief
  const handleGenerateBrief = async () => {
    if (!brief?.references || brief.references.length === 0) {
      toast.error("Please select papers in the previous step");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate AI generation delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate mock content
      const mockBriefContent = `# Literature Review: ${brief.query}
      
## Introduction
This literature review examines the current state of research regarding "${brief.query}". The review is based on ${brief.references.length} key papers in the field.

## Main Findings
${brief.references.map((ref, i) => `${i+1}. ${ref.text}`).join('\n')}

## Conclusion
Based on the reviewed literature, there are several promising directions for future research.`;
      
      // Generate mock bibtex
      const mockBibtex = brief.references.map((ref, i) => (
        `@article{ref${i+1},
  title={${ref.text.split('. ')[1] || 'Article Title'}},
  author={${ref.text.split(' (')[0] || 'Author Name'}},
  year={${ref.text.match(/\((\d{4})\)/) ? ref.text.match(/\((\d{4})\)/)[1] : 'YYYY'}},
  journal={Journal of Important Research}
}`
      )).join('\n\n');
      
      // Update state
      setBriefContent(mockBriefContent);
      setBibtexContent(mockBibtex);
      setIsCompleted(true);
      
      // Update brief in database
      const success = await updateBrief({
        review: mockBriefContent,
        bibtex: mockBibtex
      });
      
      if (success) {
        toast.success("Brief generated successfully");
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle saving edits to the brief content
  const handleSaveContent = async () => {
    const success = await updateBrief({ 
      review: briefContent
    });
    
    if (success) {
      toast.success("Brief content saved");
    }
  };
  
  // Handle saving bibtex edits
  const handleSaveBibtex = async () => {
    const success = await updateBrief({ 
      bibtex: bibtexContent
    });
    
    if (success) {
      toast.success("BibTeX saved");
    }
  };
  
  // Handle continuing to view the completed brief
  const handleViewBrief = () => {
    // Here we would redirect to the brief view page
    // For now, just complete the step
    onComplete();
  };
  
  if (!brief) {
    return <div className="animate-pulse h-32"></div>;
  }
  
  return (
    <div className="brief-generation-step">
      <h2 className="text-2xl font-bold mb-4">Generate Brief</h2>
      <p className="text-muted-foreground mb-6">
        Generate a comprehensive literature review based on the selected papers.
        You can edit the content before finalizing.
      </p>
      
      {!isCompleted && !isLoading && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">Ready to Generate</h3>
              <p className="text-muted-foreground mb-6">
                Based on your research question and the {brief.references?.length || 0} selected papers,
                we'll generate a comprehensive literature review.
              </p>
              
              <Button onClick={handleGenerateBrief}>
                Generate Brief
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {isLoading && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Loader2 size={32} className="animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Generating Brief</h3>
              <p className="text-muted-foreground">
                This may take a moment. We're analyzing the papers and
                creating a comprehensive literature review.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {isCompleted && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Brief Content</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSaveContent}
                  disabled={isLoading}
                >
                  Save Changes
                </Button>
              </div>
              
              <Textarea
                value={briefContent}
                onChange={(e) => setBriefContent(e.target.value)}
                className="font-mono text-sm h-60 resize-none mb-2"
                disabled={isLoading}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">BibTeX References</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSaveBibtex}
                  disabled={isLoading}
                >
                  Save Changes
                </Button>
              </div>
              
              <Textarea
                value={bibtexContent}
                onChange={(e) => setBibtexContent(e.target.value)}
                className="font-mono text-sm h-40 resize-none mb-2"
                disabled={isLoading}
              />
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={onBack}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button onClick={handleViewBrief}>
              View Complete Brief
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Define completion criteria based on brief data
function isStepComplete(brief: Brief): boolean {
  // Step is complete if the review exists and has content
  return !!brief.review && brief.review.trim().length > 0;
}

// Define the step
export const BriefGenerationStep: BriefEditStep = {
  id: 'brief-generation',
  title: 'Brief Generation',
  description: 'Generate the research brief',
  component: BriefGenerationStepComponent,
  // Only show if we have papers
  shouldRender: (brief) => brief.references && brief.references.length > 0,
  isComplete: isStepComplete
};

// Do NOT register the step here - it will be registered by the registry
export default BriefGenerationStep; 
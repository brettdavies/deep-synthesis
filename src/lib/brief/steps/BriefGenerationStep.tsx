import { useState, useEffect } from 'react';
import type { Brief } from '@/lib/db/schema/brief';
import type { BriefEditStep, StepProps } from './types';
import { registerStep } from './registry';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useStepLogic } from './useStepLogic';
import { useLLM } from '@/lib/llm/use-llm';
import { useNavigate } from 'react-router-dom';
import { generateBrief, updateBriefWithGeneratedContent } from '@/lib/brief/generateBrief';

function BriefGenerationStepComponent({ briefId, onComplete, onBack }: StepProps) {
  // Use the shared step logic
  const { brief, isLoading, setIsLoading, handleError, updateBrief } = useStepLogic(briefId);
  // Get the LLM functionality
  const { completeWithAI } = useLLM();
  // Get router for navigation
  const navigate = useNavigate();
  
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Load content from brief if exists
  useEffect(() => {
    if (brief) {
      if (brief.review) {
        setIsCompleted(true);
      }
    }
  }, [brief]);
  
  // Handle generating the brief
  const handleGenerateBrief = async () => {
    if (!brief) {
      toast.error("Brief data not available");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use the shared utility function to generate the brief
      const result = await generateBrief(brief, completeWithAI);
      
      if (result.success && result.content && result.bibtex) {
        // Use the shared utility function to update the brief with generated content
        const success = await updateBriefWithGeneratedContent(briefId, result.content, result.bibtex, 'generate');
        
        if (success) {
          // Navigate to the brief view page
          navigate(`/brief/${briefId}`);
        }
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle viewing the completed brief
  const handleViewBrief = () => {
    navigate(`/brief/${briefId}`);
  };
  
  if (!brief) {
    return <div className="animate-pulse h-32"></div>;
  }
  
  return (
    <div className="brief-generation-step">
      <h2 className="text-2xl font-bold mb-4">Generate Brief</h2>
      <p className="text-muted-foreground mb-6">
        Generate a comprehensive literature review based on the selected papers.
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
      
      {isCompleted && !isLoading && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">Brief Generated</h3>
              <p className="text-muted-foreground mb-6">
                Your literature review has been generated successfully.
              </p>
              
              <Button onClick={handleViewBrief}>
                View Brief
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
      </div>
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
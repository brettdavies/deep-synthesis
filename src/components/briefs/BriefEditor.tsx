import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useMemo, useEffect } from 'react';
import { getAllSteps, getApplicableSteps } from '@/lib/brief/steps';
import { db } from '@/lib/db';
import toast from 'react-hot-toast';
import { StepNavigation } from './StepNavigation';

interface BriefEditorProps {
  briefId: string;
}

export function BriefEditor({ briefId }: BriefEditorProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Live query the brief
  const brief = useLiveQuery(
    () => briefId ? db.briefs.get(briefId) : null,
    [briefId]
  );
  
  // Get applicable steps based on the brief state
  const steps = useMemo(() => {
    return brief ? getApplicableSteps(brief) : [];
  }, [brief]);
  
  // Calculate completed steps and determine current step based on brief data
  const { completedSteps, nextIncompleteIndex } = useMemo(() => {
    if (!brief || steps.length === 0) {
      return { completedSteps: [], nextIncompleteIndex: 0 };
    }
    
    // Determine which steps are completed based on brief data
    const completed = steps
      .filter(step => step.isComplete(brief))
      .map(step => step.id);
    
    // Find the first incomplete step
    const nextIndex = steps.findIndex(step => !step.isComplete(brief));
    
    // If all steps are complete, stay on the last step
    const nextIncompleteIdx = nextIndex === -1 ? steps.length - 1 : nextIndex;
    
    return { 
      completedSteps: completed, 
      nextIncompleteIndex: nextIncompleteIdx 
    };
  }, [brief, steps]);
  
  // Initialize to the appropriate step when brief loads
  useEffect(() => {
    // Only change the current step if it's significantly different
    // This prevents resetting the user's place when they're just moving between adjacent steps
    if (Math.abs(currentStepIndex - nextIncompleteIndex) > 1) {
      setCurrentStepIndex(nextIncompleteIndex);
    }
  }, [nextIncompleteIndex, currentStepIndex]);
  
  const CurrentStepComponent = steps[currentStepIndex]?.component;
  
  // Handle navigation
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };
  
  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  const handleStepClick = (index: number) => {
    // Only allow clicking on completed steps or the next available step
    if (brief && steps[index]) {
      const targetStepId = steps[index].id;
      const isCompleted = steps[index].isComplete(brief);
      
      // Allow navigation to any completed step or the next available incomplete step
      const isNextAvailable = index === 0 || 
        steps[index - 1].isComplete(brief);
      
      if (isCompleted || isNextAvailable) {
        setCurrentStepIndex(index);
      } else {
        toast.error("Please complete the previous steps first");
      }
    }
  };
  
  if (!brief) {
    return <div className="flex items-center justify-center min-h-[300px]">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>;
  }
  
  return (
    <div className="brief-editor">
      <StepNavigation 
        steps={steps} 
        currentStepIndex={currentStepIndex}
        completedStepIds={completedSteps}
        onStepClick={handleStepClick}
      />
      
      <div className="step-content p-6 border rounded-lg mt-4">
        {CurrentStepComponent ? (
          <CurrentStepComponent
            briefId={briefId}
            onComplete={handleNext}
            onBack={handleBack}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No steps available for this brief.
          </div>
        )}
      </div>
    </div>
  );
} 
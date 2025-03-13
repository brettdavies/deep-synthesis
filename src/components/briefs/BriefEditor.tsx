import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useMemo, useEffect, useRef } from 'react';
import { getAllSteps } from '@/lib/brief/steps';
import { db } from '@/lib/db';
import { BriefOperations } from '@/lib/db/operations/briefs';
import { isStepAvailable, validateStepNavigation } from '@/lib/utils/navigation';
import type { BriefEditStep } from '@/lib/brief/steps/types';
import toast from 'react-hot-toast';
import { StepNavigation } from './StepNavigation';
import { useNavigate } from 'react-router-dom';

interface BriefEditorProps {
  briefId: string;
}

// Helper function to check if all previous steps are completed
function arePreviousStepsComplete(steps: BriefEditStep[], currentIndex: number, completedStepIds: string[]): boolean {
  // If we're at the first step, it's always available
  if (currentIndex === 0) return true;
  
  // Check all previous steps
  for (let i = 0; i < currentIndex; i++) {
    if (!completedStepIds.includes(steps[i].id)) {
      return false;
    }
  }
  
  return true;
}

export function BriefEditor({ briefId }: BriefEditorProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const navigate = useNavigate();
  
  // Flag to track whether initial navigation has been done
  const initialNavigationDone = useRef(false);
  
  // Live query the brief
  const brief = useLiveQuery(
    () => briefId ? db.briefs.get(briefId) : null,
    [briefId]
  );
  
  // Single attempt to load brief and redirect if not found
  useEffect(() => {
    if (!briefId) return;
    
    const loadBrief = async () => {
      try {
        // Wait a short time for the live query to potentially succeed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // If brief still not loaded, try one manual load
        if (!brief) {
          console.log('[BriefEditor] Brief not found in live query, attempting manual load');
          const manuallyLoadedBrief = await BriefOperations.getById(briefId);
          
          if (!manuallyLoadedBrief) {
            console.warn('[BriefEditor] Brief not found:', briefId);
            toast.error('Brief not found');
            navigate('/briefs');
          }
        }
      } catch (error) {
        console.error('[BriefEditor] Error loading brief:', error);
        toast.error('Error loading brief');
        navigate('/briefs');
      }
    };
    
    loadBrief();
  }, [briefId, brief, navigate]);
  
  // Get all registered steps - this should only change if steps are dynamically registered
  const steps = useMemo(() => getAllSteps(), []);
  
  // Calculate completed steps and find first incomplete step
  const { completedSteps, firstIncompleteIndex } = useMemo(() => {
    if (!brief || steps.length === 0) {
      return { completedSteps: [], firstIncompleteIndex: 0 };
    }
    
    // Get completed steps
    const completed = steps
      .filter(step => step.isComplete(brief))
      .map(step => step.id);
    
    // Find the first incomplete step
    const firstIncomplete = steps.findIndex(step => !step.isComplete(brief));
    
    return { 
      completedSteps: completed,
      firstIncompleteIndex: firstIncomplete === -1 ? steps.length - 1 : firstIncomplete
    };
  }, [brief, steps]);
  
  // Initialize to the first incomplete step when brief loads
  useEffect(() => {
    if (!brief || initialNavigationDone.current) return;
    
    console.log('[BriefEditor] Initial navigation:', {
      firstIncompleteIndex,
      currentStepIndex,
      completedSteps,
      totalSteps: steps.length
    });
    
    // Navigate to the first incomplete step on initial load
    setCurrentStepIndex(firstIncompleteIndex);
    
    // Mark initial navigation as done
    initialNavigationDone.current = true;
  }, [brief, firstIncompleteIndex, steps.length]);
  
  // Show simple loading state while brief loads
  if (!brief) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  const currentStep = steps[currentStepIndex];
  const CurrentStepComponent = currentStep?.component;
  const isCurrentStepAvailable = isStepAvailable(steps, currentStepIndex, completedSteps, brief);
  
  // Handle navigation
  const handleNext = () => {
    // Always go to the next sequential step
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      console.log('[BriefEditor] Moving to next sequential step:', { 
        from: currentStepIndex, 
        to: nextIndex,
        totalSteps: steps.length
      });
      setCurrentStepIndex(nextIndex);
    }
  };
  
  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      console.log('[BriefEditor] Moving to previous step:', { 
        from: currentStepIndex, 
        to: prevIndex,
        totalSteps: steps.length
      });
      setCurrentStepIndex(prevIndex);
    }
  };
  
  const handleStepClick = (index: number) => {
    // Validate inputs
    if (!steps[index]) return;
    
    // Validate navigation
    const { isValid, errorMessage } = validateStepNavigation(
      steps,
      currentStepIndex,
      index,
      completedSteps,
      brief
    );
    
    // Log navigation attempt
    console.log('[BriefEditor] Navigation attempt:', {
      from: currentStepIndex,
      to: index,
      stepId: steps[index].id,
      isValid,
      errorMessage,
      totalSteps: steps.length
    });
    
    if (isValid) {
      setCurrentStepIndex(index);
    } else if (errorMessage) {
      toast.error(errorMessage);
    }
  };
  
  return (
    <div className="brief-editor">
      <StepNavigation 
        steps={steps} 
        currentStepIndex={currentStepIndex}
        completedStepIds={completedSteps}
        onStepClick={handleStepClick}
      />
      
      <div className="step-content p-6 border rounded-lg mt-4">
        {CurrentStepComponent && isCurrentStepAvailable ? (
          <CurrentStepComponent
            briefId={briefId}
            onComplete={handleNext}
            onBack={handleBack}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {!CurrentStepComponent 
              ? "No steps available for this brief."
              : "This step is not yet available. Please complete the previous steps first."}
          </div>
        )}
      </div>
    </div>
  );
} 
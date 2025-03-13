import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useMemo, useEffect, useRef } from 'react';
import { getAllSteps, getApplicableSteps } from '@/lib/brief/steps';
import { db } from '@/lib/db';
import { BriefOperations } from '@/lib/db/operations/briefs';
import toast from 'react-hot-toast';
import { StepNavigation } from './StepNavigation';

interface BriefEditorProps {
  briefId: string;
}

export function BriefEditor({ briefId }: BriefEditorProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  
  // Flag to track whether initial navigation has been done
  const initialNavigationDone = useRef(false);
  
  // Log the briefId when the component mounts or briefId changes
  useEffect(() => {
    console.log('[BriefEditor] Received briefId:', briefId);
    // Reset the initialNavigationDone flag when the briefId changes
    initialNavigationDone.current = false;
  }, [briefId]);
  
  // Live query the brief
  const brief = useLiveQuery(
    () => briefId ? db.briefs.get(briefId) : null,
    [briefId]
  );
  
  // Implement polling mechanism for brief loading
  useEffect(() => {
    // If brief is found, no need to poll
    if (brief) return;
    
    // Only start polling if we have a briefId and the brief is not yet loaded
    // and we haven't tried too many times
    if (briefId && !brief && !isPolling && loadAttempts < 5) {
      const pollForBrief = async () => {
        setIsPolling(true);
        
        try {
          // Start with a small delay and increase exponentially
          const delay = 200 * Math.pow(2, loadAttempts);
          console.log(`[BriefEditor] Brief not found, polling attempt ${loadAttempts + 1}. Waiting ${delay}ms...`);
          
          // Wait before trying again
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Try to get the brief directly (not through the live query)
          const manuallyLoadedBrief = await BriefOperations.getById(briefId);
          
          if (manuallyLoadedBrief) {
            console.log('[BriefEditor] Success! Brief found during polling:', manuallyLoadedBrief.id);
            // The useLiveQuery will pick up the brief in the next cycle
          } else {
            console.warn(`[BriefEditor] Brief still not found on attempt ${loadAttempts + 1}`);
            setLoadAttempts(prev => prev + 1);
          }
        } catch (error) {
          console.error('[BriefEditor] Error polling for brief:', error);
        } finally {
          setIsPolling(false);
        }
      };
      
      pollForBrief();
    }
  }, [brief, briefId, isPolling, loadAttempts]);
  
  // Log the result of the query
  useEffect(() => {
    console.log('[BriefEditor] Brief loaded:', brief ? brief.id : 'null');
    if (!brief && briefId && loadAttempts >= 5) {
      toast.error(`Brief not found after multiple attempts. Try refreshing the page.`);
      console.warn('[BriefEditor] Brief not found with ID after maximum retry attempts:', briefId);
    }
  }, [brief, briefId, loadAttempts]);
  
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
    // Only run this logic on initial load or if brief changes
    if (!brief || initialNavigationDone.current) return;

    // If we have completed steps but current step is before them, advance to next incomplete
    const shouldAdvance = 
      completedSteps.length > 0 && 
      (currentStepIndex < nextIncompleteIndex || Math.abs(currentStepIndex - nextIncompleteIndex) > 1);
    
    if (shouldAdvance) {
      console.log('[BriefEditor] Advancing to next incomplete step (initial load):', { 
        from: currentStepIndex, 
        to: nextIncompleteIndex,
        completedSteps
      });
      setCurrentStepIndex(nextIncompleteIndex);
    }
    
    // Mark initial navigation as done
    initialNavigationDone.current = true;
  }, [nextIncompleteIndex, currentStepIndex, brief, completedSteps]);
  
  // Show loading state while we're polling for the brief
  if (!brief) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p className="text-lg font-medium">
          {loadAttempts > 0 ? `Loading brief... (Attempt ${loadAttempts}/5)` : 'Loading brief...'}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {loadAttempts >= 3 ? "This is taking longer than expected. Please wait..." : ""}
        </p>
      </div>
    );
  }
  
  const CurrentStepComponent = steps[currentStepIndex]?.component;
  
  // Handle navigation
  const handleNext = () => {
    // Always go to the next sequential step, not the next incomplete step
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      console.log('[BriefEditor] Moving to next sequential step:', { 
        from: currentStepIndex, 
        to: nextIndex
      });
      setCurrentStepIndex(nextIndex);
    }
  };
  
  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      console.log('[BriefEditor] Moving to previous step:', { 
        from: currentStepIndex, 
        to: prevIndex
      });
      setCurrentStepIndex(prevIndex);
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
        console.log('[BriefEditor] User clicked to navigate to step:', { 
          from: currentStepIndex, 
          to: index,
          isCompleted,
          isNextAvailable
        });
        setCurrentStepIndex(index);
      } else {
        toast.error("Please complete the previous steps first");
      }
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
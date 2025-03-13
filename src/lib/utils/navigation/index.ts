import type { Brief } from '@/lib/db/schema/brief';

/**
 * Generic interface for a step in a multi-step flow
 */
export interface NavigationStep {
  id: string;                  // Unique identifier
  shouldRender?: (context: any) => boolean; // Optional condition to determine if step should be included
  isComplete: (context: any) => boolean;    // Function to determine if step is complete based on context
}

/**
 * Checks if all steps before the given index are completed
 * @param steps Array of navigation steps
 * @param currentIndex Index of the current step
 * @param completedStepIds Array of completed step IDs
 * @returns boolean indicating if all previous steps are completed
 */
export function arePreviousStepsComplete<T extends NavigationStep>(
  steps: T[], 
  currentIndex: number, 
  completedStepIds: string[]
): boolean {
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

/**
 * Determines if a step is available for navigation
 * @param steps Array of navigation steps
 * @param stepIndex Index of the step to check
 * @param completedStepIds Array of completed step IDs
 * @param context The current context object
 * @returns boolean indicating if the step is available
 */
export function isStepAvailable<T extends NavigationStep>(
  steps: T[],
  stepIndex: number,
  completedStepIds: string[],
  context: any | null
): boolean {
  const step = steps[stepIndex];
  if (!step) return false;
  
  return arePreviousStepsComplete(steps, stepIndex, completedStepIds) && 
    (!step.shouldRender || !context || step.shouldRender(context));
}

/**
 * Validates a step navigation attempt
 * @param steps Array of navigation steps
 * @param fromIndex Current step index
 * @param toIndex Target step index
 * @param completedStepIds Array of completed step IDs
 * @param context The current context object
 * @returns Object containing validation result and error message if any
 */
export function validateStepNavigation<T extends NavigationStep>(
  steps: T[],
  fromIndex: number,
  toIndex: number,
  completedStepIds: string[],
  context: any | null
): { isValid: boolean; errorMessage?: string } {
  const targetStep = steps[toIndex];
  if (!targetStep) {
    return { isValid: false, errorMessage: "Invalid step" };
  }
  
  const isAvailable = isStepAvailable(steps, toIndex, completedStepIds, context);
  const isCompleted = context ? targetStep.isComplete(context) : false;
  const isGoingBack = toIndex < fromIndex;
  
  // Find the first incomplete step index
  const firstIncompleteIndex = steps.findIndex(
    (step) => !completedStepIds.includes(step.id)
  );
  
  // Allow navigation if:
  // 1. Going to a completed step (for review)
  // 2. Going to the first incomplete step
  // 3. Going back to any previous step
  if (isCompleted || toIndex === firstIncompleteIndex || isGoingBack) {
    return { isValid: true };
  }
  
  // More descriptive error message
  return {
    isValid: false,
    errorMessage: !isAvailable
      ? "This step is not yet available. Please complete the previous steps first."
      : "Please complete the current step before moving to later steps."
  };
} 
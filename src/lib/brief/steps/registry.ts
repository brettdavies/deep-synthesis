import type { Brief } from '@/lib/db/schema/brief';
import type { BriefEditStep } from './types';

// This will be populated with our steps
const briefSteps: BriefEditStep[] = [];

// Function to get applicable steps for a given brief
export function getApplicableSteps(brief: Brief): BriefEditStep[] {
  return briefSteps.filter(step => 
    !step.shouldRender || step.shouldRender(brief)
  );
}

// Function to register steps - will be used by the step implementations
export function registerStep(step: BriefEditStep, position?: number) {
  // If position is provided, insert at that position, otherwise append
  if (position !== undefined && position >= 0 && position <= briefSteps.length) {
    briefSteps.splice(position, 0, step);
  } else {
    briefSteps.push(step);
  }
}

// Function to re-order steps if needed
export function reorderSteps(stepIds: string[]) {
  // Create a new array with the steps in the specified order
  const reorderedSteps = stepIds
    .map(id => briefSteps.find(step => step.id === id))
    .filter((step): step is BriefEditStep => step !== undefined);
  
  // Replace all steps with the reordered steps
  briefSteps.length = 0;
  briefSteps.push(...reorderedSteps);
}

// Function to get a step by ID
export function getStepById(id: string): BriefEditStep | undefined {
  return briefSteps.find(step => step.id === id);
}

// Function to get all registered steps
export function getAllSteps(): BriefEditStep[] {
  return [...briefSteps];
}

// Export the steps array for direct access
export { briefSteps }; 
import type { Brief } from '@/lib/db/schema/brief';
import type { NavigationStep } from '@/lib/utils/navigation';

export interface BriefEditStep extends NavigationStep {
  title: string;               // Display name
  description: string;         // Brief description
  component: React.FC<StepProps>; // The component to render
  isOptional?: boolean;        // Whether this step can be skipped
  shouldRender?: (brief: Brief) => boolean; // Optional condition to determine if step should be included
  isComplete: (brief: Brief) => boolean;    // Function to determine if step is complete based on brief data
}

export interface StepProps {
  briefId: string;             // The ID of the brief being edited
  onComplete: () => void;      // Called when step is completed
  onBack?: () => void;         // Called when user wants to go back
} 
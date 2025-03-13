import { memo } from 'react';
import type { BriefEditStep } from '@/lib/brief/steps/types';
import { arePreviousStepsComplete } from '@/lib/utils/navigation';
import { Check, CircleDashed, LightbulbIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Helper function to show the completion requirement toast
function showCompletionToast(prevStep: BriefEditStep) {
  toast((t) => (
    <div className="flex items-center gap-2">
      <span>Please complete "{prevStep.title}" first to access this step.</span>
    </div>
  ), {
    icon: '💡',
    duration: 4000,
  });
}

interface StepNavigationProps {
  steps: BriefEditStep[];
  currentStepIndex: number;
  completedStepIds: string[];
  onStepClick: (index: number) => void;
}

// Memoize the individual step to prevent re-renders when other steps change
const NavigationStep = memo(function NavigationStep({
  step,
  index,
  isCompleted,
  isCurrent,
  isAvailable,
  isLast,
  onStepClick,
  steps
}: {
  step: BriefEditStep;
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isAvailable: boolean;
  isLast: boolean;
  onStepClick: (index: number) => void;
  steps: BriefEditStep[];
}) {
  const stepClasses = `
    group flex items-center relative flex-1 
    ${index === 0 ? 'justify-start' : isLast ? 'justify-end' : 'justify-center'}
  `;
  
  const labelClasses = `
    text-sm font-medium py-1 px-3 rounded-full transition-colors
    ${isCurrent ? 'bg-primary text-primary-foreground' : 
      isCompleted ? 'text-primary hover:bg-primary/10' : 
      isAvailable ? 'text-primary hover:bg-muted' : 
      'text-primary opacity-50'}
  `;

  // Add line connecting steps
  const lineClass = !isLast 
    ? `absolute top-3 left-1/2 w-full h-0.5 ${
        isCompleted ? 'bg-primary' : 'bg-border'
      }`
    : '';

  const handleClick = () => {
    if (isAvailable) {
      onStepClick(index);
    } else {
      const prevStep = steps[index - 1];
      if (prevStep) {
        showCompletionToast(prevStep);
      }
    }
  };

  return (
    <div className={stepClasses}>
      <div 
        className={labelClasses}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        title={step.description}
      >
        {isCompleted ? (
          <span className="flex items-center">
            <Check size={16} className="mr-1" />
            {step.title}
          </span>
        ) : (
          <span className="flex items-center">
            <CircleDashed size={16} className="mr-1" />
            {step.title}
          </span>
        )}
      </div>
      {lineClass && <div className={lineClass} />}
    </div>
  );
});

// Memoize the entire navigation component
export const StepNavigation = memo(function StepNavigation({
  steps,
  currentStepIndex,
  completedStepIds,
  onStepClick
}: StepNavigationProps) {
  return (
    <div className="step-navigation flex items-center justify-between">
      {steps.map((step, index) => (
        <NavigationStep
          key={step.id}
          step={step}
          index={index}
          isCompleted={completedStepIds.includes(step.id)}
          isCurrent={index === currentStepIndex}
          isAvailable={arePreviousStepsComplete(steps, index, completedStepIds)}
          isLast={index === steps.length - 1}
          onStepClick={onStepClick}
          steps={steps}
        />
      ))}
    </div>
  );
}); 
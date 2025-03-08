import type { BriefEditStep } from '@/lib/brief/steps';
import { Check, CircleDashed } from 'lucide-react';

interface StepNavigationProps {
  steps: BriefEditStep[];
  currentStepIndex: number;
  completedStepIds: string[];
  onStepClick: (index: number) => void;
}

export function StepNavigation({
  steps,
  currentStepIndex,
  completedStepIds,
  onStepClick
}: StepNavigationProps) {
  return (
    <div className="step-navigation">
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedStepIds.includes(step.id);
          const isCurrent = index === currentStepIndex;
          const isAvailable = index === 0 || completedStepIds.includes(steps[index - 1].id);
          
          const stepClasses = `
            group flex items-center relative flex-1 
            ${index === 0 ? 'justify-start' : index === steps.length - 1 ? 'justify-end' : 'justify-center'}
          `;
          
          const labelClasses = `
            text-sm font-medium py-1 px-3 rounded-full cursor-pointer transition-colors
            ${isCurrent ? 'bg-primary text-primary-foreground' : 
              isCompleted ? 'text-primary hover:bg-primary/10' : 
              isAvailable ? 'text-foreground hover:bg-muted' : 
              'text-muted-foreground cursor-not-allowed'}
          `;

          // Add line connecting steps
          const lineClass = index < steps.length - 1 
            ? `absolute top-3 left-1/2 w-full h-0.5 ${
                isCompleted ? 'bg-primary' : 'bg-border'
              }`
            : '';
          
          return (
            <div key={step.id} className={stepClasses}>
              <div 
                className={labelClasses}
                onClick={() => isAvailable && onStepClick(index)}
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
              {index < steps.length - 1 && <div className={lineClass} />}
            </div>
          );
        })}
      </div>
      
      {/* Mobile view */}
      <div className="sm:hidden mb-4">
        <div className="text-sm text-muted-foreground mb-2">
          Step {currentStepIndex + 1} of {steps.length}:
        </div>
        <div className="font-medium text-lg">
          {steps[currentStepIndex]?.title || 'Loading...'}
        </div>
        <div className="flex mt-2">
          {steps.map((step, index) => {
            const isCompleted = completedStepIds.includes(step.id);
            const isCurrent = index === currentStepIndex;
            const isAvailable = index === 0 || completedStepIds.includes(steps[index - 1].id);
            
            const dotClasses = `
              h-2 w-2 rounded-full mx-1 transition-colors
              ${isCurrent 
                ? 'bg-primary' 
                : isCompleted 
                  ? 'bg-primary/50' 
                  : 'bg-border'
              }
            `;
            
            return (
              <div 
                key={step.id} 
                className={`flex-1 flex justify-center ${
                  isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                onClick={() => isAvailable && onStepClick(index)}
              >
                <div className={dotClasses} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 
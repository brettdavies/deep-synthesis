// Re-export everything for convenient imports
export * from './types';
export * from './registry';

// Import steps
import { QueryStep } from './QueryStep';
import { RefinementStep } from './RefinementStep';
import { PaperSearchStep } from './PaperSearchStep';
import { BriefGenerationStep } from './BriefGenerationStep';
import { registerStep } from './registry';

// Register steps in the correct order
registerStep(QueryStep, 0);
registerStep(RefinementStep, 1);
registerStep(PaperSearchStep, 2);
registerStep(BriefGenerationStep, 3);

// Re-export steps
export { QueryStep, RefinementStep, PaperSearchStep, BriefGenerationStep }; 
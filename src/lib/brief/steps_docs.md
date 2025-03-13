# Modular Brief Editing System

## Overview

The modular brief editing system implements a flexible, registry-based approach to create, edit, and manage briefs. This system is designed with a focus on:

1. **Modularity**: Each step is a self-contained module that can be added or removed easily
2. **Data-driven state management**: Step completion is determined by the presence of data in the brief
3. **Automatic step sequencing**: Steps are properly ordered with dependencies
4. **Progressive UX**: Users can navigate backwards and forwards, but can't skip ahead to incomplete steps

## Architecture

### Core Components

- **Step Registry** (`/src/lib/brief/steps/registry.ts`): Central registry of all steps with ordering capabilities
- **Step Definitions** (`/src/lib/brief/steps/types.ts`): TypeScript interfaces for steps and props
- **BriefEditor** (`/src/components/briefs/BriefEditor.tsx`): Main controller for step navigation and rendering
- **StepNavigation** (`/src/components/briefs/StepNavigation.tsx`): UI for step visualization and navigation
- **Individual Steps** (`/src/lib/brief/steps/*.tsx`): Self-registering step implementations

### Key Design Patterns

1. **Self-registration pattern**: Each step registers itself in the step registry upon import
2. **Data-driven step completion**: Each step defines its completion criteria based on brief data
3. **Conditional step rendering**: Steps can define conditions for when they should appear
4. **LiveQuery reactivity**: Step components use Dexie LiveQuery for reactive data binding

## Step Flow

The system currently implements the following steps:

1. **Query Step**: Define the initial research question
2. **Refinement Step**: Refine the question through AI chat
3. **Paper Search Step**: Search for relevant papers
4. **Brief Generation Step**: Generate the literature review

## Adding a New Step

To add a new step, create a new file in `/src/lib/brief/steps/` following this template:

```tsx
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Brief } from '../../db/schema/brief';
import { BriefEditStep, StepProps } from './types';
import { registerStep } from './registry';

function NewStepComponent({ briefId, onComplete, onBack }: StepProps) {
  const brief = useLiveQuery(() => db.briefs.get(briefId), [briefId]);
  
  // Your component implementation
  
  return (
    <div>
      {/* Your UI */}
      <button onClick={onComplete}>Continue</button>
    </div>
  );
}

// Define and register the step
export const NewStep: BriefEditStep = {
  id: 'new-step',
  title: 'New Step',
  description: 'Description of this step',
  component: NewStepComponent,
  shouldRender: (brief) => true, // Optional condition
  isComplete: (brief: Brief) => !!brief.someProperty
};

// Register the step at position 3 (or another position)
registerStep(NewStep, 3);

export default NewStep;
```

Then add the export to `/src/lib/brief/steps/index.ts`:

```ts
export * from './NewStep';
```

## Database Integration

The step system is designed to work with the existing brief schema without changes. Each step accesses and modifies the brief using `BriefOperations` and LiveQuery as needed.

## Future Enhancements

Possible enhancements include:

1. Step persistence: Allow saving which step the user last visited
2. Optional steps: Allow skipping certain steps
3. Branching steps: Allow different paths based on user choices
4. Step reordering: UI for reordering steps
5. Saving step-specific data: Expanded schema for step-specific information 
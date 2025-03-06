# UI Architecture & State Management Todos

<!-- ### Visual Consistency Check

- Ensuring all components follow the same design language
- Checking that spacing, typography, and colors are consistent -->

This document outlines comprehensive recommendations for enhancing the CSS architecture and UI state management in the Deep Synthesis application. These items should be implemented after the MVP phase to improve code maintainability, user experience, and visual consistency.

## CSS Architecture Recommendations

### 1. Semantic Class Names & Component Structure

**Current Implementation:**
The application currently uses a mix of Tailwind utility classes with some semantic naming through the `cn` utility function.

**Recommended Improvements:**

- Create more semantic class names that describe component roles rather than just appearance
- Establish consistent naming patterns across components

**Example:**

```tsx
// BEFORE - Mixing utility classes directly
<div className="flex items-center p-4 rounded-md bg-gray-100">
  <span className="text-lg font-medium text-gray-800">Status:</span>
  <span className="ml-2 text-green-600">Active</span>
</div>

// AFTER - Using semantic class names
<div className="status-indicator">
  <span className="status-label">Status:</span>
  <span className="status-value status-value-active">Active</span>
</div>

// In globals.css
.status-indicator {
  @apply flex items-center p-4 rounded-md bg-gray-100;
}

.status-label {
  @apply text-lg font-medium text-gray-800;
}

.status-value {
  @apply ml-2;
}

.status-value-active {
  @apply text-green-600;
}
```

### 2. Data Attributes for State Management

**Current Implementation:**
Limited use of data attributes and ARIA states for component states.

**Recommended Improvements:**

- Expand use of data attributes and ARIA attributes for managing UI states
- Style components based on these attributes rather than conditional class names

**Example:**

```tsx
// BEFORE - Using conditional classes
<button 
  className={`btn ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
  onClick={handleClick}
>
  {isActive ? 'Active' : 'Inactive'}
</button>

// AFTER - Using data attributes
<button 
  className="btn"
  data-state={isActive ? 'active' : 'inactive'}
  aria-pressed={isActive}
  onClick={handleClick}
>
  {isActive ? 'Active' : 'Inactive'}
</button>

// In globals.css
.btn {
  @apply px-4 py-2 rounded transition-colors;
}

.btn[data-state="active"] {
  @apply bg-blue-600 text-white;
}

.btn[data-state="inactive"] {
  @apply bg-gray-200 text-gray-800;
}
```

### 3. CSS Variable System Enhancement

**Current Implementation:**
Basic CSS variables defined in `globals.css` with some semantic naming.

**Recommended Improvements:**

- Expand the CSS variable system with more semantic naming
- Create variables for component-specific tokens
- Ensure dark mode variants are consistently implemented

**Example:**

```css
/* globals.css - Enhanced variable structure */
:root {
  /* Base colors */
  --color-primary: hsl(222, 47%, 11%);
  --color-primary-light: hsl(222, 47%, 20%);
  --color-primary-dark: hsl(222, 47%, 5%);
  
  /* Semantic tokens */
  --background-page: var(--color-white);
  --background-card: var(--color-gray-50);
  --text-primary: var(--color-gray-900);
  --text-secondary: var(--color-gray-600);
  
  /* Component-specific tokens */
  --button-primary-bg: var(--color-primary);
  --button-primary-text: var(--color-white);
  --input-border: var(--color-gray-300);
  --input-focus-ring: var(--color-primary-light);
  
  /* Layout tokens */
  --spacing-page-x: 1.5rem;
  --spacing-page-y: 2rem;
  --card-border-radius: 0.5rem;
}

.dark {
  --background-page: var(--color-gray-900);
  --background-card: var(--color-gray-800);
  --text-primary: var(--color-gray-100);
  --text-secondary: var(--color-gray-400);
  
  --button-primary-bg: var(--color-primary-light);
  --input-border: var(--color-gray-700);
}
```

### 4. CSS Layering Strategy

**Current Implementation:**
Limited use of Tailwind's layer system.

**Recommended Improvements:**

- Explicitly organize styles into base, components, and utilities layers
- Use `@layer` directives to maintain specificity control

**Example:**

```css
/* globals.css - Layered approach */
@layer base {
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer components {
  .card {
    @apply rounded-md border border-border bg-card p-4 shadow-sm;
  }
  
  .input-group {
    @apply flex flex-col space-y-2;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

## State Management Recommendations

### 1. Loading State Components

**Current Implementation:**
Basic loading components exist (`Loading` and `Loader`), but implementation is inconsistent across the app.

**Recommended Improvements:**

- Standardize loading state implementations
- Create a comprehensive loading state system
- Implement skeleton loading states for content-heavy components

**Example:**

```tsx
// LoadingButton component for consistent button loading states
function LoadingButton({ 
  children, 
  isLoading, 
  loadingText = "Loading...", 
  ...props 
}) {
  return (
    <Button 
      {...props} 
      disabled={isLoading || props.disabled}
      aria-busy={isLoading}
      data-state={isLoading ? "loading" : "idle"}
    >
      {isLoading ? (
        <>
          <span className="spinner mr-2" aria-hidden="true" />
          {loadingText}
        </>
      ) : children}
    </Button>
  );
}

// Usage
<LoadingButton 
  isLoading={isSubmitting} 
  loadingText="Saving..."
  onClick={handleSave}
>
  Save Changes
</LoadingButton>
```

### 2. Toast Notification System

**Current Implementation:**
Basic toast notifications using `react-hot-toast` with limited customization.

**Recommended Improvements:**

- Enhance toast notification system with consistent styling and behavior
- Create toast utility functions for common actions (success, error, info)
- Ensure accessibility of toast notifications

**Example:**

```tsx
// Toast utility in utils/toast.js
import { toast } from 'react-hot-toast';

export const showSuccessToast = (message) => {
  toast.success(message, {
    duration: 3000,
    position: 'bottom-right',
    className: 'toast toast-success',
    ariaProps: {
      role: 'status',
      'aria-live': 'polite',
    }
  });
};

export const showErrorToast = (message) => {
  toast.error(message, {
    duration: 5000,
    position: 'bottom-right',
    className: 'toast toast-error',
    ariaProps: {
      role: 'alert',
      'aria-live': 'assertive',
    }
  });
};

// Usage
import { showSuccessToast, showErrorToast } from '@/utils/toast';

const handleSave = async () => {
  try {
    await saveData();
    showSuccessToast('Settings saved successfully');
  } catch (error) {
    showErrorToast(`Error saving settings: ${error.message}`);
  }
};
```

### 3. Error Handling & Error Boundaries

**Current Implementation:**
Basic error handling with state variables and alerts.

**Recommended Improvements:**

- Implement React Error Boundaries for isolating errors
- Create reusable error state components
- Standardize error message formatting

**Example:**

```tsx
// ErrorBoundary component
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ? (
        this.props.fallback(this.state.error)
      ) : (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p className="error-message">{this.state.error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="error-reload-button"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary
  fallback={(error) => (
    <PaperErrorState 
      message="Failed to load papers" 
      error={error} 
      onRetry={fetchPapers} 
    />
  )}
>
  <PapersDataTable papers={papers} />
</ErrorBoundary>
```

### 4. Empty State Components

**Current Implementation:**
Limited handling of empty states in components.

**Recommended Improvements:**

- Create standardized empty state components
- Provide actionable context in empty states
- Ensure consistent styling across empty states

**Example:**

```tsx
// EmptyState component
function EmptyState({ 
  title, 
  description, 
  icon: Icon, 
  action 
}) {
  return (
    <div className="empty-state">
      {Icon && <Icon className="empty-state-icon" aria-hidden="true" />}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && (
        <div className="empty-state-action">
          {action}
        </div>
      )}
    </div>
  );
}

// Usage
<EmptyState
  title="No papers found"
  description="Try adjusting your search terms or adding more keywords."
  icon={DocumentSearchIcon}
  action={
    <Button onClick={handleReset}>Reset Filters</Button>
  }
/>
```

### 5. State Transitions & Animation

**Current Implementation:**
Limited use of transitions and animations.

**Recommended Improvements:**

- Add smooth transitions between UI states
- Implement subtle animations for loading, success, and error states
- Use Framer Motion for complex animations and page transitions

**Example:**

```tsx
// Using Framer Motion for page transitions
import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.61, 1, 0.88, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

function PageContainer({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      className="page-container"
    >
      {children}
    </motion.div>
  );
}

// Usage
function BriefPage() {
  return (
    <PageContainer>
      <h1>Brief Details</h1>
      {/* Page content */}
    </PageContainer>
  );
}
```

## Implementation Plan

To implement these recommendations, follow this phased approach:

### Phase 1: Documentation & Audit

1. **Document current patterns**: Create an inventory of existing components and their styling patterns
2. **Identify inconsistencies**: Note areas where state management or styling is inconsistent
3. **Define standards**: Create a style guide document with naming conventions and patterns

### Phase 2: Core Infrastructure

1. **Enhance CSS variables**: Update `globals.css` with expanded variable system
2. **Create utility functions**: Implement toast, error handling, and loading utilities
3. **Build reusable state components**: Develop EmptyState, LoadingButton, and other core components

### Phase 3: Component Refactoring

1. **Prioritize high-impact components**: Start with the most visible or frequently used components
2. **Refactor one component at a time**: Apply semantic class names and data attributes
3. **Add transition animations**: Implement smooth transitions between states

### Phase 4: Testing & Documentation

1. **Test across browsers**: Ensure consistent appearance and behavior
2. **Document component usage**: Create examples for the team to reference
3. **Create component showcase**: Build a simple storybook-like page showing component variants

## Resources

- [CSS Variables Best Practices](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [ARIA States and Properties](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes)
- [React Error Boundaries Documentation](https://reactjs.org/docs/error-boundaries.html)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Tailwind CSS Layer System](https://tailwindcss.com/docs/adding-custom-styles#using-css-and-layer)

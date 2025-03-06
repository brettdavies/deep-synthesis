# Detailed design approach

Detailed design approach that aligns with your goal of supporting high-level research through AI-powered digests. Your app aims to help users quickly explore a topic, refine their focus with AI, pull and rank papers from arXiv enriched with Google Scholar metadata, and generate cited briefs from selected papers. Below, I’ll outline how to structure the interface and user flow, incorporating the features you’ve highlighted—like modular inputs, one-click collection, tagging systems, and a clean, minimalist layout inspired by Paperpile.

## Core Design Principles

To bring your app to life, the design should emphasize:

- Simplicity: A clean, intuitive interface that avoids clutter (think Paperpile’s minimalist vibe).
- Interactivity: Smart buttons and clickable elements to keep users engaged.
- Flexibility: Modular inputs and customizable outputs tailored to research needs.
- Feedback: Progression indicators to maintain transparency during AI processes.
- CSS-First: All styling logic should live in CSS using data attributes and semantic class names.

## CSS Architecture

### 1. Component Styling Approach

- Use semantic class names that describe the component's role (e.g., `nav-link`, `search-input`)
- Leverage data attributes for state management (e.g., `[aria-current="page"]` for active states)
- Avoid inline styles and conditional className logic in components
- Define component styles in the global CSS using proper layering:

  ```css
  @layer components {
    .nav-link {
      @apply base-styles;
    }
    
    .nav-link[aria-current="page"] {
      @apply active-state-styles;
    }
  }
  ```

### 2. Theme Variables

- Define all colors, spacing, and other design tokens as CSS variables in :root
- Use semantic naming for variables (e.g., `--sidebar-background`, `--sidebar-foreground`)
- Maintain dark mode variants using a .dark class selector
- Example structure:

  ```css
  :root {
    --sidebar-background: hsl(222 47% 11%);
    --sidebar-foreground: hsl(210 40% 98%);
    --sidebar-muted: hsl(217 24% 75%);
  }
  
  .dark {
    --sidebar-background: hsl(223 47% 14%);
    // ... dark mode variants
  }
  ```

### 3. State Management

- Use HTML5 attributes for state:
  - aria-current="page" for active navigation
  - aria-expanded="true" for expanded sections
  - aria-disabled="true" for disabled elements
- Style states using attribute selectors:

  ```css
  .button[aria-disabled="true"] { opacity: 0.5; }
  ```

## Interface Layout and User Flow

### 1. Main Interface: Sidebar Navigation

- Sidebar (Left Panel): A persistent navigation bar with:
  - New Brief: Start a fresh research query.
  - Brief Library: Access and manage saved briefs.
  - Settings: Configure LLM keys, storage, and preferences.
  - Help: Quick access to guides or support.
- Main Content Area: Dynamically updates based on the sidebar selection, keeping the layout focused and uncluttered.

### 2. Starting a New Brief

- Modular Inputs:
  - Offer a clean form with 2-3 fields: “Research Topic” (e.g., “Quantum Computing”), “Keywords” (e.g., “hardware, entanglement”), and “Max Papers” (default: 100).
  - Allow optional fields like “Date Range” or “Authors” to be added dynamically for advanced users.
  - Provide real-time suggestions (e.g., trending keywords) as users type.

- One-Click Collection:
  - A bold “Find Top Papers” button triggers the app to fetch 100+ papers from arXiv and enrich them with Google Scholar metadata (e.g., citations, publication dates).
  - Display a non-blocking progress bar or loader (e.g., “Fetching papers… 25%”) so users can navigate elsewhere in the app.

- AI Refinement:
  - After fetching, present an AI chat interface where users can refine their question (e.g., “Focus on quantum hardware breakthroughs since 2020”).
  - The LLM ranks the papers based on abstracts, metadata, and the refined query, then displays the top results.

### 3. Paper Selection and Tagging

- Paper List View:
  - Show ranked papers with key details: title, authors, abstract snippet, citations, and downloads.
  - Use social proof by marking “Top Papers” with badges (e.g., “Highly Cited”) and a “Why It’s Trending” link for AI-generated insights.

- Tagging System:
  - Let users tag papers (e.g., “Key Findings,” “Background”) with clickable filters to refine the list.
  - A single paper can be tagged across multiple briefs for flexibility.

- Refinement:
  - Offer buttons to adjust the maximum papers (e.g., slider from 5-20) or exclude irrelevant ones.
  - Once ready, a “Generate Brief” button finalizes the selection (e.g., top 10 papers) and downloads their PDFs (stored locally via IndexedDB).

### 4. Brief Generation and Interaction

- Progress Feedback:
  - Show a loader (e.g., “Processing PDFs…”) while the LLM analyzes the full papers and writes a 1-2 page cited brief.
  - Keep this non-blocking for multitasking.

- Brief View:
  - Display the brief in a clean layout with collapsible sections (e.g., “Summary,” “Key Insights,” “References”).
  - Include smart buttons:
    - “Extract Figures”: Pull visuals from papers.
    - “Summarize in Plain English”: Simplify technical jargon.
    - “Visualize Trends”: Create keyword clouds or citation graphs.
  - Enable content interaction: Click citations to view paper details or open PDFs.

- Customization:
  - Users can specify brief length (paragraph, half page, full page, two pages) before generation.

### 5. Brief Library and Management

- Library View:
  - List saved briefs with previews (title, tags, date) in a grid or list format.
  - Allow sorting/filtering by tags or date.

- Editing and Regeneration:
  - Click a brief to edit its title, tags, or regenerate it with new parameters (e.g., updated paper selection).
  - Offer a “Download” button with options: Markdown (MD), DOCX, or PDF.

- Local Storage:
  - Store briefs and PDFs in IndexedDB with user-defined limits (e.g., 500MB cap).
  - Set a retention period for PDFs (default: 30 days) before automatic pruning.

### 6. Settings and Security

- LLM Configuration:
  - Input custom LLM keys and select models (e.g., GPT-4, LLaMA).
  - Protect keys with a PIN; encrypt them at rest and decrypt in real-time during use.

- Preferences:
  - Adjust brief length defaults, storage size limits, and PDF retention periods.
  - Clear local storage manually if needed.

## 7. Features You Liked, Integrated

- Modular Inputs: Flexible form fields with dynamic updates.
- One-Click Collection: Streamlined paper fetching with a single button.
- Tagging System: Multi-brief tagging for organization.
- Social Proof: Metrics and trends to highlight paper relevance.
- Progression Feedback: Non-blocking loaders for transparency.
- Clean Layout: Minimalist design with collapsible sections.
- Smart Buttons: One-click content transformations.
- Sidebar Navigation: Consistent, intuitive access to app sections.
- Paperpile’s Interface: Web-based, simple, and researcher-friendly.
- Citavi’s Knowledge Base Twist: Add a “Notes” tab in the brief view to compile quotes or insights, building a mini knowledge base.

## Enhancements for Engagement

- AI Suggestions: Post-brief, offer a “Next Steps” button with related topics or questions.
- Interactive Visuals: Clickable keyword maps or citation stats in the brief.
- Multiple Downloads: Allow re-downloading briefs in any format without restrictions.

## Summary

"Deep Synthesis" will feature a clean, minimalist interface with a sidebar for navigation, guiding users from topic input to brief generation and management. The flow—inputting a topic, refining it with AI, selecting and tagging papers, generating interactive briefs, and managing a library—will feel intuitive and powerful. With modular inputs, one-click collection, smart buttons, and local storage via IndexedDB, it meets your functional needs while staying engaging and user-friendly.

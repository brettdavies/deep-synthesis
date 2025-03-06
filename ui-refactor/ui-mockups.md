# UI Mockups

Let’s dive into the UI mockups for "Deep Synthesis," a researcher-friendly tool designed to streamline the research process with a clean, minimalist interface. Below, I’ll outline the key screens and components, walking you through the user journey from start to finish. The design draws inspiration from tools like Paperpile, Zotero, and Mendeley, ensuring simplicity and functionality.

## Design Notes

- Color Scheme: A calming palette (e.g., whites, light grays, blues) to ease long research sessions.
- Typography: Readable fonts like Inter or Roboto, with clear hierarchy for headings and text.
- Icons: Simple and intuitive (e.g., plus for new, gear for settings).
- Responsiveness: The sidebar collapses into a hamburger menu on smaller screens for adaptability.
- This UI mockup provides a clean, engaging experience tailored for researchers, balancing functionality with ease of use. Let me know if you’d like to tweak any screen or add more details!
- Principle design for large screens. Not mobile native.

## 1. Main Interface with Sidebar Navigation

The entry point for users is a straightforward layout with a sidebar and a main content area.

- Sidebar (Left Panel)
  - New Brief: A prominent button or icon (e.g., a plus sign) to kick off a new research query.
  - Brief Library: An option to view saved briefs, represented by a list or grid icon.
  - Settings: A gear icon for configuring preferences like LLM keys or storage.
  - Help: A question mark icon linking to guides or support.
- Main Content Area: Starts with a welcome message or quick-start guide, updating dynamically as the user interacts with the app.

Mockup:
+-----------------------------------+
| [Logo]    New Brief              |
|           Brief Library          |
|           Settings                |
|           Help                    |
+-----------------------------------+
|                                   |
|         [Welcome Message]         |
|                                   |
|                                   |
+-----------------------------------+

## 2. Starting a New Brief

This screen lets users define their research scope with an intuitive input form.

- Input Form:
  - Research Topic: A large text box (e.g., placeholder: "Enter your research topic, e.g., Quantum Computing").
  - Keywords: A smaller field for optional keywords.
  - Max Papers: A dropdown or slider (e.g., 50, 100, 200 papers).
  - Advanced Options: A collapsible section for filters like date range or authors.
- Find Top Papers Button: A bold, standout button to start the search.

Mockup:
+-----------------------------------+
| [Logo]    New Brief              |
|           Brief Library          |
|           Settings                |
|           Help                    |
+-----------------------------------+
| Research Topic: [________________]|
| Keywords: [______________________]|
| Max Papers: [100] v               |
| [Advanced Options]                |
|                                   |
| [Find Papers]                     |
+-----------------------------------+

## 3. Paper Selection and Tagging

Once papers are retrieved, users can refine their selection here.

- Paper List View:
  - Each paper appears as a card with:
    - Title
    - Authors
    - Abstract snippet
    - Metrics (e.g., citations, downloads)
  - Badges like a star for "Top Papers."
  - A "Why It's Trending" link opening a modal with AI insights.

- Tagging System:
  - A tag icon per paper; clicking it offers a dropdown to add or create tags.
  - A filter bar at the top to sort by tags.

- Refinement Tools:
  - A slider or input to adjust the number of papers (e.g., "Select Top 10").
  - Checkboxes to exclude unwanted papers.

- Generate Brief Button: Appears once the selection is ready.

Mockup:
+-----------------------------------+
| [Logo]    New Brief              |
|           Brief Library          |
|           Settings                |
|           Help                    |
+-----------------------------------+
| Filter by Tag: [All] v            |
|                                   |
| [Paper 1 Title] [Star]            |
| Authors: [Author Names]           |
| Abstract: [Snippet...]            |
| Citations: 150 | Downloads: 200   |
| [Tag Icon] [Why It's Trending]    |
|                                   |
| [Paper 2 Title]                   |
| ...                               |
|                                   |
| [Select Top 10] [Exclude Selected]|
| [Generate Brief]                 |
+-----------------------------------+

## 4. Brief Generation and Interaction

This screen shows the generated brief with interactive features.

- Progress Feedback: A modal or overlay with a progress bar (e.g., "Processing PDFs... 25%") during generation.
- Brief View:
  - Collapsible Sections: Accordion headers for "Summary," "Key Insights," "References," etc.
  - Smart Buttons: Options like "Extract Figures" or "Summarize in Plain English" next to sections.
  - Interactive Elements: Clickable citations linking to paper details or PDFs.
- Customization: A dropdown to choose brief length (e.g., short, medium, detailed) before generation.

Mockup:
+-----------------------------------+
| [Logo]    New Brief              |
|           Brief Library          |
|           Settings                |
|           Help                    |
+-----------------------------------+
| Brief: Quantum Computing Trends  |
|                                   |
| [Summary v]                       |
|   [AI-generated summary text]     |
|   [Extract Figures] [Summarize]   |
|                                   |
| [Key Insights v]                  |
|   [Insight 1]                     |
|   [Insight 2]                     |
|                                   |
| [References v]                    |
|   [Citation 1] [View Paper]       |
|   [Citation 2] [View Paper]       |
|                                   |
| [Download: MD v] [Regenerate]     |
+-----------------------------------+

## 5. Brief Library and Management

A hub for accessing and managing saved briefs.

- Library View:
  - A grid or list of brief cards showing:
    - Title
    - Tags
    - Date
  - Sort and filter options (e.g., by date, by tag) at the top.

- Editing and Regeneration:
  - Clicking a brief opens it with an "Edit" button to tweak tags, title, or regenerate.
  - A "Download" button with format options (e.g., MD, DOCX, PDF).

Mockup:
+-----------------------------------+
| [Logo]    New Brief              |
|           Brief Library          |
|           Settings                |
|           Help                    |
+-----------------------------------+
| Sort by: [Date v] Filter: [All v] |
|                                   |
| [Brief 1: Quantum Computing]     |
| Tags: Key Findings, Background    |
| Date: 2023-10-01                  |
| [Edit] [Download v]               |
|                                   |
| [Brief 2: AI Ethics]             |
| ...                               |
+-----------------------------------+

## 6. Settings and Security

A practical screen for configuration and preferences.

- LLM Configuration:
  - Fields for entering LLM keys, with a "Save" button.
  - A PIN field to secure keys.

- Preferences:
  - Sliders or inputs for storage size limit and PDF retention period.
  - A "Clear Local Storage" button.

Mockup:
+-----------------------------------+
| [Logo]    New Brief              |
|           Brief Library          |
|           Settings                |
|           Help                    |
+-----------------------------------+
| LLM Keys: [______________________]|
| Model: [GPT-4 v]                  |
| PIN: [____]                       |
|                                   |
| Storage Limit: [500MB]            |
| PDF Retention: [30 days]          |
| [Clear Local Storage]             |
|                                   |
| [Save Settings]                   |
+-----------------------------------+

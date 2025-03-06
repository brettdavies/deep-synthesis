# Full Application Workflow

## Mermaid Diagram

```mermaid
graph TD
    A[User opens app] --> B{Choose Action}
    B -->|New Brief| C[New Brief Screen]
    B -->|View Briefs| D[Brief Library Screen]
    B -->|Settings| E[Settings Screen]

    %% New Brief Subprocess
    subgraph New Brief Subprocess
        C --> F[Enter topic, keywords, max papers]
        F --> G[Click 'Find Papers']
        G --> H[Query arXiv API]
        H --> I[Receive list of papers]
        I --> J[For each paper: Query Google Scholar for metadata]
        J --> K[Store enriched papers in IndexedDB]
        K --> L[Display initial paper list]
        L --> M[Refine question with AI chat]
        M -->|Loop until satisfied| N{User satisfied with question?}
        N -->|No| M
        N -->|Yes| O[Send refined question + abstracts to LLM API for ranking]
        O --> P[Receive ranked list from LLM]
        P --> Q[Display ranked papers]
        Q --> R[User selects top papers and tags them]
        R --> S{User satisfied with selection?}
        S -->|No| R
        S -->|Yes| T[Confirm selection]
        T --> U[Download PDFs from arXiv for selected papers]
        U --> V[Check IndexedDB storage limit]
        V -->|Limit not exceeded| W[Store PDFs in IndexedDB]
        V -->|Limit exceeded| X[Show storage warning<br>User can adjust retention policy]
        X --> W
        W --> Y[Send PDFs + refined question to LLM API for brief]
        Y -->|Async| Z[Receive generated brief from LLM]
        Z --> AA[Store brief in IndexedDB]
        AA --> AB[Display brief]
        AB --> AC{User actions}
        AC -->|Edit tags| AD[Update tags in IndexedDB]
        AC -->|Regenerate| Y
        AC -->|Download| AE[Export brief in selected format]
    end

    %% Brief Library Subprocess
    subgraph Brief Library Subprocess
        D --> AF[Retrieve brief list from IndexedDB]
        AF --> AG[Display brief library]
        AG --> AH[User selects a brief]
        AH --> AI[Retrieve brief + associated PDFs from IndexedDB]
        AI --> AJ[Display brief]
        AJ --> AK{User actions}
        AK -->|Edit tags| AL[Update tags in IndexedDB]
        AK -->|Regenerate| AM[Send PDFs + question to LLM API]
        AM --> AN[Receive updated brief]
        AN --> AO[Store updated brief in IndexedDB]
        AO --> AJ
        AK -->|Download| AP[Export brief in selected format]
    end

    %% Settings Subprocess
    subgraph Settings Subprocess
        E --> AQ[Display settings screen]
        AQ --> AR[User configures: LLM keys, storage limits, retention policy]
        AR --> AS[Prompt for PIN to encrypt LLM keys]
        AS --> AT[Encrypt LLM keys with PIN]
        AT --> AU[Save settings to IndexedDB]
    end

    %% External Services
    subgraph External Services
        H -->|API Call| arXiv[arXiv API]
        J -->|API Call/Scrape| GS[Google Scholar]
        O -->|API Call| LLM1[LLM API: Ranking]
        Y -->|API Call| LLM2[LLM API: Brief Generation]
        AM -->|API Call| LLM2
    end

    %% Local Storage
    subgraph Local Storage
        K -->|Write| DB1[IndexedDB: Papers]
        W -->|Write| DB2[IndexedDB: PDFs]
        AA -->|Write| DB3[IndexedDB: Briefs]
        AD -->|Update| DB3
        AF -->|Read| DB3
        AI -->|Read| DB3
        AL -->|Update| DB3
        AO -->|Write| DB3
        AU -->|Write| DB4[IndexedDB: Settings]
    end
```

## Overview

The application provides a research paper management and brief generation system with three main components:

### Core Components

1. **New Brief Creation**
   - AI-assisted research question refinement
   - Automated paper discovery and ranking
   - PDF management and brief generation

2. **Brief Library**
   - Brief storage and management
   - PDF reuse across briefs
   - Tag-based organization

3. **Settings Management**
   - API key configuration
   - Storage management
   - Security settings

### External Integrations

- **arXiv API**: Paper discovery and PDF retrieval
- **Google Scholar**: Metadata enrichment
- **LLM API**: Question refinement and brief generation

### Data Storage

All data is persisted in IndexedDB:

- Papers and metadata
- PDF documents
- Generated briefs
- Application settings

## Detailed Workflows

### 1. New Brief Creation

#### Initial Setup

1. User provides:
   - Research topic
   - Keywords
   - Paper limit (e.g., 100 papers)

#### Paper Discovery

1. **API Queries**
   - Query arXiv API with user parameters
   - Enrich results with Google Scholar metadata
   - Store papers in IndexedDB

2. **Question Refinement**
   - Interactive AI chat interface
   - Iterative refinement process
   - Question optimization

3. **Paper Ranking**
   - Submit to LLM API:
     - Refined research question
     - Paper abstracts
   - Present ranked results to user

#### Content Management

1. **Paper Selection**
   - User reviews ranked papers
   - Applies tags for organization
   - Confirms final selection

2. **PDF Processing**
   - Download PDFs from arXiv
   - Storage limit verification
   - User prompts if storage exceeded

#### Brief Generation

1. **LLM Processing**
   - Submit to API:
     - Selected PDFs
     - Refined question
   - Asynchronous generation

2. **User Interaction**
   - Edit brief tags
   - Regenerate if needed
   - Download options

### 2. Brief Library Management

#### Features

- Complete brief listing
- Search and filter capabilities
- Tag-based organization

#### Actions

- View briefs
- Edit metadata
- Regenerate briefs
- Download in various formats

### 3. Settings Management

#### Security

- LLM API key management
- PIN-based encryption
- Access control

#### Storage

- Quota management
- Retention policies
- Cleanup tools

#### Configuration

- Default parameters
- API preferences
- UI customization

## Technical Features

### Process Control

- **Iterative Loops**
  - Question refinement
  - Paper selection
  - Brief generation

### Resource Management

- **Storage Controls**
  - Quota monitoring
  - Overflow prevention
  - User notifications

### Performance

- **Asynchronous Operations**
  - PDF downloads
  - Brief generation
  - Data enrichment

### Organization

- **Tagging System**
  - Cross-brief paper tagging
  - Hierarchical organization
  - Tag-based search

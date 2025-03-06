# Deep Synthesis - Research Brief Generator

A client-side web application for generating AI-powered literature reviews.

## For Users

### Overview

Research Brief Generator is a privacy-focused tool that helps researchers and academics create literature reviews quickly using AI. The application runs entirely in your browser, with **zero tracking, analytics, or telemetry**, ensuring your research queries and data remain private.

### Key Features

- **AI-Powered Literature Reviews**: Generate comprehensive briefs based on arXiv papers
- **100% Client-Side Processing**: All data processing happens in your browser
- **Offline Capability**: Access stored papers even without an internet connection
- **Secure API Key Storage**: Optional PIN protection for your API keys
- **PDF Management**: Store and organize research papers locally
- **Privacy-First Design**: No tracking, no analytics, no server storage of your research data

### Getting Started

1. **Access the Application**: Visit the application URL in Chrome, Firefox, or Edge
2. **Set Up Your API Key**:
   - Navigate to Settings
   - Enter your OpenAI or OpenRouter API key
   - Optionally set a PIN to encrypt your key
3. **Start Researching**:
   - Enter your research topic
   - Specify the number of papers (1-100)
   - Click "Generate Brief"
4. **View Your Brief**: The application will create a literature review with proper citations

For detailed instructions, see the [User Guide](/documentation/8%20User%20Guide.md).

### Privacy & Security

- **No Server Storage**: All your data stays in your browser using IndexedDB
- **No Tracking**: We don't use cookies, analytics, or tracking of any kind
- **Secure API Storage**: Your API keys can be encrypted with a PIN using the Web Crypto API
- **Content Security**: Strict policies prevent malicious code execution

---

## For Developers

### Technical Overview

Research Brief Generator is built with modern web technologies and runs on Cloudflare Pages with a focus on performance, security, and offline capabilities.

### Tech Stack

- **Runtime**: [Bun](https://bun.sh) (faster alternative to Node.js)
- **Frontend**: React 18 with SPA routing
- **Styling**: Tailwind CSS and Shadcn/ui components
- **Storage**: IndexedDB via Dexie.js
- **Deployment**: Cloudflare Pages

### Getting Started for Development

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd research-brief-app
bun install
```

Start the development server:

```bash
bun dev
```

Build for production:

```bash
bun run build
```

Deploy to Cloudflare:

```bash
bunx wrangler pages deploy dist
```

### Project Structure

```plaintext
research-brief-app/
├── src/
│   ├── components/
│   │   ├── HomePage.jsx
│   │   ├── LibraryPage.jsx
│   │   ├── BriefPage.jsx
│   │   └── SettingsPage.jsx
│   ├── utils/
│   │   ├── api.js
│   │   └── brief.js
│   ├── db.js
│   ├── index.css
│   └── App.jsx
├── public/
│   └── index.html
├── tailwind.config.js
├── bun.lockb
└── package.json
```

### Documentation

Comprehensive documentation is available in the `/documentation` folder:

1. [Project Overview](/documentation/1%20Project%20Overview.md) - Project goals and architecture
2. [Requirements Specification](/documentation/2%20Requirements%20Specification.md) - Functional and non-functional requirements
3. [Technical Design](/documentation/3%20Technical%20Design.md) - Detailed design and implementation
4. [Security Plan](/documentation/4%20Security%20Plan.md) - Security measures and implementation
5. [User Interface Design](/documentation/5%20User%20Interface%20Design.md) - UI components and mockups
6. [Development Environment](/documentation/6%20Development%20Environment.md) - Setup and toolchain
7. [Risk Management Plan](/documentation/8%20Risk%20Management%20Plan.md) - Risk identification and mitigation
8. [User Guide](/documentation/8%20User%20Guide.md) - End-user instructions
9. [Testing Plan](/documentation/9%20Testing%20Plan.md) - Testing strategy and test cases

### Privacy Implementation

The application was designed with privacy as a core principle:

- **Client-Side Only**: No server-side processing or data storage
- **API Key Security**: Keys are encrypted using the Web Crypto API when a PIN is set
- **Content Security Policy**: Strict CSP in index.html prevents XSS attacks
- **Input Sanitization**: All user inputs are sanitized using DOMPurify
- **Local Storage Only**: All data is stored in IndexedDB with no external transmission

For detailed security information, see the [Security Plan](/documentation/4%20Security%20Plan.md).

### Contributing

Please follow these guidelines when contributing:

- Write clear commit messages in the format: `type(scope): message`
- Test thoroughly before submitting pull requests
- Document any new features or changes

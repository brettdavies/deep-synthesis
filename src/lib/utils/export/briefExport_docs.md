# Brief Export Utilities

This module provides functionality for exporting briefs in different formats.

## Supported Export Formats

- **Markdown (.md)**: A lightweight markup language with plain-text formatting syntax.
- **PDF (.pdf)**: Portable Document Format.

## Core Functions

### `exportBrief(brief, format)`

The main export function that handles exporting a brief to the specified format.

- **Parameters**:
  - `brief`: The Brief object to export
  - `format`: The format to export to ('md' or 'pdf')
- **Returns**: Promise<void>
- **Throws**: Error if export fails

### Format-Specific Export Functions

#### `exportBriefToMarkdown(brief)`

Exports a brief to Markdown format.

- **Parameters**:
  - `brief`: The Brief object to export
- **Returns**: void

#### `exportBriefToPdf(brief)`

Exports a brief to PDF format using the jsPDF library.

- **Parameters**:
  - `brief`: The Brief object to export
- **Returns**: Promise<void>

## Helper Functions

### `briefToMarkdown(brief)`

Converts a brief to Markdown format.

- **Parameters**:
  - `brief`: The Brief object to convert
- **Returns**: string - The Markdown content

### `briefToHtml(brief)`

Converts a brief to HTML format (used for PDF conversion).

- **Parameters**:
  - `brief`: The Brief object to convert
- **Returns**: string - The HTML content

### `downloadBlob(blob, fileName)`

Helper function to download a blob as a file.

- **Parameters**:
  - `blob`: The Blob to download
  - `fileName`: The name of the file to download
- **Returns**: void

## Dependencies

- **jsPDF**: Used for PDF generation

## Usage Example

```typescript
import { exportBrief } from '@/lib/utils/export/briefExport';

// Export to Markdown
await exportBrief(brief, 'md');

// Export to PDF
await exportBrief(brief, 'pdf');
```

## Implementation Details

- The PDF export uses jsPDF to create a PDF document with the brief content.
- The Markdown export creates a Markdown file with the brief content.

## Error Handling

All export functions include error handling to catch and report any issues during the export process. Errors are logged to the console and can be handled by the calling code. 
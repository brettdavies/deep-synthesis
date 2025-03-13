# ExportFormatDialog Component

This component provides a dialog for selecting the export format for a brief.

## Overview

The `ExportFormatDialog` component displays a modal dialog with options for exporting a brief in different formats. It allows users to choose between Markdown, Word (DOCX), and PDF formats.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | boolean | Whether the dialog is open |
| `onOpenChange` | (open: boolean) => void | Callback for when the dialog open state changes |
| `onSelectFormat` | (format: ExportFormat) => void | Callback for when a format is selected |

## Usage

```tsx
import { ExportFormatDialog } from '@/components/brief/ExportFormatDialog';
import { ExportFormat } from '@/lib/utils/export/briefExport';

const MyComponent = () => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  const handleExportFormat = (format: ExportFormat) => {
    console.log(`Selected format: ${format}`);
    // Handle the export
    setShowExportDialog(false);
  };
  
  return (
    <>
      <Button onClick={() => setShowExportDialog(true)}>
        Export
      </Button>
      
      <ExportFormatDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onSelectFormat={handleExportFormat}
      />
    </>
  );
};
```

## UI Elements

The dialog contains:

1. A header with a title and description
2. A grid of buttons for each export format:
   - Markdown (.md)
   - Word (.docx)
   - PDF (.pdf)
3. A cancel button in the footer

Each format button includes:
- An icon representing the format
- The format name
- The file extension

## Styling

The component uses Tailwind CSS for styling:
- The grid layout adjusts from 1 column on mobile to 3 columns on larger screens
- Each format button has a distinct icon color (blue for Markdown, indigo for Word, red for PDF)
- Buttons have hover effects for better user interaction

## Dependencies

- **@/components/ui/dialog**: For the dialog component
- **@/components/ui/button**: For the buttons
- **lucide-react**: For the icons
- **@/lib/utils/export/briefExport**: For the ExportFormat type 
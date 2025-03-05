import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy } from 'lucide-react';
import type { Paper } from '@/lib/db/schema/paper';
import type { ReactNode } from 'react';

type ContentType = 'abstract' | 'citation';

type ContentModalProps = {
  paper: Paper | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: (text: string) => void;
  contentType: ContentType;
};

/**
 * Shared modal component for displaying paper content (abstracts or citations)
 */
export function ContentModal({ paper, open, onOpenChange, onCopy, contentType }: ContentModalProps) {
  if (!paper) return null;

  // Generate content based on contentType
  const getContent = (): { title: string; content: string | ReactNode } => {
    if (contentType === 'citation') {
      // Generate citation in BibTeX format
      const bibtex = `@article{${paper.arxivId?.replace('/', '_') || 'citation'},
  title={${paper.title || ''}},
  author={${paper.authors?.join(' and ') || ''}},
  journal={arXiv preprint arXiv:${paper.arxivId || ''}},
  year={${paper.year || new Date().getFullYear()}}
}`;
      return { 
        title: 'Citation',
        content: <pre className="pr-10 whitespace-pre-wrap overflow-x-auto">{bibtex}</pre>
      };
    } else {
      // Abstract
      return { 
        title: 'Abstract',
        content: <p className="whitespace-pre-line pr-10">{paper.abstract ? paper.abstract.replace(/\n/g, ' ') : ''}</p>
      };
    }
  };

  const { title, content } = getContent();
  const contentText = typeof content === 'string' ? content : 
    contentType === 'citation' 
      ? `@article{${paper.arxivId?.replace('/', '_') || 'citation'},
  title={${paper.title || ''}},
  author={${paper.authors?.join(' and ') || ''}},
  journal={arXiv preprint arXiv:${paper.arxivId || ''}},
  year={${paper.year || new Date().getFullYear()}}
}`
      : paper.abstract || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {paper.title}
          </DialogDescription>
        </DialogHeader>
        <div className={`relative mt-2 bg-muted/30 p-3 rounded-md text-sm border border-gray-300 shadow-sm w-full ${contentType === 'citation' ? 'font-mono' : ''}`}>
          <Button
            size="icon"
            variant="outline"
            className="absolute top-3 right-3 h-7 w-7"
            onClick={() => onCopy(contentText)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <div className="max-h-[60vh] overflow-y-auto">
            {content}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
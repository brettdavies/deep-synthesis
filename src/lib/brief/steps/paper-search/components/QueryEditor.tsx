import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Pencil } from 'lucide-react';

interface QueryEditorProps {
  query: string;
  isEditing: boolean;
  editedQuery: string;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveQuery: () => void;
  onEditedQueryChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const QueryEditor: React.FC<QueryEditorProps> = ({
  query,
  isEditing,
  editedQuery,
  onStartEditing,
  onCancelEditing,
  onSaveQuery,
  onEditedQueryChange,
  onKeyDown
}) => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Input
                value={editedQuery}
                onChange={(e) => onEditedQueryChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Enter your research query..."
                className="flex-grow"
                autoFocus
              />
              <Button
                size="icon"
                className="h-10 w-10"
                onClick={onSaveQuery}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10"
                onClick={onCancelEditing}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium flex-grow">{query}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={onStartEditing}
                className="h-8 w-8 p-0 -mt-1"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 
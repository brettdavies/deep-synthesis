import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type BriefsHeaderProps = {
  briefsCount: number;
  onDeleteAllBriefs: () => void;
};

/**
 * Header component for the Briefs page with actions
 */
export function BriefsHeader({ briefsCount, onDeleteAllBriefs }: BriefsHeaderProps) {
  const navigate = useNavigate();

  const handleCreateBrief = () => {
    navigate('/brief/new');
  };

  return (
    <Card className="mb-3">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold">Generated Briefs ({briefsCount})</h3>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center space-x-1"
            onClick={handleCreateBrief}
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Brief</span>
          </Button>
          
          {briefsCount > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              className="flex items-center space-x-1"
              onClick={onDeleteAllBriefs}
            >
              <Trash className="h-4 w-4" />
              <span>Delete All</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
} 
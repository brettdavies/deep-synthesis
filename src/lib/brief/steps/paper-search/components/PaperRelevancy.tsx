import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { RelevancyData, RelevancyReason } from '@/lib/db/schema/paper-brief';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { InfoIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

interface PaperRelevancyProps {
  relevancyScore?: number;
  relevancyData?: RelevancyData;
  showDetails?: boolean;
  className?: string;
}

/**
 * Component for displaying paper relevancy information
 */
export const PaperRelevancy = ({
  relevancyScore,
  relevancyData,
  showDetails: initialShowDetails = false,
  className
}: PaperRelevancyProps) => {
  const [showDetails, setShowDetails] = useState(initialShowDetails);

  if (relevancyScore === undefined) {
    return null;
  }

  // Get color based on relevancy score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-green-300';
    if (score >= 40) return 'bg-yellow-400';
    if (score >= 20) return 'bg-orange-400';
    return 'bg-red-500';
  };

  // Get text color based on relevancy score
  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-green-700';
    if (score >= 60) return 'text-green-600';
    if (score >= 40) return 'text-yellow-700';
    if (score >= 20) return 'text-orange-700';
    return 'text-red-700';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Relevancy Score Display */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500">Relevancy:</span>
        <div className="flex-1 max-w-64">
          <Progress 
            value={relevancyScore} 
            max={100}
            className={cn('h-2', getScoreColor(relevancyScore))}
          />
        </div>
        <span className={cn('text-sm font-semibold', getScoreTextColor(relevancyScore))}>
          {Math.round(relevancyScore)}
        </span>
        
        {relevancyData && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
            <span className="sr-only">{showDetails ? 'Hide' : 'Show'} details</span>
          </Button>
        )}
      </div>

      {/* Details Section (conditionally rendered) */}
      {showDetails && relevancyData && (
        <div className="pl-4 border-l-2 border-slate-200 space-y-3 text-sm animate-in fade-in duration-200">
          {/* Matched Keywords */}
          {relevancyData.keywordsMatched.length > 0 && (
            <div>
              <span className="font-medium text-slate-700">Keywords matched:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {relevancyData.keywordsMatched.map((keyword, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{keyword}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Factors affecting score */}
          {relevancyData.reasons.length > 0 && (
            <div>
              <span className="font-medium text-slate-700">Scoring factors:</span>
              <ul className="mt-1 space-y-1">
                {relevancyData.reasons.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={cn(
                      "inline-block font-mono mt-0.5 text-xs",
                      item.impactOnScore > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {item.impactOnScore > 0 ? '+' : ''}{item.impactOnScore}
                    </span>
                    <span className="text-slate-600">{item.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Confidence level */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Confidence:</span>
            <Progress 
              value={relevancyData.confidenceLevel} 
              max={100}
              className="h-1.5 w-16 bg-blue-200"
            />
            <span className="text-xs text-slate-600">{Math.round(relevancyData.confidenceLevel)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}; 
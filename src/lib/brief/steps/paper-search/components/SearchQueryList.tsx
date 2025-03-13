import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, Plus, X, Check, AlertCircle, ExternalLinkIcon } from 'lucide-react';
import type { SearchQueryWithStatus, DateConstraint } from '../types';
import { formatDateConstraintForDisplay, getApiPreviewUrl } from '../utils';

interface SearchQueryListProps {
  searchTerms: SearchQueryWithStatus[];
  isGeneratingQueries: boolean;
  aiDateConstraint: DateConstraint | null;
  isLoading: boolean; 
  onToggleTerm: (id: string) => void;
  onRemoveTerm: (id: string) => void;
  onGenerateQueries: () => void;
  onSearch: () => void;
}

export const SearchQueryList: React.FC<SearchQueryListProps> = ({
  searchTerms,
  isGeneratingQueries,
  aiDateConstraint,
  isLoading,
  onToggleTerm,
  onRemoveTerm,
  onGenerateQueries,
  onSearch
}) => {
  return (
    <div className="search-queries-section mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Search Terms</h3>
        <Button 
          onClick={onGenerateQueries} 
          variant="outline" 
          disabled={isGeneratingQueries}
        >
          {isGeneratingQueries ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Generate Search Terms
            </>
          )}
        </Button>
      </div>
      
      <div className="search-queries-list space-y-2 mb-4">
        {searchTerms.map(query => (
          <div 
            key={query.id} 
            className={`flex items-center space-x-2 p-3 border rounded ${
              query.status === 'processing' ? 'bg-blue-50 border-blue-200' :
              query.status === 'completed' ? 'bg-green-50 border-green-200' :
              query.status === 'failed' ? 'bg-red-50 border-red-200' :
              'bg-white'
            }`}
          >
            <Checkbox 
              checked={query.isActive} 
              onCheckedChange={() => onToggleTerm(query.id)} 
              id={`query-${query.id}`}
              disabled={query.status === 'processing'}
            />
            <div className="flex-grow">
              <label 
                htmlFor={`query-${query.id}`}
                className="block font-mono text-sm cursor-pointer"
              >
                {query.term}{aiDateConstraint && aiDateConstraint.type !== 'none' && formatDateConstraintForDisplay(aiDateConstraint)}
              </label>
              {query.status === 'failed' && (
                <p className="text-sm text-red-600 mt-1">
                  Error: {query.error}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {query.status === 'processing' && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {query.status === 'completed' && (
                <Check className="h-4 w-4 text-green-500" />
              )}
              {query.status === 'failed' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              
              <a 
                href={getApiPreviewUrl(query.term, aiDateConstraint || undefined)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
                title="Preview API results"
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </a>
              
              <button 
                onClick={() => onRemoveTerm(query.id)}
                className="text-gray-400 hover:text-red-500"
                title="Remove query"
                disabled={query.status === 'processing'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        
        {searchTerms.length === 0 && !isGeneratingQueries && (
          <p className="text-gray-500 italic text-center py-8">
            Click "Generate Search Terms" to get started
          </p>
        )}
      </div>
      
      <Button 
        onClick={onSearch} 
        disabled={isGeneratingQueries || isLoading || searchTerms.filter(q => q.isActive).length === 0}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Search Papers
          </>
        )}
      </Button>
    </div>
  );
}; 
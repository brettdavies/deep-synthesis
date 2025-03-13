import { useState } from 'react';
import { useLLM } from '@/lib/llm/use-llm';
import { getUserSelectedModel, getModelOutputCapabilities } from '@/lib/llm/model-utils';
import type { Paper } from '@/lib/db/schema/paper';
import type { Brief } from '@/lib/db/schema/brief';
import type { RelevancyData } from '@/lib/db/schema/paper-brief';
import db from '@/lib/db';
import { generateUUID } from '@/lib/utils/id/uuid';
import toast from 'react-hot-toast';

type RelevancyScoreRequest = {
  paperTitle: string;
  paperAbstract: string;
  paperAuthors: string[];
  briefQuery: string;
  userInterests?: string[];
};

/**
 * Hook for calculating and managing relevancy scores for papers
 */
export const useRelevancyScoring = (briefId: string, brief: Brief | null) => {
  const { completeWithAI, registry } = useLLM();
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Calculate relevancy scores for multiple papers in a single API call
   */
  const calculateRelevancyScores = async (papers: Paper[]): Promise<Map<string, RelevancyData>> => {
    if (!brief) {
      throw new Error('Brief is required to calculate relevancy scores');
    }

    setIsCalculating(true);
    setError(null);
    
    try {
      // Get the user's selected model using the utility function
      const { selectedModel, settings } = getUserSelectedModel(registry, 'openai');
      
      console.log('Using user-selected model:', settings.selectedModel);
      
      // Check model capabilities using the utility function
      const { supportsStructuredOutput, supportsJsonMode } = getModelOutputCapabilities(selectedModel);
      
      console.log('Selected model capabilities:', {
        name: selectedModel.name,
        structuredOutput: supportsStructuredOutput,
        jsonMode: supportsJsonMode
      });
      
      // Build the prompt for multiple papers
      const prompt = `You are a research assistant helping to calculate relevancy scores for academic papers.

<instructions>
Please analyze each paper provided and calculate relevancy scores based on how well they match the research query.
For each paper, identified by its arXiv ID, provide:
1. An overall relevancy score (0-100) where higher values indicate greater relevance
2. Specific reasons that contribute to the score (both positive and negative factors)
3. Matching keywords between the paper and research query
4. A confidence level for your assessment (0-100)

${supportsStructuredOutput || supportsJsonMode ? 
  `Your response MUST be a valid JSON object where:
   - The keys are arXiv IDs
   - Each value is an object containing:
     - "overallScore": number between 0-100
     - "reasons": array of objects with "reason" (string) and "impactOnScore" (number) properties
     - "keywordsMatched": array of strings
     - "confidenceLevel": number between 0-100` : 
  `Format your response as a JSON object with the specified structure.
Your response will be parsed as JSON, so ensure it's properly formatted.`}
</instructions>

<research_query>
${brief.query}
</research_query>

<papers>
${papers.map(paper => `
[Paper: ${paper.arxivId}
Title: ${paper.title}
Authors: ${paper.authors.join(', ')}
Publication Date: ${paper.submittedDate}
Abstract: ${paper.abstract}]
`).join('\n\n')}
</papers>`;

      // Create options object with responseFormat if supported
      const options: any = {
        temperature: 0.3,
        maxTokens: 6000 // Increased for multiple papers
      };
      
      // Add response format for structured output if supported
      if (supportsStructuredOutput) {
        try {
          options.responseFormat = {
            type: "json_schema",
            json_schema: {
              name: 'paper_relevancy_scores',
              strict: true,
              schema: {
                type: "object",
                properties: {
                  papers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        arxivId: {
                          type: "string",
                          description: "The arXiv ID of the paper"
                        },
                        overallScore: {
                          type: "number",
                          description: "Overall relevancy score between 0-100"
                        },
                        reasons: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              reason: {
                                type: "string",
                                description: "Explanation of a factor affecting relevancy"
                              },
                              impactOnScore: {
                                type: "number",
                                description: "Numeric impact on the overall score"
                              }
                            },
                            required: ["reason", "impactOnScore"],
                            additionalProperties: false
                          },
                          description: "Reasons contributing to the relevancy score"
                        },
                        keywordsMatched: {
                          type: "array",
                          items: {
                            type: "string"
                          },
                          description: "Keywords matched between paper and query"
                        },
                        confidenceLevel: {
                          type: "number",
                          description: "Confidence level in the assessment (0-100)"
                        }
                      },
                      required: ["arxivId", "overallScore", "reasons", "keywordsMatched", "confidenceLevel"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["papers"],
                additionalProperties: false
              }
            }
          };
        } catch (e) {
          console.warn('Failed to add structured output format:', e);
        }
      } else if (supportsJsonMode) {
        try {
          options.responseFormat = {
            type: 'json_object'
          };
        } catch (e) {
          console.warn('Failed to add JSON mode format:', e);
        }
      }

      // Call the AI model
      console.log('Calling AI with model:', settings.selectedModel);
      const response = await completeWithAI('openai', prompt, options);
      
      // Parse the response
      let scoringResults: Record<string, RelevancyData>;
      
      try {
        const parsedResponse = JSON.parse(response.content);
        // Convert array format to map format
        scoringResults = {};
        parsedResponse.papers.forEach((paper: any) => {
          const { arxivId, ...relevancyData } = paper;
          scoringResults[arxivId] = relevancyData;
        });
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        console.log('Raw response:', response.content);
        
        // Attempt to extract JSON from text response
        try {
          const jsonMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            scoringResults = JSON.parse(jsonMatch[0]);
            console.log('Extracted JSON from response');
          } else {
            throw new Error('Could not extract JSON from response');
          }
        } catch (extractError) {
          // If we can't parse JSON at all, create default scores for all papers
          scoringResults = {};
          papers.forEach(paper => {
            scoringResults[paper.arxivId] = {
              overallScore: 50,
              reasons: [{ 
                reason: "Could not analyze paper properly due to AI response format issues", 
                impactOnScore: 0 
              }],
              keywordsMatched: [],
              confidenceLevel: 10
            };
          });
        }
      }
      
      return new Map(Object.entries(scoringResults));
    } catch (err) {
      console.error('Error calculating relevancy scores:', err);
      setError(err.message || 'Failed to calculate relevancy scores');
      throw err;
    } finally {
      setIsCalculating(false);
    }
  };

  /**
   * Save relevancy score to the database
   */
  const saveRelevancyScore = async (paperId: string, relevancyData: RelevancyData): Promise<void> => {
    try {
      await db.transaction('rw', [db.paperBriefAssociations], async () => {
        // Check if association exists
        const association = await db.paperBriefAssociations
          .where({
            briefId,
            paperId
          })
          .first();

        if (association) {
          // Update existing association
          await db.paperBriefAssociations.update(association.id, {
            relevancyScore: relevancyData.overallScore,
            relevancyData,
            updatedAt: new Date()
          });
        } else {
          // Create new association
          const newAssociation = {
            id: generateUUID(),
            briefId,
            paperId,
            isSelected: false,
            searchQuery: [],
            relevancyScore: relevancyData.overallScore,
            relevancyData,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await db.paperBriefAssociations.add(newAssociation);
        }
      });
    } catch (err) {
      console.error('Error saving relevancy score:', err);
      throw err;
    }
  };

  /**
   * Calculate and save relevancy scores for multiple papers
   * Processes papers in batches of 5 using a single API call per batch
   */
  const calculateAndSaveRelevancyScores = async (papers: Paper[]): Promise<void> => {
    if (papers.length === 0) return;
    
    setIsCalculating(true);
    setError(null);
    setProgress(0);
    
    try {
      // Find papers without relevancy scores
      const unscoredPapers: Paper[] = [];
      
      for (const paper of papers) {
        const association = await db.paperBriefAssociations
          .where({
            briefId,
            paperId: paper.id
          })
          .first();
          
        if (association?.relevancyScore === undefined || association?.relevancyData === undefined) {
          unscoredPapers.push(paper);
        }
      }
      
      if (unscoredPapers.length === 0) {
        toast("All papers already have relevancy scores!");
        setIsCalculating(false);
        setProgress(100);
        return;
      }

      // Take 25% of unscored papers
      const batchSize = Math.max(1, Math.ceil(unscoredPapers.length * 0.25));
      const papersToProcess = unscoredPapers.slice(0, batchSize);
      
      console.log(`Processing batch of ${papersToProcess.length} papers out of ${unscoredPapers.length} unscored papers`);
      
      try {
        // Get scores for the entire batch in one API call
        const batchScores = await calculateRelevancyScores(papersToProcess);
        
        // Save scores for each paper
        for (const paper of papersToProcess) {
          const relevancyData = batchScores.get(paper.arxivId);
          if (relevancyData) {
            await saveRelevancyScore(paper.id, relevancyData);
            setProgress(Math.round((papersToProcess.indexOf(paper) + 1) / papersToProcess.length * 100));
            toast.success(`Scored paper: ${paper.title.substring(0, 30)}...`);
          } else {
            console.error(`No score returned for paper ${paper.arxivId}`);
            // Save default score for papers without results
            const defaultScore = {
              overallScore: 1,
              reasons: [{ 
                reason: "Failed to get score from AI response", 
                impactOnScore: 0 
              }],
              keywordsMatched: [],
              confidenceLevel: 1
            };
            await saveRelevancyScore(paper.id, defaultScore);
          }
        }
      } catch (err) {
        console.error(`Error processing batch:`, err);
        toast.error(`Failed to score batch: ${err instanceof Error ? err.message : 'Unknown error'}`);
        
        // Save default scores for the entire failed batch
        for (const paper of papersToProcess) {
          try {
            const defaultScore = {
              overallScore: 1,
              reasons: [{ 
                reason: `Failed to calculate score: ${err instanceof Error ? err.message : 'Unknown error'}`, 
                impactOnScore: 0 
              }],
              keywordsMatched: [],
              confidenceLevel: 1
            };
            await saveRelevancyScore(paper.id, defaultScore);
          } catch (saveErr) {
            console.error('Failed to save default score:', saveErr);
          }
        }
      }
      
      const remainingUnscored = unscoredPapers.length - papersToProcess.length;
      if (remainingUnscored > 0) {
        toast(`Processed ${papersToProcess.length} papers. ${remainingUnscored} papers remaining to be scored.`);
      } else {
        toast.success('All papers have been scored!');
      }
      
    } catch (err) {
      console.error('Error in relevancy calculation:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate relevancy scores');
      toast.error('Failed to complete relevancy scoring');
    } finally {
      setIsCalculating(false);
      setProgress(100);
    }
  };

  return {
    calculateRelevancyScores,
    saveRelevancyScore,
    calculateAndSaveRelevancyScores,
    isCalculating,
    error,
    progress
  };
}; 
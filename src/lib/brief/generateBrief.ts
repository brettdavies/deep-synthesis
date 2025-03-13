import type { Brief } from '@/lib/db/schema/brief';
import { BriefOperations } from '@/lib/db/operations/briefs';
import { PaperOperations } from '@/lib/db/operations/papers';
import toast from 'react-hot-toast';
import type { LLMResponse } from '@/lib/llm/types';

/**
 * Generates a research brief using AI based on the provided brief data
 * This function is shared between the brief generation step and the regenerate functionality
 * 
 * @param brief The brief object containing query and references
 * @param completeWithAI Function to call the AI
 * @returns Object containing success status and generated content
 */
export async function generateBrief(
  brief: Brief,
  completeWithAI: (
    providerName: string, 
    prompt: string, 
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      reasoningEffort?: 'high' | 'medium' | 'low';
      responseFormat?: {
        type: 'json_object' | 'json_schema';
        json_schema?: {
          name: string;
          strict: boolean;
          schema: Record<string, any>;
        };
      };
    }
  ) => Promise<LLMResponse>
): Promise<{ success: boolean; content?: string; bibtex?: string }> {
  if (!brief?.references || brief.references.length === 0) {
    toast.error("No papers selected for brief generation");
    return { success: false };
  }
  
  try {
    // Fetch full paper data for each reference to get abstracts
    const paperPromises = brief.references.map(async (ref) => {
      try {
        // Use the paperId field to fetch the full paper data
        const paper = await PaperOperations.getById(ref.paperId);
        return {
          text: ref.text,
          pdfUrl: ref.pdfUrl,
          arxivId: paper?.arxivId || '',
          abstract: paper?.abstract || 'Abstract not available',
          title: paper?.title || ref.text.split('. ')[1] || 'Title not available',
          authors: paper?.authors || [ref.text.split(' (')[0] || 'Author not available'],
          year: paper?.year || (ref.text.match(/\((\d{4})\)/) ? ref.text.match(/\((\d{4})\)/)[1] : 'Year not available')
        };
      } catch (error) {
        console.error(`Error fetching paper data for ${ref.paperId}:`, error);
        // Return basic info if paper fetch fails
        return {
          text: ref.text,
          pdfUrl: ref.pdfUrl,
          arxivId: ref.paperId,
          abstract: 'Abstract not available',
          title: ref.text.split('. ')[1] || 'Title not available',
          authors: [ref.text.split(' (')[0] || 'Author not available'],
          year: ref.text.match(/\((\d{4})\)/) ? ref.text.match(/\((\d{4})\)/)[1] : 'Year not available'
        };
      }
    });
    
    // Wait for all paper data to be fetched
    const paperData = await Promise.all(paperPromises);
    
    // Create system message with instructions
    const systemMessage = `You are an expert academic researcher creating a literature review. 
    Generate a concise, well-structured research brief in markdown format with the following elements:
    
    1. A clear, descriptive title at the top using a # heading
    2. 2-3 well-organized sections with ## headings that synthesize key findings, methodologies, and gaps
    3. Use inline citations in the format [n] and ensure all papers are cited at least once
    4. The brief should be academically rigorous but accessible
    5. Total length should be approximately half a page (2-3 paragraphs)
    
    Format the output as proper markdown with appropriate headings, paragraphs, and formatting.`;
    
    // Create user message with query and papers including abstracts
    const userMessage = `Research query: ${brief.query}
    
    Papers to include:
    ${JSON.stringify(paperData.map((paper, index) => ({
      citation_number: index + 1,
      citation_key: `[${index + 1}]`,
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      abstract: paper.abstract,
      arxivId: paper.arxivId,
      pdfUrl: paper.pdfUrl
    })), null, 2)}`;
    
    // Log the user message for debugging
    console.log("User message for brief generation:\n", userMessage);
    
    // Combine into a single prompt
    const prompt = `${systemMessage}\n\n${userMessage}`;
    
    // Call the AI
    const response = await completeWithAI('openai', prompt, {
      temperature: 0.3,
      maxTokens: 2000
    });
    
    // Log the API response
    console.log("API response for brief generation:", response);
    
    // Generate BibTeX from references
    const bibtex = paperData.map((paper, i) => {
      return `@article{ref${i+1},
title={${paper.title}},
author={${Array.isArray(paper.authors) ? paper.authors.join(' and ') : paper.authors}},
year={${paper.year}},
url={${paper.pdfUrl || ''}}
}`;
    }).join('\n\n');
    
    return {
      success: true,
      content: response.content,
      bibtex: bibtex
    };
  } catch (error) {
    console.error("Error generating brief:", error);
    toast.error("Failed to generate brief: " + (error as Error).message);
    return { success: false };
  }
}

/**
 * Updates a brief with the generated content and bibtex
 * 
 * @param briefId The ID of the brief to update
 * @param content The generated content
 * @param bibtex The generated bibtex
 * @param workflow The workflow that triggered this update ('generate' or 'regenerate')
 * @returns Promise resolving to a boolean indicating success
 */
export async function updateBriefWithGeneratedContent(
  briefId: string,
  content: string,
  bibtex: string,
  workflow: 'generate' | 'regenerate' = 'generate'
): Promise<boolean> {
  try {
    const success = await BriefOperations.update(briefId, {
      review: content,
      bibtex: bibtex,
      updatedAt: new Date()
    });
    
    if (success) {
      if (workflow === 'generate') {
        toast.success("Brief generated successfully");
      } else {
        toast.success("Brief regenerated successfully");
      }
    }
    
    return !!success; // Convert to boolean
  } catch (error) {
    console.error("Error updating brief with generated content:", error);
    toast.error(`Failed to ${workflow} brief: ` + (error as Error).message);
    return false;
  }
} 
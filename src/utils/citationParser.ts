/**
 * 🔍 Citation Parser - Extract and Format RAG Citations
 * 
 * Parses RAG search results and converts them into proper citation objects
 * for display in the CitationRenderer component.
 */

import { Citation, CitationReference } from '../components/CitationRenderer';

// Interface for RAG search results (matches your existing EnhancedRAG structure)
export interface RAGResult {
  chunk: {
    content: string;
    startIndex: number;
    endIndex: number;
  };
  document: {
    id: string;
    name: string;
    type: string;
    uploadedAt: Date;
  };
  relevanceScore: number;
  context: string;
}

/**
 * Convert RAG search results to Citation objects
 */
export function convertRAGResultsToCitations(ragResults: RAGResult[]): Citation[] {
  return ragResults.map((result, index) => ({
    id: `rag-${result.document.id}-${index}`,
    source: result.document.name,
    type: 'rag' as const,
    content: result.chunk.content,
    relevance: result.relevanceScore,
    timestamp: result.document.uploadedAt,
    documentId: result.document.id
  }));
}

/**
 * Parse text content to find inline citation markers
 * Looks for patterns like [1], [Source: Document], etc.
 */
export function parseTextWithCitations(text: string, citations: Citation[]): {
  cleanText: string;
  references: CitationReference[];
} {
  const references: CitationReference[] = [];
  let cleanText = text;
  
  // Pattern to match citation markers: [1], [Source: Doc], etc.
  const citationPattern = /\[([^\]]+)\]/g;
  let match;
  let offset = 0;
  
  while ((match = citationPattern.exec(text)) !== null) {
    const fullMatch = match[0];
    const citationContent = match[1];
    const startPos = match.index - offset;
    
    // Try to find matching citation
    let matchingCitation: Citation | null = null;
    
    // Check if it's a number reference
    const numberMatch = citationContent.match(/^\d+$/);
    if (numberMatch) {
      const citationIndex = parseInt(numberMatch[0]) - 1;
      if (citationIndex >= 0 && citationIndex < citations.length) {
        matchingCitation = citations[citationIndex];
      }
         } else {
       // Check if it matches a source name
       matchingCitation = citations.find(c => 
         c.source.toLowerCase().includes(citationContent.toLowerCase()) ||
         citationContent.toLowerCase().includes(c.source.toLowerCase())
       ) || null;
     }
    
    if (matchingCitation) {
      references.push({
        citationId: matchingCitation.id,
        inlineText: citationContent,
        position: startPos
      });
    }
    
    // Remove the citation marker from clean text
    cleanText = cleanText.slice(0, startPos) + cleanText.slice(startPos + fullMatch.length);
    offset += fullMatch.length;
  }
  
  return {
    cleanText,
    references
  };
}

/**
 * Extract relevant quotes from citations based on query terms
 */
export function extractRelevantQuotes(
  citations: Citation[], 
  queryTerms: string[], 
  maxQuoteLength: number = 150
): Citation[] {
  return citations.map(citation => {
    const content = citation.content.toLowerCase();
    const terms = queryTerms.map(term => term.toLowerCase());
    
    // Find best matching excerpt
    let bestMatch = '';
    let bestScore = 0;
    
    // Split content into sentences
    const sentences = citation.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (sentence.length === 0) continue;
      
      // Check how many query terms appear in this sentence
      const score = terms.reduce((acc, term) => {
        return acc + (sentence.toLowerCase().includes(term) ? 1 : 0);
      }, 0);
      
      if (score > bestScore || (score === bestScore && sentence.length < bestMatch.length)) {
        bestScore = score;
        bestMatch = sentence;
      }
    }
    
    // If no good match found, use beginning of content
    if (!bestMatch || bestScore === 0) {
      bestMatch = citation.content.substring(0, maxQuoteLength);
      if (citation.content.length > maxQuoteLength) {
        bestMatch += '...';
      }
    }
    
    return {
      ...citation,
      content: bestMatch
    };
  });
}

/**
 * Create citation markers for text based on RAG results
 */
export function insertCitationMarkers(
  text: string, 
  ragResults: RAGResult[]
): { 
  textWithCitations: string; 
  citations: Citation[] 
} {
  const citations = convertRAGResultsToCitations(ragResults);
  let textWithCitations = text;
  
  // For now, append citation numbers at the end of relevant sentences
  // This is a simple implementation - could be enhanced with NLP
  citations.forEach((citation, index) => {
    const citationNumber = index + 1;
    const marker = ` [${citationNumber}]`;
    
    // Try to find a good place to insert the citation marker
    // Look for sentences that contain similar content
    const sentences = textWithCitations.split(/([.!?]+)/);
    
    for (let i = 0; i < sentences.length; i += 2) { // Every other element is a sentence
      const sentence = sentences[i];
      if (sentence && sentence.trim().length > 10) {
        // Simple similarity check - could be enhanced
        const sentenceLower = sentence.toLowerCase();
        const citationWords = citation.content.toLowerCase().split(/\s+/).slice(0, 5);
        
        const matchCount = citationWords.reduce((count, word) => {
          return count + (sentenceLower.includes(word) ? 1 : 0);
        }, 0);
        
        if (matchCount >= 2) {
          sentences[i] = sentence + marker;
          break;
        }
      }
    }
    
    textWithCitations = sentences.join('');
  });
  
  return {
    textWithCitations,
    citations
  };
}

/**
 * Generate a bibliography from citations
 */
export function generateBibliography(citations: Citation[]): string {
  const sortedCitations = [...citations].sort((a, b) => a.source.localeCompare(b.source));
  
  return sortedCitations.map((citation, index) => {
    const number = index + 1;
    const date = citation.timestamp ? citation.timestamp.toLocaleDateString() : 'Unknown date';
    
    switch (citation.type) {
      case 'rag':
      case 'document':
        return `${number}. ${citation.source}. ${date}. Retrieved from uploaded document.`;
      case 'external':
        return `${number}. ${citation.source}. ${date}. ${citation.url || 'External source'}.`;
      case 'knowledge':
        return `${number}. ${citation.source}. Internal knowledge base.`;
      default:
        return `${number}. ${citation.source}. ${date}.`;
    }
  }).join('\n');
}

/**
 * Calculate citation quality score based on relevance and content length
 */
export function calculateCitationQuality(citation: Citation): number {
  let score = citation.relevance * 0.7; // 70% weight for relevance
  
  // Content length factor (prefer substantial but not overwhelming content)
  const contentLength = citation.content.length;
  let lengthScore = 0;
  
  if (contentLength >= 50 && contentLength <= 300) {
    lengthScore = 1; // Ideal length
  } else if (contentLength >= 20 && contentLength <= 500) {
    lengthScore = 0.8; // Good length
  } else if (contentLength >= 10) {
    lengthScore = 0.5; // Acceptable length
  }
  
  score += lengthScore * 0.3; // 30% weight for length appropriateness
  
  return Math.min(score, 1); // Cap at 1.0
}

/**
 * Filter and rank citations by quality
 */
export function filterAndRankCitations(
  citations: Citation[], 
  minQuality: number = 0.3,
  maxCitations: number = 5
): Citation[] {
  return citations
    .map(citation => ({
      ...citation,
      quality: calculateCitationQuality(citation)
    }))
    .filter(citation => citation.quality >= minQuality)
    .sort((a, b) => b.quality - a.quality)
    .slice(0, maxCitations);
} 
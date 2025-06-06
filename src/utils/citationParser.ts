import { Citation, CitationReference } from '../types/index';

export interface ParsedContent {
  text: string;
  citations: Citation[];
  citationReferences: CitationReference[];
}

/**
 * Parse AI response text to extract citations and create references
 */
export const parseTextWithCitations = (
  content: string,
  existingCitations: Citation[] = []
): ParsedContent => {
  const citations: Citation[] = [...existingCitations];
  const citationReferences: CitationReference[] = [];
  
  // Pattern to match citation markers like [Citation: title - excerpt] or [Source: URL]
  const citationPattern = /\[(Citation|Source|Ref|Reference):\s*([^\]]+)\]/gi;
  
  let processedText = content;
  let match;
  let offset = 0;
  
  while ((match = citationPattern.exec(content)) !== null) {
    const fullMatch = match[0];
    const citationType = match[1].toLowerCase();
    const citationContent = match[2];
    
    // Parse citation content
    const citation = parseCitationContent(citationContent, citationType);
    
    if (citation) {
      citations.push(citation);
      
      // Calculate position in processed text (accounting for previous replacements)
      const originalStart = match.index;
      const originalEnd = match.index + fullMatch.length;
      const adjustedStart = originalStart - offset;
      
      // Create citation reference
      const citationRef: CitationReference = {
        citationId: citation.id,
        startIndex: adjustedStart,
        endIndex: adjustedStart,
        text: citationContent.split(' - ')[0] || citationContent
      };
      
      citationReferences.push(citationRef);
      
      // Replace citation marker with just the reference text
      const replacement = citationRef.text;
      processedText = processedText.slice(0, adjustedStart) + 
                    replacement + 
                    processedText.slice(adjustedStart + fullMatch.length);
      
      // Update offset for next replacements
      offset += fullMatch.length - replacement.length;
    }
  }
  
  return {
    text: processedText,
    citations,
    citationReferences
  };
};

/**
 * Parse citation content from various formats
 */
const parseCitationContent = (content: string, type: string): Citation | null => {
  try {
    const id = generateCitationId();
    const timestamp = new Date();
    
    // Handle URL citations
    if (content.includes('http://') || content.includes('https://')) {
      const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        const title = content.replace(url, '').trim() || extractTitleFromUrl(url);
        
        return {
          id,
          type: 'web',
          title,
          url,
          excerpt: content,
          timestamp,
          relevanceScore: 0.8
        };
      }
    }
    
    // Handle document citations with page numbers
    const pageMatch = content.match(/^(.+?)\s*-\s*(.+?)(?:\s*\(p\.\s*(\d+)\))?$/);
    if (pageMatch) {
      const [, title, excerpt, pageNum] = pageMatch;
      
      return {
        id,
        type: 'document',
        title: title.trim(),
        excerpt: excerpt.trim(),
        pageNumber: pageNum ? parseInt(pageNum) : undefined,
        timestamp,
        relevanceScore: 0.9
      };
    }
    
    // Handle simple title - excerpt format
    const simpleMatch = content.match(/^(.+?)\s*-\s*(.+)$/);
    if (simpleMatch) {
      const [, title, excerpt] = simpleMatch;
      
      return {
        id,
        type: 'document',
        title: title.trim(),
        excerpt: excerpt.trim(),
        timestamp,
        relevanceScore: 0.7
      };
    }
    
    // Fallback: treat entire content as title
    return {
      id,
      type: 'document',
      title: content.trim(),
      excerpt: content.trim(),
      timestamp,
      relevanceScore: 0.6
    };
    
  } catch (error) {
    console.error('Error parsing citation content:', error);
    return null;
  }
};

/**
 * Extract title from URL
 */
const extractTitleFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    const pathname = urlObj.pathname.split('/').filter(Boolean).pop();
    
    if (pathname) {
      return `${hostname} - ${pathname.replace(/[-_]/g, ' ')}`;
    }
    
    return hostname;
  } catch {
    return url;
  }
};

/**
 * Generate unique citation ID
 */
const generateCitationId = (): string => {
  return `cite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create citation from PDF document reference
 */
export const createPDFCitation = (
  documentId: string,
  documentName: string,
  pageNumber: number,
  excerpt: string,
  title?: string
): Citation => {
  return {
    id: generateCitationId(),
    type: 'pdf',
    title: title || `${documentName} (Page ${pageNumber})`,
    documentId,
    documentName,
    pageNumber,
    excerpt,
    timestamp: new Date(),
    relevanceScore: 0.85
  };
};

/**
 * Create citation from web search result
 */
export const createWebCitation = (
  title: string,
  url: string,
  excerpt: string,
  relevanceScore: number = 0.8
): Citation => {
  return {
    id: generateCitationId(),
    type: 'web',
    title,
    url,
    excerpt,
    timestamp: new Date(),
    relevanceScore
  };
};

/**
 * Merge citation references for text rendering
 */
export const mergeCitationData = (
  citations: Citation[],
  references: CitationReference[]
): Array<{ citation: Citation; reference: CitationReference }> => {
  return references.map(ref => {
    const citation = citations.find(c => c.id === ref.citationId);
    return citation ? { citation, reference: ref } : null;
  }).filter(Boolean) as Array<{ citation: Citation; reference: CitationReference }>;
}; 
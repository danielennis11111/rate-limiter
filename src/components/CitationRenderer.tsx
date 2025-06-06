import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ExternalLink } from 'lucide-react';
import { Citation, CitationReference } from '../types/index';
import CitationTooltip from './CitationTooltip';
import { mergeCitationData } from '../utils/citationParser';

interface CitationRendererProps {
  content: string;
  citations: Citation[];
  citationReferences: CitationReference[];
  className?: string;
}

const CitationRenderer: React.FC<CitationRendererProps> = ({
  content,
  citations,
  citationReferences,
  className = ''
}) => {
  // Merge citation data for easier processing
  const citationData = mergeCitationData(citations, citationReferences);

  // Sort citation references by start index for proper processing
  const sortedReferences = [...citationReferences].sort((a, b) => a.startIndex - b.startIndex);

  // Process content to inject citation markers
  const processContentWithCitations = () => {
    if (!sortedReferences.length) {
      return content;
    }

    let processedContent = '';
    let lastIndex = 0;

    sortedReferences.forEach((ref, index) => {
      const citation = citations.find(c => c.id === ref.citationId);
      if (!citation) return;

      // Add content before citation
      processedContent += content.slice(lastIndex, ref.startIndex);

      // Add the cited text with citation marker
      const citedText = content.slice(ref.startIndex, ref.endIndex || ref.startIndex + ref.text.length);
      processedContent += `${citedText}[CITATION:${index}]`;

      lastIndex = ref.endIndex || ref.startIndex + ref.text.length;
    });

    // Add remaining content
    processedContent += content.slice(lastIndex);

    return processedContent;
  };

  // Custom renderer for markdown that handles citation markers
  const renderWithCitations = (children: React.ReactNode): React.ReactNode => {
    // Convert children to string safely
    const text = typeof children === 'string' ? children : 
                 Array.isArray(children) ? children.join('') :
                 children?.toString() || '';
    
    const citationPattern = /\[CITATION:(\d+)\]/g;
    const parts = text.split(citationPattern);
    
    return parts.map((part, index) => {
      // If this part is a citation number
      if (index % 2 === 1) {
        const citationIndex = parseInt(part);
        const citationItem = citationData[citationIndex];
        
        if (citationItem) {
          return (
            <CitationTooltip
              key={`citation-${citationIndex}`}
              citation={citationItem.citation}
              citationNumber={citationIndex + 1}
            >
              <span />
            </CitationTooltip>
          );
        }
      }
      
      // Regular text
      return <span key={index}>{part}</span>;
    });
  };

  // Process the content
  const processedContent = processContentWithCitations();

  return (
    <div className={`citation-renderer ${className}`}>
      <div className="prose prose-sm max-w-none text-gray-900
        prose-headings:text-gray-900 prose-headings:font-semibold
        prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
        prose-p:text-gray-900 prose-p:leading-relaxed
        prose-strong:text-gray-900 prose-strong:font-semibold
        prose-em:text-gray-700
        prose-ul:text-gray-900 prose-ol:text-gray-900
        prose-li:text-gray-900 prose-li:marker:text-gray-500
        prose-code:text-[#191919] prose-code:bg-[#FFC627] prose-code:bg-opacity-20 prose-code:px-1 prose-code:rounded
        prose-pre:bg-gray-50 prose-pre:text-gray-800
        prose-blockquote:text-gray-700 prose-blockquote:border-l-gray-300
        prose-hr:border-gray-200">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom text renderer to handle citations
            p: ({ children }) => (
              <p>{renderWithCitations(children)}</p>
            ),
            li: ({ children }) => (
              <li>{renderWithCitations(children)}</li>
            ),
            // Handle other elements that might contain citations
            span: ({ children }) => (
              <span>{renderWithCitations(children)}</span>
            ),
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>

      {/* Citations list at the bottom */}
      {citations.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <FileText className="w-4 h-4 text-[#FFC627] mr-2" />
            References ({citations.length})
          </h4>
          <div className="space-y-2">
            {citations.map((citation, index) => (
              <div key={citation.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-[#FFC627] bg-opacity-20 text-[#191919] text-xs font-semibold rounded">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h5 className="text-sm font-medium text-gray-900 truncate">
                      {citation.title}
                    </h5>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      {citation.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {citation.excerpt}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    {citation.documentName && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        {citation.documentName}
                      </span>
                    )}
                    {citation.pageNumber && (
                      <span className="text-xs text-gray-500">
                        Page {citation.pageNumber}
                      </span>
                    )}
                    {citation.url && (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#FFC627] hover:text-yellow-600 underline flex items-center"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open Link
                      </a>
                    )}
                    {citation.relevanceScore && (
                      <span className="text-xs text-gray-500">
                        {Math.round(citation.relevanceScore * 100)}% relevant
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CitationRenderer; 
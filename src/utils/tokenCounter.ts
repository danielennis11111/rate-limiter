/**
 * 🔢 Token Counter Utility
 * 
 * Accurate token counting for different AI models with proper handling of:
 * - PDF content
 * - RAG context from multiple document types
 * - Model-specific tokenization
 * - Context window management
 */

interface ModelTokenLimits {
  contextWindow: number;
  maxOutput: number;
  pricing: {
    input: number; // per 1K tokens
    output: number; // per 1K tokens
  };
}

// Real token limits for supported models (as of 2024)
export const MODEL_LIMITS: Record<string, ModelTokenLimits> = {
  // OpenAI Models
  'gpt-4o': {
    contextWindow: 128000,
    maxOutput: 16384,
    pricing: { input: 0.005, output: 0.015 }
  },
  'gpt-4o-mini': {
    contextWindow: 128000,
    maxOutput: 16384,
    pricing: { input: 0.00015, output: 0.0006 }
  },
  'gpt-3.5-turbo': {
    contextWindow: 16385,
    maxOutput: 4096,
    pricing: { input: 0.0005, output: 0.0015 }
  },
  
  // Google Gemini Models
  'gemini-2.0-flash': {
    contextWindow: 1000000, // 1M tokens
    maxOutput: 8192,
    pricing: { input: 0.0005, output: 0.0015 }
  },
  'gemini-1.5-pro': {
    contextWindow: 2000000, // 2M tokens
    maxOutput: 8192,
    pricing: { input: 0.00125, output: 0.005 }
  },
  
  // Llama Models (local)
  'llama4-scout': {
    contextWindow: 10485760, // Official: 10M tokens - Enhanced reasoning model
    maxOutput: 8192, // Higher output for complex reasoning
    pricing: { input: 0, output: 0 } // Local = free
  },
  'llama3.2:3b': {
    contextWindow: 131072, // 128K tokens  
    maxOutput: 4096,
    pricing: { input: 0, output: 0 } // Local = free
  },
  'llama3.1:8b': {
    contextWindow: 131072, // 128K tokens
    maxOutput: 4096,
    pricing: { input: 0, output: 0 } // Local = free
  }
};

export interface TokenUsage {
  systemPrompt: number;
  conversationHistory: number;
  ragContext: number;
  currentMessage: number;
  total: number;
  remaining: number;
  percentage: number;
  estimatedCost: number;
}

export interface DocumentContext {
  type: 'pdf' | 'docx' | 'txt' | 'md' | 'csv' | 'json' | 'xml';
  name: string;
  content: string;
  tokenCount: number;
  size: number;
  uploadedAt: Date;
}

/**
 * Estimate token count using GPT-4 tokenization approximation
 * This is more accurate than simple word counting
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  
  // GPT-4 tokenization approximation:
  // - ~4 characters per token on average
  // - But punctuation, spaces, and special chars affect this
  // - Code and structured text tend to use more tokens
  
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const characters = text.length;
  
  // Base estimation: average of word-based and character-based counting
  const wordBasedTokens = words.length * 1.3; // ~1.3 tokens per word
  const charBasedTokens = characters / 4; // ~4 chars per token
  
  // Weight toward character-based for structured content
  const hasStructuredContent = /[{}[\](),:;|<>]/.test(text);
  const weight = hasStructuredContent ? 0.3 : 0.7;
  
  const estimatedTokens = Math.ceil(
    wordBasedTokens * weight + charBasedTokens * (1 - weight)
  );
  
  return Math.max(estimatedTokens, Math.ceil(words.length * 0.75)); // Minimum bound
}

/**
 * Calculate comprehensive token usage including RAG context
 */
export function calculateTokenUsage(
  systemPrompt: string,
  conversationHistory: string,
  ragDocuments: DocumentContext[],
  currentMessage: string,
  modelId: string
): TokenUsage {
  const modelLimits = MODEL_LIMITS[modelId] || MODEL_LIMITS['gpt-4o-mini'];
  
  const systemTokens = estimateTokenCount(systemPrompt);
  const historyTokens = estimateTokenCount(conversationHistory);
  const ragTokens = ragDocuments.reduce((sum, doc) => sum + doc.tokenCount, 0);
  const messageTokens = estimateTokenCount(currentMessage);
  
  const totalTokens = systemTokens + historyTokens + ragTokens + messageTokens;
  const remainingTokens = Math.max(0, modelLimits.contextWindow - totalTokens);
  const percentage = Math.min(100, (totalTokens / modelLimits.contextWindow) * 100);
  
  // Estimate cost (input tokens only for this calculation)
  const estimatedCost = (totalTokens / 1000) * modelLimits.pricing.input;
  
  return {
    systemPrompt: systemTokens,
    conversationHistory: historyTokens,
    ragContext: ragTokens,
    currentMessage: messageTokens,
    total: totalTokens,
    remaining: remainingTokens,
    percentage: Math.round(percentage * 10) / 10,
    estimatedCost: Math.round(estimatedCost * 10000) / 10000 // 4 decimal places
  };
}

/**
 * Process document content and estimate tokens
 */
export function processDocumentForRAG(
  file: File,
  content: string
): DocumentContext {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'txt';
  const documentType = mapFileExtensionToType(extension);
  
  return {
    type: documentType,
    name: file.name,
    content: content,
    tokenCount: estimateTokenCount(content),
    size: file.size,
    uploadedAt: new Date()
  };
}

/**
 * Map file extensions to document types
 */
function mapFileExtensionToType(extension: string): DocumentContext['type'] {
  const typeMap: Record<string, DocumentContext['type']> = {
    'pdf': 'pdf',
    'docx': 'docx',
    'doc': 'docx',
    'txt': 'txt',
    'md': 'md',
    'markdown': 'md',
    'csv': 'csv',
    'json': 'json',
    'xml': 'xml',
    'html': 'xml',
    'htm': 'xml'
  };
  
  return typeMap[extension] || 'txt';
}

/**
 * Get model information including context limits
 */
export function getModelInfo(modelId: string): ModelTokenLimits {
  return MODEL_LIMITS[modelId] || MODEL_LIMITS['gpt-4o-mini'];
}

/**
 * Check if context is near limit and suggest actions
 */
export function getContextRecommendations(usage: TokenUsage): {
  status: 'good' | 'warning' | 'critical';
  message: string;
  actions: string[];
} {
  if (usage.percentage < 70) {
    return {
      status: 'good',
      message: 'Context usage is healthy',
      actions: []
    };
  } else if (usage.percentage < 90) {
    return {
      status: 'warning',
      message: 'Context window is filling up',
      actions: [
        'Consider removing older documents from RAG',
        'Summarize conversation history',
        'Use a model with larger context window'
      ]
    };
  } else {
    return {
      status: 'critical',
      message: 'Context window nearly full - responses may be truncated',
      actions: [
        'Start a new conversation',
        'Remove documents from RAG context',
        'Switch to a model with larger context window',
        'Clear conversation history'
      ]
    };
  }
}

export default estimateTokenCount; 
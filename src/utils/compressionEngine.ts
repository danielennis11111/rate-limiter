import { CompressionStrategy, ChatHistoryCache } from '../types/contextOptimization';
import { Message } from '../types';

export class CompressionEngine {
  private static instance: CompressionEngine;
  
  static getInstance(): CompressionEngine {
    if (!CompressionEngine.instance) {
      CompressionEngine.instance = new CompressionEngine();
    }
    return CompressionEngine.instance;
  }

  // Lossless compression using run-length encoding and pattern detection
  compressLossless(content: string): { compressed: string; ratio: number } {
    // Simple RLE compression for repeated patterns
    const compressed = content.replace(/(.)\1{2,}/g, (match, char) => {
      return `${char}[${match.length}]`;
    });
    
    // Pattern-based compression for common phrases
    const patterns = new Map([
      ['I understand', '§IU§'],
      ['can you help', '§CYH§'],
      ['thank you', '§TY§'],
      ['let me know', '§LMK§'],
      ['by the way', '§BTW§'],
    ]);
    
    let result = compressed;
    patterns.forEach((replacement, pattern) => {
      result = result.replace(new RegExp(pattern, 'gi'), replacement);
    });
    
    const ratio = result.length / content.length;
    return { compressed: result, ratio };
  }

  // Semantic compression using key phrase extraction
  compressSemantic(content: string, preserveRatio: number = 0.7): { compressed: string; ratio: number } {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const importantSentences = sentences.slice(0, Math.ceil(sentences.length * preserveRatio));
    
    const compressed = importantSentences.join('. ') + '.';
    const ratio = compressed.length / content.length;
    
    return { compressed, ratio };
  }

  // Summary-based compression
  compressSummary(messages: Message[]): { compressed: string; ratio: number } {
    const originalContent = messages.map(m => m.content).join(' ');
    
    // Extract key topics and decisions
    const keyPoints = this.extractKeyPoints(messages);
    const compressed = `[SUMMARY] Key points: ${keyPoints.join('; ')}`;
    
    const ratio = compressed.length / originalContent.length;
    return { compressed, ratio };
  }

  // Hybrid compression combining multiple strategies
  compressHybrid(messages: Message[], strategy: CompressionStrategy): { compressed: string; ratio: number } {
    const recentMessages = messages.slice(-5); // Keep recent messages uncompressed
    const oldMessages = messages.slice(0, -5);
    
    let compressedOld = '';
    if (oldMessages.length > 0) {
      const { compressed } = this.compressSummary(oldMessages);
      compressedOld = compressed;
    }
    
    const recentContent = recentMessages.map(m => `${m.isUser ? 'User' : 'AI'}: ${m.content}`).join('\n');
    const finalContent = compressedOld + '\n\n[RECENT]\n' + recentContent;
    
    const originalContent = messages.map(m => m.content).join(' ');
    const ratio = finalContent.length / originalContent.length;
    
    return { compressed: finalContent, ratio };
  }

  // Decompress content back to readable format
  decompress(compressed: string, strategy: CompressionStrategy): string {
    let result = compressed;
    
    if (strategy.type === 'lossless') {
      // Reverse pattern replacements
      const patterns = new Map([
        ['§IU§', 'I understand'],
        ['§CYH§', 'can you help'],
        ['§TY§', 'thank you'],
        ['§LMK§', 'let me know'],
        ['§BTW§', 'by the way'],
      ]);
      
      patterns.forEach((original, replacement) => {
        result = result.replace(new RegExp(replacement, 'g'), original);
      });
      
      // Reverse RLE
      result = result.replace(/(.)\[(\d+)\]/g, (match, char, count) => {
        return char.repeat(parseInt(count));
      });
    }
    
    return result;
  }

  // Create compression strategy based on content analysis
  analyzeAndRecommendStrategy(messages: Message[], tokenCount: number): CompressionStrategy {
    const avgMessageLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    const hasRepeatedPatterns = this.detectPatterns(messages);
    
    let type: CompressionStrategy['type'] = 'lossless';
    let preserveKey = true;
    
    if (tokenCount > 8000) {
      type = 'hybrid';
      preserveKey = false;
    } else if (avgMessageLength > 200) {
      type = 'semantic';
    } else if (hasRepeatedPatterns) {
      type = 'lossless';
    }
    
    return {
      type,
      compressionRatio: 0.7,
      preserveKey,
      metadata: {
        originalTokens: tokenCount,
        compressedTokens: 0,
        accuracy: type === 'lossless' ? 1.0 : 0.8
      }
    };
  }

  private extractKeyPoints(messages: Message[]): string[] {
    const allContent = messages.map(m => m.content).join(' ');
    
    // Simple keyword extraction (in real implementation, use NLP)
    const keywords = allContent.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const questions = allContent.match(/[^.!?]*\?[^.!?]*/g) || [];
    const decisions = allContent.match(/(?:decided|chose|selected|will|going to)[^.!?]*/gi) || [];
    
    return Array.from(new Set([...keywords.slice(0, 3), ...questions.slice(0, 2), ...decisions.slice(0, 2)]));
  }

  private detectPatterns(messages: Message[]): boolean {
    const contents = messages.map(m => m.content);
    const patterns = ['I understand', 'can you help', 'thank you'];
    
    return patterns.some(pattern => 
      contents.filter(content => content.toLowerCase().includes(pattern.toLowerCase())).length > 1
    );
  }

  // Generate checksum for integrity verification
  generateChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
} 
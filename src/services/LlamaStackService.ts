// LlamaStackService - Browser-compatible service for Llama CLI models

interface LlamaStackResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface LlamaStackMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 🦙 Llama Stack Service
 * 
 * Interface for locally downloaded Llama CLI models like Llama 4 Scout
 * This service bridges between our web UI and the Llama CLI downloaded models
 */
export class LlamaStackService {
  private availableModels: Map<string, boolean> = new Map();

  constructor() {
    this.checkAvailableModels();
  }

  /**
   * Check which Llama CLI models are available locally
   */
  private async checkAvailableModels(): Promise<void> {
    try {
      // Known downloaded models (based on user confirmation)
      this.availableModels.set('Llama-4-Scout-17B-16E-Instruct', true);   // 2.7GB - downloaded
      this.availableModels.set('Llama3.2-3B-Instruct', true);             // 799MB - downloaded
      this.availableModels.set('Llama-4-Maverick-17B-128E-Instruct', false); // Empty folder
      
      console.log('🦙 Llama Stack models available:', Array.from(this.availableModels.entries()));
    } catch (error) {
      console.error('Error checking Llama Stack models:', error);
    }
  }

  /**
   * Check if a specific model is available
   */
  isModelAvailable(modelId: string): boolean {
    return this.availableModels.get(modelId) || false;
  }

  /**
   * Send message to Llama CLI model via backend service
   */
  async sendMessage(
    messages: LlamaStackMessage[],
    modelId: string = 'Llama-4-Scout-17B-16E-Instruct',
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      ragContext?: string;
      systemPrompt?: string;
    } = {}
  ): Promise<LlamaStackResponse> {
    
    if (!this.isModelAvailable(modelId)) {
      throw new Error(`Model ${modelId} is not available. Please download it first.`);
    }

    try {
      // Prepare messages with system prompt and RAG context if provided
      let processedMessages = [...messages];
      
      if (options.systemPrompt || options.ragContext) {
        let systemContent = options.systemPrompt || 'You are a helpful AI assistant.';
        
        if (options.ragContext) {
          systemContent += `\n\n## Document Context\n\nThe user has uploaded the following documents for context:\n\n${options.ragContext}\n\nUse this context to provide more relevant and informed responses when applicable.`;
        }
        
        // Add or replace system message
        const hasSystemMessage = processedMessages.some(msg => msg.role === 'system');
        if (hasSystemMessage) {
          processedMessages = processedMessages.map(msg => 
            msg.role === 'system' ? { ...msg, content: systemContent } : msg
          );
        } else {
          processedMessages = [{ role: 'system', content: systemContent }, ...processedMessages];
        }
      }

      console.log(`🦙 Sending request to backend for ${modelId}...`);

      // Call the backend service
      const response = await fetch('http://localhost:3001/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: processedMessages,
          model: modelId,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Backend API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens
        },
        model: data.model
      };

    } catch (error) {
      console.error('Llama Stack API request failed:', error);
      
      // If backend is not running, provide helpful error message
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Backend service not running. Please start the Llama backend server on port 3001.');
      }
      
      throw error;
    }
  }

  /**
   * Stream message from Llama CLI model
   */
  async *streamMessage(
    messages: LlamaStackMessage[],
    modelId: string = 'Llama-4-Scout-17B-16E-Instruct',
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      ragContext?: string;
      systemPrompt?: string;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    
    const response = await this.sendMessage(messages, modelId, options);
    
    // Simulate streaming by yielding chunks
    const words = response.content.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield words[i] + (i < words.length - 1 ? ' ' : '');
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return Array.from(this.availableModels.entries())
      .filter(([, available]) => available)
      .map(([modelId]) => modelId);
  }

  /**
   * Get model info
   */
  getModelInfo(modelId: string): {
    name: string;
    contextWindow: number;
    size: string;
    description: string;
  } | null {
    if (!this.isModelAvailable(modelId)) {
      return null;
    }

    switch (modelId) {
      case 'Llama-4-Scout-17B-16E-Instruct':
        return {
          name: 'Llama 4 Scout',
          contextWindow: 10240000, // 10M+ tokens
          size: '2.7GB',
          description: 'Advanced reasoning model with massive context window'
        };
      case 'Llama3.2-3B-Instruct':
        return {
          name: 'Llama 3.2 3B Instruct',
          contextWindow: 128000, // 128K tokens
          size: '799MB',
          description: 'Efficient instruction-following model for general tasks'
        };
      case 'Llama-4-Maverick-17B-128E-Instruct':
        return {
          name: 'Llama 4 Maverick',
          contextWindow: 1024000, // 1M tokens  
          size: 'Not downloaded',
          description: 'Fast processing model for real-time responses'
        };
      default:
        return null;
    }
  }
} 
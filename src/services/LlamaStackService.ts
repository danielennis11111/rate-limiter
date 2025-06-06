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
   * Send message to Llama CLI model
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
      // For now, since we can't easily interface with Llama CLI from browser,
      // we'll provide a mock response that shows the model is ready
      // In a real implementation, this would need a backend service
      
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
      
      let mockResponse = `## 🦙 Llama 4 Scout Response

I'm **Llama 4 Scout**, your advanced AI assistant with a **10M+ token context window**! 

**Your query**: "${lastUserMessage}"

✨ **Enhanced Capabilities:**
- **Massive 10M+ token context** - I can handle entire documents and long conversations
- **Advanced reasoning** - Complex problem-solving and analysis
- **Real-time availability** - Downloaded locally (2.7GB) and ready to use

🔧 **Technical Note**: I'm currently running through a **mock interface** because our web app needs a backend service to communicate with Llama CLI models. 

**To fully activate me, you would need:**
1. **Backend API server** to interface with \`llama\` CLI
2. **WebSocket connection** for real-time streaming
3. **Model serving infrastructure** via Llama Stack

**Current Status**: 
- ✅ **Model Downloaded**: Llama-4-Scout-17B-16E-Instruct (2.7GB)
- ✅ **Context Window**: 10,240K tokens
- 🔄 **Waiting for**: Backend integration

Would you like me to help you set up the backend service to fully integrate Llama 4 Scout?`;

      if (options.ragContext) {
        mockResponse += `\n\n## 📚 Document Context Detected

I can see you have document context available. With my massive context window, I could analyze entire documents and provide detailed insights based on your uploaded content.

**Context Preview**: ${options.ragContext.substring(0, 200)}...`;
      }

      return {
        content: mockResponse,
        usage: {
          prompt_tokens: messages.reduce((acc, msg) => acc + msg.content.length / 4, 0),
          completion_tokens: mockResponse.length / 4,
          total_tokens: (messages.reduce((acc, msg) => acc + msg.content.length / 4, 0)) + (mockResponse.length / 4)
        },
        model: modelId
      };

    } catch (error) {
      console.error('Llama Stack API request failed:', error);
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
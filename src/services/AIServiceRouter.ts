import { LlamaService } from '../utils/llamaService';
import { GeminiService } from './GeminiService';
import { OpenAIService } from './OpenAIService';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  ragContext?: string;
  systemPrompt?: string;
}

/**
 * 🤖 AI Service Router
 * 
 * Routes conversations to the appropriate AI service based on model ID:
 * - OpenAI models (gpt-*, o1-*): Use OpenAI API with OPENAI_API_KEY
 * - Gemini models (gemini-*): Use Google Gemini API with GEMINI_API_KEY
 * - Llama models (llama*): Use local Ollama service
 */
export class AIServiceRouter {
  private llamaService: LlamaService;
  private geminiService: GeminiService | null = null;
  private openaiService: OpenAIService | null = null;

  constructor() {
    this.llamaService = new LlamaService();
    
    // Initialize Gemini service if API key is available
    const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (geminiApiKey) {
      this.geminiService = new GeminiService({
        apiKey: geminiApiKey
      });
      console.log('🔑 Gemini API key found - Gemini models enabled');
    } else {
      console.warn('⚠️ REACT_APP_GEMINI_API_KEY not found - Gemini models will fallback to Llama');
    }

    // Initialize OpenAI service if API key is available
    const openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (openaiApiKey) {
      this.openaiService = new OpenAIService({
        apiKey: openaiApiKey
      });
      console.log('🔑 OpenAI API key found - OpenAI models enabled');
    } else {
      console.warn('⚠️ REACT_APP_OPENAI_API_KEY not found - OpenAI models will fallback to Llama');
    }
  }

  /**
   * Send message to appropriate AI service based on model ID
   */
  async sendMessage(
    messages: AIMessage[],
    modelId: string,
    options: AIOptions = {}
  ): Promise<AIResponse> {
    console.log(`🤖 Routing request to ${this.getServiceName(modelId)} for model: ${modelId}`);

    if (this.isOpenAIModel(modelId) && this.openaiService) {
      return this.sendToOpenAI(messages, modelId, options);
    } else if (this.isGeminiModel(modelId) && this.geminiService) {
      return this.sendToGemini(messages, modelId, options);
    } else {
      return this.sendToLlama(messages, modelId, options);
    }
  }

  /**
   * Stream message to appropriate AI service for real-time responses
   */
  async *streamMessage(
    messages: AIMessage[],
    modelId: string,
    options: AIOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    console.log(`🤖 Streaming request to ${this.getServiceName(modelId)} for model: ${modelId}`);

    if (this.isOpenAIModel(modelId) && this.openaiService) {
      yield* this.streamFromOpenAI(messages, modelId, options);
    } else if (this.isGeminiModel(modelId) && this.geminiService) {
      yield* this.streamFromGemini(messages, modelId, options);
    } else {
      yield* this.streamFromLlama(messages, modelId, options);
    }
  }

  /**
   * Get service name for logging
   */
  private getServiceName(modelId: string): string {
    if (this.isOpenAIModel(modelId)) return 'OpenAI';
    if (this.isGeminiModel(modelId)) return 'Gemini';
    return 'Llama';
  }

  /**
   * Check if model should use OpenAI API
   */
  private isOpenAIModel(modelId: string): boolean {
    return modelId.startsWith('gpt-') || modelId.startsWith('o1-');
  }

  /**
   * Check if model should use Gemini API
   */
  private isGeminiModel(modelId: string): boolean {
    return modelId.startsWith('gemini');
  }

  /**
   * Send request to Gemini API
   */
  private async sendToGemini(
    messages: AIMessage[],
    modelId: string,
    options: AIOptions
  ): Promise<AIResponse> {
    if (!this.geminiService) {
      console.warn('🔄 Gemini service not available, falling back to Llama');
      return this.sendToLlama(messages, modelId, options);
    }

    try {
      // Convert messages to Gemini format
      const geminiMessages = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      // Add system prompt and RAG context if provided
      if (options.systemPrompt || options.ragContext) {
        let systemContent = options.systemPrompt || 'You are a helpful AI assistant.';
        
        // Add markdown formatting instructions to all AI responses
        systemContent += `\n\n## 📝 Response Formatting Guidelines

**ALWAYS format your responses using proper markdown:**
- Use **bold text** for emphasis and key points
- Use ## headings for main sections  
- Use ### subheadings for subsections
- Use numbered lists (1. 2. 3.) for step-by-step instructions
- Use bullet points (•) for feature lists and examples
- Use \`code formatting\` for technical terms and commands
- Use > blockquotes for important callouts
- Add line breaks between sections for readability

Make your responses visually appealing and easy to scan with proper formatting.`;
        
        if (options.ragContext) {
          systemContent += `\n\nUse the following context from the user's documents to provide relevant insights:\n\n${options.ragContext}\n\nBased on this context and your training, provide helpful, actionable advice.`;
        }

        // Find existing system message or add new one
        const hasSystemMessage = geminiMessages.some(msg => msg.role === 'system');
        if (hasSystemMessage) {
          geminiMessages.forEach(msg => {
            if (msg.role === 'system') {
              msg.content = systemContent;
            }
          });
        } else {
          geminiMessages.unshift({
            role: 'system',
            content: systemContent
          });
        }
      }

      console.log(`🧠 Sending request to Gemini model: ${modelId}`);
      
      const response = await this.geminiService.generateContent(geminiMessages, {
        model: modelId,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP
      });

      return {
        content: response.text,
        usage: {
          prompt_tokens: response.usage?.inputTokens || 0,
          completion_tokens: response.usage?.outputTokens || 0,
          total_tokens: response.usage?.totalTokens || 0
        },
        model: modelId
      };

    } catch (error) {
      console.error('🚨 Gemini API error, falling back to Llama:', error);
      return this.sendToLlama(messages, modelId, options);
    }
  }

  /**
   * Send request to OpenAI API
   */
  private async sendToOpenAI(
    messages: AIMessage[],
    modelId: string,
    options: AIOptions
  ): Promise<AIResponse> {
    if (!this.openaiService) {
      console.warn('🔄 OpenAI service not available, falling back to Llama');
      return this.sendToLlama(messages, modelId, options);
    }

    try {
      // Convert messages to OpenAI format
      const openaiMessages = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      console.log(`🧠 Sending request to OpenAI model: ${modelId}`);
      
      const response = await this.openaiService.chat(openaiMessages, {
        model: modelId,
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        ragContext: options.ragContext
      });

      return {
        content: response.content,
        usage: {
          prompt_tokens: response.usage?.promptTokens || 0,
          completion_tokens: response.usage?.completionTokens || 0,
          total_tokens: response.usage?.totalTokens || 0
        },
        model: modelId
      };

    } catch (error) {
      console.error('🚨 OpenAI API error, falling back to Llama:', error);
      return this.sendToLlama(messages, modelId, options);
    }
  }

  /**
   * Send request to Llama service
   */
  private async sendToLlama(
    messages: AIMessage[],
    modelId: string,
    options: AIOptions
  ): Promise<AIResponse> {
    console.log(`🦙 Sending request to Llama model: ${modelId}`);
    
    return this.llamaService.sendMessage(messages, modelId, options);
  }

  /**
   * Stream request to OpenAI API
   */
  private async *streamFromOpenAI(
    messages: AIMessage[],
    modelId: string,
    options: AIOptions
  ): AsyncGenerator<string, void, unknown> {
    if (!this.openaiService) {
      console.warn('🔄 OpenAI service not available, falling back to Llama');
      yield* this.streamFromLlama(messages, modelId, options);
      return;
    }

    try {
      // Convert messages to OpenAI format
      const openaiMessages = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      console.log(`🧠 Streaming from OpenAI model: ${modelId}`);
      
      const stream = this.openaiService.streamChat(openaiMessages, {
        model: modelId,
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        ragContext: options.ragContext
      });

      for await (const chunk of stream) {
        yield chunk;
      }

    } catch (error) {
      console.error('🚨 OpenAI streaming error, falling back to Llama:', error);
      yield* this.streamFromLlama(messages, modelId, options);
    }
  }

  /**
   * Stream request to Gemini API
   */
  private async *streamFromGemini(
    messages: AIMessage[],
    modelId: string,
    options: AIOptions
  ): AsyncGenerator<string, void, unknown> {
    if (!this.geminiService) {
      console.warn('🔄 Gemini service not available, falling back to Llama');
      yield* this.streamFromLlama(messages, modelId, options);
      return;
    }

    try {
      // For now, fall back to regular response and yield it all at once
      // TODO: Implement actual Gemini streaming when available
      const response = await this.sendToGemini(messages, modelId, options);
      yield response.content;
    } catch (error) {
      console.error('🚨 Gemini streaming error, falling back to Llama:', error);
      yield* this.streamFromLlama(messages, modelId, options);
    }
  }

  /**
   * Stream request to Llama service
   */
  private async *streamFromLlama(
    messages: AIMessage[],
    modelId: string,
    options: AIOptions
  ): AsyncGenerator<string, void, unknown> {
    try {
      console.log(`🦙 Streaming from Llama model: ${modelId}`);
      
      // For now, fall back to regular response and yield it all at once
      // TODO: Implement actual Llama streaming when available
      const response = await this.sendToLlama(messages, modelId, options);
      yield response.content;
    } catch (error) {
      console.error('🚨 Llama streaming error:', error);
      yield 'Sorry, I encountered an error processing your request. Please try again.';
    }
  }

  /**
   * Check if services are available
   */
  async checkAvailability(): Promise<{
    llama: boolean;
    gemini: boolean;
    openai: boolean;
  }> {
    const llamaAvailable = await this.llamaService.isServerRunning();
    const geminiAvailable = this.geminiService ? await this.geminiService.checkAvailability() : false;
    const openaiAvailable = this.openaiService ? await this.openaiService.testConnection() : false;

    return {
      llama: llamaAvailable,
      gemini: geminiAvailable,
      openai: openaiAvailable
    };
  }
}

export default AIServiceRouter; 
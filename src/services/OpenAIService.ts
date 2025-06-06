import OpenAI from 'openai';

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
}

export interface OpenAIChatOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  ragContext?: string;
}

export interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface OpenAIResponse {
  content: string;
  usage?: OpenAIUsage;
  model: string;
  finishReason?: string;
}

export class OpenAIService {
  private openai: OpenAI;
  private supportedModels = [
    'gpt-4o',
    'gpt-4o-mini', 
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1-preview',
    'o1-mini'
  ];

  constructor(config: OpenAIConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true // Allow in browser for React apps
    });
  }

  /**
   * Check if a model ID is supported by OpenAI
   */
  public isSupportedModel(modelId: string): boolean {
    return this.supportedModels.includes(modelId);
  }

  /**
   * Get list of available OpenAI models
   */
  public getAvailableModels(): string[] {
    return [...this.supportedModels];
  }

  /**
   * Test connection to OpenAI API
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.openai.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  /**
   * Send a chat completion request to OpenAI
   */
  public async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: OpenAIChatOptions = {}
  ): Promise<OpenAIResponse> {
    try {
      const {
        model = 'gpt-4o',
        systemPrompt,
        temperature = 0.7,
        maxTokens = 4000,
        ragContext
      } = options;

      // Build the messages array
      const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      // Add system prompt with RAG context and formatting instructions
      if (systemPrompt || ragContext) {
        let systemContent = systemPrompt || 'You are a helpful AI assistant.';
        
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

Make your responses visually appealing and easy to scan.`;

        if (ragContext) {
          systemContent += `\n\n## Context Information\n${ragContext}`;
        }

        apiMessages.push({
          role: 'system',
          content: systemContent
        });
      }

      // Add conversation messages
      apiMessages.push(...messages);

      console.log(`🤖 OpenAI: Sending request to ${model}...`);

      const response = await this.openai.chat.completions.create({
        model,
        messages: apiMessages,
        temperature,
        max_tokens: maxTokens,
        stream: false // Explicitly set to false for non-streaming
      }) as OpenAI.Chat.Completions.ChatCompletion;

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response choices returned from OpenAI');
      }

      const choice = response.choices[0];
      const content = choice.message?.content || '';
      
      const usage = response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined;

      console.log(`✅ OpenAI: Response received from ${model}`);
      if (usage) {
        console.log(`📊 OpenAI Usage: ${usage.totalTokens} tokens (${usage.promptTokens} prompt + ${usage.completionTokens} completion)`);
      }

      return {
        content,
        usage,
        model,
        finishReason: choice.finish_reason || undefined
      };

    } catch (error: any) {
      console.error('❌ OpenAI Error:', error);
      
      // Enhanced error handling with specific OpenAI error types
      if (error?.status === 401) {
        throw new Error('OpenAI API key is invalid or missing');
      } else if (error?.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error?.status === 403) {
        throw new Error('OpenAI API access denied. Check your subscription.');
      } else if (error?.status === 404) {
        throw new Error(`OpenAI model "${options.model}" not found or not accessible`);
      } else {
        throw new Error(`OpenAI API error: ${error?.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Stream a chat completion response (for future real-time features)
   */
  public async *streamChat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: OpenAIChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    try {
      const {
        model = 'gpt-4o',
        systemPrompt,
        temperature = 0.7,
        maxTokens = 4000,
        ragContext
      } = options;

      // Build messages (same as above)
      const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      if (systemPrompt || ragContext) {
        let systemContent = systemPrompt || 'You are a helpful AI assistant.';
        
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

Make your responses visually appealing and easy to scan.`;

        if (ragContext) {
          systemContent += `\n\n## Context Information\n${ragContext}`;
        }

        apiMessages.push({
          role: 'system',
          content: systemContent
        });
      }

      apiMessages.push(...messages);

      const stream = await this.openai.chat.completions.create({
        model,
        messages: apiMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }

    } catch (error: any) {
      console.error('❌ OpenAI Streaming Error:', error);
      throw new Error(`OpenAI streaming error: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Code execution capabilities (for future features)
   */
  public async executeCode(code: string, language: string = 'python'): Promise<string> {
    // Note: OpenAI doesn't have built-in code execution like Gemini
    // This would require a separate code execution service
    console.warn('⚠️ OpenAI Service: Code execution not directly supported. Consider using Code Interpreter via ChatGPT API.');
    return `Code execution not available in OpenAI service. Code provided:\n\`\`\`${language}\n${code}\n\`\`\``;
  }

  /**
   * Check model availability and status
   */
  public async getModelStatus(): Promise<{ [key: string]: boolean }> {
    const status: { [key: string]: boolean } = {};
    
    try {
      const models = await this.openai.models.list();
      const availableModelIds = models.data.map(m => m.id);
      
      for (const model of this.supportedModels) {
        status[model] = availableModelIds.includes(model);
      }
    } catch (error) {
      console.error('Error checking OpenAI model status:', error);
      // Mark all as offline if we can't connect
      for (const model of this.supportedModels) {
        status[model] = false;
      }
    }
    
    return status;
  }
} 
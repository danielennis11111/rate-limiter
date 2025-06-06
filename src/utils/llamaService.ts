// Llama Stack Integration Service
// This service connects to the llama-stack server for actual AI responses

interface LlamaResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

// Ollama API interfaces - removed unused OllamaRequest interface

export class LlamaService {
  private baseUrl: string;
  private availableModels: string[] = [];

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  // Check if Ollama server is running
  async isServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.log('Ollama server not running:', error);
      return false;
    }
  }

  // Send a chat completion request
  async sendMessage(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model: string = 'Llama3.2-3B-Instruct',
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      ragContext?: string;
      systemPrompt?: string;
    } = {}
  ): Promise<LlamaResponse> {
    
    const serverRunning = await this.isServerRunning();
    
    if (!serverRunning) {
      // Return simulated response when server isn't running
      return this.getSimulatedResponse(messages, model, options);
    }

    try {
      // Prepare the request with system prompt and RAG context if provided
      let processedMessages = [...messages];
      
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
        
        const systemMessage = {
          role: 'system' as const,
          content: systemContent
        };
        
        // Replace existing system message or add new one
        const hasSystemMessage = processedMessages.some(msg => msg.role === 'system');
        if (hasSystemMessage) {
          processedMessages = processedMessages.map(msg => 
            msg.role === 'system' ? systemMessage : msg
          );
        } else {
          processedMessages = [systemMessage, ...processedMessages];
        }
      }

      // Convert model name to Ollama format
      const ollamaModel = model.includes('3.2-3B') ? 'llama3.2:3b' : 
                         model.includes('3.2-11B') ? 'llama3.2:11b' :
                         model.includes('Llama-4') ? 'llama3.2:3b' : // Fallback to 3B for now
                         'llama3.2:3b';

      // Prepare messages for Ollama format
      const messageText = processedMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n') + '\nassistant:';

      const ollamaRequest = {
        model: ollamaModel,
        prompt: messageText,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
          num_predict: options.maxTokens || 500,
        },
        stream: false
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ollamaRequest)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.response,
        usage: {
          prompt_tokens: data.prompt_eval_count || 0,
          completion_tokens: data.eval_count || 0,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        model: ollamaModel
      };

    } catch (error) {
      console.error('Llama API request failed:', error);
      // Fallback to simulated response
      return this.getSimulatedResponse(messages, model, options);
    }
  }

  // Simulated response for when Llama Stack isn't available
  private getSimulatedResponse(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model: string,
    options: { ragContext?: string } = {}
  ): LlamaResponse {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    let simulatedContent = '';
    
    if (options.ragContext) {
      simulatedContent = `Based on your uploaded documents, I understand you're asking about "${lastUserMessage}". 

From the context in your knowledge base, here are some relevant insights:
${options.ragContext.substring(0, 300)}...

This suggests that focusing on evidence-based approaches and systematic thinking can help address the challenges you're facing. The research indicates that breaking down complex problems into manageable components and applying structured methodologies leads to better outcomes.

Would you like me to elaborate on any specific aspect of this topic using the information from your documents?

[Note: Ollama server not running - this is a simulated response. Start Ollama to get real AI responses.]`;
    } else {
      simulatedContent = `I understand you're asking about "${lastUserMessage}". 

This is a simulated response because the Llama Stack server isn't currently running. To help you work through mental blockers and maintain focus, I would typically:

1. Analyze the specific challenge you're facing
2. Suggest evidence-based strategies for overcoming the blocker
3. Provide actionable steps you can take immediately
4. Help you break down complex problems into manageable parts

To get real AI-powered responses, please start the Llama Stack server with one of your downloaded models.

[Note: Start Ollama server for real AI responses]`;
    }

    // Estimate tokens (rough approximation)
    const promptTokens = messages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0);
    const completionTokens = Math.ceil(simulatedContent.length / 4);

    return {
      content: simulatedContent,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      },
      model: model + ' (simulated)'
    };
  }

  // Get model info for the UI
  getModelInfo(modelName: string): {
    name: string;
    displayName: string;
    contextWindow: number;
    description: string;
    capabilities: string[];
  } {
    const modelInfo: Record<string, any> = {
      'Llama3.2-3B-Instruct': {
        name: 'Llama3.2-3B-Instruct',
        displayName: 'Llama 3.2 (3B) via Ollama',
        contextWindow: 128000,
        description: 'Fast, efficient model running locally via Ollama',
        capabilities: ['text', 'conversation', 'fast-response', 'local']
      },
      'Llama3.2-11B-Vision-Instruct': {
        name: 'Llama3.2-11B-Vision-Instruct',
        displayName: 'Llama 3.2 Vision (11B) via Ollama',
        contextWindow: 128000,
        description: 'Multimodal model (requires download via Ollama)',
        capabilities: ['text', 'vision', 'multimodal', 'image-analysis', 'local']
      },
      'Llama-4-Scout-17B-16E-Instruct': {
        name: 'Llama-4-Scout-17B-16E-Instruct',
        displayName: 'Llama 4 Scout (via Ollama)',
        contextWindow: 128000, // Ollama context limit
        description: 'Latest Llama 4 model (requires download via Ollama)',
        capabilities: ['text', 'reasoning', 'analysis', 'local']
      },
      'Llama-4-Maverick-17B-128E-Instruct': {
        name: 'Llama-4-Maverick-17B-128E-Instruct',
        displayName: 'Llama 4 Maverick (via Ollama)',
        contextWindow: 128000, // Ollama context limit
        description: 'Advanced Llama 4 model (requires download via Ollama)',
        capabilities: ['text', 'reasoning', 'analysis', 'local']
      }
    };

    return modelInfo[modelName] || {
      name: modelName,
      displayName: modelName,
      contextWindow: 128000,
      description: 'Unknown model',
      capabilities: ['text']
    };
  }
} 
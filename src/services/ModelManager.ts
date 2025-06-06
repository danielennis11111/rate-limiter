import { AIModel, ModelStatus } from '../types/index';

export class ModelManager {
  private models: Map<string, AIModel> = new Map();
  private statusCache: Map<string, ModelStatus> = new Map();
  private statusCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeModels();
    this.startStatusMonitoring();
  }

  private initializeModels(): void {
    const defaultModels: AIModel[] = [
      {
        id: 'llama3.2:3b',
        name: 'Llama 3.2 3B',
        description: 'Fast and efficient general-purpose model',
        status: 'offline',
        capabilities: ['text-generation', 'conversation', 'reasoning'],
        maxTokens: 128000,
        isMultimodal: false
      },
      {
        id: 'llama3.2:11b-vision',
        name: 'Llama 3.2 11B Vision',
        description: 'Multimodal model with vision capabilities',
        status: 'offline',
        capabilities: ['text-generation', 'vision', 'image-analysis'],
        maxTokens: 128000,
        isMultimodal: true
      },
      {
        id: 'llama3.1:8b',
        name: 'Llama 3.1 8B',
        description: 'Balanced performance and capability',
        status: 'offline',
        capabilities: ['text-generation', 'conversation', 'coding'],
        maxTokens: 128000,
        isMultimodal: false
      }
    ];

    defaultModels.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  async checkModelStatus(modelId: string): Promise<ModelStatus> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const startTime = Date.now();
    
    try {
      // Check if Ollama is running and model is available
      const response = await fetch('http://localhost:11434/api/tags');
      
      if (!response.ok) {
        throw new Error('Ollama server not running');
      }

      const data = await response.json();
      const availableModels = data.models || [];
      const isModelAvailable = availableModels.some((m: any) => 
        m.name.includes(modelId.split(':')[0])
      );

      const responseTime = Date.now() - startTime;
      const status: ModelStatus = {
        modelId,
        isRunning: isModelAvailable,
        lastChecked: new Date(),
        responseTime
      };

      // Update model status
      model.status = isModelAvailable ? 'online' : 'offline';
      this.statusCache.set(modelId, status);

      return status;
    } catch (error) {
      const status: ModelStatus = {
        modelId,
        isRunning: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      model.status = 'offline';
      this.statusCache.set(modelId, status);

      return status;
    }
  }

  async checkAllModels(): Promise<ModelStatus[]> {
    const statusPromises = Array.from(this.models.keys()).map(
      modelId => this.checkModelStatus(modelId)
    );
    
    return Promise.all(statusPromises);
  }

  private startStatusMonitoring(): void {
    // Check status every 30 seconds
    this.statusCheckInterval = setInterval(() => {
      this.checkAllModels().catch(console.error);
    }, 30000);

    // Initial check
    this.checkAllModels().catch(console.error);
  }

  stopStatusMonitoring(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  getModel(modelId: string): AIModel | undefined {
    return this.models.get(modelId);
  }

  getAllModels(): AIModel[] {
    return Array.from(this.models.values());
  }

  getOnlineModels(): AIModel[] {
    return this.getAllModels().filter(model => model.status === 'online');
  }

  getModelStatus(modelId: string): ModelStatus | undefined {
    return this.statusCache.get(modelId);
  }

  async refreshModelStatus(): Promise<void> {
    await this.checkAllModels();
  }

  addModel(model: AIModel): void {
    this.models.set(model.id, model);
  }

  removeModel(modelId: string): void {
    this.models.delete(modelId);
    this.statusCache.delete(modelId);
  }
} 
export interface AIModel {
  id: string;
  name: string;
  description: string;
  status: 'online' | 'offline' | 'loading';
  capabilities: string[];
  maxTokens: number;
  isMultimodal?: boolean;
}

export interface ConversationTemplate {
  id: string;
  name: string;
  description: string;
  modelId: string;
  systemPrompt: string;
  icon: string;
  color: string;
  capabilities: string[];
  suggestedQuestions: string[];
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  features: {
    ragEnabled: boolean;
    contextOptimization: boolean;
    rateLimiting: boolean;
    multimodal: boolean;
    toolCalling: boolean;
    streamingEnabled: boolean;
    contextLength: number;
    supportedImageFormats?: string[];
    maxImageSize?: string;
    imageTokenRatio?: string;
    edgeOptimized?: boolean;
    privacyFocused?: boolean;
    ultraLongContext?: boolean;
    beatsGPT4o?: boolean;
    industryLeading?: boolean;
    safetyFocused?: boolean;
    contentModeration?: boolean;
    researchFocused?: boolean;
    scientificRigor?: boolean;
    professionalVision?: boolean;
    scientificImaging?: boolean;
  };
}

export interface Conversation {
  id: string;
  templateId: string;
  messages: Message[];
  title: string;
  lastUpdated: Date;
  isActive: boolean;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  tokens?: number;
  modelUsed?: string;
  attachments?: any[];
}

export interface ModelStatus {
  modelId: string;
  isRunning: boolean;
  lastChecked: Date;
  responseTime?: number;
  error?: string;
} 
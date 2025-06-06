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
  features: string[];
  demoQuestions: string[];
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
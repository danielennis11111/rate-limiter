export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  tokenCount: number;
}

export interface ContextWindowInfo {
  currentTokens: number;
  maxTokens: number;
  warningThreshold: number; // percentage when to show warning
  modelName: string;
}

export interface ModelInfo {
  name: string;
  maxContextTokens: number;
  description: string;
}

export interface RateLimitInfo {
  currentRequests: number;
  maxRequests: number;
  resetTime: Date;
  isBlocked: boolean;
} 
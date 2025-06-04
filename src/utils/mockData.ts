import { Conversation, Message, ModelInfo } from '../types';

// Mock conversations for demo purposes
export const mockConversations: Conversation[] = [
  {
    id: '1',
    title: 'Help me understand what things typically break my focus, so I can think more clearly',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    tokenCount: 15420,
    messages: [
      {
        id: 'm1',
        content: 'Help me understand what things typically break my focus, so I can think more clearly',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isUser: true
      },
      {
        id: 'm2', 
        content: 'I can help you identify common focus blockers and strategies to maintain mental clarity. Common focus breakers include: digital distractions (notifications, social media), multitasking, lack of clear priorities, decision fatigue, environmental noise, and unresolved emotional stress. Would you like me to walk you through a personalized assessment of your specific focus challenges?',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30000),
        isUser: false
      }
    ]
  },
  {
    id: '2', 
    title: 'Help me understand what things typically break my...',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    tokenCount: 12800,
    messages: [
      {
        id: 'm3',
        content: 'Can you help me organize my thoughts for a presentation?',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        isUser: true
      }
    ]
  },
  {
    id: '3',
    title: 'Walk me through using a Zoom recording transcript...',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    tokenCount: 8900,
    messages: []
  },
  {
    id: '4',
    title: 'can you tell me about yourself and what you can do',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    tokenCount: 5600,
    messages: []
  },
  {
    id: '5',
    title: 'can you tell me about what you understand about...',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    tokenCount: 7200,
    messages: []
  },
  {
    id: '6',
    title: 'Help me understand what things typically break my...',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    tokenCount: 11200,
    messages: []
  },
  {
    id: '7',
    title: 'Walk me through using a Zoom recording transcript...',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    tokenCount: 9800,
    messages: []
  },
  {
    id: '8',
    title: 'Help me understand what things typically break my...',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago (May)
    tokenCount: 13400,
    messages: []
  },
  {
    id: '9',
    title: 'Walk me through using a Zoom recording transcript...',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago (May)
    tokenCount: 6700,
    messages: []
  }
];

// Available AI models with different context windows
export const availableModels: ModelInfo[] = [
  {
    name: 'GPT-3.5 Turbo',
    maxContextTokens: 16385,
    description: 'Fast and efficient for most tasks'
  },
  {
    name: 'GPT-4',
    maxContextTokens: 32768,
    description: 'More capable reasoning, longer context'
  },
  {
    name: 'GPT-4 Turbo',
    maxContextTokens: 128000,
    description: 'Newest model with extended context window'
  },
  {
    name: 'Claude-3 Sonnet',
    maxContextTokens: 200000,
    description: 'High-performance model with very large context'
  }
];

// Simulate token counting (in real app, this would come from API)
export const estimateTokenCount = (text: string): number => {
  // Rough estimation: ~1 token per 4 characters for English text
  return Math.ceil(text.length / 4);
};

// Generate mock conversation with high token count to trigger warning
export const generateHighTokenConversation = (): Conversation => {
  const messages: Message[] = [];
  let totalTokens = 0;
  
  // Generate enough messages to approach context limit
  for (let i = 0; i < 50; i++) {
    const userMessage = `This is user message ${i + 1}. I'm asking about something that requires a detailed response to help me understand the concept better.`;
    const assistantMessage = `This is a detailed response from the assistant for message ${i + 1}. I'm providing comprehensive information that includes multiple paragraphs, examples, and explanations to help you understand the topic thoroughly. This response is intentionally long to simulate how context windows fill up during extended conversations.`;
    
    const userTokens = estimateTokenCount(userMessage);
    const assistantTokens = estimateTokenCount(assistantMessage);
    
    totalTokens += userTokens + assistantTokens;
    
    messages.push({
      id: `user-${i}`,
      content: userMessage,
      timestamp: new Date(Date.now() - (50 - i) * 60000), // 1 minute intervals
      isUser: true
    });
    
    messages.push({
      id: `assistant-${i}`,
      content: assistantMessage, 
      timestamp: new Date(Date.now() - (50 - i) * 60000 + 30000), // 30 seconds after user
      isUser: false
    });
  }
  
  return {
    id: 'high-token-conversation',
    title: 'Extended conversation approaching context limit',
    createdAt: new Date(),
    tokenCount: totalTokens,
    messages
  };
}; 
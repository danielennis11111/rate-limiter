import { ConversationTemplate } from '../types/index';

export const conversationTemplates: ConversationTemplate[] = [
  {
    id: 'general-assistant',
    name: 'General Assistant',
    description: 'Helpful, harmless, and honest AI assistant',
    modelId: 'llama3.2:3b',
    systemPrompt: 'You are a helpful, harmless, and honest AI assistant. Provide clear, accurate, and helpful responses to user questions.',
    icon: '🤖',
    color: '#3B82F6',
    features: ['General Q&A', 'Problem Solving', 'Information Lookup'],
    demoQuestions: [
      'What are the benefits of exercise?',
      'How do I learn a new programming language?',
      'Explain quantum computing in simple terms'
    ]
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'Imaginative storyteller and creative writing assistant',
    modelId: 'llama3.1:8b',
    systemPrompt: 'You are a creative writing assistant. Help users craft engaging stories, develop characters, and explore imaginative scenarios. Be creative, inspiring, and encourage artistic expression.',
    icon: '✍️',
    color: '#8B5CF6',
    features: ['Story Writing', 'Character Development', 'Creative Prompts'],
    demoQuestions: [
      'Write a short story about a time traveler',
      'Help me develop a fantasy character',
      'Give me creative writing prompts for sci-fi'
    ]
  },
  {
    id: 'code-mentor',
    name: 'Code Mentor',
    description: 'Expert programming tutor and code reviewer',
    modelId: 'llama3.1:8b',
    systemPrompt: 'You are an expert programming mentor. Help users learn coding concepts, debug issues, write better code, and understand best practices. Provide clear explanations and practical examples.',
    icon: '👨‍💻',
    color: '#10B981',
    features: ['Code Review', 'Debugging Help', 'Best Practices'],
    demoQuestions: [
      'Explain React hooks with examples',
      'Help me debug this JavaScript function',
      'What are SOLID principles in programming?'
    ]
  },
  {
    id: 'study-buddy',
    name: 'Study Buddy',
    description: 'Learning companion for academic subjects',
    modelId: 'llama3.2:3b',
    systemPrompt: 'You are a patient and encouraging study companion. Help users understand complex topics, break down difficult concepts, and create effective study strategies.',
    icon: '📚',
    color: '#F59E0B',
    features: ['Concept Explanation', 'Study Plans', 'Quiz Generation'],
    demoQuestions: [
      'Explain photosynthesis step by step',
      'Help me understand calculus derivatives',
      'Create a study plan for learning Spanish'
    ]
  },
  {
    id: 'vision-analyst',
    name: 'Vision Analyst',
    description: 'Multimodal AI that can analyze images and visual content',
    modelId: 'llama3.2:11b-vision',
    systemPrompt: 'You are a vision-capable AI assistant. Analyze images, describe visual content, identify objects, read text from images, and provide insights about visual data.',
    icon: '👁️',
    color: '#EF4444',
    features: ['Image Analysis', 'OCR', 'Visual Description'],
    demoQuestions: [
      'Describe what you see in this image',
      'Extract text from this document photo',
      'Analyze the composition of this artwork'
    ]
  },
  {
    id: 'productivity-coach',
    name: 'Productivity Coach',
    description: 'Personal efficiency and organization expert',
    modelId: 'llama3.2:3b',
    systemPrompt: 'You are a productivity and organization coach. Help users optimize their workflows, manage time effectively, set goals, and build better habits.',
    icon: '⚡',
    color: '#06B6D4',
    features: ['Time Management', 'Goal Setting', 'Habit Building'],
    demoQuestions: [
      'Help me create a morning routine',
      'How can I manage my time better?',
      'What are some productivity techniques?'
    ]
  }
]; 
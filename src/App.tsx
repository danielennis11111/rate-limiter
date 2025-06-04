import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { Conversation, Message, ContextWindowInfo, RateLimitInfo } from './types';
import { mockConversations, availableModels, estimateTokenCount, generateHighTokenConversation } from './utils/mockData';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([
    ...mockConversations,
    generateHighTokenConversation() // Add high-token conversation to demo warning
  ]);
  const [activeConversationId, setActiveConversationId] = useState<string>('high-token-conversation');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState('GPT-3.5 Turbo');
  
  // Rate limit state (15 requests per minute for demo)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({
    currentRequests: 9, // Start with 9 requests to demo the 11th request trigger
    maxRequests: 15,
    resetTime: new Date(Date.now() + 60000), // Reset in 1 minute
    isBlocked: false
  });
  const [showRateLimit, setShowRateLimit] = useState(false);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const currentModelInfo = availableModels.find(m => m.name === currentModel)!;

  // Calculate context window info for the active conversation
  const contextInfo: ContextWindowInfo = {
    currentTokens: activeConversation?.tokenCount || 0,
    maxTokens: currentModelInfo.maxContextTokens,
    warningThreshold: 75, // Show warning at 75% of context window
    modelName: currentModel
  };

  const handleSendMessage = (content: string, knowledgeBaseEnabled = false) => {
    if (!activeConversationId) return;

    // Check rate limit
    if (rateLimitInfo.isBlocked || rateLimitInfo.currentRequests >= rateLimitInfo.maxRequests) {
      // Update rate limit to show it's blocked
      setRateLimitInfo(prev => ({ ...prev, isBlocked: true }));
      return;
    }

    const newRequestCount = rateLimitInfo.currentRequests + 1;

    // Show rate limit indicator starting from 11th request
    if (newRequestCount >= 11) {
      setShowRateLimit(true);
    }

    // Increment request count
    setRateLimitInfo(prev => ({
      ...prev,
      currentRequests: newRequestCount,
      isBlocked: newRequestCount >= prev.maxRequests
    }));

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content,
      timestamp: new Date(),
      isUser: true
    };

    // Simulate AI response with knowledge base context if enabled
    const aiResponseContent = knowledgeBaseEnabled 
      ? `I understand you're asking about: "${content}". Based on our knowledge base scan of focus and productivity resources, here are some evidence-based insights: This is a simulated response that incorporates information from mental health research, cognitive science papers, and productivity frameworks. In a real implementation, this would search through relevant documents and provide contextual answers with citations.`
      : `I understand you're asking about: "${content}". This is a simulated response that would help you work through your mental blockers and stay focused. In a real implementation, this would connect to an AI model to provide personalized assistance.`;

    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      content: aiResponseContent,
      timestamp: new Date(Date.now() + 1000),
      isUser: false
    };

    // Calculate tokens including knowledge base overhead
    const baseTokens = estimateTokenCount(content) + estimateTokenCount(aiResponse.content);
    const knowledgeBaseTokens = knowledgeBaseEnabled ? 850 : 0; // Knowledge base scan cost
    const systemInstructionTokens = 180; // System instructions overhead
    const totalNewTokens = baseTokens + knowledgeBaseTokens + systemInstructionTokens;

    setConversations(prevConversations =>
      prevConversations.map(conv =>
        conv.id === activeConversationId
          ? {
              ...conv,
              messages: [...conv.messages, newMessage, aiResponse],
              tokenCount: conv.tokenCount + totalNewTokens
            }
          : conv
      )
    );
  };

  const handleRateLimitReset = () => {
    // Reset rate limit every minute and hide the indicator
    setRateLimitInfo({
      currentRequests: 0,
      maxRequests: 15,
      resetTime: new Date(Date.now() + 60000), // Next reset in 1 minute
      isBlocked: false
    });
    setShowRateLimit(false); // Hide rate limit indicator when reset
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New conversation',
      messages: [],
      createdAt: new Date(),
      tokenCount: 0
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setSidebarOpen(false);
  };

  const handleStartNewChat = () => {
    handleNewConversation();
  };

  const handleSwitchModel = (modelName: string) => {
    setCurrentModel(modelName);
    // In a real app, you might want to show a confirmation or update the backend
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />
      <MainContent
        messages={activeConversation?.messages || []}
        onSendMessage={handleSendMessage}
        onToggleSidebar={toggleSidebar}
        contextInfo={contextInfo}
        availableModels={availableModels}
        onStartNewChat={handleStartNewChat}
        onSwitchModel={handleSwitchModel}
        rateLimitInfo={rateLimitInfo}
        onRateLimitReset={handleRateLimitReset}
        showRateLimit={showRateLimit}
      />
    </div>
  );
}

export default App; 
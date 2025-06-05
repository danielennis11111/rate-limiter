import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { ContextOptimizationPanel } from './components/ContextOptimizationPanel';
import { Conversation, Message, ContextWindowInfo, RateLimitInfo, OptimizationAction, PDFDocument } from './types';
import { availableModels, estimateTokenCount } from './utils/mockData';
import { ContextOptimizationManager } from './utils/contextOptimizationManager';
import { PDFProcessor } from './utils/pdfProcessor';

function App() {
  // Start with clean state instead of mock data
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState('Gemini 2.0 Flash');
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(false);
  
  // RAG state
  const [ragEnabled, setRagEnabled] = useState(false);
  const [uploadedPDFs, setUploadedPDFs] = useState<PDFDocument[]>([]);
  
  // Context optimization manager
  const [optimizationManager] = useState(() => ContextOptimizationManager.getInstance());
  const [optimizationState, setOptimizationState] = useState(() => optimizationManager.getState());
  
  // Rate limit state (15 requests per minute for demo)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({
    currentRequests: 0, // Start fresh
    maxRequests: 15,
    resetTime: new Date(Date.now() + 60000), // Reset in 1 minute
    isBlocked: false,
    emergencyModeTriggered: false
  });
  const [showRateLimit, setShowRateLimit] = useState(false);

  // Create a default conversation if none exists
  useEffect(() => {
    if (conversations.length === 0) {
      const defaultConversation: Conversation = {
        id: `conv-${Date.now()}`,
        title: 'New conversation',
        messages: [],
        createdAt: new Date(),
        tokenCount: 0,
        compressionEnabled: false
      };
      setConversations([defaultConversation]);
      setActiveConversationId(defaultConversation.id);
    }
  }, [conversations.length]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const currentModelInfo = availableModels.find(m => m.name === currentModel)!;

  // Calculate total tokens across all conversations for optimization
  const totalTokens = conversations.reduce((sum, conv) => sum + conv.tokenCount, 0);

  // Calculate context window info for the active conversation
  const contextInfo: ContextWindowInfo = {
    currentTokens: activeConversation?.tokenCount || 0,
    maxTokens: currentModelInfo.maxContextTokens,
    warningThreshold: 75, // Show warning at 75% of context window
    modelName: currentModel,
    compressionActive: activeConversation?.compressionEnabled || false,
    optimizationScore: optimizationState.emergencyMode.active ? 0.3 : 0.8
  };

  // Auto-optimize when token usage gets high
  useEffect(() => {
    if (totalTokens > optimizationState.settings.compressionThreshold) {
      const result = optimizationManager.autoOptimize(conversations, totalTokens);
      if (result.actionsPerformed.length > 0) {
        setConversations(result.optimizedConversations);
        setOptimizationState(optimizationManager.getState());
        
        // Show optimization panel when auto-optimization occurs
        setShowOptimizationPanel(true);
      }
    }
  }, [totalTokens, conversations, optimizationManager, optimizationState.settings.compressionThreshold]);

  // Handle optimization actions from the UI
  const handleOptimizationAction = async (action: OptimizationAction) => {
    try {
      const result = await optimizationManager.handleOptimizationAction(action);
      setOptimizationState(optimizationManager.getState());
      
      // Handle specific action results
      if (result.type === 'emergency_mode' && result.result?.success) {
        setRateLimitInfo(prev => ({ ...prev, emergencyModeTriggered: true }));
      }
      
      if (result.type === 'search' && result.payload.results) {
        // Handle search results - could show in a modal or panel
        console.log('Search results:', result.payload.results);
      }
      
      return result;
    } catch (error) {
      console.error('Optimization action failed:', error);
    }
  };

  const handleSendMessage = (content: string, knowledgeBaseEnabled = false) => {
    if (!activeConversationId) return;

    // Check rate limit
    if (rateLimitInfo.isBlocked || rateLimitInfo.currentRequests >= rateLimitInfo.maxRequests) {
      // Update rate limit to show it's blocked
      setRateLimitInfo(prev => ({ ...prev, isBlocked: true }));
      return;
    }

    // Use the actual RAG state instead of parameter
    const useRAG = ragEnabled && uploadedPDFs.length > 0;

    // Check emergency mode restrictions
    if (optimizationState.emergencyMode.active) {
      const restrictedFeatures = optimizationState.emergencyMode.reducedFeatures;
      if (restrictedFeatures.includes('knowledge_base')) {
        // Disable RAG in emergency mode
      }
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

    // Index the new message for search/optimization
    optimizationManager.indexNewMessage(newMessage, activeConversationId);

    // Generate AI response with RAG context if enabled
    let aiResponseContent = '';
    let ragContext = '';
    
    if (useRAG && !optimizationState.emergencyMode.active) {
      // Search through uploaded PDFs for relevant content
      const allChunks = uploadedPDFs.flatMap(pdf => pdf.chunks || []);
      const relevantChunks = PDFProcessor.searchPDFChunks(allChunks, content);
      
      if (relevantChunks.length > 0) {
        ragContext = relevantChunks.slice(0, 3).map(chunk => 
          `[${chunk.metadata.section}]: ${chunk.content.substring(0, 200)}...`
        ).join('\n\n');
        
        aiResponseContent = `Based on your uploaded documents, I found relevant information about "${content}":\n\n${ragContext}\n\nThis information suggests that ${content.toLowerCase()} is an important topic covered in your knowledge base. The documents provide evidence-based insights that can help you work through mental blockers and maintain focus. Would you like me to elaborate on any specific aspect?`;
      } else {
        aiResponseContent = `I searched through your uploaded documents but didn't find specific information about "${content}". However, I can still help you work through this topic. Consider uploading more relevant documents or asking about topics covered in your current knowledge base.`;
      }
    } else if (optimizationState.emergencyMode.active) {
      aiResponseContent = `[Emergency Mode] Brief response: "${content}". Due to system constraints, providing concise assistance only.`;
    } else {
      aiResponseContent = `I understand you're asking about: "${content}". This is a simulated response that would help you work through your mental blockers and stay focused. In a real implementation, this would connect to an AI model to provide personalized assistance.`;
    }

    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      content: aiResponseContent,
      timestamp: new Date(Date.now() + 1000),
      isUser: false
    };

    // Index the AI response too
    optimizationManager.indexNewMessage(aiResponse, activeConversationId);

    // Calculate tokens including RAG overhead
    const baseTokens = estimateTokenCount(content) + estimateTokenCount(aiResponse.content);
    const ragTokens = useRAG && !optimizationState.emergencyMode.active ? 
      uploadedPDFs.reduce((sum, pdf) => sum + Math.min(pdf.tokenCount, 850), 0) : 0; // Cap RAG tokens per PDF
    const systemInstructionTokens = optimizationState.emergencyMode.active ? 50 : 180; // Reduced in emergency mode
    const totalNewTokens = baseTokens + ragTokens + systemInstructionTokens;

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

    // Update optimization state
    setOptimizationState(optimizationManager.getState());
  };

  const handleRateLimitReset = () => {
    // Reset rate limit every minute and hide the indicator
    setRateLimitInfo({
      currentRequests: 0,
      maxRequests: 15,
      resetTime: new Date(Date.now() + 60000), // Next reset in 1 minute
      isBlocked: false,
      emergencyModeTriggered: false
    });
    setShowRateLimit(false); // Hide rate limit indicator when reset
    
    // Deactivate emergency mode if it was triggered by rate limits
    if (optimizationState.emergencyMode.reason === 'rate_limit') {
      optimizationManager.deactivateEmergencyMode();
      setOptimizationState(optimizationManager.getState());
    }
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
      tokenCount: 0,
      compressionEnabled: false
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

  const toggleOptimizationPanel = () => {
    setShowOptimizationPanel(!showOptimizationPanel);
  };

  // RAG handlers
  const handleToggleRAG = (enabled: boolean) => {
    setRagEnabled(enabled);
  };

  const handleUploadPDF = async (file: File): Promise<void> => {
    try {
      const processedPDF = await PDFProcessor.processPDF(file);
      const pdfDocument: PDFDocument = {
        id: processedPDF.id,
        name: processedPDF.name,
        size: processedPDF.size,
        pageCount: processedPDF.pageCount,
        uploadedAt: processedPDF.uploadedAt,
        tokenCount: processedPDF.tokenCount,
        chunks: processedPDF.chunks
      };
      
      setUploadedPDFs(prev => [...prev, pdfDocument]);
    } catch (error) {
      console.error('Failed to upload PDF:', error);
      throw error;
    }
  };

  const handleRemovePDF = (id: string) => {
    setUploadedPDFs(prev => prev.filter(pdf => pdf.id !== id));
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
      
      <div className="flex-1 flex flex-col">
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
          onToggleOptimization={toggleOptimizationPanel}
          optimizationActive={showOptimizationPanel}
          ragEnabled={ragEnabled}
          onToggleRAG={handleToggleRAG}
          uploadedPDFs={uploadedPDFs}
          onUploadPDF={handleUploadPDF}
          onRemovePDF={handleRemovePDF}
        />
        
        {/* Context Optimization Panel */}
        {showOptimizationPanel && (
          <div className="w-80 border-l bg-white flex-shrink-0">
            <ContextOptimizationPanel
              optimizationState={optimizationState}
              onOptimizationAction={handleOptimizationAction}
              currentTokens={totalTokens}
              maxTokens={currentModelInfo.maxContextTokens}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 
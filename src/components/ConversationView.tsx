import React, { useState, useRef, useEffect } from 'react';
import { Conversation, ConversationTemplate, Message } from '../types/index';
import { ConversationManager } from '../services/ConversationManager';
import { ModelManager } from '../services/ModelManager';
import { LlamaService } from '../utils/llamaService';
import { PDFProcessor } from '../utils/pdfProcessor';
import { ContextOptimizationManager } from '../utils/contextOptimizationManager';
import { estimateTokenCount } from '../utils/mockData';

interface ConversationViewProps {
  conversation: Conversation;
  template: ConversationTemplate;
  conversationManager: ConversationManager;
  modelManager: ModelManager;
  onConversationUpdate: () => void;
}

interface PDFDocument {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  uploadedAt: Date;
  tokenCount: number;
  chunks?: any[];
}

interface RateLimitInfo {
  currentRequests: number;
  maxRequests: number;
  resetTime: Date;
  isBlocked: boolean;
  emergencyModeTriggered: boolean;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  template,
  conversationManager,
  modelManager,
  onConversationUpdate
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llamaService] = useState(() => new LlamaService());
  const [optimizationManager] = useState(() => ContextOptimizationManager.getInstance());
  const [ragEnabled, setRagEnabled] = useState(false);
  const [uploadedPDFs, setUploadedPDFs] = useState<PDFDocument[]>([]);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({
    currentRequests: 0,
    maxRequests: 15,
    resetTime: new Date(Date.now() + 60000),
    isBlocked: false,
    emergencyModeTriggered: false
  });
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  useEffect(() => {
    // Auto-reset rate limit every minute
    const interval = setInterval(() => {
      setRateLimitInfo(prev => ({
        ...prev,
        currentRequests: 0,
        isBlocked: false,
        resetTime: new Date(Date.now() + 60000)
      }));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check rate limit
    if (rateLimitInfo.isBlocked || rateLimitInfo.currentRequests >= rateLimitInfo.maxRequests) {
      alert('Rate limit exceeded. Please wait for reset.');
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Update rate limit
    setRateLimitInfo(prev => ({
      ...prev,
      currentRequests: prev.currentRequests + 1,
      isBlocked: prev.currentRequests + 1 >= prev.maxRequests
    }));

    try {
      // Add user message
      const userMsg: Omit<Message, 'id' | 'timestamp'> = {
        content: userMessage,
        role: 'user'
      };
      
      const addedUserMsg = conversationManager.addMessage(conversation.id, userMsg);
      onConversationUpdate();

      // Prepare RAG context if enabled
      let ragContext = '';
      if (ragEnabled && uploadedPDFs.length > 0) {
        const allChunks = uploadedPDFs.flatMap(pdf => pdf.chunks || []);
        const relevantChunks = PDFProcessor.searchPDFChunks(allChunks, userMessage);
        
        if (relevantChunks.length > 0) {
          ragContext = relevantChunks.slice(0, 3).map(chunk => 
            `[${chunk.metadata?.section || 'Document'}]: ${chunk.content.substring(0, 300)}...`
          ).join('\n\n');
        }
      }

      // Prepare conversation history for context
      const recentMessages = conversation.messages.slice(-10);
      const llamaMessages = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add current message
      llamaMessages.push({ role: 'user', content: userMessage });

      // Get optimization state for emergency mode settings
      const optimizationState = optimizationManager.getState();
      const isEmergencyMode = optimizationState.emergencyMode.active;

      // Send to Llama with template's system prompt
      const llamaResponse = await llamaService.sendMessage(
        llamaMessages,
        template.modelId,
        {
          maxTokens: isEmergencyMode ? 200 : 500,
          temperature: 0.7,
          topP: 0.9,
          ragContext: ragContext || undefined,
          systemPrompt: template.systemPrompt
        }
      );

      // Add AI response
      const aiMsg: Omit<Message, 'id' | 'timestamp'> = {
        content: llamaResponse.content,
        role: 'assistant',
        tokens: llamaResponse.usage.completion_tokens,
        modelUsed: template.modelId
      };

      conversationManager.addMessage(conversation.id, aiMsg);
      onConversationUpdate();

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error response
      const errorMsg: Omit<Message, 'id' | 'timestamp'> = {
        content: `I apologize, but I encountered an error. ${error instanceof Error ? error.message : 'Please try again.'}`,
        role: 'assistant',
        modelUsed: template.modelId
      };

      conversationManager.addMessage(conversation.id, errorMsg);
      onConversationUpdate();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
      setShowPDFUpload(false);
    } catch (error) {
      console.error('Failed to upload PDF:', error);
      alert('Failed to upload PDF. Please try again.');
    }
  };

  const handleRemovePDF = (id: string) => {
    setUploadedPDFs(prev => prev.filter(pdf => pdf.id !== id));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateTokens = () => {
    return conversation.messages.reduce((total, msg) => 
      total + (msg.tokens || estimateTokenCount(msg.content)), 0
    );
  };

  const currentTokens = calculateTokens();
  const model = modelManager.getModel(template.modelId);
  const maxTokens = model?.maxTokens || 128000;
  const tokenPercentage = (currentTokens / maxTokens) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Template Info Bar with Features */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
                style={{ backgroundColor: template.color }}
              >
                {template.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600">{template.description}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Model Status */}
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  model?.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-xs text-gray-600">{model?.name}</span>
              </div>

              {/* Advanced Features Toggle */}
              <button
                onClick={() => setShowAdvancedFeatures(!showAdvancedFeatures)}
                className="p-2 hover:bg-white hover:bg-opacity-60 rounded-lg transition-colors"
                title="Advanced Features"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Advanced Features Panel */}
          {showAdvancedFeatures && (
            <div className="mt-4 bg-white bg-opacity-60 rounded-lg p-3 space-y-3">
              {/* Token Usage */}
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Token Usage</span>
                  <span>{currentTokens.toLocaleString()} / {maxTokens.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      tokenPercentage > 80 ? 'bg-red-500' : 
                      tokenPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Rate Limit */}
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Rate Limit</span>
                  <span>{rateLimitInfo.currentRequests} / {rateLimitInfo.maxRequests}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      rateLimitInfo.currentRequests >= rateLimitInfo.maxRequests ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${(rateLimitInfo.currentRequests / rateLimitInfo.maxRequests) * 100}%` }}
                  />
                </div>
              </div>

              {/* RAG Toggle and PDF Management */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ragEnabled}
                      onChange={(e) => setRagEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">RAG Mode</span>
                  </label>
                  <span className="text-xs text-gray-500">({uploadedPDFs.length} docs)</span>
                </div>
                
                <button
                  onClick={() => setShowPDFUpload(!showPDFUpload)}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                >
                  Upload PDF
                </button>
              </div>

              {/* PDF Upload */}
              {showPDFUpload && (
                <div className="border-t pt-3">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadPDF(file);
                    }}
                    className="text-xs"
                  />
                  
                  {uploadedPDFs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {uploadedPDFs.map((pdf) => (
                        <div key={pdf.id} className="flex items-center justify-between text-xs bg-gray-100 p-2 rounded">
                          <span>{pdf.name} ({pdf.pageCount} pages)</span>
                          <button
                            onClick={() => handleRemovePDF(pdf.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Demo Questions */}
          {conversation.messages.length === 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {template.suggestedQuestions.slice(0, 3).map((question: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(question)}
                    className="text-xs bg-white bg-opacity-80 text-gray-700 px-3 py-1 rounded-full hover:bg-opacity-100 transition-colors border"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-2">{template.icon}</div>
            <p>Start your conversation with {template.name}</p>
            <p className="text-sm mt-1">Ask me anything related to {template.description.toLowerCase()}</p>
            {ragEnabled && uploadedPDFs.length > 0 && (
              <p className="text-xs mt-2 text-blue-600">
                🧠 RAG mode enabled with {uploadedPDFs.length} document(s)
              </p>
            )}
          </div>
        ) : (
          conversation.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                  {message.tokens && ` • ${message.tokens} tokens`}
                  {message.modelUsed && ` • ${message.modelUsed}`}
                </p>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${template.name}...`}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
            rows={1}
            disabled={isLoading || rateLimitInfo.isBlocked}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || rateLimitInfo.isBlocked}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        {rateLimitInfo.isBlocked && (
          <p className="text-xs text-red-600 mt-1">
            Rate limit reached. Resets at {rateLimitInfo.resetTime.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default ConversationView; 
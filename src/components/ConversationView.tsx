import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ConversationTemplate, Message, Conversation, Citation, CitationReference } from '../types/index';
import { ConversationManager } from '../services/ConversationManager';
import { ModelManager } from '../services/ModelManager';
import { PDFProcessor } from '../utils/pdfProcessor';
import AIServiceRouter from '../services/AIServiceRouter';
import { estimateTokenCount, calculateTokenUsage, DocumentContext } from '../utils/tokenCounter';
import { EnhancedRAGProcessor } from '../utils/enhancedRAG';
import { OpenAIVoiceService } from '../services/OpenAIVoiceService';
import TokenUsagePreview from './TokenUsagePreview';
import NotificationSystem, { Notification } from './NotificationSystem';
import ModelSwitcher from './ModelSwitcher';
import ProgressiveThinkingIndicator from './ProgressiveThinkingIndicator';
import CitationRenderer from './CitationRenderer';
import InlineRAGControls from './InlineRAGControls';
import { parseTextWithCitations } from '../utils/citationParser';

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
  content: string;
  pages: number;
  size: number;
  pageCount: number;
  uploadedAt: Date;
  tokenCount: number;
}

interface VoiceStatus {
  isListening: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  error: string | null;
}

// Helper function to determine if a query warrants RAG search
const isSubstantialQuery = (query: string): boolean => {
  const trimmed = query.trim().toLowerCase();
  
  // Skip very short queries
  if (trimmed.length < 3) return false;
  
  // Common greetings and simple responses
  const simplePatterns = [
    /^(hi|hey|hello|yo)$/,
    /^(thanks?|thank you|ty)$/,
    /^(ok|okay|yes|no|sure)$/,
    /^(bye|goodbye|cya|see ya)$/,
    /^(how are you|what's up|wassup)$/,
    /^(good|great|nice|cool)$/
  ];
  
  return !simplePatterns.some(pattern => pattern.test(trimmed));
};

const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  template,
  conversationManager,
  modelManager,
  onConversationUpdate
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfs, setPdfs] = useState<PDFDocument[]>([]);
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [ragContext, setRagContext] = useState('');
  const [ragProcessor] = useState(() => new EnhancedRAGProcessor());
  const [requestCount, setRequestCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitReset, setRateLimitReset] = useState<Date | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({
    isListening: false,
    isRecording: false,
    isSpeaking: false,
    error: null
  });
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentModelId, setCurrentModelId] = useState(template.modelId);
  const [actualModelUsed, setActualModelUsed] = useState<string>('');
  const [ragEnabled, setRagEnabled] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiService = useMemo(() => new AIServiceRouter(), []);
  
  // Voice service removed - using browser TTS instead
  // const pdfProcessor = new PDFProcessor(); // Currently unused
  
  // Voice recognition setup
  const recognition = useRef<SpeechRecognition | null>(null);
  const synthesis = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialize voice services
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';
      
      recognition.current.onstart = () => {
        setVoiceStatus(prev => ({ ...prev, isListening: true, isRecording: true, error: null }));
      };
      
      recognition.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setVoiceStatus(prev => ({ ...prev, isListening: false, isRecording: false }));
      };
      
      recognition.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        setVoiceStatus(prev => ({ 
          ...prev, 
          isListening: false, 
          isRecording: false, 
          error: `Voice recognition error: ${event.error}` 
        }));
      };
      
      recognition.current.onend = () => {
        setVoiceStatus(prev => ({ ...prev, isListening: false, isRecording: false }));
      };
    }
    
    if ('speechSynthesis' in window) {
      synthesis.current = window.speechSynthesis;
    }
    
    setIsVoiceEnabled(!!recognition.current && !!synthesis.current);
  }, []);

  // Add notification helper functions
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString()
    };
    setNotifications(prev => [...prev, newNotification]);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleModelSwitch = (newModelId: string) => {
    setCurrentModelId(newModelId);
    addNotification({
      type: 'info',
      title: 'Model Switched',
      message: `Now using ${modelManager.getAllModels().find(m => m.id === newModelId)?.name || newModelId}`,
      duration: 3000
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  useEffect(() => {
    // Rate limiting logic
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const recentRequests = conversation.messages.filter(msg => 
      msg.role === 'user' && msg.timestamp > oneMinuteAgo
    ).length;
    
    setRequestCount(recentRequests);
    
    if (recentRequests >= 15) {
      setIsRateLimited(true);
      setRateLimitReset(new Date(now.getTime() + 60000));
    } else {
      setIsRateLimited(false);
      setRateLimitReset(null);
    }
  }, [conversation.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startVoiceRecognition = () => {
    if (recognition.current && !voiceStatus.isListening) {
      try {
        recognition.current.start();
      } catch (error) {
        setVoiceStatus(prev => ({ 
          ...prev, 
          error: 'Failed to start voice recognition' 
        }));
      }
    }
  };

  const stopVoiceRecognition = () => {
    if (recognition.current && voiceStatus.isListening) {
      recognition.current.stop();
    }
  };

  const speakText = async (text: string, isAIResponse: boolean = false) => {
    if (!text.trim() || !isAIResponse) return;

    // Stop any existing speech
    if (synthesis.current) {
      synthesis.current.cancel();
    }

    try {
      setVoiceStatus(prev => ({ ...prev, isSpeaking: true, error: null }));
      console.log(`🎙️ ${template.persona}: Starting to speak...`);

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices and select the best one
      const voices = synthesis.current?.getVoices() || [];
      const preferredVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('samantha') || 
        voice.name.toLowerCase().includes('alex') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.name.toLowerCase().includes('daniel')
      ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 0.9;

      utterance.onstart = () => {
        console.log(`🎙️ ${template.persona}: Speaking started`);
      };

      utterance.onend = () => {
        setVoiceStatus(prev => ({ ...prev, isSpeaking: false }));
        console.log(`✅ ${template.persona}: Finished speaking`);
      };

      utterance.onerror = (event) => {
        console.error(`❌ ${template.persona}: Speech error:`, event);
        setVoiceStatus(prev => ({ 
          ...prev, 
          isSpeaking: false, 
          error: 'Voice playback failed' 
        }));
      };

      synthesis.current?.speak(utterance);

    } catch (error) {
      console.error('🚨 Voice Service failed:', error);
      setVoiceStatus(prev => ({ 
        ...prev, 
        isSpeaking: false, 
        error: 'Voice not available' 
      }));
    }
  };

  const stopSpeaking = () => {
    if (synthesis.current) {
      synthesis.current.cancel();
      setVoiceStatus(prev => ({ ...prev, isSpeaking: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isRateLimited) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      tokens: estimateTokenCount(input.trim())
    };

    // Add user message
    conversationManager.addMessage(conversation.id, userMessage);
    const originalInput = input.trim();
    setInput('');
    setIsLoading(true);
    onConversationUpdate();

    try {
      // Prepare context with recent messages
      const recentMessages = conversation.messages.slice(-10);
      const llamaMessages = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add current message
      llamaMessages.push({ role: 'user', content: originalInput });

      // Intelligent RAG retrieval - only for substantial queries
      let intelligentRagContext = '';
      const shouldUseRAG = ragEnabled && ragProcessor.getDocuments().length > 0 && isSubstantialQuery(originalInput);
      
      if (shouldUseRAG) {
        console.log(`🔍 RAG Search: Looking for "${originalInput}" in ${ragProcessor.getDocuments().length} documents`);
        
        const ragResults = ragProcessor.searchDocuments({
          query: originalInput,
          maxResults: 5,
          minRelevanceScore: 0.05 // Much lower threshold for better recall
        });
        
        console.log(`🔍 RAG Results: Found ${ragResults.length} relevant chunks`);
        ragResults.forEach((result, i) => {
          console.log(`  ${i+1}. ${result.document.name} (${(result.relevanceScore * 100).toFixed(1)}%): ${result.context.substring(0, 100)}...`);
        });
        
        if (ragResults.length > 0) {
          intelligentRagContext = ragResults
            .map((result, index) => {
              const relevanceInfo = ` (${(result.relevanceScore * 100).toFixed(0)}% relevant)`;
              const chunkInfo = result.chunk.type !== 'paragraph' ? ` - ${result.chunk.type}` : '';
              return `**[Source: ${result.document.name}${chunkInfo}${relevanceInfo}]**\n\n${result.context}`;
            })
            .join('\n\n---\n\n');
          
          console.log(`🔍 RAG Context Length: ${intelligentRagContext.length} characters`);
        } else {
          console.log('🔍 RAG: No relevant content found, falling back to full context if available');
        }
      } else if (ragEnabled && ragProcessor.getDocuments().length > 0) {
        console.log(`🔍 RAG: Skipping search for simple query: "${originalInput}"`);
      }

      // Create a placeholder assistant message for streaming
      const assistantMessage: Message = conversationManager.addMessage(conversation.id, {
        role: 'assistant',
        content: '',
        tokens: 0,
        modelUsed: currentModelId
      });

      onConversationUpdate();

      // Stream the response in real-time using current model
      const stream = aiService.streamMessage(
        llamaMessages,
        currentModelId,
        {
          ragContext: intelligentRagContext || ragContext, // Use intelligent context if available, fallback to basic
          systemPrompt: template.systemPrompt,
          temperature: template.parameters.temperature,
          maxTokens: template.parameters.maxTokens,
          topP: template.parameters.topP
        }
      );

      let fullContent = '';
      let wasRateLimited = false;

      try {
        for await (const chunk of stream) {
          fullContent += chunk;
        
          // Update the assistant message with the streaming content
          assistantMessage.content = fullContent;
          assistantMessage.tokens = estimateTokenCount(fullContent);
          
          // Trigger a re-render to show the streaming text
          onConversationUpdate();
          
          // Add natural pauses for sentence-like streaming
          if (chunk.includes('.') || chunk.includes('!') || chunk.includes('?') || chunk.includes('\n')) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Longer pause for sentences
          } else {
            await new Promise(resolve => setTimeout(resolve, 20)); // Short pause for words
          }
        }

        
        // If no content was streamed, fall back to regular API call
        if (fullContent.length === 0) {

          const response = await aiService.sendMessage(
            llamaMessages,
            currentModelId,
            {
              ragContext: intelligentRagContext || ragContext,
              systemPrompt: template.systemPrompt,
              temperature: template.parameters.temperature,
              maxTokens: template.parameters.maxTokens,
              topP: template.parameters.topP
            }
          );
          
          // Temporarily disable citation parsing to fix [object Object] issue
          // const parsedContent = parseTextWithCitations(response.content);
          
          assistantMessage.content = response.content;
          assistantMessage.tokens = response.usage?.completion_tokens || 0;
          assistantMessage.modelUsed = response.model;
          // assistantMessage.citations = parsedContent.citations;
          // assistantMessage.citationReferences = parsedContent.citationReferences;
          setActualModelUsed(response.model);

          // Check for fallback and show notification
          if (response.fallbackInfo) {
            addNotification({
              type: 'warning',
              title: 'Model Switched Automatically',
              message: `${response.fallbackInfo.originalModel} ${response.fallbackInfo.reason.toLowerCase()}. Switched to ${response.fallbackInfo.fallbackModel}.`,
              duration: 8000,
              actions: [
                {
                  label: 'Try Gemini',
                  onClick: () => handleModelSwitch('gemini-2.0-flash'),
                  variant: 'primary'
                },
                {
                  label: 'Try GPT-4o',
                  onClick: () => handleModelSwitch('gpt-4o'),
                  variant: 'secondary'
                }
              ]
            });
          }

          onConversationUpdate();
        }
            } catch (streamError: any) {
        console.error('🚨 Streaming error:', streamError);
        
        // Check for rate limiting
        if (streamError?.message?.startsWith('RATE_LIMITED:')) {
          wasRateLimited = true;
          const [_, originalModel, errorMsg] = streamError.message.split(':');
          
          // Show rate limit notification
          addNotification({
            type: 'warning',
            title: 'Rate Limited',
            message: `${originalModel} has reached its rate limit. Switching to backup model.`,
            duration: 0, // Persistent
            actions: [
              {
                label: 'Try Gemini',
                onClick: () => handleModelSwitch('gemini-2.0-flash'),
                variant: 'primary'
              },
              {
                label: 'Try Llama',
                onClick: () => handleModelSwitch('llama3.1:8b'),
                variant: 'secondary'
              }
            ]
          });
        }

        // Check for automatic fallbacks
        if (streamError?.message?.startsWith('FALLBACK:')) {
          const [_, originalModel, reason] = streamError.message.split(':');
          
          addNotification({
            type: 'info',
            title: 'Model Switched Automatically',
            message: `${originalModel} ${reason.toLowerCase()}. Switched to Llama for this response.`,
            duration: 8000,
            actions: [
              {
                label: 'Try Gemini',
                onClick: () => handleModelSwitch('gemini-2.0-flash'),
                variant: 'primary'
              },
              {
                label: 'Try GPT-4o',
                onClick: () => handleModelSwitch('gpt-4o'),
                variant: 'secondary'
              }
            ]
          });
        }
        
        // Fallback to regular API call
        try {
          const response = await aiService.sendMessage(
            llamaMessages,
            currentModelId,
            {
              ragContext: intelligentRagContext || ragContext,
              systemPrompt: template.systemPrompt,
              temperature: template.parameters.temperature,
              maxTokens: template.parameters.maxTokens,
              topP: template.parameters.topP
            }
          );
          
          assistantMessage.content = response.content;
          assistantMessage.tokens = response.usage?.completion_tokens || 0;
          assistantMessage.modelUsed = response.model; // Track actual model used
          setActualModelUsed(response.model);

          // Check for fallback and show notification
          if (response.fallbackInfo) {
            addNotification({
              type: 'warning',
              title: 'Model Switched Automatically',
              message: `${response.fallbackInfo.originalModel} ${response.fallbackInfo.reason.toLowerCase()}. Switched to ${response.fallbackInfo.fallbackModel}.`,
              duration: 8000, // Show for 8 seconds
              actions: [
                {
                  label: 'Try Gemini',
                  onClick: () => handleModelSwitch('gemini-2.0-flash'),
                  variant: 'primary'
                },
                {
                  label: 'Try GPT-4o',
                  onClick: () => handleModelSwitch('gpt-4o'),
                  variant: 'secondary'
                }
              ]
            });
          }

          onConversationUpdate();
        } catch (fallbackError: any) {
          console.error('🚨 Fallback API call also failed:', fallbackError);
          
          // Check for rate limiting in fallback too
          if (fallbackError?.message?.startsWith('RATE_LIMITED:')) {
            addNotification({
              type: 'error',
              title: 'All Models Rate Limited',
              message: 'All available models are currently rate limited. Please try again later.',
              duration: 0,
              actions: [
                {
                  label: 'Retry in 1 minute',
                  onClick: () => {
                    setTimeout(() => {
                      dismissNotification('rate-limit-all');
                    }, 60000);
                  },
                  variant: 'primary'
                }
              ]
            });
          }
          
          assistantMessage.content = 'Sorry, I encountered an error while thinking. Please try again.';
          onConversationUpdate();
        }
      }
      
      // Don't auto-speak responses - let users click the speak button if they want to hear it
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        tokens: 20
      };
      conversationManager.addMessage(conversation.id, errorMessage);
      onConversationUpdate();
    } finally {
      setIsLoading(false);
    }
  };



  const removePDF = (id: string) => {
    // Remove from RAG processor
    ragProcessor.removeDocument(id);
    
    setPdfs(prev => {
      const newPdfs = prev.filter(pdf => pdf.id !== id);
      const newContext = newPdfs.map(pdf => pdf.content).join('\n\n');
      setRagContext(newContext);
      return newPdfs;
    });
  };

  const handleQuestionClick = (question: string) => {
    setInput(question);
    // Removed auto-speak for user questions - only AI responses should be spoken
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications}
        onDismiss={dismissNotification}
      />
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {template.icon.startsWith('http') ? (
              <img 
                src={template.icon} 
                alt={template.persona}
                className="w-10 h-10 rounded-full border-2 border-gray-200 object-cover"
              />
            ) : (
              <span className="text-2xl">{template.icon}</span>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{template.persona}</h2>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          </div>
          
          {/* Voice Controls */}
          {isVoiceEnabled && (
            <div className="flex items-center space-x-2">
              {voiceStatus.isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Stop speaking"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                {voiceStatus.isSpeaking && (
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Speaking</span>
                  </span>
                )}
                {voiceStatus.isRecording && (
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Listening</span>
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Rate Limit Indicator */}
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-500">
              {requestCount}/15 requests
            </div>
            {isRateLimited && rateLimitReset && (
              <div className="text-xs text-red-600">
                Rate limited until {formatTime(rateLimitReset)}
              </div>
            )}
          </div>
        </div>
        
        {/* Model Switcher and Template Info */}
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ModelSwitcher
            models={modelManager.getAllModels()}
            currentModelId={currentModelId}
            onModelSwitch={handleModelSwitch}
            compact={true}
          />
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Using: {actualModelUsed || currentModelId}
              </span>
              <span className="text-gray-600">Context: {template.features.contextLength.toLocaleString()} tokens</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {template.capabilities.slice(0, 4).map((capability, index) => (
                <span key={index} className="px-2 py-1 bg-[#FFC627] bg-opacity-20 text-[#191919] text-xs rounded">
                  {capability}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {voiceStatus.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {voiceStatus.error}
          </div>
        )}
      </div>



      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              {template.icon.startsWith('http') ? (
                <img 
                  src={template.icon} 
                  alt={template.persona}
                  className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover mx-auto"
                />
              ) : (
                <span className="text-4xl">{template.icon}</span>
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to {template.name}
            </h3>
            <p className="text-gray-600 mb-6">{template.description}</p>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Try these questions:</h4>
              <div className="grid gap-2 max-w-2xl mx-auto">
                {template.suggestedQuestions.slice(0, 3).map((question: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionClick(question)}
                    className="p-3 text-left bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          conversation.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-[#FFC627] text-[#191919]'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="prose prose-sm max-w-none
                  prose-headings:text-current prose-headings:font-semibold
                  prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                  prose-p:text-current prose-p:leading-relaxed prose-p:mb-2
                  prose-strong:text-current prose-strong:font-semibold
                  prose-em:text-current
                  prose-ul:text-current prose-ol:text-current
                  prose-li:text-current prose-li:marker:text-current prose-li:mb-1
                  prose-code:text-current prose-code:bg-black prose-code:bg-opacity-10 prose-code:px-1 prose-code:rounded prose-code:text-sm
                  prose-pre:bg-black prose-pre:bg-opacity-5 prose-pre:text-current prose-pre:text-sm
                  prose-blockquote:text-current prose-blockquote:border-l-current prose-blockquote:border-opacity-30
                  prose-hr:border-current prose-hr:border-opacity-20
                  [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <div className="mb-2">{children}</div>,
                      h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                      strong: ({ children }) => {
                        // Handle citation formatting
                        const text = String(children);
                        if (text.startsWith('[Source:')) {
                          return <span className="inline-block mt-2 px-2 py-1 bg-black bg-opacity-10 rounded-md text-xs font-medium border-l-2 border-current border-opacity-30">{children}</span>;
                        }
                        return <strong>{children}</strong>;
                      }
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                <div className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-gray-700' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                  {message.tokens && ` • ${message.tokens} tokens`}
                  {message.modelUsed && ` • ${message.modelUsed}`}
                </div>
                
                {message.role === 'assistant' && message.content && (
                  <button
                    onClick={() => speakText(message.content, true)} // true = AI response
                    disabled={voiceStatus.isSpeaking || !message.content}
                    className="mt-1 text-xs text-[#FFC627] hover:text-yellow-600 disabled:opacity-50 disabled:text-gray-400"
                    title="Speak this response"
                  >
                    {voiceStatus.isSpeaking ? '⏸️ Speaking...' : '🔊 Listen'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        
        <ProgressiveThinkingIndicator 
          isThinking={isLoading && conversation.messages.length > 0 && conversation.messages[conversation.messages.length - 1].content === ''}
          modelName={modelManager.getAllModels().find(m => m.id === currentModelId)?.name || currentModelId}
          canStream={currentModelId.includes('gpt') || currentModelId.includes('gemini')}
        />
        
        <div ref={messagesEndRef} />
      </div>

      {/* Token Usage Preview */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <TokenUsagePreview
          conversation={conversation}
          template={template}
          currentInput={input}
        />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          {/* RAG Controls */}
          <InlineRAGControls
            ragEnabled={ragEnabled}
            onToggleRAG={setRagEnabled}
            uploadedPDFs={pdfs}
            onUploadPDF={async (file) => {
              setIsProcessingPDF(true);
              try {
                // Use EnhancedRAGProcessor for intelligent document processing
                const processedDoc = await ragProcessor.processFile(file);
                const content = processedDoc.chunks.map(chunk => chunk.content).join('\n\n');
                
                const newPDF: PDFDocument = {
                  id: processedDoc.id,
                  name: processedDoc.name,
                  content: content,
                  pages: 0, // Will be populated by fallback if needed
                  size: file.size,
                  pageCount: 0, // Will be populated by fallback if needed
                  uploadedAt: new Date(),
                  tokenCount: processedDoc.tokenCount
                };
                
                setPdfs(prev => [...prev, newPDF]);
                // Keep basic context for backward compatibility
                setRagContext(prev => prev + '\n\n' + content);
              } catch (error) {
                console.error('Error processing document:', error);
                // Fallback to basic PDF processing if enhanced fails
                try {
                  const processedPDF = await PDFProcessor.processPDF(file);
                  const content = processedPDF.chunks.map(chunk => chunk.content).join('\n\n');
                  const newPDF: PDFDocument = {
                    id: processedPDF.id,
                    name: processedPDF.name,
                    content: content,
                    pages: processedPDF.pageCount,
                    size: file.size,
                    pageCount: processedPDF.pageCount,
                    uploadedAt: new Date(),
                    tokenCount: estimateTokenCount(content)
                  };
                  
                  setPdfs(prev => [...prev, newPDF]);
                  setRagContext(prev => prev + '\n\n' + content);
                } catch (fallbackError) {
                  console.error('Error with fallback PDF processing:', fallbackError);
                }
              } finally {
                setIsProcessingPDF(false);
              }
            }}
            onRemovePDF={removePDF}
            isLoading={isProcessingPDF}
          />

          {/* Voice Input Button */}
          {isVoiceEnabled && (
            <button
              type="button"
              onClick={voiceStatus.isListening ? stopVoiceRecognition : startVoiceRecognition}
              disabled={isLoading || isRateLimited}
              className={`p-3 rounded-lg transition-colors ${
                voiceStatus.isRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-50`}
              title={voiceStatus.isListening ? 'Stop listening' : 'Start voice input'}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isRateLimited 
                ? 'Rate limited - please wait...' 
                : isVoiceEnabled 
                  ? 'Type your message or use voice input...' 
                  : 'Type your message...'
            }
            disabled={isLoading || isRateLimited}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC627] focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isRateLimited}
            className="px-6 py-3 bg-[#FFC627] text-[#191919] rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
        
        {/* AI Disclaimer */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Users are speaking with a synthetic version of {template.persona} created with Generative AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConversationView; 
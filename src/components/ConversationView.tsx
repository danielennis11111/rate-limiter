import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Conversation, ConversationTemplate, Message } from '../types/index';
import { ConversationManager } from '../services/ConversationManager';
import { ModelManager } from '../services/ModelManager';
import { PDFProcessor } from '../utils/pdfProcessor';
import AIServiceRouter from '../services/AIServiceRouter';
import { OpenAIVoiceService } from '../services/OpenAIVoiceService';
import { estimateTokenCount } from '../utils/mockData';
import TokenUsagePreview from './TokenUsagePreview';

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
}

interface VoiceStatus {
  isListening: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  error: string | null;
}

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiService = new AIServiceRouter();
  
  // Initialize OpenAI Voice Service with API key
  const voiceService = (() => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (apiKey && apiKey !== 'your_openai_api_key_here') {
      return new OpenAIVoiceService({ apiKey });
    }
    return null;
  })();
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
    // 🎙️ ONLY speak AI responses using magical OpenAI voices
    if (!text || !isAIResponse || !voiceService) return;

    // Stop any existing speech (fallback to synthesis for compatibility)
    if (synthesis.current) {
      synthesis.current.cancel();
    }

    try {
      // 🎵 Use OpenAI's magical voice service with persona-specific voices
      await voiceService.playText(
        text,
        template.persona, // Use the persona (Michael Crow, Elizabeth Reilley, etc.)
        () => {
          // On speech start
          setVoiceStatus(prev => ({ ...prev, isSpeaking: true, error: null }));
          console.log(`🎙️ ${template.persona}: Speaking with OpenAI voice...`);
        },
        () => {
          // On speech end
          setVoiceStatus(prev => ({ ...prev, isSpeaking: false }));
          console.log(`✅ ${template.persona}: Finished speaking`);
        },
        (error: Error) => {
          // On error
          setVoiceStatus(prev => ({ 
            ...prev, 
            isSpeaking: false, 
            error: `Voice error: ${error.message}` 
          }));
          console.error(`❌ ${template.persona}: Voice error:`, error);
        }
      );
    } catch (error) {
      console.error('🚨 OpenAI Voice Service failed:', error);
      
      // Graceful fallback: no voice rather than synthetic
      setVoiceStatus(prev => ({ 
        ...prev, 
        isSpeaking: false, 
        error: null // Don't show error to user for voice failures
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

      // Create a placeholder assistant message for streaming
      const assistantMessage: Message = conversationManager.addMessage(conversation.id, {
        role: 'assistant',
        content: '',
        tokens: 0,
        modelUsed: template.modelId
      });

      onConversationUpdate();

      // Stream the response in real-time
      console.log('🚀 About to call streamMessage with model:', template.modelId);
      const stream = aiService.streamMessage(
        llamaMessages,
        template.modelId,
        {
          ragContext,
          systemPrompt: template.systemPrompt,
          temperature: template.parameters.temperature,
          maxTokens: template.parameters.maxTokens,
          topP: template.parameters.topP
        }
      );

      let fullContent = '';
      console.log('🔄 Starting to stream response...');
      
      try {
        let chunkCount = 0;
        for await (const chunk of stream) {
          chunkCount++;
          console.log(`📝 Received chunk #${chunkCount}:`, chunk);
          fullContent += chunk;
          
          // Update the assistant message with the streaming content
          assistantMessage.content = fullContent;
          assistantMessage.tokens = estimateTokenCount(fullContent);
          
          // Trigger a re-render to show the streaming text
          onConversationUpdate();
          
          // Small delay to make streaming visible
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        console.log(`✅ Streaming complete. Total chunks: ${chunkCount}, Content length: ${fullContent.length}`);
        
        // If no content was streamed, fall back to regular API call
        if (fullContent.length === 0) {
          console.log('⚠️ No content from streaming, falling back to regular API...');
          const response = await aiService.sendMessage(
            llamaMessages,
            template.modelId,
            {
              ragContext,
              systemPrompt: template.systemPrompt,
              temperature: template.parameters.temperature,
              maxTokens: template.parameters.maxTokens,
              topP: template.parameters.topP
            }
          );
          
          assistantMessage.content = response.content;
          assistantMessage.tokens = response.usage?.completion_tokens || 0;
          onConversationUpdate();
        }
      } catch (streamError) {
        console.error('🚨 Streaming error:', streamError);
        // Fallback to regular API call
        try {
          console.log('🔄 Falling back to regular API call...');
          const response = await aiService.sendMessage(
            llamaMessages,
            template.modelId,
            {
              ragContext,
              systemPrompt: template.systemPrompt,
              temperature: template.parameters.temperature,
              maxTokens: template.parameters.maxTokens,
              topP: template.parameters.topP
            }
          );
          
          assistantMessage.content = response.content;
          assistantMessage.tokens = response.usage?.completion_tokens || 0;
          onConversationUpdate();
        } catch (fallbackError) {
          console.error('🚨 Fallback API call also failed:', fallbackError);
          assistantMessage.content = 'Sorry, I encountered an error while thinking. Please try again.';
          onConversationUpdate();
        }
      }
      
      // Auto-speak AI response if voice is enabled (NOT user input)
      if (isVoiceEnabled && !voiceStatus.isSpeaking && fullContent) {
        speakText(fullContent, true); // true = this is an AI response
      }
      
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

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsProcessingPDF(true);
    
    for (const file of Array.from(files)) {
      if (file.type === 'application/pdf') {
        try {
          const processedPDF = await PDFProcessor.processPDF(file);
          const content = processedPDF.chunks.map(chunk => chunk.content).join('\n\n');
          const newPDF: PDFDocument = {
            id: processedPDF.id,
            name: processedPDF.name,
            content: content,
            pages: processedPDF.pageCount
          };
          
          setPdfs(prev => [...prev, newPDF]);
          setRagContext(prev => prev + '\n\n' + content);
        } catch (error) {
          console.error('Error processing PDF:', error);
        }
      }
    }
    
    setIsProcessingPDF(false);
  };

  const removePDF = (id: string) => {
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
        
        {/* Template Info */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Model: {template.modelId}</span>
            <span className="text-gray-600">Context: {template.features.contextLength.toLocaleString()} tokens</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {template.capabilities.slice(0, 4).map((capability, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {capability}
              </span>
            ))}
          </div>
        </div>
        
        {voiceStatus.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {voiceStatus.error}
          </div>
        )}
      </div>

      {/* PDF Upload Section */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Document Analysis</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handlePDFUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingPDF}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessingPDF ? 'Processing...' : 'Upload PDFs'}
          </button>
        </div>
        
        {pdfs.length > 0 && (
          <div className="mt-2 space-y-1">
            {pdfs.map((pdf) => (
              <div key={pdf.id} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                <span className="text-gray-700">{pdf.name} ({pdf.pages} pages)</span>
                <button
                  onClick={() => removePDF(pdf.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none text-gray-900
                    prose-headings:text-gray-900 prose-headings:font-semibold
                    prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                    prose-p:text-gray-900 prose-p:leading-relaxed
                    prose-strong:text-gray-900 prose-strong:font-semibold
                    prose-em:text-gray-700
                    prose-ul:text-gray-900 prose-ol:text-gray-900
                    prose-li:text-gray-900 prose-li:marker:text-gray-500
                    prose-code:text-blue-700 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded
                    prose-pre:bg-gray-50 prose-pre:text-gray-800
                    prose-blockquote:text-gray-700 prose-blockquote:border-l-gray-300
                    prose-hr:border-gray-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
                <div className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                  {message.tokens && ` • ${message.tokens} tokens`}
                  {message.modelUsed && ` • ${message.modelUsed}`}
                </div>
                
                {message.role === 'assistant' && isVoiceEnabled && (
                  <button
                    onClick={() => speakText(message.content, true)} // true = AI response
                    disabled={voiceStatus.isSpeaking}
                    className="mt-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    title="Speak this response"
                  >
                    🔊 Speak
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && conversation.messages.length > 0 && conversation.messages[conversation.messages.length - 1].content === '' && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-gray-600">I'm thinking out loud...</span>
              </div>
            </div>
          </div>
        )}
        
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
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isRateLimited}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConversationView; 
import React, { useState } from 'react';
import { AlertCircle, Database, FileText, Zap, Brain, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

interface TokenUsageBreakdown {
  userInput: number;
  expectedResponse: number;
  knowledgeBase: number;
  systemInstructions: number;
  conversationHistory: number;
  total: number;
}

interface TokenUsagePreviewProps {
  inputText: string;
  contextInfo: {
    currentTokens: number;
    maxTokens: number;
    modelName: string;
  };
  knowledgeBaseEnabled: boolean;
  onCompress?: () => void;
  compressionEnabled?: boolean;
  availableModels?: Array<{
    name: string;
    maxContextTokens: number;
    description: string;
  }>;
  onSwitchModel?: (modelName: string) => void;
  ragTokenCount?: number;
  ragDocumentCount?: number;
}

export const TokenUsagePreview: React.FC<TokenUsagePreviewProps> = ({
  inputText,
  contextInfo,
  knowledgeBaseEnabled,
  onCompress,
  compressionEnabled,
  availableModels,
  onSwitchModel,
  ragTokenCount = 0,
  ragDocumentCount = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Estimate tokens for user input (rough: 1 token per 4 characters)
  const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

  // Calculate token breakdown
  const calculateTokenUsage = (): TokenUsageBreakdown => {
    const userInput = estimateTokens(inputText);
    
    // Estimate response tokens based on input complexity
    let expectedResponse = 0;
    if (userInput > 0) {
      if (userInput < 20) expectedResponse = 100; // Short responses
      else if (userInput < 50) expectedResponse = 250; // Medium responses
      else if (userInput < 100) expectedResponse = 400; // Long responses
      else expectedResponse = 600; // Very detailed responses
    }

    // Knowledge base scanning costs (actual RAG retrieval)
    const knowledgeBase = knowledgeBaseEnabled ? ragTokenCount : 0;

    // System instructions (always present)
    const systemInstructions = 180; // Focus coaching instructions

    // Current conversation history
    const conversationHistory = contextInfo.currentTokens;

    const total = userInput + expectedResponse + knowledgeBase + systemInstructions + conversationHistory;

    return {
      userInput,
      expectedResponse,
      knowledgeBase,
      systemInstructions,
      conversationHistory,
      total
    };
  };

  const usage = calculateTokenUsage();
  const remainingTokens = contextInfo.maxTokens - usage.total;
  const usagePercentage = (usage.total / contextInfo.maxTokens) * 100;
  const isNearLimit = usagePercentage > 85;
  const willExceedLimit = usage.total > contextInfo.maxTokens;

  if (!inputText && !knowledgeBaseEnabled && contextInfo.currentTokens === 0) return null;

  return (
    <div className={`rounded-lg border p-4 transition-colors ${
      willExceedLimit 
        ? 'bg-red-50 border-red-200' 
        : isNearLimit 
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-white border-gray-200'
    }`}>
      {/* Minimized View */}
      <div className="p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between hover:bg-black hover:bg-opacity-5 rounded-md p-1 -m-1 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Zap className={`w-4 h-4 ${
              willExceedLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-asu-maroon'
            }`} />
            <span className="text-sm font-semibold text-gray-900">
              Token Usage Preview
            </span>
            <span className={`text-sm font-medium ${
              willExceedLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-asu-maroon'
            }`}>
              {usage.total.toLocaleString()} / {contextInfo.maxTokens.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {remainingTokens > 0 ? `${remainingTokens.toLocaleString()} remaining` : 'Exceeds limit'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>

        {/* Mini Progress Bar */}
        <div className="mt-2">
          <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                willExceedLimit 
                  ? 'bg-red-500' 
                  : isNearLimit 
                    ? 'bg-yellow-500'
                    : 'bg-asu-maroon'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {Math.round(usagePercentage)}% of context window
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="px-3 pb-3">
          <div className="border-t border-gray-200 pt-3">
            {/* Model & Context Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Model Context</span>
                </div>
                {onSwitchModel && availableModels && (
                  <select
                    value={contextInfo.modelName}
                    onChange={(e) => onSwitchModel(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                  >
                    {availableModels.map((model) => (
                      <option key={model.name} value={model.name}>
                        {model.name} ({(model.maxContextTokens / 1000).toLocaleString()}K)
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-600">Current Model:</span>
                  <div className="font-medium">{contextInfo.modelName}</div>
                </div>
                <div>
                  <span className="text-gray-600">Context Window:</span>
                  <div className="font-medium">{contextInfo.maxTokens.toLocaleString()} tokens</div>
                </div>
                <div>
                  <span className="text-gray-600">RAG Context:</span>
                  <div className="font-medium">
                    {knowledgeBaseEnabled ? 
                      `${ragTokenCount.toLocaleString()} tokens (${ragDocumentCount} docs)` : 
                      'Disabled'
                    }
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Remaining:</span>
                  <div className={`font-medium ${remainingTokens < 0 ? 'text-red-600' : remainingTokens < contextInfo.maxTokens * 0.15 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {remainingTokens.toLocaleString()} tokens
                  </div>
                </div>
              </div>
            </div>

            {/* Token Breakdown */}
            <div className="space-y-2 mb-4">
              {usage.userInput > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">Your message</span>
                  </div>
                  <span className="font-medium">{usage.userInput} tokens</span>
                </div>
              )}

              {usage.expectedResponse > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">Expected AI response</span>
                  </div>
                  <span className="font-medium">{usage.expectedResponse} tokens</span>
                </div>
              )}

              {usage.knowledgeBase > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Database className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">RAG knowledge base</span>
                  </div>
                  <span className="font-medium">{usage.knowledgeBase} tokens</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">System instructions</span>
                </div>
                <span className="font-medium">{usage.systemInstructions} tokens</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <FileText className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">Conversation history</span>
                </div>
                <span className="font-medium">{usage.conversationHistory} tokens</span>
              </div>
            </div>

            {/* Warnings */}
            {willExceedLimit && (
              <div className="p-3 bg-red-100 rounded-md mb-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 font-medium">Request exceeds context limit</p>
                    <p className="text-xs text-red-700 mt-1">
                      This request will fail. Try compressing the conversation, switching to a larger model, or starting fresh.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isNearLimit && !willExceedLimit && (
              <div className="p-3 bg-yellow-100 rounded-md mb-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">Approaching context limit</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Consider compressing the conversation or starting a new chat after this response.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Compression Button */}
            {onCompress && (isNearLimit || willExceedLimit) && (
              <div className="border-t border-gray-200 pt-3">
                <button
                  onClick={onCompress}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-colors ${
                    compressionEnabled
                      ? 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                      : 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border border-purple-200 hover:from-purple-200 hover:to-blue-200'
                  }`}
                  title="AI-optimized compression to reduce token usage while preserving context"
                >
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">
                    {compressionEnabled ? 'Compression Active' : 'AI Smart Compress'}
                  </span>
                  <span className="text-xs opacity-75">
                    ~50-70% reduction
                  </span>
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Intelligently summarizes and compresses conversation history while preserving key context
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState } from 'react';
import { AlertCircle, Database, FileText, Zap, Brain, ChevronDown, ChevronUp } from 'lucide-react';

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
}

export const TokenUsagePreview: React.FC<TokenUsagePreviewProps> = ({
  inputText,
  contextInfo,
  knowledgeBaseEnabled
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

    // Knowledge base scanning costs (simulating RAG retrieval)
    const knowledgeBase = knowledgeBaseEnabled ? 850 : 0; // ~10 documents × 85 tokens avg

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

  if (!inputText && !knowledgeBaseEnabled) return null;

  return (
    <div className={`rounded-lg border transition-colors ${
      willExceedLimit 
        ? 'bg-red-50 border-red-200' 
        : isNearLimit 
          ? 'bg-yellow-50 border-yellow-200' 
          : 'bg-blue-50 border-blue-200'
    }`}>
      {/* Minimized View */}
      <div className="p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between hover:bg-black hover:bg-opacity-5 rounded-md p-1 -m-1 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Zap className={`w-4 h-4 ${
              willExceedLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-blue-500'
            }`} />
            <span className="text-sm font-semibold text-gray-900">
              Token Usage Preview
            </span>
            <span className={`text-sm font-medium ${
              willExceedLimit ? 'text-red-700' : isNearLimit ? 'text-yellow-700' : 'text-blue-700'
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
                    : 'bg-blue-500'
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
                    <span className="text-gray-600">Knowledge base scan (10 docs)</span>
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
              <div className="p-3 bg-red-100 rounded-md">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 font-medium">Request exceeds context limit</p>
                    <p className="text-xs text-red-700 mt-1">
                      This request will fail. Try shortening your message, disabling knowledge base, or switching to a model with higher limits.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isNearLimit && !willExceedLimit && (
              <div className="p-3 bg-yellow-100 rounded-md">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">Approaching context limit</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      After this response, you may need to start a new conversation to avoid truncation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 
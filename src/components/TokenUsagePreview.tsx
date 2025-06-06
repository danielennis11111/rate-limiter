import React, { useState, useEffect } from 'react';
import { ConversationTemplate, Conversation } from '../types/index';
import { MODEL_LIMITS, estimateTokenCount } from '../utils/tokenCounter';

interface TokenUsagePreviewProps {
  conversation: Conversation;
  template: ConversationTemplate;
  currentInput: string;
  currentModelId?: string;
}

interface TokenUsage {
  used: number;
  total: number;
  remaining: number;
  percentage: number;
  breakdown: {
    systemInstructions: number;
    conversationHistory: number;
    currentMessage: number;
    expectedResponse: number;
  };
}

/**
 * 📊 Token Usage Preview Component
 * Shows real-time token usage in a minimized, informative way
 */
const TokenUsagePreview: React.FC<TokenUsagePreviewProps> = ({
  conversation,
  template,
  currentInput,
  currentModelId
}) => {
  // Get actual model context window
  const getModelContextWindow = (): number => {
    const modelId = currentModelId || template.modelId;
    const modelLimits = MODEL_LIMITS[modelId];
    return modelLimits?.contextWindow || template.features.contextLength || 128000;
  };

  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    used: 0,
    total: getModelContextWindow(),
    remaining: getModelContextWindow(),
    percentage: 0,
    breakdown: {
      systemInstructions: 0,
      conversationHistory: 0,
      currentMessage: 0,
      expectedResponse: 0
    }
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate token usage using real model specs
  useEffect(() => {
    const modelId = currentModelId || template.modelId;
    const contextWindow = getModelContextWindow();
    const modelLimits = MODEL_LIMITS[modelId];
    
    const systemTokens = estimateTokenCount(template.systemPrompt || '');
    const historyTokens = conversation.messages.reduce((sum, msg) => 
      sum + (msg.tokens || estimateTokenCount(msg.content)), 0
    );
    const currentTokens = estimateTokenCount(currentInput);
    const expectedResponseTokens = modelLimits?.maxOutput || template.parameters.maxTokens || 2000;

    const totalUsed = systemTokens + historyTokens + currentTokens;
    const remaining = Math.max(0, contextWindow - totalUsed - expectedResponseTokens);
    const percentage = Math.round((totalUsed / contextWindow) * 100);

    setTokenUsage({
      used: totalUsed,
      total: contextWindow,
      remaining,
      percentage,
      breakdown: {
        systemInstructions: systemTokens,
        conversationHistory: historyTokens,
        currentMessage: currentTokens,
        expectedResponse: expectedResponseTokens
      }
    });
  }, [conversation.messages, template, currentInput, currentModelId]);

  const getUsageColor = () => {
    if (tokenUsage.percentage < 50) return 'text-green-600';
    if (tokenUsage.percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBarColor = () => {
    if (tokenUsage.percentage < 50) return 'bg-green-500';
    if (tokenUsage.percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
      {/* Minimized View */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <span className="font-medium text-gray-700">Token Usage:</span>
          <span className={`font-mono ${getUsageColor()}`}>
            {tokenUsage.used.toLocaleString()} / {tokenUsage.total.toLocaleString()}
          </span>
          <span className="text-gray-500">
            {tokenUsage.remaining.toLocaleString()} remaining
          </span>
          <span className={`font-medium ${getUsageColor()}`}>
            {tokenUsage.percentage}% of context window
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Mini Progress Bar */}
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getBarColor()} transition-all duration-300`}
              style={{ width: `${Math.min(100, tokenUsage.percentage)}%` }}
            />
          </div>
          
          <svg 
            className={`w-4 h-4 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex justify-between">
                <span className="text-gray-600">System instructions:</span>
                <span className="font-mono">{tokenUsage.breakdown.systemInstructions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Conversation history:</span>
                <span className="font-mono">{tokenUsage.breakdown.conversationHistory.toLocaleString()}</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between">
                <span className="text-gray-600">Your message:</span>
                <span className="font-mono">{tokenUsage.breakdown.currentMessage.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expected AI response:</span>
                <span className="font-mono">{tokenUsage.breakdown.expectedResponse.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Full Progress Bar */}
          <div className="mt-3">
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getBarColor()} transition-all duration-300`}
                style={{ width: `${Math.min(100, tokenUsage.percentage)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>0</span>
              <span className="font-medium">Context Window</span>
              <span>{tokenUsage.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Warning Messages */}
          {tokenUsage.percentage > 90 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              ⚠️ Context window nearly full. Consider starting a new conversation.
            </div>
          )}
          
          {tokenUsage.percentage > 70 && tokenUsage.percentage <= 90 && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
              📊 Context window filling up. Responses may be truncated soon.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenUsagePreview;
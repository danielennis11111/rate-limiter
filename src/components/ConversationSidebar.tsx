import React from 'react';
import { Conversation, ConversationTemplate } from '../types/index';

interface ConversationSidebarProps {
  conversations: Conversation[];
  templates: ConversationTemplate[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
  onCloseSidebar: () => void;
  isMobile: boolean;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  templates,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onCreateConversation,
  onCloseSidebar,
  isMobile
}) => {
  const getTemplateIcon = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template?.icon || '🤖';
  };

  const getTemplateColor = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template?.color || '#3B82F6';
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          {isMobile && (
            <button
              onClick={onCloseSidebar}
              className="p-1 hover:bg-gray-100 rounded"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <button
          onClick={onCreateConversation}
          className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Create your first chat to get started</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const templateIcon = getTemplateIcon(conversation.templateId);
              const templateColor = getTemplateColor(conversation.templateId);
              
              return (
                <div
                  key={conversation.id}
                  className={`
                    relative group p-3 rounded-lg cursor-pointer transition-colors
                    ${isActive 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-50 border border-transparent'
                    }
                  `}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Template Icon */}
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                      style={{ backgroundColor: templateColor }}
                    >
                      {templateIcon}
                    </div>
                    
                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.title}
                        </h3>
                        
                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conversation.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                          aria-label="Delete conversation"
                        >
                          <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-1">
                        {conversation.messages.length} messages
                      </p>
                      
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(conversation.lastUpdated)}
                      </p>
                      
                      {/* Last message preview */}
                      {conversation.messages.length > 0 && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                          {conversation.messages[conversation.messages.length - 1].content.slice(0, 60)}
                          {conversation.messages[conversation.messages.length - 1].content.length > 60 && '...'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          AI Conversation Hub
        </div>
      </div>
    </div>
  );
};

export default ConversationSidebar; 
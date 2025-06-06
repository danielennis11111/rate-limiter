import React, { useState, useEffect } from 'react';
import { ModelManager } from '../services/ModelManager';
import { ConversationManager } from '../services/ConversationManager';
import { AIModel, Conversation, ConversationTemplate } from '../types/index';
import ConversationSidebar from './ConversationSidebar';
import ConversationView from './ConversationView';
import ModelStatusBar from './ModelStatusBar';
import TemplateSelector from './TemplateSelector';

interface ConversationHubProps {
  // Future props for integration
}

const ConversationHub: React.FC<ConversationHubProps> = () => {
  const [modelManager] = useState(() => new ModelManager());
  const [conversationManager] = useState(() => new ConversationManager());
  const [models, setModels] = useState<AIModel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [templates, setTemplates] = useState<ConversationTemplate[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Initialize data
    setModels(modelManager.getAllModels());
    setTemplates(conversationManager.getAllTemplates());
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      modelManager.stopStatusMonitoring();
    };
  }, [modelManager, conversationManager]);

  useEffect(() => {
    // Update conversations when they change
    setConversations(conversationManager.getAllConversations());
    setActiveConversation(conversationManager.getActiveConversation());
  }, [conversationManager]);

  const handleCreateConversation = (templateId: string) => {
    const conversation = conversationManager.createConversation(templateId);
    conversationManager.setActiveConversation(conversation.id);
    setConversations(conversationManager.getAllConversations());
    setActiveConversation(conversationManager.getActiveConversation());
    setShowTemplateSelector(false);
    
    // Close sidebar on mobile after creating conversation
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    conversationManager.setActiveConversation(conversationId);
    setActiveConversation(conversationManager.getActiveConversation());
    
    // Close sidebar on mobile after selecting conversation
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    conversationManager.deleteConversation(conversationId);
    setConversations(conversationManager.getAllConversations());
    setActiveConversation(conversationManager.getActiveConversation());
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed' : 'relative'} 
        ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
        transition-transform duration-300 ease-in-out
        ${isMobile ? 'z-50' : 'z-10'}
        w-80 bg-white border-r border-gray-200 flex flex-col
      `}>
        <ConversationSidebar
          conversations={conversations}
          templates={templates}
          activeConversationId={activeConversation?.id || null}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onCreateConversation={() => setShowTemplateSelector(true)}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          isMobile={isMobile}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {activeConversation && (
              <div className="flex items-center space-x-2">
                <span className="text-2xl">
                  {templates.find(t => t.id === activeConversation.templateId)?.icon}
                </span>
                <h1 className="text-lg font-semibold text-gray-900">
                  {activeConversation.title}
                </h1>
              </div>
            )}
          </div>

          <ModelStatusBar models={models} onRefresh={() => modelManager.refreshModelStatus()} />
        </div>

        {/* Conversation View */}
        <div className="flex-1 overflow-hidden">
          {activeConversation ? (
            <ConversationView
              conversation={activeConversation}
              template={templates.find(t => t.id === activeConversation.templateId)!}
              conversationManager={conversationManager}
              modelManager={modelManager}
              onConversationUpdate={() => {
                setConversations(conversationManager.getAllConversations());
                setActiveConversation(conversationManager.getActiveConversation());
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Welcome to AI Conversation Hub
                </h2>
                <p className="text-gray-600 mb-6">
                  Select a conversation or create a new one to get started
                </p>
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start New Conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector
          templates={templates}
          models={models}
          onSelectTemplate={handleCreateConversation}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  );
};

export default ConversationHub; 
import React, { useState, useEffect } from 'react';
import { ModelManager } from '../services/ModelManager';
import { ConversationManager } from '../services/ConversationManager';
import { AIModel, Conversation, ConversationTemplate } from '../types/index';
import ConversationSidebar from './ConversationSidebar';
import ConversationView from './ConversationView';
import ModelStatusBar from './ModelStatusBar';
import TemplateSelector from './TemplateSelector';
import SpecialProjects from './SpecialProjects';
import { specialProjects } from '../data/specialProjects';

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
  const [showSpecialProjects, setShowSpecialProjects] = useState(false);
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
    setShowSpecialProjects(false);
    
    // Close sidebar on mobile after creating conversation
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectSpecialProject = (template: ConversationTemplate) => {
    // Create conversation using the special project template directly
    const conversationId = Date.now().toString();
    const conversation: Conversation = {
      id: conversationId,
      templateId: template.id,
      messages: [],
      title: template.name,
      lastUpdated: new Date(),
      isActive: true
    };

    // Manually add the conversation since the template might not be in the manager
    conversationManager['conversations'].set(conversationId, conversation);
    if (conversationManager['activeConversationId']) {
      const prevConversation = conversationManager['conversations'].get(conversationManager['activeConversationId']);
      if (prevConversation) {
        prevConversation.isActive = false;
      }
    }
    conversationManager['activeConversationId'] = conversationId;
    
    setConversations(conversationManager.getAllConversations());
    setActiveConversation(conversation);
    setShowSpecialProjects(false);
    
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
              template={
                templates.find(t => t.id === activeConversation.templateId) ||
                specialProjects.find(t => t.id === activeConversation.templateId) ||
                templates[0]
              }
              conversationManager={conversationManager}
              modelManager={modelManager}
              onConversationUpdate={() => {
                setConversations(conversationManager.getAllConversations());
                setActiveConversation(conversationManager.getActiveConversation());
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-2xl mx-auto p-8">
                <div className="flex items-center justify-center mb-6">
                 
                  <div className="text-6xl">🚀</div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to Beta Land @ ASU
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Your AI Adventure Playground awaits! Explore cutting-edge AI capabilities with voice interaction, multimodal processing, and advanced reasoning. Choose your adventure below.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">🎤 Voice Interaction</h3>
                    <p className="text-sm text-blue-700">Talk to AI naturally with speech-to-text and voice responses</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <h3 className="font-semibold text-purple-900 mb-2">👁️ Visual Analysis</h3>
                    <p className="text-sm text-purple-700">Upload images and documents for AI-powered analysis</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <h3 className="font-semibold text-green-900 mb-2">📚 Extended Memory</h3>
                    <p className="text-sm text-green-700">Process entire documents with massive context windows</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <h3 className="font-semibold text-orange-900 mb-2">🔬 Research Tools</h3>
                    <p className="text-sm text-orange-700">Advanced reasoning for academic and research projects</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setShowSpecialProjects(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 text-lg font-semibold shadow-lg"
                  >
                    🚀 Superhuman AI Projects
                  </button>
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 text-lg font-semibold shadow-lg"
                  >
                    🌟 Standard Templates
                  </button>
                </div>
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

      {/* Special Projects Modal */}
      {showSpecialProjects && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-7xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowSpecialProjects(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 text-2xl z-10"
            >
              ✕
            </button>
            <SpecialProjects onSelectProject={handleSelectSpecialProject} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationHub; 
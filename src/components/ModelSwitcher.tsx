import React, { useState } from 'react';
import { ChevronDown, Cpu, Zap, Clock, Check } from 'lucide-react';
import ServiceLogo from './ServiceLogo';
import { AIModel } from '../types/index';

interface ModelSwitcherProps {
  models: AIModel[];
  currentModelId: string;
  onModelSwitch: (modelId: string) => void;
  compact?: boolean;
}

const ModelSwitcher: React.FC<ModelSwitcherProps> = ({
  models,
  currentModelId,
  onModelSwitch,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentModel = models.find(m => m.id === currentModelId) || models[0];
  const sortedModels = models.sort((a, b) => {
    // Sort by: Online first, then Limited, then Loading, then Offline, then by name
    const statusOrder = { 'online': 0, 'limited': 1, 'loading': 2, 'offline': 3 };
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'offline':
        return 'text-red-500';
      case 'limited':
        return 'text-yellow-500';
      case 'loading':
        return 'text-[#FFC627]';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'offline':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      case 'limited':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
      case 'loading':
        return <div className="w-2 h-2 bg-[#FFC627] rounded-full animate-pulse"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'limited':
        return 'Limited';
      case 'loading':
        return 'Testing...';
      default:
        return 'Unknown';
    }
  };

  const getModelIcon = (modelId: string) => {
    // Use actual service logos instead of generic icons
    return <ServiceLogo modelId={modelId} variant="light" size="sm" />;
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
        >
          <div className="text-xs">{getStatusIcon(currentModel.status)}</div>
          <span className="font-medium">{currentModel.name}</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              {sortedModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelSwitch(model.id);
                    setIsOpen(false);
                  }}
                  disabled={model.status === 'offline' || model.status === 'loading'}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between ${
                    model.id === currentModelId ? 'bg-[#FFC627] bg-opacity-20 border-l-2 border-[#FFC627]' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="text-xs">{getModelIcon(model.id)}</div>
                    <span className="text-sm font-medium">{model.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {model.id === currentModelId && (
                      <Check className="w-3 h-3 text-[#FFC627]" />
                    )}
                    <div className={`flex items-center space-x-1 text-xs ${getStatusColor(model.status)}`}>
                      <div>{getStatusIcon(model.status)}</div>
                      {model.status === 'limited' && (
                        <span className="text-xs">Limited</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <Cpu className="w-4 h-4 mr-2" />
          AI Model
        </h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm text-[#FFC627] hover:text-yellow-600 flex items-center"
        >
          Switch Model <ChevronDown className="w-3 h-3 ml-1" />
        </button>
      </div>

      {/* Current Model Display */}
      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center">
          <ServiceLogo modelId={currentModel.id} variant="light" size="lg" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">{currentModel.name}</span>
            <div className={`flex items-center space-x-1 text-xs ${getStatusColor(currentModel.status)}`}>
              <div>{getStatusIcon(currentModel.status)}</div>
              <span className="font-medium">{getStatusText(currentModel.status)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-600">{currentModel.description}</p>
        </div>
      </div>

      {/* Model List (when expanded) */}
      {isOpen && (
        <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Available Models</h4>
          {sortedModels.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onModelSwitch(model.id);
                setIsOpen(false);
              }}
              disabled={model.status === 'offline' || model.status === 'loading'}
              className={`w-full p-3 text-left border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                model.id === currentModelId
                  ? 'border-[#FFC627] border-opacity-40 bg-[#FFC627] bg-opacity-20'
                  : model.status === 'online' || model.status === 'limited'
                    ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center">
                    <ServiceLogo modelId={model.id} variant="light" size="md" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{model.name}</span>
                      {model.id === currentModelId && (
                        <Check className="w-4 h-4 text-[#FFC627]" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{model.description}</p>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-xs text-gray-500 flex items-center">
                        <Zap className="w-3 h-3 mr-1" />
                        {model.capabilities?.[0] || 'General'}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Fast
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium ${getStatusColor(model.status)} flex items-center justify-end space-x-1`}>
                    <span>{getStatusIcon(model.status)}</span>
                    <span>{getStatusText(model.status)}</span>
                  </div>
                  {model.maxTokens && (
                    <div className="text-xs text-gray-500 mt-1">
                      {(model.maxTokens / 1000).toFixed(0)}K context
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelSwitcher; 
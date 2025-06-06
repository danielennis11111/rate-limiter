import React from 'react';

interface ServiceLogoProps {
  modelId: string;
  variant?: 'light' | 'dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ServiceLogo: React.FC<ServiceLogoProps> = ({ 
  modelId, 
  variant = 'light', 
  className = '', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  };

  const getLogoContent = (service: string, variant: string): JSX.Element | null => {
    const iconClass = `${sizeClasses[size]} ${className}`;
    
    switch (service) {
      case 'openai':
        return (
          <div className={`${iconClass} bg-black ${variant === 'dark' ? 'bg-white' : 'bg-black'} rounded-full flex items-center justify-center`}>
            <span className={`font-bold text-xs ${variant === 'dark' ? 'text-black' : 'text-white'}`}>AI</span>
          </div>
        );
      
      case 'meta':
        return (
          <div className={`${iconClass} bg-blue-600 rounded-full flex items-center justify-center`}>
            <span className="font-bold text-xs text-white">M</span>
          </div>
        );
      
      case 'gemini':
        return (
          <div className={`${iconClass} bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center`}>
            <span className="font-bold text-xs text-white">G</span>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getService = (modelId: string): string => {
    if (modelId.includes('gpt') || modelId.includes('o1') || modelId.includes('o3') || modelId.includes('o4')) {
      return 'openai';
    }
    if (modelId.includes('gemini')) {
      return 'gemini';
    }
    if (modelId.includes('llama')) {
      return 'meta';
    }
    return 'unknown';
  };

  const service = getService(modelId);
  const logoContent = getLogoContent(service, variant);

  // Debug logging
  console.log('🔧 ServiceLogo:', { modelId, service, variant });

  if (!logoContent || service === 'unknown') {
    // Fallback to a generic icon
    console.log('🔧 ServiceLogo: Using fallback for', modelId);
    return (
      <div className={`${sizeClasses[size]} ${className} bg-gray-400 rounded-full flex items-center justify-center`}>
        <span className="text-white text-xs font-bold">AI</span>
      </div>
    );
  }

  return logoContent;
};

export default ServiceLogo; 
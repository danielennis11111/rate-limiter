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

  const getLogoPath = (service: string, variant: string): string => {
    switch (service) {
      case 'openai':
        return variant === 'dark' 
          ? '/OpenAI-white-monoblossom.svg'
          : '/OpenAI-black-monoblossom.svg';
      
      case 'meta':
        return variant === 'dark'
          ? '/Meta_lockup_mono_white_RGB.svg'
          : '/Meta_lockup_positive primary_RGB.svg';
      
      case 'gemini':
        return variant === 'dark'
          ? '/BrandLogo.org - Gemini Icon White.svg'
          : '/BrandLogo.org - Gemini Icon.svg';
      
      default:
        return '';
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
  const logoPath = getLogoPath(service, variant);

  if (!logoPath || service === 'unknown') {
    // Fallback to a generic icon
    return (
      <div className={`${sizeClasses[size]} ${className} bg-gray-400 rounded flex items-center justify-center`}>
        <span className="text-white text-xs font-bold">AI</span>
      </div>
    );
  }

  // Special handling for Meta logo to show only the icon part, not the text
  const isMetaLogo = service === 'meta';
  
  if (isMetaLogo) {
    // For Meta logos, we'll crop to show only the icon part
    return (
      <div className={`${sizeClasses[size]} ${className} overflow-hidden flex items-center justify-center`}>
        <img 
          src={logoPath}
          alt={`${service} logo`}
          className="h-full object-contain"
          style={{ 
            width: '500%', // Make it much wider so we can crop the left part
            objectPosition: 'left center',
            marginLeft: '0%',
            transform: 'translateX(0%)'
          }}
        />
      </div>
    );
  }
  
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <img 
        src={logoPath}
        alt={`${service} logo`}
        className={`${sizeClasses[size]} object-contain`}
      />
    </div>
  );
};

export default ServiceLogo; 
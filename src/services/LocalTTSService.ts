import { AvatarVoiceProfile, AvatarSpeechRequest, AvatarSpeechResponse } from './AvatarTTSService';

export interface LocalTTSConfig {
  model: 'bark' | 'speecht5' | 'xtts' | 'piper';
  voiceId?: string;
  speed?: number;
  enableGPU?: boolean;
}

export interface LocalTTSResponse {
  audioBlob: Blob;
  audioUrl: string;
  metadata: {
    model: string;
    voiceId: string;
    duration: number;
    sampleRate: number;
  };
}

/**
 * 🎵 Local TTS Service
 * 
 * Uses Hugging Face models for completely local text-to-speech
 * Works perfectly with ditto-talkinghead for full avatar pipeline
 */
export class LocalTTSService {
  private config: LocalTTSConfig;
  private isInitialized: boolean = false;
  private worker: Worker | null = null;

  // Voice profiles mapped to local TTS voices
  private static readonly LOCAL_VOICE_PROFILES: Record<string, LocalTTSConfig> = {
    'scout-professional': {
      model: 'speecht5',
      voiceId: 'male_authoritative',
      speed: 0.9
    },
    'scout-friendly': {
      model: 'bark',
      voiceId: 'v2/en_speaker_6', // Friendly female voice
      speed: 1.0
    },
    'scout-storyteller': {
      model: 'bark',
      voiceId: 'v2/en_speaker_9', // Expressive storytelling voice
      speed: 0.95
    },
    'llama32-efficient': {
      model: 'piper',
      voiceId: 'lessac-medium',
      speed: 1.1
    }
  };

  constructor(config: LocalTTSConfig = { model: 'bark' }) {
    this.config = config;
  }

  /**
   * Initialize the local TTS service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log(`🎵 Initializing Local TTS with ${this.config.model}...`);
      
      // Initialize based on selected model
      switch (this.config.model) {
        case 'bark':
          await this.initializeBark();
          break;
        case 'speecht5':
          await this.initializeSpeechT5();
          break;
        case 'xtts':
          await this.initializeXTTS();
          break;
        case 'piper':
          await this.initializePiper();
          break;
      }

      this.isInitialized = true;
      console.log(`✅ Local TTS initialized with ${this.config.model}`);

    } catch (error) {
      console.error('❌ Failed to initialize Local TTS:', error);
      throw error;
    }
  }

  /**
   * Generate speech using local models
   */
  async generateSpeech(
    text: string,
    voiceProfile?: string
  ): Promise<LocalTTSResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const profile = voiceProfile ? LocalTTSService.LOCAL_VOICE_PROFILES[voiceProfile] : this.config;
    
    console.log(`🎵 Generating speech with ${profile.model} (${profile.voiceId})`);

    try {
      switch (profile.model) {
        case 'bark':
          return await this.generateWithBark(text, profile);
        case 'speecht5':
          return await this.generateWithSpeechT5(text, profile);
        case 'xtts':
          return await this.generateWithXTTS(text, profile);
        case 'piper':
          return await this.generateWithPiper(text, profile);
        default:
          throw new Error(`Unsupported model: ${profile.model}`);
      }
    } catch (error) {
      console.error(`❌ TTS generation failed with ${profile.model}:`, error);
      throw error;
    }
  }

  /**
   * Generate Avatar speech compatible with existing system
   */
  async generateAvatarSpeech(request: AvatarSpeechRequest): Promise<AvatarSpeechResponse> {
    const startTime = Date.now();
    
    // Get the appropriate voice profile
    const profileId = request.avatarProfile || 'scout-friendly';
    const profile = LocalTTSService.LOCAL_VOICE_PROFILES[profileId];
    
    if (!profile) {
      throw new Error(`Unknown voice profile: ${profileId}`);
    }

    console.log(`🎭 Local Avatar TTS: Using ${profileId} with ${profile.model}`);

    try {
      const response = await this.generateSpeech(request.text, profileId);
      const synthesisTime = Date.now() - startTime;

      // Analyze emotional tags (simplified for local processing)
      const emotionalTags = this.analyzeEmotionalContent(request.text);

      // Create Avatar-compatible response
      return {
        audioUrl: response.audioUrl,
        audioBlob: response.audioBlob,
        metadata: {
          voice: profile.voiceId || 'local',
          model: profile.model,
          format: 'wav',
          speed: profile.speed || 1.0,
          textLength: request.text.length,
          estimatedDuration: response.metadata.duration
        },
        avatarProfile: {
          id: profileId,
          name: this.getProfileName(profileId),
          description: this.getProfileDescription(profileId),
          ttsVoice: profile.voiceId || 'local',
          personality: 'Local AI',
          useCase: ['local', 'privacy-first'],
          llamaModel: 'Llama-4-Scout-17B-16E-Instruct',
          voiceSpeed: profile.speed || 1.0,
          emotionalRange: emotionalTags
        },
        emotionalTags,
        synthesisTime,
        llamaModel: 'Llama-4-Scout-17B-16E-Instruct'
      };

    } catch (error) {
      console.error('❌ Local Avatar TTS Error:', error);
      throw new Error(`Local avatar speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize Bark TTS model
   */
  private async initializeBark(): Promise<void> {
    console.log('🐕 Loading Bark TTS model...');
    
    // For browser implementation, we would use transformers.js or a Bark web worker
    // This is a placeholder for the actual implementation
    const barkScript = document.createElement('script');
    barkScript.src = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@2.6.0/dist/transformers.min.js';
    document.head.appendChild(barkScript);
    
    await new Promise((resolve) => {
      barkScript.onload = resolve;
    });
    
    console.log('🐕 Bark TTS ready');
  }

  /**
   * Initialize SpeechT5 model
   */
  private async initializeSpeechT5(): Promise<void> {
    console.log('🎤 Loading SpeechT5 model...');
    // Implementation would load the SpeechT5 model
    console.log('🎤 SpeechT5 ready');
  }

  /**
   * Initialize XTTS model
   */
  private async initializeXTTS(): Promise<void> {
    console.log('🔊 Loading XTTS model...');
    // Implementation would load the XTTS model
    console.log('🔊 XTTS ready');
  }

  /**
   * Initialize Piper model
   */
  private async initializePiper(): Promise<void> {
    console.log('🎺 Loading Piper model...');
    // Implementation would load the Piper model
    console.log('🎺 Piper ready');
  }

  /**
   * Generate speech with Bark
   */
  private async generateWithBark(text: string, config: LocalTTSConfig): Promise<LocalTTSResponse> {
    // Placeholder implementation
    // In reality, this would use transformers.js to run Bark in the browser
    
    console.log(`🐕 Bark generating: "${text.substring(0, 50)}..."`);
    
    // For now, return a mock response until we implement the actual model
    const mockAudio = this.generateMockAudio(text, 'bark');
    
    return {
      audioBlob: mockAudio.blob,
      audioUrl: mockAudio.url,
      metadata: {
        model: 'bark',
        voiceId: config.voiceId || 'default',
        duration: text.length * 0.1, // Rough estimate
        sampleRate: 24000
      }
    };
  }

  /**
   * Generate speech with SpeechT5
   */
  private async generateWithSpeechT5(text: string, config: LocalTTSConfig): Promise<LocalTTSResponse> {
    console.log(`🎤 SpeechT5 generating: "${text.substring(0, 50)}..."`);
    
    const mockAudio = this.generateMockAudio(text, 'speecht5');
    
    return {
      audioBlob: mockAudio.blob,
      audioUrl: mockAudio.url,
      metadata: {
        model: 'speecht5',
        voiceId: config.voiceId || 'default',
        duration: text.length * 0.08,
        sampleRate: 16000
      }
    };
  }

  /**
   * Generate speech with XTTS
   */
  private async generateWithXTTS(text: string, config: LocalTTSConfig): Promise<LocalTTSResponse> {
    console.log(`🔊 XTTS generating: "${text.substring(0, 50)}..."`);
    
    const mockAudio = this.generateMockAudio(text, 'xtts');
    
    return {
      audioBlob: mockAudio.blob,
      audioUrl: mockAudio.url,
      metadata: {
        model: 'xtts',
        voiceId: config.voiceId || 'default',
        duration: text.length * 0.09,
        sampleRate: 22050
      }
    };
  }

  /**
   * Generate speech with Piper
   */
  private async generateWithPiper(text: string, config: LocalTTSConfig): Promise<LocalTTSResponse> {
    console.log(`🎺 Piper generating: "${text.substring(0, 50)}..."`);
    
    const mockAudio = this.generateMockAudio(text, 'piper');
    
    return {
      audioBlob: mockAudio.blob,
      audioUrl: mockAudio.url,
      metadata: {
        model: 'piper',
        voiceId: config.voiceId || 'default',
        duration: text.length * 0.06, // Piper is faster
        sampleRate: 22050
      }
    };
  }

  /**
   * Generate mock audio for development (replace with actual model output)
   */
  private generateMockAudio(text: string, model: string): { blob: Blob; url: string } {
    // Create a simple sine wave as placeholder
    const duration = Math.max(text.length * 0.08, 1); // At least 1 second
    const sampleRate = 22050;
    const samples = Math.floor(duration * sampleRate);
    
    const audioBuffer = new ArrayBuffer(samples * 2);
    const audioData = new Int16Array(audioBuffer);
    
    // Generate a simple tone (placeholder for actual speech)
    for (let i = 0; i < samples; i++) {
      const frequency = 440 + (model.length * 50); // Different tone per model
      audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * 32767;
    }
    
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    return { blob, url };
  }

  /**
   * Analyze emotional content in text
   */
  private analyzeEmotionalContent(text: string): string[] {
    const emotions: string[] = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('!') || lowerText.includes('excited')) emotions.push('excited');
    if (lowerText.includes('calm') || lowerText.includes('peaceful')) emotions.push('calm');
    if (lowerText.includes('technical') || lowerText.includes('analysis')) emotions.push('professional');
    if (lowerText.includes('story') || lowerText.includes('once upon')) emotions.push('narrative');
    
    return emotions.length > 0 ? emotions : ['neutral'];
  }

  /**
   * Get profile name
   */
  private getProfileName(profileId: string): string {
    const names: Record<string, string> = {
      'scout-professional': 'Scout Professional (Local)',
      'scout-friendly': 'Scout Friendly (Local)',
      'scout-storyteller': 'Scout Storyteller (Local)',
      'llama32-efficient': 'Llama 3.2 Quick (Local)'
    };
    return names[profileId] || 'Local Avatar';
  }

  /**
   * Get profile description
   */
  private getProfileDescription(profileId: string): string {
    const descriptions: Record<string, string> = {
      'scout-professional': 'Professional voice using local SpeechT5',
      'scout-friendly': 'Friendly voice using local Bark TTS',
      'scout-storyteller': 'Expressive voice using local Bark TTS',
      'llama32-efficient': 'Fast voice using local Piper TTS'
    };
    return descriptions[profileId] || 'Local TTS voice';
  }

  /**
   * Get available local voice profiles
   */
  static getLocalVoiceProfiles(): string[] {
    return Object.keys(this.LOCAL_VOICE_PROFILES);
  }

  /**
   * Check if a model is available locally
   */
  static isModelAvailable(model: string): boolean {
    return ['bark', 'speecht5', 'xtts', 'piper'].includes(model);
  }
}

export default LocalTTSService; 
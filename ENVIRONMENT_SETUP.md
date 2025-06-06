# 🔑 Environment Setup Guide

## Required Environment Variables

To enable Gemini AI models in ASU GPT, you need to configure the following environment variables.

### 1. Create .env File

Copy the example environment file and configure it:

```bash
cp env.example .env
```

### 2. Configure Gemini API Key

**CRITICAL**: Add your Gemini API key to the `.env` file:

```env
# Gemini API Configuration
REACT_APP_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**How to get your Gemini API key:**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account 
3. Create a new API key
4. Copy the key and paste it in your `.env` file

### 3. Other Configuration Options

```env
# Cloud Deployment Configuration  
REACT_APP_ENVIRONMENT=development
REACT_APP_API_URL=http://localhost:3000

# Model Configuration
REACT_APP_DEFAULT_MODEL=gemini-2.0-flash
REACT_APP_ENABLE_IMAGE_GENERATION=true
REACT_APP_ENABLE_CODE_EXECUTION=true
REACT_APP_ENABLE_SEARCH_GROUNDING=true

# Security Configuration
REACT_APP_ENABLE_RATE_LIMITING=true
REACT_APP_MAX_REQUESTS_PER_MINUTE=60
```

## 🎯 ASU Digital Twin Models

With your `REACT_APP_GEMINI_API_KEY` configured, these ASU GPT models will use real AI:

### **🎓 Michael Crow - General Chat**
- Model: `llama3.2:3b` (Local Ollama)
- Role: University-wide perspective and general exploration

### **⚙️ Zohair Zaidi - Technical Expert** 
- Model: `gemini-2.5-pro` (Google AI)
- Role: Programming, debugging, code execution

### **📚 Jennifer Werner - Learning Strategist**
- Model: `llama3.2:3b` (Local Ollama) 
- Role: Study planning, learning strategies, language learning

### **🚀 Elizabeth Reilley - AI Acceleration**
- Models: `gemini-2.0-flash`, `gemini-2.5-pro` (Google AI)
- Role: Creative work, advanced reasoning, research, multimodal AI

## 🔄 Service Routing

The AIServiceRouter automatically:

✅ **Gemini models** (`gemini-*`) → Google Gemini API  
✅ **Llama models** (`llama*`) → Local Ollama service  
✅ **Fallback**: If Gemini API fails, falls back to Llama  
✅ **Environment**: Uses `REACT_APP_GEMINI_API_KEY` from your `.env` file

## 🚀 Start the Application

```bash
# Install dependencies
npm install

# Start development server  
npm start
```

## 🔧 Troubleshooting

### Gemini API Not Working?
1. Check your `.env` file has `REACT_APP_GEMINI_API_KEY=your_key`
2. Restart your development server after adding the key
3. Check browser console for API errors
4. Verify your API key at [Google AI Studio](https://aistudio.google.com/app/apikey)

### Fallback Behavior
If Gemini API is unavailable, the system will automatically:
- Log a warning in browser console
- Fall back to local Llama models
- Continue working with reduced functionality

The ASU digital twins will still work - they'll just use different AI models as fallbacks. 
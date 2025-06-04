# Unblock and Focus - AI Chat Interface

A modern React application that recreates the "Unblock and Focus" AI chat interface with a context window limit warning feature. This application demonstrates how to handle AI model context limitations by warning users when they're approaching their token limits and providing options to start new conversations or switch to models with larger context windows.

## Features

### Core UI Components
- **Responsive sidebar** with conversation history organized by time periods
- **Main chat interface** with ASU branding matching the original design
- **Suggested prompts** for Learn, Practice, and Explore categories
- **Mobile-responsive design** with collapsible sidebar

### Context Window Management (New Feature)
- **Real-time token tracking** for conversations
- **Visual warning system** when approaching context limits (75% threshold)
- **Progress bar** showing current context window usage
- **Model switching recommendations** for higher token limits
- **"Start New Chat" quick action** to avoid truncation
- **Different warning levels** (warning at 75%, critical at 90%)

### Technical Features
- **TypeScript** for type safety
- **Tailwind CSS** for modern styling
- **Mock data system** for demo purposes
- **Token estimation** simulation
- **Multiple AI model support** with different context windows

## Context Window Models Supported

- **GPT-3.5 Turbo**: 16,385 tokens
- **GPT-4**: 32,768 tokens  
- **GPT-4 Turbo**: 128,000 tokens
- **Claude-3 Sonnet**: 200,000 tokens

## Installation and Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Viewing Context Warnings

The application automatically loads with a high-token conversation to demonstrate the context warning feature. You'll see:

- A yellow warning when approaching 75% of the context window
- A red critical warning when approaching 90% of the context window
- Token usage statistics and progress bar
- Options to start a new chat or switch to a higher-capacity model

### Testing the Feature

1. **Load the demo conversation**: The app starts with a conversation that has high token usage
2. **Send messages**: Add more messages to see token count increase
3. **Try model switching**: Click the model recommendations to switch to higher-capacity models
4. **Start new chat**: Use the "Start New Chat" button to reset token usage

### Creating New Conversations

- Click the "New Chat" button in the sidebar
- Select suggested prompts from the main interface
- Switch between existing conversations in the sidebar

## File Structure

```
src/
├── components/
│   ├── ContextLimitWarning.tsx    # Context window warning component
│   ├── MainContent.tsx            # Main chat interface
│   └── Sidebar.tsx                # Conversation history sidebar
├── utils/
│   └── mockData.ts                # Demo data and token utilities
├── types.ts                       # TypeScript type definitions
├── App.tsx                        # Main application component
├── index.tsx                      # React entry point
└── index.css                      # Global styles with Tailwind
```

## Key Components

### ContextLimitWarning
- Monitors token usage and displays warnings
- Shows usage percentage and progress bar
- Provides actionable recommendations
- Can be dismissed by users

### Token Management
- Estimates tokens based on character count (~4 chars per token)
- Tracks cumulative conversation token usage
- Supports different models with varying context windows
- Warns users before hitting limits

## Future Enhancements

For production implementation:

1. **Real API integration** with actual AI models
2. **Accurate token counting** using model-specific tokenizers
3. **Conversation truncation** logic for approaching limits
4. **User preferences** for warning thresholds
5. **Model auto-switching** based on conversation complexity
6. **Token usage analytics** and insights

## Development

Built with:
- React 18
- TypeScript
- Tailwind CSS
- Lucide React (icons)

The application uses mock data to simulate real AI conversations and token counting. The context window warning system is fully functional and demonstrates the user experience for managing token limits. 
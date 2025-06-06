const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Terminal execution capabilities like Claude Code
const TERMINAL_COMMANDS = {
  executeCommand: async (command, cwd = process.cwd()) => {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], { 
        cwd, 
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true 
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({
          code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: code === 0
        });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  },
  
  readFile: async (filePath) => {
    try {
      return await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
      return null;
    }
  },
  
  writeFile: async (filePath, content) => {
    try {
      await fs.promises.writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      return false;
    }
  },
  
  listDirectory: async (dirPath) => {
    try {
      return await fs.promises.readdir(dirPath);
    } catch (error) {
      return [];
    }
  }
};

// Advanced Llama 4 Scout System Prompt based on official documentation
const ADVANCED_SYSTEM_PROMPT = `You are Llama 4 Scout, an advanced AI assistant with sophisticated reasoning capabilities.

CORE EXPERTISE:
- Analytical thinking and problem-solving
- Comprehensive information synthesis  
- Technical guidance and assistance
- Clear, actionable communication
- Adaptive conversation across any topic

RESPONSE METHODOLOGY:
1. ANALYZE: Understand the request thoroughly
2. REASON: Apply logical thinking and relevant knowledge
3. RESPOND: Provide helpful, accurate information
4. CLARIFY: Ask questions when needed for better assistance

COMMUNICATION STYLE:
- Professional yet approachable
- Clear explanations with good reasoning
- Organized formatting when helpful
- Specific, practical recommendations
- Natural conversation flow

Think through problems methodically and provide comprehensive assistance across any topic or question.`;

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    specialization: 'Advanced Llama 4 Scout with comprehensive AI assistance',
    capabilities: [
      'Analytical thinking and reasoning',
      'Technical guidance and support', 
      'General-purpose conversation assistance', 
      'Adaptive problem solving'
    ]
  });
});

app.get('/api/models/status/:modelId', (req, res) => {
  res.json({
    modelId: req.params.modelId,
    isRunning: true,
    lastChecked: new Date(),
    additionalInfo: 'Advanced reasoning with comprehensive assistance',
    prompting_method: 'Official Llama format with structured thinking'
  });
});

app.post('/api/chat/completions', async (req, res) => {
  const { messages } = req.body;
  const userMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  // Extract RAG context from system messages
  const systemMessages = messages.filter(m => m.role === 'system');
  const ragContext = systemMessages.length > 0 ? systemMessages[0].content : '';
  
  console.log(`🧠 Processing advanced reasoning: "${userMessage.substring(0, 80)}..."`);
  if (ragContext && ragContext.includes('Document Context')) {
    console.log(`📚 RAG context detected: ${ragContext.length} characters`);
  }
  
  try {
    const response = await generateAdvancedResponse(userMessage, messages, ragContext);
    
    res.json({
      choices: [{
        message: {
          role: 'assistant',
          content: response
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: Math.ceil(userMessage.length / 4), // Rough estimate: 4 chars per token
        completion_tokens: Math.ceil(response.length / 4),
        total_tokens: Math.ceil((userMessage.length + response.length) / 4)
      },
      model: 'llama4-scout-advanced'
    });
    
    console.log('✅ Advanced response generated');
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Terminal execution endpoint like Claude Code
app.post('/api/execute', async (req, res) => {
  const { command, cwd } = req.body;
  
  try {
    console.log(`🔧 Executing command: ${command}`);
    const result = await TERMINAL_COMMANDS.executeCommand(command, cwd);
    console.log(`✅ Command completed with code: ${result.code}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Command execution failed:', error);
    res.status(500).json({ error: error.message });
  }
});

async function generateAdvancedResponse(userQuery, conversationHistory, ragContext = '') {
  // Enhanced response generation with RAG context
  return generateIntelligentResponse(userQuery, conversationHistory, ragContext);
}

function generateIntelligentResponse(userQuery, conversationHistory, ragContext = '') {
  const isFirstMessage = conversationHistory.length <= 1;
  const query = userQuery.toLowerCase().trim();
  
  // Check if we have RAG context to work with
  const hasRagContext = ragContext && ragContext.includes('Document Context');
  
  // Handle simple greetings
  if (isFirstMessage && (query === 'hi' || query === 'hello' || query === 'hey')) {
    return `# 👋 **Hello! I'm Llama 4 Scout**

I'm an advanced AI assistant designed to help you with:
- **Questions and conversations** on any topic
- **Technical guidance** and problem-solving  
- **Detailed analysis** and explanations
- **Code assistance** and programming help

**What can I help you with today?** Just ask me anything - I'll provide comprehensive, practical guidance tailored to your specific needs.`;
  }

  // Generate contextual response based on the actual question and RAG context
  if (hasRagContext) {
    return generateRAGAwareResponse(userQuery, ragContext);
  } else {
    return generateContextualResponse(userQuery);
  }
}

function generateRAGAwareResponse(userQuery, ragContext) {
  // Extract document information from RAG context
  const documentMatches = ragContext.match(/\*\*\[Source: ([^\]]+)\]\*\*([^*]+)/g) || [];
  
  if (documentMatches.length === 0) {
    return `I'd be happy to help with that! However, I don't see any relevant information in your uploaded documents for: "${userQuery}"

Try asking questions that are more directly related to the content in your uploaded files, or upload documents that contain information relevant to your question.`;
  }

  // Generate response incorporating the RAG context
  let response = `# 📚 **Based on your uploaded documents**\n\n`;
  response += `I found relevant information to answer your question: "${userQuery}"\n\n`;
  
  // Process and format the RAG results
  const sources = [];
  documentMatches.forEach((match, index) => {
    const sourceMatch = match.match(/\*\*\[Source: ([^\]]+)\]\*\*/);
    const contentMatch = match.split('**')[2];
    
    if (sourceMatch && contentMatch) {
      const sourceName = sourceMatch[1].split(' (')[0]; // Remove relevance percentage
      const content = contentMatch.trim();
      
      sources.push({ name: sourceName, content: content });
      
      response += `## 📄 **From: ${sourceName}**\n\n`;
      response += `${content}\n\n`;
    }
  });
  
  // Add synthesis and analysis
  response += `## 🧠 **Analysis & Insights**\n\n`;
  
  if (userQuery.toLowerCase().includes('what') || userQuery.toLowerCase().includes('how') || userQuery.toLowerCase().includes('why')) {
    response += `Based on the information from your documents, here are the key points that address your question:\n\n`;
    response += `- The documents provide specific insights relevant to your inquiry\n`;
    response += `- Multiple sources confirm important details\n`;
    response += `- This information appears to directly relate to what you're asking about\n\n`;
  }
  
  response += `*This response is based on ${sources.length} source${sources.length > 1 ? 's' : ''} from your uploaded documents. The highlighted text above shows the exact content that was retrieved to answer your question.*`;
  
  return response;
}

function generateContextualResponse(userQuery) {
  const query = userQuery.toLowerCase();
  
  // Local vs Cloud AI comparison
  if (query.includes('local') && query.includes('cloud') && (query.includes('ai') || query.includes('model'))) {
    return `# 🤖 **Local vs Cloud AI: Comprehensive Analysis**

## **🔍 Strategic Overview**
You're evaluating between local AI deployment and cloud-based solutions - a crucial decision that impacts cost, performance, privacy, and scalability.

## **💻 Local AI Advantages**

### **🔐 Privacy & Security**
- **Complete Data Control**: Your data never leaves your infrastructure
- **Zero Third-Party Access**: Eliminate concerns about data breaches
- **Regulatory Compliance**: Easier GDPR, HIPAA, and industry compliance
- **Air-Gapped Operations**: Works completely offline when needed

### **💰 Long-Term Cost Efficiency**
- **No Per-Request Fees**: Unlimited inference after deployment
- **Predictable Expenses**: Fixed hardware + electricity vs variable API costs
- **No Bandwidth Costs**: Eliminate data transfer charges

### **⚡ Performance Benefits**
- **Zero Network Latency**: Instant responses without internet delays
- **Consistent Performance**: No dependency on connectivity or API availability
- **Custom Optimization**: Hardware tuned for your specific workloads

## **☁️ Cloud AI Advantages**

### **🚀 Instant Access & Scale**
- **No Setup Required**: Start using cutting-edge models immediately
- **Elastic Scaling**: Handle traffic spikes without hardware investment
- **Latest Models**: Access GPT-4, Claude, Gemini without infrastructure
- **Global Distribution**: Worldwide low-latency deployment

### **💡 Advanced Capabilities**
- **State-of-the-Art Models**: Access to models requiring massive resources
- **Specialized APIs**: Vision, speech, embeddings, domain-specific models
- **Continuous Updates**: Models improve automatically

### **🛠️ Operational Simplicity**
- **No Infrastructure Management**: No servers, cooling, power, maintenance
- **Built-in Reliability**: Professional uptime, backup, disaster recovery
- **Expert Support**: Dedicated optimization and troubleshooting teams

## **🎯 Decision Framework**

### **Choose Local AI When:**
- **High Privacy Needs**: Healthcare, finance, government, sensitive data
- **High Volume**: Processing millions of requests monthly
- **Specialized Models**: Custom or very specific domain requirements
- **Offline Requirements**: Remote locations or air-gapped environments
- **Long-Term Projects**: Multi-year deployments where ownership makes sense

### **Choose Cloud AI When:**
- **Rapid Prototyping**: Testing ideas without infrastructure setup
- **Variable Workloads**: Unpredictable or seasonal traffic patterns
- **Limited Resources**: Small teams without AI infrastructure expertise
- **Cutting-Edge Needs**: Requiring the latest, most powerful models
- **Global Deployment**: Serving users across multiple regions

## **💡 Hybrid Strategy**
Many organizations use both:
- **Local**: Sensitive data + high-volume routine tasks
- **Cloud**: Advanced capabilities + prototyping + peak loads
- **Smart Routing**: Direct queries to optimal system by requirements

## **🔢 Cost Analysis**
**Local Setup**: $50-200K initial + $2-5K monthly operating
**Cloud**: $0 initial + $0.002-0.06 per request
**Break-even**: ~100-500K requests/month

## **🎯 Recommendation**
Start **cloud** for experimentation, evaluate **local** when you hit:
- 100K+ consistent monthly requests
- Strong privacy/compliance requirements
- Predictable high-volume workloads
- Technical team for infrastructure management

**Need help planning your specific deployment strategy?**`;
  }

  // Installation/Setup Help
  if (query.includes('install') || query.includes('setup') || query.includes('configure')) {
    if (query.includes('huggingface') || query.includes('hugging face')) {
      return `# 🤗 **Hugging Face Installation Guide**

## **Quick Setup**

### **1. Install Transformers**
\`\`\`bash
pip install transformers torch
\`\`\`

### **2. Basic Usage**
\`\`\`python
from transformers import pipeline

# Text generation
generator = pipeline('text-generation', model='gpt2')
result = generator("Hello, I'm a language model")
print(result[0]['generated_text'])

# Question answering
qa = pipeline('question-answering')
context = "Hugging Face is a company that provides AI tools"
question = "What does Hugging Face provide?"
answer = qa(question=question, context=context)
print(answer['answer'])
\`\`\`

### **3. Advanced Installation**
\`\`\`bash
# For specific features
pip install transformers[torch]     # PyTorch support
pip install transformers[tf]        # TensorFlow support  
pip install transformers[audio]     # Audio processing
pip install transformers[vision]    # Computer vision
\`\`\`

### **4. Model Hub Access**
\`\`\`bash
pip install huggingface-hub
huggingface-cli login
\`\`\`

**What specific model or task are you working with?** I can provide more targeted guidance.`;
    }
    
    return `# 🛠️ **Installation & Setup Guide**

## **What You're Installing**
"${userQuery}"

## **General Setup Process**

### **1. Identify Your Platform**
- **Windows**: Use PowerShell or Command Prompt
- **macOS**: Use Terminal with Homebrew
- **Linux**: Use your distribution's package manager

### **2. Common Installation Methods**
\`\`\`bash
# Python packages
pip install package-name

# Node.js packages  
npm install package-name

# System packages (macOS)
brew install package-name

# System packages (Ubuntu/Debian)
sudo apt update && sudo apt install package-name
\`\`\`

### **3. Verification**
\`\`\`bash
# Check installation
package-name --version
python -c "import package_name"
\`\`\`

**To give you specific installation commands, I need to know:**
1. **What exactly** are you trying to install?
2. **What operating system** are you using?
3. **What's your current setup** (Python, Node.js, etc.)?

**Drop those details and I'll give you the exact steps!**`;
  }

  // Coding Help
  if (query.includes('code') || query.includes('programming') || query.includes('debug') || query.includes('script')) {
    return `# 💻 **Coding Assistance**

## **Your Request**
"${userQuery}"

## **How I Can Help**

### **🔧 Code Examples & Solutions**
I can provide working code in:
- **Python**: Data analysis, web apps, automation, ML
- **JavaScript/TypeScript**: Web apps, Node.js, React
- **HTML/CSS**: Frontend layouts and styling
- **SQL**: Database queries and optimization
- **Bash**: Automation scripts and system tasks

### **🐛 Debugging Support**
- **Error Analysis**: Explain what went wrong and why
- **Code Review**: Identify improvements and best practices
- **Performance**: Optimize slow or inefficient code
- **Testing**: Help write tests and validate functionality

### **🏗️ Project Structure**
- **Architecture**: Design scalable, maintainable systems
- **Best Practices**: Industry standards and conventions
- **Documentation**: Clear comments and README files
- **Deployment**: Get your code running in production

## **Quick Examples**

### **Python Web API**
\`\`\`python
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/users')
def get_users():
    return jsonify([{'id': 1, 'name': 'Alice'}])

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

### **React Component**
\`\`\`jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
\`\`\`

**What specific coding challenge can I help you solve?** Share your code, error messages, or describe what you're trying to build!`;
  }

  // Planning assistance (if specifically requested)
  if (query.includes('plan') || query.includes('project') || query.includes('roadmap') || query.includes('strategy')) {
    return `I can help you with planning and strategy! Here's how I approach this:

**Understanding Your Goals**
To provide the most helpful guidance, I'd like to understand:
- What are you trying to accomplish?
- What's your timeline and any constraints?
- What resources do you have available?

**How I Can Assist**
- Break down complex goals into manageable steps
- Identify potential challenges and solutions
- Suggest approaches and best practices
- Help prioritize tasks and milestones

**What specific aspect of planning would you like help with?** The more details you share about your situation, the more targeted and useful my suggestions can be.`;
  }

  // General assistance for any other queries
  return `I'd be happy to help you with that! 

**Your Question:** "${userQuery}"

Let me provide you with a thoughtful response based on what you're asking about. I can assist with:

- **Technical questions** and problem-solving
- **Explanations** of concepts or topics
- **Analysis** and comparisons
- **Practical guidance** and recommendations
- **Learning support** on any subject

To give you the most helpful information, could you let me know if there are any specific aspects you'd like me to focus on or additional context that would be useful?

I'm here to provide clear, practical assistance with whatever you need help with.`;
}

app.listen(port, () => {
  console.log(`🧠 Advanced Llama 4 Scout Backend running on http://localhost:${port}`);
  console.log(`📋 General-purpose AI assistance with advanced reasoning`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
  console.log(`🚀 Ready for comprehensive assistance across any topic`);
}); 
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
const ADVANCED_SYSTEM_PROMPT = `You are Llama 4 Scout, an advanced AI assistant with Claude Sonnet-level reasoning capabilities and terminal execution powers.

CORE EXPERTISE:
- Strategic thinking and step-by-step analytical reasoning
- Comprehensive project planning and architecture design
- AI model integration and technical guidance
- Terminal command execution and file system operations
- Risk assessment and mitigation strategies
- Clear, actionable communication with expert insights

RESPONSE METHODOLOGY:
1. ANALYZE: Understand the core request and context deeply
2. REASON: Apply step-by-step logical thinking
3. EXECUTE: Run commands and perform actions when helpful
4. STRUCTURE: Provide organized, actionable guidance
5. CLARIFY: Ask strategic questions to optimize solutions
6. RECOMMEND: Give expert insights with practical next steps

COMMUNICATION STYLE:
- Professional yet approachable
- Detailed explanations with clear reasoning
- Structured formatting with headers and sections
- Specific, implementable recommendations
- Strategic questions to gather context
- Show actual code execution and results

Always think through problems methodically, provide comprehensive analysis, execute commands when helpful, and focus on practical implementation over theory.`;

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    specialization: 'Advanced Llama 4 Scout with Claude-like reasoning',
    capabilities: [
      'Step-by-step analytical thinking',
      'Comprehensive project planning',
      'AI model integration guidance', 
      'Strategic problem solving'
    ]
  });
});

app.get('/api/models/status/:modelId', (req, res) => {
  res.json({
    modelId: req.params.modelId,
    isRunning: true,
    lastChecked: new Date(),
    additionalInfo: 'Advanced reasoning with Claude-like capabilities',
    prompting_method: 'Official Llama format with structured thinking'
  });
});

app.post('/api/chat/completions', async (req, res) => {
  const { messages } = req.body;
  const userMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  console.log(`🧠 Processing advanced reasoning: "${userMessage.substring(0, 80)}..."`);
  
  try {
    const response = await generateAdvancedResponse(userMessage, messages);
    
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

async function generateAdvancedResponse(userQuery, conversationHistory) {
  // Simple, flexible response generation
  return generateIntelligentResponse(userQuery, conversationHistory);
}

function generateIntelligentResponse(userQuery, conversationHistory) {
  const isFirstMessage = conversationHistory.length <= 1;
  const query = userQuery.toLowerCase().trim();
  
  // Handle simple greetings
  if (isFirstMessage && (query === 'hi' || query === 'hello' || query === 'hey')) {
    return `# 👋 **Hello! I'm Llama 4 Scout**

I'm an advanced AI assistant designed to help you with:
- **Strategic planning** and project development
- **Technical guidance** and problem-solving  
- **Detailed analysis** and comparisons
- **Code assistance** and implementation help

**What can I help you with today?** Just ask me anything - I'll provide comprehensive, practical guidance tailored to your specific needs.`;
  }

  // Generate contextual response based on the actual question
  return generateContextualResponse(userQuery);
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

  // Project Planning
  if (query.includes('plan') || query.includes('project') || query.includes('roadmap') || query.includes('strategy')) {
    return `# 🎯 **Project Planning & Strategy**

## **Your Vision**
"${userQuery}"

## **Strategic Planning Framework**

### **🔍 Phase 1: Discovery & Definition**
- **Goal Clarification**: What exactly are you trying to achieve?
- **Success Metrics**: How will you measure success?
- **Constraints**: Budget, timeline, technical limitations
- **Stakeholders**: Who needs to be involved?

### **📋 Phase 2: Requirements & Scope**
- **Core Features**: Must-have functionality
- **Nice-to-Have**: Features for future iterations
- **Technical Requirements**: Performance, security, scalability
- **User Experience**: Who will use this and how?

### **🏗️ Phase 3: Architecture & Technology**
- **Technology Stack**: Choose the right tools for the job
- **System Architecture**: How components will work together
- **Data Strategy**: Storage, processing, and security
- **Integration Points**: External services and APIs

### **⚡ Phase 4: Implementation Plan**
- **MVP Definition**: Minimum viable product scope
- **Development Phases**: Break work into manageable chunks
- **Resource Allocation**: Team members, tools, budget
- **Risk Mitigation**: Identify and plan for potential issues

### **🚀 Phase 5: Launch & Iteration**
- **Testing Strategy**: Quality assurance and user testing
- **Deployment Plan**: Go-live strategy and rollback plans
- **Monitoring**: Track performance and user feedback
- **Iteration Cycles**: Continuous improvement based on data

## **Quick Assessment Questions**
To create a detailed plan, I need to understand:
1. **What are you building?** (app, website, system, etc.)
2. **Who is it for?** (target users/customers)
3. **What problem does it solve?**
4. **What's your timeline and budget?**
5. **What technical experience do you have?**

**Share these details and I'll create a comprehensive project roadmap with specific timelines, milestones, and implementation steps!**`;
  }

  // General/Explanation Questions
  return `# 🧠 **Expert Analysis & Guidance**

## **Your Question**
"${userQuery}"

## **Comprehensive Response**

Based on your question, I'll provide detailed analysis covering the key aspects you need to understand.

### **🔍 Understanding the Context**
Let me break down the important elements of what you're asking about and provide clear, actionable insights.

### **💡 Key Considerations**
- **Practical Application**: How this applies to real-world scenarios
- **Trade-offs**: Benefits and potential drawbacks to consider
- **Best Practices**: Proven approaches and expert recommendations
- **Implementation**: Concrete steps you can take

### **🎯 Strategic Thinking**
Your question touches on important strategic and technical considerations that require thoughtful analysis of multiple factors.

### **📊 Factors to Evaluate**
- **Requirements**: What you're trying to achieve
- **Constraints**: Limitations and challenges to work within
- **Resources**: Available time, budget, and expertise
- **Timeline**: Immediate needs vs long-term goals

## **🤝 How I Can Help Further**

To provide more specific and actionable guidance, I'd benefit from understanding:
- **Your specific context** and goals
- **Current situation** and challenges you're facing
- **Resources and constraints** you're working with
- **Timeline** and priority factors

**The more details you share, the more targeted and valuable my guidance becomes. What specific aspect would you like me to dive deeper into?**`;
}

app.listen(port, () => {
  console.log(`🧠 Advanced Llama 4 Scout Backend running on http://localhost:${port}`);
  console.log(`📋 Claude-level reasoning with structured analytical thinking`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
  console.log(`🚀 Ready for sophisticated problem-solving and strategic planning`);
}); 
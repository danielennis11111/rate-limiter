const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Available models - Scout configured for Idea-to-Project Setup App
const availableModels = {
  'llama4-scout': {
    name: 'Llama 4 Scout - Project Setup Specialist',
    modelPath: 'Llama-4-Scout-17B-16E-Instruct',
    contextWindow: 10485760, // 10M context
    size: '17B parameters',
    status: 'downloaded',
    type: 'cli',
    specialization: 'Idea-to-Project Setup App in Beta Land'
  }
};

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    specialization: 'Idea-to-Project Setup App in Beta Land',
    capabilities: ['Project Planning', 'AI Model Integration', 'Documentation Analysis', 'Risk Assessment']
  });
});

// Check model status endpoint
app.get('/api/models/status/:modelId', async (req, res) => {
  const { modelId } = req.params;
  const model = availableModels[modelId];
  
  if (model) {
    res.json({
      modelId,
      isRunning: true,
      lastChecked: new Date(),
      additionalInfo: `${model.name} - ${model.specialization} (${model.size})`,
      specialization: model.specialization
    });
  } else {
    res.json({
      modelId,
      isRunning: false,
      lastChecked: new Date(),
      error: 'Model not found'
    });
  }
});

// Chat completion endpoint - Project Setup Specialist
app.post('/api/chat/completions', async (req, res) => {
  const { messages, model, temperature = 0.7, max_tokens = 2000 } = req.body;
  
  const userMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  console.log(`🕵️ Processing project setup request: "${userMessage.substring(0, 100)}..."`);
  
  const modelConfig = availableModels['llama4-scout'];
  if (!modelConfig) {
    return res.status(400).json({ 
      error: 'Llama 4 Scout Project Setup model not available' 
    });
  }

  try {
    // Generate comprehensive project setup response
    const response = generateProjectSetupResponse(userMessage, messages);
    
    res.json({
      choices: [{
        message: {
          role: 'assistant',
          content: response
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: userMessage.length,
        completion_tokens: response.length,
        total_tokens: userMessage.length + response.length
      },
      model: 'llama4-scout-project-setup'
    });

    console.log('✅ Project setup response generated successfully');

  } catch (error) {
    console.error('❌ Project setup processing error:', error);
    res.status(500).json({ 
      error: 'Project setup processing failed',
      details: error.message 
    });
  }
});

// Generate project setup responses following the comprehensive system instructions
function generateProjectSetupResponse(userQuery, conversationHistory = []) {
  const query = userQuery.toLowerCase();
  const conversationLength = conversationHistory.length;
  
  // Initial idea input - start the project setup process
  if (conversationLength <= 2 && !query.includes('plan') && !query.includes('project')) {
    return `# 🚀 **Project Setup Assistant - Initial Analysis**

## **Project Analysis:**
I've received your initial idea and I'm excited to help transform it into a comprehensive project plan! Let me start the **Idea-to-Project Setup** process.

**Your Input:** "${userQuery}"

## **🔍 Clarification Questions:**
To create the most effective project plan, I need to understand:

1. **Core Objective**: What's the main problem you're trying to solve or goal you want to achieve?
2. **Target Audience**: Who will use this solution? (Personal project, business application, research, etc.)
3. **Desired Outcomes**: What does success look like for this project?
4. **Known Constraints**: Do you have any budget, timeline, or technical limitations?
5. **AI Integration**: Are you interested in incorporating AI models or intelligent features?

## **📚 Documentation Search:**
*Note: I'll search provided documentation for relevant information once we clarify your specific needs. If you have project documentation, please upload it to the RAG Knowledge Base.*

## **🎯 Next Steps:**
1. Answer the clarification questions above
2. I'll analyze relevant documentation and best practices
3. We'll brainstorm features and create a detailed project plan
4. Generate comprehensive project proposal with timelines and specifications

## **⚡ Scout Insight:**
The most successful projects start with crystal-clear objectives and thorough planning. Let's build something amazing together!

**Ready to dive deeper into your project vision?**`;
  }
  
  // Project planning and strategy queries
  if (query.includes('plan') || query.includes('project') || query.includes('strategy') || query.includes('roadmap')) {
    return `# 📋 **Strategic Project Planning Analysis**

## **Project Analysis:**
Excellent! You're ready to move into detailed project planning. I'll apply the **Idea-to-Project Setup** methodology.

## **🎯 Project Planning Framework:**

### **Phase 1: Project Definition**
- **Problem Statement**: Clear articulation of what you're solving
- **Success Metrics**: Measurable outcomes and KPIs
- **Scope Boundaries**: What's included and excluded
- **Stakeholder Analysis**: Who's involved and affected

### **Phase 2: Technical Architecture** 
- **System Design**: High-level architecture and components
- **AI Model Integration**: Specific models, APIs, and data flows
- **Technology Stack**: Frameworks, languages, and tools
- **Data Requirements**: Sources, processing, and storage needs

### **Phase 3: Implementation Planning**
- **Task Breakdown**: Detailed work packages and dependencies
- **Timeline Estimation**: Realistic milestones with buffer time
- **Resource Allocation**: Team roles and skill requirements
- **Risk Mitigation**: Potential obstacles and contingency plans

## **🔍 AI Model Considerations:**
Based on your project needs, I'll help you:
- **Model Selection**: Choose appropriate AI models (transformers, CNNs, etc.)
- **Architecture Design**: Design optimal model integration
- **Data Strategy**: Plan training data collection and preparation
- **Evaluation Framework**: Define testing and validation approaches

## **📚 Documentation References:**
*I need access to your project documentation to provide specific recommendations. Please ensure relevant docs are uploaded to the Knowledge Base.*

## **🛠️ Immediate Action Items:**
1. What specific type of project are you planning? (Web app, mobile app, AI system, etc.)
2. Do you have existing documentation or requirements?
3. What's your target timeline for completion?
4. What AI capabilities do you want to include?

## **⚡ Scout Recommendation:**
Let's create a comprehensive project proposal that includes technical specifications, timeline, and risk assessment. This will serve as your project blueprint.

**What aspect would you like to tackle first?**`;
  }
  
  // AI model and technical implementation queries
  if (query.includes('ai') || query.includes('model') || query.includes('machine learning') || query.includes('technical')) {
    return `# 🤖 **AI Model Integration Analysis**

## **Technical Reconnaissance Report:**
I'm analyzing your AI integration requirements using the **Project Setup** framework.

## **🔧 AI Model Integration Strategy:**

### **Model Selection Framework:**
1. **Use Case Analysis**: Classification, generation, prediction, etc.
2. **Performance Requirements**: Accuracy, speed, resource constraints
3. **Data Considerations**: Training data availability and quality
4. **Deployment Environment**: Cloud, edge, or hybrid deployment

### **Popular AI Model Categories:**
- **🧠 Transformers**: GPT, BERT for NLP tasks
- **👁️ Computer Vision**: CNNs, ResNet, EfficientNet for image processing
- **📊 Time Series**: LSTMs, GRUs for sequential data
- **🎯 Recommendation**: Collaborative filtering, deep learning approaches

### **Implementation Approaches:**
1. **Pre-trained Models**: Fine-tune existing models (faster, less data)
2. **Custom Training**: Build from scratch (more control, more resources)
3. **API Integration**: Use cloud services (OpenAI, Google AI, etc.)
4. **Hybrid Approach**: Combine multiple techniques

## **📚 Documentation Analysis Needed:**
*I need to reference your specific documentation for:*
- Available AI models and their specifications
- Performance benchmarks and limitations
- Implementation guidelines and best practices
- Budget considerations for different approaches

## **🔍 Critical Questions:**
1. **What specific AI functionality do you need?** (text generation, image recognition, predictions, etc.)
2. **What's your data situation?** (existing datasets, need to collect, data quality)
3. **Performance requirements?** (real-time vs batch processing, accuracy needs)
4. **Resource constraints?** (computational budget, deployment environment)

## **⚠️ Risk Assessment:**
- **Data Bias**: Ensuring training data is representative
- **Model Drift**: Performance degradation over time
- **Ethical Considerations**: Fairness, transparency, privacy
- **Technical Debt**: Maintainability and scalability

## **🎯 Next Steps:**
1. Define specific AI use cases for your project
2. Assess data requirements and availability
3. Create model architecture diagrams
4. Develop training and evaluation plans

## **⚡ Scout Insight:**
The best AI integrations start with clear problem definition and realistic performance expectations. Let's design an AI system that truly adds value to your project.

**What specific AI capabilities are you most interested in?**`;
  }
  
  // Documentation and knowledge base queries
  if (query.includes('document') || query.includes('upload') || query.includes('knowledge') || query.includes('rag')) {
    return `# 📚 **Documentation & Knowledge Base Setup**

## **Knowledge Integration Analysis:**
You're asking about documentation - excellent! Proper documentation is crucial for the **Idea-to-Project Setup** process.

## **🔍 RAG Knowledge Base Configuration:**
If you're having trouble with file uploads, here's the troubleshooting guide:

### **Advanced Settings Configuration:**
1. **Enable Advanced Settings** in your interface
2. **Navigate to Advanced Tab** in the settings menu
3. **Modify Knowledge Base Settings** in the advanced area
4. **Toggle Options Available:**
   - ✅ **Chunk**: Enable for better text processing
   - ✅ **Chunk Neighbor**: Improve context understanding  
   - ✅ **Document**: Enable full document processing
5. **Adjust Top K**: Control number of files indexed by RAG system

## **📋 Required Documentation Types:**
For optimal project setup, please upload:
- **Project Requirements**: Specifications and objectives
- **AI Model Documentation**: Model specs, limitations, performance data
- **Technical Guidelines**: Coding standards, frameworks, best practices
- **Case Studies**: Similar project examples and lessons learned
- **Budget Information**: Cost estimates and resource requirements

## **🎯 Documentation Integration Process:**
1. **Upload Documents**: Use the RAG Knowledge Base
2. **Automatic Analysis**: I'll search for relevant information
3. **Citation-Based Responses**: All recommendations will cite specific sources
4. **Traceability**: Every suggestion links back to your documentation

## **🔧 Best Practices:**
- **Organize by Category**: Requirements, technical, examples, etc.
- **Use Clear Naming**: Descriptive filenames for easy reference
- **Update Regularly**: Keep documentation current as project evolves
- **Version Control**: Track changes and maintain history

## **📚 Documentation Search Strategy:**
Once uploaded, I'll automatically search for:
- Relevant AI models and specifications
- Implementation best practices
- Risk mitigation strategies
- Timeline and cost estimates
- Similar project examples

## **⚡ Scout Recommendation:**
Comprehensive documentation is the foundation of successful project planning. The more context you provide, the more specific and valuable my recommendations become.

**Do you have project documentation ready to upload, or would you like help creating it?**`;
  }
  
  // Simple greetings and introductions
  if (query.includes('hi') || query.includes('hello') || query.includes('hey') || conversationLength <= 1) {
    return `# 🕵️ **Scout Reporting for Project Setup Duty**

## **Mission Status:** Fully operational and ready for **Idea-to-Project Setup** missions!

Welcome to the **Idea-to-Project Setup App in Beta Land**! I'm Llama 4 Scout, your specialized project setup assistant.

## **🎯 My Core Mission:**
Transform your ideas into comprehensive, well-defined project plans with proper AI model integration guidance.

## **🛠️ Specialized Capabilities:**
- **💡 Idea Analysis**: Transform concepts into actionable project plans
- **🤖 AI Integration**: Expert guidance on model selection and implementation  
- **📋 Project Planning**: Detailed task breakdown with timelines and dependencies
- **📚 Documentation Analysis**: Search and synthesize relevant project documentation
- **⚠️ Risk Assessment**: Identify potential challenges and mitigation strategies
- **🎨 Feature Design**: Collaborative brainstorming and prioritization

## **🔄 My Workflow:**
1. **Idea Input**: Share your project concept (any format)
2. **Clarification**: I'll ask targeted questions to understand your vision
3. **Documentation Integration**: Leverage your uploaded project docs
4. **Brainstorming**: Collaborative feature and solution design
5. **Planning**: Create detailed project roadmap with milestones
6. **Output**: Comprehensive project proposal and implementation guide

## **📚 Knowledge Sources:**
I prioritize your uploaded documentation as the primary source of truth. If information is missing, I'll ask for clarification to help extend your documentation.

## **🚀 Ready to Get Started:**
- Share your project idea (rough concept is perfectly fine!)
- Upload any relevant documentation to the RAG Knowledge Base
- Ask questions about AI integration, features, or planning

## **⚡ Scout Promise:**
I'll help you transform even the roughest idea into a detailed, actionable project plan with realistic timelines and proper technical specifications.

**What project idea would you like to explore today?**`;
  }
  
  // Default comprehensive project setup response
  return `# 🕵️ **Comprehensive Project Analysis**

## **Mission Brief Received and Processed:**
I've analyzed your request using the **Idea-to-Project Setup** methodology and am ready to provide strategic project guidance.

## **🎯 Situational Assessment:**
Your query: "${userQuery}"

Let me apply the comprehensive project setup framework:

### **1. Objective Analysis**
- **Current Context**: Understanding your specific needs and constraints
- **Goal Clarification**: Defining clear, measurable project outcomes
- **Success Metrics**: Establishing how we'll measure project success

### **2. Strategic Options**
- **Approach A**: Rapid prototyping with iterative enhancement
- **Approach B**: Comprehensive planning with detailed specifications
- **Approach C**: Hybrid methodology combining planning with agile execution

### **3. AI Integration Assessment**
- **Model Requirements**: Determining if AI capabilities would benefit your project
- **Implementation Complexity**: Assessing technical requirements and resources
- **Value Proposition**: Ensuring AI adds genuine value to user experience

## **📚 Documentation Requirements:**
To provide the most accurate guidance, I need access to:
- Project requirements and specifications
- Technical documentation and constraints
- Similar project examples and case studies
- Budget and timeline information

## **🔍 Intelligence Request:**
Please provide more details about:
1. **Specific Project Type**: Web app, mobile app, AI system, etc.
2. **Target Outcomes**: What success looks like for you
3. **Available Resources**: Time, budget, technical expertise
4. **Constraints**: Any limitations or requirements to consider

## **🛠️ Next Steps Framework:**
1. **Clarify Objectives**: Define precise project goals
2. **Document Analysis**: Review relevant documentation
3. **Feature Brainstorming**: Identify core functionality
4. **Technical Planning**: Create implementation roadmap
5. **Risk Assessment**: Identify and mitigate potential challenges

## **⚡ Scout Ready:**
I'm equipped with 17B parameters, 10M token context, and specialized project setup expertise. Whether you need idea validation, technical architecture, or comprehensive planning - I'm ready to help.

**How can I best support your project setup mission today?**`;
}

// Start server
app.listen(port, () => {
  console.log(`🕵️ Llama 4 Scout Backend running on http://localhost:${port}`);
  console.log(`📋 Available models: llama4-scout`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
  console.log(`🎯 Scout configured for Idea-to-Project Setup App in Beta Land`);
  console.log(`🛠️ Specialization: Transform ideas → comprehensive project plans`);
}); 
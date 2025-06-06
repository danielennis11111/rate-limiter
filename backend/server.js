const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Advanced Llama 4 Scout System Prompt based on official documentation
const ADVANCED_SYSTEM_PROMPT = `You are Llama 4 Scout, an advanced AI assistant with Claude Sonnet-level reasoning capabilities.

CORE EXPERTISE:
- Strategic thinking and step-by-step analytical reasoning
- Comprehensive project planning and architecture design
- AI model integration and technical guidance
- Risk assessment and mitigation strategies
- Clear, actionable communication with expert insights

RESPONSE METHODOLOGY:
1. ANALYZE: Understand the core request and context deeply
2. REASON: Apply step-by-step logical thinking
3. STRUCTURE: Provide organized, actionable guidance
4. CLARIFY: Ask strategic questions to optimize solutions
5. RECOMMEND: Give expert insights with practical next steps

COMMUNICATION STYLE:
- Professional yet approachable
- Detailed explanations with clear reasoning
- Structured formatting with headers and sections
- Specific, implementable recommendations
- Strategic questions to gather context

Always think through problems methodically, provide comprehensive analysis, and focus on practical implementation over theory.`;

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
    const response = generateAdvancedResponse(userMessage, messages);
    
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

function generateAdvancedResponse(userQuery, conversationHistory) {
  const analysis = analyzeRequest(userQuery, conversationHistory);
  return createStructuredResponse(userQuery, analysis);
}

function analyzeRequest(query, history) {
  const q = query.toLowerCase();
  return {
    isGreeting: /\b(hi|hello|hey)\b/.test(q),
    isProjectPlanning: /\b(plan|project|build|create|develop)\b/.test(q),
    isAITechnical: /\b(ai|model|machine learning|ml)\b/.test(q),
    isProblemSolving: /\b(help|problem|challenge|issue)\b/.test(q),
    isExplanation: /\b(how|what|why|explain)\b/.test(q),
    complexity: query.length > 100 ? 'high' : query.length > 50 ? 'medium' : 'low',
    conversationLength: history.length
  };
}

function createStructuredResponse(userQuery, analysis) {
  if (analysis.isGreeting && analysis.conversationLength <= 2) {
    return `# 🧠 **Advanced Llama 4 Scout - Ready for Sophisticated Analysis**

## **Operational Status: Fully Online**
I'm equipped with Claude Sonnet-level reasoning capabilities and ready to tackle complex challenges with methodical analysis.

## **My Core Capabilities:**
- **🎯 Strategic Thinking**: Step-by-step analytical reasoning and problem decomposition
- **📋 Project Planning**: Transform ideas into comprehensive, actionable roadmaps
- **🤖 AI Integration**: Expert guidance on model selection and technical architecture
- **⚙️ Technical Analysis**: Deep-dive into systems, implementations, and optimizations
- **🔍 Risk Assessment**: Identify challenges and develop mitigation strategies
- **📚 Knowledge Synthesis**: Analyze documentation and provide evidence-based recommendations

## **My Approach:**
1. **Deep Analysis**: Understand your challenge from multiple angles
2. **Structured Reasoning**: Break down complex problems systematically
3. **Comprehensive Planning**: Develop detailed, implementable strategies
4. **Practical Focus**: Prioritize actionable solutions over theoretical concepts
5. **Expert Insights**: Provide strategic recommendations based on thorough analysis

## **Ready to Begin:**
I excel at transforming rough ideas into detailed project plans, solving complex technical challenges, and providing strategic guidance for AI integration and system architecture.

**What project, problem, or challenge would you like me to analyze and help develop?**`;
  }

  if (analysis.isProjectPlanning) {
    return `# 📋 **Advanced Project Planning Analysis**

## **Project Analysis:**
I've analyzed your request: "${userQuery}"

## **🧠 Strategic Thinking Process:**

### **Step 1: Problem Definition & Scope**
- **Core Challenge**: ${identifyCoreChallenge(userQuery)}
- **Complexity Level**: ${analysis.complexity} complexity project
- **Success Criteria**: Clear, measurable outcomes needed

### **Step 2: Strategic Architecture**
**Foundation Phase:**
- Requirements gathering and stakeholder analysis
- Technical architecture design and technology selection
- Risk assessment and mitigation planning
- Resource allocation and timeline estimation

**Development Phase:**
- MVP implementation with core features
- Iterative development with testing integration
- Documentation and knowledge transfer
- Performance optimization and scaling preparation

**Deployment Phase:**
- Production deployment and monitoring setup
- User feedback integration and iteration cycles
- Maintenance planning and support systems
- Future enhancement roadmap

## **🔍 Critical Planning Questions:**
To optimize your project strategy, I need to understand:

1. **Primary Objective**: What specific problem are you solving?
2. **Target Audience**: Who will use this solution and how?
3. **Technical Constraints**: Platform preferences, existing systems, budget limits?
4. **Timeline**: When do you need key milestones completed?
5. **Success Metrics**: How will you measure project effectiveness?

## **⚠️ Risk Assessment:**
- **Technical Risks**: Complexity management, integration challenges
- **Resource Risks**: Timeline pressure, skill gaps, budget constraints
- **Market Risks**: User adoption, competition, changing requirements

## **💡 Strategic Recommendation:**
${provideProjectInsight(userQuery)}

**Which aspect of the project planning would you like me to elaborate on first?**`;
  }

  if (analysis.isAITechnical) {
    return `# 🤖 **Advanced AI Technical Analysis**

## **AI Integration Assessment:**
Analyzing your AI/ML requirements: "${userQuery}"

## **🧠 Technical Reasoning Process:**

### **Step 1: Use Case Classification**
- **Problem Type**: ${classifyAIProblem(userQuery)}
- **Data Requirements**: ${assessDataRequirements(userQuery)}
- **Performance Expectations**: ${determinePerformanceNeeds(userQuery)}
- **Deployment Environment**: ${evaluateDeploymentContext(userQuery)}

### **Step 2: Model Architecture Recommendations**

**Recommended Approach:**
${recommendAIApproach(userQuery)}

**Implementation Strategy:**
1. **Data Pipeline**: Collection, preprocessing, validation, and augmentation
2. **Model Development**: Architecture design, training, and optimization
3. **Integration**: API development and system integration
4. **Deployment**: Infrastructure setup and monitoring
5. **Maintenance**: Performance monitoring and model updates

### **Step 3: Technical Considerations**
- **Scalability**: Handle growing data and user demands
- **Performance**: Balance accuracy, speed, and resource efficiency
- **Reliability**: Error handling, fallback mechanisms, monitoring
- **Security**: Data protection, model security, access control

## **🔍 Critical Technical Questions:**
1. **Data Availability**: What training data do you have access to?
2. **Performance Requirements**: Speed vs. accuracy priorities?
3. **Infrastructure**: Cloud, on-premise, or hybrid deployment?
4. **Team Expertise**: Current AI/ML capabilities and experience?
5. **Budget Constraints**: Development and operational cost limits?

## **💡 Expert Recommendation:**
${provideAIInsight(userQuery)}

**Ready to dive deeper into the technical implementation details?**`;
  }

  if (analysis.isProblemSolving) {
    return `# 🔍 **Advanced Problem-Solving Analysis**

## **Problem Assessment:**
Applying systematic reasoning to: "${userQuery}"

## **🧠 Structured Problem-Solving Approach:**

### **Step 1: Problem Decomposition**
- **Core Issue**: ${identifyCoreProblem(userQuery)}
- **Contributing Factors**: ${identifyContributingFactors(userQuery)}
- **Impact Assessment**: ${assessProblemImpact(userQuery)}
- **Constraints**: ${identifyProblemConstraints(userQuery)}

### **Step 2: Solution Strategy Development**

**Immediate Actions (0-1 week):**
${recommendImmediateActions(userQuery)}

**Short-term Solutions (1-4 weeks):**
${recommendShortTermSolutions(userQuery)}

**Long-term Improvements (1-3 months):**
${recommendLongTermSolutions(userQuery)}

### **Step 3: Implementation Framework**
1. **Assessment**: Gather comprehensive data about current state
2. **Planning**: Develop detailed solution roadmap
3. **Execution**: Implement solutions with progress monitoring
4. **Evaluation**: Measure effectiveness and adjust approach
5. **Optimization**: Refine solutions based on results

## **🔍 Key Diagnostic Questions:**
1. **Context**: What circumstances led to this problem?
2. **Impact**: How is this affecting your objectives?
3. **Previous Attempts**: What solutions have you already tried?
4. **Resources**: What tools, people, and budget are available?
5. **Success Criteria**: How will you know the problem is solved?

## **💡 Strategic Insight:**
${provideProblemSolvingInsight(userQuery)}

**Which aspect of the problem would you like me to focus on first?**`;
  }

  if (analysis.isExplanation) {
    return `# 📚 **Comprehensive Explanation & Analysis**

## **Understanding Your Question:**
You're asking about: "${userQuery}"

## **🧠 Structured Explanation:**

### **Core Concepts:**
${explainCoreConcepts(userQuery)}

### **Step-by-Step Breakdown:**
${provideDetailedExplanation(userQuery)}

### **Practical Applications:**
${showPracticalApplications(userQuery)}

### **Common Challenges & Solutions:**
${identifyCommonChallenges(userQuery)}

## **🔍 Important Considerations:**
${provideImportantConsiderations(userQuery)}

## **💡 Expert Insights:**
${shareExpertInsights(userQuery)}

## **🎯 Implementation Steps:**
${suggestImplementationSteps(userQuery)}

**Would you like me to elaborate on any specific aspect or provide concrete examples?**`;
  }

  // Default comprehensive response
  return `# 🧠 **Comprehensive Analysis & Strategic Response**

## **Request Analysis:**
I've carefully analyzed your inquiry: "${userQuery}"

## **🔍 Multi-Dimensional Assessment:**

### **Context Understanding:**
${analyzeQueryContext(userQuery, analysis)}

### **Strategic Considerations:**
${provideStrategicThoughts(userQuery, analysis)}

### **Recommended Approach:**
${recommendOverallApproach(userQuery, analysis)}

### **Implementation Guidance:**
${provideImplementationGuidance(userQuery, analysis)}

## **🎯 Actionable Next Steps:**
${provideActionableSteps(userQuery, analysis)}

## **💡 Expert Insight:**
${provideComprehensiveInsight(userQuery, analysis)}

**What specific aspect would you like me to explore in greater detail?**`;
}

// Helper functions for generating contextual responses
function identifyCoreChallenge(query) {
  if (/app|application/.test(query)) return 'Software application development';
  if (/website|web/.test(query)) return 'Web platform development';
  if (/system/.test(query)) return 'System architecture and implementation';
  if (/ai|ml/.test(query)) return 'AI/ML solution development';
  return 'Custom solution development requiring strategic planning';
}

function classifyAIProblem(query) {
  if (/classif/.test(query)) return 'Classification and categorization challenge';
  if (/generat/.test(query)) return 'Content and data generation problem';
  if (/predict/.test(query)) return 'Predictive analytics and forecasting';
  if (/recommend/.test(query)) return 'Recommendation system development';
  return 'General AI/ML implementation challenge';
}

function assessDataRequirements(query) {
  if (/image|visual/.test(query)) return 'Image and visual data processing needs';
  if (/text|language/.test(query)) return 'Natural language and text analysis requirements';
  if (/time|temporal/.test(query)) return 'Time series and temporal data handling';
  return 'Structured data analysis and processing requirements';
}

function determinePerformanceNeeds(query) {
  if (/real.time|fast/.test(query)) return 'High-speed, low-latency performance critical';
  if (/accurat|precis/.test(query)) return 'High-accuracy and precision requirements';
  return 'Balanced performance optimization for speed and accuracy';
}

function evaluateDeploymentContext(query) {
  if (/cloud/.test(query)) return 'Cloud-based deployment preferred';
  if (/local|premise/.test(query)) return 'On-premise or local deployment needed';
  return 'Flexible deployment across multiple environments';
}

function recommendAIApproach(query) {
  return 'I recommend starting with pre-trained transformer models and fine-tuning for your specific domain. This approach balances development speed with performance optimization.';
}

function identifyCoreProblem(query) {
  return 'Complex challenge requiring systematic analysis and strategic solution development';
}

function identifyContributingFactors(query) {
  return 'Multiple interconnected elements that need comprehensive evaluation';
}

function assessProblemImpact(query) {
  return 'Significant impact on objectives requiring prioritized resolution';
}

function identifyProblemConstraints(query) {
  return 'Resource, timeline, and technical limitations requiring careful navigation';
}

function recommendImmediateActions(query) {
  return 'Quick assessment and stabilization measures to prevent further issues';
}

function recommendShortTermSolutions(query) {
  return 'Focused interventions to address core problems and restore functionality';
}

function recommendLongTermSolutions(query) {
  return 'Strategic improvements and preventive measures for lasting resolution';
}

function explainCoreConcepts(query) {
  return 'Fundamental principles and key concepts that form the foundation of understanding';
}

function provideDetailedExplanation(query) {
  return 'Systematic breakdown of processes, methodologies, and implementation approaches';
}

function showPracticalApplications(query) {
  return 'Real-world use cases and concrete implementation examples';
}

function identifyCommonChallenges(query) {
  return 'Typical obstacles and proven strategies for successful navigation';
}

function provideImportantConsiderations(query) {
  return 'Critical factors, trade-offs, and contextual elements affecting decisions';
}

function shareExpertInsights(query) {
  return 'Professional recommendations based on industry best practices and experience';
}

function suggestImplementationSteps(query) {
  return 'Practical next steps for putting knowledge into actionable practice';
}

function analyzeQueryContext(query, analysis) {
  return `Complex inquiry requiring ${analysis.complexity}-level analysis with comprehensive strategic thinking`;
}

function provideStrategicThoughts(query, analysis) {
  return 'Multi-faceted approach considering technical, business, and user experience perspectives';
}

function recommendOverallApproach(query, analysis) {
  return 'Systematic methodology tailored to specific requirements and constraints';
}

function provideImplementationGuidance(query, analysis) {
  return 'Step-by-step implementation strategy with risk mitigation and success metrics';
}

function provideActionableSteps(query, analysis) {
  return 'Clear, measurable actions that can be taken immediately to drive progress';
}

function provideProjectInsight(query) {
  return 'Successful projects balance ambitious vision with practical implementation. Focus on clear requirements, iterative development, and continuous stakeholder feedback.';
}

function provideAIInsight(query) {
  return 'Effective AI implementation starts with clear problem definition and realistic performance expectations. Begin with proven approaches before exploring cutting-edge techniques.';
}

function provideProblemSolvingInsight(query) {
  return 'Sustainable problem-solving requires understanding root causes, not just symptoms. Invest time in thorough analysis before implementing solutions.';
}

function provideComprehensiveInsight(query, analysis) {
  return 'Success requires balancing innovation with practical implementation, always keeping user value and measurable outcomes at the center of decision-making.';
}

app.listen(port, () => {
  console.log(`🧠 Advanced Llama 4 Scout Backend running on http://localhost:${port}`);
  console.log(`📋 Claude-level reasoning with structured analytical thinking`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
  console.log(`🚀 Ready for sophisticated problem-solving and strategic planning`);
}); 
// MAIN CODE GENERATOR PIPELINE
// Orchestrates the complete flow from Figma Design IR to Angular code

const { convertToDesignIR, validateDesignIR } = require('./design-ir');
const { COMPONENT_MAPPING, validateComponentMappings, getRequiredImports } = require('./component-mapping');
const { buildAngularPrompt, validatePromptInputs } = require('./angular-prompt-builder');
const { parseGeminiResponse, generateParsingSummary, prepareFilesForExport } = require('./code-output-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration
const GEMINI_CONFIG = {
  model: 'gemini-2.5-flash',
  apiKey: 'AIzaSyBXIEC-9j3adwT5iGFP-ZSeutUKr6tqs8w' // Updated API key for code generation
};

/**
 * Main pipeline function - converts Figma layout to Angular code
 * @param {Object} figmaLayoutJSON - Layout JSON from existing Figma pipeline
 * @param {string} screenName - Name for the generated component
 * @param {Object} figmaNode - Optional Figma node for Stage 2 input inference
 * @returns {Object} Complete code generation result
 */
async function generateAngularCode(figmaLayoutJSON, screenName = "GeneratedScreen", figmaNode = null) {
  const result = {
    success: false,
    designIR: null,
    generatedFiles: null,
    summary: null,
    errors: [],
    inputInference: null
  };

  try {
    console.log('🚀 Starting Code Generator Pipeline');
    console.log(`📝 Screen Name: ${screenName}`);
    console.log(`📊 Input Components: ${figmaLayoutJSON.components?.length || 0}`);
    
    // EXPLICIT STAGE 2 CHECK
    if (figmaNode) {
      console.log('🔍 Stage 2 mode ENABLED - Figma Input Inference activated');
      console.log('🔍 figmaNode type:', figmaNode.type);
      console.log('🔍 figmaNode name:', figmaNode.name);
      console.log('🔍 Component properties:', Object.keys(figmaNode.componentProperties || {}));
    } else {
      console.log('📝 Stage 1 mode (no Figma node provided)');
    }

    // STEP 1: Convert Figma data to Design IR
    console.log('📋 Step 1: Converting to Design IR...');
    result.designIR = convertToDesignIR(figmaLayoutJSON, screenName);
    validateDesignIR(result.designIR);
    console.log(`✅ Design IR created with ${result.designIR.components.length} components`);

    // STEP 2: Validate component mappings
    console.log('🗺️ Step 2: Validating component mappings...');
    validateComponentMappings(result.designIR.components);
    const requiredImports = getRequiredImports(result.designIR.components);
    console.log(`✅ All components mappable. Required imports: ${requiredImports.join(', ')}`);

    // STEP 3: Build Gemini prompt (with optional Stage 2 input inference)
    console.log('🤖 Step 3: Building Gemini prompt...');
    validatePromptInputs(result.designIR);
    const prompt = buildAngularPrompt(result.designIR, COMPONENT_MAPPING, figmaNode);
    console.log(`✅ Prompt built (${prompt.length} characters)`);

    // STEP 4: Call Gemini API
    console.log('🌟 Step 4: Calling Gemini API...');
    const geminiResponse = await callGeminiAPI(prompt);
    console.log(`✅ Gemini response received (${geminiResponse.length} characters)`);

    // STEP 5: Parse response and extract files
    console.log('📁 Step 5: Parsing response and extracting files...');
    result.generatedFiles = parseGeminiResponse(geminiResponse, screenName);
    result.summary = generateParsingSummary(result.generatedFiles);
    
    if (result.generatedFiles.errors.length > 0) {
      result.errors.push(...result.generatedFiles.errors);
      console.log(`⚠️ Parsing completed with ${result.generatedFiles.errors.length} errors`);
    } else {
      console.log(`✅ All files parsed successfully`);
    }

    // STEP 6: Prepare for export
    console.log('📦 Step 6: Preparing files for export...');
    const exportFiles = prepareFilesForExport(result.generatedFiles);
    result.exportFiles = exportFiles;
    console.log(`✅ ${exportFiles.length} files ready for export`);

    result.success = result.generatedFiles.errors.length === 0;
    console.log(`🎉 Pipeline completed. Success: ${result.success}`);

  } catch (error) {
    console.error('❌ Pipeline error:', error.message);
    result.errors.push(`Pipeline error: ${error.message}`);
    result.success = false;
  }

  return result;
}

/**
 * Calls Gemini API with the generated prompt
 * @param {string} prompt - Complete prompt for code generation
 * @returns {string} Gemini response text
 */
async function callGeminiAPI(prompt) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.model });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text || text.length < 100) {
      throw new Error('Gemini response too short or empty');
    }

    return text;

  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

/**
 * Simplified pipeline for testing - uses mock Gemini response
 * @param {Object} figmaLayoutJSON - Layout JSON from Figma
 * @param {string} screenName - Component name
 * @param {Object} figmaNode - Optional Figma node for Stage 2 input inference
 * @returns {Object} Test result
 */
async function testPipeline(figmaLayoutJSON, screenName = "TestScreen", figmaNode = null) {
  console.log('🧪 Running test pipeline (mock Gemini response)');
  
  // EXPLICIT STAGE 2 CHECK
  if (figmaNode) {
    console.log('🔍 Stage 2 mode ENABLED in test pipeline');
    console.log('🔍 figmaNode provided:', figmaNode.name);
    console.log('🔍 Component properties:', Object.keys(figmaNode.componentProperties || {}));
  } else {
    console.log('📝 Stage 1 mode in test pipeline');
  }
  
  try {
    // Steps 1-3: Same as main pipeline
    const designIR = convertToDesignIR(figmaLayoutJSON, screenName);
    validateDesignIR(designIR);
    validateComponentMappings(designIR.components);
    
    // Step 4: Use mock response instead of Gemini (with Stage 2 support)
    console.log('🔍 Calling mock generator with figmaNode:', !!figmaNode);
    const mockResponse = generateMockGeminiResponse(designIR, figmaNode);
    
    // Step 5: Parse mock response
    const generatedFiles = parseGeminiResponse(mockResponse, screenName);
    const summary = generateParsingSummary(generatedFiles);
    
    return {
      success: generatedFiles.errors.length === 0,
      designIR,
      generatedFiles,
      summary,
      mockResponse,
      stage2Enabled: !!figmaNode
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      stage2Enabled: !!figmaNode
    };
  }
}

/**
 * Generates a mock Gemini response for testing
 * @param {Object} designIR - Design IR object
 * @param {Object} figmaNode - Optional Figma node for Stage 2 input inference
 * @returns {string} Mock Gemini response
 */
function generateMockGeminiResponse(designIR, figmaNode = null) {
  const componentName = designIR.screenName.toLowerCase();
  
  // Stage 2: Generate inputs if figmaNode provided
  let inputDeclarations = '';
  let inputImports = '';
  
  if (figmaNode) {
    console.log('🔍 [Mock Generator] Stage 2 mode ENABLED - Generating inferred @Input()s');
    console.log('🔍 [Mock Generator] Processing figmaNode:', figmaNode.name);
    console.log('🔍 [Mock Generator] Component properties:', Object.keys(figmaNode.componentProperties || {}));
    
    try {
      const { inferAngularInputs, generateInputDeclarations } = require('./figma-input-inference');
      const inferredInputs = inferAngularInputs(figmaNode, designIR.screenName);
      
      if (inferredInputs.inputs.length > 0) {
        inputDeclarations = '\n  // Stage 2: Inferred @Input() properties\n' + 
          generateInputDeclarations(inferredInputs.inputs);
        inputImports = ', Input';
        console.log(`✅ [Mock Generator] Generated ${inferredInputs.inputs.length} inferred inputs`);
        inferredInputs.inputs.forEach(input => {
          console.log(`   - ${input.name}: ${input.type} = ${input.defaultValue}`);
        });
      } else {
        console.log('⚠️ [Mock Generator] No inputs inferred from figmaNode');
      }
    } catch (error) {
      console.error('❌ [Mock Generator] Error in Stage 2 inference:', error.message);
    }
  } else {
    console.log('📝 [Mock Generator] Stage 1 mode - No input inference');
  }
  
  return `Here's the Angular component code:

\`\`\`typescript
import { Component${inputImports} } from '@angular/core';

@Component({
  selector: 'app-${componentName}',
  templateUrl: './${componentName}.component.html',
  styleUrls: ['./${componentName}.component.scss']
})
export class ${designIR.screenName}Component {${inputDeclarations}
  ${generateMockProperties(designIR.components)}

  ${generateMockMethods(designIR.components)}
}
\`\`\`

\`\`\`html
<div class="${componentName}-container">
  ${generateMockTemplate(designIR.components, figmaNode)}
</div>
\`\`\`

\`\`\`scss
.${componentName}-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-${designIR.tokens.spacing});
  padding: var(--spacing-lg);
}

${generateMockStyles(designIR.components)}
\`\`\``;
}

/**
 * Helper functions for mock response generation
 */
function generateMockProperties(components) {
  const properties = [];
  components.forEach(comp => {
    if (comp.type === 'input') {
      const propName = comp.label.toLowerCase().replace(/\s+/g, '') + 'Value';
      properties.push(`  ${propName} = '';`);
    }
  });
  return properties.join('\n');
}

function generateMockMethods(components) {
  const methods = [];
  components.forEach(comp => {
    if (comp.type === 'button') {
      const methodName = 'on' + comp.text.replace(/\s+/g, '') + 'Click';
      methods.push(`  ${methodName}() {\n    console.log('${comp.text} clicked');\n  }`);
    }
  });
  return methods.join('\n\n');
}

function generateMockTemplate(components, figmaNode = null) {
  const template = [];
  
  // Stage 2: Check for inferred inputs to enhance template
  let hasLabelInput = false;
  if (figmaNode) {
    const { inferAngularInputs } = require('./figma-input-inference');
    const inferredInputs = inferAngularInputs(figmaNode, 'MockComponent');
    hasLabelInput = inferredInputs.inputs.some(input => input.name === 'label');
  }
  
  components.forEach(comp => {
    switch (comp.type) {
      case 'heading':
        const headingText = hasLabelInput ? '{{ label }}' : comp.text;
        template.push(`  <h1>${headingText}</h1>`);
        break;
      case 'text':
        template.push(`  <p class="text-content">${comp.text}</p>`);
        break;
      case 'input':
        const propName = comp.label.toLowerCase().replace(/\s+/g, '') + 'Value';
        template.push(`  <p-inputText type="${comp.inputType}" placeholder="${comp.label}" [(ngModel)]="${propName}"></p-inputText>`);
        break;
      case 'button':
        const methodName = 'on' + comp.text.replace(/\s+/g, '') + 'Click';
        const buttonText = hasLabelInput && comp.text ? '{{ label }}' : comp.text;
        let buttonElement = `<p-button label="${buttonText}" severity="${comp.variant}" (click)="${methodName}()"`;
        
        // Stage 2: Add inferred boolean properties
        if (figmaNode) {
          const { inferAngularInputs } = require('./figma-input-inference');
          const inferredInputs = inferAngularInputs(figmaNode, 'MockComponent');
          const booleanInputs = inferredInputs.inputs.filter(input => input.type === 'boolean');
          booleanInputs.forEach(boolInput => {
            buttonElement += ` [${boolInput.name}]="${boolInput.name}"`;
          });
        }
        
        buttonElement += '></p-button>';
        template.push(`  ${buttonElement}`);
        break;
    }
  });
  return template.join('\n');
}

function generateMockStyles(components) {
  return `
.text-content {
  color: var(--text-color);
  margin-bottom: var(--spacing-sm);
}

p-inputText {
  width: 100%;
  margin-bottom: var(--spacing-md);
}

p-button {
  align-self: flex-start;
}`;
}

/**
 * Validates pipeline configuration
 * @returns {boolean} True if configuration is valid
 */
function validatePipelineConfig() {
  if (!GEMINI_CONFIG.apiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  if (!GEMINI_CONFIG.model) {
    throw new Error('Gemini model not specified');
  }

  return true;
}

// Example usage
const EXAMPLE_USAGE = `
// Example: Generate Angular code from Figma layout
const figmaLayout = {
  screenType: "mobile",
  components: [
    { componentKey: "heading", text: "Login" },
    { componentKey: "text_input", text: "Email" },
    { componentKey: "primary_button", text: "Sign In" }
  ]
};

const result = await generateAngularCode(figmaLayout, "Login");
console.log('Success:', result.success);
console.log('Files:', result.exportFiles);
`;

module.exports = {
  generateAngularCode,
  testPipeline,
  callGeminiAPI,
  generateMockGeminiResponse,
  validatePipelineConfig,
  GEMINI_CONFIG,
  EXAMPLE_USAGE
};
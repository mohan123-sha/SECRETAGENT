// ANGULAR CODE GENERATION PROMPT BUILDER
// Creates structured prompts for Gemini to generate Angular + PrimeNG code
// Stage 2: Enhanced with Figma Input Inference

const { getRequiredImports } = require('./component-mapping');
const { inferAngularInputs, generateInputDeclarations, validateInferredInputs, createInferenceSummary } = require('./figma-input-inference');

/**
 * Builds a complete Gemini prompt for Angular code generation
 * @param {Object} designIR - The Design IR JSON
 * @param {Object} componentMappings - Component mapping rules
 * @param {Object} figmaNode - Optional Figma node for input inference
 * @returns {string} Complete Gemini prompt
 */
function buildAngularPrompt(designIR, componentMappings, figmaNode = null) {
  console.log('🤖 [Prompt Builder] Building Angular prompt...');
  
  // Stage 2: Figma Input Inference (if figmaNode provided)
  let inferredInputs = { inputs: [], templateBindings: [], warnings: [] };
  let inputInferenceSection = '';
  
  if (figmaNode) {
    console.log('🔍 [Prompt Builder] Running Stage 2 Input Inference...');
    inferredInputs = inferAngularInputs(figmaNode, designIR.screenName);
    const validation = validateInferredInputs(inferredInputs);
    
    if (validation.valid && inferredInputs.inputs.length > 0) {
      const summary = createInferenceSummary(inferredInputs);
      console.log('✅ [Prompt Builder] Input inference successful:', summary);
      
      inputInferenceSection = `
STAGE 2 INPUT INFERENCE (MANDATORY):
Based on Figma design signals, generate these EXACT @Input() properties:

${generateInputDeclarations(inferredInputs.inputs)}

TEMPLATE BINDING REQUIREMENTS:
${inferredInputs.templateBindings.map(binding => 
  `- ${binding.type}: ${binding.target} = "${binding.expression}"`
).join('\n')}

INFERENCE SUMMARY:
- Inputs detected: ${summary.inputCount}
- Has label: ${summary.hasLabel}
- Has variants: ${summary.hasVariants}
- Has booleans: ${summary.hasBooleans}
${summary.warnings.length > 0 ? `- Warnings: ${summary.warnings.join(', ')}` : ''}
`;
    } else {
      console.log('⚠️ [Prompt Builder] Input inference failed or no inputs found');
      if (!validation.valid) {
        console.log('❌ [Prompt Builder] Validation errors:', validation.errors);
      }
    }
  } else {
    console.log('📝 [Prompt Builder] Stage 1 mode (no Figma node provided)');
  }

  const prompt = `You are an Angular + PrimeNG code generator. Generate clean, production-ready code.

DESIGN IR INPUT:
${JSON.stringify(designIR, null, 2)}

COMPONENT MAPPING RULES:
${JSON.stringify(componentMappings, null, 2)}
${inputInferenceSection}
CONSTRAINTS:
- Use Angular + PrimeNG ONLY
- NO redesign or layout changes
- Use CSS variables for design tokens
- Generate 3 files: .component.ts, .component.html, .component.scss
- Clean, production-ready code
- Follow Angular best practices
- Use proper TypeScript types
- MANDATORY: Always use styleUrls (plural) with array syntax: styleUrls: ['./component.scss']
- NEVER use styleUrl (singular) - always use styleUrls: ['./file.scss']
${inferredInputs.inputs.length > 0 ? '- MANDATORY: Include ALL inferred @Input() properties from Stage 2 section above' : ''}
${inferredInputs.templateBindings.length > 0 ? '- MANDATORY: Apply ALL template bindings from Stage 2 section above' : ''}

REQUIRED IMPORTS:
${getRequiredImports(designIR.components).join(', ')}

DESIGN TOKENS TO CSS VARIABLES:
${generateTokensMapping(designIR.tokens)}

GENERATE FILES:

1. ${designIR.screenName.toLowerCase()}.component.ts
2. ${designIR.screenName.toLowerCase()}.component.html  
3. ${designIR.screenName.toLowerCase()}.component.scss

OUTPUT FORMAT:
\`\`\`typescript
// ${designIR.screenName.toLowerCase()}.component.ts
[TypeScript component code]
\`\`\`

\`\`\`html
<!-- ${designIR.screenName.toLowerCase()}.component.html -->
[HTML template code]
\`\`\`

\`\`\`scss
/* ${designIR.screenName.toLowerCase()}.component.scss */
[SCSS styles code]
\`\`\`

Generate the code now:`;

  console.log(`🤖 [Prompt Builder] Prompt built (${prompt.length} characters)`);
  return prompt;
}

/**
 * Generates CSS variable mappings from design tokens
 * @param {Object} tokens - Design tokens from Design IR
 * @returns {string} CSS variables mapping
 */
function generateTokensMapping(tokens) {
  const mappings = [];
  
  Object.entries(tokens).forEach(([key, value]) => {
    const cssVar = `--${kebabCase(key)}`;
    mappings.push(`${key}: ${value} → ${cssVar}: var(--${value})`);
  });

  return mappings.join('\n');
}

/**
 * Creates a simplified prompt for testing
 * @param {Object} designIR - The Design IR JSON
 * @returns {string} Simplified prompt
 */
function buildSimplePrompt(designIR) {
  return `Generate Angular + PrimeNG component for:

Screen: ${designIR.screenName}
Layout: ${designIR.layout}
Components: ${designIR.components.length} items

Components:
${designIR.components.map((comp, i) => `${i + 1}. ${comp.type}: ${comp.text || comp.label || 'N/A'}`).join('\n')}

Generate:
1. TypeScript component class
2. HTML template
3. SCSS styles

Use PrimeNG components and CSS variables for tokens.`;
}

/**
 * Builds component-specific instructions
 * @param {Array} components - Design IR components
 * @returns {string} Component instructions
 */
function buildComponentInstructions(components) {
  const instructions = [];
  
  components.forEach((component, index) => {
    const instruction = generateComponentInstruction(component, index);
    instructions.push(instruction);
  });

  return instructions.join('\n');
}

/**
 * Generates instruction for a single component
 * @param {Object} component - Design IR component
 * @param {number} index - Component index
 * @returns {string} Component instruction
 */
function generateComponentInstruction(component, index) {
  switch (component.type) {
    case 'heading':
      return `${index + 1}. Heading: Use <h1>${component.text}</h1>`;
    
    case 'text':
      return `${index + 1}. Text: Use <p class="text-content">${component.text}</p>`;
    
    case 'input':
      return `${index + 1}. Input: Use <p-inputText type="${component.inputType}" placeholder="${component.label}" [(ngModel)]="${camelCase(component.label)}Value">`;
    
    case 'button':
      return `${index + 1}. Button: Use <p-button label="${component.text}" severity="${component.variant}" (click)="on${pascalCase(component.text)}Click()">`;
    
    case 'container':
      return `${index + 1}. Container: Use <div class="${component.variant}-container">`;
    
    default:
      return `${index + 1}. Unknown: ${component.type}`;
  }
}

/**
 * Utility functions for string transformations
 */
function camelCase(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}

function pascalCase(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
    return word.toUpperCase();
  }).replace(/\s+/g, '');
}

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Validates prompt inputs
 * @param {Object} designIR - Design IR to validate
 * @returns {boolean} True if valid
 */
function validatePromptInputs(designIR) {
  if (!designIR.screenName) {
    throw new Error('Design IR missing screenName');
  }
  
  if (!Array.isArray(designIR.components)) {
    throw new Error('Design IR components must be an array');
  }
  
  if (designIR.components.length === 0) {
    throw new Error('Design IR must have at least one component');
  }

  return true;
}

// Example usage
const EXAMPLE_PROMPT_OUTPUT = `
Example generated prompt for Login screen:

You are an Angular + PrimeNG code generator...

DESIGN IR INPUT:
{
  "screenName": "Login",
  "layout": "vertical", 
  "components": [
    { "type": "heading", "text": "Login" },
    { "type": "input", "label": "Email", "inputType": "email" }
  ]
}

GENERATE FILES:
1. login.component.ts
2. login.component.html
3. login.component.scss
`;

module.exports = {
  buildAngularPrompt,
  buildSimplePrompt,
  buildComponentInstructions,
  generateComponentInstruction,
  generateTokensMapping,
  validatePromptInputs,
  camelCase,
  pascalCase,
  kebabCase,
  EXAMPLE_PROMPT_OUTPUT
};
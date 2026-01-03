// DESIGN IR (Intermediate Representation) CONVERTER
// Converts Figma data into normalized Design JSON for Angular code generation

/**
 * Converts Figma layout JSON to Design IR format
 * @param {Object} figmaLayoutJSON - The layout JSON from existing Figma pipeline
 * @param {string} screenName - Name of the screen/component
 * @returns {Object} Design IR JSON
 */
function convertToDesignIR(figmaLayoutJSON, screenName = "GeneratedScreen") {
  if (!figmaLayoutJSON || !figmaLayoutJSON.components) {
    throw new Error("Invalid Figma layout JSON provided");
  }

  // Extract design tokens from the layout
  const tokens = extractDesignTokens(figmaLayoutJSON);
  
  // Convert components to Design IR format
  const components = figmaLayoutJSON.components.map(figmaComponent => {
    return convertFigmaComponentToIR(figmaComponent);
  });

  // Determine layout direction (default to vertical for mobile-first)
  const layout = figmaLayoutJSON.screenType === "desktop" ? "horizontal" : "vertical";

  return {
    screenName: screenName,
    layout: layout,
    components: components,
    tokens: tokens
  };
}

/**
 * Converts individual Figma component to Design IR component
 * @param {Object} figmaComponent - Single component from Figma layout
 * @returns {Object} Design IR component
 */
function convertFigmaComponentToIR(figmaComponent) {
  const componentKey = figmaComponent.componentKey;
  const text = figmaComponent.text || "";

  // Map Figma component keys to Design IR component types
  switch (componentKey) {
    case 'heading':
      return {
        type: "heading",
        text: text || "Heading"
      };

    case 'description':
    case 'wrapped_description':
      return {
        type: "text",
        text: text || "Description text"
      };

    case 'text_input':
      return {
        type: "input",
        label: text || "Input",
        inputType: "text"
      };

    case 'primary_button':
      return {
        type: "button",
        variant: "primary",
        text: text || "Button"
      };

    case 'secondary_button':
      return {
        type: "button",
        variant: "secondary", 
        text: text || "Button"
      };

    case 'card_container':
      return {
        type: "container",
        variant: "card"
      };

    default:
      // Fallback for unknown components
      return {
        type: "text",
        text: text || "Unknown component"
      };
  }
}

/**
 * Extracts design tokens from Figma layout
 * @param {Object} figmaLayoutJSON - The layout JSON from Figma
 * @returns {Object} Design tokens
 */
function extractDesignTokens(figmaLayoutJSON) {
  // Default tokens based on screen type and intent
  const tokens = {
    primaryColor: "primary-500",
    spacing: "md",
    borderRadius: "md"
  };

  // Adjust tokens based on screen type
  if (figmaLayoutJSON.screenType === "mobile") {
    tokens.spacing = "sm";
    tokens.fontSize = "base";
  } else if (figmaLayoutJSON.screenType === "desktop") {
    tokens.spacing = "lg";
    tokens.fontSize = "lg";
  }

  return tokens;
}

/**
 * Example usage and validation
 */
function validateDesignIR(designIR) {
  const requiredFields = ['screenName', 'layout', 'components', 'tokens'];
  
  for (const field of requiredFields) {
    if (!designIR[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(designIR.components)) {
    throw new Error("Components must be an array");
  }

  // Validate each component has required type field
  designIR.components.forEach((component, index) => {
    if (!component.type) {
      throw new Error(`Component at index ${index} missing type field`);
    }
  });

  return true;
}

// Example Design IR output:
const EXAMPLE_DESIGN_IR = {
  "screenName": "Login",
  "layout": "vertical",
  "components": [
    { "type": "heading", "text": "Login" },
    { "type": "input", "label": "Email", "inputType": "email" },
    { "type": "input", "label": "Password", "inputType": "password" },
    { "type": "button", "variant": "primary", "text": "Sign In" }
  ],
  "tokens": {
    "primaryColor": "primary-500",
    "spacing": "md",
    "borderRadius": "md"
  }
};

module.exports = {
  convertToDesignIR,
  convertFigmaComponentToIR,
  extractDesignTokens,
  validateDesignIR,
  EXAMPLE_DESIGN_IR
};
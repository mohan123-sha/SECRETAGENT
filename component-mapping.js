// COMPONENT MAPPING RULES
// Deterministic mapping from Design IR components to Angular + PrimeNG code

/**
 * Component mapping configuration
 * Maps Design IR component types to Angular + PrimeNG implementations
 */
const COMPONENT_MAPPING = {
  // Text components
  heading: {
    tag: "h1",
    attributes: {},
    content: "{{text}}",
    imports: []
  },

  text: {
    tag: "p",
    attributes: {
      class: "text-content"
    },
    content: "{{text}}",
    imports: []
  },

  // Input components
  input: {
    tag: "p-inputText",
    attributes: {
      type: "{{inputType}}",
      placeholder: "{{label}}",
      "[(ngModel)]": "{{camelCase(label)}}Value"
    },
    content: null,
    imports: ["InputTextModule"]
  },

  // Button components
  button: {
    tag: "p-button",
    attributes: {
      label: "{{text}}",
      severity: "{{mapButtonVariant(variant)}}",
      "(click)": "on{{pascalCase(text)}}Click()"
    },
    content: null,
    imports: ["ButtonModule"]
  },

  // Container components
  container: {
    tag: "div",
    attributes: {
      class: "{{mapContainerVariant(variant)}}"
    },
    content: "<!-- Container content -->",
    imports: []
  }
};

/**
 * Input type mapping for different input types
 */
const INPUT_TYPE_MAPPING = {
  email: "email",
  password: "password", 
  text: "text",
  number: "number",
  tel: "tel",
  url: "url"
};

/**
 * Button variant mapping to PrimeNG severity
 */
const BUTTON_VARIANT_MAPPING = {
  primary: "primary",
  secondary: "secondary",
  success: "success",
  info: "info",
  warning: "warning",
  danger: "danger"
};

/**
 * Container variant mapping to CSS classes
 */
const CONTAINER_VARIANT_MAPPING = {
  card: "card-container",
  panel: "panel-container",
  section: "section-container"
};

/**
 * Gets the mapping configuration for a component type
 * @param {string} componentType - The Design IR component type
 * @returns {Object} Component mapping configuration
 */
function getComponentMapping(componentType) {
  const mapping = COMPONENT_MAPPING[componentType];
  if (!mapping) {
    throw new Error(`No mapping found for component type: ${componentType}`);
  }
  return { ...mapping }; // Return a copy to avoid mutations
}

/**
 * Maps button variant to PrimeNG severity
 * @param {string} variant - Button variant from Design IR
 * @returns {string} PrimeNG severity
 */
function mapButtonVariant(variant) {
  return BUTTON_VARIANT_MAPPING[variant] || "primary";
}

/**
 * Maps container variant to CSS class
 * @param {string} variant - Container variant from Design IR
 * @returns {string} CSS class name
 */
function mapContainerVariant(variant) {
  return CONTAINER_VARIANT_MAPPING[variant] || "container";
}

/**
 * Maps input type to HTML input type
 * @param {string} inputType - Input type from Design IR
 * @returns {string} HTML input type
 */
function mapInputType(inputType) {
  return INPUT_TYPE_MAPPING[inputType] || "text";
}

/**
 * Gets all required imports for a list of components
 * @param {Array} components - Array of Design IR components
 * @returns {Array} Array of unique import module names
 */
function getRequiredImports(components) {
  const imports = new Set();
  
  components.forEach(component => {
    const mapping = getComponentMapping(component.type);
    if (mapping.imports) {
      mapping.imports.forEach(imp => imports.add(imp));
    }
  });

  return Array.from(imports);
}

/**
 * Validates that all components in Design IR have mappings
 * @param {Array} components - Array of Design IR components
 * @returns {boolean} True if all components are mappable
 */
function validateComponentMappings(components) {
  const unmappedComponents = [];
  
  components.forEach((component, index) => {
    if (!COMPONENT_MAPPING[component.type]) {
      unmappedComponents.push({
        index,
        type: component.type
      });
    }
  });

  if (unmappedComponents.length > 0) {
    throw new Error(`Unmapped components found: ${JSON.stringify(unmappedComponents)}`);
  }

  return true;
}

// Example usage:
const EXAMPLE_MAPPINGS = {
  "heading → h1": COMPONENT_MAPPING.heading,
  "input + email → p-inputText": {
    ...COMPONENT_MAPPING.input,
    attributes: {
      ...COMPONENT_MAPPING.input.attributes,
      type: "email"
    }
  },
  "button + primary → p-button": {
    ...COMPONENT_MAPPING.button,
    attributes: {
      ...COMPONENT_MAPPING.button.attributes,
      severity: "primary"
    }
  }
};

module.exports = {
  COMPONENT_MAPPING,
  INPUT_TYPE_MAPPING,
  BUTTON_VARIANT_MAPPING,
  CONTAINER_VARIANT_MAPPING,
  getComponentMapping,
  mapButtonVariant,
  mapContainerVariant,
  mapInputType,
  getRequiredImports,
  validateComponentMappings,
  EXAMPLE_MAPPINGS
};
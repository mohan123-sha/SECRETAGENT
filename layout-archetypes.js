// PHASE 2: LAYOUT ARCHETYPES - CORE INTELLIGENCE SYSTEM
// This removes "vertical-only" behavior and provides Google Stitch-like intelligence

const LAYOUT_ARCHETYPES = {
  // WEB ARCHETYPES
  dashboard_web: {
    canvas_type: "desktop",
    sections: ["header", "main_content", "sidebar"],
    typical_components: ["heading", "card_container", "description", "primary_button", "secondary_button"],
    layout_direction: "multi_column",
    section_rules: {
      header: { direction: "horizontal", components: ["heading", "primary_button"] },
      main_content: { direction: "grid", components: ["card_container", "description"] },
      sidebar: { direction: "vertical", components: ["card_container", "secondary_button"] }
    },
    responsive_behavior: "collapse_sidebar_on_mobile"
  },

  landing_web: {
    canvas_type: "desktop", 
    sections: ["hero", "content_sections", "cta"],
    typical_components: ["heading", "description", "wrapped_description", "primary_button", "secondary_button"],
    layout_direction: "vertical_sections",
    section_rules: {
      hero: { direction: "vertical", components: ["heading", "description", "primary_button"] },
      content_sections: { direction: "vertical", components: ["heading", "wrapped_description"] },
      cta: { direction: "horizontal", components: ["primary_button", "secondary_button"] }
    },
    responsive_behavior: "stack_sections_on_mobile"
  },

  ecommerce_web: {
    canvas_type: "desktop",
    sections: ["header", "product_grid", "sidebar_filters"],
    typical_components: ["heading", "card_container", "primary_button", "text_input"],
    layout_direction: "multi_column",
    section_rules: {
      header: { direction: "horizontal", components: ["heading", "text_input"] },
      product_grid: { direction: "grid", components: ["card_container", "primary_button"] },
      sidebar_filters: { direction: "vertical", components: ["heading", "text_input", "secondary_button"] }
    },
    responsive_behavior: "collapse_sidebar_on_mobile"
  },

  healthcare_web: {
    canvas_type: "desktop",
    sections: ["header", "patient_info", "main_content", "actions"],
    typical_components: ["heading", "description", "card_container", "primary_button", "text_input"],
    layout_direction: "multi_column",
    section_rules: {
      header: { direction: "horizontal", components: ["heading", "primary_button"] },
      patient_info: { direction: "vertical", components: ["card_container", "description"] },
      main_content: { direction: "grid", components: ["card_container", "text_input"] },
      actions: { direction: "horizontal", components: ["primary_button", "secondary_button"] }
    },
    responsive_behavior: "stack_sections_on_mobile"
  },

  auth_flow: {
    canvas_type: "centered",
    sections: ["centered_form"],
    typical_components: ["heading", "description", "text_input", "primary_button", "secondary_button"],
    layout_direction: "vertical_form",
    section_rules: {
      centered_form: { direction: "vertical", components: ["heading", "description", "text_input", "primary_button", "secondary_button"] }
    },
    responsive_behavior: "maintain_center_on_all_sizes"
  },

  content_page: {
    canvas_type: "desktop",
    sections: ["header", "main_content"],
    typical_components: ["heading", "description", "wrapped_description", "secondary_button"],
    layout_direction: "single_column",
    section_rules: {
      header: { direction: "horizontal", components: ["heading", "secondary_button"] },
      main_content: { direction: "vertical", components: ["heading", "wrapped_description"] }
    },
    responsive_behavior: "maintain_single_column"
  },

  // MOBILE ARCHETYPES
  mobile_stacked: {
    canvas_type: "mobile",
    sections: ["stacked_content"],
    typical_components: ["heading", "description", "card_container", "primary_button"],
    layout_direction: "vertical_only",
    section_rules: {
      stacked_content: { direction: "vertical", components: ["heading", "description", "card_container", "primary_button"] }
    },
    responsive_behavior: "maintain_vertical_stack"
  },

  mobile_dashboard: {
    canvas_type: "mobile",
    sections: ["header", "cards_stack", "bottom_actions"],
    typical_components: ["heading", "card_container", "primary_button", "secondary_button"],
    layout_direction: "vertical_only",
    section_rules: {
      header: { direction: "vertical", components: ["heading"] },
      cards_stack: { direction: "vertical", components: ["card_container"] },
      bottom_actions: { direction: "horizontal", components: ["primary_button", "secondary_button"] }
    },
    responsive_behavior: "maintain_vertical_stack"
  },

  mobile_form: {
    canvas_type: "mobile",
    sections: ["form_stack"],
    typical_components: ["heading", "description", "text_input", "primary_button"],
    layout_direction: "vertical_only",
    section_rules: {
      form_stack: { direction: "vertical", components: ["heading", "description", "text_input", "primary_button"] }
    },
    responsive_behavior: "maintain_vertical_stack"
  }
};

// APPLICATION TYPE TO ARCHETYPE MAPPING
const APPLICATION_ARCHETYPE_MAP = {
  // Web mappings
  dashboard: { web: "dashboard_web", mobile: "mobile_dashboard" },
  ecommerce: { web: "ecommerce_web", mobile: "mobile_stacked" },
  healthcare: { web: "healthcare_web", mobile: "mobile_dashboard" },
  education: { web: "content_page", mobile: "mobile_stacked" },
  saas: { web: "dashboard_web", mobile: "mobile_dashboard" },
  landing_page: { web: "landing_web", mobile: "mobile_stacked" },
  auth: { web: "auth_flow", mobile: "mobile_form" },
  profile: { web: "content_page", mobile: "mobile_form" },
  settings: { web: "content_page", mobile: "mobile_form" },
  
  // Fallbacks
  default: { web: "content_page", mobile: "mobile_stacked" }
};

// CANVAS SIZE DEFINITIONS
const CANVAS_SIZES = {
  desktop: { width: 1200, height: 800 },
  mobile: { width: 375, height: 812 },
  centered: { width: 400, height: 600 }
};

function getArchetypeForApplication(applicationType, screenType) {
  const mapping = APPLICATION_ARCHETYPE_MAP[applicationType] || APPLICATION_ARCHETYPE_MAP.default;
  return mapping[screenType] || mapping.web;
}

function getArchetypeConfig(archetypeName) {
  return LAYOUT_ARCHETYPES[archetypeName] || LAYOUT_ARCHETYPES.mobile_stacked;
}

function getCanvasSize(canvasType) {
  return CANVAS_SIZES[canvasType] || CANVAS_SIZES.desktop;
}

module.exports = {
  LAYOUT_ARCHETYPES,
  APPLICATION_ARCHETYPE_MAP,
  CANVAS_SIZES,
  getArchetypeForApplication,
  getArchetypeConfig,
  getCanvasSize
};
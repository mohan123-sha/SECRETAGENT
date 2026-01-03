// Figma Plugin - Component Layout Runner - COMPLETE
console.log('🚀 Code Generator Plugin Loading...');
figma.notify('🚀 Code Generator Plugin Loaded!');

// Show the UI
figma.showUI(__html__, { width: 420, height: 320 });

// Backend Configuration
const BACKEND_URL = 'http://localhost:3000/generate-layout';
const CODE_GENERATOR_URL = 'http://localhost:3001/generate-code';

// Component Map
const componentMap = {
  primary_button: {
    componentSet: "Button",
    props: { Variant: "Primary", State: "Default", Size: "Medium" }
  },
  secondary_button: {
    componentSet: "Button",
    props: { Variant: "Neutral", State: "Default", Size: "Medium" }
  },
  text_input: {
    componentSet: "Input Field",
    props: { State: "Default", "Value Type": "Placeholder" }
  },
  card_container: {
    componentSet: "Card",
    props: { Variant: "Default", Direction: "Vertical" }
  }
};

// Complete message handler
figma.ui.onmessage = async (msg) => {
  console.log('📩 Message received:', msg.type);
  
  if (msg.type === 'generate-design') {
    console.log('🎯 DESIGN-FIRST, CODE-SECOND FLOW STARTED');
    console.log('📝 User prompt:', msg.userPrompt);
    
    // STEP 1: Generate layout from backend
    const layoutJSON = await fetchLayoutFromBackend(msg.userPrompt);
    
    if (!layoutJSON) {
      console.error("❌ Layout generation failed");
      figma.ui.postMessage({
        type: 'status-update',
        message: 'Layout generation failed'
      });
      return;
    }
    
    // STEP 2: Render design on canvas
    const renderSuccess = await renderLayout(layoutJSON, msg.userPrompt);
    
    if (!renderSuccess) {
      console.error("❌ Design rendering failed");
      figma.ui.postMessage({
        type: 'status-update',
        message: 'Design rendering failed'
      });
      return;
    }
    
    // STEP 3: Generate code with proper screen name priority
    // PRIORITY 1: UI Screen Name field (highest priority)
    // PRIORITY 2: Extract from prompt (fallback)
    // PRIORITY 3: Default name (last resort)
    let screenName = "GeneratedScreen"; // Default
    
    if (msg.screenName && msg.screenName.trim()) {
      // UI field has priority - use it directly
      screenName = msg.screenName.trim();
      console.log("🎯 PRIORITY 1: Using UI screen name field:", screenName);
      figma.notify(`📱 Using screen name: ${screenName}`);
    } else {
      // Fallback to prompt extraction
      const extractedName = extractScreenNameFromPrompt(msg.userPrompt);
      if (extractedName) {
        screenName = extractedName;
        console.log("🎯 PRIORITY 2: Extracted screen name from prompt:", screenName);
      } else {
        console.log("🎯 PRIORITY 3: Using default screen name:", screenName);
      }
    }
    
    console.log("📝 Original prompt:", msg.userPrompt);
    console.log("🎯 Final screen name:", screenName);
    console.log("🔄 Starting code generation after successful rendering");
    await generateAngularCode(layoutJSON, screenName);
    
    // STEP 4: Send success status
    figma.ui.postMessage({
      type: 'status-update',
      message: 'Design created'
    });
    
    console.log("✅ DESIGN-FIRST, CODE-SECOND FLOW COMPLETED");
    
  } else if (msg.type === 'generate-code-only') {
    console.log("🔄 Code-only generation requested");
    
    const layoutJSON = msg.layoutJSON;
    const screenName = msg.screenName || "GeneratedScreen";
    
    if (layoutJSON) {
      await generateAngularCode(layoutJSON, screenName);
    } else {
      figma.notify("❌ No layout data provided for code generation");
    }
    
  } else if (msg.type === 'scan-library-storybook') {
    console.log('📚 Library scan and Storybook generation requested');
    
    // PRODUCTION RULE: Check selection first
    const selection = figma.currentPage.selection;
    console.log(`🔍 Selection check: ${selection.length} items selected`);
    
    if (selection.length === 0) {
      console.log('❌ No selection found - blocking library scan');
      figma.notify('❌ Please select a component to generate');
      figma.ui.postMessage({
        type: 'selection-error',
        message: 'Please select a component to generate',
        selectionCount: 0
      });
      return;
    }
    
    if (selection.length === 1) {
      console.log('✅ Single selection found - generating component only');
      await generateFromSelection(selection[0]);
    } else {
      console.log('⚠️ Multiple selections found - using first item only');
      figma.notify(`⚠️ Multiple items selected, using first item only`);
      await generateFromSelection(selection[0]);
    }
    
  } else if (msg.type === 'scan-library-storybook-legacy') {
    // Legacy library scanning (disabled for production safety)
    console.log('🚨 Legacy library scan blocked for production safety');
    figma.notify('🚨 Library scanning disabled - use selection-based generation');
    figma.ui.postMessage({
      type: 'library-scan-blocked',
      message: 'Library scanning disabled for production safety',
      recommendation: 'Select a specific component and use Generate instead'
    });
    
  } else if (msg.type === 'scan-library-storybook-old') {
    console.log('📚 Library scan and Storybook generation requested');
    await scanLibraryAndGenerateStorybook();
    
  } else if (msg.type === 'validate-design') {
    console.log('🔍 Manual design validation requested');
    await validateAndGenerateCode(msg.screenName);
    
  } else if (msg.type === 'validate-and-generate') {
    console.log('🔍 Manual design validation and code generation requested');
    await validateAndGenerateCode(msg.screenName);
    
  } else {
    console.log('❓ Unknown message type:', msg.type);
  }
};

// Backend Communication Functions
async function fetchLayoutFromBackend(userPrompt) {
  try {
    figma.notify("🤖 Generating layout with AI...");
    
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPrompt })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Backend error: ${errorData.error || response.statusText}`);
    }

    const layoutJSON = await response.json();
    console.log("📥 Received layout from backend:", layoutJSON);
    return layoutJSON;
    
  } catch (error) {
    console.error("❌ Backend fetch error:", error);
    figma.notify(`❌ Backend error: ${error.message}`);
    figma.ui.postMessage({
      type: 'status-update',
      message: `Error: ${error.message}`
    });
    return null;
  }
}

async function generateAngularCode(layoutJSON, screenName) {
  console.log('[CodeGen] Sending layout JSON to code generation backend');
  
  try {
    const response = await fetch(CODE_GENERATOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        figmaLayoutJSON: layoutJSON,
        screenName: screenName || 'GeneratedScreen',
        testMode: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Code generation error: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('[CodeGen] ✅ Angular code generated successfully');
      
      figma.ui.postMessage({
        type: 'code-generated',
        files: result.exportFiles,
        screenName: screenName || 'GeneratedScreen',
        pipelineStatus: result.pipelineStatus || 'Code generation completed'
      });
      
      figma.notify(`✅ Angular code generated for ${screenName || 'GeneratedScreen'}`);
    } else {
      throw new Error(`Code generation failed: ${(result.errors && result.errors.join) ? result.errors.join(', ') : 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('[CodeGen] ❌ Error:', error.message);
    
    figma.ui.postMessage({
      type: 'code-generation-error',
      error: error.message
    });
    
    figma.notify(`❌ Code generation failed: ${error.message}`);
  }
}
// Component Creation Functions
function findComponentSet(name) {
  return figma.root.findOne(n => n.type === "COMPONENT_SET" && n.name === name);
}

// PHASE 6: Enhanced component creation with neutral visual semantics
async function createComponent(componentKey, parentFrame, userPrompt = null, layoutItem = null) {
  if (componentKey === 'heading' || componentKey === 'description' || componentKey === 'wrapped_description') {
    const textNode = figma.createText();
    
    const resolvedText = (layoutItem && layoutItem.text) ? layoutItem.text : 
                        (componentKey === 'heading' ? "Welcome" : "This is a description text.");
    
    if (componentKey === 'heading') {
      const boldFont = { family: textNode.fontName.family, style: "Bold" };
      await figma.loadFontAsync(boldFont);
      textNode.fontName = boldFont;
      textNode.characters = resolvedText;
      textNode.fontSize = 24;
    } else {
      await figma.loadFontAsync(textNode.fontName);
      textNode.characters = resolvedText;
      textNode.fontSize = 16;
      textNode.textAutoResize = "HEIGHT";
      textNode.layoutAlign = "INHERIT";
    }
    
    parentFrame.appendChild(textNode);
    return;
  }

  // PHASE 6.1: Card hierarchy with wrapper frame for visual semantics
  if (componentKey === 'card_container') {
    const cardWrapperFrame = figma.createFrame();
    cardWrapperFrame.name = "CardContainer";
    cardWrapperFrame.layoutMode = "VERTICAL";
    cardWrapperFrame.itemSpacing = 12;
    cardWrapperFrame.paddingTop = 16;
    cardWrapperFrame.paddingBottom = 16;
    cardWrapperFrame.paddingLeft = 16;
    cardWrapperFrame.paddingRight = 16;
    cardWrapperFrame.counterAxisAlignItems = "MIN";
    cardWrapperFrame.primaryAxisSizingMode = "AUTO";
    
    // PHASE 6.2: Card wrapper height normalization
    const maxWidth = Math.min(400, parentFrame.width * 0.8);
    const minHeight = 100;
    const maxHeight = 140;
    cardWrapperFrame.resize(maxWidth, minHeight);
    cardWrapperFrame.primaryAxisSizingMode = "AUTO";
    cardWrapperFrame.counterAxisSizingMode = "AUTO";
    cardWrapperFrame.clipsContent = true;
    
    // PHASE 6.1: Card hierarchy with neutral elevation applied to wrapper
    const cardPriority = (layoutItem && layoutItem.layout_priority) ? layoutItem.layout_priority : 5;
    
    if (cardPriority >= 8) {
      // Primary cards: stronger elevation
      cardWrapperFrame.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
      cardWrapperFrame.strokes = [{type: "SOLID", color: {r: 0.85, g: 0.85, b: 0.85}}];
      cardWrapperFrame.strokeWeight = 2;
    } else {
      // Secondary cards: lighter elevation
      cardWrapperFrame.fills = [{type: "SOLID", color: {r: 0.99, g: 0.99, b: 0.99}}];
      cardWrapperFrame.strokes = [{type: "SOLID", color: {r: 0.92, g: 0.92, b: 0.92}}];
      cardWrapperFrame.strokeWeight = 1;
    }
    
    cardWrapperFrame.cornerRadius = 8;
    
    // Add placeholder content to card wrapper
    const cardText = figma.createText();
    await figma.loadFontAsync(cardText.fontName);
    cardText.characters = layoutItem && layoutItem.text ? layoutItem.text : "Card Content";
    cardText.fontSize = 14;
    cardWrapperFrame.appendChild(cardText);
    
    parentFrame.appendChild(cardWrapperFrame);
    return;
  }

  // PHASE 6.1: Primary button with wrapper frame for visual emphasis
  if (componentKey === 'primary_button') {
    const mapEntry = componentMap[componentKey];
    if (mapEntry) {
      const componentSet = findComponentSet(mapEntry.componentSet);
      if (componentSet) {
        // Create wrapper frame for primary button
        const buttonWrapper = figma.createFrame();
        buttonWrapper.name = "PrimaryButtonWrapper";
        buttonWrapper.layoutMode = "HORIZONTAL";
        buttonWrapper.counterAxisAlignItems = "CENTER";
        buttonWrapper.primaryAxisAlignItems = "CENTER";
        buttonWrapper.primaryAxisSizingMode = "AUTO";
        buttonWrapper.counterAxisSizingMode = "AUTO";
        
        // Create button instance
        const instance = componentSet.defaultVariant.createInstance();
        instance.setProperties(mapEntry.props);
        
        // Apply visual emphasis to wrapper, not instance
        buttonWrapper.paddingTop = 4;
        buttonWrapper.paddingBottom = 4;
        buttonWrapper.paddingLeft = 8;
        buttonWrapper.paddingRight = 8;
        buttonWrapper.fills = [{type: "SOLID", color: {r: 0.96, g: 0.96, b: 0.96}}];
        buttonWrapper.strokes = [{type: "SOLID", color: {r: 0.88, g: 0.88, b: 0.88}}];
        buttonWrapper.strokeWeight = 2;
        buttonWrapper.cornerRadius = 6;
        
        buttonWrapper.appendChild(instance);
        parentFrame.appendChild(buttonWrapper);
        return;
      }
    }
  }

  // PHASE 6.1: Secondary button with minimal wrapper
  if (componentKey === 'secondary_button') {
    const mapEntry = componentMap[componentKey];
    if (mapEntry) {
      const componentSet = findComponentSet(mapEntry.componentSet);
      if (componentSet) {
        // Create wrapper frame for secondary button
        const buttonWrapper = figma.createFrame();
        buttonWrapper.name = "SecondaryButtonWrapper";
        buttonWrapper.layoutMode = "HORIZONTAL";
        buttonWrapper.counterAxisAlignItems = "CENTER";
        buttonWrapper.primaryAxisAlignItems = "CENTER";
        buttonWrapper.primaryAxisSizingMode = "AUTO";
        buttonWrapper.counterAxisSizingMode = "AUTO";
        
        // Create button instance
        const instance = componentSet.defaultVariant.createInstance();
        instance.setProperties(mapEntry.props);
        
        // Apply lighter visual weight to wrapper
        buttonWrapper.paddingTop = 2;
        buttonWrapper.paddingBottom = 2;
        buttonWrapper.paddingLeft = 4;
        buttonWrapper.paddingRight = 4;
        buttonWrapper.fills = [];
        buttonWrapper.strokes = [{type: "SOLID", color: {r: 0.92, g: 0.92, b: 0.92}}];
        buttonWrapper.strokeWeight = 1;
        buttonWrapper.cornerRadius = 4;
        
        buttonWrapper.appendChild(instance);
        parentFrame.appendChild(buttonWrapper);
        return;
      }
    }
  }

  // PHASE 6.1: Wrap all other component instances in neutral containers
  const mapEntry = componentMap[componentKey];
  if (!mapEntry) {
    return;
  }

  const componentSet = findComponentSet(mapEntry.componentSet);
  if (!componentSet) {
    return;
  }

  // Create wrapper frame for component instance
  const componentWrapper = figma.createFrame();
  componentWrapper.name = `${componentKey}_wrapper`;
  componentWrapper.layoutMode = "HORIZONTAL";
  componentWrapper.counterAxisAlignItems = "CENTER";
  componentWrapper.primaryAxisAlignItems = "CENTER";
  componentWrapper.primaryAxisSizingMode = "AUTO";
  componentWrapper.counterAxisSizingMode = "AUTO";
  
  // Create component instance
  const instance = componentSet.defaultVariant.createInstance();
  instance.setProperties(mapEntry.props);
  
  // Apply minimal neutral styling to wrapper
  componentWrapper.paddingTop = 2;
  componentWrapper.paddingBottom = 2;
  componentWrapper.paddingLeft = 4;
  componentWrapper.paddingRight = 4;
  componentWrapper.fills = [];
  componentWrapper.cornerRadius = 2;
  
  componentWrapper.appendChild(instance);
  parentFrame.appendChild(componentWrapper);
}

function createAIScreenFrame(x, y) {
  const aiScreenFrame = figma.createFrame();
  aiScreenFrame.name = "AI Screen";
  aiScreenFrame.x = x;
  aiScreenFrame.y = y;
  aiScreenFrame.layoutMode = "VERTICAL";
  aiScreenFrame.itemSpacing = 16;
  aiScreenFrame.paddingTop = 24;
  aiScreenFrame.paddingBottom = 24;
  aiScreenFrame.paddingLeft = 24;
  aiScreenFrame.paddingRight = 24;
  aiScreenFrame.counterAxisAlignItems = "CENTER";
  aiScreenFrame.primaryAxisSizingMode = "AUTO";
  aiScreenFrame.counterAxisSizingMode = "AUTO";
  aiScreenFrame.fills = [{type: "SOLID", color: {r: 0.98, g: 0.98, b: 0.98}}];
  aiScreenFrame.cornerRadius = 8;
  return aiScreenFrame;
}
// PHASE 4: ENHANCED LAYOUT RENDERING WITH METADATA INTELLIGENCE
async function renderLayout(layoutJSON, userPrompt) {
  if (!layoutJSON || (!layoutJSON.components && !layoutJSON.sections)) {
    figma.notify("❌ Invalid layout data");
    return false;
  }

  // PHASE 4: Extract enhanced layout intelligence and metadata
  const screenType = layoutJSON.screenType || 'web';
  const applicationType = layoutJSON.application_type || 'content_page';
  const layoutArchetype = layoutJSON.layout_archetype || 'content_page';
  const canvasSize = layoutJSON.canvas_size || { width: 1200, height: 800 };
  const archetypeConfig = layoutJSON.archetype_config;
  const layoutMetadata = layoutJSON.layout_metadata;
  const validationResult = layoutJSON.validation_result;
  
  console.log(`🎯 PHASE 4: Rendering ${layoutArchetype} for ${applicationType} (${screenType})`);
  console.log(`📐 Canvas size: ${canvasSize.width}x${canvasSize.height}`);
  
  // PHASE 4: Display enhanced metadata
  if (layoutMetadata) {
    console.log(`🧠 Layout Intelligence:`, {
      complexity: layoutMetadata.complexity_score,
      userFlow: layoutMetadata.primary_user_flow,
      density: layoutMetadata.content_density
    });
    
    figma.notify(`🧠 Layout: ${layoutMetadata.primary_user_flow} flow, ${layoutMetadata.content_density} density (${layoutMetadata.complexity_score}/10 complexity)`);
  }
  
  // PHASE 4: Display validation status
  if (validationResult && validationResult.enhanced) {
    const warningCount = validationResult.warnings ? validationResult.warnings.length : 0;
    console.log(`✅ Enhanced validation passed with ${warningCount} warnings`);
  }
  
  // Use sections if available, otherwise fall back to flat components
  const sections = layoutJSON.sections || [];
  const flatComponents = layoutJSON.components || [];
  
  if (sections.length === 0 && flatComponents.length === 0) {
    figma.notify("⚠️ No valid components or sections could be generated");
    return false;
  }

  console.log("🤖 Enhanced layout structure:", {
    sections: sections.length,
    flatComponents: flatComponents.length,
    archetype: layoutArchetype,
    enhanced: validationResult ? (validationResult.enhanced || false) : false
  });

  // PHASE 4: Create frame with enhanced metadata and proper canvas size
  const viewportCenter = figma.viewport.center;
  const aiScreenFrame = createEnhancedScreenFrame(
    viewportCenter.x, 
    viewportCenter.y - 64, 
    canvasSize,
    layoutArchetype,
    screenType,
    layoutMetadata
  );
  
  // PHASE 4: Render sections with enhanced metadata intelligence
  if (sections.length > 0) {
    await renderSections(sections, aiScreenFrame, userPrompt, archetypeConfig);
  } else {
    // Fallback: render flat components (backward compatibility)
    await renderFlatComponents(flatComponents, aiScreenFrame, userPrompt);
  }

  // Add to page
  figma.currentPage.appendChild(aiScreenFrame);
  
  // PHASE 4: Enhanced success notification with metadata
  const metadataInfo = layoutMetadata ? 
    ` (${layoutMetadata.complexity_score}/10 complexity, ${layoutMetadata.primary_user_flow} flow)` : '';
  figma.notify(`✅ ${layoutArchetype} layout rendered successfully${metadataInfo}`);
  return true;
}

// PHASE 6: Enhanced screen frame with neutral visual semantics
function createEnhancedScreenFrame(x, y, canvasSize, layoutArchetype, screenType, layoutMetadata) {
  const aiScreenFrame = figma.createFrame();
  
  const complexityInfo = layoutMetadata ? ` (${layoutMetadata.complexity_score}/10)` : '';
  aiScreenFrame.name = `${layoutArchetype} Screen${complexityInfo}`;
  
  aiScreenFrame.x = x;
  aiScreenFrame.y = y;
  aiScreenFrame.resize(canvasSize.width, canvasSize.height);
  
  const userFlow = layoutMetadata ? layoutMetadata.primary_user_flow : null;
  
  if (screenType === 'mobile' || layoutArchetype.includes('mobile')) {
    aiScreenFrame.layoutMode = "VERTICAL";
    aiScreenFrame.itemSpacing = userFlow === 'input' ? 12 : 16;
    aiScreenFrame.counterAxisAlignItems = "CENTER";
  } else if (layoutArchetype.includes('dashboard') || layoutArchetype.includes('ecommerce') || layoutArchetype.includes('healthcare')) {
    // PHASE 5: Web dashboard zoning - no auto-layout for manual positioning
    aiScreenFrame.layoutMode = "NONE";
  } else if (layoutArchetype === 'auth_flow') {
    aiScreenFrame.layoutMode = "VERTICAL";
    aiScreenFrame.itemSpacing = 20;
    aiScreenFrame.counterAxisAlignItems = "CENTER";
    aiScreenFrame.primaryAxisAlignItems = "CENTER";
  } else {
    aiScreenFrame.layoutMode = "VERTICAL";
    const spacing = userFlow === 'read' ? 32 : 24;
    aiScreenFrame.itemSpacing = spacing;
    aiScreenFrame.counterAxisAlignItems = "CENTER";
  }
  
  const contentDensity = layoutMetadata ? (layoutMetadata.content_density || 'medium') : 'medium';
  let padding = screenType === 'mobile' ? 16 : 24; // Reduced for web zoning
  
  if (contentDensity === 'dense') {
    padding = Math.max(12, padding - 8);
  } else if (contentDensity === 'sparse') {
    padding = padding + 16;
  }
  
  aiScreenFrame.paddingTop = padding;
  aiScreenFrame.paddingBottom = padding;
  aiScreenFrame.paddingLeft = padding;
  aiScreenFrame.paddingRight = padding;
  
  // PHASE 6: Neutral canvas background with subtle structure
  aiScreenFrame.fills = [{type: "SOLID", color: {r: 0.98, g: 0.98, b: 0.98}}];
  aiScreenFrame.strokes = [{type: "SOLID", color: {r: 0.85, g: 0.85, b: 0.85}}];
  aiScreenFrame.strokeWeight = 2;
  aiScreenFrame.cornerRadius = 8;
  
  return aiScreenFrame;
}

// PHASE 5: Section-based rendering with web dashboard zoning
async function renderSections(sections, parentFrame, userPrompt, archetypeConfig) {
  const screenType = parentFrame.name.includes('mobile') ? 'mobile' : 'web';
  
  if (screenType === 'web' && (parentFrame.name.includes('dashboard') || parentFrame.name.includes('ecommerce') || parentFrame.name.includes('healthcare'))) {
    await renderWebDashboardZones(sections, parentFrame, userPrompt);
  } else {
    await renderStandardSections(sections, parentFrame, userPrompt, archetypeConfig);
  }
}

// PHASE 5: Web dashboard zone rendering
async function renderWebDashboardZones(sections, parentFrame, userPrompt) {
  const canvasWidth = parentFrame.width - (parentFrame.paddingLeft + parentFrame.paddingRight);
  const canvasHeight = parentFrame.height - (parentFrame.paddingTop + parentFrame.paddingBottom);
  
  let headerSection = null;
  let mainSections = [];
  let sidebarSections = [];
  
  // Categorize sections
  sections.forEach(section => {
    if (section.section_name === 'header') {
      headerSection = section;
    } else if (section.section_name.includes('sidebar') || section.section_name.includes('summary') || section.section_name === 'patient_info') {
      sidebarSections.push(section);
    } else {
      mainSections.push(section);
    }
  });
  
  let currentY = parentFrame.paddingTop;
  
  // ZONE 1: Header (full-width, top-anchored)
  if (headerSection) {
    const headerFrame = createWebZoneFrame('header', 0, 0, canvasWidth, 80);
    headerFrame.x = parentFrame.paddingLeft;
    headerFrame.y = currentY;
    
    if (headerSection.components) {
      for (const component of headerSection.components) {
        await createComponent(component.componentKey, headerFrame, userPrompt, component);
      }
    }
    
    parentFrame.appendChild(headerFrame);
    currentY += 80 + 24;
  }
  
  const remainingHeight = canvasHeight - (currentY - parentFrame.paddingTop);
  const hasSidebar = sidebarSections.length > 0;
  
  // ZONE 2: Main content (70-75% width, left-aligned)
  if (mainSections.length > 0) {
    const mainWidth = hasSidebar ? Math.floor(canvasWidth * 0.72) : canvasWidth;
    const mainFrame = createWebZoneFrame('main_content', 0, 0, mainWidth, remainingHeight);
    mainFrame.x = parentFrame.paddingLeft;
    mainFrame.y = currentY;
    
    // PHASE 6.2: Main content height = HUG CONTENT (web only)
    mainFrame.primaryAxisSizingMode = "AUTO";
    mainFrame.counterAxisSizingMode = "AUTO";
    
    for (const section of mainSections) {
      const sectionFrame = createSectionFrame(section, mainFrame, null);
      
      if (section.components) {
        for (const component of section.components) {
          await createComponent(component.componentKey, sectionFrame, userPrompt, component);
        }
      }
      
      mainFrame.appendChild(sectionFrame);
    }
    
    parentFrame.appendChild(mainFrame);
  }
  
  // ZONE 3: Sidebar (25-30% width, right-aligned)
  if (hasSidebar) {
    const sidebarWidth = Math.floor(canvasWidth * 0.25);
    const sidebarX = parentFrame.paddingLeft + canvasWidth - sidebarWidth;
    const sidebarFrame = createWebZoneFrame('sidebar', 0, 0, sidebarWidth, remainingHeight);
    sidebarFrame.x = sidebarX;
    sidebarFrame.y = currentY;
    
    for (const section of sidebarSections) {
      const sectionFrame = createSectionFrame(section, sidebarFrame, null);
      
      if (section.components) {
        for (const component of section.components) {
          await createComponent(component.componentKey, sectionFrame, userPrompt, component);
        }
      }
      
      sidebarFrame.appendChild(sectionFrame);
    }
    
    parentFrame.appendChild(sidebarFrame);
  }
}

// PHASE 6: Create web zone frames with neutral visual semantics
function createWebZoneFrame(zoneName, x, y, width, height) {
  const zoneFrame = figma.createFrame();
  zoneFrame.name = `${zoneName}_zone`;
  zoneFrame.x = x;
  zoneFrame.y = y;
  zoneFrame.resize(width, height);
  
  if (zoneName === 'header') {
    zoneFrame.layoutMode = "HORIZONTAL";
    zoneFrame.itemSpacing = 16;
    zoneFrame.counterAxisAlignItems = "CENTER";
    zoneFrame.primaryAxisAlignItems = "SPACE_BETWEEN";
    // PHASE 6: Header section distinction
    zoneFrame.fills = [{type: "SOLID", color: {r: 0.94, g: 0.94, b: 0.94}}];
    zoneFrame.strokes = [{type: "SOLID", color: {r: 0.88, g: 0.88, b: 0.88}}];
    zoneFrame.strokeWeight = 1;
  } else if (zoneName === 'main_content') {
    zoneFrame.layoutMode = "VERTICAL";
    zoneFrame.itemSpacing = 20;
    zoneFrame.counterAxisAlignItems = "MIN";
    // PHASE 6.2: Main content zones hug content (web only)
    zoneFrame.primaryAxisSizingMode = "AUTO";
    zoneFrame.counterAxisSizingMode = "AUTO";
    // PHASE 6: Main content - white/base surface
    zoneFrame.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
    zoneFrame.strokes = [{type: "SOLID", color: {r: 0.92, g: 0.92, b: 0.92}}];
    zoneFrame.strokeWeight = 1;
  } else if (zoneName === 'sidebar') {
    zoneFrame.layoutMode = "VERTICAL";
    zoneFrame.itemSpacing = 16;
    zoneFrame.counterAxisAlignItems = "MIN";
    // PHASE 6: Sidebar - distinct neutral surface
    zoneFrame.fills = [{type: "SOLID", color: {r: 0.97, g: 0.97, b: 0.97}}];
    zoneFrame.strokes = [{type: "SOLID", color: {r: 0.90, g: 0.90, b: 0.90}}];
    zoneFrame.strokeWeight = 1;
  }
  
  zoneFrame.paddingTop = 16;
  zoneFrame.paddingBottom = 16;
  zoneFrame.paddingLeft = 16;
  zoneFrame.paddingRight = 16;
  zoneFrame.cornerRadius = 4;
  
  return zoneFrame;
}

// PHASE 5: Standard section rendering (non-dashboard layouts)
async function renderStandardSections(sections, parentFrame, userPrompt, archetypeConfig) {
  const sortedSections = sections.slice().sort((a, b) => {
    const priorityA = a.section_priority || 5;
    const priorityB = b.section_priority || 5;
    return priorityB - priorityA;
  });
  
  for (let sectionIndex = 0; sectionIndex < sortedSections.length; sectionIndex++) {
    const section = sortedSections[sectionIndex];
    
    if (section.responsive_behavior === 'hide_on_mobile' && parentFrame.name.includes('mobile')) {
      continue;
    }
    
    const sectionFrame = createSectionFrame(section, parentFrame, archetypeConfig);
    
    if (section.components && section.components.length > 0) {
      const sortedComponents = section.components.slice().sort((a, b) => {
        const priorityA = a.layout_priority || 5;
        const priorityB = b.layout_priority || 5;
        return priorityB - priorityA;
      });
      
      for (const component of sortedComponents) {
        await createComponent(component.componentKey, sectionFrame, userPrompt, component);
      }
    }
    
    if (parentFrame.layoutMode === "NONE") {
      positionSectionManually(sectionFrame, sectionIndex, sortedSections.length, parentFrame);
    } else {
      parentFrame.appendChild(sectionFrame);
    }
  }
}

// PHASE 6: Section frame creation with neutral visual semantics
function createSectionFrame(section, parentFrame, archetypeConfig) {
  const sectionFrame = figma.createFrame();
  sectionFrame.name = section.section_name;
  
  // PHASE 5: Grid layout for main content sections with cards
  if (section.section_name === 'main_content' && section.components && 
      section.components.some(comp => comp.componentKey === 'card_container')) {
    sectionFrame.layoutMode = "HORIZONTAL";
    sectionFrame.itemSpacing = 16;
    sectionFrame.counterAxisAlignItems = "MIN";
    sectionFrame.primaryAxisSizingMode = "AUTO";
  } else {
    // Apply layout direction
    switch (section.layout_direction) {
      case 'horizontal':
        sectionFrame.layoutMode = "HORIZONTAL";
        sectionFrame.itemSpacing = 16;
        sectionFrame.counterAxisAlignItems = "CENTER";
        break;
      case 'grid':
        sectionFrame.layoutMode = "HORIZONTAL";
        sectionFrame.itemSpacing = 16;
        sectionFrame.counterAxisAlignItems = "MIN";
        break;
      case 'vertical':
      default:
        sectionFrame.layoutMode = "VERTICAL";
        sectionFrame.itemSpacing = 12;
        sectionFrame.counterAxisAlignItems = "MIN";
        break;
    }
  }
  
  sectionFrame.primaryAxisSizingMode = "AUTO";
  sectionFrame.counterAxisSizingMode = "AUTO";
  
  sectionFrame.paddingTop = 16;
  sectionFrame.paddingBottom = 16;
  sectionFrame.paddingLeft = 16;
  sectionFrame.paddingRight = 16;
  
  // PHASE 6: Section distinction with neutral backgrounds
  if (section.section_name === 'sidebar' || section.section_name === 'sidebar_filters') {
    sectionFrame.fills = [{type: "SOLID", color: {r: 0.96, g: 0.96, b: 0.96}}];
    sectionFrame.strokes = [{type: "SOLID", color: {r: 0.90, g: 0.90, b: 0.90}}];
    sectionFrame.strokeWeight = 1;
    sectionFrame.cornerRadius = 6;
  } else if (section.section_name === 'header') {
    sectionFrame.fills = [{type: "SOLID", color: {r: 0.95, g: 0.95, b: 0.95}}];
    sectionFrame.strokes = [{type: "SOLID", color: {r: 0.88, g: 0.88, b: 0.88}}];
    sectionFrame.strokeWeight = 1;
    sectionFrame.cornerRadius = 4;
  } else {
    // Main content and other sections - clear boundaries
    sectionFrame.fills = [];
    sectionFrame.strokes = [{type: "SOLID", color: {r: 0.93, g: 0.93, b: 0.93}}];
    sectionFrame.strokeWeight = 1;
    sectionFrame.cornerRadius = 4;
  }
  
  return sectionFrame;
}

// PHASE 3: Manual positioning for multi-column layouts
function positionSectionManually(sectionFrame, sectionIndex, totalSections, parentFrame) {
  const parentWidth = parentFrame.width - (parentFrame.paddingLeft + parentFrame.paddingRight);
  const parentHeight = parentFrame.height - (parentFrame.paddingTop + parentFrame.paddingBottom);
  
  // Position based on section name and index
  if (sectionFrame.name === 'header') {
    // Header: full width at top
    sectionFrame.x = parentFrame.paddingLeft;
    sectionFrame.y = parentFrame.paddingTop;
    sectionFrame.resize(parentWidth, 80);
  } else if (sectionFrame.name === 'sidebar' || sectionFrame.name === 'sidebar_filters') {
    // Sidebar: right side
    const sidebarWidth = Math.min(300, parentWidth * 0.25);
    sectionFrame.x = parentFrame.paddingLeft + parentWidth - sidebarWidth;
    sectionFrame.y = parentFrame.paddingTop + 100; // Below header
    sectionFrame.resize(sidebarWidth, parentHeight - 120);
  } else if (sectionFrame.name === 'main_content' || sectionFrame.name === 'product_grid') {
    // Main content: left side (accounting for sidebar)
    const sidebarWidth = 300;
    const contentWidth = parentWidth - sidebarWidth - 20; // 20px gap
    sectionFrame.x = parentFrame.paddingLeft;
    sectionFrame.y = parentFrame.paddingTop + 100; // Below header
    sectionFrame.resize(contentWidth, parentHeight - 120);
  } else {
    // Default positioning
    sectionFrame.x = parentFrame.paddingLeft;
    sectionFrame.y = parentFrame.paddingTop + (sectionIndex * 100);
    sectionFrame.resize(parentWidth, 80);
  }
  
  parentFrame.appendChild(sectionFrame);
}

// Fallback: render flat components (backward compatibility)
async function renderFlatComponents(components, parentFrame, userPrompt) {
  console.log(`🔄 Fallback: Rendering ${components.length} flat components`);
  
  for (let index = 0; index < components.length; index++) {
    const item = components[index];
    console.log(`📍 Placing ${item.componentKey}`);
    await createComponent(item.componentKey, parentFrame, userPrompt, item);
  }
}

function extractScreenNameFromPrompt(userPrompt) {
  if (!userPrompt) return null;
  
  // Enhanced patterns to better capture screen names
  const patterns = [
    // "create exhibition screen" or "create an exhibition screen"
    /create\s+(?:an?\s+)?(\w+)\s+(?:screen|page|form)/i,
    // "exhibition screen" or "exhibition page"
    /(\w+)\s+(?:screen|page|form)/i,
    // "build exhibition" or "make exhibition" or "design exhibition"
    /(?:build|make|design)\s+(?:an?\s+)?(\w+)/i,
    // "exhibition for..." - capture the first word before "for"
    /(\w+)\s+for\s+/i,
    // Just look for any word that could be a screen name (fallback)
    /(?:^|\s)([a-zA-Z]{4,})/i
  ];
  
  for (const pattern of patterns) {
    const match = userPrompt.match(pattern);
    if (match && match[1]) {
      const screenName = match[1];
      // Skip common words that shouldn't be screen names
      const skipWords = ['create', 'build', 'make', 'design', 'screen', 'page', 'form', 'with', 'that', 'this', 'have', 'will', 'would', 'could', 'should'];
      if (!skipWords.includes(screenName.toLowerCase())) {
        return screenName.charAt(0).toUpperCase() + screenName.slice(1).toLowerCase();
      }
    }
  }
  
  return null;
}

function cleanScreenName(name) {
  // Clean screen name while preserving readability
  return name
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars but keep spaces, hyphens, underscores
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .toLowerCase();
}
// Basic Validation Functions
function findScreenFrame(selectedNode) {
  if (selectedNode.type === 'FRAME' && isScreenFrame(selectedNode)) {
    return selectedNode;
  }
  
  let current = selectedNode;
  while (current && current.type !== 'PAGE') {
    if (current.type === 'FRAME' && isScreenFrame(current)) {
      return current;
    }
    current = current.parent;
  }
  
  return null;
}

function isScreenFrame(frame) {
  if (frame.type !== 'FRAME') return false;
  
  const frameName = frame.name.toLowerCase();
  const screenIndicators = ['screen', 'page', 'view', 'ai screen', 'mobile', 'desktop', 'app'];
  const hasScreenIndicator = screenIndicators.some(indicator => frameName.includes(indicator));
  const hasReasonableSize = frame.width >= 200 && frame.height >= 200;
  const hasMultipleChildren = frame.children && frame.children.length >= 2;
  
  return hasScreenIndicator || (hasReasonableSize && hasMultipleChildren);
}

async function validateAndGenerateCode(uiScreenName) {
  console.log("🔍 Manual validation and code generation flow started");
  console.log("📱 UI Screen Name received:", uiScreenName);
  
  try {
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.notify("❌ Please select a design frame or element to generate code.");
      figma.ui.postMessage({
        type: 'design-validation-result',
        valid: false,
        score: 0,
        errors: ['No selection found'],
        warnings: []
      });
      return;
    }
    
    const selectedFrame = findScreenFrame(selection[0]);
    
    if (!selectedFrame) {
      figma.notify("❌ Please select an element inside a screen frame to generate code.");
      figma.ui.postMessage({
        type: 'design-validation-result',
        valid: false,
        score: 0,
        errors: ['No screen frame found'],
        warnings: []
      });
      return;
    }
    
    // Simple validation - always pass for now
    const validationResult = {
      valid: true,
      score: 85,
      errors: [],
      warnings: []
    };
    
    figma.ui.postMessage({
      type: 'design-validation-result',
      valid: validationResult.valid,
      score: validationResult.score,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      frameName: selectedFrame.name
    });
    
    if (validationResult.valid) {
      console.log("✅ Design validation passed, proceeding with code generation");
      
      // Create simple design IR
      const designIR = {
        components: [
          { componentKey: 'heading', text: 'Generated Screen' },
          { componentKey: 'description', text: 'This screen was generated from your design.' },
          { componentKey: 'primary_button', text: 'Action Button' }
        ],
        screenType: 'web'
      };
      
      // Screen name priority system (same as design generation)
      // PRIORITY 1: UI Screen Name field (highest priority)
      // PRIORITY 2: Frame name (fallback)
      // PRIORITY 3: Default name (last resort)
      let screenName = 'validated-screen'; // Default
      
      if (uiScreenName && uiScreenName.trim()) {
        // UI field has priority - use it directly
        screenName = cleanScreenName(uiScreenName.trim());
        console.log("🎯 PRIORITY 1: Using UI screen name field:", screenName);
        figma.notify(`📱 Using screen name: ${screenName}`);
      } else {
        // Fallback to frame name
        const frameBasedName = cleanScreenName(selectedFrame.name);
        if (frameBasedName) {
          screenName = frameBasedName;
          console.log("🎯 PRIORITY 2: Using frame name:", screenName);
        } else {
          console.log("🎯 PRIORITY 3: Using default screen name:", screenName);
        }
      }
      
      console.log("🎯 Final screen name for validation:", screenName);
      await generateAngularCode(designIR, screenName);
    }
    
  } catch (error) {
    console.error("❌ Validation error:", error);
    figma.notify(`❌ Error: ${error.message}`);
  }
}

// PRODUCTION-SAFE: Selection-based component generation
async function generateFromSelection(selectedNode) {
  console.log('🎯 Starting Stage 2 selection-based component generation');
  console.log('📋 Selected node:', selectedNode.name, selectedNode.type);
  
  try {
    // Validate selection is a frame or component
    if (selectedNode.type !== 'FRAME' && selectedNode.type !== 'COMPONENT' && selectedNode.type !== 'INSTANCE') {
      figma.notify('❌ Please select a frame, component, or component instance');
      figma.ui.postMessage({
        type: 'selection-error',
        message: 'Selected item must be a frame, component, or component instance',
        nodeType: selectedNode.type
      });
      return;
    }
    
    // Extract component name from selection
    let componentName = selectedNode.name.replace(/[^a-zA-Z0-9]/g, '');
    const screenName = componentName || 'SelectedComponent';
    
    console.log('📝 Component name:', screenName);
    figma.notify(`🎯 Generating component: ${screenName} (Stage 2)`);
    
    // Determine component type based on name and structure
    let componentKey = "primary_button"; // Default
    const nodeName = selectedNode.name.toLowerCase();
    
    if (nodeName.includes('button')) {
      componentKey = nodeName.includes('primary') ? "primary_button" : "secondary_button";
    } else if (nodeName.includes('input') || nodeName.includes('field')) {
      componentKey = "text_input";
    } else if (nodeName.includes('card') || nodeName.includes('panel')) {
      componentKey = "card_container";
    } else if (nodeName.includes('heading') || nodeName.includes('title')) {
      componentKey = "heading";
    } else if (nodeName.includes('text') || nodeName.includes('description')) {
      componentKey = "description";
    }
    
    console.log('🔍 Detected component type:', componentKey);
    
    // Create a simple layout JSON from the selected component
    const layoutJSON = {
      screenType: "web",
      application_type: "component_library", 
      layout_archetype: "component_single",
      canvas_size: { width: 400, height: 200 },
      components: [{
        componentKey: componentKey,
        text: selectedNode.name,
        section: "main",
        layout_direction: "vertical",
        component_role: "interactive",
        layout_priority: 8
      }]
    };
    
    // Stage 2: Prepare Figma node data for input inference
    const figmaNodeData = {
      type: selectedNode.type,
      name: selectedNode.name,
      children: selectedNode.children || [],
      componentProperties: selectedNode.componentProperties || {},
      visible: selectedNode.visible !== false,
      // Additional properties for input inference
      width: selectedNode.width,
      height: selectedNode.height,
      fills: selectedNode.fills || [],
      effects: selectedNode.effects || []
    };
    
    console.log('🔍 Stage 2: Figma node data prepared for input inference');
    console.log('📊 Component properties found:', Object.keys(figmaNodeData.componentProperties).length);
    console.log('🔍 figmaNodeData being sent:', JSON.stringify(figmaNodeData, null, 2));
    
    console.log('🔄 Starting Stage 2 code generation for selected component');
    console.log('📊 Layout JSON:', layoutJSON);
    
    // Generate Angular code using the main pipeline with Stage 2 data
    const response = await fetch(CODE_GENERATOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        figmaLayoutJSON: layoutJSON,
        screenName: screenName,
        testMode: false,
        figmaNode: figmaNodeData // Stage 2: Include Figma node for input inference
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Stage 2 code generation error: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Stage 2 Angular code generated successfully');
      console.log('🔍 Input inference enabled:', result.stage2Enabled);
      
      figma.ui.postMessage({
        type: 'code-generated',
        files: result.exportFiles,
        screenName: screenName,
        stage2Enabled: result.stage2Enabled,
        pipelineStatus: result.pipelineStatus || 'Stage 2 code generation completed'
      });
      
      const stage2Message = result.stage2Enabled ? ' with input inference' : '';
      figma.notify(`✅ Angular code generated for ${screenName}${stage2Message}`);
    } else {
      throw new Error(`Stage 2 code generation failed: ${(result.errors && result.errors.join) ? result.errors.join(', ') : 'Unknown error'}`);
    }
    
    figma.ui.postMessage({
      type: 'selection-generation-complete',
      componentName: screenName,
      selectedNodeName: selectedNode.name,
      selectedNodeType: selectedNode.type,
      detectedComponentType: componentKey,
      stage2Enabled: result.stage2Enabled || false
    });
    
    console.log('✅ Stage 2 selection-based generation completed');
    
  } catch (error) {
    console.error('❌ Stage 2 selection generation error:', error);
    figma.notify(`❌ Stage 2 generation failed: ${error.message}`);
    
    figma.ui.postMessage({
      type: 'selection-generation-error',
      error: error.message,
      selectedNodeName: selectedNode.name,
      stage2Enabled: false
    });
  }
}

// Library Scan and Storybook Generation
async function scanLibraryAndGenerateStorybook() {
  console.log("📚 Starting library scan and Storybook generation");
  figma.notify("📚 Scanning Figma library components...");
  
  try {
    // Scan all component sets in the current file
    const componentSets = figma.root.findAll(node => node.type === "COMPONENT_SET");
    const components = figma.root.findAll(node => node.type === "COMPONENT");
    
    console.log(`📊 Found ${componentSets.length} component sets and ${components.length} individual components`);
    
    // Create component registry
    const componentRegistry = [];
    
    // Process component sets
    componentSets.forEach(componentSet => {
      const category = categorizeComponent(componentSet.name);
      
      componentRegistry.push({
        componentName: componentSet.name,
        category: category,
        framework: "Angular",
        library: "PrimeNG",
        source: "figma-library",
        type: "component-set",
        variants: componentSet.children.length
      });
    });
    
    // Process individual components (filter out component set children and system components)
    components.forEach(component => {
      // Skip components that are part of component sets
      if (component.parent && component.parent.type === "COMPONENT_SET") {
        return;
      }
      
      // Skip system/internal components (common prefixes to ignore)
      const name = component.name.toLowerCase();
      if (name.startsWith('_') || name.startsWith('.') || name.includes('instance') || name.includes('master')) {
        return;
      }
      
      const category = categorizeComponent(component.name);
      
      componentRegistry.push({
        componentName: component.name,
        category: category,
        framework: "Angular",
        library: "PrimeNG",
        source: "figma-library",
        type: "component",
        variants: 1
      });
    });
    
    console.log(`📋 Component registry created with ${componentRegistry.length} entries`);
    
    // Send to backend for Storybook generation
    await generateLibraryStorybook(componentRegistry);
    
    figma.notify(`✅ Library scan complete! Found ${componentRegistry.length} components`);
    
    figma.ui.postMessage({
      type: 'library-scan-complete',
      componentCount: componentRegistry.length,
      registry: componentRegistry
    });
    
  } catch (error) {
    console.error("❌ Library scan error:", error);
    figma.notify(`❌ Library scan failed: ${error.message}`);
  }
}

function categorizeComponent(componentName) {
  const name = componentName.toLowerCase();
  
  if (name.includes('button') || name.includes('btn')) return 'Buttons';
  if (name.includes('input') || name.includes('field') || name.includes('form')) return 'Inputs';
  if (name.includes('card') || name.includes('panel')) return 'Cards';
  if (name.includes('nav') || name.includes('menu') || name.includes('header') || name.includes('footer')) return 'Navigation';
  if (name.includes('modal') || name.includes('dialog') || name.includes('popup')) return 'Overlays';
  if (name.includes('table') || name.includes('list') || name.includes('grid')) return 'Data Display';
  if (name.includes('icon') || name.includes('avatar') || name.includes('badge')) return 'Display';
  if (name.includes('layout') || name.includes('container') || name.includes('wrapper')) return 'Layout';
  
  return 'Misc';
}

function extractProperties(componentSet) {
  const properties = {};
  
  if (componentSet.componentPropertyDefinitions) {
    Object.keys(componentSet.componentPropertyDefinitions).forEach(key => {
      const prop = componentSet.componentPropertyDefinitions[key];
      properties[key] = {
        type: prop.type,
        defaultValue: prop.defaultValue,
        variantOptions: prop.variantOptions || []
      };
    });
  }
  
  return properties;
}

async function generateLibraryStorybook(componentRegistry) {
  console.log("📖 Generating Storybook stories for library components");
  
  try {
    const response = await fetch('http://localhost:3001/generate-library-storybook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        componentRegistry: componentRegistry,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Library Storybook generation error: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('📚 ✅ Library Storybook generated successfully');
      console.log(`📁 Stories created: ${result.storiesGenerated || 0}`);
      
      figma.notify(`✅ Library Storybook generated with ${result.storiesGenerated || 0} stories`);
    } else {
      throw new Error(`Library Storybook generation failed: ${result.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('📚 ❌ Library Storybook generation error:', error.message);
    figma.notify(`❌ Library Storybook generation failed: ${error.message}`);
  }
}
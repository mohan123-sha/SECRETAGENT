// STEP 5: Minimal Backend Server

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createGeminiPrompt, ALLOWED_COMPONENT_KEYS } = require('./gemini-prompt');
const { getArchetypeForApplication, getArchetypeConfig, getCanvasSize } = require('./layout-archetypes');
const { generateAngularCode, testPipeline } = require('./code-generator-pipeline');
const { validateLayoutJSON, enhanceLayoutJSON } = require('./layout-json-schema');

const app = express();
const PORT = 3000;

// Your API key (in production, use environment variable)
const API_KEY = 'AIzaSyAQTKufDJL_ARNAiDs-u-vrsIwZDryCevQ';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Backend server running', timestamp: new Date().toISOString() });
});

// Main layout generation endpoint
app.post('/generate-layout', async (req, res) => {
  try {
    const { userPrompt } = req.body;
    
    if (!userPrompt) {
      return res.status(400).json({ 
        error: 'userPrompt is required',
        example: { userPrompt: "Create a confirmation screen with a primary button" }
      });
    }
    
    console.log('📥 Received request:', userPrompt);
    
    // Create structured prompt
    const prompt = createGeminiPrompt(userPrompt);
    
    // Call Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();
    
    console.log('📤 Gemini raw response:', rawText);
    
    // Extract and parse JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('❌ No JSON found in Gemini response');
      return res.status(500).json({ 
        error: 'No valid JSON found in AI response',
        rawResponse: rawText
      });
    }
    
    const jsonString = jsonMatch[0];
    let parsedJSON;
    
    try {
      parsedJSON = JSON.parse(jsonString);
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError.message);
      return res.status(500).json({ 
        error: 'Invalid JSON from AI response',
        rawJSON: jsonString,
        parseError: parseError.message
      });
    }
    
    // PHASE 4: Enhanced JSON validation using schema
    const validationResult = validateLayoutJSON(parsedJSON);
    
    if (!validationResult.valid) {
      console.log('❌ Schema validation failed:', validationResult.errors);
      return res.status(500).json({ 
        error: 'Layout JSON failed schema validation',
        validationErrors: validationResult.errors,
        validationWarnings: validationResult.warnings,
        received: parsedJSON
      });
    }
    
    if (validationResult.warnings.length > 0) {
      console.log('⚠️ Schema validation warnings:', validationResult.warnings);
    }
    
    console.log('✅ Schema validation passed');
    
    // PHASE 4: Enhance layout JSON with intelligent metadata
    const enhancedJSON = enhanceLayoutJSON(parsedJSON);
    console.log('✅ Layout JSON enhanced with metadata');
    
    // Validate structure - ENHANCED: Support canvas size and archetype validation
    if (!enhancedJSON.screenType || !enhancedJSON.application_type || !enhancedJSON.layout_archetype || !Array.isArray(enhancedJSON.sections)) {
      console.log('❌ Invalid JSON structure - missing required fields');
      return res.status(500).json({ 
        error: 'Invalid JSON structure from AI - missing screenType, application_type, layout_archetype, or sections',
        received: enhancedJSON,
        expected: {
          screenType: "web|mobile",
          application_type: "dashboard|ecommerce|healthcare|etc",
          layout_archetype: "dashboard_web|landing_web|auth_flow|etc",
          sections: "array",
          canvas_size: "object with width/height"
        }
      });
    }
    
    // PHASE 2: Validate archetype selection
    const expectedArchetype = getArchetypeForApplication(enhancedJSON.application_type, enhancedJSON.screenType);
    const archetypeConfig = getArchetypeConfig(enhancedJSON.layout_archetype);
    
    if (!archetypeConfig) {
      console.log('❌ Invalid layout archetype:', enhancedJSON.layout_archetype);
      return res.status(500).json({ 
        error: 'Invalid layout archetype from AI',
        received: enhancedJSON.layout_archetype,
        expected: expectedArchetype,
        availableArchetypes: Object.keys(require('./layout-archetypes').LAYOUT_ARCHETYPES)
      });
    }
    
    // PHASE 3: Validate canvas size
    const expectedCanvasSize = getCanvasSize(archetypeConfig.canvas_type);
    if (!enhancedJSON.canvas_size || !enhancedJSON.canvas_size.width || !enhancedJSON.canvas_size.height) {
      console.log('⚠️ Missing canvas size, using archetype default');
      enhancedJSON.canvas_size = expectedCanvasSize;
    }
    
    console.log(`✅ Archetype validation: ${enhancedJSON.layout_archetype} (${archetypeConfig.canvas_type})`);
    console.log(`✅ Canvas size: ${enhancedJSON.canvas_size.width}x${enhancedJSON.canvas_size.height}`);
    console.log(`✅ Layout metadata: complexity=${enhancedJSON.layout_metadata?.complexity_score}, flow=${enhancedJSON.layout_metadata?.primary_user_flow}`);
    
    // Validate component keys across all sections
    const allowedKeys = ALLOWED_COMPONENT_KEYS;
    let invalidComponents = [];
    
    enhancedJSON.sections.forEach((section, sectionIndex) => {
      if (!Array.isArray(section.components)) {
        console.log(`❌ Section ${sectionIndex} has invalid components array`);
        return res.status(500).json({ 
          error: `Section ${sectionIndex} (${section.section_name}) has invalid components array`,
          section: section
        });
      }
      
      const sectionInvalidComponents = section.components.filter(comp => 
        !allowedKeys.includes(comp.componentKey)
      );
      
      invalidComponents = invalidComponents.concat(sectionInvalidComponents.map(comp => ({
        ...comp,
        section: section.section_name
      })));
    });
    
    if (invalidComponents.length > 0) {
      console.log('❌ Invalid component keys:', invalidComponents);
      return res.status(500).json({ 
        error: 'AI used invalid component keys',
        invalidComponents,
        allowedKeys
      });
    }
    
    // Convert sections-based layout to flat components array for backward compatibility
    const flatComponents = [];
    enhancedJSON.sections.forEach(section => {
      section.components.forEach(component => {
        flatComponents.push({
          ...component,
          section: section.section_name,
          layout_direction: section.layout_direction,
          // PHASE 4: Include enhanced metadata
          component_role: component.component_role,
          layout_priority: component.layout_priority
        });
      });
    });
    
    // Create enhanced response with archetype intelligence and Phase 4 metadata
    const compatibleResponse = {
      screenType: enhancedJSON.screenType,
      application_type: enhancedJSON.application_type,
      layout_archetype: enhancedJSON.layout_archetype,
      canvas_size: enhancedJSON.canvas_size,
      archetype_config: archetypeConfig, // PHASE 2: Include archetype metadata
      layout_metadata: enhancedJSON.layout_metadata, // PHASE 4: Include layout intelligence
      sections: enhancedJSON.sections, // PHASE 4: Enhanced sections with metadata
      components: flatComponents, // Flat array for existing plugin logic with enhanced metadata
      validation_result: {
        valid: validationResult.valid,
        warnings: validationResult.warnings,
        enhanced: true
      }
    };
    
    console.log('✅ Valid layout JSON generated:', compatibleResponse);
    
    // Return enhanced layout JSON with backward compatibility
    res.json(compatibleResponse);
    
  } catch (error) {
    console.error('❌ Server error:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// NEW: Code generation endpoint
app.post('/generate-code', async (req, res) => {
  try {
    const { figmaLayoutJSON, screenName, testMode } = req.body;
    
    if (!figmaLayoutJSON) {
      return res.status(400).json({ 
        error: 'figmaLayoutJSON is required',
        example: { 
          figmaLayoutJSON: { screenType: "mobile", components: [] },
          screenName: "Login",
          testMode: false
        }
      });
    }
    
    console.log('🔧 Code generation request:', { 
      screenName: screenName || 'GeneratedScreen',
      componentCount: figmaLayoutJSON.components?.length || 0,
      testMode: testMode || false
    });
    
    let result;
    
    if (testMode) {
      // Use test pipeline with mock response
      result = await testPipeline(figmaLayoutJSON, screenName);
    } else {
      // Use full pipeline with Gemini API
      result = await generateAngularCode(figmaLayoutJSON, screenName);
    }
    
    if (result.success) {
      console.log('✅ Code generation successful');
      res.json({
        success: true,
        designIR: result.designIR,
        files: result.generatedFiles,
        exportFiles: result.exportFiles,
        summary: result.summary
      });
    } else {
      console.log('⚠️ Code generation completed with errors:', result.errors);
      res.status(400).json({
        success: false,
        errors: result.errors,
        designIR: result.designIR,
        summary: result.summary
      });
    }
    
  } catch (error) {
    console.error('❌ Code generation error:', error.message);
    res.status(500).json({ 
      error: 'Code generation failed',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Layout endpoint: POST http://localhost:${PORT}/generate-layout`);
  console.log(`🔧 Code generation endpoint: POST http://localhost:${PORT}/generate-code`);
  console.log(`📝 Example layout request: { "userPrompt": "Create a confirmation screen with a primary button" }`);
  console.log(`📝 Example code request: { "figmaLayoutJSON": {...}, "screenName": "Login", "testMode": false }`);
});

module.exports = app;
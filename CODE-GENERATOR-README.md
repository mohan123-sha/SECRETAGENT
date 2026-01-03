# Code Generator Pipeline

A clean JavaScript pipeline that converts Figma design layouts into Angular + PrimeNG component code using Gemini AI.

## Architecture Overview

```
Figma Layout JSON → Design IR → Component Mapping → Gemini Prompt → Angular Code
```

### Pipeline Flow

1. **Design IR Conversion** (`design-ir.js`)
   - Converts raw Figma data into normalized Design JSON
   - Extracts design tokens and component structure
   - Provides clean, reusable intermediate format

2. **Component Mapping** (`component-mapping.js`)
   - Deterministic mapping from Design IR to Angular + PrimeNG
   - Configurable component rules
   - Import management and validation

3. **Prompt Building** (`angular-prompt-builder.js`)
   - Structured Gemini prompts for code generation
   - Component-specific instructions
   - Design token integration

4. **Output Handling** (`code-output-handler.js`)
   - Parses Gemini responses
   - Splits into separate files (.ts, .html, .scss)
   - Validates generated code structure

5. **Main Pipeline** (`code-generator-pipeline.js`)
   - Orchestrates the complete flow
   - Error handling and validation
   - Export preparation

## Usage

### Basic Usage

```javascript
const { generateAngularCode } = require('./code-generator-pipeline');

// Figma layout from existing pipeline
const figmaLayout = {
  screenType: "mobile",
  components: [
    { componentKey: "heading", text: "Login" },
    { componentKey: "text_input", text: "Email" },
    { componentKey: "primary_button", text: "Sign In" }
  ]
};

// Generate Angular code
const result = await generateAngularCode(figmaLayout, "Login");

if (result.success) {
  console.log('Generated files:', result.exportFiles);
} else {
  console.log('Errors:', result.errors);
}
```

### API Endpoints

#### POST /generate-code

Generates Angular code from Figma layout JSON.

**Request:**
```json
{
  "figmaLayoutJSON": {
    "screenType": "mobile",
    "components": [...]
  },
  "screenName": "Login",
  "testMode": false
}
```

**Response:**
```json
{
  "success": true,
  "designIR": {...},
  "files": {
    "typescript": {...},
    "html": {...},
    "scss": {...}
  },
  "exportFiles": [...]
}
```

### Figma Plugin Integration

The pipeline integrates with your existing Figma plugin:

```javascript
// Generate design + code
figma.ui.postMessage({
  type: 'generate-design',
  userPrompt: "Create a login screen",
  generateCode: true,
  screenName: "Login"
});

// Generate code only
figma.ui.postMessage({
  type: 'generate-code-only',
  layoutJSON: existingLayout,
  screenName: "Dashboard"
});
```

## Component Mappings

### Supported Components

| Design IR Type | Angular Output | PrimeNG Component |
|---------------|----------------|-------------------|
| `heading` | `<h1>` | - |
| `text` | `<p>` | - |
| `input` | `<p-inputText>` | InputTextModule |
| `button` | `<p-button>` | ButtonModule |
| `container` | `<div>` | - |

### Input Types

- `email` → `type="email"`
- `password` → `type="password"`
- `text` → `type="text"`
- `number` → `type="number"`

### Button Variants

- `primary` → `severity="primary"`
- `secondary` → `severity="secondary"`
- `success` → `severity="success"`

## Design Tokens

Design tokens are automatically converted to CSS variables:

```scss
.component-container {
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  color: var(--primary-500);
}
```

## Testing

### Run All Tests
```bash
npm run test-code-generator
```

### Run Full Tests (with Gemini API)
```bash
npm run test-code-generator-full
```

### Test Individual Components
```bash
node test-code-generator.js --components
```

## Generated File Structure

For a "Login" screen, the pipeline generates:

```
login.component.ts    - Angular component class
login.component.html  - Template with PrimeNG components
login.component.scss  - Styles with CSS variables
```

### Example Output

**login.component.ts:**
```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  emailValue = '';
  passwordValue = '';

  onSignInClick() {
    console.log('Sign in clicked');
  }
}
```

**login.component.html:**
```html
<div class="login-container">
  <h1>Login</h1>
  <p-inputText type="email" placeholder="Email" [(ngModel)]="emailValue"></p-inputText>
  <p-inputText type="password" placeholder="Password" [(ngModel)]="passwordValue"></p-inputText>
  <p-button label="Sign In" severity="primary" (click)="onSignInClick()"></p-button>
</div>
```

**login.component.scss:**
```scss
.login-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
}
```

## Configuration

### Gemini API Configuration

Update `code-generator-pipeline.js`:

```javascript
const GEMINI_CONFIG = {
  model: 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY // Use environment variable
};
```

### Component Mapping Customization

Modify `component-mapping.js` to add new component types:

```javascript
const COMPONENT_MAPPING = {
  // Add new component type
  dropdown: {
    tag: "p-dropdown",
    attributes: {
      "[(ngModel)]": "{{camelCase(label)}}Value",
      options: "{{camelCase(label)}}Options"
    },
    imports: ["DropdownModule"]
  }
};
```

## Error Handling

The pipeline includes comprehensive error handling:

- **Design IR Validation**: Ensures proper structure
- **Component Mapping**: Validates all components are mappable
- **Gemini Response**: Parses and validates generated code
- **File Extraction**: Ensures all required files are present

## Production Considerations

1. **API Key Security**: Use environment variables for Gemini API key
2. **Rate Limiting**: Implement rate limiting for API calls
3. **Caching**: Cache generated code for repeated requests
4. **Validation**: Add additional code validation rules
5. **Error Logging**: Implement proper error logging and monitoring

## Extending the Pipeline

### Adding New Component Types

1. Update `COMPONENT_MAPPING` in `component-mapping.js`
2. Add conversion logic in `design-ir.js`
3. Update prompt instructions in `angular-prompt-builder.js`
4. Add tests in `test-code-generator.js`

### Supporting New Frameworks

The pipeline is designed to be framework-agnostic. To support React, Vue, etc.:

1. Create new mapping files (e.g., `react-mapping.js`)
2. Create new prompt builders (e.g., `react-prompt-builder.js`)
3. Update the main pipeline to accept framework parameter

## Troubleshooting

### Common Issues

1. **Missing Gemini API Key**: Set `GEMINI_API_KEY` environment variable
2. **Component Not Found**: Check component mapping in `component-mapping.js`
3. **Invalid Design IR**: Validate input using `validateDesignIR()`
4. **Parsing Errors**: Check Gemini response format in logs

### Debug Mode

Enable debug logging:

```javascript
const result = await generateAngularCode(layout, "Test", { debug: true });
```

## License

This code generator pipeline is part of your Figma plugin project.
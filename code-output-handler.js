// CODE OUTPUT HANDLER
// Parses Gemini response and splits into separate Angular files

/**
 * Parses Gemini response and extracts Angular files
 * @param {string} geminiResponse - Raw response from Gemini
 * @param {string} componentName - Name of the component
 * @returns {Object} Parsed files object
 */
function parseGeminiResponse(geminiResponse, componentName) {
  const files = {
    typescript: null,
    html: null,
    scss: null,
    errors: []
  };

  try {
    // Extract TypeScript component
    files.typescript = extractCodeBlock(geminiResponse, 'typescript', componentName);
    
    // Extract HTML template
    files.html = extractCodeBlock(geminiResponse, 'html', componentName);
    
    // Extract SCSS styles
    files.scss = extractCodeBlock(geminiResponse, 'scss', componentName);

    // Validate extracted files
    validateExtractedFiles(files, componentName);

  } catch (error) {
    files.errors.push(`Parsing error: ${error.message}`);
  }

  return files;
}

/**
 * Extracts a specific code block from Gemini response
 * @param {string} response - Gemini response text
 * @param {string} language - Code block language (typescript, html, scss)
 * @param {string} componentName - Component name for fallback
 * @returns {Object} Extracted file object
 */
function extractCodeBlock(response, language, componentName) {
  // Try to find code block with language identifier
  const codeBlockRegex = new RegExp(`\`\`\`${language}([\\s\\S]*?)\`\`\``, 'i');
  let match = response.match(codeBlockRegex);

  if (!match) {
    // Try alternative patterns
    const altPatterns = [
      new RegExp(`\`\`\`([\\s\\S]*?)\`\`\`.*${language}`, 'i'),
      new RegExp(`// ${componentName}.*\\.component\\.${getFileExtension(language)}([\\s\\S]*?)(?=\`\`\`|$)`, 'i'),
      new RegExp(`<!-- ${componentName}.*\\.component\\.${getFileExtension(language)}([\\s\\S]*?)(?=\`\`\`|$)`, 'i'),
      new RegExp(`/\\* ${componentName}.*\\.component\\.${getFileExtension(language)}([\\s\\S]*?)(?=\`\`\`|$)`, 'i')
    ];

    for (const pattern of altPatterns) {
      match = response.match(pattern);
      if (match) break;
    }
  }

  if (!match) {
    throw new Error(`No ${language} code block found`);
  }

  let content = match[1].trim();
  
  // Apply syntax fixes for TypeScript files
  if (language === 'typescript') {
    content = fixAngularSyntax(content);
  }
  
  const fileName = `${componentName.toLowerCase()}.component.${getFileExtension(language)}`;

  return {
    fileName: fileName,
    content: content,
    language: language,
    size: content.length
  };
}

/**
 * Gets file extension for language
 * @param {string} language - Code language
 * @returns {string} File extension
 */
function getFileExtension(language) {
  const extensions = {
    typescript: 'ts',
    html: 'html',
    scss: 'scss',
    css: 'css'
  };
  return extensions[language] || 'txt';
}

/**
 * Validates that all required files were extracted
 * @param {Object} files - Extracted files object
 * @param {string} componentName - Component name
 */
function validateExtractedFiles(files, componentName) {
  const requiredFiles = ['typescript', 'html', 'scss'];
  
  requiredFiles.forEach(fileType => {
    if (!files[fileType]) {
      files.errors.push(`Missing ${fileType} file`);
    } else if (!files[fileType].content) {
      files.errors.push(`Empty ${fileType} file content`);
    }
  });

  // Validate TypeScript component structure
  if (files.typescript && files.typescript.content) {
    validateTypeScriptComponent(files.typescript.content, componentName, files.errors);
  }

  // Validate HTML template
  if (files.html && files.html.content) {
    validateHtmlTemplate(files.html.content, files.errors);
  }
}

/**
 * Validates TypeScript component structure
 * @param {string} content - TypeScript content
 * @param {string} componentName - Expected component name
 * @param {Array} errors - Errors array to append to
 */
function validateTypeScriptComponent(content, componentName, errors) {
  // Check for component decorator
  if (!content.includes('@Component')) {
    errors.push('TypeScript file missing @Component decorator');
  }

  // Check for export class
  const classRegex = /export\s+class\s+(\w+)/;
  const classMatch = content.match(classRegex);
  if (!classMatch) {
    errors.push('TypeScript file missing export class');
  }

  // Check for Angular imports
  if (!content.includes('import') || !content.includes('@angular/core')) {
    errors.push('TypeScript file missing Angular imports');
  }
}

/**
 * Validates HTML template structure
 * @param {string} content - HTML content
 * @param {Array} errors - Errors array to append to
 */
function validateHtmlTemplate(content, errors) {
  // Check for basic HTML structure
  if (content.length < 10) {
    errors.push('HTML template appears to be too short');
  }

  // Check for PrimeNG components if expected
  const primeNgComponents = ['p-button', 'p-inputText', 'p-password'];
  const hasPrimeNg = primeNgComponents.some(comp => content.includes(comp));
  
  if (!hasPrimeNg && content.includes('button')) {
    errors.push('HTML may be missing PrimeNG components');
  }
}

/**
 * Prepares files for export or commit
 * @param {Object} files - Parsed files object
 * @param {string} outputDir - Output directory path
 * @returns {Array} Array of file objects ready for writing
 */
function prepareFilesForExport(files, outputDir = './src/app/components') {
  const exportFiles = [];

  ['typescript', 'html', 'scss'].forEach(fileType => {
    if (files[fileType] && files[fileType].content) {
      exportFiles.push({
        path: `${outputDir}/${files[fileType].fileName}`,
        content: files[fileType].content,
        type: fileType
      });
    }
  });

  return exportFiles;
}

/**
 * Cleans up common Gemini response artifacts
 * @param {string} content - Raw content from Gemini
 * @returns {string} Cleaned content
 */
function cleanGeminiArtifacts(content) {
  return content
    // Remove common prefixes
    .replace(/^(Here's the|Here is the|Generated).*?:\s*/i, '')
    // Remove file path comments at the start
    .replace(/^\/\/\s*.*\.component\.(ts|html|scss)\s*\n/, '')
    .replace(/^<!--\s*.*\.component\.(ts|html|scss)\s*-->\s*\n/, '')
    .replace(/^\/\*\s*.*\.component\.(ts|html|scss)\s*\*\/\s*\n/, '')
    // Remove trailing explanations
    .replace(/\n\n(This|The above).*$/s, '')
    .trim();
}

/**
 * Fixes Angular component syntax issues in TypeScript content
 * @param {string} content - TypeScript content
 * @returns {string} Fixed content
 */
function fixAngularSyntax(content) {
  // CRITICAL FIX: Replace styleUrl (singular) with styleUrls (plural array)
  // This fixes the recurring TS2345 compilation error
  content = content.replace(
    /styleUrl:\s*['"`]([^'"`]+)['"`]/g,
    "styleUrls: ['$1']"
  );
  
  return content;
}

/**
 * Generates a summary of the parsing results
 * @param {Object} files - Parsed files object
 * @returns {Object} Summary object
 */
function generateParsingSummary(files) {
  const summary = {
    success: files.errors.length === 0,
    filesExtracted: 0,
    totalSize: 0,
    errors: files.errors,
    files: {}
  };

  ['typescript', 'html', 'scss'].forEach(fileType => {
    if (files[fileType]) {
      summary.filesExtracted++;
      summary.totalSize += files[fileType].size;
      summary.files[fileType] = {
        fileName: files[fileType].fileName,
        size: files[fileType].size,
        hasContent: !!files[fileType].content
      };
    }
  });

  return summary;
}

// Example usage and test data
const EXAMPLE_GEMINI_RESPONSE = `
Here's the Angular component code:

\`\`\`typescript
// login.component.ts
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
\`\`\`

\`\`\`html
<!-- login.component.html -->
<div class="login-container">
  <h1>Login</h1>
  <p-inputText type="email" placeholder="Email" [(ngModel)]="emailValue"></p-inputText>
  <p-inputText type="password" placeholder="Password" [(ngModel)]="passwordValue"></p-inputText>
  <p-button label="Sign In" severity="primary" (click)="onSignInClick()"></p-button>
</div>
\`\`\`

\`\`\`scss
/* login.component.scss */
.login-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
}
\`\`\`
`;

module.exports = {
  parseGeminiResponse,
  extractCodeBlock,
  getFileExtension,
  validateExtractedFiles,
  validateTypeScriptComponent,
  validateHtmlTemplate,
  prepareFilesForExport,
  cleanGeminiArtifacts,
  fixAngularSyntax,
  generateParsingSummary,
  EXAMPLE_GEMINI_RESPONSE
};
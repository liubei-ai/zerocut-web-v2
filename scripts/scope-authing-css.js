import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the original Authing CSS
const authingCssPath = path.resolve(__dirname, '../node_modules/@authing/guard-vue3/dist/esm/guard.min.css');
const outputPath = path.resolve(__dirname, '../src/assets/authing-clean.css');

try {
  const originalCss = fs.readFileSync(authingCssPath, 'utf8');
  
  // Function to remove global reset styles and keep only Authing component styles
  function cleanAuthingCSS(css) {
    // Split CSS into individual rules by finding complete rule blocks
    const rules = [];
    let currentRule = '';
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < css.length; i++) {
      const char = css[i];
      const prevChar = css[i - 1];
      
      // Handle strings to avoid counting braces inside strings
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
      
      currentRule += char;
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          
          // When we complete a rule (braceCount returns to 0)
          if (braceCount === 0) {
            rules.push(currentRule.trim());
            currentRule = '';
          }
        }
      }
    }
    
    // Add any remaining content (shouldn't happen with valid CSS)
    if (currentRule.trim()) {
      rules.push(currentRule.trim());
    }
    
    // Define patterns for global reset rules to remove
    const globalResetPatterns = [
      // Exact global element selectors
      /^body\s*\{/,
      /^html\s*\{/,
      /^body\s*,\s*html\s*\{/,
      /^html\s*,\s*body\s*\{/,
      /^h1\s*,\s*h2\s*,\s*h3\s*,\s*h4\s*,\s*h5\s*,\s*h6\s*\{/,
      /^h[1-6]\s*\{/,
      /^p\s*\{/,
      /^a\s*\{/,
      /^button\s*\{/,
      /^input\s*\{/,
      /^textarea\s*\{/,
      /^select\s*\{/,
      /^table\s*\{/,
      /^ul\s*,\s*ol\s*,\s*dl\s*\{/,
      /^dl\s*,\s*ol\s*,\s*ul\s*\{/,
      /^ol\s*,\s*ul\s*\{/,
      /^ul\s*,\s*ol\s*\{/,
      /^\*\s*,\s*:after\s*,\s*:before\s*\{/,
      /^\*\s*\{/,
      /^button\s*,\s*input\s*,\s*optgroup\s*,\s*select\s*,\s*textarea\s*\{/,
      /^button\s*,\s*input\s*\{/,
      /^button\s*,\s*select\s*\{/,
      // @-ms-viewport
      /^@-ms-viewport\s*\{/,
    ];
    
    // Filter out global reset rules
    const cleanRules = rules.filter(rule => {
      // Skip empty rules
      if (!rule || !rule.includes('{')) {
        return true;
      }
      
      // Check if this rule matches any global reset pattern
      const isGlobalReset = globalResetPatterns.some(pattern => {
        return pattern.test(rule);
      });
      
      if (isGlobalReset) {
        const selectorPart = rule.split('{')[0].trim();
        console.log(`🗑️  Removing global reset rule: ${selectorPart.substring(0, 80)}...`);
        return false;
      }
      
      return true;
    });
    
    return cleanRules.join('\n');
  }
  
  const cleanCss = cleanAuthingCSS(originalCss);
  
  // Add a header comment
  const finalCss = `/* Clean Authing Guard CSS - Generated automatically */
/* Global reset styles have been removed to prevent conflicts */
/* Only Authing component-specific styles remain */
/* Do not edit manually - regenerate using: pnpm run build:authing-css */

${cleanCss}`;
  
  fs.writeFileSync(outputPath, finalCss, 'utf8');
  console.log('✅ Successfully generated clean Authing CSS at:', outputPath);
  console.log('🧹 Removed all global reset styles that were causing conflicts');
  
  // Show statistics
  const originalRuleCount = originalCss.split('{').length - 1;
  const cleanRuleCount = cleanCss.split('{').length - 1;
  console.log(`📊 Original: ${originalRuleCount} rules → Clean: ${cleanRuleCount} rules`);
  
  // Validate CSS structure
  const openBraces = (cleanCss.match(/{/g) || []).length;
  const closeBraces = (cleanCss.match(/}/g) || []).length;
  
  if (openBraces === closeBraces) {
    console.log('✅ CSS structure is valid (braces balanced)');
  } else {
    console.warn(`⚠️  CSS structure warning: ${openBraces} opening braces, ${closeBraces} closing braces`);
  }
  
} catch (error) {
  console.error('❌ Error processing Authing CSS:', error);
  process.exit(1);
}
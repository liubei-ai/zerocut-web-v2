# Authing Guard CSS Global Reset Removal

## Problem
The Authing Guard CSS (`@authing/guard-vue3/dist/esm/guard.min.css`) contains global CSS resets that override your application's styles, including:
- `h1, h2, h3, h4, h5, h6 { font-weight: 500; }`
- `body, html { height: 100%; width: 100%; }`
- Button and other element style resets

## Solution
We use a custom Node.js script to automatically **remove all global reset styles** from the Authing Guard CSS, keeping only the component-specific styles (`.authing-ant-*` classes).

## How it works

### 1. Build Script
```bash
pnpm run build:authing-css
```

This runs `scripts/scope-authing-css.js` which:
- Reads the original Authing Guard CSS
- **Removes all global reset selectors** like `html`, `body`, `h1-h6`, `p`, `button`, `input`, etc.
- **Keeps only Authing component styles** (`.authing-ant-*` classes)
- Preserves keyframes and animations
- Outputs clean CSS to `src/assets/authing-clean.css`

### 2. Usage in Components
```vue
<script setup>
// Import the clean CSS with global resets removed
import '@/assets/authing-clean.css';
</script>

<template>
  <!-- No special classes needed - just the container -->
  <div id="authing-guard-container"></div>
</template>
```

### 3. Result
- ❌ Global resets like `h1 { font-weight: 500; }` are **completely removed**
- ❌ `body, html` size constraints are **completely removed**
- ✅ Authing component styles like `.authing-ant-btn` are **preserved**
- ✅ Your application's styles remain **completely unaffected**
- ✅ Authing Guard functionality works **perfectly**

## Maintenance

### Regenerating Clean CSS
Run this command whenever you update the Authing Guard package:
```bash
pnpm run build:authing-css
```

### Files
- `scripts/scope-authing-css.js` - The cleaning script
- `src/assets/authing-clean.css` - Generated clean CSS (don't edit manually)
- `src/components/auth/LoginModal.vue` - Uses the clean CSS

## Benefits
- ✅ **Zero global CSS conflicts** - problematic resets are completely gone
- ✅ **No scoping classes needed** - just import and use
- ✅ **Automated solution** - no manual CSS editing
- ✅ **Preserves all Authing Guard functionality**
- ✅ **Your font-bold, font-semibold, etc. work everywhere**
- ✅ **Easy to maintain and update**

## What Gets Removed
The script removes CSS rules that target these global selectors:
- `html`, `body`
- `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- `p`, `a`, `button`, `input`, `textarea`, `select`
- `*`, `:before`, `:after`
- And other global element selectors

## What Gets Kept
- All `.authing-ant-*` component styles
- All keyframes and animations
- All pseudo-element styles (`::before`, `::after`)
- All component-specific functionality
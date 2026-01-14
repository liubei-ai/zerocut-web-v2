module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:vue/vue3-recommended', 'eslint-config-prettier'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
    ecmaFeatures: {
      modules: true,
      jsx: true,
    },
    requireConfigFile: false,
    parser: '@typescript-eslint/parser',
  },
  plugins: ['@typescript-eslint', 'vue', 'prettier'],
  globals: {
    defineProps: 'readonly',
    defineEmits: 'readonly',
    defineExpose: 'readonly',
    withDefaults: 'readonly',
  },
  rules: {
    'vue/require-default-prop': 0,
    'vue/multi-word-component-names': 0,
    'vue/max-attributes-per-line': ['warn', { singleline: 5 }],
    'no-constant-condition': 'off',
    'no-unused-vars': 'warn',
  },
};

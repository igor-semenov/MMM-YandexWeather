import { defineConfig } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'

export default defineConfig([
  js.configs.recommended,
  stylistic.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    ignores: ['node_modules/**', '*.md', '*.css'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
        Log: 'readonly',
        Module: 'readonly',
        moment: 'readonly',
        WeatherProvider: 'readonly',
        WeatherObject: 'readonly',
      },
    },
    rules: {
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/comma-dangle': ['error', 'only-multiline'],
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: 'always' }],
      '@stylistic/no-tabs': ['error', { allowIndentationTabs: false }],
      'no-redeclare': ['error', { builtinGlobals: false }],
      'preserve-caught-error': 'off', // Disable ESLint 10 rule - we re-throw with custom messages
    },
  },
])

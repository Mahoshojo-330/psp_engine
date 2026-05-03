import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/ui/**', '**/ui'], message: 'core/ must not import from ui/ (hexagonal boundary)' },
          { group: ['**/io/**', '**/io'], message: 'core/ must not import from io/ (hexagonal boundary)' },
        ],
      }],
    },
  },
  {
    files: ['src/schemas/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/ui/**', '**/ui'], message: 'schemas/ must not import from ui/ (hexagonal boundary)' },
        ],
      }],
    },
  },
  {
    files: ['src/io/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/ui/**', '**/ui'], message: 'io/ must not import from ui/ (hexagonal boundary)' },
        ],
      }],
    },
  },
])

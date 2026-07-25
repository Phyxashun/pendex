// FILE-PATH: eslint.config.ts

import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // Global ignores
  globalIgnores([
    '.vscode/**',
    '**/node_modules/**',
    'public/**',
    'dist/**',
    '**/*.txt',
    '**/*.pdf',
    '**/ALL/**',
    '**/ALL_REBUILT/**'
  ]),
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}', './src/types.d.ts', './src/config.d.ts'],

    extends: [js.configs.recommended, ...tseslint.configs.recommended],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: import.meta.dir,
      },
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        ...globals.node,
      },
    },

    rules: {
      // Formatting
      quotes: [
        'error',
        'single',
        { avoidEscape: true, allowTemplateLiterals: true },
      ],
      semi: ['error', 'always'],

      // Eslint
      'no-unused-vars': 'off',
      'no-useless-assignment': 'off',
      'no-control-regex': 'off',

      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': [
        'warn',
        { ignoreRestArgs: false },
      ],
    },
  }
]);

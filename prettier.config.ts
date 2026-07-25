// FILE-PATH: prettier.config.ts

import { type Config } from 'prettier';

const config: Config = {
  // Required to prevent Prettier from crashing/ignoring this file format in v3+
  plugins: ['prettier-plugin-toml'],

  arrowParens: 'avoid',
  bracketSameLine: false,
  objectWrap: 'collapse',
  bracketSpacing: true,
  semi: true,
  experimentalOperatorPosition: 'end',
  experimentalTernaries: false,
  singleQuote: true,
  jsxSingleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  singleAttributePerLine: false,
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,
  proseWrap: 'preserve',
  endOfLine: 'lf',
  insertPragma: false,
  printWidth: 80,
  requirePragma: false,
  tabWidth: 2,
  useTabs: false,
  embeddedLanguageFormatting: 'auto',

  // Strict override block targeting the configuration file
  overrides: [
    {
      files: ['*.toml', '**/config.toml', '**/presets.toml'],
      options: {
        parser: 'toml',
        trailingComma: 'none',
      },
    },
  ],
};

export default config;

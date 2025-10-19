import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import-x';
import pluginPrettier from 'eslint-plugin-prettier';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.amplify/**', '**/build/**', '**/dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  // Configuration for Node.js scripts (.mjs files)
  {
    files: ['*.mjs', '*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  // Configuration for TypeScript/React files
  {
    files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      import: pluginImport,
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      prettier: pluginPrettier,
      'react-refresh': pluginReactRefresh,
    },
    settings: {},
    rules: {
      'prettier/prettier': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
        },
      ],
    },
    ignores: ['src/*, **/dist', '**/.eslintrc.cjs'],
  },
);

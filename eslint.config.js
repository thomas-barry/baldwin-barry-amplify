import { default as eslint, default as js } from '@eslint/js';
import pluginImport from 'eslint-plugin-import-x';
import pluginPrettier from 'eslint-plugin-prettier';
import pluginReact from 'eslint-plugin-react';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.amplify/**', '**/build/**', '**/dist/**'],
  },
  js.configs.recommended,
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
    languageOptions: {
      parser: tseslint.parser,
      // parserOptions: {
      //   project: './tsconfig.json',
      //   sourceType: 'module',
      //   ecmaVersion: 2020,
      // },
    },
    plugins: {
      import: pluginImport,
      react: pluginReact,
      prettier: pluginPrettier,
      'react-refresh': pluginReactRefresh,
    },
    settings: {},
    rules: {
      'prettier/prettier': 'warn',
      'react/react-in-jsx-scope': 'off',
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

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended', 'plugin:prettier/recommended'],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: {
    react: react,
    'react-hooks': reactHooks,
    'react-refresh': reactRefresh,
    prettier: prettier,
  },
  rules: {
    ...react.configs.recommended.rules,
    ...reactHooks.configs.recommended.rules,
    'react/react-in-jsx-scope': 'off',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'prettier/prettier': 'warn',
  },
};

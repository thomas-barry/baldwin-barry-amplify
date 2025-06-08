const prettierConfig = {
  arrowParens: 'avoid',
  bracketSameLine: true,
  bracketSpacing: true,
  singleQuote: true,
  trailingComma: 'all',
  tabWidth: 2,
  useTabs: false,
  semi: true,
  printWidth: 120,
  singleAttributePerLine: true,
  jsxSingleQuote: true,
  multilineArraysWrapThreshold: 1,
  plugins: ['prettier-plugin-multiline-arrays', 'prettier-plugin-organize-imports'],
};

export default prettierConfig;

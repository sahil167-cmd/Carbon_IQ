module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    // Disallow `any` — must use explicit justification comment
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',

    // Enforce async patterns
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',

    // Naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
      { selector: 'function', format: ['camelCase'] },
      { selector: 'typeLike', format: ['PascalCase'] },
    ],

    // =========================================================================
    // CARBON ENGINE BOUNDARY RULE
    // Enforces: AI never calculates emissions. Zero LLM imports inside carbon-engine.
    // This rule fires if any file under src/modules/carbon-engine/**
    // attempts to import LangChain, OpenAI, or any AI client library.
    // =========================================================================
    'no-restricted-imports': [
      'error',
      {
        paths: [],
        patterns: [
          {
            // Applied specifically within carbon-engine module
            group: ['@langchain/*', 'langchain', 'openai', '@anthropic-ai/*'],
            // Note: ESLint's no-restricted-imports applies globally here;
            // the carbon-engine boundary is enforced by the overrides below.
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Apply stricter AI-import ban ONLY inside the carbon-engine module
      files: ['src/modules/carbon-engine/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@langchain/*', 'langchain', 'openai', '@anthropic-ai/*', 'ai', '@ai-sdk/*'],
                message:
                  '[CARBON ENGINE BOUNDARY] AI/LLM clients are STRICTLY FORBIDDEN inside src/modules/carbon-engine/**. ' +
                  'The Carbon Accounting Engine is deterministic TypeScript only. ' +
                  'See docs/TRD.md §5.1 and PRD Module 7.',
              },
            ],
          },
        ],
      },
    },
    {
      // Test files can use any
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};

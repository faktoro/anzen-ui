module.exports = {
  extends: ['../../.eslintrc.js'],

  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      rules: {
        'jsdoc/require-jsdoc': 0,
        '@typescript-eslint/no-unused-vars': 0,
        'prettier/prettier': 0,
        '@typescript-eslint/ban-ts-comment': 0,
        '@typescript-eslint/no-shadow': 0,
        'import/order': 0,
        'import/no-unassigned-import': 0,
      },
    },
  ],

  ignorePatterns: ['!.eslintrc.js', 'build/'],
};

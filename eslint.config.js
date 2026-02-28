import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**', '**/*.config.js'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      'import/no-mutable-exports': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/no-deprecated-slot-attribute': 'off',
    },
  }
)

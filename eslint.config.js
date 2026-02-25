import antfu from '@antfu/eslint-config'

export default antfu({
  files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  ignores: ['**/dist/**', '**/build/**', '**/node_modules/**', '**/*.config.js'],
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off',
  },
})

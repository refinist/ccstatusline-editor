import { refinist } from '@refinist/eslint-config';

export default refinist(
  {},
  {
    rules: {
      'no-console': 'off'
    }
  },
  {
    // The yml parser surfaces YAML `#` comments as block-comment tokens, so
    // @stylistic/spaced-comment's `balanced` check demands a closing `*/`
    // that YAML comments can never have — every commented yml file errors.
    files: ['**/*.yml', '**/*.yaml'],
    rules: {
      '@stylistic/spaced-comment': 'off'
    }
  }
);

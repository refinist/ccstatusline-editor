import { describe, expect, it } from 'vitest';
import { CONFIG_VERSION, type Widget } from '@/widgets';
import { isHidden, migrateConfig, toggleHideState } from '@/widgets/hideStates';

const item = (partial: Partial<Widget> & { type: string }): Widget => ({
  id: 'w',
  ...partial
});

describe('v3 → v4 hide migration', () => {
  it('folds hideNoGit into metadata.hide and bumps the version', () => {
    const next = migrateConfig({
      version: 3,
      lines: [
        [
          item({
            type: 'git-branch',
            metadata: { hideNoGit: 'true', linkToRepo: 'true' }
          })
        ]
      ]
    });
    expect(next.version).toBe(CONFIG_VERSION);
    expect(next.lines?.[0]?.[0]?.metadata).toEqual({
      hide: 'no-git',
      linkToRepo: 'true'
    });
  });

  it('keeps git ahead/behind zero-hidden by default when enabling another state', () => {
    const next = migrateConfig({
      version: 3,
      lines: [
        [
          item({
            type: 'git-ahead-behind',
            metadata: { hideNoGit: 'true' }
          })
        ]
      ]
    });
    expect(next.lines?.[0]?.[0]?.metadata?.hide).toBe(
      'no-git,no-upstream,zero'
    );
  });

  it('leaves a current-schema config untouched', () => {
    const config = {
      version: CONFIG_VERSION,
      lines: [[item({ type: 'model' })]]
    };
    expect(migrateConfig(config)).toBe(config);
  });

  it('omits metadata.hide when the enabled set matches the defaults', () => {
    const ahead = item({ type: 'git-ahead-behind' });
    expect(isHidden(ahead, 'zero', true)).toBe(true);
    const toggled = toggleHideState(ahead, 'zero', false);
    expect(toggled.metadata?.hide).toBe('');
    const restored = toggleHideState(toggled, 'zero', true);
    expect(restored.metadata).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { appVersion, versionPrefix } from '@/lib/appVersion';
import { version as packageVersion } from '../../package.json';

describe('appVersion', () => {
  it('uses the version prefix from package.json', () => {
    expect(appVersion).toBe(versionPrefix(packageVersion));
  });

  it('removes the ccse prerelease suffix', () => {
    expect(versionPrefix('2.2.24-ccse.1')).toBe('2.2.24');
  });

  it('keeps a stable version unchanged', () => {
    expect(versionPrefix('2.2.24')).toBe('2.2.24');
  });
});

import { version as packageVersion } from '../../package.json';

export function versionPrefix(version: string): string {
  return version.split('-', 1)[0] || version;
}

export const appVersion = versionPrefix(packageVersion);

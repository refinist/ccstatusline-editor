import type { CcStatusConfig } from '@/widgets';

export interface Template {
  id: string;
  /** GitHub username — rendered as an @handle linking to github.com/<author>. */
  author: string;
  config: CcStatusConfig;
}

// Starter presets shown on the /templates page (deliberately varied line counts,
// so the masonry grid actually staggers). Names/descriptions live in i18n under
// `templates.items.<id>.name` / `.desc`.
export const TEMPLATES: Template[] = [
  {
    // The author's actual daily-driver ccstatusline config (~/.config/ccstatusline/settings.json):
    // cwd + git + node version on line 1, model/thinking/context on line 2, usage/reset timers on line 3.
    id: 'daily-driver',
    author: 'refinist',
    config: {
      version: 3,
      lines: [
        [
          {
            id: '7a0f430e-12bc-40b1-9867-4d6b702c9b0f',
            type: 'current-working-dir',
            color: 'gradient:atlas',
            rawValue: true,
            metadata: { abbreviateHome: 'true' }
          },
          { id: '3231b940-9ead-4135-92f0-f05f6afaf7a0', type: 'separator' },
          { id: 'd8793076-ef92-49aa-b860-77a60d3c71bc', type: 'git-branch' },
          { id: 'e19cdfe2-79a4-47b4-a589-8be36b33673d', type: 'separator' },
          { id: 'c402c97e-41be-4fee-a94d-115e75195760', type: 'git-changes' },
          { id: 'ef030b95-f7f1-4c5d-8679-790e403a4677', type: 'separator' },
          {
            id: '40cdc389-0b23-4a65-964c-852a6473bf5c',
            type: 'custom-command',
            commandPath: 'echo "⬢ $(node -v)"',
            color: 'gradient:cristal'
          }
        ],
        [
          { id: 'dd-1', type: 'model', bold: true, rawValue: true },
          { id: '9fd5eb5a-4c9d-4b69-b6f5-92c664f73f5e', type: 'separator' },
          {
            id: 'cf22d4a8-304c-47e8-b766-86f32b26173b',
            type: 'thinking-effort',
            bold: true,
            rawValue: true
          },
          { id: '8419e77e-9474-46b8-aab4-3f56987bde8c', type: 'separator' },
          {
            id: '438001f2-59df-4a40-971b-5531309d05b2',
            type: 'context-bar',
            bold: false,
            rawValue: true,
            metadata: { display: 'progress-short' }
          },
          { id: '1111c67b-92ec-4562-9067-6e8365b012d8', type: 'separator' },
          {
            id: '94824f3e-e7b0-4c63-b065-18108b4fdb5e',
            type: 'tokens-input',
            rawValue: false
          },
          { id: '077404c1-f7a9-4598-a19d-307170a286a0', type: 'separator' },
          {
            id: '76ee57f5-0426-4c0d-b4e5-71188baa45b3',
            type: 'tokens-cached',
            rawValue: false
          },
          { id: '2a2832ac-4ed3-4255-a46f-730be96841ab', type: 'separator' },
          {
            id: '013f2328-96aa-48c4-aefa-7243cd9d97b4',
            type: 'tokens-output',
            rawValue: false
          }
        ],
        [
          {
            id: 'e3d5f4de-0905-474a-b117-a0f7f4fd7b41',
            type: 'session-usage',
            rawValue: false,
            metadata: { display: 'progress-short', cursor: 'true' }
          },
          { id: 'c91c50f6-e35f-44f0-a66c-b93f3e74f0ab', type: 'separator' },
          {
            id: '259a5f5a-8354-4331-9918-5472dfcfa963',
            type: 'reset-timer',
            rawValue: true,
            metadata: { display: 'time', compact: 'true' }
          },
          { id: 'bb61a59b-8453-4955-b6c1-48ca61209e22', type: 'separator' },
          {
            id: '013869b1-f68e-423f-adbf-624add611280',
            type: 'weekly-usage',
            rawValue: false,
            metadata: { display: 'progress-short', cursor: 'true' }
          },
          { id: '63cdb1b2-aac2-48d6-b251-473f017fb1ab', type: 'separator' },
          {
            id: '4932c6ee-bc58-4240-8bb5-2087e516e4be',
            type: 'weekly-reset-timer',
            rawValue: true,
            metadata: { absolute: 'false', weekday: 'false', compact: 'true' }
          }
        ]
      ],
      flexMode: 'full',
      compactThreshold: 60,
      colorLevel: 2,
      inheritSeparatorColors: false,
      globalBold: false,
      gitCacheTtlSeconds: 5,
      minimalistMode: false,
      defaultPaddingSide: 'both',
      powerline: {
        enabled: false,
        separators: [''],
        separatorInvertBackground: [false],
        startCaps: [],
        endCaps: [],
        autoAlign: false,
        continueThemeAcrossLines: false
      }
    }
  },
  {
    // The powerline-styled sibling of the daily driver above: same three lines
    // (cwd/git/node version · model/thinking/context · usage/reset countdowns),
    // just segmented into powerline blocks (Nord Aurora theme) instead of
    // separator glyphs — manual separators drop out since the two are
    // mutually exclusive.
    id: 'daily-driver-powerline',
    author: 'refinist',
    config: {
      version: 3,
      lines: [
        [
          {
            id: '7a0f430e-12bc-40b1-9867-4d6b702c9b0f',
            type: 'current-working-dir',
            color: 'gradient:atlas',
            rawValue: true,
            metadata: { abbreviateHome: 'true' }
          },
          { id: 'd8793076-ef92-49aa-b860-77a60d3c71bc', type: 'git-branch' },
          { id: 'c402c97e-41be-4fee-a94d-115e75195760', type: 'git-changes' },
          {
            id: '40cdc389-0b23-4a65-964c-852a6473bf5c',
            type: 'custom-command',
            commandPath: 'echo "⬢ $(node -v)"',
            color: 'gradient:cristal'
          }
        ],
        [
          { id: 'dd-1', type: 'model', bold: true, rawValue: true },
          {
            id: 'cf22d4a8-304c-47e8-b766-86f32b26173b',
            type: 'thinking-effort',
            bold: true,
            rawValue: true
          },
          {
            id: '438001f2-59df-4a40-971b-5531309d05b2',
            type: 'context-bar',
            bold: false,
            rawValue: true,
            metadata: { display: 'progress-short' }
          },
          {
            id: '94824f3e-e7b0-4c63-b065-18108b4fdb5e',
            type: 'tokens-input',
            rawValue: false
          },
          {
            id: '76ee57f5-0426-4c0d-b4e5-71188baa45b3',
            type: 'tokens-cached',
            rawValue: false
          },
          {
            id: '013f2328-96aa-48c4-aefa-7243cd9d97b4',
            type: 'tokens-output',
            rawValue: false
          }
        ],
        [
          {
            id: 'e3d5f4de-0905-474a-b117-a0f7f4fd7b41',
            type: 'session-usage',
            rawValue: false,
            metadata: { display: 'progress-short', cursor: 'true' }
          },
          {
            id: '259a5f5a-8354-4331-9918-5472dfcfa963',
            type: 'reset-timer',
            rawValue: true,
            metadata: { display: 'time', compact: 'true' }
          },
          {
            id: '013869b1-f68e-423f-adbf-624add611280',
            type: 'weekly-usage',
            rawValue: false,
            metadata: { display: 'progress-short', cursor: 'true' }
          },
          {
            id: '4932c6ee-bc58-4240-8bb5-2087e516e4be',
            type: 'weekly-reset-timer',
            rawValue: true,
            metadata: { absolute: 'false', weekday: 'false', compact: 'true' }
          }
        ]
      ],
      flexMode: 'full',
      compactThreshold: 60,
      colorLevel: 2,
      inheritSeparatorColors: false,
      globalBold: false,
      gitCacheTtlSeconds: 5,
      minimalistMode: false,
      defaultPadding: ' ',
      defaultPaddingSide: 'both',
      powerline: {
        enabled: true,
        separators: [''],
        separatorInvertBackground: [false],
        startCaps: [''],
        endCaps: [''],
        autoAlign: false,
        continueThemeAcrossLines: false,
        theme: 'nord-aurora'
      }
    }
  }
];

import { describe, expect, it } from 'vitest';
import { previewText } from '@/preview/previewText';
import type { Widget } from '@/widgets';

const w = (type: string, extra: Partial<Widget> = {}): Widget => ({
  id: 'test-id',
  type,
  ...extra
});

describe('previewText — labeled family (LABELED)', () => {
  it('has a label prefix by default', () => {
    expect(previewText(w('model'))).toBe('Model: Claude');
    expect(previewText(w('session-cost'))).toBe('Cost: $2.45');
  });
  it('rawValue strips the label, leaving only the value', () => {
    expect(previewText(w('model', { rawValue: true }))).toBe('Claude');
  });
});

describe('previewText — separator', () => {
  it('common separators get padded with spaces per ccstatusline rules', () => {
    expect(previewText(w('separator'))).toBe(' | '); // default |
    expect(previewText(w('separator', { character: ',' }))).toBe(', ');
    expect(previewText(w('separator', { character: '-' }))).toBe(' - ');
  });
  it('other characters are returned as-is', () => {
    expect(previewText(w('separator', { character: '#' }))).toBe('#');
  });
});

describe('previewText — symbol-prefixed family (PREFIXED)', () => {
  it('has a symbol prefix by default', () => {
    expect(previewText(w('git-branch'))).toBe('⎇ main');
  });
  it('raw strips the symbol', () => {
    expect(previewText(w('git-branch', { rawValue: true }))).toBe('main');
  });
  it('character overrides the symbol; an empty string omits it along with the space', () => {
    expect(previewText(w('git-branch', { character: 'B' }))).toBe('B main');
    expect(previewText(w('git-branch', { character: '' }))).toBe('main');
  });
});

describe('previewText — flag family (FLAG_SYMBOL)', () => {
  it('default symbol / raw shows true', () => {
    expect(previewText(w('git-staged'))).toBe('+');
    expect(previewText(w('git-staged', { rawValue: true }))).toBe('true');
  });
});

describe('previewText — speed family (SPEED)', () => {
  it('without a window uses the session average; with a window uses the windowed value', () => {
    expect(previewText(w('input-speed'))).toBe('In: 85.2 t/s');
    expect(
      previewText(w('input-speed', { metadata: { windowSeconds: '60' } }))
    ).toBe('In: 31.5 t/s');
  });
});

describe('previewText — usage percentage (USAGE_PCT)', () => {
  it('shows only the percentage by default', () => {
    expect(previewText(w('session-usage'))).toBe('Session: 20.0%');
  });
  it('slider-only mode renders a slider', () => {
    expect(
      previewText(w('session-usage', { metadata: { display: 'slider-only' } }))
    ).toBe('Session: ▓▓░░░░░░░░');
  });
  it('invert flips it before rendering', () => {
    expect(
      previewText(
        w('session-usage', {
          metadata: { display: 'slider-only', invert: 'true' }
        })
      )
    ).toBe('Session: ▓▓▓▓▓▓▓▓░░');
  });
  it('invert also flips the plain percent (remaining instead of used, v2.2.23)', () => {
    expect(
      previewText(w('session-usage', { metadata: { invert: 'true' } }))
    ).toBe('Session: 80.0%');
  });
});

describe('previewText — timer family (TIMER)', () => {
  it('shows full time by default; compact shows a condensed time', () => {
    expect(previewText(w('block-timer'))).toBe('Block: 3hr 45m');
    expect(
      previewText(w('block-timer', { metadata: { compact: 'true' } }))
    ).toBe('Block: 3h45m');
  });
});

describe('previewText — working directory (cwd)', () => {
  it('shows the full path with a cwd: prefix by default', () => {
    expect(previewText(w('current-working-dir'))).toBe(
      'cwd: /Users/example/Documents/Projects/my-project'
    );
  });
  it('fishStyle abbreviates each path segment', () => {
    expect(
      previewText(w('current-working-dir', { metadata: { fishStyle: 'true' } }))
    ).toBe('cwd: ~/D/P/my-project');
  });
  it('an optional glyph prefixes the output; raw mode swaps it for the cwd: label', () => {
    expect(previewText(w('current-working-dir', { character: '📁' }))).toBe(
      '📁 cwd: /Users/example/Documents/Projects/my-project'
    );
    expect(
      previewText(w('current-working-dir', { character: '📁', rawValue: true }))
    ).toBe('📁 /Users/example/Documents/Projects/my-project');
  });
});

describe('previewText — compaction counter (v2.2.23)', () => {
  it('trigger split suffix skips zero buckets; empty reclaimed symbol collapses', () => {
    expect(
      previewText(
        w('compaction-counter', { metadata: { showTriggers: 'true' } })
      )
    ).toBe('↻ 2 (1 auto, 1 manual)');
    expect(
      previewText(
        w('compaction-counter', {
          metadata: { showReclaimed: 'true', symbolReclaimed: '' }
        })
      )
    ).toBe('↻ 2 120k');
  });
  it.each([
    ['auto', '1'],
    ['manual', '1'],
    ['unknown', '0'],
    ['reclaimed', '120k']
  ])('metric=%s renders the bare value %s', (metric, out) => {
    expect(previewText(w('compaction-counter', { metadata: { metric } }))).toBe(
      out
    );
  });
  it('metric mode ignores the composite display options', () => {
    expect(
      previewText(
        w('compaction-counter', {
          metadata: { metric: 'auto', format: 'text-and-number' }
        })
      )
    ).toBe('1');
  });
});

describe('previewText — vim-mode format switch', () => {
  it.each([
    ['letter', 'N'],
    ['word', 'NORMAL']
  ])('format=%s → %s', (format, out) => {
    expect(previewText(w('vim-mode', { metadata: { format } }))).toBe(out);
  });
});

describe('previewText — custom widgets', () => {
  it('custom-text echoes customText', () => {
    expect(previewText(w('custom-text', { customText: 'hello' }))).toBe(
      'hello'
    );
    expect(previewText(w('custom-text'))).toBe('');
  });
  it('custom-command has placeholders for both with and without a command', () => {
    expect(previewText(w('custom-command'))).toBe('[No command]');
    expect(
      previewText(w('custom-command', { commandPath: '/usr/bin/foo' }))
    ).toBe('[cmd: /usr/bin/foo]');
  });
});

describe('previewText — fallback', () => {
  it('a static widget with no options returns null (the caller falls back to the catalog default)', () => {
    expect(previewText(w('git-changes'))).toBeNull();
  });
});

describe('previewText — progress bar / slider display modes', () => {
  it('usage: progress / progress-short / slider / cursor', () => {
    expect(
      previewText(w('session-usage', { metadata: { display: 'progress' } }))
    ).toBe(`Session: [${'█'.repeat(6)}${'░'.repeat(26)}] 20.0%`);
    expect(
      previewText(
        w('session-usage', { metadata: { display: 'progress-short' } })
      )
    ).toBe(`Session: [${'█'.repeat(3)}${'░'.repeat(13)}] 20.0%`);
    expect(
      previewText(w('session-usage', { metadata: { display: 'slider' } }))
    ).toBe('Session: ▓▓░░░░░░░░ 20.0%');
    expect(
      previewText(
        w('session-usage', {
          metadata: { display: 'slider-only', cursor: 'true' }
        })
      )
    ).toBe('Session: ▓▓░░░│░░░░');
  });
  it('timer: progress uses labelBar', () => {
    expect(
      previewText(w('block-timer', { metadata: { display: 'progress' } }))
    ).toBe(`Block [${'█'.repeat(24)}${'░'.repeat(8)}] 73.9%`);
  });
  it('context-bar / context-percentage: slider and inverse', () => {
    expect(
      previewText(w('context-bar', { metadata: { display: 'slider' } }))
    ).toBe('Context: ▓▓▓░░░░░░░ 50k/200k (25%)');
    expect(
      previewText(w('context-percentage', { metadata: { display: 'slider' } }))
    ).toBe('Ctx Used: ▓░░░░░░░░░ 9.3%');
    expect(
      previewText(w('context-percentage', { metadata: { inverse: 'true' } }))
    ).toBe('Ctx Used: 90.7%');
  });
});

describe('previewText — cwd path styles', () => {
  it('home abbreviation / fish / segments combinations', () => {
    const cwd = (extra: Partial<Widget>) =>
      previewText(w('current-working-dir', extra));
    expect(cwd({})).toBe('cwd: /Users/example/Documents/Projects/my-project');
    expect(cwd({ rawValue: true })).toBe(
      '/Users/example/Documents/Projects/my-project'
    );
    expect(cwd({ metadata: { fishStyle: 'true' } })).toBe(
      'cwd: ~/D/P/my-project'
    );
    expect(cwd({ metadata: { abbreviateHome: 'true' } })).toBe(
      'cwd: ~/Documents/Projects/my-project'
    );
    expect(cwd({ metadata: { abbreviateHome: 'true', segments: '1' } })).toBe(
      'cwd: ~/.../my-project'
    );
    expect(cwd({ metadata: { abbreviateHome: 'true', segments: '2' } })).toBe(
      'cwd: ~/.../Projects/my-project'
    );
    expect(cwd({ metadata: { segments: '1' } })).toBe('cwd: .../project');
    expect(cwd({ metadata: { segments: '2' } })).toBe(
      'cwd: .../example/project'
    );
  });
});

describe('previewText — format / symbol options', () => {
  it('vim-mode: each format', () => {
    expect(previewText(w('vim-mode', { metadata: { format: 'icon' } }))).toBe(
      'v'
    );
    expect(
      previewText(w('vim-mode', { metadata: { format: 'icon-letter' } }))
    ).toBe('v N');
    expect(previewText(w('vim-mode'))).toBe('v-N');
    expect(
      previewText(
        w('vim-mode', {
          metadata: { format: 'icon-letter', nerdFont: 'true' }
        })
      )
    ).toBe(' N');
    expect(
      previewText(
        w('vim-mode', { metadata: { format: 'letter', nerdFont: 'true' } })
      )
    ).toBe('N');
    expect(
      previewText(
        w('vim-mode', { metadata: { format: 'word', nerdFont: 'true' } })
      )
    ).toBe('NORMAL');
  });
  it('voice-status preserves the selected representation in raw mode', () => {
    expect(previewText(w('voice-status'))).toBe('🎤 ◉');
    expect(
      previewText(w('voice-status', { metadata: { nerdFont: 'true' } }))
    ).toBe('');
    expect(previewText(w('voice-status', { rawValue: true }))).toBe('◉');
    expect(
      previewText(
        w('voice-status', {
          rawValue: true,
          metadata: { nerdFont: 'true' }
        })
      )
    ).toBe('');
    expect(
      previewText(w('voice-status', { metadata: { format: 'icon-text' } }))
    ).toBe('🎤 on');
    expect(
      previewText(
        w('voice-status', {
          metadata: { format: 'icon-text', nerdFont: 'true' }
        })
      )
    ).toBe(' on');
    expect(
      previewText(
        w('voice-status', {
          rawValue: true,
          metadata: { format: 'icon-text', nerdFont: 'true' }
        })
      )
    ).toBe('on');
    expect(
      previewText(w('voice-status', { metadata: { format: 'text' } }))
    ).toBe('on');
    expect(
      previewText(w('voice-status', { metadata: { format: 'word' } }))
    ).toBe('voice on');
    expect(
      previewText(
        w('voice-status', { rawValue: true, metadata: { format: 'word' } })
      )
    ).toBe('on');
  });
  it('remote-control-status supports all label and raw combinations', () => {
    expect(previewText(w('remote-control-status'))).toBe('📡 ◉');
    expect(
      previewText(
        w('remote-control-status', { metadata: { nerdFont: 'true' } })
      )
    ).toBe('');
    expect(previewText(w('remote-control-status', { rawValue: true }))).toBe(
      '◉'
    );
    expect(
      previewText(
        w('remote-control-status', {
          rawValue: true,
          metadata: { format: 'icon-text', nerdFont: 'true' }
        })
      )
    ).toBe('on');
    expect(
      previewText(w('remote-control-status', { metadata: { format: 'word' } }))
    ).toBe('remote on');
    expect(
      previewText(
        w('remote-control-status', { metadata: { format: 'label-check' } })
      )
    ).toBe('remote ✅');
    expect(
      previewText(
        w('remote-control-status', {
          rawValue: true,
          metadata: { format: 'label-check' }
        })
      )
    ).toBe('✅');
    expect(
      previewText(
        w('remote-control-status', { metadata: { format: 'label-mark' } })
      )
    ).toBe('remote ✓');
    expect(
      previewText(
        w('remote-control-status', {
          rawValue: true,
          metadata: { format: 'label-mark' }
        })
      )
    ).toBe('✓');
  });
  it('skills: each mode', () => {
    expect(previewText(w('skills'))).toBe('Skill: commit');
    expect(previewText(w('skills', { metadata: { mode: 'count' } }))).toBe(
      'Skills: 5'
    );
    expect(previewText(w('skills', { metadata: { mode: 'list' } }))).toBe(
      'Skills: commit, review-pr'
    );
    expect(
      previewText(w('skills', { rawValue: true, metadata: { mode: 'count' } }))
    ).toBe('5');
  });
  it('compaction-counter: each format and reclaimed amount', () => {
    expect(previewText(w('compaction-counter'))).toBe('↻ 2');
    expect(
      previewText(w('compaction-counter', { metadata: { format: 'number' } }))
    ).toBe('2');
    expect(
      previewText(
        w('compaction-counter', { metadata: { format: 'text-and-number' } })
      )
    ).toBe('Compactions: 2');
    // Reclaimed falls back to the ↓ default symbol (RECLAIMED_SLOT).
    expect(
      previewText(
        w('compaction-counter', { metadata: { showReclaimed: 'true' } })
      )
    ).toBe('↻ 2 ↓120k');
  });
  it('git-ahead-behind / git-status: custom symbols', () => {
    expect(previewText(w('git-ahead-behind'))).toBe('↑2↓3');
    expect(previewText(w('git-ahead-behind', { rawValue: true }))).toBe('2,3');
    expect(
      previewText(
        w('git-ahead-behind', {
          metadata: { symbolAhead: '»', symbolBehind: '«' }
        })
      )
    ).toBe('»2«3');
    expect(previewText(w('git-status'))).toBe('+*');
    expect(
      previewText(
        w('git-status', {
          metadata: { symbolStaged: 'S', symbolUnstaged: 'U' }
        })
      )
    ).toBe('SU');
  });
  it('git-review: hide switches', () => {
    expect(previewText(w('git-review'))).toBe('PR #42 OPEN Example PR title');
    expect(
      previewText(w('git-review', { metadata: { hideStatus: 'true' } }))
    ).toBe('PR #42 Example PR title');
    expect(
      previewText(w('git-review', { metadata: { hideTitle: 'true' } }))
    ).toBe('PR #42 OPEN');
    expect(
      previewText(
        w('git-review', { metadata: { hideStatus: 'true', hideTitle: 'true' } })
      )
    ).toBe('PR #42');
  });
  it('git-origin-owner-repo shows only owner when it is a fork', () => {
    expect(previewText(w('git-origin-owner-repo'))).toBe('owner/repo');
    expect(
      previewText(
        w('git-origin-owner-repo', { metadata: { ownerOnlyWhenFork: 'true' } })
      )
    ).toBe('owner');
  });
  it('link with custom text', () => {
    expect(previewText(w('link'))).toBe('🔗 no url');
    expect(previewText(w('link', { metadata: { text: 'Docs' } }))).toBe(
      '🔗 Docs'
    );
    expect(
      previewText(w('link', { rawValue: true, metadata: { text: 'Docs' } }))
    ).toBe('Docs');
  });
  it('PREFIXED: jj-bookmarks symbol override and raw', () => {
    expect(previewText(w('jj-bookmarks'))).toBe('🔖 main');
    expect(previewText(w('jj-bookmarks', { rawValue: true }))).toBe('main');
    expect(previewText(w('jj-bookmarks', { character: '@' }))).toBe('@ main');
  });
});

describe('previewText — ccstatusline v2.2.24 widgets', () => {
  it('git-ci-status renders the check rollup or raw state', () => {
    expect(previewText(w('git-ci-status'))).toBe('✗1 ●1 ✓5');
    expect(previewText(w('git-ci-status', { rawValue: true }))).toBe('failing');
  });

  it('sandbox-status supports every format, Nerd Font, and raw value', () => {
    expect(previewText(w('sandbox-status'))).toBe('SB: ●');
    expect(
      previewText(w('sandbox-status', { metadata: { nerdFont: 'true' } }))
    ).toBe('SB: ');
    expect(
      previewText(w('sandbox-status', { metadata: { format: 'text' } }))
    ).toBe('SB: ON');
    expect(
      previewText(w('sandbox-status', { metadata: { format: 'word' } }))
    ).toBe('Sandbox: ON');
    expect(previewText(w('sandbox-status', { rawValue: true }))).toBe('●');
  });

  it('cache-timer supports raw value and custom or blank fresh glyphs', () => {
    expect(previewText(w('cache-timer'))).toBe('Cache: 🟢 4:52');
    expect(previewText(w('cache-timer', { rawValue: true }))).toBe('🟢 4:52');
    expect(
      previewText(w('cache-timer', { metadata: { symbolFresh: '#' } }))
    ).toBe('Cache: # 4:52');
    expect(
      previewText(w('cache-timer', { metadata: { symbolFresh: '' } }))
    ).toBe('Cache: 4:52');
  });
});

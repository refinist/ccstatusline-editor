import { describe, expect, it } from 'vitest';
import { renderWidget } from '@/preview/renderers';
import { WIDGETS } from '@/widgets';

// Golden-master check: with default options, the joined text from renderWidget
// (preview mode) should equal the exact preview value stored in the catalog.
// This ties previewText + renderers + the widget catalog together in one
// regression — any drift in a default output fails here immediately.
//
// A few widgets' default editor rendering intentionally differs from the
// catalog's "bare default value"; listed separately below:
const RENDER_OVERRIDES: Record<string, string> = {
  separator: ' | ', // formatSeparator pads both sides of | with spaces
  'git-worktree': '𖠰 main', // previewText adds a symbol prefix by default; the catalog stores the bare value
  'jj-revision': ' kkmpptxz', // previewText adds a leading space by default
  'custom-text': 'custom-text', // when empty, editor mode falls back to showing the type as a placeholder
  'custom-symbol': 'custom-symbol' // same as above
};

describe('all-widget default rendering × catalog golden-master comparison', () => {
  it.each(WIDGETS.map(m => m.type))(
    '%s default rendering matches the golden master',
    type => {
      const meta = WIDGETS.find(m => m.type === type)!;
      const text = renderWidget({ id: 'x', type }, 'preview')
        .map(t => t.text)
        .join('');
      expect(text).toBe(RENDER_OVERRIDES[type] ?? meta.preview);
    }
  );

  it('no duplicate type in the catalog', () => {
    const types = WIDGETS.map(m => m.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('mirrors all 88 widgets in ccstatusline v2.2.24', () => {
    expect(WIDGETS).toHaveLength(88);
  });
});

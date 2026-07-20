import { describe, expect, it } from 'vitest';
import { createSSRApp } from 'vue';
import { createI18n } from 'vue-i18n';
import { renderToString } from 'vue/server-renderer';
import TerminalPreview from '@/components/TerminalPreview.vue';
import en from '@/i18n/locales/en';
import { emptyConfig } from '@/widgets';

// SSR smoke test: renders the powerline preview all the way from config to real DOM
// markup (inline color styles + SVG arrow shapes), ensuring the component's wiring
// isn't broken at the template layer.
// TerminalPreview uses useI18n internally for empty-state copy, so SSR rendering needs
// the i18n plugin installed.
function renderPreview(cfg: ReturnType<typeof emptyConfig>) {
  const app = createSSRApp(TerminalPreview, { config: cfg });
  app.use(createI18n({ legacy: false, locale: 'en', messages: { en } }));
  return renderToString(app);
}

const visibleText = (html: string) => html.replace(/<[^>]+>/g, '');

describe('TerminalPreview — powerline SSR smoke test', () => {
  it('renders themed color segments and SVG arrows when powerline is enabled', async () => {
    const cfg = emptyConfig();
    cfg.powerline.enabled = true;
    cfg.powerline.theme = 'nord-aurora';
    cfg.defaultPadding = ' ';
    cfg.colorLevel = 3;
    cfg.lines[0] = [
      { id: 'a', type: 'model' },
      { id: 'b', type: 'git-branch' }
    ];
    const html = await renderPreview(cfg);
    expect(html).toContain('<svg'); // arrows are drawn as SVG shapes
    expect(html).toMatch(/background-color:\s*#BF616A/i); // nord-aurora truecolor bg[0]
    expect(html).toMatch(/background-color:\s*#EBCB8B/i); // bg[1] (second segment advances into the next theme slot)
    expect(html).toContain('Model: Claude');
    expect(html).toContain('⎇ main');
  });

  it('renders start/end caps as SVG shapes with fill color matching the adjacent segment background', async () => {
    const cfg = emptyConfig();
    cfg.powerline.enabled = true;
    cfg.defaultPadding = ' ';
    cfg.colorLevel = 3;
    cfg.powerline.startCaps = ['']; // downward triangle (TUI preset)
    cfg.powerline.endCaps = ['']; // slant cut (TUI preset)
    cfg.lines[0] = [{ id: 'a', type: 'model', backgroundColor: 'hex:336699' }];
    const html = await renderPreview(cfg);
    // each cap renders one SVG path, filled with the segment background color
    expect(html.match(/<path/g)?.length).toBe(2);
    expect(html).toMatch(/fill="#336699"/);
  });

  it('falls back to the regular separator pipeline when powerline is disabled (no SVG arrows)', async () => {
    const cfg = emptyConfig();
    cfg.defaultSeparator = '|';
    cfg.lines[0] = [
      { id: 'a', type: 'model' },
      { id: 'b', type: 'git-branch' }
    ];
    const html = await renderPreview(cfg);
    expect(html).not.toContain('<svg');
    expect(html).toContain('Model: Claude');
  });
});

describe('TerminalPreview — default padding side', () => {
  it.each([
    ['both', '_Model: Claude_'],
    ['left', '_Model: Claude'],
    ['right', 'Model: Claude_']
  ] as const)(
    'applies padding to %s in standard mode',
    async (side, output) => {
      const cfg = emptyConfig();
      cfg.defaultPadding = '_';
      cfg.defaultPaddingSide = side;
      cfg.lines[0] = [{ id: 'a', type: 'model' }];

      expect(visibleText(await renderPreview(cfg))).toContain(output);
    }
  );

  it.each([
    ['both', '_+42-10_'],
    ['left', '_+42-10'],
    ['right', '+42-10_']
  ] as const)(
    'keeps only the outer %s padding around a no-padding merge group',
    async (side, output) => {
      const cfg = emptyConfig();
      cfg.defaultPadding = '_';
      cfg.defaultPaddingSide = side;
      cfg.lines[0] = [
        { id: 'a', type: 'git-insertions', merge: 'no-padding' },
        { id: 'b', type: 'git-deletions' }
      ];

      expect(visibleText(await renderPreview(cfg))).toContain(output);
    }
  );
});

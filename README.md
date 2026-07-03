<p align="center">
  <img src="public/logo.png" alt="ccstatusline editor logo" width="120" />
</p>

<h1 align="center">ccstatusline editor</h1>

<p align="center">
  <strong>English</strong> | <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  A visual editor for building
  <a href="https://github.com/sirmalloc/ccstatusline#readme">ccstatusline</a>
  configurations — drag, drop, preview, ship.
</p>

<p align="center">
  <a href="https://ccse.refineup.com"><strong>Try it online →</strong></a>
</p>

## What it does

This is a browser-based editor for [ccstatusline](https://github.com/sirmalloc/ccstatusline), the status line tool for Claude Code. Compose your status line here and see exactly what your terminal will render — no local install, no Nerd Font required just to preview.

- **True-to-terminal preview** — 256-color / truecolor and powerline arrows are drawn as SVG in the browser, matching what your terminal will actually show.
- **Point-and-click widgets** — git status, model, context usage, quota countdowns, custom text, and more, all configured through the UI.
- **Templates** — ready-made status lines you can apply in one click, then tweak.
- **Share links** — send a link that reopens the editor with your exact config loaded.
- **Round-trip editing** — apply a config from the editor via the companion `ccsa` CLI, pull it back later with `ccsa export`, and keep refining.
- **i18n** — English, 简体中文, 繁體中文.

## Getting started

```bash
pnpm install
pnpm dev            # frontend dev server (http://localhost:5173)
```

The share feature (`/api/share`) is backed by a Cloudflare Worker + KV. To exercise it locally, also run:

```bash
pnpm worker:dev      # Worker + local KV emulation (http://localhost:8787)
```

`pnpm dev` proxies `/api/*` to `:8787`, so running both together gives you frontend hot-reload with a working share flow.

```bash
pnpm build          # type-check + production build
pnpm lint           # eslint
pnpm test           # vitest
```

## Related projects

- [sirmalloc/ccstatusline](https://github.com/sirmalloc/ccstatusline) — the status line renderer this editor targets.
- [refinist/ccstatusline-apply](https://github.com/refinist/ccstatusline-apply) — `ccsa`, the companion CLI that writes a config generated here to `~/.config/ccstatusline/settings.json` on your machine.

## License

[MIT](./LICENSE)

Copyright (c) 2026-present, [REFINIST](https://github.com/refinist)

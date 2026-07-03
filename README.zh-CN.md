<p align="center">
  <img src="public/logo.png" alt="CCStatusline Editor logo" width="300" />
</p>

<h1 align="center">CCStatusline Editor</h1>

<p align="center">
  <a href="README.md">English</a> | <strong>简体中文</strong>
</p>

<p align="center">
  一个可视化编辑器，用来搭建
  <a href="https://github.com/sirmalloc/ccstatusline#readme">ccstatusline</a>
  的状态栏配置——拖拽、实时预览、一键生成。
</p>

<p align="center">
  <a href="https://ccse.refineup.com"><strong>在线体验 →</strong></a>
</p>

## 这是什么

这是 [ccstatusline](https://github.com/sirmalloc/ccstatusline)（Claude Code 的状态栏工具）的可视化配置编辑器。在浏览器里搭建你的状态栏，所见即所得——不需要本地安装，预览阶段也不需要装 Nerd Font。

- **终端级还原预览** —— 256 色 / 真彩色和 powerline 箭头都是用 SVG 在浏览器里绘制的，和你终端里实际渲染的效果一致。
- **点选式 widget 配置** —— git 状态、模型、上下文用量、额度倒计时、自定义文本等，全部通过界面操作。
- **模板** —— 现成的状态栏配置一键套用，再按需微调。
- **分享链接** —— 生成一个链接，别人打开后能直接加载你当前的完整配置。
- **双向编辑** —— 在编辑器里生成配置后，用配套的 `@refinist/ccsa` CLI 写入本地；之后也能用 `@refinist/ccsa export` 把当前配置读回编辑器继续改。
- **多语言** —— 英文、简体中文、繁體中文。

## 快速开始

```bash
pnpm install
# 前端开发服务器 (http://localhost:5173)
pnpm dev
```

分享功能（`/api/share`）依赖 Cloudflare Worker + KV，本地要测试它还需要额外跑：

```bash
# Worker + 本地 KV 模拟 (http://localhost:8787)
pnpm worker:dev
```

`pnpm dev` 会把 `/api/*` 代理到 `:8787`，所以两个一起跑，既有前端热更新，分享功能也能正常联调。

```bash
# 类型检查 + 生产构建
pnpm build
# eslint
pnpm lint
# vitest
pnpm test
```

## 相关项目

- [sirmalloc/ccstatusline](https://github.com/sirmalloc/ccstatusline) —— 这个编辑器生成的配置最终服务的状态栏渲染工具。
- [refinist/ccstatusline-apply](https://github.com/refinist/ccstatusline-apply) —— `@refinist/ccsa`，配套 CLI，负责把编辑器里生成的配置写入本机的 `~/.config/ccstatusline/settings.json`。

## License

[MIT](./LICENSE)

Copyright (c) 2026-present, [REFINIST](https://github.com/refinist)

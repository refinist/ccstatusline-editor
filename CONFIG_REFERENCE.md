# ccstatusline 全局配置字段参考

本文件说明 ccstatusline 导出的 `settings.json` 里所有**全局配置**字段的含义、取值与默认值，按本 editor「全局设置」弹框的分组组织（终端 / 全局覆盖 / Powerline / 性能），外加两个结构性字段。

> 列含义：**JSON 字段** = 导出 JSON 里的键；**界面** = 全局设置弹框里的中文名；**作用** = 干什么；**取值 / 默认** = 可选值与默认。

---

## 结构字段（不在 UI 里，但在 JSON 里）

| JSON 字段 | 作用                                                            | 取值                              |
| --------- | --------------------------------------------------------------- | --------------------------------- |
| `version` | 配置 schema 版本，ccstatusline 用它做兼容升级                   | 固定 `3`                          |
| `lines`   | 状态栏的每一行，每行是一组 widget（Claude Code 支持多行状态栏） | `Widget[][]`，本 editor 上限 5 行 |

---

## 终端（Terminal）—— 布局与颜色能力

| JSON 字段          | 界面       | 作用                                                                                                                            | 取值 / 默认                                                                                                                                                                               |
| ------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flexMode`         | 宽度模式   | 状态栏怎么占用终端宽度、`flex-separator`（弹性分隔）怎么撑开                                                                    | `full` 用满整宽 / `full-minus-40` 预留 40 列给 Claude 的 auto-compact 提示（防止换行，默认）/ `full-until-compact` 按上下文占用百分比在「满宽 ↔ 满宽-40」间动态切换。默认 `full-minus-40` |
| `compactThreshold` | 压缩阈值 % | **仅** `full-until-compact` 时生效：**上下文占用**达到这个百分比时，从满宽切到「预留 40 列」（注意是上下文占用%，不是终端宽度） | 数字，默认 `60`                                                                                                                                                                           |
| `colorLevel`       | 色彩深度   | 终端支持的颜色档位，决定自定义颜色能不能显示                                                                                    | `0` 无（单色） / `1` 16 色 / `2` 256 色 / `3` 真彩（24-bit）。默认 `2`。**调低会让 widget 的 hex/256 自定义色失效**（加载时被重置，就是那个 ⚠ 警告）                                      |

> ✅ 这三项在 editor 的**终端预览**里都能实时看到效果：色深会把预览颜色降采样到对应档位（256/16/单色）；预览终端下方有「宽度」滑块模拟终端列数（`flex-separator` 会撑开、`full-minus-40` 会显示右侧预留的 40 列斜纹区）；选 `full-until-compact` 时还会多出一个「上下文」滑块，拖过压缩阈值就能看到从满宽切到「预留 40 列」。

---

## 全局覆盖（Global Overrides）—— 一次性改所有 widget

| JSON 字段                 | 界面           | 作用                                             | 取值 / 默认                                                                                                        |
| ------------------------- | -------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `globalBold`              | 全局加粗       | 强制所有 widget 文字加粗                         | 布尔，默认 `false`                                                                                                 |
| `minimalistMode`          | 极简模式       | 去掉每个 widget 的图标/标签/前缀，只留裸值       | 布尔，默认 `false`                                                                                                 |
| `overrideForegroundColor` | 前景覆盖       | 强制所有 widget 用同一个前景色（覆盖各自颜色）   | 颜色值（named / `ansi256:N` / `hex:RRGGBB` / 渐变），默认不设                                                      |
| `overrideBackgroundColor` | 背景覆盖       | 强制所有 widget 用同一个背景色                   | 颜色值，默认不设（powerline 开启时此项禁用）                                                                       |
| `defaultSeparator`        | 默认分隔符     | 在**相邻 widget 之间自动插入**的分隔字符串       | 字符串，默认无。**与手动「分隔符」widget、powerline 互斥**（设了会自动清掉手动分隔符，实时生效，可 ⌘/Ctrl+Z 撤销） |
| `defaultPadding`          | 默认填充符     | 给每个 widget 左右各加的填充字符串（通常是空格） | 字符串，默认无。启用 powerline 时会被自动设成一个空格                                                              |
| `inheritSeparatorColors`  | 分隔符继承颜色 | 分隔符取相邻 widget 的颜色，而不是用固定色       | 布尔，默认 `false`（powerline 开启时禁用）                                                                         |

---

## Powerline —— 带背景色块 + 箭头/圆弧的高级样式

| JSON 字段                             | 界面                | 作用                                                                                          | 取值 / 默认                                                                                                                                              |
| ------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `powerline.enabled`                   | 启用 Powerline      | 开启 powerline 模式（段之间用箭头/圆弧字形，带背景填充）                                      | 布尔，默认 `false`。**需要 Nerd Font 字体**                                                                                                              |
| `powerline.theme`                     | 主题                | 内置配色方案，或 `custom` 用各 widget 自己的颜色                                              | `custom` + 10 套内置主题：`nord` / `nord-aurora` / `monokai` / `solarized` / `minimal` / `dracula` / `catppuccin` / `gruvbox` / `onedark` / `tokyonight` |
| `powerline.separators`                | 分隔字形            | 段与段之间的字形                                                                              | 三角 ▶◀ / 圆弧 ▶◀，数组                                                                                                                                  |
| `powerline.separatorInvertBackground` | （随字形自动）      | 每个分隔符要不要反转背景（左向字形需要），和 `separators` 一一对应                            | 布尔数组                                                                                                                                                 |
| `powerline.autoAlign`                 | 跨行对齐成列        | 多行时把各行对齐成整齐的列                                                                    | 布尔，默认 `false`                                                                                                                                       |
| `powerline.continueThemeAcrossLines`  | 主题色跨行延续      | 主题配色在多行间连续推进，而不是每行从头开始                                                  | 布尔，默认 `false`                                                                                                                                       |
| `powerline.startCaps` / `endCaps`     | 行首段帽 / 行尾段帽 | 每个段组行首/行尾的装饰段帽（无 / 三角 / 圆弧 / 下三角 / 斜切，与 ccstatusline TUI 预设一致） | 数组，默认空（选「无」= 空数组，不画）                                                                                                                   |

> 预览完整渲染 powerline 外观：色块段、箭头/圆弧分隔、主题循环上色、merge 共色、autoAlign 对齐、跨行索引推进都与 ccstatusline 终端输出一致。箭头字形在预览里用 SVG 绘制，所以**浏览器里不需要 Nerd Font**；真正的终端里仍需要。

---

## 性能（Performance）

| JSON 字段            | 界面         | 作用                                                     | 取值 / 默认                                 |
| -------------------- | ------------ | -------------------------------------------------------- | ------------------------------------------- |
| `gitCacheTtlSeconds` | git 缓存(秒) | git 信息缓存多少秒，避免每次刷新都跑 git（大仓库很有用） | 数字，默认 `5`                              |
| `refreshInterval`    | 刷新间隔(秒) | Claude Code 多久重跑一次状态栏命令                       | 数字或 `null`（默认 / 由 Claude Code 决定） |

---

## 几个容易混的点

- **三种「分隔」是互斥的**：`defaultSeparator`（自动插）、手动「分隔符」widget（自己拖的）、powerline 的段分隔——所以切换时会弹确认框帮你清理。
- **`colorLevel` 是「能力上限」不是「配色」**：它只决定终端能显示多少种颜色；调低会把超出能力的自定义色抹掉。
- **`flexMode` + `compactThreshold` 是一组**：阈值只在 `full-until-compact` 下有意义。

---

## 参考：完整 JSON 形状

```jsonc
{
  "version": 3,
  "lines": [/* Widget[][] */],
  "flexMode": "full-minus-40",
  "compactThreshold": 60,
  "colorLevel": 2,
  "inheritSeparatorColors": false,
  "globalBold": false,
  "gitCacheTtlSeconds": 5,
  "minimalistMode": false,
  "defaultSeparator": undefined, // 可选
  "defaultPadding": undefined, // 可选
  "overrideForegroundColor": undefined, // 可选
  "overrideBackgroundColor": undefined, // 可选
  "refreshInterval": undefined, // 可选，数字或 null
  "powerline": {
    "enabled": false,
    "separators": [""],
    "separatorInvertBackground": [false],
    "startCaps": [],
    "endCaps": [],
    "theme": undefined, // 可选
    "autoAlign": false,
    "continueThemeAcrossLines": false
  }
}
```

> 字段定义源：`src/widgets/index.ts` 的 `CcStatusConfig` 接口与 `emptyConfig()` / `defaultConfig()`。

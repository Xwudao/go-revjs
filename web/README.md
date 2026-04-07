# react-revjs

这个项目现在包含一个内置的 JS Deob 工作台：

- Web 页面入口：`/js-deob`
- React 首页会跳转到 `src/pages/js-deob.tsx`
- 反混淆核心代码位于 `packages/js-deob/src`
- CLI 由 `tsdown` 构建，产物输出到 `packages/js-deob/dist`

## 常用命令

```bash
pnpm dev
pnpm build
pnpm build:deob
pnpm cli:js-deob -- path/to/input.js -o path/to/output-dir
```

## 目录说明

- `packages/js-deob`: 从原始 `js-deobfuscator` 迁入的核心逻辑，保留独立源码，便于后续 AI 直接修改规则和变换。
- `src/pages/js-deob.tsx`: React 版在线工作台。
- `src/pages/js-deob.worker.ts`: 浏览器端反混淆 worker，避免大段 AST 处理阻塞 UI。

## 构建策略

- `packages/js-deob` 使用 `tsdown` 构建库入口和 CLI 入口。
- Vite 页面通过别名直接消费工作区源码，而不是依赖已构建的 dist，这样改完核心逻辑后 Web 端能立即使用最新实现。
- 浏览器构建对 `isolated-vm` 和 `@babel/core` 做了空模块别名处理，避免将 Node 专属依赖带进前端包。

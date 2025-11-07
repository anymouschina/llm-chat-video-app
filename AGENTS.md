# Repository Guidelines

## Project Structure & Module Organization
- `public/` Static UI for the MVP:
  - `zh/text-to-video/` 图文生视频主页面（生成/上传/Remix、任务状态、最近生成）。
  - `zh/history/` 历史记录与“用于创建角色”模态框。
  - Shared styles in `public/home.css`.
- `src/` Cloudflare Worker for static asset serving与跳转；入口 `src/index.ts`（`/` → `/zh/text-to-video/`，保留 `/api/*` 端点）。
- `app-next/` 实验性 Next.js 脚手架（如不使用可忽略）。
- 根配置：`wrangler.jsonc`、`tsconfig.json`、`package.json`。

## Build, Test, and Development Commands
- `npm run dev` 本地开发（Wrangler），访问 `http://localhost:8787/`。
- `npm run deploy` 部署到 Cloudflare Workers。
- `npm run check` 类型检查与部署 Dry-Run。
- `npm test` 运行单测（如存在）。

示例：本地启动
`npm run dev`

## Coding Style & Naming Conventions
- 2 空格缩进、LF 结尾；JS/TS 使用 `camelCase`，类型/接口用 `PascalCase`。
- 前端模块：页面内使用小型原生模块（`app.js`/`list.js`），函数短小可测，避免全局变量泄露。
- 资源命名：目录与文件使用小写短横线（例：`text-to-video`）。
- 统一导航与布局；禁止产生横向滚动。

## Testing Guidelines
- 建议对关键数据流做最小测试：
  - 请求体构造：Remix 与上传图片互斥；`model` 固定为 `sy_8`；`inpaint_items` 最多 1 张。
  - 任务轮询：对 `progress/status` 解析与完成/失败分支。
  - 域名重写：`openai.com` → `beqlee.icu`。
- 放置位置：`src/**/*.test.ts` 或 `test/**/*.test.ts`。

## Commit & Pull Request Guidelines
- Commit 小步可回退，遵循 Conventional Commits（例：`feat(ui): add remix indicator`）。
- PR 需包含：变更描述、涉及页面/接口、截图或录屏、风险与回滚方案。
- 合并前检查：`npm run check` 通过；不提交密钥；UI 统一性（导航/标题样式/无横滚）。

## Security & Configuration Tips
- 不在前端硬编码密钥；n8n Webhook 通过可配置常量集中管理（必要时迁移到 Worker 环境变量）。
- 仅保留个人自用的最小链路：无登录、无计费、无风控。

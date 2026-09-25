# AI Copilot Extension — Modern TypeScript & Vitest Architecture

浏览器 AI 助手扩展，基于 **TypeScript**、**Vite**、**Vitest** 和 **Chrome Extension Manifest V3** 构建。已全面重构为模块化架构，消除时序竞态条件并提供 100% 单元测试覆盖。

## 🌟 核心功能

- **划词解释**：网页选中文字，通过悬浮 Icon 或右键菜单触发侧边栏解释。
- **提示词超级改写 (Prompt Sandbox)**：将简单指令结构化整理为包含角色、背景、任务、格式、语气和约束的高性能 Super Prompt。
- **邮件辅助 (Email Draft Assistant)**：自动提取 Gmail / Outlook 邮件上下文，一键生成回复草稿并自动回填 compose 编辑框。
- **Ghost Persona 写作风格拟合**：分析个人写作样本，提取 Tone、Length 和 Key Traits 风格偏好用于后续生成。
- **多模型支持**：支持 Google Gemini REST API、OpenAI 兼容接口以及 Chrome Built-in AI (Prompt API Gemini Nano 本地模型)。

## 🛠 开发与构建

### 1. 安装依赖
```sh
npm install
```

### 2. 运行单元测试
```sh
npm test
```
包含 27 个针对 Storage、Gemini API、OpenAI API、Prompt Refiner、Style Analyzer 和 Email Adapters 的 Vitest 自动化单元测试。

### 3. 构建 Chrome 扩展
```sh
npm run build
```
将在 `dist/` 目录下打包生成最新的 Chrome Extension 文件。

### 4. 加载至 Chrome

1. 打开 Chrome 扩展管理页 `chrome://extensions`，开启开发者模式。
2. 点击“加载已解压的扩展程序”，选择 `dist` 目录（或项目根目录）。
3. 点击扩展图标打开侧边栏，在 Settings 中配置 Gemini 或 OpenAI API Key。

---

## 📁 架构与目录

详细的技术架构、重构改进与实习生开发指南请参阅 [INTERN_ADVICE.md](file:///Users/hayashikeibun/Personal/ai%20copilit/ai-copilot-extension/INTERN_ADVICE.md)。

- `src/services/`：解耦的服务层（Storage、Gemini API、OpenAI API、Local Prompt API、Prompt Refiner、Style Analyzer、Email Adapters）。
- `src/background/`：Service Worker 消息路由与 Session Queue 状态暂存（彻底解决 SidePanel 打开消息丢失问题）。
- `src/content/`：划词悬浮 Bubble 与 Gmail/Outlook 邮件适配器。
- `src/sidepanel/`：Side Panel 主界面逻辑与视图绑定。
- `tests/`：Vitest 自动化测试套件与 Chrome API Mock。

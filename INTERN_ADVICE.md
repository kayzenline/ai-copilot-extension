# AI Copilot Chrome Extension — Intern Code Review & Architecture Guide

Welcome to the **AI Copilot** project! As part of our engineering team's standard, we have overhauled and modernized this project into an enterprise-grade Chrome Extension architecture built with **TypeScript**, **Vite**, and **Vitest**.

This document serves as your complete codebase overview, code review summary of past issues, architectural guide, and testing tutorial.

---

## 1. Code Review: Original Flaws & How We Fixed Them

When auditing the initial prototype, we identified 5 major structural and runtime flaws that prevented production reliability:

### ❌ Flaw 1: Manifest & Icon Path Mismatch
- **Issue**: `manifest.json` declared `"icons": { "16": "icons/icon16.png", ... }` (plural `icons/`), but the physical folder on disk was named `icon/` (singular). This caused Chrome to fail loading the unpacked extension.
- **Fix**: Harmonized folder structure across `public/icons/`, root `icons/`, and `dist/icons/` so manifest paths match physical files 100%.

### ❌ Flaw 2: Service Worker Message Race Condition (`setTimeout` Hack)
- **Issue**: `background.js` previously called `chrome.sidePanel.open()` and executed `setTimeout(() => { chrome.runtime.sendMessage(...) }, 500)`. If the side panel took longer than 500ms to open or initialize its listeners, selected text or email thread context was dropped permanently.
- **Fix**: Implemented **Session Queue State Persistence** in `src/services/storage.ts` using `chrome.storage.session`. When a context menu item or bubble is clicked, payload state is written to storage before opening the sidepanel. The sidepanel consumes queued state immediately on mount.

### ❌ Flaw 3: Monolithic Scripting & Lack of Type Safety
- **Issue**: `sidepanel.js` was a 600-line monolithic file mixing DOM handlers, Chrome storage calls, REST API calls, prompt transformation, and local AI detection into a single untyped IIFE.
- **Fix**: Refactored the entire project into a clean, decoupled **Service Layer** with strict TypeScript interfaces (`src/types/`, `src/services/`).

### ❌ Flaw 4: Unhandled Chrome Prompt API (Local Gemini Nano) Failures
- **Issue**: Called `self.ai.languageModel` directly without checking capabilities or session state.
- **Fix**: Created `LocalPromptAPIService` (`src/services/ai/local-prompt.ts`) with robust feature detection (`window.ai?.languageModel?.capabilities()`), error boundaries, and fallback to cloud AI when local AI is unavailable.

### ❌ Flaw 5: Zero Test Coverage
- **Issue**: The project had no test framework, build tools, or unit tests.
- **Fix**: Configured **Vitest** with a custom Chrome API mock environment (`tests/setup.ts`) and built 27 automated unit tests across 7 test suites covering all core logic.

---

## 2. Project Architecture Overview

The modern project uses a **layered, service-oriented architecture**:

```
ai-copilot-extension/
├── manifest.json              # Extension Manifest V3 configuration
├── package.json               # Dependencies & scripts (TypeScript, Vite, Vitest)
├── vite.config.ts             # Vite multi-entry build config for extension scripts
├── vitest.config.ts           # Vitest unit test runner config
├── public/                    # Static assets
│   └── icons/                 # Extension icons (16px, 48px, 128px)
├── src/
│   ├── types/                 # Type Definitions
│   │   ├── extension.ts       # Storage schema, message types, session queue
│   │   ├── ai.ts              # Provider specs, call options, API body schemas
│   │   └── email.ts           # Email thread context & adapter interfaces
│   ├── services/              # Business Logic & Service Layer
│   │   ├── storage.ts         # Type-safe Chrome Storage manager
│   │   ├── ai/
│   │   │   ├── gemini.ts      # Gemini API client with URL normalization
│   │   │   ├── openai.ts      # OpenAI compatible REST API client
│   │   │   ├── local-prompt.ts# Chrome Built-in AI / Prompt API adapter
│   │   │   ├── provider-factory.ts # Unified AI dispatcher & fallback manager
│   │   │   ├── prompt-refiner.ts  # Super Prompt transformation engine
│   │   │   └── style-analyzer.ts  # Ghost Persona style extractor
│   │   └── email/
│   │       ├── gmail-adapter.ts   # Gmail DOM scraper & draft injector
│   │       ├── outlook-adapter.ts # Outlook DOM scraper & draft injector
│   │       └── email-service.ts   # Email platform factory
│   ├── background/
│   │   └── background.ts      # Service Worker & background message router
│   ├── content/
│   │   ├── bubble.ts          # Floating selection bubble content script
│   │   └── email.ts           # Gmail/Outlook email content script
│   ├── sidepanel/
│   │   └── sidepanel.ts       # Side panel UI controller & event binder
│   └── styles/                # Modular CSS styles
│       ├── sidepanel.css
│       ├── content-bubble.css
│       └── content-email.css
└── tests/                     # Vitest Test Suite
    ├── setup.ts               # Chrome API mocks & global test environment
    └── services/
        ├── storage.test.ts
        ├── gemini.test.ts
        ├── openai.test.ts
        ├── local-prompt.test.ts
        ├── prompt-refiner.test.ts
        ├── style-analyzer.test.ts
        └── email-service.test.ts
```

---

### Continuous Integration (CI)

The repository includes a GitHub Actions pipeline (`.github/workflows/ci.yml`) that runs automatically on every `push` and `pull_request` to `main`/`master`:

1. **Type Checking**: Runs `npm run check` (`tsc --noEmit`) to verify zero TypeScript errors.
2. **Automated Testing**: Runs `npm test` via Vitest.
3. **Extension Bundling**: Runs `npm run build` via Vite.
4. **Build Verification**: Ensures `dist/manifest.json`, `dist/sidepanel.html`, and `dist/background.js` exist.
5. **Release Packaging**: Zips the production extension into `ai-copilot-extension.zip` and uploads it as a build artifact.

### Testing the Extension in Chrome

1. Run `npm run build` to generate the production build in the `dist/` directory.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `dist/` folder (or repository root).
5. Test side panel, floating selection bubble, prompt sandbox, and email draft insertion!

---

## 4. Advice & Best Practices for Future Features

1. **Always Keep Services Decoupled**:
   When adding a new AI provider (e.g. Anthropic Claude or Ollama local API), create a new service under `src/services/ai/` and register it in `AIServiceFactory`. Never write fetch logic inside DOM code!

2. **Always Write Unit Tests**:
   Whenever you add or modify a service, add corresponding unit tests in `tests/services/`. Run `npm test` before submitting pull requests.

3. **Handle Email DOM Changes Defensively**:
   Gmail and Outlook frequently update their DOM class names. Keep DOM selectors isolated within `selectors` arrays inside `GmailAdapter` and `OutlookAdapter`.

4. **Sanitize HTML & Prevent XSS**:
   When rendering model outputs in the DOM, use text assignment (`textContent`) or html-escaping (like `PromptRefiningService.highlightVariables`). Never insert raw unsanitized user HTML!

Good luck with your internship! Reach out if you have any questions.

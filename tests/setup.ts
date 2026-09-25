import { vi } from 'vitest';

// Create a robust Chrome API Mock
const localStorageMock: Record<string, unknown> = {};
const sessionStorageMock: Record<string, unknown> = {};

const chromeMock = {
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        const result: Record<string, unknown> = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          if (k in localStorageMock) {
            result[k] = localStorageMock[k];
          }
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: vi.fn((items, callback) => {
        Object.assign(localStorageMock, items);
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: vi.fn((keys, callback) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          delete localStorageMock[k];
        }
        if (callback) callback();
        return Promise.resolve();
      }),
      clear: vi.fn((callback) => {
        for (const k of Object.keys(localStorageMock)) {
          delete localStorageMock[k];
        }
        if (callback) callback();
        return Promise.resolve();
      }),
    },
    session: {
      get: vi.fn((keys, callback) => {
        const result: Record<string, unknown> = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          if (k in sessionStorageMock) {
            result[k] = sessionStorageMock[k];
          }
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: vi.fn((items, callback) => {
        Object.assign(sessionStorageMock, items);
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: vi.fn((keys, callback) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          delete sessionStorageMock[k];
        }
        if (callback) callback();
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: { addListener: vi.fn() },
  },
  sidePanel: {
    open: vi.fn().mockResolvedValue(undefined),
  },
  action: {
    onClicked: { addListener: vi.fn() },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
};

(globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(localStorageMock)) delete localStorageMock[k];
  for (const k of Object.keys(sessionStorageMock)) delete sessionStorageMock[k];
});

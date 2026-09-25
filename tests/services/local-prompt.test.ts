import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalPromptAPIService } from '../../src/services/ai/local-prompt';

describe('LocalPromptAPIService', () => {
  beforeEach(() => {
    LocalPromptAPIService.resetSession();
    if (globalThis.window) {
      delete (globalThis.window as { ai?: unknown }).ai;
    }
  });

  it('should report unavailable when window.ai is not present', async () => {
    const status = await LocalPromptAPIService.isAvailable();
    expect(status.available).toBe(false);
    expect(status.reason).toContain('not found');
  });

  it('should report available when capabilities return readily', async () => {
    // @ts-expect-error mock window.ai
    globalThis.window = {
      ai: {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue({
            prompt: vi.fn().mockResolvedValue('Local model response'),
          }),
        },
      },
    };

    const status = await LocalPromptAPIService.isAvailable();
    expect(status.available).toBe(true);

    const result = await LocalPromptAPIService.prompt('sys', 'user request');
    expect(result).toBe('Local model response');
  });
});

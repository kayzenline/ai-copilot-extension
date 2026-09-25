import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callOpenAIAPI } from '../../src/services/ai/openai';
describe('OpenAI API Service', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    it('should throw error when API key is missing', async () => {
        await expect(callOpenAIAPI('sys prompt', 'user prompt', '', 'gpt-4o-mini', '')).rejects.toThrow('API Key is required');
    });
    it('should send standard OpenAI request body and Bearer token', async () => {
        const mockResponse = {
            choices: [
                {
                    message: { content: 'OpenAI output message' },
                },
            ],
        };
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });
        const result = await callOpenAIAPI('System prompt', 'User prompt', 'sk-test-key', 'gpt-4o-mini', 'https://api.openai.com/v1/chat/completions');
        expect(result).toBe('OpenAI output message');
        expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer sk-test-key',
            },
        }));
    });
    it('should throw formatted error when model is not found (HTTP 404)', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            status: 404,
            text: async () => 'The model gpt-non-existent does not exist',
        });
        await expect(callOpenAIAPI('sys', 'user', 'sk-key', 'gpt-non-existent', '')).rejects.toThrow('Model not found (HTTP 404)');
    });
});

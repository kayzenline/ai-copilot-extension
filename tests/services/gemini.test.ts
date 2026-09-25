import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildGeminiEndpoint, callGeminiAPI } from '../../src/services/ai/gemini';

describe('Gemini API Service', () => {
  describe('buildGeminiEndpoint', () => {
    it('should build standard default endpoint when input is empty or invalid host', () => {
      const url = buildGeminiEndpoint('', 'gemini-2.5-flash');
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    });

    it('should append :generateContent if ending with /models/modelName', () => {
      const url = buildGeminiEndpoint('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro', 'gemini-2.5-pro');
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent');
    });

    it('should append model name and :generateContent if endpoint ends with /models', () => {
      const url = buildGeminiEndpoint('https://generativelanguage.googleapis.com/v1beta/models', 'gemini-2.5-flash');
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    });

    it('should return exact URL if it already contains :generateContent', () => {
      const exact = 'https://generativelanguage.googleapis.com/v1beta/models/custom:generateContent';
      expect(buildGeminiEndpoint(exact, 'custom')).toBe(exact);
    });
  });

  describe('callGeminiAPI', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    it('should throw error when API key is missing', async () => {
      await expect(
        callGeminiAPI('sys prompt', 'user prompt', '', 'gemini-2.5-flash', '')
      ).rejects.toThrow('API Key is required');
    });

    it('should send formatted request body and header to Gemini endpoint', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Gemini explanation output' }],
            },
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await callGeminiAPI(
        'System instruction',
        'User text',
        'test-key-xyz',
        'gemini-2.5-flash',
        'https://generativelanguage.googleapis.com/v1beta/models'
      );

      expect(result).toBe('Gemini explanation output');
      expect(fetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': 'test-key-xyz',
          },
        })
      );
    });

    it('should throw formatted error when API returns error status', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ error: { message: 'Invalid API key provided' } }),
      } as Response);

      await expect(
        callGeminiAPI('sys', 'user', 'bad-key', 'gemini-2.5-flash', '')
      ).rejects.toThrow('Authentication failed (HTTP 403)');
    });

    it('should throw formatted error when model is not found (HTTP 404)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Model non-existent-model not found',
      } as Response);

      await expect(
        callGeminiAPI('sys', 'user', 'valid-key', 'non-existent-model', '')
      ).rejects.toThrow('Model not found (HTTP 404)');
    });
  });
});

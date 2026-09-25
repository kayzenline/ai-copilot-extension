import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIServiceFactory } from '../../src/services/ai/provider-factory';
describe('AIServiceFactory - Configuration Precheck & Validation', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    it('should return error precheck when API key is missing', async () => {
        const res = await AIServiceFactory.validateConfiguration({
            localModeEnabled: false,
            cloudEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            cloudApiKey: '',
            cloudModel: 'gemini-2.5-flash',
        });
        expect(res.ok).toBe(false);
        expect(res.message).toContain('API Key is missing');
    });
    it('should return error precheck when Model is missing', async () => {
        const res = await AIServiceFactory.validateConfiguration({
            localModeEnabled: false,
            cloudEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            cloudApiKey: 'sk-test-key',
            cloudModel: '',
        });
        expect(res.ok).toBe(false);
        expect(res.message).toContain('Model name is missing');
    });
    it('should return success precheck when test prompt succeeds', async () => {
        const mockResponse = {
            candidates: [
                {
                    content: { parts: [{ text: 'pong' }] },
                },
            ],
        };
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });
        const res = await AIServiceFactory.validateConfiguration({
            localModeEnabled: false,
            cloudEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            cloudApiKey: 'sk-valid-key',
            cloudModel: 'gemini-2.5-flash',
        });
        expect(res.ok).toBe(true);
        expect(res.message).toContain('Connection test successful');
    });
    it('should return error precheck when server responds with HTTP 401 Authentication Failure', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            status: 401,
            text: async () => 'Unauthorized API key',
        });
        const res = await AIServiceFactory.validateConfiguration({
            localModeEnabled: false,
            cloudEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            cloudApiKey: 'sk-invalid-key',
            cloudModel: 'gemini-2.5-flash',
        });
        expect(res.ok).toBe(false);
        expect(res.message).toContain('Authentication failed');
    });
});

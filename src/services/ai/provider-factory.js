import { callGeminiAPI } from './gemini';
import { callOpenAIAPI } from './openai';
import { LocalPromptAPIService } from './local-prompt';
import { StyleAnalyzerService } from './style-analyzer';
export class AIServiceFactory {
    static getProvider(settings) {
        if (settings.localModeEnabled) {
            return 'local';
        }
        return this.getCloudProvider(settings);
    }
    static getCloudProvider(settings) {
        const endpoint = (settings.cloudEndpoint || '').toLowerCase();
        const model = (settings.cloudModel || '').toLowerCase();
        if (endpoint.includes('generativelanguage.googleapis.com') || model.startsWith('gemini-')) {
            return 'gemini';
        }
        return 'openai';
    }
    /**
     * Pre-check configuration status and test connection
     */
    static async validateConfiguration(settings) {
        const provider = this.getProvider(settings);
        if (provider === 'local') {
            const { available, reason } = await LocalPromptAPIService.isAvailable();
            if (available) {
                return { ok: true, message: 'Local Mode (Gemini Nano) is ready ✓', provider: 'local' };
            }
            return {
                ok: false,
                message: `Local Mode unavailable: ${reason || 'Prompt API not enabled in Chrome'}. Open Settings to configure Cloud API.`,
                provider: 'local',
            };
        }
        if (!settings.cloudApiKey?.trim()) {
            return {
                ok: false,
                message: 'API Key is missing. Please open Settings and enter your API Key.',
                provider,
            };
        }
        if (!settings.cloudModel?.trim()) {
            return {
                ok: false,
                message: 'Model name is missing. Please open Settings and specify a model.',
                provider,
            };
        }
        try {
            // Send lightweight ping prompt to verify API Key and Model existence
            await this.callAI('', 'ping', settings, undefined, { maxTokens: 5, forceCloud: true });
            return { ok: true, message: `Connection test successful (${provider.toUpperCase()}) ✓`, provider };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, message: msg, provider };
        }
    }
    static async callAI(systemPrompt, userPrompt, settings, styleProfile, options = {}) {
        const provider = options.forceCloud ? this.getCloudProvider(settings) : this.getProvider(settings);
        let fullSystem = systemPrompt;
        if (styleProfile) {
            const ghostSuffix = StyleAnalyzerService.buildGhostSuffix(styleProfile);
            if (ghostSuffix) {
                fullSystem = fullSystem ? `${fullSystem}\n\n${ghostSuffix}` : ghostSuffix;
            }
        }
        if (provider === 'local') {
            const { available, reason } = await LocalPromptAPIService.isAvailable();
            if (available) {
                return LocalPromptAPIService.prompt(fullSystem, userPrompt);
            }
            // Fallback to cloud provider if local is unavailable
            const fallbackProvider = this.getCloudProvider(settings);
            return this.executeCloudCall(fallbackProvider, fullSystem, userPrompt, settings, options);
        }
        return this.executeCloudCall(provider, fullSystem, userPrompt, settings, options);
    }
    static async executeCloudCall(provider, systemPrompt, userPrompt, settings, options) {
        if (provider === 'gemini') {
            return callGeminiAPI(systemPrompt, userPrompt, settings.cloudApiKey, settings.cloudModel, settings.cloudEndpoint, options);
        }
        return callOpenAIAPI(systemPrompt, userPrompt, settings.cloudApiKey, settings.cloudModel, settings.cloudEndpoint, options);
    }
}

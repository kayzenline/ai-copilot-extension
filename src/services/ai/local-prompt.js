export class LocalPromptAPIService {
    static cachedSession = null;
    static async isAvailable() {
        try {
            if (typeof window !== 'undefined' && window.ai?.languageModel) {
                const capabilities = await window.ai.languageModel.capabilities();
                if (capabilities.available === 'readily' || capabilities.available === 'after-download') {
                    return { available: true };
                }
                return { available: false, reason: `Status: ${capabilities.available}` };
            }
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { available: false, reason: msg };
        }
        return { available: false, reason: 'Chrome Prompt API not found (window.ai.languageModel)' };
    }
    static async getSession() {
        if (this.cachedSession) {
            return this.cachedSession;
        }
        if (typeof window === 'undefined' || !window.ai?.languageModel) {
            throw new Error('Chrome Prompt API is not supported in this browser version.');
        }
        this.cachedSession = await window.ai.languageModel.create();
        return this.cachedSession;
    }
    static async prompt(systemPrompt, userPrompt) {
        try {
            const session = await this.getSession();
            const combinedPrompt = systemPrompt
                ? `${systemPrompt}\n\nUser request:\n${userPrompt}`
                : userPrompt;
            return await session.prompt(combinedPrompt);
        }
        catch (err) {
            this.cachedSession = null; // reset session on failure
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`Local AI Prompt API failed: ${msg}`);
        }
    }
    static resetSession() {
        if (this.cachedSession?.destroy) {
            try {
                this.cachedSession.destroy();
            }
            catch {
                // ignore cleanup error
            }
        }
        this.cachedSession = null;
    }
}

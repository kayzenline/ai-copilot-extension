export class StyleAnalyzerService {
    static getAnalysisSystemPrompt() {
        return `You are a writing style analyst. Analyze the following text sample and extract:
1. Overall tone (e.g., "professional", "casual", "enthusiastic", "brief and direct")
2. Preferred length (e.g., "concise", "detailed", "moderate")
3. Key traits (list 3-5, e.g., "uses bullet points", "formal greetings", "includes emojis", "avoids jargon")

Respond in JSON format: {"tone": "...", "length": "...", "traits": ["...", "..."]}`;
    }
    static parseAnalysisResponse(response, fallbackSample) {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                tone: 'professional',
                length: 'concise',
                traits: ['direct communication'],
                sampleText: fallbackSample,
            };
        }
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                tone: typeof parsed.tone === 'string' ? parsed.tone : 'professional',
                length: typeof parsed.length === 'string' ? parsed.length : 'concise',
                traits: Array.isArray(parsed.traits) ? parsed.traits.map(String) : [],
                sampleText: fallbackSample,
            };
        }
        catch {
            return {
                tone: 'professional',
                length: 'concise',
                traits: [],
                sampleText: fallbackSample,
            };
        }
    }
    static buildGhostSuffix(profile) {
        if (!profile.traits.length && !profile.tone)
            return '';
        const parts = ['Write the response matching this specific writing style:'];
        if (profile.tone)
            parts.push(`Tone: ${profile.tone}`);
        if (profile.length)
            parts.push(`Length preference: ${profile.length}`);
        if (profile.traits.length)
            parts.push(`Traits: ${profile.traits.join(', ')}`);
        return parts.join('\n');
    }
}

import { describe, it, expect } from 'vitest';
import { StyleAnalyzerService } from '../../src/services/ai/style-analyzer';
describe('StyleAnalyzerService', () => {
    it('should parse valid JSON response from style analysis AI call', () => {
        const aiOutput = 'Here is the analysis: {"tone": "enthusiastic", "length": "concise", "traits": ["bullet points", "actionable"]}';
        const profile = StyleAnalyzerService.parseAnalysisResponse(aiOutput, 'sample text text');
        expect(profile.tone).toBe('enthusiastic');
        expect(profile.length).toBe('concise');
        expect(profile.traits).toEqual(['bullet points', 'actionable']);
        expect(profile.sampleText).toBe('sample text text');
    });
    it('should fallback gracefully when AI output does not contain valid JSON', () => {
        const profile = StyleAnalyzerService.parseAnalysisResponse('invalid response', 'my sample');
        expect(profile.tone).toBe('professional');
        expect(profile.length).toBe('concise');
        expect(profile.sampleText).toBe('my sample');
    });
    it('should build ghost suffix for persona prompt injection', () => {
        const suffix = StyleAnalyzerService.buildGhostSuffix({
            tone: 'formal',
            length: 'brief',
            traits: ['no fluff', 'professional sign-off'],
            sampleText: '',
        });
        expect(suffix).toContain('Tone: formal');
        expect(suffix).toContain('Length preference: brief');
        expect(suffix).toContain('Traits: no fluff, professional sign-off');
    });
});

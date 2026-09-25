import { describe, it, expect } from 'vitest';
import { EmailService } from '../../src/services/email/email-service';
describe('EmailService', () => {
    it('should detect Gmail host platform correctly', () => {
        expect(EmailService.detectPlatform('mail.google.com')).toBe('gmail');
    });
    it('should detect Outlook host platforms correctly', () => {
        expect(EmailService.detectPlatform('outlook.live.com')).toBe('outlook');
        expect(EmailService.detectPlatform('outlook.office.com')).toBe('outlook');
        expect(EmailService.detectPlatform('outlook.office365.com')).toBe('outlook');
    });
    it('should return null for non-email websites', () => {
        expect(EmailService.detectPlatform('example.com')).toBeNull();
        expect(EmailService.detectPlatform('google.com')).toBeNull();
    });
    it('should return appropriate adapter instance', () => {
        const gmailAdapter = EmailService.getAdapter('gmail');
        expect(gmailAdapter.platform).toBe('gmail');
        const outlookAdapter = EmailService.getAdapter('outlook');
        expect(outlookAdapter.platform).toBe('outlook');
    });
});

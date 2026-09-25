import { EmailAdapter, EmailPlatform } from '../../types/email';
import { GmailAdapter } from './gmail-adapter';
import { OutlookAdapter } from './outlook-adapter';

export class EmailService {
  static detectPlatform(hostname: string): EmailPlatform | null {
    const host = hostname.toLowerCase();
    if (host.includes('mail.google.com')) return 'gmail';
    if (
      host.includes('outlook.live.com') ||
      host.includes('outlook.office.com') ||
      host.includes('outlook.office365.com')
    ) {
      return 'outlook';
    }
    return null;
  }

  static getAdapter(platform: EmailPlatform): EmailAdapter {
    if (platform === 'gmail') return new GmailAdapter();
    return new OutlookAdapter();
  }
}

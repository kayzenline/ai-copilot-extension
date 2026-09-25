import { GmailAdapter } from './gmail-adapter';
import { OutlookAdapter } from './outlook-adapter';
export class EmailService {
    static detectPlatform(hostname) {
        const host = hostname.toLowerCase();
        if (host.includes('mail.google.com'))
            return 'gmail';
        if (host.includes('outlook.live.com') ||
            host.includes('outlook.office.com') ||
            host.includes('outlook.office365.com')) {
            return 'outlook';
        }
        return null;
    }
    static getAdapter(platform) {
        if (platform === 'gmail')
            return new GmailAdapter();
        return new OutlookAdapter();
    }
}

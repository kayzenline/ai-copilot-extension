export type EmailPlatform = 'gmail' | 'outlook';

export interface EmailThreadContext {
  threadText: string;
  subject: string;
  sender: string;
  platform: EmailPlatform;
}

export interface EmailSelectors {
  composeToolbar: string[];
  composeBody: string[];
  threadMessages: string[];
  senderName: string[];
  subjectLine: string[];
}

export interface EmailAdapter {
  platform: EmailPlatform;
  selectors: EmailSelectors;
  extractThreadContext(): EmailThreadContext | null;
  insertDraft(text: string): boolean;
}

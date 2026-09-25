import { EmailAdapter, EmailPlatform, EmailThreadContext } from '../../types/email';

export class OutlookAdapter implements EmailAdapter {
  readonly platform: EmailPlatform = 'outlook';

  readonly selectors = {
    composeToolbar: ['[data-testid="ComposeSendButton"]', '.ms-CommandBar'],
    composeBody: ['[role="textbox"][aria-label*="Message body"]', '[aria-label="Message body"]'],
    threadMessages: ['[data-testid="MessageBody"]', '.wide-content-host'],
    senderName: [],
    subjectLine: [],
  };

  extractThreadContext(): EmailThreadContext | null {
    if (typeof document === 'undefined') return null;

    const messages = document.querySelectorAll(this.selectors.threadMessages.join(', '));
    let threadText = '';

    messages.forEach((msg, i) => {
      const msgText = (msg as HTMLElement).innerText?.trim() || msg.textContent?.trim() || '';
      if (msgText) {
        threadText += `--- Message ${i + 1} ---\n${msgText}\n\n`;
      }
    });

    return {
      threadText: threadText.trim() || '(No thread content found)',
      subject: '',
      sender: 'Outlook User',
      platform: 'outlook',
    };
  }

  insertDraft(text: string): boolean {
    if (typeof document === 'undefined') return false;

    const composeArea = document.querySelector(this.selectors.composeBody.join(', ')) as HTMLElement | null;
    if (!composeArea) return false;

    composeArea.focus();
    if (composeArea.isContentEditable) {
      composeArea.innerHTML = text.replace(/\n/g, '<br>');
    } else if (composeArea instanceof HTMLTextAreaElement || composeArea instanceof HTMLInputElement) {
      composeArea.value = text;
    }
    composeArea.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
}

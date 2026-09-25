export class OutlookAdapter {
    platform = 'outlook';
    selectors = {
        composeToolbar: ['[data-testid="ComposeSendButton"]', '.ms-CommandBar'],
        composeBody: ['[role="textbox"][aria-label*="Message body"]', '[aria-label="Message body"]'],
        threadMessages: ['[data-testid="MessageBody"]', '.wide-content-host'],
        senderName: [],
        subjectLine: [],
    };
    extractThreadContext() {
        if (typeof document === 'undefined')
            return null;
        const messages = document.querySelectorAll(this.selectors.threadMessages.join(', '));
        let threadText = '';
        messages.forEach((msg, i) => {
            const msgText = msg.innerText?.trim() || msg.textContent?.trim() || '';
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
    insertDraft(text) {
        if (typeof document === 'undefined')
            return false;
        const composeArea = document.querySelector(this.selectors.composeBody.join(', '));
        if (!composeArea)
            return false;
        composeArea.focus();
        if (composeArea.isContentEditable) {
            composeArea.innerHTML = text.replace(/\n/g, '<br>');
        }
        else if (composeArea instanceof HTMLTextAreaElement || composeArea instanceof HTMLInputElement) {
            composeArea.value = text;
        }
        composeArea.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }
}

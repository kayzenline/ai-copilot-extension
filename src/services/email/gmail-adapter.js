export class GmailAdapter {
    platform = 'gmail';
    selectors = {
        composeToolbar: ['.btC', '.aDh'],
        composeBody: ['.Am.aiL', '[role="textbox"][aria-label*="Body"]'],
        threadMessages: ['.a3s.aiL', '[data-message-id] .a3s'],
        senderName: ['.gD'],
        subjectLine: ['.hP'],
    };
    extractThreadContext() {
        if (typeof document === 'undefined')
            return null;
        const messages = document.querySelectorAll(this.selectors.threadMessages.join(', '));
        let threadText = '';
        messages.forEach((msg, i) => {
            const fromEl = msg.closest('[data-message-id]')?.querySelector(this.selectors.senderName.join(', '));
            const senderName = fromEl?.getAttribute('name') || fromEl?.textContent?.trim() || `Sender ${i + 1}`;
            const msgText = msg.innerText?.trim() || msg.textContent?.trim() || '';
            if (msgText) {
                threadText += `--- ${senderName} ---\n${msgText}\n\n`;
            }
        });
        const subjectEl = document.querySelector(this.selectors.subjectLine.join(', '));
        const subject = subjectEl?.textContent?.trim() || 'No Subject';
        return {
            threadText: threadText.trim() || '(No thread content found)',
            subject,
            sender: 'Gmail User',
            platform: 'gmail',
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

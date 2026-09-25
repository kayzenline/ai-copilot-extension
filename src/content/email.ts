import { EmailService } from '../services/email/email-service';
import { EmailAdapter } from '../types/email';

(() => {
  'use strict';

  const INJECTED_CLASS = 'ai-copilot-injected';
  const BUTTON_ID_PREFIX = 'ai-copilot-reply-btn';
  let buttonCounter = 0;

  const platform = EmailService.detectPlatform(window.location.hostname);
  if (!platform) return;

  const adapter: EmailAdapter = EmailService.getAdapter(platform);

  function createReplyButton(): HTMLButtonElement {
    buttonCounter++;
    const btn = document.createElement('button');
    btn.id = `${BUTTON_ID_PREFIX}-${buttonCounter}`;
    btn.className = INJECTED_CLASS;
    btn.type = 'button';
    btn.title = 'Reply with AI';
    btn.setAttribute('aria-label', 'Reply with AI');

    btn.innerHTML = `
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;">
        <path d="M10 1a6 6 0 0 1 6 6c0 2-1 3.8-2.5 4.9V14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 14v-2.1C5 10.8 4 9 4 7a6 6 0 0 1 6-6z"/>
        <line x1="8" y1="18" x2="12" y2="18"/>
      </svg>
      <span>Reply with AI</span>
    `;

    return btn;
  }

  function handleReplyTrigger(): void {
    const context = adapter.extractThreadContext();
    if (!context) return;

    chrome.runtime.sendMessage({
      type: 'EMAIL_THREAD',
      threadText: context.threadText,
      subject: context.subject,
      sender: context.sender,
      platform: context.platform,
    });
  }

  function injectButton(toolbar: Element): void {
    if (toolbar.querySelector(`.${INJECTED_CLASS}`)) return;

    const btn = createReplyButton();
    btn.addEventListener('click', handleReplyTrigger);
    toolbar.appendChild(btn);
  }

  function observeDOM(): void {
    const observer = new MutationObserver(() => {
      const selectorString = adapter.selectors.composeToolbar.join(', ');
      if (!selectorString) return;

      const toolbars = document.querySelectorAll(selectorString);
      toolbars.forEach((tb) => injectButton(tb));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'INSERT_DRAFT' && typeof message.text === 'string') {
      adapter.insertDraft(message.text);
    }
  });

  observeDOM();
})();

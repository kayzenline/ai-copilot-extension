// ============================================================
// AI Copilot — Email Assistant (Content Script)
// Injects "Reply with AI" into Gmail & Outlook compose UI
// ============================================================

(() => {
  'use strict';

  const INJECTED_CLASS = 'ai-copilot-injected';
  const BUTTON_ID_PREFIX = 'ai-copilot-reply-btn';
  let buttonCounter = 0;

  // ---- Detect Platform ----
  function getPlatform() {
    const host = window.location.hostname;
    if (host.includes('mail.google.com')) return 'gmail';
    if (host.includes('outlook.live.com') || host.includes('outlook.office.com') || host.includes('outlook.office365.com')) return 'outlook';
    return null;
  }

  const platform = getPlatform();
  if (!platform) return;

  // ============================================================
  // Gmail Integration
  // ============================================================

  const GMAIL = {
    // Selectors (community-tested, may break with Gmail updates)
    composeToolbar: '.btC',            // Compose bottom toolbar area
    composeBody: '.Am.aiL',            // Compose body (contenteditable)
    replyBox: '.ip.iq',                // Inline reply compose
    sendButton: '.T-I.J-J5-Ji.aoO',   // Send button
    threadMessages: '.a3s.aiL',        // Individual message bodies
    threadContainer: '.Bs.nH',         // Thread container
    messageFrom: '.gD',               // Sender element
    subjectLine: '.hP',               // Subject line

    // Alternative selectors for newer Gmail
    altComposeToolbar: '.aDh',
    altComposeBody: '[role="textbox"][aria-label*="Body"]',
    altThreadMessages: '[data-message-id] .a3s',
  };

  function injectGmailButton(toolbar) {
    if (toolbar.querySelector(`.${INJECTED_CLASS}`)) return;

    const btn = createReplyButton();
    btn.addEventListener('click', () => handleGmailReply(toolbar));
    toolbar.appendChild(btn);
  }

  function handleGmailReply(toolbar) {
    // Find thread messages above the compose
    const threadMessages = document.querySelectorAll(
      `${GMAIL.threadMessages}, ${GMAIL.altThreadMessages}`
    );

    let threadText = '';
    threadMessages.forEach((msg, i) => {
      const from = msg.closest('[data-message-id]')?.querySelector(GMAIL.messageFrom);
      const senderName = from?.getAttribute('name') || from?.textContent || `Sender ${i + 1}`;
      threadText += `--- ${senderName} ---\n${msg.innerText.trim()}\n\n`;
    });

    // Get subject
    const subjectEl = document.querySelector(GMAIL.subjectLine);
    const subject = subjectEl?.textContent?.trim() || '';

    // Send to background for side panel
    chrome.runtime.sendMessage({
      type: 'EMAIL_THREAD',
      threadText: threadText || '(No thread text found — please paste the thread manually in the side panel)',
      subject: subject,
      sender: 'Gmail User',
      platform: 'gmail'
    });
  }

  function observeGmail() {
    const observer = new MutationObserver(() => {
      // Look for compose toolbars
      const toolbars = document.querySelectorAll(
        `${GMAIL.composeToolbar}, ${GMAIL.altComposeToolbar}`
      );
      toolbars.forEach(tb => injectGmailButton(tb));

      // Also check for compose body areas to detect inline replies
      const composeBodies = document.querySelectorAll(
        `${GMAIL.composeBody}, ${GMAIL.altComposeBody}`
      );
      composeBodies.forEach(body => {
        const container = body.closest('form') || body.closest('.iN');
        if (container) {
          const toolbar = container.querySelector(`${GMAIL.composeToolbar}, ${GMAIL.altComposeToolbar}`);
          if (toolbar) injectGmailButton(toolbar);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ============================================================
  // Outlook Integration
  // ============================================================

  const OUTLOOK = {
    composeToolbar: '[data-testid="ComposeSendButton"]',
    composeArea: '[role="textbox"][aria-label*="Message body"]',
    threadMessages: '[data-testid="MessageBody"]',
    altComposeToolbar: '.ms-CommandBar',
    altComposeArea: '[aria-label="Message body"]',
    altThreadMessages: '.wide-content-host',
  };

  function injectOutlookButton(toolbar) {
    const parent = toolbar.closest('[role="toolbar"]') || toolbar.parentElement;
    if (!parent || parent.querySelector(`.${INJECTED_CLASS}`)) return;

    const btn = createReplyButton();
    btn.style.marginLeft = '8px';
    btn.addEventListener('click', () => handleOutlookReply());
    parent.appendChild(btn);
  }

  function handleOutlookReply() {
    const threadMessages = document.querySelectorAll(
      `${OUTLOOK.threadMessages}, ${OUTLOOK.altThreadMessages}`
    );

    let threadText = '';
    threadMessages.forEach((msg, i) => {
      threadText += `--- Message ${i + 1} ---\n${msg.innerText.trim()}\n\n`;
    });

    chrome.runtime.sendMessage({
      type: 'EMAIL_THREAD',
      threadText: threadText || '(No thread text found — please paste the thread manually)',
      subject: '',
      sender: 'Outlook User',
      platform: 'outlook'
    });
  }

  function observeOutlook() {
    const observer = new MutationObserver(() => {
      const sendBtns = document.querySelectorAll(
        `${OUTLOOK.composeToolbar}, ${OUTLOOK.altComposeToolbar}`
      );
      sendBtns.forEach(el => injectOutlookButton(el));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ============================================================
  // Shared Button Creation
  // ============================================================

  function createReplyButton() {
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

  // ---- Handle INSERT_DRAFT from side panel ----
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'INSERT_DRAFT') {
      insertDraftIntoCompose(message.text);
    }
  });

  function insertDraftIntoCompose(text) {
    let composeArea = null;

    if (platform === 'gmail') {
      composeArea = document.querySelector(
        `${GMAIL.composeBody}, ${GMAIL.altComposeBody}`
      );
    } else if (platform === 'outlook') {
      composeArea = document.querySelector(
        `${OUTLOOK.composeArea}, ${OUTLOOK.altComposeArea}`
      );
    }

    if (composeArea) {
      if (composeArea.isContentEditable) {
        composeArea.focus();
        const htmlContent = text.replace(/\n/g, '<br>');
        composeArea.innerHTML = htmlContent;
        // Trigger input event for Gmail/Outlook to detect the change
        composeArea.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        composeArea.value = text;
        composeArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  // ---- Start Observation ----
  if (platform === 'gmail') {
    observeGmail();
  } else if (platform === 'outlook') {
    observeOutlook();
  }
})();

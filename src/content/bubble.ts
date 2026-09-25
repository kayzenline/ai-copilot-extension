(() => {
  'use strict';

  const BUBBLE_ID = 'ai-copilot-bubble';
  let bubble: HTMLElement | null = null;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastSelectionText = '';

  function createBubble(): HTMLElement {
    const existing = document.getElementById(BUBBLE_ID);
    if (existing) return existing;

    const el = document.createElement('div');
    el.id = BUBBLE_ID;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Ask AI about selection');
    el.title = 'Ask AI';

    el.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>
        <line x1="10" y1="22" x2="14" y2="22"/>
        <line x1="9" y1="17" x2="15" y2="17"/>
      </svg>
    `;

    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const selection = window.getSelection();
      const text = selection?.toString().trim() || lastSelectionText;
      if (!text) return;

      chrome.runtime.sendMessage({
        type: 'BUBBLE_CLICK',
        text: text,
      });

      hideBubble();
    });

    document.body.appendChild(el);
    bubble = el;
    return el;
  }

  function showBubble(rect: DOMRect): void {
    if (!bubble) createBubble();
    if (!bubble) return;

    if (hideTimeout) clearTimeout(hideTimeout);

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const bubbleSize = 36;

    let left = rect.left + scrollX + rect.width / 2 - bubbleSize / 2;
    let top = rect.top + scrollY - bubbleSize - 8;

    if (top < scrollY + 4) {
      top = rect.bottom + scrollY + 8;
    }

    left = Math.max(4, Math.min(left, document.documentElement.scrollWidth - bubbleSize - 4));

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    bubble.classList.add('visible');
  }

  function hideBubble(): void {
    if (bubble) {
      bubble.classList.remove('visible');
    }
    lastSelectionText = '';
  }

  function handleSelectionChange(): void {
    if (hideTimeout) clearTimeout(hideTimeout);

    hideTimeout = setTimeout(() => {
      const selection = window.getSelection();
      if (!selection) {
        hideBubble();
        return;
      }
      const text = selection.toString().trim();

      if (!text || text.length < 2) {
        hideBubble();
        return;
      }

      const anchorNode = selection.anchorNode;
      if (anchorNode) {
        const el = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : (anchorNode as HTMLElement);
        if (
          el &&
          (el.closest(`#${BUBBLE_ID}`) ||
            el.closest('input, textarea, [contenteditable="true"]') ||
            el.closest('.ai-copilot-injected'))
        ) {
          hideBubble();
          return;
        }
      }

      if (selection.rangeCount === 0) {
        hideBubble();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width > 0 && rect.height > 0) {
        lastSelectionText = text;
        showBubble(rect);
      }
    }, 300);
  }

  document.addEventListener('mousedown', (e) => {
    if (bubble && !bubble.contains(e.target as Node)) {
      hideBubble();
    }
  });

  document.addEventListener('mouseup', handleSelectionChange);
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim()) {
      if (hideTimeout) clearTimeout(hideTimeout);
      setTimeout(hideBubble, 200);
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'INSERT_DRAFT' && typeof message.text === 'string') {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        if (active.isContentEditable) {
          active.innerHTML = message.text.replace(/\n/g, '<br>');
        } else if (active instanceof HTMLTextAreaElement) {
          active.value = message.text;
          active.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  });
})();

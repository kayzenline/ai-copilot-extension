// ============================================================
// AI Copilot — Floating Action Bubble (Content Script)
// Injects on all pages. Shows an AI icon near text selections.
// ============================================================

(() => {
  'use strict';

  const BUBBLE_ID = 'ai-copilot-bubble';
  let bubble = null;
  let hideTimeout = null;
  let lastSelectionText = '';

  // ---- Create Bubble Element ----
  function createBubble() {
    if (document.getElementById(BUBBLE_ID)) return;

    bubble = document.createElement('div');
    bubble.id = BUBBLE_ID;
    bubble.setAttribute('role', 'button');
    bubble.setAttribute('aria-label', 'Ask AI about selection');
    bubble.title = 'Ask AI';

    // AI brain icon inline SVG
    bubble.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>
        <line x1="10" y1="22" x2="14" y2="22"/>
        <line x1="9" y1="17" x2="15" y2="17"/>
      </svg>
    `;

    // Click handler
    bubble.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const selection = window.getSelection();
      const text = selection?.toString().trim() || lastSelectionText;
      if (!text) return;

      // Send to background → opens side panel
      chrome.runtime.sendMessage({
        type: 'BUBBLE_CLICK',
        text: text
      });

      hideBubble();
    });

    document.body.appendChild(bubble);
  }

  // ---- Position & Show Bubble ----
  function showBubble(rect) {
    if (!bubble) createBubble();

    clearTimeout(hideTimeout);

    // Position above the selection, horizontally centered
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const bubbleSize = 36;

    let left = rect.left + scrollX + (rect.width / 2) - (bubbleSize / 2);
    let top = rect.top + scrollY - bubbleSize - 8;

    // If too close to top, show below
    if (top < scrollY + 4) {
      top = rect.bottom + scrollY + 8;
    }

    // Clamp horizontally
    left = Math.max(4, Math.min(left, document.documentElement.scrollWidth - bubbleSize - 4));

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    bubble.classList.add('visible');
  }

  function hideBubble() {
    if (bubble) {
      bubble.classList.remove('visible');
    }
    lastSelectionText = '';
  }

  // ---- Selection Detection ----
  function handleSelectionChange() {
    clearTimeout(hideTimeout);

    hideTimeout = setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (!text || text.length < 2) {
        hideBubble();
        return;
      }

      // Don't show bubble inside extension UI or input elements
      const anchorNode = selection.anchorNode;
      if (anchorNode) {
        const el = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
        if (el && (
          el.closest('#ai-copilot-bubble') ||
          el.closest('input, textarea, [contenteditable="true"]') ||
          el.closest('.ai-copilot-injected')
        )) {
          hideBubble();
          return;
        }
      }

      // Get selection bounding rect
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
    }, 300); // debounce
  }

  // ---- Hide on click-away ----
  document.addEventListener('mousedown', (e) => {
    if (bubble && !bubble.contains(e.target)) {
      hideBubble();
    }
  });

  // ---- Listen for selection changes ----
  document.addEventListener('mouseup', handleSelectionChange);
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim()) {
      clearTimeout(hideTimeout);
      // Delay hiding slightly to allow for bubble click
      setTimeout(hideBubble, 200);
    }
  });

  // ---- Listen for insert draft messages from side panel ----
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'INSERT_DRAFT') {
      // Try to insert into the currently focused compose area 
      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        if (active.isContentEditable) {
          // For Gmail-style contenteditable compose
          active.innerHTML = message.text.replace(/\n/g, '<br>');
        } else {
          active.value = message.text;
          active.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  });
})();

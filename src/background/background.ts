import { StorageService } from '../services/storage';
import { ExtensionMessage } from '../types/extension';

// Initialize context menu & default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  try {
    chrome.contextMenus.create({
      id: 'ask-ai',
      title: 'Ask AI — Explain "%s"',
      contexts: ['selection'],
    });
  } catch (err) {
    console.error('Context menu creation failed:', err);
  }

  // Ensure default storage values are present
  await StorageService.getSettings();
  await StorageService.getStyleProfile();
});

// Handle context menu selection
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ask-ai' && info.selectionText && tab?.id) {
    const payload = {
      type: 'SELECTION_SEARCH' as const,
      text: info.selectionText,
      sourceUrl: tab.url,
    };

    // Store payload in storage session to eliminate timing race conditions
    await StorageService.setActivePayload({ searchPayload: payload });

    // Open side panel for current tab
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (err) {
      console.error('Failed to open side panel:', err);
    }

    // Broadcast message to any active side panel listener
    chrome.runtime.sendMessage(payload).catch(() => {
      // Side panel might still be initializing — activePayload will catch it
    });
  }
});

// Action button click → open side panel
chrome.action?.onClicked?.addListener(async (tab) => {
  if (tab?.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (err) {
      console.error('Action click failed to open side panel:', err);
    }
  }
});

// Central message router
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'BUBBLE_CLICK': {
          if (!sender.tab?.id) {
            sendResponse({ success: false, error: 'No tab ID found' });
            return;
          }

          const payload = {
            type: 'SELECTION_SEARCH' as const,
            text: message.text,
            sourceUrl: sender.tab.url,
          };

          await StorageService.setActivePayload({ searchPayload: payload });
          await chrome.sidePanel.open({ tabId: sender.tab.id });

          chrome.runtime.sendMessage(payload).catch(() => {});
          sendResponse({ success: true });
          break;
        }

        case 'EMAIL_THREAD': {
          if (!sender.tab?.id) {
            sendResponse({ success: false, error: 'No tab ID found' });
            return;
          }

          const payload = {
            type: 'EMAIL_DRAFT' as const,
            threadText: message.threadText,
            subject: message.subject,
            sender: message.sender,
            sourceUrl: sender.tab.url,
            platform: message.platform,
          };

          await StorageService.setActivePayload({ emailPayload: payload });
          await chrome.sidePanel.open({ tabId: sender.tab.id });

          chrome.runtime.sendMessage(payload).catch(() => {});
          sendResponse({ success: true });
          break;
        }

        case 'UPDATE_STYLE_PROFILE': {
          await StorageService.saveStyleProfile(message.profile);
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: true });
          break;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendResponse({ success: false, error: msg });
    }
  })();

  return true; // keeps message channel open for async response
});

// ============================================================
// AI Copilot — Background Service Worker
// ============================================================

// ---- Context Menu Setup ----
chrome.runtime.onInstalled.addListener(() => {
  // Create "Ask AI" context menu for text selections
  chrome.contextMenus.create({
    id: 'ask-ai',
    title: 'Ask AI — Explain "%s"',
    contexts: ['selection']
  });

  // Initialize default settings in chrome.storage.local
  chrome.storage.local.get(['settings', 'styleProfile'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          localModeEnabled: false,
          cloudEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
          cloudApiKey: '',
          cloudModel: 'gemini-2.5-flash'
        }
      });
    }
    if (!result.styleProfile) {
      chrome.storage.local.set({
        styleProfile: {
          tone: 'professional',
          length: 'concise',
          traits: [],
          sampleText: ''
        }
      });
    }
  });
});

// ---- Context Menu Click Handler ----
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ask-ai' && info.selectionText) {
    // Open side panel for this tab
    await chrome.sidePanel.open({ tabId: tab.id });

    // Small delay to ensure side panel is ready
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'SELECTION_SEARCH',
        text: info.selectionText,
        sourceUrl: tab.url
      });
    }, 500);
  }
});

// ---- Action button click → open side panel ----
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// ---- Central Message Router ----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'BUBBLE_CLICK':
      // Floating bubble was clicked — open side panel with selected text
      (async () => {
        try {
          await chrome.sidePanel.open({ tabId: sender.tab.id });
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: 'SELECTION_SEARCH',
              text: message.text,
              sourceUrl: sender.tab.url
            });
          }, 500);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true; // keep message channel open for async

    case 'EMAIL_THREAD':
      // Email content script scraped thread → open side panel in email draft mode
      (async () => {
        try {
          await chrome.sidePanel.open({ tabId: sender.tab.id });
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: 'EMAIL_DRAFT',
              threadText: message.threadText,
              subject: message.subject,
              sender: message.sender,
              sourceUrl: sender.tab.url
            });
          }, 500);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;

    case 'UPDATE_STYLE_PROFILE':
      // Update ghost persona style profile
      chrome.storage.local.set({ styleProfile: message.profile });
      sendResponse({ success: true });
      break;

    default:
      break;
  }
});

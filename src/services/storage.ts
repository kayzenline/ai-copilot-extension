import { ExtensionSettings, StyleProfile, ActivePayloadState } from '../types/extension';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  localModeEnabled: false,
  cloudEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
  cloudApiKey: '',
  cloudModel: 'gemini-2.5-flash',
};

export const DEFAULT_STYLE_PROFILE: StyleProfile = {
  tone: 'professional',
  length: 'concise',
  traits: [],
  sampleText: '',
};

export class StorageService {
  private static isChromeStorageAvailable(): boolean {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  static async getSettings(): Promise<ExtensionSettings> {
    if (!this.isChromeStorageAvailable()) {
      return { ...DEFAULT_SETTINGS };
    }
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        resolve({ ...DEFAULT_SETTINGS, ...result.settings });
      });
    });
  }

  static async saveSettings(settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    if (this.isChromeStorageAvailable()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ settings: updated }, () => resolve());
      });
    }
    return updated;
  }

  static async getStyleProfile(): Promise<StyleProfile> {
    if (!this.isChromeStorageAvailable()) {
      return { ...DEFAULT_STYLE_PROFILE };
    }
    return new Promise((resolve) => {
      chrome.storage.local.get(['styleProfile'], (result) => {
        resolve({ ...DEFAULT_STYLE_PROFILE, ...result.styleProfile });
      });
    });
  }

  static async saveStyleProfile(profile: Partial<StyleProfile>): Promise<StyleProfile> {
    const current = await this.getStyleProfile();
    const updated = { ...current, ...profile };
    if (this.isChromeStorageAvailable()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ styleProfile: updated }, () => resolve());
      });
    }
    return updated;
  }

  static async getActivePayload(): Promise<ActivePayloadState> {
    if (typeof chrome === 'undefined' || !chrome.storage?.session) {
      return {};
    }
    return new Promise((resolve) => {
      chrome.storage.session.get(['activePayload'], (result) => {
        resolve(result.activePayload || {});
      });
    });
  }

  static async setActivePayload(payload: Partial<ActivePayloadState>): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.session) {
      return;
    }
    const current = await this.getActivePayload();
    const updated = { ...current, ...payload, timestamp: Date.now() };
    return new Promise((resolve) => {
      chrome.storage.session.set({ activePayload: updated }, () => resolve());
    });
  }

  static async clearActivePayload(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.session) {
      return;
    }
    return new Promise((resolve) => {
      chrome.storage.session.remove(['activePayload'], () => resolve());
    });
  }
}

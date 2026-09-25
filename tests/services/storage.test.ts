import { describe, it, expect } from 'vitest';
import { StorageService, DEFAULT_SETTINGS, DEFAULT_STYLE_PROFILE } from '../../src/services/storage';

describe('StorageService', () => {
  it('should return default settings when storage is empty', async () => {
    const settings = await StorageService.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should save and update settings correctly', async () => {
    await StorageService.saveSettings({
      cloudApiKey: 'test-key-123',
      cloudModel: 'gemini-2.5-flash',
    });

    const updated = await StorageService.getSettings();
    expect(updated.cloudApiKey).toBe('test-key-123');
    expect(updated.cloudModel).toBe('gemini-2.5-flash');
    expect(updated.localModeEnabled).toBe(false);
  });

  it('should return default style profile when empty', async () => {
    const profile = await StorageService.getStyleProfile();
    expect(profile).toEqual(DEFAULT_STYLE_PROFILE);
  });

  it('should save and retrieve style profile', async () => {
    await StorageService.saveStyleProfile({
      tone: 'casual',
      length: 'detailed',
      traits: ['bullet points', 'emojis'],
    });

    const profile = await StorageService.getStyleProfile();
    expect(profile.tone).toBe('casual');
    expect(profile.length).toBe('detailed');
    expect(profile.traits).toEqual(['bullet points', 'emojis']);
  });

  it('should set and retrieve active payload session queue', async () => {
    await StorageService.setActivePayload({
      searchPayload: {
        type: 'SELECTION_SEARCH',
        text: 'hello world',
      },
    });

    const payloadState = await StorageService.getActivePayload();
    expect(payloadState.searchPayload?.text).toBe('hello world');
    expect(payloadState.timestamp).toBeGreaterThan(0);
  });

  it('should clear active payload session queue', async () => {
    await StorageService.setActivePayload({
      searchPayload: {
        type: 'SELECTION_SEARCH',
        text: 'test clearing',
      },
    });

    await StorageService.clearActivePayload();
    const payloadState = await StorageService.getActivePayload();
    expect(payloadState.searchPayload).toBeUndefined();
  });
});

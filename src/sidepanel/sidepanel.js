import { StorageService } from '../services/storage';
import { AIServiceFactory } from '../services/ai/provider-factory';
import { PromptRefiningService } from '../services/ai/prompt-refiner';
import { StyleAnalyzerService } from '../services/ai/style-analyzer';
import { LocalPromptAPIService } from '../services/ai/local-prompt';
(() => {
    'use strict';
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    const els = {
        // Tabs
        tabBtns: $$('.tab-btn'),
        tabPanels: $$('.tab-panel'),
        // Search
        searchInput: $('#search-input-area'),
        btnExplain: $('#btn-explain'),
        searchResult: $('#search-result'),
        searchResultText: $('#search-result-text'),
        // Sandbox
        sandboxInput: $('#sandbox-input'),
        sandboxOutput: $('#sandbox-output'),
        btnRefine: $('#btn-refine'),
        // Email
        emailThread: $('#email-thread'),
        emailKeywords: $('#email-keywords'),
        emailTone: $('#email-tone'),
        emailLength: $('#email-length'),
        btnDraft: $('#btn-draft'),
        emailResult: $('#email-result'),
        emailResultText: $('#email-result-text'),
        btnInsertDraft: $('#btn-insert-draft'),
        // Settings
        btnSettings: $('#btn-settings'),
        settingsModal: $('#settings-modal'),
        btnCloseSettings: $('#btn-close-settings'),
        btnSaveSettings: $('#btn-save-settings'),
        btnTestConnection: $('#btn-test-connection'),
        connectionStatus: $('#connection-status'),
        toggleLocalMode: $('#toggle-local-mode'),
        localModeStatus: $('#local-mode-status'),
        inputEndpoint: $('#input-endpoint'),
        inputApiKey: $('#input-api-key'),
        inputModel: $('#input-model'),
        // Ghost Persona
        inputStyleSample: $('#input-style-sample'),
        btnAnalyzeStyle: $('#btn-analyze-style'),
        styleProfileDisplay: $('#style-profile-display'),
        styleTone: $('#style-tone'),
        styleLength: $('#style-length'),
        styleTraits: $('#style-traits'),
        // Loading
        loadingOverlay: $('#loading-overlay'),
    };
    let settings;
    let styleProfile;
    async function init() {
        settings = await StorageService.getSettings();
        styleProfile = await StorageService.getStyleProfile();
        applySettingsToUI();
        applyStyleProfileToUI();
        await checkLocalModelAvailability();
        setupTabNavigation();
        setupEventListeners();
        listenForMessages();
        // Check session queue for pending active payload (e.g. context menu or bubble click)
        await consumeActiveSessionPayload();
    }
    function applySettingsToUI() {
        if (els.inputEndpoint)
            els.inputEndpoint.value = settings.cloudEndpoint;
        if (els.inputApiKey)
            els.inputApiKey.value = settings.cloudApiKey;
        if (els.inputModel)
            els.inputModel.value = settings.cloudModel;
        if (els.toggleLocalMode)
            els.toggleLocalMode.checked = settings.localModeEnabled;
    }
    function applyStyleProfileToUI() {
        if (els.inputStyleSample && styleProfile.sampleText) {
            els.inputStyleSample.value = styleProfile.sampleText;
            displayStyleProfile();
        }
    }
    async function checkLocalModelAvailability() {
        const { available, reason } = await LocalPromptAPIService.isAvailable();
        if (!els.localModeStatus || !els.toggleLocalMode)
            return;
        if (available) {
            els.localModeStatus.textContent = 'Available ✓';
            els.localModeStatus.style.color = 'var(--success, #10b981)';
            els.toggleLocalMode.disabled = false;
        }
        else {
            els.localModeStatus.textContent = reason || 'Not available — requires Chrome with Prompt API';
            els.localModeStatus.style.color = 'var(--text-muted, #9ca3af)';
            els.toggleLocalMode.disabled = true;
            els.toggleLocalMode.checked = false;
        }
    }
    async function saveSettings() {
        if (!els.inputEndpoint || !els.inputApiKey || !els.inputModel || !els.toggleLocalMode)
            return;
        settings = await StorageService.saveSettings({
            cloudEndpoint: els.inputEndpoint.value.trim(),
            cloudApiKey: els.inputApiKey.value.trim(),
            cloudModel: els.inputModel.value.trim(),
            localModeEnabled: els.toggleLocalMode.checked,
        });
        els.settingsModal?.classList.add('hidden');
    }
    async function testConnection() {
        if (!els.connectionStatus)
            return;
        const testSettings = {
            cloudEndpoint: els.inputEndpoint?.value.trim() || '',
            cloudApiKey: els.inputApiKey?.value.trim() || '',
            cloudModel: els.inputModel?.value.trim() || '',
            localModeEnabled: els.toggleLocalMode?.checked || false,
        };
        els.connectionStatus.classList.remove('hidden');
        els.connectionStatus.textContent = 'Testing API connection...';
        els.connectionStatus.style.background = 'rgba(99, 102, 241, 0.1)';
        els.connectionStatus.style.color = '#818cf8';
        els.connectionStatus.style.border = '1px solid rgba(99, 102, 241, 0.3)';
        const result = await AIServiceFactory.validateConfiguration(testSettings);
        if (result.ok) {
            els.connectionStatus.textContent = result.message;
            els.connectionStatus.style.background = 'rgba(16, 185, 129, 0.1)';
            els.connectionStatus.style.color = '#10b981';
            els.connectionStatus.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        }
        else {
            els.connectionStatus.textContent = `❌ ${result.message}`;
            els.connectionStatus.style.background = 'rgba(239, 68, 68, 0.1)';
            els.connectionStatus.style.color = '#ef4444';
            els.connectionStatus.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        }
    }
    async function consumeActiveSessionPayload() {
        const active = await StorageService.getActivePayload();
        if (active.searchPayload) {
            handleSelectionSearchMessage(active.searchPayload.text);
            await StorageService.setActivePayload({ searchPayload: null });
        }
        else if (active.emailPayload) {
            handleEmailDraftMessage(active.emailPayload.threadText);
            await StorageService.setActivePayload({ emailPayload: null });
        }
    }
    function precheckExecution() {
        if (settings.localModeEnabled) {
            return { valid: true };
        }
        if (!settings.cloudApiKey?.trim()) {
            return { valid: false, error: 'API Key is missing. Please click the Settings icon (⚙) and configure your API Key.' };
        }
        if (!settings.cloudModel?.trim()) {
            return { valid: false, error: 'Model name is missing. Please click the Settings icon (⚙) and set your target model.' };
        }
        return { valid: true };
    }
    async function handleExplain() {
        const text = els.searchInput?.innerText.trim();
        if (!text || !els.searchResultText || !els.searchResult)
            return;
        const check = precheckExecution();
        if (!check.valid) {
            els.searchResultText.textContent = `Configuration Error: ${check.error}`;
            els.searchResult.classList.remove('hidden');
            return;
        }
        showLoading();
        try {
            const systemPrompt = `You are a knowledgeable AI assistant. The user has highlighted text and wants an explanation. Provide a clear, well-structured explanation. If the text is a term or concept, define it and explain its significance. If it's a longer passage, summarize the key points and provide context. Use simple language and examples when helpful.`;
            const result = await AIServiceFactory.callAI(systemPrompt, `Please explain this:\n\n"${text}"`, settings, styleProfile);
            els.searchResultText.textContent = result;
            els.searchResult.classList.remove('hidden');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            els.searchResultText.textContent = `Execution Error: ${msg}`;
            els.searchResult.classList.remove('hidden');
        }
        finally {
            hideLoading();
        }
    }
    async function handleRefine() {
        const rawPrompt = els.sandboxInput?.value.trim();
        if (!rawPrompt || !els.sandboxOutput)
            return;
        const check = precheckExecution();
        if (!check.valid) {
            els.sandboxOutput.textContent = `Configuration Error: ${check.error}`;
            return;
        }
        showLoading();
        try {
            const systemPrompt = PromptRefiningService.getRefineSystemPrompt();
            const userPrompt = PromptRefiningService.formatUserPrompt(rawPrompt);
            const result = await AIServiceFactory.callAI(systemPrompt, userPrompt, settings, styleProfile, { temperature: 0.8 });
            els.sandboxOutput.innerHTML = PromptRefiningService.highlightVariables(result);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            els.sandboxOutput.textContent = `Execution Error: ${msg}`;
        }
        finally {
            hideLoading();
        }
    }
    async function handleDraft() {
        const threadText = els.emailThread?.innerText.trim() || '';
        const keywords = els.emailKeywords?.value.trim() || '';
        const tone = els.emailTone?.value || 'professional';
        const length = els.emailLength?.value || 'concise';
        if (!keywords) {
            alert('Please provide at least some keywords or instructions for the reply.');
            return;
        }
        if (!els.emailResultText || !els.emailResult)
            return;
        const check = precheckExecution();
        if (!check.valid) {
            els.emailResultText.textContent = `Configuration Error: ${check.error}`;
            els.emailResult.classList.remove('hidden');
            return;
        }
        showLoading();
        try {
            const systemPrompt = `You are a professional email assistant. Draft a reply email based on the previous email thread and the user's instructions.

Guidelines:
- Tone: ${tone}
- Length: ${length}
- Match the formality level of the original email
- Include appropriate greeting and sign-off
- Be natural and human-sounding
- Do NOT include a subject line — just the reply body`;
            let userPrompt = '';
            if (threadText) {
                userPrompt += `Previous email thread:\n---\n${threadText}\n---\n\n`;
            }
            userPrompt += `My reply instructions: ${keywords}`;
            const result = await AIServiceFactory.callAI(systemPrompt, userPrompt, settings, styleProfile);
            els.emailResultText.textContent = result;
            els.emailResult.classList.remove('hidden');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            els.emailResultText.textContent = `Execution Error: ${msg}`;
            els.emailResult.classList.remove('hidden');
        }
        finally {
            hideLoading();
        }
    }
    async function analyzeStyle() {
        const sample = els.inputStyleSample?.value.trim();
        if (!sample)
            return;
        const check = precheckExecution();
        if (!check.valid) {
            alert(`Configuration Error: ${check.error}`);
            return;
        }
        showLoading();
        try {
            const systemPrompt = StyleAnalyzerService.getAnalysisSystemPrompt();
            const resultText = await AIServiceFactory.callAI(systemPrompt, sample, settings, undefined, { forceCloud: true });
            styleProfile = StyleAnalyzerService.parseAnalysisResponse(resultText, sample);
            await StorageService.saveStyleProfile(styleProfile);
            displayStyleProfile();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            alert('Style analysis failed: ' + msg);
        }
        finally {
            hideLoading();
        }
    }
    function displayStyleProfile() {
        if (!els.styleTone || !els.styleLength || !els.styleTraits || !els.styleProfileDisplay)
            return;
        els.styleTone.textContent = `Tone: ${styleProfile.tone}`;
        els.styleLength.textContent = `Length: ${styleProfile.length}`;
        els.styleTraits.textContent = styleProfile.traits.length
            ? `Traits: ${styleProfile.traits.join(' • ')}`
            : '';
        els.styleProfileDisplay.classList.remove('hidden');
    }
    function setupTabNavigation() {
        els.tabBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                els.tabBtns.forEach((b) => b.classList.remove('active'));
                els.tabPanels.forEach((p) => p.classList.remove('active'));
                btn.classList.add('active');
                $(`#tab-${target}`)?.classList.add('active');
            });
        });
    }
    function activateTab(tabName) {
        els.tabBtns.forEach((b) => b.classList.remove('active'));
        els.tabPanels.forEach((p) => p.classList.remove('active'));
        const btn = $(`.tab-btn[data-tab="${tabName}"]`);
        if (btn)
            btn.classList.add('active');
        const panel = $(`#tab-${tabName}`);
        if (panel)
            panel.classList.add('active');
    }
    function handleSelectionSearchMessage(text) {
        activateTab('search');
        if (els.searchInput) {
            els.searchInput.textContent = text;
            handleExplain();
        }
    }
    function handleEmailDraftMessage(threadText) {
        activateTab('email');
        if (els.emailThread) {
            els.emailThread.textContent = threadText || '';
        }
    }
    function listenForMessages() {
        chrome.runtime.onMessage.addListener((message) => {
            switch (message.type) {
                case 'SELECTION_SEARCH':
                    handleSelectionSearchMessage(message.text);
                    break;
                case 'EMAIL_DRAFT':
                    handleEmailDraftMessage(message.threadText);
                    break;
            }
        });
    }
    function setupEventListeners() {
        els.btnExplain?.addEventListener('click', handleExplain);
        els.btnRefine?.addEventListener('click', handleRefine);
        els.btnDraft?.addEventListener('click', handleDraft);
        els.btnSettings?.addEventListener('click', () => els.settingsModal?.classList.remove('hidden'));
        els.btnCloseSettings?.addEventListener('click', () => els.settingsModal?.classList.add('hidden'));
        $('.modal-backdrop')?.addEventListener('click', () => els.settingsModal?.classList.add('hidden'));
        els.btnSaveSettings?.addEventListener('click', saveSettings);
        els.btnTestConnection?.addEventListener('click', testConnection);
        els.btnAnalyzeStyle?.addEventListener('click', analyzeStyle);
        $$('.copy-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                if (!targetId)
                    return;
                const targetEl = document.getElementById(targetId);
                if (targetEl && targetEl.textContent) {
                    navigator.clipboard.writeText(targetEl.textContent).then(() => {
                        showCopyTooltip(btn);
                    });
                }
            });
        });
        els.btnInsertDraft?.addEventListener('click', () => {
            const draftText = els.emailResultText?.textContent;
            if (!draftText)
                return;
            chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'INSERT_DRAFT',
                        text: draftText,
                    });
                }
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                els.settingsModal?.classList.add('hidden');
            }
        });
    }
    function showLoading() {
        els.loadingOverlay?.classList.remove('hidden');
    }
    function hideLoading() {
        els.loadingOverlay?.classList.add('hidden');
    }
    function showCopyTooltip(btn) {
        const tooltip = document.createElement('div');
        tooltip.className = 'copy-tooltip';
        tooltip.textContent = 'Copied!';
        btn.style.position = 'relative';
        btn.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 1500);
    }
    init();
})();

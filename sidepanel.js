// ============================================================
// AI Copilot — Side Panel Logic
// ============================================================

(() => {
  'use strict';

  // ---- DOM References ----
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
    loadingOverlay: $('#loading-overlay')
  };

  // ---- State ----
  let settings = {
    localModeEnabled: false,
    cloudEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    cloudApiKey: '',
    cloudModel: 'gemini-2.5-flash'
  };

  let styleProfile = {
    tone: 'professional',
    length: 'concise',
    traits: [],
    sampleText: ''
  };

  let localModelAvailable = false;
  let localSession = null;

  // ---- Init ----
  async function init() {
    loadSettings();
    checkLocalModelAvailability();
    setupTabNavigation();
    setupEventListeners();
    listenForMessages();
  }

  // ---- Settings Management ----
  function loadSettings() {
    chrome.storage.local.get(['settings', 'styleProfile'], (result) => {
      if (result.settings) {
        settings = { ...settings, ...result.settings };
        els.inputEndpoint.value = settings.cloudEndpoint;
        els.inputApiKey.value = settings.cloudApiKey;
        els.inputModel.value = settings.cloudModel;
        els.toggleLocalMode.checked = settings.localModeEnabled;
      }
      if (result.styleProfile) {
        styleProfile = { ...styleProfile, ...result.styleProfile };
        if (styleProfile.sampleText) {
          els.inputStyleSample.value = styleProfile.sampleText;
          displayStyleProfile();
        }
      }
    });
  }

  function saveSettings() {
    settings.cloudEndpoint = els.inputEndpoint.value.trim();
    settings.cloudApiKey = els.inputApiKey.value.trim();
    settings.cloudModel = els.inputModel.value.trim();
    settings.localModeEnabled = els.toggleLocalMode.checked;

    chrome.storage.local.set({ settings, styleProfile });
    els.settingsModal.classList.add('hidden');
  }

  // ---- Local Model (Gemini Nano) ----
  async function checkLocalModelAvailability() {
    try {
      if (self.ai && self.ai.languageModel) {
        const capabilities = await self.ai.languageModel.capabilities();
        if (capabilities.available === 'readily' || capabilities.available === 'after-download') {
          localModelAvailable = true;
          els.localModeStatus.textContent = 'Available ✓';
          els.localModeStatus.style.color = 'var(--success)';
          els.toggleLocalMode.disabled = false;
          return;
        }
      }
    } catch (e) {
      console.log('Local AI not available:', e);
    }
    localModelAvailable = false;
    els.localModeStatus.textContent = 'Not available — requires Chrome with Prompt API';
    els.localModeStatus.style.color = 'var(--text-muted)';
    els.toggleLocalMode.disabled = true;
    els.toggleLocalMode.checked = false;
  }

  async function getLocalSession() {
    if (!localSession) {
      localSession = await self.ai.languageModel.create();
    }
    return localSession;
  }

  // ---- AI Abstraction Layer ----
  async function callAI(systemPrompt, userPrompt, options = {}) {
    const useLocal = settings.localModeEnabled && localModelAvailable && !options.forceCloud;

    // Append ghost persona if enabled
    const ghostSuffix = buildGhostSuffix();
    const fullSystem = ghostSuffix ? `${systemPrompt}\n\n${ghostSuffix}` : systemPrompt;

    if (useLocal) {
      return callLocalAI(fullSystem, userPrompt);
    } else {
      const provider = getCloudProvider();
      if (provider === 'gemini') {
        return callGeminiAI(fullSystem, userPrompt, options);
      }
      return callCloudAI(fullSystem, userPrompt, options);
    }
  }

  async function callLocalAI(systemPrompt, userPrompt) {
    try {
      const session = await getLocalSession();
      const prompt = `${systemPrompt}\n\nUser: ${userPrompt}`;
      const response = await session.prompt(prompt);
      return response;
    } catch (err) {
      console.error('Local AI error:', err);
      throw new Error('Local AI failed. Try disabling Local Mode in settings.');
    }
  }

  function getCloudProvider() {
    const endpoint = (settings.cloudEndpoint || '').toLowerCase();
    const model = (settings.cloudModel || '').toLowerCase();
    if (endpoint.includes('generativelanguage.googleapis.com') || model.startsWith('gemini-')) {
      return 'gemini';
    }
    return 'openai';
  }

  function buildGeminiEndpoint(endpoint, model) {
    const base = (endpoint || '').trim();
    const lower = base.toLowerCase();
    if (!base || !lower.includes('generativelanguage.googleapis.com')) {
      return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    }

    if (lower.includes(':generatecontent')) return base;

    const normalized = base.replace(/\/+$/, '');
    const normalizedLower = normalized.toLowerCase();

    if (/\/models$/i.test(normalized)) {
      return `${normalized}/${model}:generateContent`;
    }

    if (/\/models\/[^/]+$/i.test(normalized)) {
      return `${normalized}:generateContent`;
    }

    if (normalizedLower.includes('/models/')) {
      return `${normalized}/${model}:generateContent`;
    }

    return `${normalized}/models/${model}:generateContent`;
  }

  async function callGeminiAI(systemPrompt, userPrompt, options = {}) {
    if (!settings.cloudApiKey) {
      throw new Error('No API key configured. Open Settings to add your API key.');
    }

    const model = settings.cloudModel.trim();
    if (!model) {
      throw new Error('No model configured. Example: gemini-2.5-flash');
    }

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ]
    };

    if (systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    const generationConfig = {};
    if (typeof options.temperature === 'number') {
      generationConfig.temperature = options.temperature;
    }
    if (typeof options.maxTokens === 'number') {
      generationConfig.maxOutputTokens = options.maxTokens;
    }
    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    const response = await fetch(buildGeminiEndpoint(settings.cloudEndpoint, model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': settings.cloudApiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      let errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        errText = errJson.error?.message || errJson.message || errText;
      } catch (e) {
        // keep original text
      }
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text).filter(Boolean).join('');
    if (text) return text;
    if (data.text) return data.text;

    return JSON.stringify(data);
  }

  async function callCloudAI(systemPrompt, userPrompt, options = {}) {
    if (!settings.cloudApiKey) {
      throw new Error('No API key configured. Open Settings to add your API key.');
    }

    const body = {
      model: settings.cloudModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048
    };

    const response = await fetch(settings.cloudEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.cloudApiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    // Support OpenAI-compatible response format
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content;
    }
    // Fallback for other formats
    if (data.response) return data.response;
    if (data.text) return data.text;

    return JSON.stringify(data);
  }

  // ---- Ghost Persona ----
  function buildGhostSuffix() {
    if (!styleProfile.traits.length && !styleProfile.tone) return '';

    const parts = ['Write the response matching this specific writing style:'];
    if (styleProfile.tone) parts.push(`Tone: ${styleProfile.tone}`);
    if (styleProfile.length) parts.push(`Length preference: ${styleProfile.length}`);
    if (styleProfile.traits.length) parts.push(`Traits: ${styleProfile.traits.join(', ')}`);

    return parts.join('\n');
  }

  async function analyzeStyle() {
    const sample = els.inputStyleSample.value.trim();
    if (!sample) return;

    showLoading();
    try {
      const systemPrompt = `You are a writing style analyst. Analyze the following text sample and extract:
1. Overall tone (e.g., "professional", "casual", "enthusiastic", "brief and direct")
2. Preferred length (e.g., "concise", "detailed", "moderate")
3. Key traits (list 3-5, e.g., "uses bullet points", "formal greetings", "includes emojis", "avoids jargon")

Respond in JSON format: {"tone": "...", "length": "...", "traits": ["...", "..."]}`;

      const result = await callAI(systemPrompt, sample, { forceCloud: false });

      // Parse JSON from response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        styleProfile.tone = parsed.tone || styleProfile.tone;
        styleProfile.length = parsed.length || styleProfile.length;
        styleProfile.traits = parsed.traits || [];
        styleProfile.sampleText = sample;

        chrome.storage.local.set({ styleProfile });
        displayStyleProfile();
      }
    } catch (err) {
      alert('Style analysis failed: ' + err.message);
    } finally {
      hideLoading();
    }
  }

  function displayStyleProfile() {
    els.styleTone.textContent = `Tone: ${styleProfile.tone}`;
    els.styleLength.textContent = `Length: ${styleProfile.length}`;
    els.styleTraits.textContent = styleProfile.traits.length
      ? `Traits: ${styleProfile.traits.join(' • ')}`
      : '';
    els.styleProfileDisplay.classList.remove('hidden');
  }

  // ---- Tab Navigation ----
  function setupTabNavigation() {
    els.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        els.tabBtns.forEach(b => b.classList.remove('active'));
        els.tabPanels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        $(`#tab-${target}`).classList.add('active');
      });
    });
  }

  // ---- Feature: Selection Search / Explain ----
  async function handleExplain() {
    const text = els.searchInput.innerText.trim();
    if (!text) return;

    showLoading();
    try {
      const systemPrompt = `You are a knowledgeable AI assistant. The user has highlighted text and wants an explanation. Provide a clear, well-structured explanation. If the text is a term or concept, define it and explain its significance. If it's a longer passage, summarize the key points and provide context. Use simple language and examples when helpful.`;

      const result = await callAI(systemPrompt, `Please explain this:\n\n"${text}"`);
      els.searchResultText.textContent = result;
      els.searchResult.classList.remove('hidden');
    } catch (err) {
      els.searchResultText.textContent = `Error: ${err.message}`;
      els.searchResult.classList.remove('hidden');
    } finally {
      hideLoading();
    }
  }

  // ---- Feature: Prompt Sandbox ----
  async function handleRefine() {
    const rawPrompt = els.sandboxInput.value.trim();
    if (!rawPrompt) return;

    showLoading();
    try {
      const systemPrompt = `You are a Prompt Engineering Expert. Your job is to take a simple user instruction and transform it into a structured, high-performance "Super Prompt". 

Follow this framework:
1. **Role**: Define a specific expert persona for the AI to adopt
2. **[Context]**: Expand on the background and scenario 
3. **Task**: Clearly define the objective
4. **[Format]**: Specify the desired output structure
5. **[Tone]**: Define the communication style
6. **Constraints**: Add boundaries and rules
7. **Examples**: Provide a brief example if helpful

Output the refined prompt directly. Use [Context], [Format], and [Tone] as labeled sections so they are easy to identify. Do NOT explain what you did — just output the refined super prompt.`;

      const result = await callAI(systemPrompt, `Transform this into a Super Prompt:\n\n"${rawPrompt}"`, {
        temperature: 0.8
      });

      // Highlight variables in the output
      els.sandboxOutput.innerHTML = highlightVariables(result);
    } catch (err) {
      els.sandboxOutput.textContent = `Error: ${err.message}`;
    } finally {
      hideLoading();
    }
  }

  function highlightVariables(text) {
    return escapeHtml(text)
      .replace(/\[Context\]/gi, '<span class="var-context">[Context]</span>')
      .replace(/\[Format\]/gi, '<span class="var-format">[Format]</span>')
      .replace(/\[Tone\]/gi, '<span class="var-tone">[Tone]</span>')
      .replace(/\[Role\]/gi, '<span class="var-role">[Role]</span>');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Feature: Email Draft ----
  async function handleDraft() {
    const threadText = els.emailThread.innerText.trim();
    const keywords = els.emailKeywords.value.trim();
    const tone = els.emailTone.value;
    const length = els.emailLength.value;

    if (!keywords) {
      alert('Please provide at least some keywords or instructions for the reply.');
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

      const result = await callAI(systemPrompt, userPrompt);
      els.emailResultText.textContent = result;
      els.emailResult.classList.remove('hidden');
    } catch (err) {
      els.emailResultText.textContent = `Error: ${err.message}`;
      els.emailResult.classList.remove('hidden');
    } finally {
      hideLoading();
    }
  }

  // ---- Message Listener (from background / content scripts) ----
  function listenForMessages() {
    chrome.runtime.onMessage.addListener((message) => {
      switch (message.type) {
        case 'SELECTION_SEARCH':
          // Switch to search tab and populate
          activateTab('search');
          els.searchInput.textContent = message.text;
          // Auto-trigger explain
          handleExplain();
          break;

        case 'EMAIL_DRAFT':
          // Switch to email tab and populate thread
          activateTab('email');
          els.emailThread.textContent = message.threadText || '';
          break;
      }
    });
  }

  function activateTab(tabName) {
    els.tabBtns.forEach(b => b.classList.remove('active'));
    els.tabPanels.forEach(p => p.classList.remove('active'));
    const btn = $(`.tab-btn[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
    const panel = $(`#tab-${tabName}`);
    if (panel) panel.classList.add('active');
  }

  // ---- Event Listeners ----
  function setupEventListeners() {
    // Buttons
    els.btnExplain.addEventListener('click', handleExplain);
    els.btnRefine.addEventListener('click', handleRefine);
    els.btnDraft.addEventListener('click', handleDraft);

    // Settings
    els.btnSettings.addEventListener('click', () => els.settingsModal.classList.remove('hidden'));
    els.btnCloseSettings.addEventListener('click', () => els.settingsModal.classList.add('hidden'));
    $('.modal-backdrop').addEventListener('click', () => els.settingsModal.classList.add('hidden'));
    els.btnSaveSettings.addEventListener('click', saveSettings);

    // Ghost Persona
    els.btnAnalyzeStyle.addEventListener('click', analyzeStyle);

    // Copy buttons
    $$('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          navigator.clipboard.writeText(targetEl.textContent).then(() => {
            showCopyTooltip(btn);
          });
        }
      });
    });

    // Insert draft into compose
    els.btnInsertDraft.addEventListener('click', () => {
      const draftText = els.emailResultText.textContent;
      // Send to content script to insert into compose window
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'INSERT_DRAFT',
            text: draftText
          });
        }
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        els.settingsModal.classList.add('hidden');
      }
    });
  }

  // ---- UI Helpers ----
  function showLoading() {
    els.loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    els.loadingOverlay.classList.add('hidden');
  }

  function showCopyTooltip(btn) {
    const tooltip = document.createElement('div');
    tooltip.className = 'copy-tooltip';
    tooltip.textContent = 'Copied!';
    btn.style.position = 'relative';
    btn.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 1500);
  }

  // ---- Boot ----
  init();
})();

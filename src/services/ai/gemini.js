export function buildGeminiEndpoint(rawEndpoint, modelName) {
    const base = (rawEndpoint || '').trim();
    const lower = base.toLowerCase();
    const model = (modelName || 'gemini-2.5-flash').trim();
    if (!base || !lower.includes('generativelanguage.googleapis.com')) {
        return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    }
    if (lower.includes(':generatecontent')) {
        return base;
    }
    const normalized = base.replace(/\/+$/, '');
    if (/\/models$/i.test(normalized)) {
        return `${normalized}/${model}:generateContent`;
    }
    if (/\/models\/[^/]+$/i.test(normalized)) {
        return `${normalized}:generateContent`;
    }
    if (normalized.toLowerCase().includes('/models/')) {
        return `${normalized}/${model}:generateContent`;
    }
    return `${normalized}/models/${model}:generateContent`;
}
export async function callGeminiAPI(systemPrompt, userPrompt, apiKey, modelName, endpoint, options = {}) {
    const trimmedKey = (apiKey || '').trim();
    if (!trimmedKey) {
        throw new Error('API Key is required. Please open Settings and enter your API Key.');
    }
    const model = (modelName || '').trim();
    if (!model) {
        throw new Error('Model name is required. Example: gemini-2.5-flash');
    }
    const body = {
        contents: [
            {
                role: 'user',
                parts: [{ text: userPrompt }],
            },
        ],
    };
    if (systemPrompt) {
        body.systemInstruction = {
            parts: [{ text: systemPrompt }],
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
    const targetUrl = buildGeminiEndpoint(endpoint, model);
    let response;
    try {
        response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': trimmedKey,
            },
            body: JSON.stringify(body),
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Network connection failed: ${msg}`);
    }
    if (!response.ok) {
        let rawError = await response.text();
        let parsedMessage = '';
        try {
            const errJson = JSON.parse(rawError);
            parsedMessage = errJson.error?.message || '';
        }
        catch {
            // keep raw error
        }
        const errorDetails = parsedMessage || rawError;
        if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication failed (HTTP ${response.status}): Your API key is invalid or unauthorized. (${errorDetails})`);
        }
        if (response.status === 404) {
            throw new Error(`Model not found (HTTP 404): The model '${model}' does not exist on this endpoint. Please check your model name in Settings.`);
        }
        throw new Error(`Gemini API error (HTTP ${response.status}): ${errorDetails}`);
    }
    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text).filter(Boolean).join('');
    if (text)
        return text;
    if (data.text)
        return data.text;
    return JSON.stringify(data);
}

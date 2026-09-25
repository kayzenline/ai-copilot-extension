export async function callOpenAIAPI(systemPrompt, userPrompt, apiKey, modelName, endpoint, options = {}) {
    const trimmedKey = (apiKey || '').trim();
    if (!trimmedKey) {
        throw new Error('API Key is required. Please open Settings and enter your API Key.');
    }
    const model = (modelName || '').trim();
    if (!model) {
        throw new Error('Model name is required. Please open Settings and specify a model.');
    }
    const targetUrl = endpoint.trim() || 'https://api.openai.com/v1/chat/completions';
    const body = {
        model: model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
    };
    let response;
    try {
        response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${trimmedKey}`,
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
        throw new Error(`OpenAI API error (HTTP ${response.status}): ${errorDetails}`);
    }
    const data = await response.json();
    if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content;
    }
    if (data.response)
        return data.response;
    if (data.text)
        return data.text;
    return JSON.stringify(data);
}

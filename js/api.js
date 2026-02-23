/**
 * js/api.js
 * The Network Layer: Handles raw API communication with OpenRouter.
 */
import { state } from './state.js';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const getHeaders = (apiKey) => ({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/shifosan/anti-silk', // Placeholder
    'X-Title': 'Anti-Silk'
});

async function handleResponseError(response) {
    let errorMsg = `API Error: ${response.status} ${response.statusText}`;
    if (response.status === 401) errorMsg = 'Unauthorized (401): Invalid API Key.';
    if (response.status === 429) errorMsg = 'Rate Limited (429): Too many requests.';

    // Try to parse error body if available
    try {
        const errorBody = await response.json();
        if (errorBody.error && errorBody.error.message) {
            errorMsg += ` - ${errorBody.error.message}`;
        }
    } catch (e) {
        // Ignore json parse error
    }

    throw new Error(errorMsg);
}

export async function fetchChat(messages) {
    const { apiKey, model, maxTokens, temperature } = state.user;

    if (!apiKey) {
        throw new Error('API Key is missing. Please configure it in settings.');
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: getHeaders(apiKey),
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens,
                stream: false
            })
        });

        if (!response.ok) {
            await handleResponseError(response);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';

    } catch (error) {
        console.error('Fetch Chat Error:', error);
        throw error;
    }
}

export async function streamChat(messages, onChunk, onComplete, onError) {
    const { apiKey, model, maxTokens, temperature } = state.user;

    if (!apiKey) {
        onError(new Error('API Key is missing. Please configure it in settings.'));
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: getHeaders(apiKey),
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens,
                stream: true
            })
        });

        if (!response.ok) {
            await handleResponseError(response);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep the last partial line in the buffer

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const dataStr = trimmed.substring(6); // Remove "data: "
                if (dataStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(dataStr);
                    const delta = json.choices[0]?.delta?.content || '';
                    if (delta) {
                        onChunk(delta);
                    }
                } catch (e) {
                    console.warn('Failed to parse stream chunk:', e);
                }
            }
        }

        onComplete();

    } catch (error) {
        console.error('Stream Chat Error:', error);
        onError(error);
    }
}

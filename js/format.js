/**
 * js/format.js
 * Utility module for text formatting and Markdown rendering.
 */

export function formatText(rawString) {
    if (!rawString) return '';

    // Check if marked is available
    if (typeof window.marked === 'undefined') {
        console.warn('marked.js not found. Returning raw text.');
        return escapeHtml(rawString);
    }

    // Configure marked (idempotent, but safe to call repeatedly)
    if (!window.marked_configured) {
        window.marked.setOptions({
            breaks: true, // GFM line breaks
            highlight: function(code, lang) {
                const hljs = window.hljs;
                if (typeof hljs !== 'undefined') {
                    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                    return hljs.highlight(code, { language }).value;
                }
                return code;
            }
        });
        window.marked_configured = true;
    }

    try {
        let html = window.marked.parse(rawString);

        // Basic Sanitization
        // Remove <script> tags to prevent XSS
        html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "");
        // Remove standard event handlers (onload, onerror, etc.)
        html = html.replace(/ on\w+="[^"]*"/g, "");

        return html;
    } catch (e) {
        console.error('Markdown parsing failed:', e);
        return escapeHtml(rawString);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

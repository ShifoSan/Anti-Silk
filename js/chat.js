import { state, saveState } from './state.js';
import { streamChat } from './api.js';

let els = {};

// --- Initialization ---

export function initChat() {
    console.log('Initializing Chat Controller...');

    els.chatArena = document.querySelector('.chat-arena');
    els.inputField = document.querySelector('.input-field');
    els.sendBtn = document.querySelector('.send-btn');

    // Wire Events
    els.sendBtn.addEventListener('click', () => handleUserSubmit());
    els.inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserSubmit();
        }
    });

    console.log('Chat Controller Initialized');
}

// --- Message Handling ---

async function handleUserSubmit() {
    const text = els.inputField.value.trim();
    if (!text) return;

    // 1. Disable Input
    toggleInput(false);

    // 2. Clear & Append User Message
    els.inputField.value = '';
    appendMessage('user', text);

    // 3. Update History (User)
    const userMsg = { role: 'user', content: text };
    state.chat.history.push(userMsg);

    // 4. Prepare Context for API
    // Add System Prompt based on persona (for now, assume default)
    // TODO: Implement dynamic personas in Part 3
    const systemPrompt = {
        role: 'system',
        content: 'You are Anti-Silk, a helpful AI assistant.'
    };

    const messages = [systemPrompt, ...state.chat.history];

    // 5. Append AI Placeholder Bubble
    const aiBubble = appendMessage('assistant', ''); // Empty initially
    let fullAiResponse = '';

    // 6. Stream API
    await streamChat(
        messages,
        (chunk) => {
            // onChunk
            fullAiResponse += chunk;
            aiBubble.textContent = fullAiResponse; // Raw text for now
            scrollToBottom();
        },
        () => {
            // onComplete
            state.chat.history.push({ role: 'assistant', content: fullAiResponse });
            saveState(); // Persist only on completion
            toggleInput(true);
        },
        (error) => {
            // onError
            appendSystemMessage(`Error: ${error.message}`);
            toggleInput(true);
        }
    );
}

// --- UI Helpers ---

function appendMessage(role, text) {
    const row = document.createElement('div');
    row.className = `msg-row ${role === 'user' ? 'user' : 'ai'}`;

    // Meta
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    if (role === 'user') meta.style.flexDirection = 'row-reverse';

    const avatar = document.createElement('div');
    avatar.className = `msg-avatar ${role === 'user' ? 'user-avatar' : 'ai-avatar'}`;
    avatar.textContent = role === 'user' ? 'S' : 'A';

    const name = document.createElement('span');
    name.textContent = role === 'user' ? 'User' : 'Anti-Silk'; // TODO: User name from config

    const time = document.createElement('span');
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    meta.append(avatar, name, time);

    // Bubble
    const bubble = document.createElement('div');
    bubble.className = `bubble ${role === 'user' ? 'user' : 'ai'}`;
    bubble.textContent = text;

    row.append(meta, bubble);
    els.chatArena.appendChild(row);
    scrollToBottom();

    return bubble; // Return bubble reference for streaming updates
}

function appendSystemMessage(text) {
    const row = document.createElement('div');
    row.className = 'msg-row ai'; // Reuse AI layout for alignment

    const bubble = document.createElement('div');
    bubble.className = 'bubble ai';
    bubble.style.color = 'var(--danger)';
    bubble.style.borderColor = 'var(--danger)';
    bubble.style.background = 'rgba(239, 68, 68, 0.1)'; // Light red bg
    bubble.textContent = text;

    row.appendChild(bubble);
    els.chatArena.appendChild(row);
    scrollToBottom();
}

function scrollToBottom() {
    els.chatArena.scrollTop = els.chatArena.scrollHeight;
}

function toggleInput(enabled) {
    els.inputField.disabled = !enabled;
    els.sendBtn.disabled = !enabled;
    if (enabled) els.inputField.focus();
}

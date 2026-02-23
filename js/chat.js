import { state, saveState } from './state.js';
import { streamChat } from './api.js';
import { formatText } from './format.js';
import { runAgentWorkflow } from './agent.js';

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

    // 4. Branch: Agent Mode vs Standard Mode
    if (state.ui.isAgentMode) {
        await handleAgentFlow(text);
    } else {
        await handleStandardFlow(text);
    }
}

async function handleStandardFlow(text) {
    // Prepare Context
    // TODO: Implement dynamic personas in Part 3 (or later iteration, as requirements focused on Agent Mode)
    // For now, use a static System Prompt or one from State if available
    const systemPrompt = {
        role: 'system',
        content: 'You are Anti-Silk, a helpful AI assistant.'
    };

    const messages = [systemPrompt, ...state.chat.history];

    // Append AI Placeholder Bubble
    const aiBubble = appendMessage('assistant', ''); // Empty initially
    let fullAiResponse = '';

    // Stream API
    await streamChat(
        messages,
        (chunk) => {
            // onChunk
            fullAiResponse += chunk;
            // Update bubble with Markdown (Warning: expensive on every chunk, but visually correct)
            // Ideally we'd buffer or throttle, but for now we re-render.
            aiBubble.innerHTML = formatText(fullAiResponse);
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

async function handleAgentFlow(userPrompt) {
    // 1. Create Terminal Bubble
    const terminal = appendTerminalBubble();

    // 2. Prepare AI Bubble (but hide it initially? Or create it when Phase 3 starts?)
    // Requirement: "When the final stream starts (Phase 3), hide/remove the terminal and stream the text into a normal AI bubble."
    let aiBubble = null;
    let fullAiResponse = '';

    await runAgentWorkflow(
        userPrompt,
        state.chat.history, // Pass history if needed by agent logic (current implementation doesn't use it heavily but good for context)
        (statusText) => {
            // onUpdate (Phase 1 & 2)
            updateTerminalBubble(terminal, statusText);
        },
        {
            // onComplete (Phase 3 Handlers)
            onChunk: (chunk) => {
                // First chunk? Hide terminal, show AI bubble
                if (!aiBubble) {
                    terminal.classList.add('hidden'); // Or remove()
                    // Create AI bubble
                    aiBubble = appendMessage('assistant', '');
                }

                fullAiResponse += chunk;
                aiBubble.innerHTML = formatText(fullAiResponse);
                scrollToBottom();
            },
            onFinish: () => {
                // Done
                if (fullAiResponse) {
                    state.chat.history.push({ role: 'assistant', content: fullAiResponse });
                    saveState();
                }
                toggleInput(true);
            }
        },
        (error) => {
            // onError
            appendSystemMessage(`Agent Error: ${error.message}`);
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
    name.textContent = role === 'user' ? 'User' : 'Anti-Silk';

    const time = document.createElement('span');
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    meta.append(avatar, name, time);

    // Bubble
    const bubble = document.createElement('div');
    bubble.className = `bubble ${role === 'user' ? 'user' : 'ai'}`;

    // Format text initially
    bubble.innerHTML = formatText(text);

    row.append(meta, bubble);
    els.chatArena.appendChild(row);
    scrollToBottom();

    return bubble; // Return bubble reference
}

function appendTerminalBubble() {
    const row = document.createElement('div');
    row.className = 'msg-row ai';

    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar ai-avatar';
    avatar.textContent = 'A';
    const name = document.createElement('span');
    name.textContent = 'Anti-Silk · Agent Mode';
    meta.append(avatar, name);

    const terminal = document.createElement('div');
    terminal.className = 'terminal-bubble';

    // Header
    const header = document.createElement('div');
    header.className = 'term-header';
    header.innerHTML = '<div class="term-dot"></div> AGENT ACTIVE';

    terminal.appendChild(header);
    // Lines container (we will append lines here)
    // But standard structure in index.html example was simple lines.

    row.append(meta, terminal);
    els.chatArena.appendChild(row);
    scrollToBottom();

    return terminal;
}

function updateTerminalBubble(terminal, text) {
    // Create a new line div
    const line = document.createElement('div');
    line.className = 'term-line';

    // Simple text content or HTML for cursor?
    // Requirement: "Plain Text"
    line.textContent = text;

    // Check if there is a cursor element currently?
    // In the example HTML, there was a cursor. We can add it to the latest line if we want fancy UI.
    // For now, simple append.

    terminal.appendChild(line);
    scrollToBottom();
}

function appendSystemMessage(text) {
    const row = document.createElement('div');
    row.className = 'msg-row ai';

    const bubble = document.createElement('div');
    bubble.className = 'bubble ai';
    bubble.style.color = 'var(--danger)';
    bubble.style.borderColor = 'var(--danger)';
    bubble.style.background = 'rgba(239, 68, 68, 0.1)';
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

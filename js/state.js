/**
 * js/state.js
 * The Brain: Reactive state management module.
 */

const STORAGE_KEY = 'anti-silk-state';

const defaultState = {
  user: {
    apiKey: '',
    model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
    maxTokens: 8192,
    temperature: 0.7
  },
  chat: {
    history: [],
    activeId: null
  },
  ui: {
    theme: 'dark',
    isAgentMode: false
  }
};

export let state = JSON.parse(JSON.stringify(defaultState)); // Deep copy defaults

export function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      // Merge saved state with defaults to ensure schema consistency
      if (parsed.user) state.user = { ...state.user, ...parsed.user };
      if (parsed.chat) state.chat = { ...state.chat, ...parsed.chat };
      if (parsed.ui) state.ui = { ...state.ui, ...parsed.ui };

      console.log('State loaded:', state);
    } catch (e) {
      console.error('Failed to load state:', e);
      // Fallback to defaults is already set
    }
  }
}

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    console.log('State saved');
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

// Initialize on load
loadState();

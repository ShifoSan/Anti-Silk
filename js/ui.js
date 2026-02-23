/**
 * js/ui.js
 * The Body: Handles DOM events and rendering.
 */
import { state, saveState } from './state.js';

const models = [
  "arcee-ai/trinity-large-preview:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "stepfun/step-3.5-flash:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "qwen/qwen3-coder:free"
];

// Selectors
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Cache DOM elements
const els = {};

export function initUI() {
  console.log('Initializing UI...');

  // --- Cache Elements ---
  els.menuBtn = $('#menuBtn');
  els.drawer = $('#drawer');
  els.drawerOverlay = $('#drawerOverlay');
  els.drawerClose = $('#drawerClose');

  els.personasNavBtn = $('#personasNavBtn');
  els.personasModal = $('#personasModal');
  els.personasClose = $('#personasClose');

  els.vaultNavBtn = $('#vaultNavBtn');
  els.vaultModal = $('#vaultModal');
  els.vaultClose = $('#vaultClose');

  els.vaultBtn = $('#vaultBtn'); // Header API button
  els.apiModal = $('#apiModal');
  els.apiClose = $('#apiClose');

  els.agentToggle = $('.toggle');
  els.agentToggleThumb = $('.toggle-thumb');

  // API Modal Inputs
  const apiInputs = $$('.api-field input'); // [0]: Password, [1]: Number, [2]: Text (usually)
  // Be more specific to be safe
  els.apiKeyInput = $('.api-field input[type="password"]');
  els.maxTokensInput = $('.api-field input[type="number"]');
  // Temperature is the text input that isn't the password
  // But let's look at the structure: 4 api-fields.
  // 1. Password
  // 2. Model (div)
  // 3. Number (Max Tokens)
  // 4. Text (Temperature)
  // Querying all inputs in .api-field:
  // [0] Password
  // [1] Number
  // [2] Text
  const inputs = $$('.api-field .api-input');
  els.apiKeyInput = inputs[0];
  els.maxTokensInput = inputs[1];
  els.temperatureInput = inputs[2];

  els.modelPillsContainer = $('.model-pills');
  els.saveConfigBtn = $('.modal-save-btn');

  // --- Initialize Visual State ---
  updateAgentModeVisuals();

  // --- Event Listeners ---

  // Drawer
  els.menuBtn.addEventListener('click', () => openDrawer());
  els.drawerClose.addEventListener('click', () => closeDrawer());
  els.drawerOverlay.addEventListener('click', () => closeDrawer());

  // Modals (Generic Close Logic)
  [els.personasModal, els.vaultModal, els.apiModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Personas
  els.personasNavBtn.addEventListener('click', () => {
    closeDrawer();
    openModal(els.personasModal);
  });
  els.personasClose.addEventListener('click', () => closeModal(els.personasModal));

  // Vault
  els.vaultNavBtn.addEventListener('click', () => {
    closeDrawer();
    openModal(els.vaultModal);
  });
  els.vaultClose.addEventListener('click', () => closeModal(els.vaultModal));

  // API Settings
  els.vaultBtn.addEventListener('click', () => {
    populateApiModal();
    openModal(els.apiModal);
  });
  els.apiClose.addEventListener('click', () => closeModal(els.apiModal));

  // Agent Mode Toggle
  els.agentToggle.parentElement.addEventListener('click', () => {
    state.ui.isAgentMode = !state.ui.isAgentMode;
    saveState(); // Persist UI state
    updateAgentModeVisuals();
  });

  // Save Configuration
  els.saveConfigBtn.addEventListener('click', () => {
    saveApiConfiguration();
  });

  console.log('UI Initialized');
}

// --- Logic Helpers ---

function openDrawer() {
  els.drawer.classList.remove('hidden');
  els.drawerOverlay.classList.remove('hidden');
}

function closeDrawer() {
  els.drawer.classList.add('hidden');
  els.drawerOverlay.classList.add('hidden');
}

function openModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

function updateAgentModeVisuals() {
  const isAgent = state.ui.isAgentMode;
  const toggle = els.agentToggle;
  const thumb = els.agentToggleThumb;

  if (isAgent) {
    toggle.style.background = 'rgba(59,130,246,0.35)'; // Active color
    thumb.style.left = 'auto';
    thumb.style.right = '3px';
  } else {
    toggle.style.background = 'rgba(255,255,255,0.1)'; // Inactive color
    thumb.style.right = 'auto';
    thumb.style.left = '3px';
  }
}

function populateApiModal() {
  // Inputs
  els.apiKeyInput.value = state.user.apiKey || '';
  els.maxTokensInput.value = state.user.maxTokens || 8192;
  els.temperatureInput.value = state.user.temperature || 0.7;

  // Model Pills
  renderModelPills();
}

function renderModelPills() {
  els.modelPillsContainer.innerHTML = '';

  // Combine default with list if needed, or just use list.
  // Requirement: "Inject the specific Free OpenRouter models listed below"
  // But also need to show selected status.

  models.forEach(modelId => {
    const btn = document.createElement('button');
    btn.className = 'model-pill';
    btn.textContent = modelId.split(':')[0].split('/').pop(); // Short name for display? Or full?
    // Display name logic: "google/gemma-3-27b-it:free" -> "gemma-3-27b-it" maybe?
    // The current UI shows "claude-3-haiku".
    // Let's just show the full name but maybe truncated or just the second part.
    // Let's show the full string for clarity, or maybe simplified.
    // "google/gemma-3-27b-it:free" -> "gemma-3-27b-it"
    // "arcee-ai/trinity-large-preview:free" -> "trinity-large-preview"
    const displayName = modelId.split('/')[1].split(':')[0];
    btn.textContent = displayName;
    btn.title = modelId; // Tooltip with full ID

    if (state.user.model === modelId) {
      btn.classList.add('sel');
    }

    btn.addEventListener('click', () => {
      // Deselect others
      $$('.model-pill').forEach(p => p.classList.remove('sel'));
      // Select this
      btn.classList.add('sel');
      // Update state immediately? Or just visual?
      // "When the 'Save Configuration' button is clicked... update the state".
      // So here we just update visual selection.
      // But we need to store the selection somewhere to save it later.
      // I'll attach the full model ID to the button.
      btn.dataset.model = modelId;
    });

    // If state model is not in list, it won't be selected.
    // We should probably handle that case (e.g. if default is google/gemini... and it's not in list).
    // I will add the default model to the list if it's missing?
    // No, user gave "exact array".
    // So if state.user.model is not in array, nothing is selected.

    btn.dataset.model = modelId;
    els.modelPillsContainer.appendChild(btn);
  });
}

function saveApiConfiguration() {
  const newKey = els.apiKeyInput.value.trim();
  const newTokens = parseInt(els.maxTokensInput.value, 10);
  const newTemp = parseFloat(els.temperatureInput.value);

  // Find selected model
  const selectedPill = $('.model-pill.sel');
  const newModel = selectedPill ? selectedPill.dataset.model : state.user.model;

  // Update State
  state.user.apiKey = newKey;
  state.user.maxTokens = newTokens;
  state.user.temperature = newTemp;
  state.user.model = newModel;

  saveState();
  closeModal(els.apiModal);

  // Optional: Feedback
  // alert('Configuration Saved');
}

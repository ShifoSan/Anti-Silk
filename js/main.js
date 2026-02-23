/**
 * js/main.js
 * The Entry Point: Bootstraps the application.
 */
import { initUI } from './ui.js';
import { state } from './state.js';

console.log('Anti-Silk System Starting...');

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  console.log('Anti-Silk Core Online');
  console.log('Current State:', state);
});

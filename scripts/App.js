import { setupComponentButtons } from './events/ComponentButtonHandlers.js';

export function initializeApp() {
  console.log('🚀 Initializing application...');

  const canvas = document.getElementById('canvas');
  if (!canvas) {
    throw new Error('Canvas element (#canvas) not found in HTML');
  }

  setupComponentButtons();
  // setupActionButtons();

  console.log('✅ Application initialized');
  
  return { canvas };
}

document.addEventListener('DOMContentLoaded', initializeApp);

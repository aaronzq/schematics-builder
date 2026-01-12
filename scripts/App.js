import { setupComponentButtons} from './events/ButtonHandlers.js';
import { setupComponentSelection, setupComponentDragging } from './events/InteractionHandlers.js';


export function initializeApp() {
  console.log('🚀 Initializing application...');

  const canvas = document.getElementById('canvas');
  if (!canvas) {
    throw new Error('Canvas element (#canvas) not found in HTML');
  }

  setupComponentButtons();
  setupComponentSelection();
  setupComponentDragging();

  console.log('✅ Application initialized');
  
  return { canvas };
}

document.addEventListener('DOMContentLoaded', initializeApp);

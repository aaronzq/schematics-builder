import { setupComponentButtons, setupActionButtons } from './events/ButtonHandlers.js';
import { setupComponentSelection, setupComponentDragging, setupCanvasPanning, setupCanvasZoom } from './events/InteractionHandlers.js';


export function initializeApp() {
  console.log('Initializing application...');

  const canvas = document.getElementById('canvas');
  if (!canvas) {
    throw new Error('Canvas element (#canvas) not found in HTML');
  }

  setupComponentButtons();
  setupActionButtons();
  setupComponentSelection();
  setupComponentDragging();
  setupCanvasPanning();
  setupCanvasZoom();

  console.log('Application initialized');
  
  return { canvas };
}

document.addEventListener('DOMContentLoaded', initializeApp);

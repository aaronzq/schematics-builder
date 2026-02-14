import { setupComponentButtons, setupActionButtons, updateToolbarButtons } from './events/ButtonHandlers.js';
import { setupComponentSelection, setupComponentDragging, setupCanvasPanning, setupCanvasZoom, setupSelectionBox } from './events/InteractionHandlers.js';
import { setupCategoryFolding } from './components/ComponentMenu.js';
import { setupFilenameEditor } from './Fileio.js';

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
  setupSelectionBox();
  setupCategoryFolding();
  setupFilenameEditor();
  updateToolbarButtons();

  console.log('Application initialized');
  
  return { canvas };
}



document.addEventListener('DOMContentLoaded', initializeApp);

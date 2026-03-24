import { setupComponentButtons, setupActionButtons, updateToolbarButtons } from './events/ButtonHandlers.js';
import { setupComponentSelection, setupComponentDragging, setupCanvasPanning, setupCanvasZoom, setupSelectionBox } from './events/InteractionHandlers.js';
import { refreshSidebarMenu } from './components/ComponentMenu.js';
import { setupFilenameEditor } from './Fileio.js';
import { loadUserComponents } from './components/UserComponentStore.js';
import { openSaveCompositeDialog } from './components/SaveCompositeDialog.js';
import { componentManager } from './components/index.js';
import './components/CompositeLibrary.js';

export function initializeApp() {
  console.log('Initializing application...');

  const canvas = document.getElementById('canvas');
  if (!canvas) {
    throw new Error('Canvas element (#canvas) not found in HTML');
  }

  loadUserComponents();        // merge persisted user composites into registry before menu build
  refreshSidebarMenu();        // generate sidebar from ComponentLibrary definitions
  setupComponentButtons();     // wire click handlers onto the generated buttons
  setupActionButtons();
  setupComponentSelection();
  setupComponentDragging();
  setupCanvasPanning();
  setupCanvasZoom();
  setupSelectionBox();
  setupFilenameEditor();
  updateToolbarButtons();

  // Wire Save as Composite button
  document.getElementById('save-as-composite-btn')?.addEventListener('click', () => {
    openSaveCompositeDialog(componentManager);
  });

  console.log('Application initialized');
  
  return { canvas };
}



document.addEventListener('DOMContentLoaded', initializeApp);

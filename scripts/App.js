import { setupComponentButtons, setupActionButtons, updateToolbarButtons } from './events/ButtonHandlers.js';
import { setupComponentSelection, setupComponentDragging, setupCanvasPanning, setupCanvasZoom, setupSelectionBox } from './events/InteractionHandlers.js';
import { refreshSidebarMenu } from './components/ComponentMenu.js';
import { setupFileActions, setupFilenameEditor } from './Fileio.js';
import { loadUserComponents } from './components/UserComponentStore.js';
import { openSaveCompositeDialog } from './components/SaveCompositeDialog.js';
import { componentManager } from './components/index.js';
import { initDebugLayer } from './utils/DebugLayer.js';
import { setupRayMenu } from './rays/RayMenu.js';
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
  setupFileActions();
  updateToolbarButtons();
  initDebugLayer();
  setupRayMenu();              // Initialize ray panel (Phase 3)

  // Wire Save as Composite button
  document.getElementById('save-as-composite-btn')?.addEventListener('click', () => {
    openSaveCompositeDialog(componentManager);
  });

  // Sidebar resize handle
  _setupSidebarResize();

  console.log('Application initialized');
  
  return { canvas };
}



document.addEventListener('DOMContentLoaded', initializeApp);

function _setupSidebarResize() {
  const sidebar = document.getElementById('sidebar');
  const handle  = document.getElementById('sidebar-resize-handle');
  if (!sidebar || !handle) return;

  const MIN_WIDTH = 100;   // px
  const MAX_WIDTH = 500;   // px

  let dragging = false;
  let startX   = 0;
  let startW   = 0;

  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    startX   = e.clientX;
    startW   = sidebar.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor    = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const delta    = e.clientX - startX;
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + delta));
    sidebar.style.width = `${newWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor    = '';
    document.body.style.userSelect = '';
  });
}

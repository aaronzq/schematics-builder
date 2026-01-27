import { componentManager } from '../components/index.js';
import { showRotationHandle, removeRotationHandle } from './RotationHandle.js';
import { showScaleHandle, removeScaleHandle } from './ScaleHandle.js';
import { showArrowHandle, removeArrowHandle } from './ArrowHandle.js';

export function setupComponentSelection() {
  const schematics = document.getElementById('schematics');
  const canvas = document.getElementById('canvas');
  if (!schematics || !canvas) return;

  schematics.addEventListener('click', (e) => {
    const componentElement = e.target.closest('[data-id]');
    if (componentElement) {
      const id = parseInt(componentElement.getAttribute('data-id'));
      componentManager.selectComponent(id);
      showRotationHandle(id);
      showScaleHandle(id);
      showArrowHandle(id);
    } else {
      removeRotationHandle();
      removeScaleHandle();
      removeArrowHandle();
    }
  });

  // Deselect component when clicking on blank canvas
  canvas.addEventListener('click', (e) => {
    // Only deselect if clicking directly on the canvas, not on child elements
    if (e.target === canvas) {
      componentManager.deselectComponent();
      removeRotationHandle();
      removeScaleHandle();
      removeArrowHandle();
    }
  });

  console.log('✅ Component selection initialized');
}

export function setupComponentDragging() {
  const schematics = document.getElementById('schematics');
  if (!schematics) return;

  let isDragging = false;
  let draggedId = null;
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;

  schematics.addEventListener('mousedown', (e) => {
    const componentElement = e.target.closest('[data-id]');
    if (!componentElement) return;

    isDragging = true;
    draggedId = parseInt(componentElement.getAttribute('data-id'));
    
    const component = componentManager.getComponent(draggedId);
    if (!component) return;

    const pos = component.getPosition();
    initialX = pos.x;
    initialY = pos.y;
    startX = e.clientX;
    startY = e.clientY;

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || draggedId === null) return;

    const svg = document.getElementById('canvas');
    const pt = svg.createSVGPoint();
    const startPt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    startPt.x = startX;
    startPt.y = startY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    const startSvgPt = startPt.matrixTransform(svg.getScreenCTM().inverse());

    componentManager.updateComponentPosition(
      draggedId,
      svgPt.x-startSvgPt.x+initialX,
      svgPt.y-startSvgPt.y+initialY
    );

    const selected = componentManager.getSelectedComponent();
    if (selected && selected.id === draggedId) {
      showRotationHandle(draggedId);
      showScaleHandle(draggedId);
      showArrowHandle(draggedId);
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      draggedId = null;
    }
  });

  console.log('✅ Component dragging initialized');
}

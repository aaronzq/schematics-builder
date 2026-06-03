import { componentManager } from '../components/index.js';
import { 
  ARROW_COLOR, 
  ARROW_STROKE_WIDTH, 
  ARROW_HANDLE_RADIUS,
  ARROW_TIP_SNAP_SIZE
} from '../config.js';
import { ensureArrowheadMarker } from '../utils/svgUtils.js';
import { actionHistory } from '../history/ActionHistory.js';

/**
 * Shows an arrow for the specified component
 * The arrow starts at the component's centerPoint and points to the arrowVector endpoint
 */
export function showArrowHandle(componentId) {
  const svg = document.getElementById('canvas');
  if (!svg) return;

  // Remove any existing arrow handles
  removeArrowHandle();

  const component = componentManager.getComponent(componentId);
  if (!component) return;

  // Ensure arrowhead marker exists
  ensureArrowheadMarker(svg);

  // Arrow starts from the optical center (centerPoint in world space)
  const oc = component.getCenterPointWorld();
  const centerX = oc.x;
  const centerY = oc.y;

  // Get arrow endpoint
  const endpoint = component.getArrowEndpoint();
  const targetX = endpoint.x;
  const targetY = endpoint.y;

  // Create arrow group
  const arrowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  arrowGroup.setAttribute('id', `arrow-handle-${componentId}`);
  arrowGroup.classList.add('arrow-handle');

  // Main arrow line
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', centerX);
  line.setAttribute('y1', centerY);
  line.setAttribute('x2', targetX);
  line.setAttribute('y2', targetY);
  line.setAttribute('stroke', ARROW_COLOR);
  line.setAttribute('stroke-width', ARROW_STROKE_WIDTH);
  line.setAttribute('marker-end', 'url(#arrowhead)');
  line.setAttribute('pointer-events', 'none');
  arrowGroup.appendChild(line);

  // Draggable handle at arrow endpoint
  const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  handle.setAttribute('cx', targetX);
  handle.setAttribute('cy', targetY);
  handle.setAttribute('r', ARROW_HANDLE_RADIUS);
  handle.setAttribute('fill', '#fff');
  handle.setAttribute('stroke', ARROW_COLOR);
  handle.setAttribute('stroke-width', '2');
  handle.setAttribute('cursor', 'pointer');
  handle.setAttribute('data-arrow-handle', componentId);
  arrowGroup.appendChild(handle);

  // Add to canvas
  svg.appendChild(arrowGroup);

  // Setup dragging
  setupArrowDragging(handle, line, componentId, centerX, centerY);

  // console.log(`Arrow handle shown for component [ID: ${componentId}]`);
}

/**
 * Removes the arrow handle from the canvas
 */
export function removeArrowHandle() {
  const svg = document.getElementById('canvas');
  if (!svg) return;

  const arrowHandles = svg.querySelectorAll('.arrow-handle');
  arrowHandles.forEach(handle => handle.remove());
}

/**
 * Sets up dragging functionality for the arrow handle
 */
function setupArrowDragging(handle, line, componentId, centerX, centerY) {
  let isDragging = false;

  handle.addEventListener('mousedown', (e) => {
    actionHistory.begin('Move spawn arrow', 'move-arrow');
    isDragging = true;
    componentManager.ignoreNextCanvasClick = true;
    e.stopPropagation(); // Prevent component dragging
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const svg = document.getElementById('canvas');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Snap to grid
    const snapSize = ARROW_TIP_SNAP_SIZE;
    const snappedX = Math.round(svgPt.x / snapSize) * snapSize;
    const snappedY = Math.round(svgPt.y / snapSize) * snapSize;

    // Update line endpoint
    line.setAttribute('x2', snappedX);
    line.setAttribute('y2', snappedY);

    // Update handle position
    handle.setAttribute('cx', snappedX);
    handle.setAttribute('cy', snappedY);

    // Update component's arrow vector (relative to optical center in world space)
    const component = componentManager.getComponent(componentId);
    if (component) {
      const oc = component.getCenterPointWorld();
      component.setArrowVector(snappedX - oc.x, snappedY - oc.y);
    }

    e.preventDefault();
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      componentManager.ignoreNextCanvasClick = true;
      // Update nextPosition to the arrow tip after dragging
      componentManager.updateNextPositionFromComponent(componentId);
      actionHistory.commit();
      console.log(`Arrow handle dragging completed for component [ID: ${componentId}]`);
    }
  });
}

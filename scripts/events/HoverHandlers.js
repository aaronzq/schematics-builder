import { componentManager } from '../components/index.js';
import { LINK_HOVER_BOX_COLOR, HOVER_BOX_FILL, HOVER_BOX_STROKE, HOVER_BOX_STROKE_WIDTH } from '../config.js';

let hoverBox = null;
let selectionHoverBoxes = new Map(); // Track hover boxes during selection

function createHoverBox() {
  const ns = 'http://www.w3.org/2000/svg';
  const rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('id', 'hover-box');
  rect.setAttribute('fill', HOVER_BOX_FILL);
  rect.setAttribute('stroke', HOVER_BOX_STROKE);
  rect.setAttribute('stroke-width', HOVER_BOX_STROKE_WIDTH);
  rect.setAttribute('pointer-events', 'none');
  return rect;
}

export function createComponentHoverBox(component) {
  const ns = 'http://www.w3.org/2000/svg';
  const rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('class', 'selection-hover-box');
  rect.setAttribute('fill', HOVER_BOX_FILL);
  rect.setAttribute('stroke', HOVER_BOX_STROKE);
  rect.setAttribute('stroke-width', HOVER_BOX_STROKE_WIDTH);
  rect.setAttribute('pointer-events', 'none');
  
  const { x, y } = component.getPosition();
  const { width, height } = component;
  const rotation = component.getRotation();
  const s = component.getScale();
  const cx = component.centerPoint?.x ?? 0;
  const cy = component.centerPoint?.y ?? 0;
  const { a, b, c, d } = component._getFlipMatrix();

  // Use localBounds for asymmetric components (e.g. mirror).
  // The transform ends with translate(-cx,-cy), which shifts all rect coords by (-cx,-cy).
  // So rect x=lb.minX places the left edge at pre-translate local coord lb.minX — correct.
  const lb = component.localBounds ?? { minX: -width/2, maxX: width/2, minY: -height/2, maxY: height/2 };
  rect.setAttribute('x', lb.minX);
  rect.setAttribute('y', lb.minY);
  rect.setAttribute('width', lb.maxX - lb.minX);
  rect.setAttribute('height', lb.maxY - lb.minY);

  // Must match _updateTransform: translate(x,y) rotate matrix(flip*scale) translate(-cx,-cy)
  const transform = `translate(${x}, ${y}) rotate(${rotation}) matrix(${s*a}, ${s*b}, ${s*c}, ${s*d}, 0, 0) translate(${-cx}, ${-cy})`;
  rect.setAttribute('transform', transform);
  
  return rect;
}

export function showHoverBox(id) {
  const component = componentManager.getComponent(id);
  if (!component) return;

  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  // Remove existing hover box if any
  removeHoverBox();

  // Create new hover box
  hoverBox = createHoverBox();
  
  const { x, y } = component.getPosition();
  const { width, height } = component;
  const rotation = component.getRotation();
  const s = component.getScale();
  const cx = component.centerPoint?.x ?? 0;
  const cy = component.centerPoint?.y ?? 0;
  const { a, b, c, d } = component._getFlipMatrix();

  // Use localBounds for asymmetric components (e.g. mirror).
  // The transform ends with translate(-cx,-cy), which shifts all rect coords by (-cx,-cy).
  // So rect x=lb.minX places the left edge at pre-translate local coord lb.minX — correct.
  const lb = component.localBounds ?? { minX: -width/2, maxX: width/2, minY: -height/2, maxY: height/2 };
  hoverBox.setAttribute('x', lb.minX);
  hoverBox.setAttribute('y', lb.minY);
  hoverBox.setAttribute('width', lb.maxX - lb.minX);
  hoverBox.setAttribute('height', lb.maxY - lb.minY);

  // Must match _updateTransform: translate(x,y) rotate matrix(flip*scale) translate(-cx,-cy)
  const transform = `translate(${x}, ${y}) rotate(${rotation}) matrix(${s*a}, ${s*b}, ${s*c}, ${s*d}, 0, 0) translate(${-cx}, ${-cy})`;
  hoverBox.setAttribute('transform', transform);
  
  canvas.appendChild(hoverBox);
}

export function removeHoverBox() {
  if (hoverBox) {
    hoverBox.remove();
    hoverBox = null;
  }
}

/**
 * Update the transform of the existing singleton hover box to match the
 * component's current rotation. Called every frame during single-component
 * rotation drag so the box tracks the component.
 * @param {object} component
 */
export function updateHoverBoxTransform(component) {
  if (!hoverBox) return;
  const { x, y } = component.getPosition();
  const rotation = component.getRotation();
  const s = component.getScale();
  const cx = component.centerPoint?.x ?? 0;
  const cy = component.centerPoint?.y ?? 0;
  const { a, b, c, d } = component._getFlipMatrix();
  hoverBox.setAttribute('transform',
    `translate(${x}, ${y}) rotate(${rotation}) matrix(${s*a}, ${s*b}, ${s*c}, ${s*d}, 0, 0) translate(${-cx}, ${-cy})`);
}

/**
 * Show hover boxes for multiple selected components
 * @param {Array} componentIds - Array of component IDs to show hover boxes for
 */
export function showMultipleHoverBoxes(componentIds) {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  // Remove existing hover boxes
  removeHoverBox();
  clearSelectionHoverBoxes();

  // Create hover boxes for all specified components
  componentIds.forEach(id => {
    const component = componentManager.getComponent(id);
    if (component) {
      const box = createHoverBox();
      
      const { x, y } = component.getPosition();
      const { width, height } = component;
      const rotation = component.getRotation();
      const s = component.getScale();
      const cx = component.centerPoint?.x ?? 0;
      const cy = component.centerPoint?.y ?? 0;
      const { a, b, c, d } = component._getFlipMatrix();

      const lb = component.localBounds ?? { minX: -width/2, maxX: width/2, minY: -height/2, maxY: height/2 };
      box.setAttribute('x', lb.minX);
      box.setAttribute('y', lb.minY);
      box.setAttribute('width', lb.maxX - lb.minX);
      box.setAttribute('height', lb.maxY - lb.minY);

      const transform = `translate(${x}, ${y}) rotate(${rotation}) matrix(${s*a}, ${s*b}, ${s*c}, ${s*d}, 0, 0) translate(${-cx}, ${-cy})`;
      box.setAttribute('transform', transform);
      
      canvas.appendChild(box);
      addSelectionHoverBox(id, box);
    }
  });
}

export function clearSelectionHoverBoxes() {
  selectionHoverBoxes.forEach(box => box.remove());
  selectionHoverBoxes.clear();
}

export function addSelectionHoverBox(id, box) {
  selectionHoverBoxes.set(id, box);
}

export function removeSelectionHoverBox(id) {
  const box = selectionHoverBoxes.get(id);
  if (box) {
    box.remove();
    selectionHoverBoxes.delete(id);
  }
}

export function hasSelectionHoverBox(id) {
  return selectionHoverBoxes.has(id);
}

export function forEachSelectionHoverBox(callback) {
  selectionHoverBoxes.forEach(callback);
}

/**
 * Setup hover event listeners for components
 * @param {Function} isSelectionActive - Function that returns whether selection box is active
 */
export function setupHoverListeners(isSelectionActive, getUnifiedBoundsFn, getSelectedIdsFn) {
  const schematics = document.getElementById('schematics');
  const canvas = document.getElementById('canvas');
  if (!schematics || !canvas) return;

  // Track if we're hovering over unified bbox
  canvas.addEventListener('mousemove', (e) => {
    // Don't show hover during selection box drawing
    if (isSelectionActive()) return;

    // Check if there's a multiselection
    const selectedIds = getSelectedIdsFn();
    if (selectedIds.length < 2) return;

    // Check if hovering over a specific component
    const componentElement = e.target.closest('[data-id]');
    if (componentElement) return; // Let component-specific hover handle it

    // Check if cursor is within unified bounds
    const bounds = getUnifiedBoundsFn();
    if (!bounds) return;

    const svg = canvas;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Check if point is within bounds
    if (svgPt.x >= bounds.x && svgPt.x <= bounds.x + bounds.width &&
        svgPt.y >= bounds.y && svgPt.y <= bounds.y + bounds.height) {
      // Show hover boxes for all selected components
      showMultipleHoverBoxes(selectedIds);
    } else {
      // Clear hover boxes if outside bounds
      removeHoverBox();
      clearSelectionHoverBoxes();
    }
  });

  schematics.addEventListener('mouseover', (e) => {
    // Don't show hover box during selection box drawing
    if (isSelectionActive()) return;
    
    const componentElement = e.target.closest('[data-id]');
    if (componentElement) {
      const id = parseInt(componentElement.getAttribute('data-id'));
      const component = componentManager.getComponent(id);
      
      // Clear any multi-hover boxes first
      clearSelectionHoverBoxes();
      
      // If component is part of a group, show hover boxes for all group members
      if (component && component.isGrouped && component.groupMembers.size > 0) {
        const groupIds = [id, ...Array.from(component.groupMembers)];
        showMultipleHoverBoxes(groupIds);
      } else {
        // Otherwise show single hover box
        showHoverBox(id);
      }
    }
  });

  schematics.addEventListener('mouseout', (e) => {
    // Don't manage hover box during selection box drawing
    if (isSelectionActive()) return;
    
    const componentElement = e.target.closest('[data-id]');
    if (componentElement) {
      // Only remove if we're leaving the component entirely
      const relatedTarget = e.relatedTarget;
      if (!relatedTarget || !relatedTarget.closest(`[data-id="${componentElement.getAttribute('data-id')}"]`)) {
        removeHoverBox();
        clearSelectionHoverBoxes();
      }
    }
  });

  console.log('Hover listeners initialized');
}

/**
 * Show persistent hover boxes on all valid components for re-link mode
 * @param {Set} validComponentIds - Set of component IDs to show hover boxes for
 * @param {Array} hoverBoxesArray - Array to store the created hover boxes
 */
export function showRelinkHoverBoxes(validComponentIds, hoverBoxesArray) {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  
  // Remove existing relink hover boxes
  removeRelinkHoverBoxes(hoverBoxesArray);
  
  // Create persistent hover box for each valid component
  validComponentIds.forEach(id => {
    const component = componentManager.getComponent(id);
    if (!component) return;
    
    const { x, y } = component.getPosition();
    const rotation = component.getRotation();
    const s = component.getScale();
    const { width, height } = component;
    const cx = component.centerPoint?.x ?? 0;
    const cy = component.centerPoint?.y ?? 0;
    const { a, b, c, d } = component._getFlipMatrix();
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'relink-hover-box');
    const lb = component.localBounds ?? { minX: -width/2, maxX: width/2, minY: -height/2, maxY: height/2 };
    rect.setAttribute('x', lb.minX);
    rect.setAttribute('y', lb.minY);
    rect.setAttribute('width', lb.maxX - lb.minX);
    rect.setAttribute('height', lb.maxY - lb.minY);
    rect.setAttribute('fill', HOVER_BOX_FILL);
    rect.setAttribute('stroke', LINK_HOVER_BOX_COLOR);
    rect.setAttribute('stroke-width', HOVER_BOX_STROKE_WIDTH);
    rect.setAttribute('pointer-events', 'none');
    rect.setAttribute('transform', `translate(${x}, ${y}) rotate(${rotation}) matrix(${s*a}, ${s*b}, ${s*c}, ${s*d}, 0, 0) translate(${-cx}, ${-cy})`);
    
    canvas.appendChild(rect);
    hoverBoxesArray.push(rect);
  });
}

/**
 * Remove relink-specific hover boxes
 * @param {Array} hoverBoxesArray - Array of hover boxes to remove
 */
export function removeRelinkHoverBoxes(hoverBoxesArray) {
  hoverBoxesArray.forEach(box => {
    if (box && box.parentNode) {
      box.remove();
    }
  });
  hoverBoxesArray.length = 0;
}

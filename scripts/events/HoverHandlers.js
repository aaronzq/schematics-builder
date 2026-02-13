import { componentManager } from '../components/index.js';

let hoverBox = null;
let selectionHoverBoxes = new Map(); // Track hover boxes during selection

function createHoverBox() {
  const ns = 'http://www.w3.org/2000/svg';
  const rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('id', 'hover-box');
  rect.setAttribute('fill', 'none');
  rect.setAttribute('stroke', '#555');
  rect.setAttribute('stroke-width', '2.5');
  // rect.setAttribute('stroke-dasharray', '5,5');
  rect.setAttribute('pointer-events', 'none');
  return rect;
}

export function createComponentHoverBox(component) {
  const ns = 'http://www.w3.org/2000/svg';
  const rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('class', 'selection-hover-box');
  rect.setAttribute('fill', 'none');
  rect.setAttribute('stroke', '#555');
  rect.setAttribute('stroke-width', '2.5');
  rect.setAttribute('pointer-events', 'none');
  
  // Get component properties
  const { x, y } = component.getPosition();
  const { width, height } = component;
  const rotation = component.getRotation();
  const scale = component.getScale();
  
  // Set box dimensions (relative to origin)
  rect.setAttribute('x', -width / 2);
  rect.setAttribute('y', -height / 2);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  
  // Apply transform: translate to position, then rotate and scale
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
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
  
  // Get component properties
  const { x, y } = component.getPosition();
  const { width, height } = component;
  const rotation = component.getRotation();
  const scale = component.getScale();
  const centerPoint = component.centerPoint || { x: 0, y: 0 };
  
  // Set box dimensions (relative to origin)
  hoverBox.setAttribute('x', -width / 2);
  hoverBox.setAttribute('y', -height / 2);
  hoverBox.setAttribute('width', width);
  hoverBox.setAttribute('height', height);
  
  // Apply transform: translate to position, then rotate and scale
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
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
      
      // Get component properties
      const { x, y } = component.getPosition();
      const { width, height } = component;
      const rotation = component.getRotation();
      const scale = component.getScale();
      
      // Set box dimensions (relative to origin)
      box.setAttribute('x', -width / 2);
      box.setAttribute('y', -height / 2);
      box.setAttribute('width', width);
      box.setAttribute('height', height);
      
      // Apply transform: translate to position, then rotate and scale
      const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
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
    
    const pos = component.getPosition();
    const rotation = component.getRotation();
    const scale = component.getScale();
    const width = component.width * scale;
    const height = component.height * scale;
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'relink-hover-box');
    rect.setAttribute('x', -width / 2);
    rect.setAttribute('y', -height / 2);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', '#ff6b6b');
    rect.setAttribute('stroke-width', '2.5');
    // rect.setAttribute('stroke-dasharray', '5,5');
    rect.setAttribute('pointer-events', 'none');
    rect.setAttribute('transform', `translate(${pos.x}, ${pos.y}) rotate(${rotation})`);
    
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

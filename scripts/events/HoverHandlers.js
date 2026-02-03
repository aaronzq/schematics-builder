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
export function setupHoverListeners(isSelectionActive) {
  const schematics = document.getElementById('schematics');
  if (!schematics) return;

  schematics.addEventListener('mouseover', (e) => {
    // Don't show hover box during selection box drawing
    if (isSelectionActive()) return;
    
    const componentElement = e.target.closest('[data-id]');
    if (componentElement) {
      const id = parseInt(componentElement.getAttribute('data-id'));
      showHoverBox(id);
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
      }
    }
  });

  console.log('Hover listeners initialized');
}

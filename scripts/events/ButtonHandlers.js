import {
	addComponent,
	componentManager
} from '../components/index.js';
import { removeRotationHandle } from './RotationHandle.js';
import { removeScaleHandle } from './ScaleHandle.js';
import { removeArrowHandle } from './ArrowHandle.js';
import { canvas } from '../Canvas.js';
import { updateRays } from '../rays/DrawRays.js';
import { toggleApertureRays } from '../rays/ApertureRays.js';
import { toggleTraceLines } from '../rays/TraceLines.js';
import { showRelinkHoverBoxes, removeRelinkHoverBoxes } from './HoverHandlers.js';

export function setupComponentButtons() {
  const componentMenu = document.querySelector('.component-menu');
  if (!componentMenu) return;

  componentMenu.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-component]');
    if (button) {
      const type = button.dataset.component;
      addComponent(type);
    }
  });

  console.log('Component buttons initialized');
}

export function setupActionButtons() {
  // Delete button
  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (componentManager.selectedIds.size > 0) {
        const idsToDelete = Array.from(componentManager.selectedIds);
        idsToDelete.forEach(id => componentManager.deleteComponent(id));
        removeRotationHandle();
        removeScaleHandle();
        removeArrowHandle();
        updateRays();
      }
    });
  }

  // Flip horizontal button
  const flipHorizontalBtn = document.getElementById('flip-horizontal-btn');
  if (flipHorizontalBtn) {
    flipHorizontalBtn.addEventListener('click', () => {
      if (componentManager.selectedIds.size > 0) {
        componentManager.selectedIds.forEach(id => {
          componentManager.flipComponentHorizontal(id);
        });
      }
    });
  }

  // Flip vertical button
  const flipVerticalBtn = document.getElementById('flip-vertical-btn');
  if (flipVerticalBtn) {
    flipVerticalBtn.addEventListener('click', () => {
      if (componentManager.selectedIds.size > 0) {
        componentManager.selectedIds.forEach(id => {
          componentManager.flipComponentVertical(id);
        });
      }
    });
  }

  // Hide component button
  const hideComponentBtn = document.getElementById('hide-component-btn');
  if (hideComponentBtn) {
    hideComponentBtn.addEventListener('click', () => {
      if (componentManager.selectedIds.size > 0) {
        componentManager.hideComponent();
      }
    });
  }

  // Show component button
  const showComponentBtn = document.getElementById('show-component-btn');
  if (showComponentBtn) {
    showComponentBtn.addEventListener('click', () => {
      if (componentManager.selectedIds.size > 0) {
        componentManager.showComponent();
      }
    });
  }

  // Show all components button
  const showAllComponentsBtn = document.getElementById('show-all-components-btn');
  if (showAllComponentsBtn) {
    showAllComponentsBtn.addEventListener('click', () => {
      componentManager.showAllComponents();
    });
  }

  // Group button
  const groupBtn = document.getElementById('group-btn');
  if (groupBtn) {
    groupBtn.addEventListener('click', () => {
      if (componentManager.groupSelectedComponents()) {
        // Refresh display
        const selectedIds = Array.from(componentManager.selectedIds);
        componentManager.selectMultiple(selectedIds);
      }
    });
  }

  // Ungroup button
  const ungroupBtn = document.getElementById('ungroup-btn');
  if (ungroupBtn) {
    ungroupBtn.addEventListener('click', () => {
      componentManager.ungroupSelectedComponents();
    });
  }

  // Toggle grid button
  const toggleGridBtn = document.getElementById('toggle-grid-btn');
  if (toggleGridBtn) {
    toggleGridBtn.addEventListener('click', () => {
      canvas.toggleGrid();
    });
  }

  // Toggle trace lines button
  const traceBtn = document.getElementById('trace-btn');
  if (traceBtn) {
    traceBtn.addEventListener('click', () => {
      toggleTraceLines();
    });
  }

  // Toggle aperture rays button
  const raysToggleBtn = document.getElementById('rays-toggle-btn');
  if (raysToggleBtn) {
    raysToggleBtn.addEventListener('click', () => {
      toggleApertureRays();
    });
  }

  // Cut link button
  const cutLinkBtn = document.getElementById('cut-link-btn');
  if (cutLinkBtn) {
    cutLinkBtn.addEventListener('click', () => {
      if (componentManager.currentId !== null) {
        if (componentManager.cutParentLink(componentManager.currentId)) {
          updateRays();
        }
      } else {
        console.log('No component selected to cut parent link');
      }
    });
  }

  // Re-link button
  const reLinkBtn = document.getElementById('re-link-btn');
  if (reLinkBtn) {
    reLinkBtn.addEventListener('click', () => {
      if (componentManager.currentId !== null) {
        startRelinkMode(componentManager.currentId);
      } else {
        console.log('No component selected to re-link');
      }
    });
  }

  console.log('Action buttons initialized');
}

// Re-link mode state
let relinkMode = {
  active: false,
  childId: null,
  currentParentId: null,
  indicatorLine: null,
  indicatorText: null,
  validComponentIds: new Set(),
  hoveredParentId: null,
  hoverBoxes: [] // Store persistent hover boxes for re-link mode
};

/**
 * Start re-link mode - shows visual feedback and waits for user to click a new parent
 */
function startRelinkMode(childId) {
  const childComponent = componentManager.getComponent(childId);
  if (!childComponent) return;
  
  // Store re-link state
  relinkMode.active = true;
  relinkMode.childId = childId;
  relinkMode.currentParentId = childComponent.parent;
  
  // Find all valid components (those that won't create a cycle)
  relinkMode.validComponentIds = getValidParentComponents(childId);
  
  // Show hover boxes on all valid components
  showRelinkHoverBoxes(relinkMode.validComponentIds, relinkMode.hoverBoxes);
  
  // Create initial visual indicator (to current parent if exists, otherwise wait for hover)
  if (relinkMode.currentParentId !== null) {
    const parentComponent = componentManager.getComponent(relinkMode.currentParentId);
    if (parentComponent) {
      drawRelinkIndicator(childComponent, parentComponent);
    }
  }
  
  console.log(`Re-link mode active for component ${childId}. Hover over a valid component to preview, click to confirm.`);
  
  // Add temporary handlers to canvas
  const canvas = document.getElementById('canvas');
  if (canvas) {
    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('click', handleRelinkClick);
    canvas.addEventListener('mousemove', handleRelinkHover);
  }
}

/**
 * Draw curved arrow from child to target parent with instructional text
 */
function drawRelinkIndicator(childComponent, parentComponent) {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  
  // Remove existing indicator
  removeRelinkIndicator();
  
  // Get positions
  const childPos = childComponent.getPosition();
  const parentPos = parentComponent.getPosition();
  
  // Calculate control point for quadratic bezier curve
  const midX = (childPos.x + parentPos.x) / 2;
  const midY = (childPos.y + parentPos.y) / 2;
  
  // Calculate perpendicular offset for curve
  const dx = parentPos.x - childPos.x;
  const dy = parentPos.y - childPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const curveOffset = Math.min(distance * 0.25, 100); // Curve amount based on distance
  
  // Perpendicular vector (rotated 90 degrees)
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  // Control point offset perpendicular to the line
  const controlX = midX + perpX * curveOffset;
  const controlY = midY + perpY * curveOffset;
  
  // Create curved path
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const pathData = `M ${childPos.x},${childPos.y} Q ${controlX},${controlY} ${parentPos.x},${parentPos.y}`;
  path.setAttribute('d', pathData);
  path.setAttribute('stroke', '#ff6b6b');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-dasharray', '5,5');
  path.setAttribute('fill', 'none');
  path.setAttribute('pointer-events', 'none');
  path.setAttribute('id', 'relink-indicator');
  
  // Add arrowhead
  const defs = canvas.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  if (!canvas.querySelector('defs')) {
    canvas.appendChild(defs);
  }
  
  // Remove old marker if exists
  const oldMarker = defs.querySelector('#relink-arrow');
  if (oldMarker) oldMarker.remove();
  
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'relink-arrow');
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', '10');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '3');
  marker.setAttribute('orient', 'auto');
  marker.setAttribute('markerUnits', 'strokeWidth');
  
  const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z');
  arrowPath.setAttribute('fill', '#ff6b6b');
  
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  
  path.setAttribute('marker-end', 'url(#relink-arrow)');
  
  // Create text label near the curve, always upright
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('id', 'relink-text');
  text.setAttribute('pointer-events', 'none');
  text.setAttribute('fill', '#ff6b6b');
  text.setAttribute('font-size', '14');
  text.setAttribute('font-weight', 'bold');
  text.textContent = 'Click the component to finish linking';
  
  // Position text at the curve's peak (control point) with offset
  // Keep text upright (no rotation or minimal rotation for readability)
  const textX = controlX;
  const textY = controlY - 15; // Offset above the curve
  
  text.setAttribute('x', textX);
  text.setAttribute('y', textY);
  text.setAttribute('text-anchor', 'middle');
  // No rotation - always keep text horizontal and readable
  
  // Insert after schematics group (on top of components)
  canvas.appendChild(path);
  canvas.appendChild(text);
  
  relinkMode.indicatorLine = path;
  relinkMode.indicatorText = text;
}

/**
 * Remove relink visual indicator
 */
function removeRelinkIndicator() {
  const indicator = document.getElementById('relink-indicator');
  if (indicator) {
    indicator.remove();
  }
  
  const text = document.getElementById('relink-text');
  if (text) {
    text.remove();
  }
  
  const marker = document.getElementById('relink-arrow');
  if (marker) {
    marker.remove();
  }
  
  relinkMode.indicatorLine = null;
  relinkMode.indicatorText = null;
}

/**
 * Handle hover during re-link mode
 */
function handleRelinkHover(event) {
  if (!relinkMode.active) return;
  
  // Get hovered element
  const target = event.target;
  const componentGroup = target.closest('g[data-id]');
  
  if (componentGroup) {
    const hoveredId = parseInt(componentGroup.getAttribute('data-id'));
    
    // Only update if hovering over a valid component and it's different from current hover
    if (relinkMode.validComponentIds.has(hoveredId) && hoveredId !== relinkMode.hoveredParentId) {
      relinkMode.hoveredParentId = hoveredId;
      
      // Update indicator to point to hovered component
      const childComponent = componentManager.getComponent(relinkMode.childId);
      const hoveredComponent = componentManager.getComponent(hoveredId);
      
      if (childComponent && hoveredComponent) {
        drawRelinkIndicator(childComponent, hoveredComponent);
      }
    }
  } else if (relinkMode.hoveredParentId !== null) {
    // Hovering over canvas - clear hover state and show original parent if exists
    relinkMode.hoveredParentId = null;
    
    const childComponent = componentManager.getComponent(relinkMode.childId);
    if (childComponent && relinkMode.currentParentId !== null) {
      const parentComponent = componentManager.getComponent(relinkMode.currentParentId);
      if (parentComponent) {
        drawRelinkIndicator(childComponent, parentComponent);
      }
    } else {
      removeRelinkIndicator();
    }
  }
}

/**
 * Handle click during re-link mode
 */
function handleRelinkClick(event) {
  if (!relinkMode.active) return;
  
  // Prevent event from propagating
  event.stopPropagation();
  
  // Get clicked element
  const target = event.target;
  const componentGroup = target.closest('g[data-id]');
  
  if (componentGroup) {
    const newParentId = parseInt(componentGroup.getAttribute('data-id'));
    
    // Check if this is a valid parent
    if (!relinkMode.validComponentIds.has(newParentId)) {
      console.log('Cannot link to this component (would create cycle)');
      exitRelinkMode();
      return;
    }
    
    // Try to change parent
    if (componentManager.changeParent(relinkMode.childId, newParentId)) {
      updateRays();
      console.log(`Successfully re-linked component ${relinkMode.childId} to parent ${newParentId}`);
    }
  } else {
    // Clicked on canvas - just cancel
    console.log('Re-link cancelled');
  }
  
  exitRelinkMode();
}

/**
 * Get all valid parent components (those that won't create a cycle)
 */
function getValidParentComponents(childId) {
  const validIds = new Set();
  
  // Get all descendants of childId (components that have childId in their parent chain)
  const descendants = new Set();
  const checkDescendants = (id) => {
    const component = componentManager.getComponent(id);
    if (!component) return;
    
    component.children.forEach(childComponentId => {
      if (!descendants.has(childComponentId)) {
        descendants.add(childComponentId);
        checkDescendants(childComponentId);
      }
    });
  };
  checkDescendants(childId);
  
  // All components except self and descendants are valid
  componentManager.components.forEach((component, id) => {
    if (id !== childId && !descendants.has(id)) {
      validIds.add(id);
    }
  });
  
  return validIds;
}

/**
 * Exit re-link mode and clean up
 */
function exitRelinkMode() {
  relinkMode.active = false;
  relinkMode.childId = null;
  relinkMode.currentParentId = null;
  relinkMode.hoveredParentId = null;
  relinkMode.validComponentIds.clear();
  
  removeRelinkIndicator();
  removeRelinkHoverBoxes(relinkMode.hoverBoxes);
  
  const canvas = document.getElementById('canvas');
  if (canvas) {
    canvas.style.cursor = 'default';
    canvas.removeEventListener('click', handleRelinkClick);
    canvas.removeEventListener('mousemove', handleRelinkHover);
  }
}

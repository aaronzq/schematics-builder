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
import { LINK_ARROW_COLOR } from '../config.js';

/**
 * Update toolbar button visibility based on selection mode
 * Mode 1: Single component (selectedIds.size === 1, currentId set)
 * Mode 2: Multiple selection, no focus (selectedIds.size > 1, currentId === null)
 * Mode 3: Multiple selection, one focused (selectedIds.size > 1, currentId set)
 */
export function updateToolbarButtons() {
  const selectedCount = componentManager.selectedIds.size;
  const hasFocus = componentManager.currentId !== null;
  const hasSelection = selectedCount > 0;
  
  // Check if any selected component is grouped
  let hasGroupedComponent = false;
  let allGrouped = true;
  let canGroup = false;
  
  if (hasSelection) {
    componentManager.selectedIds.forEach(id => {
      const component = componentManager.getComponent(id);
      if (component) {
        if (component.isGrouped) {
          hasGroupedComponent = true;
        } else {
          allGrouped = false;
        }
      }
    });
    // Can group if we have 2+ components and not ALL are already in the same group
    // This allows grouping mixed selections (grouped + ungrouped)
    canGroup = selectedCount >= 2 && !allGrouped;
  }
  
  // Check if focused component has a parent (for cut-link)
  let canCutLink = false;
  if (hasFocus) {
    const component = componentManager.getComponent(componentManager.currentId);
    canCutLink = component && component.parent !== null;
  }
  
  // Get all button elements
  const buttons = {
    delete: document.getElementById('delete-btn'),
    hide: document.getElementById('hide-component-btn'),
    show: document.getElementById('show-component-btn'),
    showAll: document.getElementById('show-all-components-btn'),
    flipH: document.getElementById('flip-horizontal-btn'),
    flipV: document.getElementById('flip-vertical-btn'),
    group: document.getElementById('group-btn'),
    ungroup: document.getElementById('ungroup-btn'),
    cutLink: document.getElementById('cut-link-btn'),
    reLink: document.getElementById('re-link-btn')
  };
  
  // Mode 1: Single component selection
  if (selectedCount === 1 && hasFocus) {
    setButtonVisibility(buttons.delete, true);
    setButtonVisibility(buttons.hide, true);
    setButtonVisibility(buttons.show, true);
    setButtonVisibility(buttons.showAll, true);
    setButtonVisibility(buttons.flipH, true);
    setButtonVisibility(buttons.flipV, true);
    setButtonVisibility(buttons.group, false);
    setButtonVisibility(buttons.ungroup, false);
    setButtonVisibility(buttons.cutLink, canCutLink);
    setButtonVisibility(buttons.reLink, true);
  }
  // Mode 2: Multiple selection, no focus
  else if (selectedCount > 1 && !hasFocus) {
    setButtonVisibility(buttons.delete, true);
    setButtonVisibility(buttons.hide, true);
    setButtonVisibility(buttons.show, true);
    setButtonVisibility(buttons.showAll, true);
    setButtonVisibility(buttons.flipH, false);
    setButtonVisibility(buttons.flipV, false);
    setButtonVisibility(buttons.group, canGroup);
    setButtonVisibility(buttons.ungroup, hasGroupedComponent);
    setButtonVisibility(buttons.cutLink, false);
    setButtonVisibility(buttons.reLink, false);
  }
  // Mode 3: Multiple selection, one focused
  else if (selectedCount > 1 && hasFocus) {
    setButtonVisibility(buttons.delete, true);
    setButtonVisibility(buttons.hide, true);
    setButtonVisibility(buttons.show, true);
    setButtonVisibility(buttons.showAll, true);
    setButtonVisibility(buttons.flipH, true);
    setButtonVisibility(buttons.flipV, true);
    setButtonVisibility(buttons.group, false); // Already grouped
    setButtonVisibility(buttons.ungroup, true);
    setButtonVisibility(buttons.cutLink, canCutLink);
    setButtonVisibility(buttons.reLink, true);
  }
  // No selection
  else {
    setButtonVisibility(buttons.delete, false);
    setButtonVisibility(buttons.hide, false);
    setButtonVisibility(buttons.show, false);
    setButtonVisibility(buttons.showAll, false);
    setButtonVisibility(buttons.flipH, false);
    setButtonVisibility(buttons.flipV, false);
    setButtonVisibility(buttons.group, false);
    setButtonVisibility(buttons.ungroup, false);
    setButtonVisibility(buttons.cutLink, false);
    setButtonVisibility(buttons.reLink, false);
  }
}

/**
 * Helper function to set button visibility
 */
function setButtonVisibility(button, visible) {
  if (button) {
    button.style.display = visible ? '' : 'none';
  }
}

export function setupComponentButtons() {
  // Use event delegation on the sidebar so all category menus are covered
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  sidebar.addEventListener('click', (e) => {
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
        updateToolbarButtons();
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
        updateToolbarButtons();
      }
    });
  }

  // Ungroup button
  const ungroupBtn = document.getElementById('ungroup-btn');
  if (ungroupBtn) {
    ungroupBtn.addEventListener('click', () => {
      componentManager.ungroupSelectedComponents();
      updateToolbarButtons();
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
  path.setAttribute('stroke', LINK_ARROW_COLOR);
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
  arrowPath.setAttribute('fill', LINK_ARROW_COLOR);
  
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  
  path.setAttribute('marker-end', 'url(#relink-arrow)');
  
  // Create text label near the curve, always upright
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('id', 'relink-text');
  text.setAttribute('pointer-events', 'none');
  text.setAttribute('fill', LINK_ARROW_COLOR);
  text.setAttribute('font-size', '14');
  text.setAttribute('font-weight', 'bold');
  text.textContent = 'Click component to link';
  
  // Find the uppermost world-space point of the component using localBounds corners
  const lb = parentComponent.localBounds;
  const lbCorners = [
    { x: lb.minX, y: lb.minY }, { x: lb.maxX, y: lb.minY },
    { x: lb.maxX, y: lb.maxY }, { x: lb.minX, y: lb.maxY }
  ];
  let minY = Infinity;
  lbCorners.forEach(corner => {
    const world = parentComponent._localToWorld(corner.x, corner.y);
    minY = Math.min(minY, world.y);
  });
  
  // Position text above the uppermost point
  const textX = parentPos.x;
  const textY = minY - 25; // Offset above the uppermost edge
  
  text.setAttribute('x', textX);
  text.setAttribute('y', textY);
  text.setAttribute('text-anchor', 'middle');
  // No rotation - always keep text horizontal and readable
  
  // Insert elements: arrow first, then text on top
  canvas.appendChild(path);
  canvas.appendChild(text); // Text is appended last to be on absolute top
  
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

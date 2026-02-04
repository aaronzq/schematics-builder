import { componentManager } from '../components/index.js';
import { showRotationHandle, removeRotationHandle, showGroupRotationHandle } from './RotationHandle.js';
import { showScaleHandle, removeScaleHandle } from './ScaleHandle.js';
import { showArrowHandle, removeArrowHandle } from './ArrowHandle.js';
import { showHoverBox, removeHoverBox, clearSelectionHoverBoxes, setupHoverListeners, createComponentHoverBox, addSelectionHoverBox, removeSelectionHoverBox, hasSelectionHoverBox, forEachSelectionHoverBox } from './HoverHandlers.js';
import { 
  SELECTION_BOX_FILL,
  SELECTION_BOX_STROKE,
  SELECTION_BOX_STROKE_WIDTH,
  SELECTION_BOX_STROKE_DASHARRAY,
  UNIFIED_BBOX_FILL,
  UNIFIED_BBOX_STROKE,
  UNIFIED_BBOX_STROKE_WIDTH,
  UNIFIED_BBOX_STROKE_DASHARRAY,
  UNIFIED_BBOX_PADDING,
  DRAGGING_SNAP_INCREMENT
} from '../config.js';

let selectionBox = null;
let isSelectionBoxActive = false;
let selectionStartPoint = null;
let selectionBoxJustCompleted = false;
let unifiedBoundingBox = null; // Unified bounding box for multiple selections

function calculateUnifiedBounds(components) {
  if (!components || components.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  components.forEach(({ component }) => {
    const { x, y } = component.getPosition();
    const { width, height } = component;
    const rotation = component.getRotation() * Math.PI / 180;
    const scale = component.getScale();

    // Calculate the four corners of the component's bounding box
    const halfWidth = (width * scale) / 2;
    const halfHeight = (height * scale) / 2;

    const corners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight }
    ];

    // Rotate corners and translate to component position
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    corners.forEach(corner => {
      const rotatedX = corner.x * cos - corner.y * sin;
      const rotatedY = corner.x * sin + corner.y * cos;
      const worldX = x + rotatedX;
      const worldY = y + rotatedY;

      minX = Math.min(minX, worldX);
      maxX = Math.max(maxX, worldX);
      minY = Math.min(minY, worldY);
      maxY = Math.max(maxY, worldY);
    });
  });

  // Add padding
  return {
    x: minX - UNIFIED_BBOX_PADDING,
    y: minY - UNIFIED_BBOX_PADDING,
    width: (maxX - minX) + (UNIFIED_BBOX_PADDING * 2),
    height: (maxY - minY) + (UNIFIED_BBOX_PADDING * 2)
  };
}

function showUnifiedBoundingBox() {
  // Remove existing unified bounding box
  removeUnifiedBoundingBox();

  const selectedComponents = componentManager.getSelectedComponents();
  if (!selectedComponents || selectedComponents.length < 2) return;

  const bounds = calculateUnifiedBounds(selectedComponents);
  if (!bounds) return;

  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  // Create unified bounding box
  const ns = 'http://www.w3.org/2000/svg';
  unifiedBoundingBox = document.createElementNS(ns, 'rect');
  unifiedBoundingBox.setAttribute('id', 'unified-bounding-box');
  unifiedBoundingBox.setAttribute('fill', UNIFIED_BBOX_FILL);
  unifiedBoundingBox.setAttribute('stroke', UNIFIED_BBOX_STROKE);
  unifiedBoundingBox.setAttribute('stroke-width', UNIFIED_BBOX_STROKE_WIDTH);
  unifiedBoundingBox.setAttribute('stroke-dasharray', UNIFIED_BBOX_STROKE_DASHARRAY);
  unifiedBoundingBox.setAttribute('pointer-events', 'none');
  unifiedBoundingBox.setAttribute('x', bounds.x);
  unifiedBoundingBox.setAttribute('y', bounds.y);
  unifiedBoundingBox.setAttribute('width', bounds.width);
  unifiedBoundingBox.setAttribute('height', bounds.height);

  canvas.appendChild(unifiedBoundingBox);
}

function removeUnifiedBoundingBox() {
  if (unifiedBoundingBox) {
    unifiedBoundingBox.remove();
    unifiedBoundingBox = null;
  }
}

export { showUnifiedBoundingBox, removeUnifiedBoundingBox };

/**
 * Get the bounds of the current unified bounding box
 * @returns {Object|null} Bounds object with x, y, width, height or null if no unified bbox
 */
export function getUnifiedBoundingBoxBounds() {
  const selectedComponents = componentManager.getSelectedComponents();
  if (!selectedComponents || selectedComponents.length < 2) return null;
  return calculateUnifiedBounds(selectedComponents);
}

/**
 * Check if a point is within the unified bounding box
 * @param {number} x - SVG X coordinate
 * @param {number} y - SVG Y coordinate
 * @returns {boolean}
 */
function isPointInUnifiedBbox(x, y) {
  const bounds = getUnifiedBoundingBoxBounds();
  if (!bounds) return false;
  
  return x >= bounds.x && x <= bounds.x + bounds.width &&
         y >= bounds.y && y <= bounds.y + bounds.height;
}

export function setupComponentSelection() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  // Setup hover listeners with callbacks
  setupHoverListeners(
    () => isSelectionBoxActive,
    getUnifiedBoundingBoxBounds,
    () => Array.from(componentManager.selectedIds)
  );

  // Add cursor style for unified bbox area
  canvas.addEventListener('mousemove', (e) => {
    // Skip during selection box drawing
    if (isSelectionBoxActive) return;

    // Check if hovering over a component
    const componentElement = e.target.closest('[data-id]');
    if (componentElement) {
      canvas.style.cursor = '';
      return;
    }

    // Check if in unified bbox area (multi-selection mode)
    if (componentManager.selectedIds.size > 1) {
      const svg = canvas;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

      if (isPointInUnifiedBbox(svgPt.x, svgPt.y)) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = '';
      }
    } else {
      canvas.style.cursor = '';
    }
  });

  // Deselect component when clicking on blank canvas
  canvas.addEventListener('click', (e) => {
    // Skip if selection box was just completed
    if (selectionBoxJustCompleted) {
      selectionBoxJustCompleted = false;
      return;
    }

    // Skip if an arrow handle interaction just occurred
    if (componentManager.ignoreNextCanvasClick) {
      componentManager.ignoreNextCanvasClick = false;
      return;
    }
    
    // Deselect if not clicking on a component or unified bbox area
    const componentElement = e.target.closest('[data-id]');
    if (!componentElement) {
      // Check if clicking in unified bbox area (don't deselect group)
      if (componentManager.selectedIds.size > 1) {
        const svg = canvas;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
        
        // If clicking in unified bbox, keep selection
        if (isPointInUnifiedBbox(svgPt.x, svgPt.y)) {
          return;
        }
      }
      
      componentManager.deselectComponent();
      removeRotationHandle();
      removeScaleHandle();
      removeArrowHandle();
      removeUnifiedBoundingBox();
    }
  });

  console.log('Component selection initialized');
}

export function setupComponentDragging() {
  const schematics = document.getElementById('schematics');
  const canvas = document.getElementById('canvas');
  if (!schematics || !canvas) return;

  let isDragging = false;
  let hasMoved = false;
  let draggedId = null;
  let startX = 0;
  let startY = 0;
  let initialPositions = new Map(); // Store initial positions for multi-selection
  let isGroupDrag = false; // Track if dragging multiple components

  // Handle mousedown on components (individual component drag)
  schematics.addEventListener('mousedown', (e) => {
    // Only handle left click (button 0)
    if (e.button !== 0) return;
    
    const componentElement = e.target.closest('[data-id]');
    if (!componentElement) return;

    isDragging = true;
    hasMoved = false;
    draggedId = parseInt(componentElement.getAttribute('data-id'));
    
    const component = componentManager.getComponent(draggedId);
    if (!component) return;

    // Always treat clicking a component as single component drag
    // Deselect others and select only this one
    isGroupDrag = false;
    componentManager.selectComponent(draggedId);
    
    // Show handles immediately
    removeUnifiedBoundingBox();
    showRotationHandle(draggedId);
    showScaleHandle(draggedId);
    showArrowHandle(draggedId);

    const pos = component.getPosition();
    initialPositions.set(draggedId, {
      x: pos.x,
      y: pos.y
    });

    startX = e.clientX;
    startY = e.clientY;

    e.preventDefault();
  });

  // Handle mousedown in unified bbox area (group drag)
  canvas.addEventListener('mousedown', (e) => {
    // Only handle left click (button 0)
    if (e.button !== 0) return;
    
    // Only handle clicks in unified bbox (not on components, not on blank canvas)
    if (componentManager.selectedIds.size < 2) return;

    // Check if clicking on canvas directly (not a component)
    if (e.target !== canvas) return;

    // Get click position in SVG coordinates
    const svg = canvas;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Check if click is within unified bbox
    if (!isPointInUnifiedBbox(svgPt.x, svgPt.y)) return;

    // Start group drag
    isDragging = true;
    hasMoved = false;
    isGroupDrag = true;
    
    // Store initial positions of all selected components
    initialPositions = componentManager.getGroupInitialStates(componentManager.selectedIds);
    console.log(`Starting group drag of ${componentManager.selectedIds.size} components`);

    startX = e.clientX;
    startY = e.clientY;

    canvas.style.cursor = 'move';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    hasMoved = true;

    const svg = document.getElementById('canvas');
    const pt = svg.createSVGPoint();
    const startPt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    startPt.x = startX;
    startPt.y = startY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    const startSvgPt = startPt.matrixTransform(svg.getScreenCTM().inverse());

    // Calculate delta movement
    const deltaX = svgPt.x - startSvgPt.x;
    const deltaY = svgPt.y - startSvgPt.y;

    if (isGroupDrag) {
      // Group drag: snap the centroid delta, then apply to all components
      // This keeps relative positions exact while snapping the group as a whole
      const snappedDeltaX = Math.round(deltaX / DRAGGING_SNAP_INCREMENT) * DRAGGING_SNAP_INCREMENT;
      const snappedDeltaY = Math.round(deltaY / DRAGGING_SNAP_INCREMENT) * DRAGGING_SNAP_INCREMENT;
      
      componentManager.selectedIds.forEach(id => {
        const initialState = initialPositions.get(id);
        if (initialState) {
          const newX = initialState.x + snappedDeltaX;
          const newY = initialState.y + snappedDeltaY;
          
          componentManager.updateComponentPosition(id, newX, newY);
        }
      });

      // Update unified bounding box
      showUnifiedBoundingBox();
      
      // Update rotation handle to follow the group
      showGroupRotationHandle();

      // Update hover boxes for all selected components
      // Clear existing hover boxes first
      clearSelectionHoverBoxes();
      
      const selectedIds = Array.from(componentManager.selectedIds);
      selectedIds.forEach(id => {
        const component = componentManager.getComponent(id);
        if (component) {
          const box = createComponentHoverBox(component);
          const canvas = document.getElementById('canvas');
          if (canvas) {
            canvas.appendChild(box);
            addSelectionHoverBox(id, box);
          }
        }
      });
    } else {
      // Single component drag
      const initialState = initialPositions.get(draggedId);
      if (initialState) {
        const newX = initialState.x + deltaX;
        const newY = initialState.y + deltaY;
        const snappedX = Math.round(newX / DRAGGING_SNAP_INCREMENT) * DRAGGING_SNAP_INCREMENT;
        const snappedY = Math.round(newY / DRAGGING_SNAP_INCREMENT) * DRAGGING_SNAP_INCREMENT;

        componentManager.updateComponentPosition(
          draggedId,
          snappedX,
          snappedY
        );

        const selected = componentManager.getSelectedComponent();
        if (selected && selected.id === draggedId) {
          showRotationHandle(draggedId);
          showScaleHandle(draggedId);
          showArrowHandle(draggedId);
        } else if (componentManager.selectedIds.size > 1) {
          showGroupRotationHandle();
        }
        
        // Update hover box during drag
        showHoverBox(draggedId);
      }
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      // Clear hover boxes after drag
      if (isGroupDrag) {
        clearSelectionHoverBoxes();
        
        // Update unified bbox and rotation handle after group drag
        showUnifiedBoundingBox();
        showGroupRotationHandle();
      }

      // Reset cursor
      const canvas = document.getElementById('canvas');
      if (canvas) canvas.style.cursor = '';

      isDragging = false;
      hasMoved = false;
      draggedId = null;
      isGroupDrag = false;
      initialPositions.clear();
    }
  });

  console.log('Component dragging initialized');
}

export function setupCanvasPanning() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  let isPanning = false;
  let startX = 0;
  let startY = 0;

  canvas.addEventListener('mousedown', (e) => {
    // Right mouse button (button === 2)
    if (e.button === 2) {
      // Only pan if clicking on the canvas itself, not on components
      if (e.target === canvas) {
        // Don't pan if clicking inside unified bbox area
        if (componentManager.selectedIds.size > 1) {
          const svg = canvas;
          const pt = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
          
          if (isPointInUnifiedBbox(svgPt.x, svgPt.y)) {
            return; // Don't start panning
          }
        }
        
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;

    const deltaScreenX = e.clientX - startX;
    const deltaScreenY = e.clientY - startY;

    // Convert screen space delta to SVG space
    const svg = document.getElementById('canvas');
    const CTM = svg.getScreenCTM();
    const scale = CTM.a; // Get the scale factor from the CTM
    
    // Calculate delta in SVG coordinates
    const deltaX = -deltaScreenX / scale;
    const deltaY = -deltaScreenY / scale;

    // Import and use the canvas manager
    import('../Canvas.js').then(module => {
      module.canvas.pan(deltaX, deltaY);
    });

    startX = e.clientX;
    startY = e.clientY;
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button === 2 && isPanning) {
      isPanning = false;
      canvas.style.cursor = 'default';
    }
  });

  // Prevent context menu on right-click
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  console.log('Canvas panning initialized');
}

export function setupCanvasZoom() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  // Detect if device is Mac
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Track if a gesture is in progress (Mac only)
  let isGesturing = false;

  // Handle mouse wheel and trackpad zoom
  canvas.addEventListener('wheel', (e) => {
    // // On Mac, only respond to wheel events during explicit pinch (e.ctrlKey) or if gesture is active
    // // This prevents two-finger scroll from triggering zoom
    // if (isMac && !e.ctrlKey && !isGesturing) {
    //   return; // Ignore regular scroll on Mac trackpad
    // }

    // Prevent default scrolling behavior
    e.preventDefault();

    // Get mouse position in SVG coordinates
    const svg = document.getElementById('canvas');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Determine zoom factor
    let zoomFactor;
    
    if (isMac && e.ctrlKey) {
      // Trackpad pinch on Mac - deltaY values are smaller and more granular
      zoomFactor = 1 - (e.deltaY * 0.01);
    } else {
      // Mouse wheel (external mouse on Mac or any device on Windows/Linux)
      if (e.deltaY < 0) {
        zoomFactor = 1.1;
      } else {
        zoomFactor = 0.9;
      }
    }

    // Import and use the canvas manager
    import('../Canvas.js').then(module => {
      module.canvas.zoom(zoomFactor, { x: svgPoint.x, y: svgPoint.y });
    });
  }, { passive: false });

  // Add Safari-specific gesture events for Mac (more reliable for trackpad pinch)
  if (isMac) {
    let lastScale = 1;
    
    canvas.addEventListener('gesturestart', (e) => {
      e.preventDefault();
      isGesturing = true;
      lastScale = 1;
    }, { passive: false });

    canvas.addEventListener('gesturechange', (e) => {
      e.preventDefault();
      
      // Get mouse position in SVG coordinates
      const svg = document.getElementById('canvas');
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

      // Calculate zoom factor based on scale change
      const zoomFactor = e.scale / lastScale;
      lastScale = e.scale;

      // Import and use the canvas manager
      import('../Canvas.js').then(module => {
        module.canvas.zoom(zoomFactor, { x: svgPoint.x, y: svgPoint.y });
      });
    }, { passive: false });

    canvas.addEventListener('gestureend', (e) => {
      e.preventDefault();
      lastScale = 1;
      isGesturing = false;
    }, { passive: false });
  }

  console.log('Canvas zoom initialized');
}

export function setupSelectionBox() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  let startX = 0;
  let startY = 0;

  canvas.addEventListener('mousedown', (e) => {
    // Only start selection box on left click on blank canvas
    if (e.button !== 0 || e.target !== canvas) return;

    // Get mouse position in SVG coordinates
    const svg = document.getElementById('canvas');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Don't start selection box if clicking in unified bbox area (for group drag)
    if (componentManager.selectedIds.size > 1 && isPointInUnifiedBbox(svgPoint.x, svgPoint.y)) {
      return;
    }

    startX = svgPoint.x;
    startY = svgPoint.y;
    selectionStartPoint = { x: startX, y: startY };
    isSelectionBoxActive = true;

    // Create selection box
    const ns = 'http://www.w3.org/2000/svg';
    selectionBox = document.createElementNS(ns, 'rect');
    selectionBox.setAttribute('id', 'selection-box');
    selectionBox.setAttribute('fill', SELECTION_BOX_FILL);
    selectionBox.setAttribute('stroke', SELECTION_BOX_STROKE);
    selectionBox.setAttribute('stroke-width', SELECTION_BOX_STROKE_WIDTH);
    selectionBox.setAttribute('stroke-dasharray', SELECTION_BOX_STROKE_DASHARRAY);
    selectionBox.setAttribute('pointer-events', 'none');
    selectionBox.setAttribute('x', startX);
    selectionBox.setAttribute('y', startY);
    selectionBox.setAttribute('width', 0);
    selectionBox.setAttribute('height', 0);

    canvas.appendChild(selectionBox);

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isSelectionBoxActive || !selectionBox) return;

    // Get current mouse position in SVG coordinates
    const svg = document.getElementById('canvas');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

    const currentX = svgPoint.x;
    const currentY = svgPoint.y;

    // Calculate box dimensions
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    // Update selection box
    selectionBox.setAttribute('x', x);
    selectionBox.setAttribute('y', y);
    selectionBox.setAttribute('width', width);
    selectionBox.setAttribute('height', height);

    // Calculate current selection bounds
    const selectionBounds = {
      minX: x,
      maxX: x + width,
      minY: y,
      maxY: y + height
    };

    // Find components currently enclosed
    const currentlyEnclosed = new Set();
    const processedGroups = new Set();

    componentManager.components.forEach((component, id) => {
      if (processedGroups.has(id)) return;

      // Check grouped components
      if (component.isGrouped && component.groupMembers.size > 0) {
        const groupMembers = [id, ...component.groupMembers];
        let groupFullyEnclosed = true;

        for (const memberId of groupMembers) {
          const memberComponent = componentManager.getComponent(memberId);
          if (!memberComponent || !isComponentFullyEnclosed(memberComponent, selectionBounds)) {
            groupFullyEnclosed = false;
            break;
          }
        }

        if (groupFullyEnclosed) {
          groupMembers.forEach(memberId => {
            currentlyEnclosed.add(memberId);
            processedGroups.add(memberId);
          });
        }
      } else {
        // Individual component
        if (isComponentFullyEnclosed(component, selectionBounds)) {
          currentlyEnclosed.add(id);
        }
      }
    });

    // Update hover boxes
    // Remove boxes for components no longer enclosed
    forEachSelectionHoverBox((box, id) => {
      if (!currentlyEnclosed.has(id)) {
        removeSelectionHoverBox(id);
      }
    });

    // Add boxes for newly enclosed components
    currentlyEnclosed.forEach(id => {
      if (!hasSelectionHoverBox(id)) {
        const component = componentManager.getComponent(id);
        if (component) {
          const box = createComponentHoverBox(component);
          svg.appendChild(box);
          addSelectionHoverBox(id, box);
        }
      }
    });
  });

  document.addEventListener('mouseup', (e) => {
    if (!isSelectionBoxActive || !selectionBox) return;

    // Get final mouse position in SVG coordinates
    const svg = document.getElementById('canvas');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

    const endX = svgPoint.x;
    const endY = svgPoint.y;

    // Calculate selection bounds
    const selectionBounds = {
      minX: Math.min(startX, endX),
      maxX: Math.max(startX, endX),
      minY: Math.min(startY, endY),
      maxY: Math.max(startY, endY)
    };

    // Find components fully enclosed by selection box
    const selectedIds = [];
    const processedGroups = new Set();

    componentManager.components.forEach((component, id) => {
      // Skip if already processed as part of a group
      if (processedGroups.has(id)) return;

      // If component is grouped, check if any member is in bounds and select entire group
      if (component.isGrouped && component.groupMembers.size > 0) {
        const groupMembers = [id, ...component.groupMembers];
        let groupFullyEnclosed = true;

        // Check if all group members are fully enclosed
        for (const memberId of groupMembers) {
          const memberComponent = componentManager.getComponent(memberId);
          if (!memberComponent || !isComponentFullyEnclosed(memberComponent, selectionBounds)) {
            groupFullyEnclosed = false;
            break;
          }
        }

        if (groupFullyEnclosed) {
          // Add all group members to selection
          selectedIds.push(...groupMembers);
          // Mark all members as processed
          groupMembers.forEach(memberId => processedGroups.add(memberId));
        }
      } else {
        // Individual component - check if fully enclosed
        if (isComponentFullyEnclosed(component, selectionBounds)) {
          selectedIds.push(id);
        }
      }
    });

    // Update selection
    if (selectedIds.length > 0) {
      componentManager.selectMultiple(selectedIds);
      
      // Show handles for the first selected component
      if (selectedIds.length === 1) {
        showRotationHandle(selectedIds[0]);
        showScaleHandle(selectedIds[0]);
        showArrowHandle(selectedIds[0]);
        removeUnifiedBoundingBox();
      } else {
        // For multiple selections, remove individual component handles
        removeRotationHandle();
        removeScaleHandle();
        removeArrowHandle();
        // Show unified bounding box and group rotation handle for multiple selections
        showUnifiedBoundingBox();
        showGroupRotationHandle();
      }
    } else {
      // No components selected - deselect everything
      componentManager.deselectComponent();
      removeRotationHandle();
      removeScaleHandle();
      removeArrowHandle();
      removeUnifiedBoundingBox();
    }

    // Clear selection box
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }
    clearSelectionHoverBoxes();
    isSelectionBoxActive = false;
    selectionStartPoint = null;
    
    // Set flag to prevent immediate deselection from canvas click event
    selectionBoxJustCompleted = true;
  });

  console.log('Selection box initialized');
}

// Helper function to check if a component is fully enclosed by selection bounds
function isComponentFullyEnclosed(component, selectionBounds) {
  const { x, y } = component.getPosition();
  const { width, height } = component;
  const rotation = component.getRotation() * Math.PI / 180;
  const scale = component.getScale();

  // Calculate the four corners of the component's bounding box
  const halfWidth = (width * scale) / 2;
  const halfHeight = (height * scale) / 2;

  const corners = [
    { x: -halfWidth, y: -halfHeight }, // Top-left
    { x: halfWidth, y: -halfHeight },  // Top-right
    { x: halfWidth, y: halfHeight },   // Bottom-right
    { x: -halfWidth, y: halfHeight }   // Bottom-left
  ];

  // Rotate corners and translate to component position
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  for (const corner of corners) {
    // Apply rotation
    const rotatedX = corner.x * cos - corner.y * sin;
    const rotatedY = corner.x * sin + corner.y * cos;

    // Translate to world position
    const worldX = x + rotatedX;
    const worldY = y + rotatedY;

    // Check if corner is inside selection bounds
    if (worldX < selectionBounds.minX || worldX > selectionBounds.maxX ||
        worldY < selectionBounds.minY || worldY > selectionBounds.maxY) {
      return false;
    }
  }

  return true;
}

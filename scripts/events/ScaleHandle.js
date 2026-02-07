import { componentManager } from '../components/ComponentManager.js';
import {
  SCALE_HANDLE_DISTANCE,
  SCALE_HANDLE_RADIUS,
  SCALE_HANDLE_COLOR,
  SCALE_SNAP_INCREMENT,
  MIN_SCALE,
  MAX_SCALE,
  VALUE_DISPLAY_DISTANCE
} from '../config.js';
import { showRotationHandle, showGroupRotationHandle } from './RotationHandle.js';
import { showValueDisplay, hideValueDisplay } from './ValueDisplay.js';
import { 
  clearSelectionHoverBoxes, 
  createComponentHoverBox, 
  addSelectionHoverBox 
} from './HoverHandlers.js';
import { showUnifiedBoundingBox, removeUnifiedBoundingBox, getUnifiedBoundingBoxBounds } from './InteractionHandlers.js';
import { updateRays } from '../rays/DrawRays.js';

export function showScaleHandle(componentId) {
  removeScaleHandle();

  const component = componentManager.getComponent(componentId);
  if (!component) return;

  const pos = component.getPosition();
  const rotation = component.getRotation();
  const scale = component.getScale();

  const angleRad = rotation * Math.PI / 180;
  const handleX = pos.x + SCALE_HANDLE_DISTANCE * scale * Math.cos(angleRad + Math.PI/2);
  const handleY = pos.y + SCALE_HANDLE_DISTANCE * scale * Math.sin(angleRad + Math.PI/2);

  const schematics = document.getElementById('schematics');
  if (!schematics) return;

  const handle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  handle.setAttribute('id', `scale-handle-${componentId}`);
  handle.style.cursor = 'grab';
  handle.style.userSelect = 'none';
  handle.style.webkitUserSelect = 'none';
  handle.style.pointerEvents = 'all';

  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', handleX);
  bgCircle.setAttribute('cy', handleY);
  bgCircle.setAttribute('r', SCALE_HANDLE_RADIUS);
  bgCircle.setAttribute('fill', '#ffffff');
  bgCircle.setAttribute('opacity', 0);
  bgCircle.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');
  handle.appendChild(bgCircle);

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  icon.setAttribute('x', handleX);
  icon.setAttribute('y', handleY);
  icon.setAttribute('text-anchor', 'middle');
  icon.setAttribute('dominant-baseline', 'central');
  icon.setAttribute('font-family', 'Material Symbols Outlined');
  icon.setAttribute('font-size', 5 * SCALE_HANDLE_RADIUS);
  icon.setAttribute('fill', SCALE_HANDLE_COLOR);
  icon.setAttribute('transform', `rotate(${rotation} ${handleX} ${handleY})`);
  icon.textContent = 'height';
  handle.appendChild(icon);

  handle.style.cursor = 'grab';

  schematics.appendChild(handle);

  setupScaleHandleDrag(handle, componentId, pos.x, pos.y, handleX, handleY);
}

export function removeScaleHandle() {
  const schematics = document.getElementById('schematics');
  if (!schematics) return;

  const handles = schematics.querySelectorAll('[id^="scale-handle-"]');
  handles.forEach(handle => handle.remove());
}

function setupScaleHandleDrag(handle, componentId, centerX, centerY, initialHandleX, initialHandleY) {
  let isDragging = false;
  let initialDistance = 0;
  let initialScale = 1;

  handle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    isDragging = true;
    handle.style.cursor = 'grabbing';
    
    const svg = document.getElementById('canvas');
    if (svg) svg.style.setProperty('cursor', 'grabbing', 'important');
    document.body.style.setProperty('cursor', 'grabbing', 'important');
    
    document.querySelectorAll('.component').forEach(comp => {
      comp.style.setProperty('cursor', 'grabbing', 'important');
    });

    const component = componentManager.getComponent(componentId);
    if (component) {
      initialScale = component.getScale();
    }

    const svgElement = document.getElementById('canvas');
    const pt = svgElement.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svgElement.getScreenCTM().inverse());

    // Calculate initial distance from mouse to component center
    const dx = svgPt.x - centerX;
    const dy = svgPt.y - centerY;
    initialDistance = Math.sqrt(dx * dx + dy * dy);

    const componentAfter = componentManager.getComponent(componentId);
    if (componentAfter) {
      initialScale = componentAfter.getScale();
    }

    const circle = handle.querySelector('circle');
    const icon = handle.querySelector('text');
    
    if (circle) {
        circle.setAttribute('r', 1.5 * SCALE_HANDLE_RADIUS );
    }

    if (icon) {
        icon.setAttribute('font-size', 1.5 * 5 * SCALE_HANDLE_RADIUS );
    }

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleEnd);
  });

  function handleDrag(e) {
    if (!isDragging) return;

    const svg = document.getElementById('canvas');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Calculate current distance from mouse to component center
    const dx = svgPt.x - centerX;
    const dy = svgPt.y - centerY;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);

    // Calculate scale based on distance ratio
    const distanceRatio = currentDistance / initialDistance;
    let newScale = initialScale * distanceRatio;

    newScale = Math.round(newScale / SCALE_SNAP_INCREMENT) * SCALE_SNAP_INCREMENT;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    componentManager.updateComponentScale(componentId, newScale);
    
    const component = componentManager.getComponent(componentId);
    if (component) {
      const { width, height } = component;
      showValueDisplay(centerX, centerY - height / 2 - VALUE_DISPLAY_DISTANCE, newScale, 'x');

      const rotation = component.getRotation();
      const angleRad = rotation * Math.PI / 180;
      const handleX = centerX + SCALE_HANDLE_DISTANCE * newScale * Math.cos(angleRad + Math.PI/2);
      const handleY = centerY + SCALE_HANDLE_DISTANCE * newScale * Math.sin(angleRad + Math.PI/2);

      const circle = handle.querySelector('circle');
      const icon = handle.querySelector('text');
      
      if (circle) {
        circle.setAttribute('cx', handleX);
        circle.setAttribute('cy', handleY);
        circle.setAttribute('r', 1.5 * SCALE_HANDLE_RADIUS );
      }

      if (icon) {
        icon.setAttribute('x', handleX);
        icon.setAttribute('y', handleY);
        icon.setAttribute('font-size', 1.5 * 5 * SCALE_HANDLE_RADIUS );
        icon.setAttribute('transform', `rotate(${rotation} ${handleX} ${handleY})`);
      }
      
      showRotationHandle(componentId);
    }
    updateRays();
  }

  function handleEnd() {
    isDragging = false;
    handle.style.cursor = 'grab';
    
    const svg = document.getElementById('canvas');
    if (svg) svg.style.cursor = '';
    document.body.style.cursor = '';
    
    document.querySelectorAll('.component').forEach(comp => {
      comp.style.cursor = '';
    });
    
    hideValueDisplay();
    
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleEnd);

    showScaleHandle(componentId);
  }
}

export function showGroupScaleHandle() {
  removeScaleHandle();

  const selectedIds = Array.from(componentManager.selectedIds);
  if (selectedIds.length < 2) return;

  const centroid = componentManager.getGroupCentroid(selectedIds);
  
  // Get unified bounding box to calculate handle distance
  const bounds = getUnifiedBoundingBoxBounds();
  if (!bounds) return;
  
  const schematics = document.getElementById('schematics');
  if (!schematics) return;

  const handle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  handle.setAttribute('id', 'scale-handle-group');
  handle.style.cursor = 'grab';
  handle.style.userSelect = 'none';
  handle.style.webkitUserSelect = 'none';
  handle.style.pointerEvents = 'all';

  // Place handle at the bottom of the unified bounding box
  const handleX = centroid.x;
  const handleY = bounds.y + bounds.height + SCALE_HANDLE_RADIUS * 3;
  
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', handleX);
  bgCircle.setAttribute('cy', handleY);
  bgCircle.setAttribute('r', SCALE_HANDLE_RADIUS);
  bgCircle.setAttribute('fill', '#ffffff');
  bgCircle.setAttribute('opacity', 0);
  bgCircle.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');
  handle.appendChild(bgCircle);

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  icon.setAttribute('x', handleX);
  icon.setAttribute('y', handleY);
  icon.setAttribute('text-anchor', 'middle');
  icon.setAttribute('dominant-baseline', 'central');
  icon.setAttribute('font-family', 'Material Symbols Outlined');
  icon.setAttribute('font-size', 5 * SCALE_HANDLE_RADIUS);
  icon.setAttribute('fill', SCALE_HANDLE_COLOR);
  icon.textContent = 'height';
  handle.appendChild(icon);

  schematics.appendChild(handle);

  setupGroupScaleHandleDrag(handle, centroid);
}

function setupGroupScaleHandleDrag(handle, centroid) {
  let isDragging = false;
  let initialStates = null;
  let initialDistance = 0;

  handle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    isDragging = true;
    handle.style.cursor = 'grabbing';
    
    const svg = document.getElementById('canvas');
    if (svg) svg.style.setProperty('cursor', 'grabbing', 'important');
    document.body.style.setProperty('cursor', 'grabbing', 'important');
    
    document.querySelectorAll('.component').forEach(comp => {
      comp.style.setProperty('cursor', 'grabbing', 'important');
    });
  
    const circle = handle.querySelector('circle');
    const icon = handle.querySelector('text');
    if (circle) {
      circle.setAttribute('r', 1.5 * SCALE_HANDLE_RADIUS);
    }
    if (icon) {
      icon.setAttribute('font-size', 1.5 * 5 * SCALE_HANDLE_RADIUS);
    }

    // Hide unified bounding box during scaling
    removeUnifiedBoundingBox();

    // Store initial states
    initialStates = componentManager.getGroupInitialStates(componentManager.selectedIds);
    
    // Calculate initial distance from mouse to centroid
    const svg2 = document.getElementById('canvas');
    const pt = svg2.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg2.getScreenCTM().inverse());
    
    const dx = svgPt.x - centroid.x;
    const dy = svgPt.y - centroid.y;
    initialDistance = Math.sqrt(dx * dx + dy * dy);

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleEnd);
  });

  function handleDrag(e) {
    if (!isDragging) return;

    const svg = document.getElementById('canvas');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Calculate current distance from mouse to centroid
    const dx = svgPt.x - centroid.x;
    const dy = svgPt.y - centroid.y;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);

    // Calculate scale factor
    const distanceRatio = currentDistance / initialDistance;
    let scaleFactor = distanceRatio;

    // Apply snap increment
    scaleFactor = Math.round(scaleFactor / SCALE_SNAP_INCREMENT) * SCALE_SNAP_INCREMENT;
    scaleFactor = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleFactor));

    // Update all components
    componentManager.updateGroupScale(
      componentManager.selectedIds, 
      centroid, 
      scaleFactor, 
      initialStates
    );

    // Update this scale handle
    const bounds = getUnifiedBoundingBoxBounds();
    if (bounds) {
      const handleX = centroid.x * scaleFactor + centroid.x * (1 - scaleFactor);
      const handleY = (bounds.y + bounds.height) + SCALE_HANDLE_RADIUS * 3;
      
      const circle = handle.querySelector('circle');
      const icon = handle.querySelector('text');
      
      if (circle) {
        circle.setAttribute('cx', handleX);
        circle.setAttribute('cy', handleY);
      }
      if (icon) {
        icon.setAttribute('x', handleX);
        icon.setAttribute('y', handleY);
      }
    }

    // Show value display
    const bounds2 = getUnifiedBoundingBoxBounds();
    if (bounds2) {
      showValueDisplay(centroid.x, bounds2.y - VALUE_DISPLAY_DISTANCE, scaleFactor, 'x');
    }

    // Update rotation handle position to follow scaling
    const rotationHandle = document.getElementById('rotation-handle-group');
    if (rotationHandle && bounds2) {
      const rotHandleX = centroid.x;
      const rotHandleY = bounds2.y - SCALE_HANDLE_RADIUS * 3;
      
      const rotCircle = rotationHandle.querySelector('circle');
      const rotIcon = rotationHandle.querySelector('text');
      
      if (rotCircle) {
        rotCircle.setAttribute('cx', rotHandleX);
        rotCircle.setAttribute('cy', rotHandleY);
      }
      if (rotIcon) {
        rotIcon.setAttribute('x', rotHandleX);
        rotIcon.setAttribute('y', rotHandleY);
      }
    }

    // Update hover boxes for all selected components
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
    updateRays();
  }

  function handleEnd() {
    isDragging = false;
    handle.style.cursor = 'grab';
    
    const svg = document.getElementById('canvas');
    if (svg) svg.style.cursor = '';
    document.body.style.cursor = '';
    
    document.querySelectorAll('.component').forEach(comp => {
      comp.style.cursor = '';
    });
    
    hideValueDisplay();
    clearSelectionHoverBoxes();
    
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleEnd);

    // Refresh handles
    showUnifiedBoundingBox();
    showGroupRotationHandle();
    showGroupScaleHandle();
  }
}

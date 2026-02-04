import { componentManager } from '../components/ComponentManager.js';
import {
  ROTATION_HANDLE_DISTANCE,
  ROTATION_HANDLE_RADIUS,
  ROTATION_HANDLE_COLOR,
  ROTATION_SNAP_INCREMENT,
  VALUE_DISPLAY_DISTANCE
} from '../config.js';
import { showScaleHandle } from './ScaleHandle.js';
import { showValueDisplay, hideValueDisplay } from './ValueDisplay.js';
import { 
  clearSelectionHoverBoxes, 
  createComponentHoverBox, 
  addSelectionHoverBox 
} from './HoverHandlers.js';
import { showUnifiedBoundingBox, removeUnifiedBoundingBox, getUnifiedBoundingBoxBounds } from './InteractionHandlers.js';

export function showRotationHandle(componentId) {
  removeRotationHandle();

  const component = componentManager.getComponent(componentId);
  if (!component) return;

  const pos = component.getPosition();
  const rotation = component.getRotation();
  const scale = component.getScale();

  const angleRad = rotation * Math.PI / 180;
  const handleX = pos.x + ROTATION_HANDLE_DISTANCE * scale * Math.cos(angleRad - Math.PI/2);
  const handleY = pos.y + ROTATION_HANDLE_DISTANCE * scale * Math.sin(angleRad - Math.PI/2);

  const schematics = document.getElementById('schematics');
  if (!schematics) return;

  const handle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  handle.setAttribute('id', `rotation-handle-${componentId}`);
  handle.style.cursor = 'grab';
  handle.style.userSelect = 'none';
  handle.style.webkitUserSelect = 'none';
  handle.style.pointerEvents = 'all';

  
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', handleX);
  bgCircle.setAttribute('cy', handleY);
  bgCircle.setAttribute('r', ROTATION_HANDLE_RADIUS);
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
  icon.setAttribute('font-size', 5 * ROTATION_HANDLE_RADIUS);
  icon.setAttribute('fill', ROTATION_HANDLE_COLOR);
  icon.textContent = 'autorenew';
  handle.appendChild(icon);

  schematics.appendChild(handle);

  setupRotationHandleDrag(handle, componentId, pos.x, pos.y);
}

export function removeRotationHandle() {
  const schematics = document.getElementById('schematics');
  if (!schematics) return;

  const handles = schematics.querySelectorAll('[id^="rotation-handle-"]');
  handles.forEach(handle => handle.remove());
}

export function showGroupRotationHandle() {
  removeRotationHandle();

  const selectedIds = Array.from(componentManager.selectedIds);
  if (selectedIds.length < 2) return;

  const centroid = componentManager.getGroupCentroid(selectedIds);
  
  // Get unified bounding box to calculate handle distance
  const bounds = getUnifiedBoundingBoxBounds();
  if (!bounds) return;
  
  const schematics = document.getElementById('schematics');
  if (!schematics) return;

  const handle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  handle.setAttribute('id', 'rotation-handle-group');
  handle.style.cursor = 'grab';
  handle.style.userSelect = 'none';
  handle.style.webkitUserSelect = 'none';
  handle.style.pointerEvents = 'all';

  // Place handle at the top of the unified bounding box
  const handleX = centroid.x;
  const handleY = bounds.y - ROTATION_HANDLE_RADIUS * 3;
  
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', handleX);
  bgCircle.setAttribute('cy', handleY);
  bgCircle.setAttribute('r', ROTATION_HANDLE_RADIUS);
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
  icon.setAttribute('font-size', 5 * ROTATION_HANDLE_RADIUS);
  icon.setAttribute('fill', ROTATION_HANDLE_COLOR);
  icon.textContent = 'autorenew';
  handle.appendChild(icon);

  schematics.appendChild(handle);

  setupGroupRotationHandleDrag(handle, centroid);
}

function setupGroupRotationHandleDrag(handle, centroid) {
  let isDragging = false;
  let initialStates = null;
  let initialAngle = 0;
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
      circle.setAttribute('r', 1.5 * ROTATION_HANDLE_RADIUS);
    }
    if (icon) {
      icon.setAttribute('font-size', 1.5 * 5 * ROTATION_HANDLE_RADIUS);
    }

    // Hide unified bounding box during rotation
    removeUnifiedBoundingBox();

    // Store initial distance from centroid to handle
    const initialBounds = getUnifiedBoundingBoxBounds();
    if (initialBounds) {
      initialDistance = centroid.y - initialBounds.y + ROTATION_HANDLE_RADIUS * 3;
    }

    // Store initial states
    initialStates = componentManager.getGroupInitialStates(componentManager.selectedIds);
    
    // Calculate initial angle from mouse to centroid
    const svg2 = document.getElementById('canvas');
    const pt = svg2.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg2.getScreenCTM().inverse());
    initialAngle = Math.atan2(svgPt.y - centroid.y, svgPt.x - centroid.x);

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

    // Calculate current angle from mouse to centroid
    const currentAngle = Math.atan2(svgPt.y - centroid.y, svgPt.x - centroid.x);
    
    // Calculate angle difference in radians, then convert to degrees
    let angleDiff = (currentAngle - initialAngle) * 180 / Math.PI;

    // Apply snap increment
    angleDiff = Math.round(angleDiff / ROTATION_SNAP_INCREMENT) * ROTATION_SNAP_INCREMENT;

    // Update all components
    componentManager.updateGroupRotation(
      componentManager.selectedIds, 
      centroid, 
      angleDiff, 
      initialStates
    );
    
    showValueDisplay(centroid.x, centroid.y - initialDistance - VALUE_DISPLAY_DISTANCE, angleDiff, '°');

    // Update rotation handle position to follow the rotation with constant distance
    const angleRad = angleDiff * Math.PI / 180;
    const handleX = centroid.x + initialDistance * Math.sin(angleRad);
    const handleY = centroid.y - initialDistance * Math.cos(angleRad);
  
    const circle = handle.querySelector('circle');
    const icon = handle.querySelector('text');
    
    if (circle) {
      circle.setAttribute('cx', handleX);
      circle.setAttribute('cy', handleY);
      circle.setAttribute('r', 1.5 * ROTATION_HANDLE_RADIUS);
    }
    if (icon) {
      icon.setAttribute('x', handleX);
      icon.setAttribute('y', handleY);
      icon.setAttribute('font-size', 1.5 * 5 * ROTATION_HANDLE_RADIUS);
    }

    // Update hover boxes
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
    
    // Show unified bounding box after rotation finishes
    showUnifiedBoundingBox();
    
    showGroupRotationHandle();
  }
}

function setupRotationHandleDrag(handle, componentId, centerX, centerY) {
  let isDragging = false;

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
    const component = componentManager.getComponent(componentId);
    const scale = component ? component.getScale() : 1;
    if (circle) {
      circle.setAttribute('r', 1.5 * ROTATION_HANDLE_RADIUS);
    }
    
    if (icon) {
      icon.setAttribute('font-size', 1.5 * 5 * ROTATION_HANDLE_RADIUS);
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

    const dx = svgPt.x - centerX;
    const dy = svgPt.y - centerY;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;

    angle = Math.round(angle / ROTATION_SNAP_INCREMENT) * ROTATION_SNAP_INCREMENT;


    componentManager.updateComponentRotation(componentId, angle);
    
    const component = componentManager.getComponent(componentId);
    const { width, height } = component;

    showValueDisplay(centerX, centerY - height / 2 - VALUE_DISPLAY_DISTANCE, angle, '°');

    const scale = component ? component.getScale() : 1;

    const angleRad = angle * Math.PI / 180;
    const handleX = centerX + ROTATION_HANDLE_DISTANCE * scale * Math.cos(angleRad - Math.PI/2);
    const handleY = centerY + ROTATION_HANDLE_DISTANCE * scale * Math.sin(angleRad - Math.PI/2);
    
    const circle = handle.querySelector('circle');
    const icon = handle.querySelector('text');
    
    if (circle) {
      circle.setAttribute('cx', handleX);
      circle.setAttribute('cy', handleY);
      circle.setAttribute('r', 1.5 * ROTATION_HANDLE_RADIUS);
    }
    
    if (icon) {
      icon.setAttribute('x', handleX);
      icon.setAttribute('y', handleY);
      icon.setAttribute('font-size', 1.5 * 5 * ROTATION_HANDLE_RADIUS);
    }

    showScaleHandle(componentId);
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
    
    showRotationHandle(componentId);
  }
}

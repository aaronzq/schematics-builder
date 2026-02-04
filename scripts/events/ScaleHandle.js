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
import { showRotationHandle } from './RotationHandle.js';
import { showValueDisplay, hideValueDisplay } from './ValueDisplay.js';

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

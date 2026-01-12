import { componentManager } from '../components/ComponentManager.js';
import {
  ROTATION_HANDLE_DISTANCE,
  ROTATION_HANDLE_RADIUS,
  ROTATION_HANDLE_COLOR,
  ROTATION_HANDLE_STROKE,
  ROTATION_SNAP_INCREMENT
} from '../config.js';
import { showScaleHandle } from './ScaleHandle.js';

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

  const iconSize = 8 * scale;
  
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', handleX);
  bgCircle.setAttribute('cy', handleY);
  bgCircle.setAttribute('r', iconSize);
  bgCircle.setAttribute('opacity', '0');
  bgCircle.setAttribute('stroke-width', 2 * scale);
  bgCircle.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');
  handle.appendChild(bgCircle);

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  icon.setAttribute('d', 'M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z');
  icon.setAttribute('fill', '#fbc02d');
  icon.setAttribute('transform', `translate(${handleX - 12 * scale}, ${handleY - 12 * scale}) scale(${scale})`);
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

function setupRotationHandleDrag(handle, componentId, centerX, centerY) {
  let isDragging = false;

  handle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    isDragging = true;
    handle.style.cursor = 'grabbing';
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
    const scale = component ? component.getScale() : 1;

    const angleRad = angle * Math.PI / 180;
    const handleX = centerX + ROTATION_HANDLE_DISTANCE * scale * Math.cos(angleRad - Math.PI/2);
    const handleY = centerY + ROTATION_HANDLE_DISTANCE * scale * Math.sin(angleRad - Math.PI/2);
    
    const iconSize = 8 * scale;
    const circle = handle.querySelector('circle');
    const icon = handle.querySelector('path');
    
    if (circle) {
      circle.setAttribute('cx', handleX);
      circle.setAttribute('cy', handleY);
      circle.setAttribute('r', iconSize);
      circle.setAttribute('stroke-width', 2 * scale);
    }
    
    if (icon) {
      icon.setAttribute('transform', `translate(${handleX - 12 * scale}, ${handleY - 12 * scale}) scale(${scale})`);
    }

    showScaleHandle(componentId);
  } 

  function handleEnd() {
    isDragging = false;
    handle.style.cursor = 'grab';
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleEnd);
    
    showRotationHandle(componentId);
  }
}

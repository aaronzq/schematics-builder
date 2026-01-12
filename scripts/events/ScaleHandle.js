import { componentManager } from '../components/ComponentManager.js';
import {
  SCALE_HANDLE_DISTANCE,
  SCALE_HANDLE_WIDTH,
  SCALE_HANDLE_HEIGHT,
  SCALE_HANDLE_COLOR,
  SCALE_HANDLE_STROKE,
  SCALE_SNAP_INCREMENT,
  MIN_SCALE,
  MAX_SCALE
} from '../config.js';
import { showRotationHandle } from './RotationHandle.js';

export function showScaleHandle(componentId) {
  removeScaleHandle();

  const component = componentManager.getComponent(componentId);
  if (!component) return;

  const pos = component.getPosition();
  const rotation = component.getRotation();
  const scale = component.getScale();

  const width = component.width * scale;
  const height = component.height * scale;
  const outlineOffset = 2;
  const handleOffset = 6;

  const angleRad = rotation * Math.PI / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const localX = width / 2 + outlineOffset + handleOffset;
  const localY = -height / 2 - outlineOffset - handleOffset;

  const handleX = pos.x + localX * cos - localY * sin;
  const handleY = pos.y + localX * sin + localY * cos;

  const schematics = document.getElementById('schematics');
  if (!schematics) return;

  const handle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  handle.setAttribute('id', `scale-handle-${componentId}`);

  const handleSize = 8 * scale;
  const iconSize = 3 * scale;

  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', handleX);
  bgCircle.setAttribute('cy', handleY);
  bgCircle.setAttribute('r', handleSize);
  bgCircle.setAttribute('opacity', '0');
  bgCircle.setAttribute('stroke-width', 2 * scale);
  bgCircle.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');
  handle.appendChild(bgCircle);

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  icon.setAttribute('d', 'M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10z');
  icon.setAttribute('fill', '#fbc02d');
  icon.setAttribute('transform', `translate(${handleX - 12 * scale}, ${handleY - 12 * scale}) scale(${scale})`);
  handle.appendChild(icon);

  handle.style.cursor = 'nwse-resize';

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
    handle.style.cursor = 'nwse-resize';

    const component = componentManager.getComponent(componentId);
    if (component) {
      initialScale = component.getScale();
    }

    const svg = document.getElementById('canvas');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    const dx = svgPt.x - centerX;
    const dy = svgPt.y - centerY;
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

    const dx = svgPt.x - centerX;
    const dy = svgPt.y - centerY;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);

    const scaleFactor = currentDistance / initialDistance;
    let newScale = initialScale * scaleFactor;

    newScale = Math.round(newScale / SCALE_SNAP_INCREMENT) * SCALE_SNAP_INCREMENT;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    componentManager.updateComponentScale(componentId, newScale);

    const component = componentManager.getComponent(componentId);
    if (component) {
      const rotation = component.getRotation();
      const width = component.width * newScale;
      const height = component.height * newScale;
      const outlineOffset = 2;
      const handleOffset = 6;

      const angleRad = rotation * Math.PI / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);

      const localX = width / 2 + outlineOffset + handleOffset;
      const localY = -height / 2 - outlineOffset - handleOffset;

      const handleX = centerX + localX * cos - localY * sin;
      const handleY = centerY + localX * sin + localY * cos;

      const handleSize = 8 * newScale;

      const circle = handle.querySelector('circle');
      const icon = handle.querySelector('path');
      
      if (circle) {
        circle.setAttribute('cx', handleX);
        circle.setAttribute('cy', handleY);
        circle.setAttribute('r', handleSize);
        circle.setAttribute('stroke-width', 2 * newScale);
      }

      if (icon) {
        icon.setAttribute('transform', `translate(${handleX - 12 * newScale}, ${handleY - 12 * newScale}) scale(${newScale})`);
      }
      
      showRotationHandle(componentId);
    }
  }

  function handleEnd() {
    isDragging = false;
    handle.style.cursor = 'nwse-resize';
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleEnd);

    showScaleHandle(componentId);
  }
}

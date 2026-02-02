import { componentManager } from '../components/index.js';
import { showRotationHandle, removeRotationHandle } from './RotationHandle.js';
import { showScaleHandle, removeScaleHandle } from './ScaleHandle.js';
import { showArrowHandle, removeArrowHandle } from './ArrowHandle.js';

let hoverBox = null;

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

function showHoverBox(id) {
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

function removeHoverBox() {
  if (hoverBox) {
    hoverBox.remove();
    hoverBox = null;
  }
}

export function setupComponentSelection() {
  const schematics = document.getElementById('schematics');
  const canvas = document.getElementById('canvas');
  if (!schematics || !canvas) return;

  schematics.addEventListener('click', (e) => {
    const componentElement = e.target.closest('[data-id]');
    if (componentElement) {
      const id = parseInt(componentElement.getAttribute('data-id'));
      componentManager.selectComponent(id);
      showRotationHandle(id);
      showScaleHandle(id);
      showArrowHandle(id);
    } else {
      removeRotationHandle();
      removeScaleHandle();
      removeArrowHandle();
    }
  });

  // Add hover listeners
  schematics.addEventListener('mouseover', (e) => {
    const componentElement = e.target.closest('[data-id]');
    if (componentElement) {
      const id = parseInt(componentElement.getAttribute('data-id'));
      showHoverBox(id);
    }
  });

  schematics.addEventListener('mouseout', (e) => {
    const componentElement = e.target.closest('[data-id]');
    if (componentElement) {
      // Only remove if we're leaving the component entirely
      const relatedTarget = e.relatedTarget;
      if (!relatedTarget || !relatedTarget.closest(`[data-id="${componentElement.getAttribute('data-id')}"]`)) {
        removeHoverBox();
      }
    }
  });

  // Deselect component when clicking on blank canvas
  canvas.addEventListener('click', (e) => {
    // Only deselect if clicking directly on the canvas, not on child elements
    if (e.target === canvas) {
      componentManager.deselectComponent();
      removeRotationHandle();
      removeScaleHandle();
      removeArrowHandle();
    }
  });

  console.log('Component selection initialized');
}

export function setupComponentDragging() {
  const schematics = document.getElementById('schematics');
  if (!schematics) return;

  let isDragging = false;
  let draggedId = null;
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;

  schematics.addEventListener('mousedown', (e) => {
    const componentElement = e.target.closest('[data-id]');
    if (!componentElement) return;

    isDragging = true;
    draggedId = parseInt(componentElement.getAttribute('data-id'));
    
    const component = componentManager.getComponent(draggedId);
    if (!component) return;

    const pos = component.getPosition();
    initialX = pos.x;
    initialY = pos.y;
    startX = e.clientX;
    startY = e.clientY;

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || draggedId === null) return;

    const svg = document.getElementById('canvas');
    const pt = svg.createSVGPoint();
    const startPt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    startPt.x = startX;
    startPt.y = startY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    const startSvgPt = startPt.matrixTransform(svg.getScreenCTM().inverse());

    componentManager.updateComponentPosition(
      draggedId,
      svgPt.x-startSvgPt.x+initialX,
      svgPt.y-startSvgPt.y+initialY
    );

    const selected = componentManager.getSelectedComponent();
    if (selected && selected.id === draggedId) {
      showRotationHandle(draggedId);
      showScaleHandle(draggedId);
      showArrowHandle(draggedId);
    }
    
    // Update hover box during drag
    showHoverBox(draggedId);
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      draggedId = null;
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
    // On Mac, only respond to wheel events during explicit pinch (e.ctrlKey) or if gesture is active
    // This prevents two-finger scroll from triggering zoom
    if (isMac && !e.ctrlKey && !isGesturing) {
      return; // Ignore regular scroll on Mac trackpad
    }

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

// Consolidated drag functionality
// Handles all dragging behavior: components, arrows, and rotation handles

import { screenToSVG, snapToGrid, updateCanvasViewBox } from './viewportManager.js';
import { componentState, updateComponentPosition, updateComponentRotation, getSelectedComponent, setSelectedComponent } from './componentManager.js';
import { componentDimensions } from './components.js';
import { ANGLE_SNAP_INCREMENT, ROTATION_SNAP_INCREMENT, ARROW_TIP_SNAP_SIZE, GRID_SIZE } from './constants.js';
import { snapAngle } from './utils/mathUtils.js';

// Component drag state
let draggingElement = null;
let offsetX = 0;
let offsetY = 0;

// Start dragging a component
export function startDrag(e) {
    draggingElement = e.currentTarget;
    const transform = draggingElement.getAttribute("transform");
    const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
    const [x, y] = [parseFloat(match[1]), parseFloat(match[2])];
    
    const cursorpt = screenToSVG(e.clientX, e.clientY);
    
    offsetX = cursorpt.x - x;
    offsetY = cursorpt.y - y;
    
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", stopDrag);
    
    // Deselect previous component and remove its arrow/rotation handle immediately
    const selectedComponent = getSelectedComponent();
    if (selectedComponent && selectedComponent !== e.currentTarget) {
        const prevId = selectedComponent.getAttribute('data-id');
        componentState[prevId].selected = false;
        showHitbox(selectedComponent, false);
        removeArrowFromComponent(selectedComponent);
        setSelectedComponent(null);
    }
}

// Handle drag movement
export function drag(e) {
    if (!draggingElement) return;
    
    const cursorpt = screenToSVG(e.clientX, e.clientY);
    
    // Get component type and dimensions to find center point
    const componentType = draggingElement.getAttribute('data-type');
    const componentId = draggingElement.getAttribute('data-id');
    const dims = componentState[componentId]?.dimensions || componentDimensions[componentType];
    
    if (!dims) return;
    
    // Calculate the raw SVG position (where the cursor wants to place the component origin)
    const rawSvgX = cursorpt.x - offsetX;
    const rawSvgY = cursorpt.y - offsetY;
    
    // Calculate where the center point would be with this SVG position
    const centerX = rawSvgX + dims.centerPoint.x;
    const centerY = rawSvgY + dims.centerPoint.y;
    
    // Snap the center point to the grid
    const snappedCenter = snapToGrid(centerX, centerY, GRID_SIZE);
    
    // Calculate the SVG position that would place the center at the snapped location
    const snappedSvgX = snappedCenter.x - dims.centerPoint.x;
    const snappedSvgY = snappedCenter.y - dims.centerPoint.y;
    
    updateComponentPosition(draggingElement, snappedSvgX, snappedSvgY);
    
    // Update arrow for the dragged component (dynamic import to avoid circular dependency)
    import('./arrowDisplay.js').then(({ showArrowForComponent }) => {
        showArrowForComponent(draggingElement);
    });
    
    // Update trace lines if they're shown (dynamic import to avoid circular dependencies)
    import('./traceLines.js').then(({ showTraceLines, drawTraceLines }) => {
        if (showTraceLines) {
            drawTraceLines();
        }
    });
}

// Stop dragging
export function stopDrag() {
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);
    draggingElement = null;
}

// Arrow handle dragging
export function makeArrowHandleDraggable(handle, line, state) {
    let draggingArrow = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    handle.addEventListener("mousedown", function(e) {
        e.stopPropagation();
        draggingArrow = true;
        
        // Get mouse position in SVG coordinates
        const cursorpt = screenToSVG(e.clientX, e.clientY);
        
        // Set drag offsets for smooth dragging
        dragOffsetX = cursorpt.x - state.arrowX;
        dragOffsetY = cursorpt.y - state.arrowY;
        document.addEventListener("mousemove", dragArrowHandle);
        document.addEventListener("mouseup", stopDragArrowHandle);
    });
    
    function dragArrowHandle(e) {
        if (!draggingArrow) return;
        const cursorpt = screenToSVG(e.clientX, e.clientY);
        
        // Snap cursor position to grid instead of snapping angle
        const snappedPosition = snapToGrid(cursorpt.x, cursorpt.y, ARROW_TIP_SNAP_SIZE);
        
        // Update arrow line and handle to snapped position
        line.setAttribute("x2", snappedPosition.x);
        line.setAttribute("y2", snappedPosition.y);
        handle.setAttribute("cx", snappedPosition.x);
        handle.setAttribute("cy", snappedPosition.y);
        
        // Calculate and log the resulting angle for debugging
        const startX = parseFloat(line.getAttribute("x1"));
        const startY = parseFloat(line.getAttribute("y1"));
        const dx = snappedPosition.x - startX;
        const dy = snappedPosition.y - startY;
        const resultingAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        console.log(`Arrow tip snapped to: (${snappedPosition.x}, ${snappedPosition.y}), resulting angle: ${resultingAngle.toFixed(1)}°`);
    }
    
    function stopDragArrowHandle() {
        draggingArrow = false;
        document.removeEventListener("mousemove", dragArrowHandle);
        document.removeEventListener("mouseup", stopDragArrowHandle);
        
        // Store the final position as the new arrow endpoint
        const finalX = parseFloat(line.getAttribute("x2"));
        const finalY = parseFloat(line.getAttribute("y2"));
        state.arrowX = finalX;
        state.arrowY = finalY;
    }
}

// Rotation handle dragging
export function makeRotationHandleDraggable(rotationHandle, component, centerX, centerY) {
    let draggingRotation = false;
    
    rotationHandle.addEventListener("mousedown", function(e) {
        e.stopPropagation();
        draggingRotation = true;
        document.addEventListener("mousemove", dragRotationHandle);
        document.addEventListener("mouseup", stopDragRotationHandle);
    });
    
    function dragRotationHandle(e) {
        if (!draggingRotation) return;
        const cursorpt = screenToSVG(e.clientX, e.clientY);
        
        // Calculate angle from center to cursor
        const dx = cursorpt.x - centerX;
        const dy = cursorpt.y - centerY;
        let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        
        // Snap to configured degree increments
        angle = snapAngle(angle, ROTATION_SNAP_INCREMENT);
        
        updateComponentRotation(component, angle);
        
        // Show angle display
        showAngleDisplay(centerX, centerY, angle);
        
        // Update arrow and hitbox
        import('./arrowDisplay.js').then(({ showArrowForComponent }) => {
            showArrowForComponent(component);
        });
        showHitbox(component, true);
    }
    
    function stopDragRotationHandle() {
        draggingRotation = false;
        document.removeEventListener("mousemove", dragRotationHandle);
        document.removeEventListener("mouseup", stopDragRotationHandle);
        hideAngleDisplay();
    }
}

// Remove arrow from component (helper function to avoid circular imports)
function removeArrowFromComponent(component) {
    if (!component) return; // Guard against null/undefined component
    
    const svg = document.getElementById("canvas");
    const arrow = svg.querySelector(`#arrow-preview-${component.getAttribute('data-id')}`);
    if (arrow) arrow.remove();
}

// Generic drag handler utility for future extensibility
export function createDragHandler(element, options = {}) {
    const {
        onStart = () => {},
        onDrag = () => {},
        onEnd = () => {},
        preventDefault = true
    } = options;
    
    let dragging = false;
    
    element.addEventListener("mousedown", (e) => {
        if (preventDefault) e.stopPropagation();
        dragging = true;
        onStart(e);
        document.addEventListener("mousemove", handleDrag);
        document.addEventListener("mouseup", handleEnd);
    });
    
    function handleDrag(e) {
        if (!dragging) return;
        onDrag(e);
    }
    
    function handleEnd(e) {
        dragging = false;
        document.removeEventListener("mousemove", handleDrag);
        document.removeEventListener("mouseup", handleEnd);
        onEnd(e);
    }
}

// Show/hide component hitbox
export function showHitbox(component, show) {
    const hitArea = component.querySelector('.component-hit-area');
    if (hitArea) {
        hitArea.setAttribute('visibility', show ? 'visible' : 'hidden');
    }
}

// Show angle display during rotation
export function showAngleDisplay(x, y, angle) {
    const svg = document.getElementById("canvas");
    
    // Remove existing angle display
    hideAngleDisplay();
    
    // Create angle display group
    const angleDisplay = document.createElementNS("http://www.w3.org/2000/svg", "g");
    angleDisplay.setAttribute("id", "angle-display");
    
    // Background circle
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bg.setAttribute("cx", x);
    bg.setAttribute("cy", y - 70);
    bg.setAttribute("r", "25");
    bg.setAttribute("fill", "rgba(0, 0, 0, 0.8)");
    bg.setAttribute("stroke", "#fbc02d");
    bg.setAttribute("stroke-width", "2");
    angleDisplay.appendChild(bg);
    
    // Angle text
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y - 65);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-family", "Arial, sans-serif");
    text.setAttribute("font-size", "14");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("fill", "white");
    text.textContent = `${Math.round(angle)}°`;
    angleDisplay.appendChild(text);
    
    svg.appendChild(angleDisplay);
}

// Hide angle display
export function hideAngleDisplay() {
    const svg = document.getElementById("canvas");
    const angleDisplay = svg.querySelector("#angle-display");
    if (angleDisplay) {
        angleDisplay.remove();
    }
}
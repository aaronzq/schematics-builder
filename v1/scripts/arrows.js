// Arrow display and management
// Handles arrow creation and positioning (drag functionality moved to dragHandler.js)

import { componentState } from './componentManager.js';
import { componentDimensions } from './components.js';
import { makeArrowHandleDraggable, makeRotationHandleDraggable } from './interactionHandler.js';
import { 
    COMPONENT_SPACING, 
    ARROW_COLOR, 
    ARROW_STROKE_WIDTH,
    ARROW_HANDLE_RADIUS,
    ROTATION_HANDLE_DISTANCE,
    ROTATION_HANDLE_RADIUS,
    ROTATION_HANDLE_COLOR,
    ROTATION_HANDLE_STROKE
} from './constants.js';
import { ensureAllMarkers } from './utils/svgUtils.js';

// Show arrow for component with draggable handle and rotation control
export function showArrowForComponent(component) {
    if (!component) {
        // If called with null/undefined, clear any arrow previews on the canvas
        const svg = document.getElementById("canvas");
        if (svg) {
            svg.querySelectorAll('[id^="arrow-preview-"]').forEach(el => el.remove());
        }
        return;
    }
    
    const svg = document.getElementById("canvas");
    if (!svg) return;

    // Remove any existing arrow previews (from other components)
    svg.querySelectorAll('[id^="arrow-preview-"]').forEach(el => el.remove());
    
    // Get persistent state
    const compId = component.getAttribute('data-id');
    const type = component.getAttribute('data-type');
    const state = componentState[compId];
    if (!state) return;

    // Get component dimensions for centerPoint
    const dims = componentDimensions[type];
    if (!dims) return;

    // Calculate arrow start position from centerPoint (in world coordinates)
    const centerX = state.posX; // posX now stores center X coordinate directly
    const centerY = state.posY; // posY now stores center Y coordinate directly
    const rotation = state.rotation;

    // Always use the latest stored arrow endpoint for initial arrow position
    if (typeof state.arrowX !== "number" || typeof state.arrowY !== "number") {
        state.arrowX = centerX + COMPONENT_SPACING;
        state.arrowY = centerY;
    }
    let targetX = state.arrowX;
    let targetY = state.arrowY;

    // Draw arrow group
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "g");
    arrow.setAttribute("id", `arrow-preview-${compId}`);
    
    // Main line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", centerX);
    line.setAttribute("y1", centerY);
    line.setAttribute("x2", targetX);
    line.setAttribute("y2", targetY);
    line.setAttribute("stroke", ARROW_COLOR);
    line.setAttribute("stroke-width", ARROW_STROKE_WIDTH);
    line.setAttribute("marker-end", "url(#arrowhead)");
    arrow.appendChild(line);
    
    // Draggable handle at arrow end
    const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    handle.setAttribute("cx", targetX);
    handle.setAttribute("cy", targetY);
    handle.setAttribute("r", ARROW_HANDLE_RADIUS);
    handle.setAttribute("fill", "#fff");
    handle.setAttribute("stroke", ARROW_COLOR);
    handle.setAttribute("stroke-width", "2");
    handle.setAttribute("cursor", "pointer");
    handle.setAttribute("id", `arrow-handle-${compId}`);
    arrow.appendChild(handle);

    // Rotation handle (only if selected)
    if (state.selected) {
        const rotationHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        // Place handle at specified distance from center (relative to rotation)
        // Calculate rotated position relative to centerPoint
        const angleRad = rotation * Math.PI / 180;
        const rx = centerX + ROTATION_HANDLE_DISTANCE * Math.cos(angleRad - Math.PI/2);
        const ry = centerY + ROTATION_HANDLE_DISTANCE * Math.sin(angleRad - Math.PI/2);
        rotationHandle.setAttribute("cx", rx);
        rotationHandle.setAttribute("cy", ry);
        rotationHandle.setAttribute("r", ROTATION_HANDLE_RADIUS);
        rotationHandle.setAttribute("fill", ROTATION_HANDLE_COLOR);
        rotationHandle.setAttribute("stroke", ROTATION_HANDLE_STROKE);
        rotationHandle.setAttribute("stroke-width", "2");
        rotationHandle.setAttribute("cursor", "grab");
        rotationHandle.setAttribute("id", `rotation-handle-${compId}`);
        arrow.appendChild(rotationHandle);

        // Add rotation handle drag functionality
        makeRotationHandleDraggable(rotationHandle, component, centerX, centerY);
    }

    // Ensure arrowhead marker exists
    ensureAllMarkers(svg);
    
    svg.appendChild(arrow);
    
    // Add arrow handle drag functionality
    makeArrowHandleDraggable(handle, line, state);
}

// Remove arrow from component
export function removeArrowFromComponent(component) {
    if (!component) return; // Guard against null/undefined component
    
    const svg = document.getElementById("canvas");
    const arrow = svg.querySelector(`#arrow-preview-${component.getAttribute('data-id')}`);
    if (arrow) arrow.remove();
}

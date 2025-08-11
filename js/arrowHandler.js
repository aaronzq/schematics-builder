// Arrow display and management
// Handles arrow creation and positioning (drag functionality moved to dragHandler.js)

import { componentState } from './componentManager.js';
import { makeArrowHandleDraggable, makeRotationHandleDraggable } from './dragHandler.js';

const COMPONENT_SPACING = 150;

// Show arrow for component with draggable handle and rotation control
export function showArrowForComponent(component) {
    removeArrowFromComponent(component); // Remove any existing arrow for this component
    const svg = document.getElementById("canvas");
    
    // Get persistent state
    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    if (!state) return;

    const centerX = state.posX;
    const centerY = state.posY;
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
    line.setAttribute("stroke", "#2196F3");
    line.setAttribute("stroke-width", "3");
    line.setAttribute("marker-end", "url(#arrowhead)");
    arrow.appendChild(line);
    
    // Draggable handle at arrow end
    const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    handle.setAttribute("cx", targetX);
    handle.setAttribute("cy", targetY);
    handle.setAttribute("r", "10");
    handle.setAttribute("fill", "#fff");
    handle.setAttribute("stroke", "#2196F3");
    handle.setAttribute("stroke-width", "2");
    handle.setAttribute("cursor", "pointer");
    handle.setAttribute("id", `arrow-handle-${compId}`);
    arrow.appendChild(handle);

    // Rotation handle (only if selected)
    if (state.selected) {
        const rotationHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        // Place handle 40px above center (relative to rotation)
        const handleRadius = 12;
        const handleDistance = 40;
        // Calculate rotated position
        const angleRad = rotation * Math.PI / 180;
        const rx = centerX + handleDistance * Math.cos(angleRad - Math.PI/2);
        const ry = centerY + handleDistance * Math.sin(angleRad - Math.PI/2);
        rotationHandle.setAttribute("cx", rx);
        rotationHandle.setAttribute("cy", ry);
        rotationHandle.setAttribute("r", handleRadius);
        rotationHandle.setAttribute("fill", "#ffe082");
        rotationHandle.setAttribute("stroke", "#fbc02d");
        rotationHandle.setAttribute("stroke-width", "2");
        rotationHandle.setAttribute("cursor", "grab");
        rotationHandle.setAttribute("id", `rotation-handle-${compId}`);
        arrow.appendChild(rotationHandle);

        // Add rotation handle drag functionality
        makeRotationHandleDraggable(rotationHandle, component, centerX, centerY);
    }

    // Ensure arrowhead marker exists
    _ensureArrowheadMarker(svg);
    
    svg.appendChild(arrow);
    
    // Add arrow handle drag functionality
    makeArrowHandleDraggable(handle, line, state);
}

// Remove arrow from component
export function removeArrowFromComponent(component) {
    const svg = document.getElementById("canvas");
    const arrow = svg.querySelector(`#arrow-preview-${component.getAttribute('data-id')}`);
    if (arrow) arrow.remove();
}

// Private helper functions
function _ensureArrowheadMarker(svg) {
    let defs = svg.querySelector("defs");
    if (!defs) {
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        svg.insertBefore(defs, svg.firstChild);
    }
    if (!svg.querySelector("#arrowhead")) {
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", "arrowhead");
        marker.setAttribute("markerWidth", "10");
        marker.setAttribute("markerHeight", "7");
        marker.setAttribute("refX", "10");
        marker.setAttribute("refY", "3.5");
        marker.setAttribute("orient", "auto");
        marker.setAttribute("markerUnits", "strokeWidth");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M0,0 L10,3.5 L0,7 Z");
        path.setAttribute("fill", "#2196F3");
        marker.appendChild(path);
        defs.appendChild(marker);
    }
}

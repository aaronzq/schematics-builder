// Trace lines visualization
// Handles drawing dotted lines connecting components to show optical path

import { componentState } from './componentManager.js';
import { componentDimensions } from './components.js';

// Trace line settings
export let showTraceLines = true;

// Show trace lines connecting parent-child relationships
export function drawTraceLines() {
    const svg = document.getElementById("canvas");
    
    // Remove existing trace lines
    hideTraceLines();
    
    // Create trace lines group
    const traceLinesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    traceLinesGroup.setAttribute("id", "trace-lines");
    
    // Helper function to transform local component coordinates to global canvas coordinates
    function transformToGlobal(localX, localY, state) {
        // Apply rotation transformation around centerPoint
        const rotation = (state.rotation || 0) * Math.PI / 180; // Convert to radians
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        // Rotate point around centerPoint
        const rotatedX = localX * cos - localY * sin;
        const rotatedY = localX * sin + localY * cos;
        
        // Translate to world position
        return {
            x: state.posX + rotatedX,
            y: state.posY + rotatedY
        };
    }
    
    // Simple approach: iterate through all components and connect to parent if exists
    for (const compId in componentState) {
        const state = componentState[compId];
        
        // Skip if this component has no parent (root component)
        if (state.parentId === null) continue;
        
        const parentState = componentState[state.parentId];
        if (!parentState) continue;
        
        // Get component dimensions for both child and parent (use stored dimensions, not original)
        const childDims = state.dimensions;  // Use actual dimensions stored (flipped or normal)
        const parentDims = parentState.dimensions;  // Use actual dimensions stored (flipped or normal)
        
        if (!childDims || !parentDims) continue;
        
        // Calculate global positions for child
        const childCenter = transformToGlobal(childDims.centerPoint.x, childDims.centerPoint.y, state);
        const childUpper = transformToGlobal(childDims.aperturePoints.upper.x, childDims.aperturePoints.upper.y, state);
        const childLower = transformToGlobal(childDims.aperturePoints.lower.x, childDims.aperturePoints.lower.y, state);
        
        // Calculate global positions for parent
        const parentCenter = transformToGlobal(parentDims.centerPoint.x, parentDims.centerPoint.y, parentState);
        const parentUpper = transformToGlobal(parentDims.aperturePoints.upper.x, parentDims.aperturePoints.upper.y, parentState);
        const parentLower = transformToGlobal(parentDims.aperturePoints.lower.x, parentDims.aperturePoints.lower.y, parentState);
        
        // Draw black dotted line between centerPoints
        const centerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        centerLine.setAttribute("x1", parentCenter.x);
        centerLine.setAttribute("y1", parentCenter.y);
        centerLine.setAttribute("x2", childCenter.x);
        centerLine.setAttribute("y2", childCenter.y);
        centerLine.setAttribute("stroke", "black");
        centerLine.setAttribute("stroke-width", "1");
        centerLine.setAttribute("stroke-dasharray", "5,5");
        centerLine.setAttribute("pointer-events", "none");
        traceLinesGroup.appendChild(centerLine);
        
        // Connect upper aperture point to upper aperture point (by name, not spatial position)
        const upperLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        upperLine.setAttribute("x1", parentUpper.x);
        upperLine.setAttribute("y1", parentUpper.y);
        upperLine.setAttribute("x2", childUpper.x);
        upperLine.setAttribute("y2", childUpper.y);
        upperLine.setAttribute("stroke", "blue");
        upperLine.setAttribute("stroke-width", "1");
        upperLine.setAttribute("stroke-dasharray", "3,3");
        upperLine.setAttribute("pointer-events", "none");
        traceLinesGroup.appendChild(upperLine);
        
        // Connect lower aperture point to lower aperture point (by name, not spatial position)
        const lowerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lowerLine.setAttribute("x1", parentLower.x);
        lowerLine.setAttribute("y1", parentLower.y);
        lowerLine.setAttribute("x2", childLower.x);
        lowerLine.setAttribute("y2", childLower.y);
        lowerLine.setAttribute("stroke", "blue");
        lowerLine.setAttribute("stroke-width", "1");
        lowerLine.setAttribute("stroke-dasharray", "3,3");
        lowerLine.setAttribute("pointer-events", "none");
        traceLinesGroup.appendChild(lowerLine);
    }
    
    // Insert trace lines before components so they appear behind
    const componentsGroup = document.getElementById("components");
    svg.insertBefore(traceLinesGroup, componentsGroup);
}

// Hide trace lines
export function hideTraceLines() {
    const svg = document.getElementById("canvas");
    const traceLinesGroup = svg.querySelector("#trace-lines");
    if (traceLinesGroup) {
        traceLinesGroup.remove();
    }
}

// Toggle trace lines
export function toggleTraceLines() {
    showTraceLines = !showTraceLines;
    const traceBtn = document.getElementById('trace-btn');
    
    if (showTraceLines) {
        drawTraceLines();
        traceBtn.textContent = 'Hide Trace Line';
    } else {
        hideTraceLines();
        traceBtn.textContent = 'Show Trace Line';
    }
}

// Helper function to check if aperture lines cross between a component and its parent
export function doApertureLinessCross(componentId) {
    const state = componentState[componentId];
    
    // Return false if component has no parent or invalid state
    if (!state || state.parentId === null) return false;
    
    const parentState = componentState[state.parentId];
    if (!parentState) return false;
    
    // Get component orientations
    const childDims = state.dimensions;
    const parentDims = parentState.dimensions;
    
    if (!childDims || !parentDims) return false;
    
    // Helper function to transform local component coordinates to global canvas coordinates
    function transformToGlobal(localX, localY, componentState) {
        const rotation = (componentState.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        const rotatedX = localX * cos - localY * sin;
        const rotatedY = localX * sin + localY * cos;
        
        return {
            x: componentState.posX + rotatedX,
            y: componentState.posY + rotatedY
        };
    }
    
    // Calculate global positions for child and parent aperture points
    const childUpper = transformToGlobal(childDims.aperturePoints.upper.x, childDims.aperturePoints.upper.y, state);
    const childLower = transformToGlobal(childDims.aperturePoints.lower.x, childDims.aperturePoints.lower.y, state);
    const parentUpper = transformToGlobal(parentDims.aperturePoints.upper.x, parentDims.aperturePoints.upper.y, parentState);
    const parentLower = transformToGlobal(parentDims.aperturePoints.lower.x, parentDims.aperturePoints.lower.y, parentState);
    
    // Check if the aperture lines cross by using line intersection logic
    // Line 1: parentUpper to childUpper
    // Line 2: parentLower to childLower
    // Lines cross if they intersect between their endpoints
    
    // Calculate intersection point using parametric line equations
    const x1 = parentUpper.x, y1 = parentUpper.y;
    const x2 = childUpper.x, y2 = childUpper.y;
    const x3 = parentLower.x, y3 = parentLower.y;
    const x4 = childLower.x, y4 = childLower.y;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    // Lines are parallel if denominator is 0
    if (Math.abs(denom) < 1e-10) return false;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    // Lines intersect within their segments if both t and u are between 0 and 1
    const linesIntersect = (t >= 0 && t <= 1 && u >= 0 && u <= 1);
    
    return linesIntersect;
}

// Update trace lines if they are currently visible
export function updateTraceLines() {
    if (showTraceLines) {
        drawTraceLines();
    }
}

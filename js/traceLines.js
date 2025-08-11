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
    
    // Track which connections we've already drawn to avoid duplicates
    const drawnConnections = new Set();
    
    // Function to draw a line between parent and child components
    function drawLine(parentId, childId) {
        const parentState = componentState[parentId];
        const childState = componentState[childId];
        
        if (!parentState || !childState) return;
        
        // Get component dimensions for centerPoint calculations
        const parentDims = componentDimensions[parentState.type];
        const childDims = componentDimensions[childState.type];
        
        if (!parentDims || !childDims) return;
        
        // Create a unique connection identifier (sorted to avoid duplicates)
        const connectionKey = [parentId, childId].sort().join('-');
        
        // Skip if we've already drawn this connection
        if (drawnConnections.has(connectionKey)) return;
        drawnConnections.add(connectionKey);
        
        // Helper function to transform local component coordinates to global canvas coordinates
        function transformToGlobal(localX, localY, state, dims) {
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
        
        // Calculate centerPoint positions for both components (transformed to global)
        const parentCenter = transformToGlobal(parentDims.centerPoint.x, parentDims.centerPoint.y, parentState, parentDims);
        const childCenter = transformToGlobal(childDims.centerPoint.x, childDims.centerPoint.y, childState, childDims);
        
        // Draw dotted line between component centerPoints
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
        
        // Calculate aperture point positions for both components (transformed to global)
        const parentUpper = transformToGlobal(parentDims.aperturePoints.upper.x, parentDims.aperturePoints.upper.y, parentState, parentDims);
        const childUpper = transformToGlobal(childDims.aperturePoints.upper.x, childDims.aperturePoints.upper.y, childState, childDims);
        
        const parentLower = transformToGlobal(parentDims.aperturePoints.lower.x, parentDims.aperturePoints.lower.y, parentState, parentDims);
        const childLower = transformToGlobal(childDims.aperturePoints.lower.x, childDims.aperturePoints.lower.y, childState, childDims);
        
        // Draw dotted line between upper aperture points
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
        
        // Draw dotted line between lower aperture points
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
    
    // Draw lines from each parent to all of its children
    for (const compId in componentState) {
        const state = componentState[compId];
        const parentId = parseInt(compId);
        
        // Draw lines to all children of this component
        if (state.children && state.children.length > 0) {
            state.children.forEach(childId => {
                drawLine(parentId, childId);
            });
        }
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

// Update trace lines if they are currently visible
export function updateTraceLines() {
    if (showTraceLines) {
        drawTraceLines();
    }
}

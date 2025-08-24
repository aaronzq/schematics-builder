// Trace lines visualization
// Handles drawing dotted lines connecting components to show optical path

import { componentState } from './componentManager.js';
import { componentDimensions } from './components.js';
import { transformToGlobal } from './utils/mathUtils.js';
import { showApertureRays, drawApertureRays, hideApertureRays } from './rays.js';

// Trace line settings
export let showTraceLines = true;

// Show center trace lines connecting parent-child relationships
export function drawCenterTraceLines() {
    const svg = document.getElementById("canvas");
    
    // Remove existing center trace lines
    hideCenterTraceLines();
    
    // Create center trace lines group
    const centerLinesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    centerLinesGroup.setAttribute("id", "center-trace-lines");
    
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
        
        // Calculate global positions for child and parent centers
        const childCenter = transformToGlobal(childDims.centerPoint.x, childDims.centerPoint.y, state);
        const parentCenter = transformToGlobal(parentDims.centerPoint.x, parentDims.centerPoint.y, parentState);
        
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
        centerLinesGroup.appendChild(centerLine);
    }
    
    // Insert center lines before components so they appear behind
    const componentsGroup = document.getElementById("components");
    svg.insertBefore(centerLinesGroup, componentsGroup);
}

// Legacy function that draws both center lines and aperture rays (for backward compatibility)
export function drawTraceLines() {
    if (showTraceLines) {
        drawCenterTraceLines();
    }
    if (showApertureRays) {
        drawApertureRays();
    }
}

// Hide center trace lines
export function hideCenterTraceLines() {
    const svg = document.getElementById("canvas");
    const centerLinesGroup = svg.querySelector("#center-trace-lines");
    if (centerLinesGroup) {
        centerLinesGroup.remove();
    }
}

// Legacy function that hides both (for backward compatibility)
export function hideTraceLines() {
    hideCenterTraceLines();
    hideApertureRays();
}

// Toggle center trace lines
export function toggleTraceLines() {
    showTraceLines = !showTraceLines;
    const traceBtn = document.getElementById('trace-btn');
    
    if (showTraceLines) {
        drawCenterTraceLines();
        traceBtn.textContent = 'Hide Trace Line';
    } else {
        hideCenterTraceLines();
        traceBtn.textContent = 'Show Trace Line';
    }
}

// Update trace lines if they are currently visible
export function updateTraceLines() {
    if (showTraceLines) {
        drawCenterTraceLines();
    }
    if (showApertureRays) {
        drawApertureRays();
    }
}



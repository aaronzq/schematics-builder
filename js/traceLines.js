// Trace lines visualization
// Handles drawing dotted lines connecting components to show optical path

import { componentState } from './componentManager.js';

// Trace line settings
export let showTraceLines = false;

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
        
        // Create a unique connection identifier (sorted to avoid duplicates)
        const connectionKey = [parentId, childId].sort().join('-');
        
        // Skip if we've already drawn this connection
        if (drawnConnections.has(connectionKey)) return;
        drawnConnections.add(connectionKey);
        
        // Draw dotted line between component centers
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", parentState.posX);
        line.setAttribute("y1", parentState.posY);
        line.setAttribute("x2", childState.posX);
        line.setAttribute("y2", childState.posY);
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("stroke-dasharray", "5,5");
        line.setAttribute("pointer-events", "none");
        
        traceLinesGroup.appendChild(line);
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

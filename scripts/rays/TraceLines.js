import { componentManager } from '../components/ComponentManager.js';

// Trace line settings
export let showTraceLines = true;

// Draw trace lines connecting all parent-child relationships in the scene
export function drawTraceLines() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;
    
    // Create trace lines group if it doesn't exist
    let traceLinesGroup = document.getElementById("trace-lines-group");
    if (!traceLinesGroup) {
        traceLinesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        traceLinesGroup.setAttribute("id", "trace-lines-group");
        
        // Insert before components so they appear behind
        const componentsGroup = document.getElementById("schematics"); // or components group
        if (componentsGroup) {
             canvas.insertBefore(traceLinesGroup, componentsGroup);
        } else {
             canvas.appendChild(traceLinesGroup);
        }
    }
    
    // Clear existing trace lines
    while (traceLinesGroup.firstChild) {
        traceLinesGroup.removeChild(traceLinesGroup.firstChild);
    }
    
    if (!showTraceLines) return;
    
    // Iterate through all components
    componentManager.components.forEach((component) => {
        // Skip if this component has no parent
        if (component.parent === null) return;
        
        const parentComponent = componentManager.getComponent(component.parent);
        if (!parentComponent) return;
        
        // Get aperture centers in world space
        const childCenter = component.getApertureCenterWorld();
        const parentCenter = parentComponent.getApertureCenterWorld();
        
        // Draw black dotted line between aperture centers
        const traceLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        traceLine.setAttribute("x1", parentCenter.x);
        traceLine.setAttribute("y1", parentCenter.y);
        traceLine.setAttribute("x2", childCenter.x);
        traceLine.setAttribute("y2", childCenter.y);
        traceLine.setAttribute("stroke", "black");
        traceLine.setAttribute("stroke-width", "1");
        traceLine.setAttribute("stroke-dasharray", "5,5");
        traceLine.setAttribute("pointer-events", "none");
        traceLinesGroup.appendChild(traceLine);
    });
}

export function hideTraceLines() {
    const traceLinesGroup = document.getElementById("trace-lines-group");
    if (traceLinesGroup) {
        // Clear children
         while (traceLinesGroup.firstChild) {
            traceLinesGroup.removeChild(traceLinesGroup.firstChild);
        }
    }
}

// Toggle trace lines
export function toggleTraceLines() {
    showTraceLines = !showTraceLines;
    const traceBtn = document.getElementById('trace-btn');
    
    if (showTraceLines) {
        drawTraceLines();
        traceBtn.textContent = 'Hide Trace';
    } else {
        hideTraceLines();
        traceBtn.textContent = 'Show Trace';
    }
}

// Update trace lines if they are currently visible
export function updateTraceLines() {
    if (showTraceLines) {
        drawTraceLines();
    }
}
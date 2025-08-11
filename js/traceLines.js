// Trace lines visualization
// Handles drawing dotted lines connecting components to show optical path

import { componentState } from './componentManager.js';
import { componentDimensions } from './components.js';
import { transformToGlobal } from './utils/mathUtils.js';

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

/**
 * Calculate aperture radius projections onto the vertical direction of center trace line
 * @param {HTMLElement} component - The component element
 * @returns {Object|null} - Object containing projections for both component and parent, or null if no parent
 */
export function calculateApertureProjections(component) {
    if (!component) return null;
    
    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    
    if (!state || state.parentId === null) {
        console.warn('Component has no parent - cannot calculate aperture projections');
        return null;
    }
    
    const parentState = componentState[state.parentId];
    if (!parentState) {
        console.warn('Parent state not found');
        return null;
    }
    
    // Get component dimensions (use stored dimensions, not original)
    const childDims = state.dimensions;
    const parentDims = parentState.dimensions;
    
    if (!childDims || !parentDims) {
        console.warn('Component dimensions not found');
        return null;
    }
    
    // Calculate global center positions
    const childCenter = transformToGlobal(childDims.centerPoint.x, childDims.centerPoint.y, state);
    const parentCenter = transformToGlobal(parentDims.centerPoint.x, parentDims.centerPoint.y, parentState);
    
    // Calculate center trace line direction vector
    const traceDx = childCenter.x - parentCenter.x;
    const traceDy = childCenter.y - parentCenter.y;
    const traceLength = Math.sqrt(traceDx * traceDx + traceDy * traceDy);
    
    if (traceLength === 0) {
        console.warn('Components are at the same position - cannot calculate projections');
        return null;
    }
    
    // Normalize the trace line direction vector
    const traceUnitX = traceDx / traceLength;
    const traceUnitY = traceDy / traceLength;
    
    // Calculate perpendicular (vertical) direction to the trace line
    // Perpendicular vector is (-dy, dx) normalized
    const perpUnitX = -traceUnitY;
    const perpUnitY = traceUnitX;
    
    // For each component, calculate the projection of aperture radius onto perpendicular direction
    // This means: how much of the aperture radius extends in the direction perpendicular to the center line
    
    // Get aperture radius values
    const childApertureRadius = childDims.apertureRadius || 0;
    const parentApertureRadius = parentDims.apertureRadius || 0;
    
    // Calculate aperture vector directions for both components
    // The aperture extends in the upVector direction, so we need to project upVector onto perpendicular
    const childUpVector = childDims.upVector;
    const parentUpVector = parentDims.upVector;
    
    // Transform upVectors to global coordinates (accounting for rotation)
    const childGlobalUpX = childUpVector.x * Math.cos(state.rotation * Math.PI / 180) - 
                          childUpVector.y * Math.sin(state.rotation * Math.PI / 180);
    const childGlobalUpY = childUpVector.x * Math.sin(state.rotation * Math.PI / 180) + 
                          childUpVector.y * Math.cos(state.rotation * Math.PI / 180);
    
    const parentGlobalUpX = parentUpVector.x * Math.cos(parentState.rotation * Math.PI / 180) - 
                           parentUpVector.y * Math.sin(parentState.rotation * Math.PI / 180);
    const parentGlobalUpY = parentUpVector.x * Math.sin(parentState.rotation * Math.PI / 180) + 
                           parentUpVector.y * Math.cos(parentState.rotation * Math.PI / 180);
    
    // Calculate projections: dot product of normalized upVector with perpendicular direction
    const childUpProjection = Math.abs(childGlobalUpX * perpUnitX + childGlobalUpY * perpUnitY);
    const parentUpProjection = Math.abs(parentGlobalUpX * perpUnitX + parentGlobalUpY * perpUnitY);
    
    // Calculate final aperture projections (aperture radius * projection factor)
    const childApertureProjection = childApertureRadius * childUpProjection;
    const parentApertureProjection = parentApertureRadius * parentUpProjection;
    
    const result = {
        centerTraceInfo: {
            parentCenter: { x: parentCenter.x, y: parentCenter.y },
            childCenter: { x: childCenter.x, y: childCenter.y },
            direction: { x: traceUnitX, y: traceUnitY },
            perpendicular: { x: perpUnitX, y: perpUnitY },
            length: traceLength
        },
        child: {
            componentId: parseInt(compId),
            componentType: state.type,
            apertureRadius: childApertureRadius,
            upVectorGlobal: { x: childGlobalUpX, y: childGlobalUpY },
            upProjectionFactor: childUpProjection,
            apertureProjection: childApertureProjection
        },
        parent: {
            componentId: state.parentId,
            componentType: parentState.type,
            apertureRadius: parentApertureRadius,
            upVectorGlobal: { x: parentGlobalUpX, y: parentGlobalUpY },
            upProjectionFactor: parentUpProjection,
            apertureProjection: parentApertureProjection
        }
    };
    
    // console.log('Aperture Projections Calculation:');
    // console.log(`  Center trace line: (${parentCenter.x.toFixed(1)}, ${parentCenter.y.toFixed(1)}) → (${childCenter.x.toFixed(1)}, ${childCenter.y.toFixed(1)})`);
    // console.log(`  Trace direction: (${traceUnitX.toFixed(3)}, ${traceUnitY.toFixed(3)}), Length: ${traceLength.toFixed(1)}`);
    // console.log(`  Perpendicular direction: (${perpUnitX.toFixed(3)}, ${perpUnitY.toFixed(3)})`);
    // console.log(`  Child (${state.type}): Radius=${childApertureRadius}, Projection=${childApertureProjection.toFixed(2)}`);
    // console.log(`  Parent (${parentState.type}): Radius=${parentApertureRadius}, Projection=${parentApertureProjection.toFixed(2)}`);
    
    return result;
}

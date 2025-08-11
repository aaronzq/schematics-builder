// Aperture rays visualization
// Handles drawing blue dashed lines connecting aperture points between components

import { componentState } from './componentManager.js';
import { transformToGlobal } from './utils/mathUtils.js';

// Import will be added when the module is loaded to avoid circular dependencies
let hideRayShapeMenu = null;
let showRayShapeMenu = null;
let shouldShowRayShapeMenu = null;
let getSelectedComponent = null;

// Initialize ray shape menu functions (called from eventHandler after modules load)
export function initRayShapeMenuIntegration(hideMenu, showMenu, shouldShow, getSelected) {
    hideRayShapeMenu = hideMenu;
    showRayShapeMenu = showMenu;
    shouldShowRayShapeMenu = shouldShow;
    getSelectedComponent = getSelected;
}

// Aperture rays settings
export let showApertureRays = true;
export let rayDisplayMode = 'both'; // 'both', 'dotted', 'solid'

// Show aperture ray lines connecting parent-child relationships
export function drawApertureRays() {
    const svg = document.getElementById("canvas");
    
    // Remove existing aperture rays
    hideApertureRays();
    
    // Create aperture rays group
    const rayLinesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    rayLinesGroup.setAttribute("id", "aperture-rays");
    
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
        
        // Calculate global positions for aperture points and center points
        const childUpper = transformToGlobal(childDims.aperturePoints.upper.x, childDims.aperturePoints.upper.y, state);
        const childLower = transformToGlobal(childDims.aperturePoints.lower.x, childDims.aperturePoints.lower.y, state);
        const childCenter = transformToGlobal(childDims.centerPoint.x, childDims.centerPoint.y, state);
        const parentUpper = transformToGlobal(parentDims.aperturePoints.upper.x, parentDims.aperturePoints.upper.y, parentState);
        const parentLower = transformToGlobal(parentDims.aperturePoints.lower.x, parentDims.aperturePoints.lower.y, parentState);
        const parentCenter = transformToGlobal(parentDims.centerPoint.x, parentDims.centerPoint.y, parentState);
        
        // Determine connection points based on child component's ray shape
        let upperRayStart, upperRayEnd, lowerRayStart, lowerRayEnd;
        
        switch (childDims.rayShape) {
            case 'collimated':
                // Parent upper to child upper, parent lower to child lower
                upperRayStart = parentUpper;
                upperRayEnd = childUpper;
                lowerRayStart = parentLower;
                lowerRayEnd = childLower;
                break;
            case 'divergent':
                // Parent center to child upper, parent center to child lower
                upperRayStart = parentCenter;
                upperRayEnd = childUpper;
                lowerRayStart = parentCenter;
                lowerRayEnd = childLower;
                break;
            case 'convergent':
                // Parent upper to child center, parent lower to child center
                upperRayStart = parentUpper;
                upperRayEnd = childCenter;
                lowerRayStart = parentLower;
                lowerRayEnd = childCenter;
                break;
            default:
                // Fallback to collimated behavior
                upperRayStart = parentUpper;
                upperRayEnd = childUpper;
                lowerRayStart = parentLower;
                lowerRayEnd = childLower;
                break;
        }
        
        // Draw solid polygon if mode includes solid
        if (rayDisplayMode === 'solid' || rayDisplayMode === 'both') {
            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const points = `${upperRayStart.x},${upperRayStart.y} ${upperRayEnd.x},${upperRayEnd.y} ${lowerRayEnd.x},${lowerRayEnd.y} ${lowerRayStart.x},${lowerRayStart.y}`;
            polygon.setAttribute("points", points);
            polygon.setAttribute("fill", "blue");
            polygon.setAttribute("fill-opacity", "0.2");
            polygon.setAttribute("stroke", "none");
            polygon.setAttribute("pointer-events", "none");
            rayLinesGroup.appendChild(polygon);
        }
        
        // Draw dotted lines if mode includes dotted
        if (rayDisplayMode === 'dotted' || rayDisplayMode === 'both') {
            // Draw upper ray line
            const upperLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            upperLine.setAttribute("x1", upperRayStart.x);
            upperLine.setAttribute("y1", upperRayStart.y);
            upperLine.setAttribute("x2", upperRayEnd.x);
            upperLine.setAttribute("y2", upperRayEnd.y);
            upperLine.setAttribute("stroke", "blue");
            upperLine.setAttribute("stroke-width", "1");
            upperLine.setAttribute("stroke-dasharray", "3,3");
            upperLine.setAttribute("pointer-events", "none");
            rayLinesGroup.appendChild(upperLine);
            
            // Draw lower ray line
            const lowerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            lowerLine.setAttribute("x1", lowerRayStart.x);
            lowerLine.setAttribute("y1", lowerRayStart.y);
            lowerLine.setAttribute("x2", lowerRayEnd.x);
            lowerLine.setAttribute("y2", lowerRayEnd.y);
            lowerLine.setAttribute("stroke", "blue");
            lowerLine.setAttribute("stroke-width", "1");
            lowerLine.setAttribute("stroke-dasharray", "3,3");
            lowerLine.setAttribute("pointer-events", "none");
            rayLinesGroup.appendChild(lowerLine);
        }
    }
    
    // Insert aperture rays before components so they appear behind
    const componentsGroup = document.getElementById("components");
    svg.insertBefore(rayLinesGroup, componentsGroup);
}

// Hide aperture rays
export function hideApertureRays() {
    const svg = document.getElementById("canvas");
    const rayLinesGroup = svg.querySelector("#aperture-rays");
    if (rayLinesGroup) {
        rayLinesGroup.remove();
    }
}

// Toggle aperture rays
export function toggleApertureRays() {
    showApertureRays = !showApertureRays;
    const raysBtn = document.getElementById('rays-btn');
    
    if (showApertureRays) {
        drawApertureRays();
        raysBtn.textContent = 'Hide Rays';
        
        // Show ray shape menu for currently selected component if appropriate
        if (showRayShapeMenu && shouldShowRayShapeMenu && getSelectedComponent) {
            const selectedComponent = getSelectedComponent();
            if (selectedComponent && shouldShowRayShapeMenu(selectedComponent)) {
                showRayShapeMenu(selectedComponent);
            }
        }
    } else {
        hideApertureRays();
        raysBtn.textContent = 'Draw Rays';
        
        // Hide ray shape menu when rays are turned off
        if (hideRayShapeMenu) {
            hideRayShapeMenu();
        }
    }
}

// Toggle solid rays
export function toggleSolidRays() {
    const solidRaysBtn = document.getElementById('solid-rays-btn');
    
    // Cycle through three modes: both -> dotted -> solid -> both
    switch (rayDisplayMode) {
        case 'both':
            rayDisplayMode = 'dotted';
            solidRaysBtn.textContent = 'Outline Only';
            break;
        case 'dotted':
            rayDisplayMode = 'solid';
            solidRaysBtn.textContent = 'Solid Only';
            break;
        case 'solid':
            rayDisplayMode = 'both';
            solidRaysBtn.textContent = 'Both Rays';
            break;
    }
    
    // Redraw aperture rays if they are currently shown
    if (showApertureRays) {
        drawApertureRays();
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
    
    // Calculate global positions for child and parent aperture points and center points
    const childUpper = transformToGlobal(childDims.aperturePoints.upper.x, childDims.aperturePoints.upper.y, state);
    const childLower = transformToGlobal(childDims.aperturePoints.lower.x, childDims.aperturePoints.lower.y, state);
    const childCenter = transformToGlobal(childDims.centerPoint.x, childDims.centerPoint.y, state);
    const parentUpper = transformToGlobal(parentDims.aperturePoints.upper.x, parentDims.aperturePoints.upper.y, parentState);
    const parentLower = transformToGlobal(parentDims.aperturePoints.lower.x, parentDims.aperturePoints.lower.y, parentState);
    const parentCenter = transformToGlobal(parentDims.centerPoint.x, parentDims.centerPoint.y, parentState);
    
    // Determine connection points based on child component's ray shape
    let upperRayStart, upperRayEnd, lowerRayStart, lowerRayEnd;
    
    switch (childDims.rayShape) {
        case 'collimated':
            // Parent upper to child upper, parent lower to child lower
            upperRayStart = parentUpper;
            upperRayEnd = childUpper;
            lowerRayStart = parentLower;
            lowerRayEnd = childLower;
            break;
        case 'divergent':
            // Parent center to child upper, parent center to child lower
            upperRayStart = parentCenter;
            upperRayEnd = childUpper;
            lowerRayStart = parentCenter;
            lowerRayEnd = childLower;
            break;
        case 'convergent':
            // Parent upper to child center, parent lower to child center
            upperRayStart = parentUpper;
            upperRayEnd = childCenter;
            lowerRayStart = parentLower;
            lowerRayEnd = childCenter;
            break;
        default:
            // Fallback to collimated behavior
            upperRayStart = parentUpper;
            upperRayEnd = childUpper;
            lowerRayStart = parentLower;
            lowerRayEnd = childLower;
            break;
    }
    
    // Check if the aperture lines cross by using line intersection logic
    // Lines cross if they intersect between their endpoints
    
    // Calculate intersection point using parametric line equations
    const x1 = upperRayStart.x, y1 = upperRayStart.y;
    const x2 = upperRayEnd.x, y2 = upperRayEnd.y;
    const x3 = lowerRayStart.x, y3 = lowerRayStart.y;
    const x4 = lowerRayEnd.x, y4 = lowerRayEnd.y;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    // Lines are parallel if denominator is 0
    if (Math.abs(denom) < 1e-10) return false;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    // Lines intersect within their segments if both t and u are between 0 and 1
    const linesIntersect = (t >= 0 && t <= 1 && u >= 0 && u <= 1);
    
    return linesIntersect;
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

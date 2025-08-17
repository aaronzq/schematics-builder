// Aperture rays visualization
// Handles drawing blue dashed lines connecting aperture points between components

import { componentState } from './componentManager.js';
import { DEFAULT_SOLID_RAY_COLOR } from './constants.js';
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
            // Use per-component color if set, else default to DEFAULT_SOLID_RAY_COLOR, and normalize to #RRGGBB
            let fillColor = state.rayPolygonColor;
            if (typeof fillColor === 'string') {
                // Add # if missing and valid hex
                if (/^[0-9A-Fa-f]{6}$/.test(fillColor)) {
                    fillColor = '#' + fillColor;
                }
                // Accept #RRGGBB
                else if (/^#([0-9A-Fa-f]{6})$/.test(fillColor)) {
                    // already valid
                } else {
                    fillColor = null;
                }
            } else {
                fillColor = null;
            }
            if (!fillColor) {
                fillColor = DEFAULT_SOLID_RAY_COLOR;
            }
            polygon.setAttribute("fill", fillColor);
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
            upperLine.setAttribute("stroke", "black");
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
            lowerLine.setAttribute("stroke", "black");
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

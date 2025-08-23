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
        
        // Draw all rays using rayShape and rayPolygonColor arrays
        const rayShapes = Array.isArray(state.rayShape) ? state.rayShape : [childDims.rayShape || 'collimated'];
        const rayColors = Array.isArray(state.rayPolygonColor) ? state.rayPolygonColor : ['#00ffff'];
        for (let i = 0; i < rayShapes.length; i++) {
            const shape = rayShapes[i] || 'collimated';
            const color = rayColors[i] || '#00ffff';
            let uStart, uEnd, lStart, lEnd;
            switch (shape) {
                case 'collimated':
                    uStart = parentUpper;
                    uEnd = childUpper;
                    lStart = parentLower;
                    lEnd = childLower;
                    break;
                case 'divergent':
                    uStart = parentCenter;
                    uEnd = childUpper;
                    lStart = parentCenter;
                    lEnd = childLower;
                    break;
                case 'convergent':
                    uStart = parentUpper;
                    uEnd = childCenter;
                    lStart = parentLower;
                    lEnd = childCenter;
                    break;
                default:
                    uStart = parentUpper;
                    uEnd = childUpper;
                    lStart = parentLower;
                    lEnd = childLower;
                    break;
            }
            if (rayDisplayMode === 'solid' || rayDisplayMode === 'both') {
                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                const points = `${uStart.x},${uStart.y} ${uEnd.x},${uEnd.y} ${lEnd.x},${lEnd.y} ${lStart.x},${lStart.y}`;
                polygon.setAttribute("points", points);
                let fillColor = color;
                if (typeof fillColor === 'string') {
                    if (/^[0-9A-Fa-f]{6}$/.test(fillColor)) {
                        fillColor = '#' + fillColor;
                    }
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
            if (rayDisplayMode === 'dotted' || rayDisplayMode === 'both') {
                // Draw upper ray line
                const upperLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                upperLine.setAttribute("x1", uStart.x);
                upperLine.setAttribute("y1", uStart.y);
                upperLine.setAttribute("x2", uEnd.x);
                upperLine.setAttribute("y2", uEnd.y);
                upperLine.setAttribute("stroke", "black");
                upperLine.setAttribute("stroke-width", "1");
                upperLine.setAttribute("stroke-dasharray", "3,3");
                upperLine.setAttribute("pointer-events", "none");
                rayLinesGroup.appendChild(upperLine);
                // Draw lower ray line
                const lowerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                lowerLine.setAttribute("x1", lStart.x);
                lowerLine.setAttribute("y1", lStart.y);
                lowerLine.setAttribute("x2", lEnd.x);
                lowerLine.setAttribute("y2", lEnd.y);
                lowerLine.setAttribute("stroke", "black");
                lowerLine.setAttribute("stroke-width", "1");
                lowerLine.setAttribute("stroke-dasharray", "3,3");
                lowerLine.setAttribute("pointer-events", "none");
                rayLinesGroup.appendChild(lowerLine);
            }
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

// Toggle ray display mode (UI button still called 'solid-rays-btn' for compatibility)
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
    if (showApertureRays) {
        drawApertureRays();
    }
}

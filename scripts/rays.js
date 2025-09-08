// Aperture rays visualization
// Handles drawing blue dashed lines connecting aperture points between components

import { componentState } from './componentManager.js';
import { DEFAULT_SOLID_RAY_COLOR, DEFAULT_RAY_POLYGON_OPACITY} from './constants.js';
import { transformToGlobal } from './utils/mathUtils.js';
import { calculateProjections_internal } from './modules/componentAperture.js';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from './utils/colorUtils.js';

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
        const rayColors2 = Array.isArray(state.rayPolygonColor2) ? state.rayPolygonColor2 : ['#ff00ff'];
        const gradientEnabled = Array.isArray(state.gradientEnabled) ? state.gradientEnabled : [false];
        for (let i = 0; i < rayShapes.length; i++) {
            const shape = rayShapes[i] || 'collimated';
            const color = rayColors[i] || '#00ffff';
            const color2 = rayColors2[i] || '#ff00ff';
            const isGradient = gradientEnabled[i] || false;
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
                case 'manual':
                    uStart = parentUpper;
                    uEnd = childUpper;
                    lStart = parentLower;
                    lEnd = childLower;
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
                if (isGradient) {
                    // Create gradient fill
                    const gradientId = `gradient-${compId}-${i}`;
                    let defs = svg.querySelector('defs');
                    if (!defs) {
                        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                        svg.appendChild(defs);
                    }
                    
                    // Remove existing gradient with same ID
                    const existingGradient = defs.querySelector(`#${gradientId}`);
                    if (existingGradient) {
                        existingGradient.remove();
                    }
                    
                    // Create linear gradient perpendicular to center line
                    const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
                    gradient.setAttribute("id", gradientId);
                    gradient.setAttribute("gradientUnits", "userSpaceOnUse");
                    
                    // Use existing component centers for gradient calculation (already in global coordinates)
                    // This follows the user's logic: gradient based on center line between parent and child centers
                    const centerLineStartX = parentCenter.x;
                    const centerLineStartY = parentCenter.y;
                    const centerLineEndX = childCenter.x;
                    const centerLineEndY = childCenter.y;
                    
                    // Calculate ray direction from center line (parent center to child center)
                    const rayDx = centerLineEndX - centerLineStartX;
                    const rayDy = centerLineEndY - centerLineStartY;
                    const rayLength = Math.sqrt(rayDx * rayDx + rayDy * rayDy);
                    
                    // Calculate ray width using calculateProjections_internal function (following user's correct approach)
                    const projections = calculateProjections_internal(state, parentState);
                    let rayWidth = 20; // fallback width
                    
                    if (projections) {
                        // Use the actual aperture projections to determine ray width
                        const parentProj = Math.abs(projections.parent.apertureProjection) || 0;
                        const childProj = Math.abs(projections.child.apertureProjection) || 0;
                        
                        // Use the larger projection as the ray width (user's correct approach)
                        const naturalRayWidth = Math.max(parentProj, childProj);
                        
                        if (naturalRayWidth > 2) {
                            rayWidth = naturalRayWidth;
                        } else {
                            // During edge-on orientations, temporarily disable gradient
                            polygon.setAttribute("fill", color);
                            polygon.setAttribute("fill-opacity", DEFAULT_RAY_POLYGON_OPACITY);
                            rayLinesGroup.appendChild(polygon);
                            continue;
                        }
                    }
                    
                    // Validate ray width
                    if (rayWidth <= 0 || !isFinite(rayWidth)) {
                        rayWidth = 20; // Safe fallback
                    }
                    
                    // Calculate perpendicular vector to ray direction (gradient direction)
                    let perpDx = 0, perpDy = 0;
                    if (rayLength > 0) {
                        // Perpendicular to ray direction (90 degree rotation)
                        perpDx = -rayDy / rayLength;
                        perpDy = rayDx / rayLength;
                    } else {
                        // Fallback: use vertical gradient
                        perpDx = 0;
                        perpDy = 1;
                    }
                    
                    // Validate perpendicular vector
                    if (!isFinite(perpDx) || !isFinite(perpDy)) {
                        perpDx = 0;
                        perpDy = 1; // Default to vertical
                    }
                    
                    // Use the center of the center line as gradient center point
                    const gradientCenterX = (centerLineStartX + centerLineEndX) / 2;
                    const gradientCenterY = (centerLineStartY + centerLineEndY) / 2;
                    
                    // Validate gradient center coordinates
                    if (!isFinite(gradientCenterX) || !isFinite(gradientCenterY)) {
                        console.warn('Invalid gradient center coordinates, skipping gradient for ray', i);
                        polygon.setAttribute("fill", color); // Use solid color instead
                        polygon.setAttribute("fill-opacity", DEFAULT_RAY_POLYGON_OPACITY);
                        rayLinesGroup.appendChild(polygon);
                        continue;
                    }
                    
                    // Scale perpendicular vector by ray width for gradient endpoints
                    const gradientExtent = rayWidth / 1;
                    
                    // Calculate gradient endpoints with validation
                    const x1 = gradientCenterX - perpDx * gradientExtent;
                    const y1 = gradientCenterY - perpDy * gradientExtent;
                    const x2 = gradientCenterX + perpDx * gradientExtent;
                    const y2 = gradientCenterY + perpDy * gradientExtent;
                    
                    // Validate gradient endpoints
                    if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) {
                        console.warn('Invalid gradient coordinates, using solid color for ray', i);
                        polygon.setAttribute("fill", color); // Use solid color instead
                        polygon.setAttribute("fill-opacity", DEFAULT_RAY_POLYGON_OPACITY);
                        rayLinesGroup.appendChild(polygon);
                        continue;
                    }
                    
                    // Set gradient endpoints
                    gradient.setAttribute("x1", x1);
                    gradient.setAttribute("y1", y1);
                    gradient.setAttribute("x2", x2);
                    gradient.setAttribute("y2", y2);
                    
                    // Create spectral gradient with 5 colors sampled from hue spectrum
                    const rgb1 = hexToRgb(color);
                    const rgb2 = hexToRgb(color2);
                    const hsl1 = rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
                    const hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b);
                    
                    // Use direct hue progression from color1 to color2 (no shortest path)
                    let hue1 = hsl1.h;
                    let hue2 = hsl2.h;
                    
                    // Create 5 color stops with evenly distributed percentages
                    const stopPositions = [0, 0.25, 0.5, 0.75, 1.0]; // 5 evenly distributed colors
                    for (let stopIndex = 0; stopIndex < 5; stopIndex++) {
                        const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
                        const ratio = stopPositions[stopIndex]; // 0, 0.25, 0.5, 0.75, 1.0
                        const percentage = ratio * 100; // 0, 25, 50, 75, 100

                        // Linear interpolation from hue1 to hue2 (allows negative steps)
                        let interpolatedHue = hue1 + (hue2 - hue1) * ratio;
                        
                        // Normalize hue to 0-359 range
                        while (interpolatedHue < 0) interpolatedHue += 360;
                        while (interpolatedHue >= 360) interpolatedHue -= 360;
                        
                        const interpolatedSat = (hsl1.s + hsl2.s) / 2; // Average saturation
                        const interpolatedLight = (hsl1.l + hsl2.l) / 2; // Average lightness
                        
                        // Convert back to RGB then hex
                        const interpolatedRgb = hslToRgb(interpolatedHue, interpolatedSat, interpolatedLight);
                        const interpolatedColor = rgbToHex(interpolatedRgb.r, interpolatedRgb.g, interpolatedRgb.b);
                        
                        stop.setAttribute("offset", `${percentage}%`);
                        stop.setAttribute("stop-color", interpolatedColor);
                        stop.setAttribute("stop-opacity", DEFAULT_RAY_POLYGON_OPACITY); // Embed opacity in stops for PowerPoint compatibility
                        gradient.appendChild(stop);
                    }
                    
                    defs.appendChild(gradient);
                    fillColor = `url(#${gradientId})`;
                } else {
                    // Use solid color
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
                }
                
                polygon.setAttribute("fill", fillColor);
                if (isGradient) {
                    polygon.setAttribute("fill-opacity", "1"); // Opacity embedded in gradient stops
                } else {
                    polygon.setAttribute("fill-opacity", `${DEFAULT_RAY_POLYGON_OPACITY}`);
                }
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

// Toggle aperture rays (legacy function - now uses integrated button)
export function toggleApertureRays() {
    showApertureRays = !showApertureRays;
    const raysBtn = document.getElementById('rays-toggle-btn');
    
    if (showApertureRays) {
        drawApertureRays();
        if (raysBtn) raysBtn.textContent = 'Hide Rays';
        
        // Show ray shape menu for currently selected component if appropriate
        if (showRayShapeMenu && shouldShowRayShapeMenu && getSelectedComponent) {
            const selectedComponent = getSelectedComponent();
            if (selectedComponent && shouldShowRayShapeMenu(selectedComponent)) {
                showRayShapeMenu(selectedComponent);
            }
        }
    } else {
        hideApertureRays();
        if (raysBtn) raysBtn.textContent = 'Show Rays';
        
        // Hide ray shape menu when rays are turned off
        if (hideRayShapeMenu) {
            hideRayShapeMenu();
        }
    }
}

// Toggle ray display mode (legacy function - now uses integrated button)
export function toggleSolidRays() {
    const raysToggleBtn = document.getElementById('rays-toggle-btn');
    // Cycle through three modes: both -> dotted -> solid -> both
    switch (rayDisplayMode) {
        case 'both':
            rayDisplayMode = 'dotted';
            if (raysToggleBtn) raysToggleBtn.textContent = 'Outline Only';
            break;
        case 'dotted':
            rayDisplayMode = 'solid';
            if (raysToggleBtn) raysToggleBtn.textContent = 'Solid Only';
            break;
        case 'solid':
            rayDisplayMode = 'both';
            if (raysToggleBtn) raysToggleBtn.textContent = 'Both Rays';
            break;
    }
    if (showApertureRays) {
        drawApertureRays();
    }
}

// Integrated rays toggle function - cycles through: Hide -> Show Outline -> Show Solid -> Show Both -> Hide
export function toggleRaysIntegrated() {
    const raysToggleBtn = document.getElementById('rays-toggle-btn');
    
    if (!showApertureRays) {
        // Currently hidden, show with outline only
        showApertureRays = true;
        rayDisplayMode = 'dotted';
        raysToggleBtn.textContent = 'Show Ray Body';  // Next action: show solid rays
        drawApertureRays();
        
        // Show ray shape menu for currently selected component if appropriate
        if (showRayShapeMenu && shouldShowRayShapeMenu && getSelectedComponent) {
            const selectedComponent = getSelectedComponent();
            if (selectedComponent && shouldShowRayShapeMenu(selectedComponent)) {
                showRayShapeMenu(selectedComponent);
            }
        }
    } else if (rayDisplayMode === 'dotted') {
        // Currently outline, show solid only
        rayDisplayMode = 'solid';
        raysToggleBtn.textContent = 'Show Both';   // Next action: show both rays
        drawApertureRays();
    } else if (rayDisplayMode === 'solid') {
        // Currently solid, show both
        rayDisplayMode = 'both';
        raysToggleBtn.textContent = 'Hide Rays';   // Next action: hide rays
        drawApertureRays();
    } else {
        // Currently showing both, hide rays
        showApertureRays = false;
        raysToggleBtn.textContent = 'Show Ray Outlines'; // Next action: show outline rays
        hideApertureRays();
        
        // Hide ray shape menu when rays are turned off
        if (hideRayShapeMenu) {
            hideRayShapeMenu();
        }
    }
}

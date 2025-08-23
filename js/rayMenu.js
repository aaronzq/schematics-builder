export function hideRayShapeMenu() {
    if (currentMenu) {
        currentMenu.remove();
        currentMenu = null;
    }
}
// Returns true if the ray shape menu should be shown for the given component
export function shouldShowRayShapeMenu(component) {
    // Default: always show if a component is provided
    return !!component;
}
// Ray shape menu for selected components
// Displays a dropdown menu to change the rayShape property of selected components

import { componentState, getComponentById } from './componentManager.js';
import { DEFAULT_SOLID_RAY_COLOR } from './constants.js';
import { drawApertureRays } from './rays.js';
import { changeComponentRayShape, getValidRayShapes, setConeAngle } from './modules/componentUtils.js';
import { calculateOptimalAperture, recursivelyUpdateChildrenApertures, autoScaleForComponentDragRotation } from './modules/componentAperture.js';
import { showApertureRays } from './rays.js';
import { updateAperturePointDrawings } from './modules/componentRenderer.js';

let currentMenu = null;

// No global color swatch; swatch is dynamically generated from all rays

// Show ray shape menu for the selected component
// --- Color conversion utilities ---
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(x => x + x).join('');
    }
    const num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function rgbToHex(r, g, b) {
    return (
        '#' +
        [r, g, b]
            .map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            })
            .join('')
    );
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 359), s: s, l: l };
}

function hslToRgb(h, s, l) {
    h = h / 359;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}
export function showRayShapeMenu(component) {
    // console.log('[showRayShapeMenu] called with component:', component);
    if (!showApertureRays) {
        console.log('[showRayShapeMenu] showApertureRays is false, menu will not show');
        return;
    }
    // Only show menu if aperture rays are visible
    if (!showApertureRays) return;
    
    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    
    if (!state) return;
    
    // Hide any existing menu
    hideRayShapeMenu();
    
    // Always show menu as a banner at the top of the canvas, inside .canvas-container
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const container = canvas.closest('.canvas-container');
    const containerRect = container.getBoundingClientRect();
    // Position relative to container
    // Use canvas offset within container for correct alignment
    // Always align menu with the top edge of the canvas
    // Use boundingClientRect to align menu with visible canvas
    const menuX = canvasRect.left - containerRect.left + 1; // +1 for canvas border
    const menuY = canvasRect.top - containerRect.top;

    // Create menu container
    const menu = document.createElement('div');
    menu.style.left = `${menuX}px`;
    menu.style.top = `${menuY}px`;
    menu.style.width = `${canvas.clientWidth}px`;
    menu.className = 'ray-shape-menu';
    menu.style.position = 'absolute';
    menu.style.left = `${menuX}px`;
    menu.style.top = `${menuY}px`;
    menu.style.width = `${canvas.offsetWidth}px`;
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.borderRadius = '12px 12px 0 0'; // match canvas top corners
    menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    menu.style.zIndex = '1000';
        menu.style.padding = '8px 0px 8px 0px';
    menu.style.minWidth = '0';
    menu.style.fontSize = '14px';
    menu.style.fontFamily = 'Arial, sans-serif';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.alignItems = 'flex-start';
    menu.style.gap = '0';
        menu.style.boxSizing = 'border-box';
    
    // (plus button will be added to the last Ray row below)
    

    // --- MULTI RAY SUPPORT ---
    // Ensure arrays exist
    if (!Array.isArray(state.rayShape)) state.rayShape = [state.dimensions.rayShape || 'collimated'];
    if (!Array.isArray(state.rayPolygonColor)) state.rayPolygonColor = ['#00ffff'];

    const validRayShapes = getValidRayShapes();
    const numRays = Math.max(state.rayShape.length, state.rayPolygonColor.length);
    for (let idx = 0; idx < numRays; idx++) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.margin = '4px 0';
        row.style.width = '100%';

        // Ray label
        const rayLabel = document.createElement('span');
        rayLabel.textContent = `Ray ${idx + 1}`;
        rayLabel.style.fontWeight = 'bold';
        rayLabel.style.marginLeft = '12px';
        rayLabel.style.marginRight = '12px';
        row.appendChild(rayLabel);

        // Ray Shape select
        const shapeLabel = document.createElement('span');
        shapeLabel.textContent = 'Shape:';
        shapeLabel.style.marginRight = '6px';
        shapeLabel.style.fontWeight = 'bold';
        row.appendChild(shapeLabel);

        const shapeSelect = document.createElement('select');
        validRayShapes.forEach(shape => {
            const opt = document.createElement('option');
            opt.value = shape;
            opt.textContent = shape.charAt(0).toUpperCase() + shape.slice(1);
            if (shape === (state.rayShape[idx] || 'collimated')) opt.selected = true;
            shapeSelect.appendChild(opt);
        });
        shapeSelect.addEventListener('change', e => {
            state.rayShape[idx] = shapeSelect.value;
            // If changing the first ray, update this component's own aperture to match parent or handle manual
            if (idx === 0) {
                if (shapeSelect.value === 'manual') {
                    // For manual, update cone angle and aperture using main logic
                    const parentId = state.parentId;
                    const parentState = parentId !== null ? componentState[parentId] : null;
                    if (parentState) {
                        // Use calculateOptimalAperture to update cone angle for manual
                        const updatedDims = calculateOptimalAperture(state, parentState, false);
                        if (updatedDims) {
                            state.dimensions = updatedDims;
                            updateAperturePointDrawings(component, updatedDims);
                        }
                    }
                } else {
                    // Update this component's own aperture
                    const scaledDims = autoScaleForComponentDragRotation(component, componentState);
                    if (scaledDims) {
                        state.dimensions = scaledDims;
                        updateAperturePointDrawings(component, scaledDims);
                    }
                }
                // Then update all children recursively
                recursivelyUpdateChildrenApertures(
                    component,
                    componentState,
                    getComponentById,
                    updateAperturePointDrawings
                );
            }
            drawApertureRays();
            // Re-render menu to show/hide slider if needed
            if (idx === 0) showRayShapeMenu(component);
        });
        row.appendChild(shapeSelect);
        // If this is the first ray and set to 'manual', show aperture radius slider (immediately after the dropdown)
        if (idx === 0 && state.rayShape[0] === 'manual') {
            const parentId = state.parentId;
            let parentDims = null;
            if (parentId !== null && componentState[parentId]) {
                parentDims = componentState[parentId].dimensions;
            }
            // Reasonable slider range: 0 to 200
            const minRadius = 0;
            const maxRadius = 50;
            const currentRadius = state.dimensions.apertureRadius || 1;
            // Label
            const sliderLabel = document.createElement('span');
            sliderLabel.textContent = 'Radius:';
            sliderLabel.style.fontWeight = 'bold';
            sliderLabel.style.marginLeft = '12px';
            // Slider
            const radiusSlider = document.createElement('input');
            radiusSlider.type = 'range';
            radiusSlider.min = minRadius;
            radiusSlider.max = maxRadius;
            radiusSlider.step = 0.1;
            radiusSlider.value = currentRadius;
            radiusSlider.style.width = '100px';
            // Value display
            const valueDisplay = document.createElement('span');
            valueDisplay.textContent = currentRadius.toFixed(2);
            valueDisplay.style.minWidth = '30px';
            // Insert shapeSelect first, then slider label, slider, and value display after
            // row.appendChild(shapeSelect);
            row.appendChild(sliderLabel);
            row.appendChild(radiusSlider);
            row.appendChild(valueDisplay);
            // Slider event
            radiusSlider.addEventListener('input', e => {
                const newRadius = parseFloat(radiusSlider.value);
                valueDisplay.textContent = newRadius.toFixed(2);
                // Update aperture radius and aperture points directly
                state.dimensions.apertureRadius = newRadius;
                const up = state.dimensions.upVector;
                const center = state.dimensions.centerPoint;
                state.dimensions.aperturePoints = {
                    upper: {
                        x: center.x + up.x * newRadius,
                        y: center.y + up.y * newRadius
                    },
                    lower: {
                        x: center.x - up.x * newRadius,
                        y: center.y - up.y * newRadius
                    }
                };
                // Now update cone angle using main logic, but preserve the radius and points
                const parentId = state.parentId;
                const parentState = parentId !== null ? componentState[parentId] : null;
                if (parentState) {
                    const updatedDims = calculateOptimalAperture(state, parentState, false);
                    if (updatedDims && typeof updatedDims.coneAngle === 'number') {
                        state.dimensions.coneAngle = updatedDims.coneAngle;
                    }
                }
                updateAperturePointDrawings(component, state.dimensions);
                recursivelyUpdateChildrenApertures(
                    component,
                    componentState,
                    getComponentById,
                    updateAperturePointDrawings
                );
                drawApertureRays();
            });
        } else {
            row.appendChild(shapeSelect);
        }
        // row.appendChild(shapeSelect);

        // --- Custom Color Picker ---
        let colorHex = typeof state.rayPolygonColor[idx] === 'string' ? (state.rayPolygonColor[idx].startsWith('#') ? state.rayPolygonColor[idx] : '#' + state.rayPolygonColor[idx]) : '#00ffff';
        let rgb = hexToRgb(colorHex);
        let hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        const hueLabel = document.createElement('span');
        hueLabel.textContent = 'Hue:';
        hueLabel.style.marginLeft = '10px';
        hueLabel.style.fontWeight = 'bold';
        row.appendChild(hueLabel);

        // Hue slider
        const hueSlider = document.createElement('input');
        hueSlider.type = 'range';
        hueSlider.min = 0;
        hueSlider.max = 359;
        hueSlider.value = hsl.h;
        hueSlider.style.width = '160px';
        hueSlider.title = 'Hue';
        hueSlider.className = 'hue-slider';
        row.appendChild(hueSlider);

        const hueInput = document.createElement('input');
        hueInput.type = 'number';
        hueInput.min = 0;
        hueInput.max = 359;
        hueInput.value = hsl.h;
        hueInput.title = 'Hue';
        hueInput.style.width = '60px';
        hueInput.style.padding = '2px 8px';
        hueInput.style.marginLeft = '2px';
        hueInput.style.fontSize = '15px';
        hueInput.style.boxSizing = 'border-box';
        row.appendChild(hueInput);

        // Sync hue slider and input
        hueInput.addEventListener('input', e => {
            let val = Math.max(0, Math.min(359, parseInt(hueInput.value) || 0));
            hsl.h = val;
            hueSlider.value = val;
            rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
            updateRayColor();
        });
        hueSlider.addEventListener('input', e => {
            hsl.h = parseInt(hueSlider.value);
            hueInput.value = hsl.h;
            rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
            updateRayColor();
        });
        // Update all controls to match current color
    // Only one updateAllControls function should exist. Remove this duplicate.

        // Swatch button
        const swatchBtn = document.createElement('button');
        swatchBtn.textContent = '🎨';
        swatchBtn.title = 'Show color swatch';
        swatchBtn.style.marginLeft = '4px';
        row.appendChild(swatchBtn);

        // Swatch popup logic
        let swatchPopup = null;
        swatchBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (swatchPopup) {
                swatchPopup.remove();
                swatchPopup = null;
                return;
            }
            swatchPopup = document.createElement('div');
            swatchPopup.style.position = 'absolute';
            swatchPopup.style.zIndex = 2000;
            swatchPopup.style.background = '#fff';
            swatchPopup.style.border = '1px solid #888';
            swatchPopup.style.borderRadius = '6px';
            swatchPopup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            swatchPopup.style.padding = '8px';
            swatchPopup.style.display = 'flex';
            swatchPopup.style.flexWrap = 'wrap';
            swatchPopup.style.gap = '6px';
            // Position below the button
            const rect = swatchBtn.getBoundingClientRect();
            swatchPopup.style.left = rect.left + 'px';
            swatchPopup.style.top = (rect.bottom + 4) + 'px';
            // Gather all unique colors from all rays in all components
            const usedColors = new Set();
            for (const compId in componentState) {
                const comp = componentState[compId];
                if (Array.isArray(comp.rayPolygonColor)) {
                    comp.rayPolygonColor.forEach(col => {
                        if (col) usedColors.add(col.startsWith('#') ? col : '#' + col);
                    });
                } else if (comp.rayPolygonColor) {
                    usedColors.add(comp.rayPolygonColor.startsWith('#') ? comp.rayPolygonColor : '#' + comp.rayPolygonColor);
                }
            }
            if (usedColors.size === 0) {
                const none = document.createElement('div');
                none.textContent = 'No colors yet';
                none.style.color = '#888';
                swatchPopup.appendChild(none);
            } else {
                usedColors.forEach(col => {
                    const swatch = document.createElement('div');
                    swatch.style.width = '24px';
                    swatch.style.height = '24px';
                    swatch.style.border = '1px solid #888';
                    swatch.style.borderRadius = '4px';
                    swatch.style.background = col;
                    swatch.style.cursor = 'pointer';
                    swatch.title = col;
                    swatch.addEventListener('click', ev => {
                        colorHex = col;
                        rgb = hexToRgb(colorHex);
                        hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                        hueSlider.value = hsl.h;
                        hueInput.value = hsl.h;
                        updateRayColor();
                        if (swatchPopup) {
                            swatchPopup.remove();
                            swatchPopup = null;
                        }
                    });
                    swatchPopup.appendChild(swatch);
                });
            }
            document.body.appendChild(swatchPopup);
            // Remove popup on outside click
            const closeSwatch = (evt) => {
                if (swatchPopup && !swatchPopup.contains(evt.target) && evt.target !== swatchBtn) {
                    swatchPopup.remove();
                    swatchPopup = null;
                    document.removeEventListener('mousedown', closeSwatch);
                }
            };
            setTimeout(() => {
                document.addEventListener('mousedown', closeSwatch);
            }, 50);
        });

        // Update all controls to match current color
    // No updateAllControls needed for RGB inputs; only sync hue slider and input elsewhere.
        // Update ray color and redraw
        function updateRayColor() {
            colorHex = rgbToHex(rgb.r, rgb.g, rgb.b);
            state.rayPolygonColor[idx] = colorHex;
            drawApertureRays();
        }
        // Hue slider event
    // No RGB input events needed.

        // Remove button (except for the first row)
        if (numRays > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '−';
            removeBtn.title = 'Remove this ray';
            removeBtn.style.marginLeft = '8px';
            removeBtn.style.fontWeight = 'bold';
            removeBtn.style.cursor = 'pointer';
            removeBtn.addEventListener('click', e => {
                e.stopPropagation();
                state.rayShape.splice(idx, 1);
                state.rayPolygonColor.splice(idx, 1);
                showRayShapeMenu(component); // re-render menu
                drawApertureRays();
            });
            row.appendChild(removeBtn);
        }

        // Add plus button to the right of the last Ray row
        if (idx === numRays - 1) {
            const plusBtn = document.createElement('button');
            plusBtn.textContent = '+';
            plusBtn.title = 'Add another ray';
            plusBtn.style.marginLeft = '8px';
            plusBtn.style.fontWeight = 'bold';
            plusBtn.style.cursor = 'pointer';
            plusBtn.addEventListener('click', e => {
                e.stopPropagation();
                state.rayShape.push(validRayShapes[0]);
                state.rayPolygonColor.push('#00ffff');
                showRayShapeMenu(component); // re-render menu
                drawApertureRays();
            });
            row.appendChild(plusBtn);
        }

        menu.appendChild(row);
    }

    // Add to document
    container.appendChild(menu);
    currentMenu = menu;
    // Debug: confirm menu is in DOM and log style/position
    setTimeout(() => {
        const rect = menu.getBoundingClientRect();
        const style = window.getComputedStyle(menu);
        // console.log('[showRayShapeMenu] menu rect:', rect, 'display:', style.display, 'visibility:', style.visibility, 'zIndex:', style.zIndex);
    }, 100);
}


// Helper function to update cone angle when ray shape changes from collimated to divergent/convergent
function updateConeAngleForRayShapeChange(childState) {
    // TODO: Implement this function as needed
    // This is a placeholder to fix syntax errors
}

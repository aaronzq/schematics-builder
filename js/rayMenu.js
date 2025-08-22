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
import { calculateOptimalAperture } from './modules/componentAperture.js';
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
    

    // --- MULTI SOLID RAY SUPPORT ---
    // Ensure state.solidRays exists and is an array
    if (!Array.isArray(state.solidRays)) {
        // If legacy, migrate from single value
        state.solidRays = [{
            shape: state.dimensions.rayShape,
            color: state.rayPolygonColor || DEFAULT_SOLID_RAY_COLOR
        }];
    }

    // For each solid ray, add a row with Ray Shape and Color
    const validRayShapes = getValidRayShapes();
    state.solidRays.forEach((ray, idx) => {
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
        // Add Shape label before dropdown
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
            if (shape === ray.shape) opt.selected = true;
            shapeSelect.appendChild(opt);
        });
        shapeSelect.addEventListener('change', e => {
            ray.shape = shapeSelect.value;
            drawApertureRays();
        });
        row.appendChild(shapeSelect);

        // --- Custom Color Picker ---
        // Color state
        let colorHex = typeof ray.color === 'string' ? (ray.color.startsWith('#') ? ray.color : '#' + ray.color) : '#00ffff';
        let rgb = hexToRgb(colorHex);
        let hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

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

    // Add RGB label before RGB inputs
    const rgbLabel = document.createElement('span');
    rgbLabel.textContent = 'RGB:';
    rgbLabel.style.marginLeft = '10px';
    rgbLabel.style.fontWeight = 'bold';
    row.appendChild(rgbLabel);

        // RGB inputs
        const rgbInputs = ['R', 'G', 'B'].map((label, i) => {
            const input = document.createElement('input');
            input.type = 'number';
            input.min = 0;
            input.max = 255;
            input.value = rgb[['r','g','b'][i]];
            input.title = label;
            input.style.width = '60px';
            input.style.padding = '2px 8px';
            input.style.marginLeft = '2px';
            input.style.fontSize = '15px';
            input.style.boxSizing = 'border-box';
            row.appendChild(input);
            return input;
        });

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
                if (Array.isArray(comp.solidRays)) {
                    comp.solidRays.forEach(r => {
                        if (r.color) usedColors.add(r.color.startsWith('#') ? r.color : '#' + r.color);
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
                        updateAllControls();
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
        function updateAllControls() {
            hueSlider.value = hsl.h;
            rgbInputs[0].value = rgb.r;
            rgbInputs[1].value = rgb.g;
            rgbInputs[2].value = rgb.b;
        }
        // Update ray color and redraw
        function updateRayColor() {
            colorHex = rgbToHex(rgb.r, rgb.g, rgb.b);
            ray.color = colorHex;
            drawApertureRays();
        }
        // Hue slider event
        hueSlider.addEventListener('input', e => {
            hsl.h = parseInt(hueSlider.value);
            rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
            updateAllControls();
            updateRayColor();
        });
        // RGB input events
        rgbInputs.forEach((input, i) => {
            input.addEventListener('input', e => {
                let val = Math.max(0, Math.min(255, parseInt(input.value) || 0));
                rgb[['r','g','b'][i]] = val;
                hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                updateAllControls();
                updateRayColor();
            });
        });

        // Remove button (except for the first row)
        if (state.solidRays.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '−';
            removeBtn.title = 'Remove this solid ray';
            removeBtn.style.marginLeft = '8px';
            removeBtn.style.fontWeight = 'bold';
            removeBtn.style.cursor = 'pointer';
            removeBtn.addEventListener('click', e => {
                e.stopPropagation();
                state.solidRays.splice(idx, 1);
                showRayShapeMenu(component); // re-render menu
                drawApertureRays();
            });
            row.appendChild(removeBtn);
        }

        // Add plus button to the right of the last Ray row
        if (idx === state.solidRays.length - 1) {
            const plusBtn = document.createElement('button');
            plusBtn.textContent = '+';
            plusBtn.title = 'Add another solid ray';
            plusBtn.style.marginLeft = '8px';
            plusBtn.style.fontWeight = 'bold';
            plusBtn.style.cursor = 'pointer';
            plusBtn.addEventListener('click', e => {
                e.stopPropagation();
                state.solidRays.push({
                    shape: validRayShapes[0],
                    color: '#00ffff'
                });
                showRayShapeMenu(component); // re-render menu
                drawApertureRays();
            });
            row.appendChild(plusBtn);
        }

        menu.appendChild(row);
    });

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

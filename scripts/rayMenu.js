export function hideRayShapeMenu() {
    if (currentMenu) {
        currentMenu.remove();
        currentMenu = null;
    }
}
// Returns true if the ray shape menu should be shown for the given component
export function shouldShowRayShapeMenu(component) {
    // Don't show menu if slider is currently active to prevent flickering
    if (isSliderActive) return false;
    
    // Default: always show if a component is provided
    return !!component;
}
// Ray shape menu for selected components
// Displays a dropdown menu to change the rayShape property of selected components

import { componentState, getComponentById } from './componentManager.js';
import { DEFAULT_SOLID_RAY_COLOR } from './constants.js';
import { drawApertureRays, showApertureRays } from './rays.js';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from './utils/colorUtils.js';

// Flag to prevent menu re-rendering during slider interactions
let isSliderActive = false;
import { changeComponentRayShape, getValidRayShapes, setConeAngle } from './modules/componentUtils.js';
import { calculateOptimalAperture, recursivelyUpdateChildrenApertures, autoScaleForComponentDragRotation } from './modules/componentAperture.js';
import { updateAperturePointDrawings } from './modules/componentRenderer.js';

let currentMenu = null;

// No global color swatch; swatch is dynamically generated from all rays

// Show ray shape menu for the selected component
// Ray shape menu rendering and interaction logic
export function showRayShapeMenu(component) {
    if (!showApertureRays) {
        return;
    }
    // Only show menu if aperture rays are visible
    if (!showApertureRays) return;

    // Add CSS styles for dual-knob slider
    if (!document.getElementById('dual-knob-styles')) {
        const style = document.createElement('style');
        style.id = 'dual-knob-styles';
        style.textContent = `
            .hue-slider.background-only {
                /* Keep all default slider styling, just hide the thumb */
            }
            .hue-slider.background-only::-webkit-slider-thumb {
                -webkit-appearance: none;
                display: none !important;
            }
            .hue-slider.background-only::-moz-range-thumb {
                display: none !important;
                opacity: 0;
            }
            .custom-knob {
                pointer-events: auto;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
            }
        `;
        document.head.appendChild(style);
    }
    
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
    menu.className = 'ray-shape-menu';
    menu.style.left = `${menuX}px`;
    menu.style.top = `${menuY}px`;
    menu.style.width = `${canvas.offsetWidth - 20}px`; // Account for right margin
    
    // (plus button will be added to the last Ray row below)
    

    // --- MULTI RAY SUPPORT ---
    // Ensure arrays exist
    if (!Array.isArray(state.rayShape)) state.rayShape = [state.dimensions.rayShape || 'collimated'];
    if (!Array.isArray(state.rayPolygonColor)) state.rayPolygonColor = ['#00ffff'];
    if (!Array.isArray(state.rayPolygonColor2)) state.rayPolygonColor2 = ['#ff00ff'];
    if (!Array.isArray(state.gradientEnabled)) state.gradientEnabled = [false];

    const validRayShapes = getValidRayShapes();
    const numRays = Math.max(state.rayShape.length, state.rayPolygonColor.length, state.rayPolygonColor2.length, state.gradientEnabled.length);
    for (let idx = 0; idx < numRays; idx++) {
        const row = document.createElement('div');
        row.className = 'ray-row';

        // Ray label
        const rayLabel = document.createElement('span');
        rayLabel.textContent = `Ray ${idx + 1}`;
        rayLabel.className = 'ray-label';
        row.appendChild(rayLabel);

        // Ray Shape select
        const shapeLabel = document.createElement('span');
        shapeLabel.textContent = 'Shape:';
        shapeLabel.className = 'shape-label';
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
            sliderLabel.className = 'slider-label';
            // Slider
            const radiusSlider = document.createElement('input');
            radiusSlider.type = 'range';
            radiusSlider.min = minRadius;
            radiusSlider.max = maxRadius;
            radiusSlider.step = 0.1;
            radiusSlider.value = currentRadius;
            radiusSlider.className = 'radius-slider';
            // Value display
            const valueDisplay = document.createElement('span');
            valueDisplay.textContent = currentRadius.toFixed(2);
            valueDisplay.className = 'value-display';
            // Add the slider elements to the row
            row.appendChild(sliderLabel);
            row.appendChild(radiusSlider);
            row.appendChild(valueDisplay);
            // Slider event
            radiusSlider.addEventListener('mousedown', () => {
                isSliderActive = true;
            });
            
            radiusSlider.addEventListener('mouseup', () => {
                isSliderActive = false;
            });
            
            // Handle mouse release outside the slider
            document.addEventListener('mouseup', () => {
                if (isSliderActive) {
                    isSliderActive = false;
                }
            });
            
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
        }
        // row.appendChild(shapeSelect);

        // --- Custom Color Picker ---
        let colorHex = typeof state.rayPolygonColor[idx] === 'string' ? (state.rayPolygonColor[idx].startsWith('#') ? state.rayPolygonColor[idx] : '#' + state.rayPolygonColor[idx]) : '#00ffff';
        let rgb = hexToRgb(colorHex);
        let hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        // Second color setup for gradient mode
        let color2Hex = typeof state.rayPolygonColor2[idx] === 'string' ? (state.rayPolygonColor2[idx].startsWith('#') ? state.rayPolygonColor2[idx] : '#' + state.rayPolygonColor2[idx]) : '#ff00ff';
        let rgb2 = hexToRgb(color2Hex);
        let hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b);

        const hueLabel = document.createElement('span');
        hueLabel.textContent = 'Hue:';
        hueLabel.className = 'hue-label';
        row.appendChild(hueLabel);

        // Hue slider container for single or dual knobs
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';
        row.appendChild(sliderContainer);

        let selectedKnob = 1; // 1 for color1, 2 for color2
        let hueSlider1, hueSlider2, hueInput;

        if (state.gradientEnabled[idx]) {
            // Clear existing sliders first
            sliderContainer.innerHTML = '';
            
            // Use standard slider as background with hidden thumb
            const backgroundSlider = document.createElement('input');
            backgroundSlider.type = 'range';
            backgroundSlider.min = 0;
            backgroundSlider.max = 359;
            backgroundSlider.value = 180;
            backgroundSlider.className = 'hue-slider background-only';
            backgroundSlider.disabled = true;
            sliderContainer.appendChild(backgroundSlider);

            // Get the actual slider track dimensions by measuring the background slider
            const sliderRect = backgroundSlider.getBoundingClientRect();
            const trackHeight = 20; // Standard slider height
            const knobSize = 20; // Standard thumb size
            const smallKnobSize = 16;

            // Create custom knobs that exactly match native slider thumbs
            const knob1 = document.createElement('div');
            knob1.className = 'custom-knob knob1 selected';
            knob1.style.width = knobSize + 'px';
            knob1.style.height = knobSize + 'px';
            knob1.style.top = '50%';
            knob1.style.transform = 'translateY(-50%)';
            knob1.style.zIndex = '10';
            sliderContainer.appendChild(knob1);

            const knob2 = document.createElement('div');
            knob2.className = 'custom-knob knob2';
            knob2.style.width = smallKnobSize + 'px';
            knob2.style.height = smallKnobSize + 'px';
            knob2.style.top = '50%';
            knob2.style.transform = 'translateY(-50%)';
            knob2.style.zIndex = '9';
            sliderContainer.appendChild(knob2);

            // Position knobs based on hue values (match native slider thumb positioning)
            const updateKnobPositions = () => {
                const sliderWidth = 160;
                const trackPadding = 10; // Account for native slider padding
                const trackWidth = sliderWidth - (trackPadding * 2);
                const pos1 = trackPadding + (hsl.h / 359) * trackWidth - (knobSize / 2);
                const pos2 = trackPadding + (hsl2.h / 359) * trackWidth - (smallKnobSize / 2);
                knob1.style.left = Math.max(0, Math.min(sliderWidth - knobSize, pos1)) + 'px';
                knob2.style.left = Math.max(0, Math.min(sliderWidth - smallKnobSize, pos2)) + 'px';
            };
            updateKnobPositions();

            // Knob selection and dragging logic
            let isDragging = false;
            let dragKnob = null;

            const selectKnob = (knobNum) => {
                selectedKnob = knobNum;
                if (knobNum === 1) {
                    knob1.style.width = knobSize + 'px';
                    knob1.style.height = knobSize + 'px';
                    knob1.style.top = '50%';
                    knob1.style.transform = 'translateY(-50%)';
                    knob1.style.zIndex = '10';
                    
                    knob2.style.width = smallKnobSize + 'px';
                    knob2.style.height = smallKnobSize + 'px';
                    knob2.style.top = '50%';
                    knob2.style.transform = 'translateY(-50%)';
                    knob2.style.zIndex = '9';
                    
                    hueInput.value = hsl.h;
                } else {
                    knob2.style.width = knobSize + 'px';
                    knob2.style.height = knobSize + 'px';
                    knob2.style.top = '50%';
                    knob2.style.transform = 'translateY(-50%)';
                    knob2.style.zIndex = '10';
                    
                    knob1.style.width = smallKnobSize + 'px';
                    knob1.style.height = smallKnobSize + 'px';
                    knob1.style.top = '50%';
                    knob1.style.transform = 'translateY(-50%)';
                    knob1.style.zIndex = '9';
                    
                    hueInput.value = hsl2.h;
                }
                updateKnobPositions(); // Recalculate positions after size change
            };

            // Mouse event handlers - optimized for performance
            const startDrag = (knobNum, e) => {
                isSliderActive = true;  // Prevent menu re-rendering during drag
                selectKnob(knobNum);
                isDragging = true;
                dragKnob = knobNum;
                
                // Close any open swatch popup when starting to drag a knob
                if (swatchPopup) {
                    swatchPopup.remove();
                    swatchPopup = null;
                }
                
                e.preventDefault();
                e.stopPropagation();
            };

            knob1.addEventListener('mousedown', (e) => startDrag(1, e));
            knob2.addEventListener('mousedown', (e) => startDrag(2, e));

            const handleMouseMove = (e) => {
                if (!isDragging || !dragKnob) return;
                
                const rect = sliderContainer.getBoundingClientRect();
                const sliderWidth = 160;
                const trackPadding = 10;
                const trackWidth = sliderWidth - (trackPadding * 2);
                const x = Math.max(0, Math.min(trackWidth, e.clientX - rect.left - trackPadding));
                const hueValue = Math.round((x / trackWidth) * 359);

                if (dragKnob === 1) {
                    hsl.h = hueValue;
                    rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
                    hueInput.value = hueValue;
                    // Update color and redraw rays in real-time
                    const colorHex = rgbToHex(rgb.r, rgb.g, rgb.b);
                    state.rayPolygonColor[idx] = colorHex;
                    drawApertureRays();
                } else {
                    hsl2.h = hueValue;
                    rgb2 = hslToRgb(hsl2.h, hsl2.s, hsl2.l);
                    hueInput.value = hueValue;
                    // Update color and redraw rays in real-time
                    const color2Hex = rgbToHex(rgb2.r, rgb2.g, rgb2.b);
                    state.rayPolygonColor2[idx] = color2Hex;
                    drawApertureRays();
                }
                updateKnobPositions();
            };

            const handleMouseUp = () => {
                isDragging = false;
                dragKnob = null;
                isSliderActive = false;  // Allow menu re-rendering again
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

        } else {
            // Clear existing sliders first
            sliderContainer.innerHTML = '';
            
            // Single knob slider for normal mode
            hueSlider1 = document.createElement('input');
            hueSlider1.type = 'range';
            hueSlider1.min = 0;
            hueSlider1.max = 359;
            hueSlider1.value = hsl.h;
            hueSlider1.title = 'Hue';
            hueSlider1.className = 'hue-slider single-knob';
            sliderContainer.appendChild(hueSlider1);

            hueSlider1.addEventListener('mousedown', () => {
                isSliderActive = true;
            });
            
            hueSlider1.addEventListener('mouseup', () => {
                isSliderActive = false;
            });
            
            hueSlider1.addEventListener('input', e => {
                hsl.h = parseInt(hueSlider1.value);
                if (hueInput) hueInput.value = hsl.h;
                rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
                updateRayColor();
            });
        }

        // Hue input field
        hueInput = document.createElement('input');
        hueInput.type = 'number';
        hueInput.min = 0;
        hueInput.max = 359;
        hueInput.value = hsl.h;
        hueInput.title = 'Hue';
        hueInput.className = 'hue-input';
        row.appendChild(hueInput);

        // Hue input event handler
        hueInput.addEventListener('input', e => {
            let val = Math.max(0, Math.min(359, parseInt(hueInput.value) || 0));
            if (state.gradientEnabled[idx]) {
                if (selectedKnob === 1) {
                    hsl.h = val;
                    rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
                    updateRayColor();
                } else {
                    hsl2.h = val;
                    rgb2 = hslToRgb(hsl2.h, hsl2.s, hsl2.l);
                    updateRayColor2();
                }
                // Update knob positions with the correct calculation
                const updateKnobPositions = () => {
                    const sliderWidth = 160;
                    const trackPadding = 10;
                    const trackWidth = sliderWidth - (trackPadding * 2);
                    const knob1 = sliderContainer.querySelector('.knob1');
                    const knob2 = sliderContainer.querySelector('.knob2');
                    if (knob1 && knob2) {
                        const knobSize1 = parseInt(knob1.style.width);
                        const knobSize2 = parseInt(knob2.style.width);
                        const pos1 = trackPadding + (hsl.h / 359) * trackWidth - (knobSize1 / 2);
                        const pos2 = trackPadding + (hsl2.h / 359) * trackWidth - (knobSize2 / 2);
                        knob1.style.left = Math.max(0, Math.min(sliderWidth - knobSize1, pos1)) + 'px';
                        knob2.style.left = Math.max(0, Math.min(sliderWidth - knobSize2, pos2)) + 'px';
                    }
                };
                updateKnobPositions();
            } else {
                hsl.h = val;
                if (hueSlider1) hueSlider1.value = val;
                rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
                updateRayColor();
            }
        });
        // Update all controls to match current color
    // Only one updateAllControls function should exist. Remove this duplicate.

        // Gradient toggle button
        const gradientBtn = document.createElement('button');
        gradientBtn.innerHTML = ''; // Clear any text content
        gradientBtn.title = state.gradientEnabled[idx] ? 'Disable gradient' : 'Enable gradient';
        gradientBtn.className = state.gradientEnabled[idx] ? 'gradient-toggle active' : 'gradient-toggle';
        
        // Create gradient icon rectangle inside the button
        const gradientIcon = document.createElement('div');
        gradientIcon.className = 'gradient-icon';
        
        gradientBtn.appendChild(gradientIcon);
        
        row.appendChild(gradientBtn);

        gradientBtn.addEventListener('click', e => {
            e.stopPropagation();
            state.gradientEnabled[idx] = !state.gradientEnabled[idx];
            
            // Update button title and class
            gradientBtn.title = state.gradientEnabled[idx] ? 'Disable gradient' : 'Enable gradient';
            gradientBtn.className = state.gradientEnabled[idx] ? 'gradient-toggle active' : 'gradient-toggle';
            
            // The gradient icon always shows the same gradient rectangle
            
            showRayShapeMenu(component); // re-render menu with/without second color picker
            drawApertureRays();
        });

        // Swatch button
        const swatchBtn = document.createElement('button');
        swatchBtn.textContent = '🎨';
        swatchBtn.title = 'Show color swatch';
        swatchBtn.className = 'swatch-btn';
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
            swatchPopup.className = 'swatch-popup';
            // Position below the button
            const rect = swatchBtn.getBoundingClientRect();
            swatchPopup.style.left = rect.left + 'px';
            swatchPopup.style.top = (rect.bottom + 4) + 'px';
            // Gather all unique colors from all rays in all components (excluding root)
            const usedColors = new Set();
            
            for (const compId in componentState) {
                const comp = componentState[compId];
                
                // Skip the root component - root component has parentId === null
                if (comp.parentId === null || comp.parentId === undefined) continue;
                
                // Collect colors from rayPolygonColor (solid colors and first gradient colors)
                if (Array.isArray(comp.rayPolygonColor)) {
                    comp.rayPolygonColor.forEach(col => {
                        if (col) {
                            const color = col.startsWith('#') ? col : '#' + col;
                            usedColors.add(color);
                        }
                    });
                } else if (comp.rayPolygonColor) {
                    const color = comp.rayPolygonColor.startsWith('#') ? comp.rayPolygonColor : '#' + comp.rayPolygonColor;
                    usedColors.add(color);
                }
                
                // Collect colors from rayPolygonColor2 only if gradient is enabled for those rays
                if (comp.gradientEnabled && Array.isArray(comp.gradientEnabled)) {
                    // Check each ray's gradient state
                    comp.gradientEnabled.forEach((isGradientEnabled, rayIdx) => {
                        if (isGradientEnabled && comp.rayPolygonColor2 && comp.rayPolygonColor2[rayIdx]) {
                            const col = comp.rayPolygonColor2[rayIdx];
                            if (col) {
                                const color = col.startsWith('#') ? col : '#' + col;
                                usedColors.add(color);
                            }
                        }
                    });
                } else if (comp.gradientEnabled && comp.rayPolygonColor2) {
                    // Single gradient enabled state
                    if (Array.isArray(comp.rayPolygonColor2)) {
                        comp.rayPolygonColor2.forEach(col => {
                            if (col) {
                                const color = col.startsWith('#') ? col : '#' + col;
                                usedColors.add(color);
                            }
                        });
                    } else {
                        const color = comp.rayPolygonColor2.startsWith('#') ? comp.rayPolygonColor2 : '#' + comp.rayPolygonColor2;
                        usedColors.add(color);
                    }
                }
            }
            if (usedColors.size === 0) {
                const none = document.createElement('div');
                none.textContent = 'No colors yet';
                none.className = 'no-colors';
                swatchPopup.appendChild(none);
            } else {
                usedColors.forEach(col => {
                    const swatch = document.createElement('div');
                    swatch.className = 'swatch';
                    swatch.style.background = col;
                    swatch.title = col;
                    swatch.addEventListener('click', ev => {
                        if (state.gradientEnabled[idx]) {
                            // When gradient is enabled, update the selected knob's color
                            if (selectedKnob === 1) {
                                // Update color1 (first color)
                                colorHex = col;
                                rgb = hexToRgb(colorHex);
                                hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                                hueInput.value = hsl.h;
                                updateRayColor();
                                // Directly update knob1 position - find knob by class
                                const knob1Element = sliderContainer.querySelector('.knob1');
                                if (knob1Element) {
                                    const sliderWidth = 160;
                                    const trackPadding = 10;
                                    const trackWidth = sliderWidth - (trackPadding * 2);
                                    const knobSize = 20;
                                    const pos1 = trackPadding + (hsl.h / 359) * trackWidth - (knobSize / 2);
                                    knob1Element.style.left = Math.max(0, Math.min(sliderWidth - knobSize, pos1)) + 'px';
                                }
                            } else {
                                // Update color2 (second color)
                                color2Hex = col;
                                rgb2 = hexToRgb(color2Hex);
                                hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b);
                                hueInput.value = hsl2.h;
                                updateRayColor2();
                                // Directly update knob2 position - find knob by class
                                const knob2Element = sliderContainer.querySelector('.knob2');
                                if (knob2Element) {
                                    const sliderWidth = 160;
                                    const trackPadding = 10;
                                    const trackWidth = sliderWidth - (trackPadding * 2);
                                    const smallKnobSize = 16;
                                    const pos2 = trackPadding + (hsl2.h / 359) * trackWidth - (smallKnobSize / 2);
                                    knob2Element.style.left = Math.max(0, Math.min(sliderWidth - smallKnobSize, pos2)) + 'px';
                                }
                            }
                        } else {
                            // Single color mode - update the main color
                            colorHex = col;
                            rgb = hexToRgb(colorHex);
                            hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                            if (hueSlider1) hueSlider1.value = hsl.h;
                            hueInput.value = hsl.h;
                            updateRayColor();
                        }
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

        // Update second ray color and redraw
        function updateRayColor2() {
            color2Hex = rgbToHex(rgb2.r, rgb2.g, rgb2.b);
            state.rayPolygonColor2[idx] = color2Hex;
            drawApertureRays();
        }

        // Remove button (except for the first row)
        if (numRays > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '−';
            removeBtn.title = 'Remove this ray';
            removeBtn.className = 'remove-btn';
            removeBtn.addEventListener('click', e => {
                e.stopPropagation();
                state.rayShape.splice(idx, 1);
                state.rayPolygonColor.splice(idx, 1);
                state.rayPolygonColor2.splice(idx, 1);
                state.gradientEnabled.splice(idx, 1);
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
            plusBtn.className = 'plus-btn';
            plusBtn.addEventListener('click', e => {
                e.stopPropagation();
                state.rayShape.push(validRayShapes[0]);
                state.rayPolygonColor.push('#00ffff');
                state.rayPolygonColor2.push('#ff00ff');
                state.gradientEnabled.push(false);
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

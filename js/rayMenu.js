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

// Show ray shape menu for the selected component
export function showRayShapeMenu(component) {
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

        // Ray Shape label
        const shapeLabel = document.createElement('span');
        shapeLabel.textContent = 'Shape:';
        shapeLabel.style.marginRight = '4px';
        row.appendChild(shapeLabel);

        // Ray Shape select
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
        // Prevent menu from closing when interacting with select
        shapeSelect.addEventListener('mousedown', e => e.stopPropagation());
        row.appendChild(shapeSelect);

        // Color label
        const colorLabel = document.createElement('span');
        colorLabel.textContent = 'Color:';
        colorLabel.style.marginLeft = '12px';
        colorLabel.style.marginRight = '4px';
        row.appendChild(colorLabel);

        // Color input
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = typeof ray.color === 'string' ? (ray.color.startsWith('#') ? ray.color : '#' + ray.color) : DEFAULT_SOLID_RAY_COLOR;
        colorInput.style.width = '28px';
        colorInput.style.height = '22px';
        colorInput.style.border = 'none';
        colorInput.style.background = 'none';
        colorInput.style.cursor = 'pointer';
        colorInput.style.padding = '0';
        ['mousedown', 'mouseup', 'click'].forEach(evt => {
            colorInput.addEventListener(evt, e => e.stopPropagation());
        });
        colorInput.addEventListener('input', e => {
            ray.color = colorInput.value;
            drawApertureRays();
        });
        row.appendChild(colorInput);

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
            removeBtn.addEventListener('mousedown', e => e.stopPropagation());
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
                    color: DEFAULT_SOLID_RAY_COLOR
                });
                showRayShapeMenu(component); // re-render menu
                drawApertureRays();
            });
            plusBtn.addEventListener('mousedown', e => e.stopPropagation());
            row.appendChild(plusBtn);
        }

        menu.appendChild(row);
    });

    // (plusBtn is now only in the topRow at the top of the menu)

    // Add to document
    container.appendChild(menu);
    currentMenu = menu;

    // No need for position adjustment: always at top of canvas

    // Close menu when clicking outside (use mousedown for better UX)
    const closeHandler = (e) => {
        if (!menu.contains(e.target)) {
            hideRayShapeMenu();
            document.removeEventListener('mousedown', closeHandler);
        }
    };

    // Add slight delay to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('mousedown', closeHandler);
    }, 100);
}

// Hide the ray shape menu
export function hideRayShapeMenu() {
    if (currentMenu) {
        currentMenu.remove();
        currentMenu = null;
    }
}

// Select a new ray shape for the component
function selectRayShape(componentId, newRayShape) {
    const state = componentState[componentId];
    if (!state) return;

    const oldRayShape = state.dimensions.rayShape || 'collimated';

    // Update the component's dimensions with the new ray shape
    let newDimensions = changeComponentRayShape(state.dimensions, newRayShape);

    // If changing from collimated to divergent/convergent, immediately update cone angle
    if (oldRayShape === 'collimated' && (newRayShape === 'divergent' || newRayShape === 'convergent')) {
        state.dimensions = newDimensions;
        updateConeAngleForRayShapeChange(state);
    }
    // If changing to collimated, immediately adjust aperture to match parent's projection
    else if (newRayShape === 'collimated') {
        if (state.parentId !== null) {
            const parentState = componentState[state.parentId];
            if (parentState) {
                // Use the collimated policy to get the correct aperture
                const optimizedDims = calculateOptimalAperture(
                    { ...state, dimensions: newDimensions },
                    parentState,
                    true
                );
                if (optimizedDims) {
                    newDimensions = optimizedDims;
                }
            }
        }
        newDimensions = setConeAngle(newDimensions, 0);
        state.dimensions = newDimensions;
        console.log(`Component ${componentId} aperture and cone angle adjusted for collimated ray shape`);
    } else {
        state.dimensions = newDimensions;
    }

    // Update debug aperture points visually
    const compElem = getComponentById(componentId);
    if (compElem) {
        updateAperturePointDrawings(compElem, state.dimensions);
    }

    // Redraw aperture rays if they are currently shown
    if (showApertureRays) {
        drawApertureRays();
    }

    console.log(`Component ${componentId} ray shape changed from ${oldRayShape} to ${newRayShape}`);
}

// Helper function to update cone angle when ray shape changes from collimated to divergent/convergent
function updateConeAngleForRayShapeChange(childState) {
    // Only proceed if the component has a parent
    if (childState.parentId === null) {
        console.log(`Component ${childState.componentId || 'temp'} has no parent, cannot calculate cone angle`);
        return;
    }
    
    const parentState = componentState[childState.parentId];
    if (!parentState) {
        console.log(`Parent state not found for component ${childState.componentId || 'temp'}`);
        return;
    }
    
    try {
        // Use the aperture calculation system to determine the proper cone angle
        const optimizedDimensions = calculateOptimalAperture(childState, parentState, true);
        
        if (optimizedDimensions) {
            // Update the component's dimensions with the calculated cone angle and aperture
            childState.dimensions = optimizedDimensions;
            
            const newConeAngle = optimizedDimensions.coneAngle || 0;
            console.log(`Component ${childState.componentId || 'temp'} cone angle immediately updated to ${newConeAngle.toFixed(2)}° due to ray shape change`);
        } else {
            console.warn(`Could not calculate optimal aperture/cone angle for component ${childState.componentId || 'temp'}`);
        }
    } catch (error) {
        console.error('Error updating cone angle for ray shape change:', error);
    }
}

// Check if a component should show the ray shape menu when selected
export function shouldShowRayShapeMenu(component) {
    if (!showApertureRays || !component) return false;
    
    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    
    if (!state) return false;
    
    // Don't show menu if component has no parent (no rays to configure)
    if (state.parentId === null) return false;
    
    return true;
}

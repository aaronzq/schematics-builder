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
    menu.style.alignItems = 'center';
    menu.style.gap = '24px';
        menu.style.boxSizing = 'border-box';
    
    // Add title (banner style)
    const title = document.createElement('div');
    title.textContent = 'Ray Shape:';
    title.style.fontWeight = 'bold';
    title.style.marginLeft = '8px';
    title.style.marginRight = '8px';
    menu.appendChild(title);
    
    // Get current ray shape
    const currentRayShape = state.dimensions.rayShape;
    const validRayShapes = getValidRayShapes();
    
    // Create options for each ray shape
    validRayShapes.forEach(rayShape => {
        const option = document.createElement('div');
        option.className = 'ray-shape-option';
        option.textContent = rayShape.charAt(0).toUpperCase() + rayShape.slice(1);
        option.style.padding = '4px 8px';
        option.style.cursor = 'pointer';
        option.style.borderRadius = '2px';
        
        // Highlight current selection
        if (rayShape === currentRayShape) {
            option.style.backgroundColor = '#e3f2fd';
            option.style.fontWeight = 'bold';
        }
        
        // Add hover effects
        option.addEventListener('mouseenter', () => {
            if (rayShape !== currentRayShape) {
                option.style.backgroundColor = '#f5f5f5';
            }
        });
        
        option.addEventListener('mouseleave', () => {
            if (rayShape !== currentRayShape) {
                option.style.backgroundColor = 'transparent';
            }
        });
        
        // Handle selection
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            selectRayShape(compId, rayShape);
            hideRayShapeMenu();
        });
        
        menu.appendChild(option);
    });
    
    // --- Add Solid Ray Color title and color picker row ---
    const colorTitle = document.createElement('div');
    colorTitle.textContent = 'Solid Ray Color:';
    colorTitle.style.fontWeight = 'bold';
    colorTitle.style.marginLeft = '8px';
    colorTitle.style.marginRight = '8px';
    menu.appendChild(colorTitle);

    const colorRow = document.createElement('div');
    colorRow.className = 'ray-shape-option';
    colorRow.style.display = 'flex';
    colorRow.style.alignItems = 'center';
    colorRow.style.padding = '4px 8px';
    colorRow.style.borderRadius = '2px';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.title = 'Change solid ray polygon color';
    colorInput.style.width = '28px';
    colorInput.style.height = '22px';
    colorInput.style.border = 'none';
    colorInput.style.background = 'none';
    colorInput.style.cursor = 'pointer';
    colorInput.style.padding = '0';
    // Prevent menu from closing when interacting with color input
    ['mousedown', 'mouseup', 'click'].forEach(evt => {
        colorInput.addEventListener(evt, e => e.stopPropagation());
    });

    // Always use the color currently used for drawing (from state), normalizing to #RRGGBB if needed
    let colorValue = state.rayPolygonColor;
    if (typeof colorValue === 'string') {
        // Add # if missing and valid hex
        if (/^[0-9A-Fa-f]{6}$/.test(colorValue)) {
            colorValue = '#' + colorValue;
        }
        // Accept #RRGGBB
        else if (/^#([0-9A-Fa-f]{6})$/.test(colorValue)) {
            // already valid
        } else {
            colorValue = null;
        }
    } else {
        colorValue = null;
    }
    // Only fallback to default if truly missing or invalid
    if (!colorValue) {
        colorValue = DEFAULT_SOLID_RAY_COLOR;
    }

    colorInput.addEventListener('input', (e) => {
        state.rayPolygonColor = colorInput.value;
        componentState[compId].rayPolygonColor = colorInput.value;
        drawApertureRays();
    });

    colorRow.appendChild(colorInput);
    menu.appendChild(colorRow);
    // Set value after appending to DOM to avoid browser quirks
    setTimeout(() => { colorInput.value = colorValue; }, 0);

    // Add to document
    container.appendChild(menu);
    currentMenu = menu;

    // No need for position adjustment: always at top of canvas

    // Close menu when clicking outside
    const closeHandler = (e) => {
        if (!menu.contains(e.target)) {
            hideRayShapeMenu();
            document.removeEventListener('click', closeHandler);
        }
    };

    // Add slight delay to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('click', closeHandler);
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

// Ray shape menu for selected components
// Displays a dropdown menu to change the rayShape property of selected components

import { componentState } from './componentManager.js';
import { changeComponentRayShape, getValidRayShapes } from './modules/componentUtils.js';
import { drawApertureRays, showApertureRays } from './rays.js';

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
    
    // Get component position
    const componentRect = component.getBoundingClientRect();
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate position relative to the page
    const menuX = componentRect.left + componentRect.width / 2;
    const menuY = componentRect.bottom + 10; // 10px below the component
    
    // Create menu container
    const menu = document.createElement('div');
    menu.className = 'ray-shape-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${menuX}px`;
    menu.style.top = `${menuY}px`;
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    menu.style.zIndex = '1000';
    menu.style.padding = '4px';
    menu.style.minWidth = '120px';
    menu.style.fontSize = '12px';
    menu.style.fontFamily = 'Arial, sans-serif';
    
    // Add title
    const title = document.createElement('div');
    title.textContent = 'Ray Shape:';
    title.style.fontWeight = 'bold';
    title.style.padding = '4px 8px';
    title.style.borderBottom = '1px solid #eee';
    title.style.marginBottom = '2px';
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
    
    // Add to document
    document.body.appendChild(menu);
    currentMenu = menu;
    
    // Position adjustment if menu goes off screen
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
        menu.style.left = `${menuX - menuRect.width}px`;
    }
    if (menuRect.bottom > window.innerHeight) {
        menu.style.top = `${menuY - menuRect.height - componentRect.height - 20}px`;
    }
    
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
    
    // Update the component's dimensions with the new ray shape
    const newDimensions = changeComponentRayShape(state.dimensions, newRayShape);
    state.dimensions = newDimensions;
    
    // Redraw aperture rays if they are currently shown
    if (showApertureRays) {
        drawApertureRays();
    }
    
    console.log(`Component ${componentId} ray shape changed to: ${newRayShape}`);
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

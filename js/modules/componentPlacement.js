// Component placement and positioning logic
// Handles calculating positions and rotations for new components

import { componentDimensions } from '../components.js';
import { COMPONENT_SPACING, ARROW_TIP_SNAP_SIZE } from '../constants.js';
import { snapToGrid } from '../viewportManager.js';

/**
 * Calculate placement position and rotation for a new component
 * @param {string} type - Component type
 * @param {HTMLElement} selectedComponent - Parent component (if any)
 * @param {object} componentState - Global component state
 * @param {object} nextPosition - Fallback position
 * @returns {object} Placement info with centerX, centerY, rotation
 */
export function calculateComponentPlacement(type, selectedComponent, componentState, nextPosition) {
    let centerX = nextPosition.x;
    let centerY = nextPosition.y;
    let initialRotation = 0;
    
    if (!selectedComponent) {
        return { centerX, centerY, rotation: initialRotation };
    }

    const selId = selectedComponent.getAttribute('data-id');
    const selState = componentState[selId];
    
    if (!selState || typeof selState.arrowX !== "number" || typeof selState.arrowY !== "number") {
        return { centerX, centerY, rotation: initialRotation };
    }

    const dims = componentDimensions[type];
    const selectedDims = componentDimensions[selectedComponent.getAttribute('data-type')];
    
    // Step 1: Center point of new component = arrow tip of parent
    centerX = selState.arrowX;
    centerY = selState.arrowY;
    
    // Step 2: Calculate arrow direction vector (normalized)
    const selectedCenterX = selState.posX; // posX/posY now store center coordinates
    const selectedCenterY = selState.posY;
    
    const dx = selState.arrowX - selectedCenterX;
    const dy = selState.arrowY - selectedCenterY;
    const arrowLength = Math.sqrt(dx * dx + dy * dy);
    const arrowDirX = dx / arrowLength;
    const arrowDirY = dy / arrowLength;
    
    // Step 3: Calculate rotation to align new component's forwardVector with arrow direction
    const currentAngle = Math.atan2(dims.forwardVector.y, dims.forwardVector.x);
    const targetAngle = Math.atan2(arrowDirY, arrowDirX);
    initialRotation = (targetAngle - currentAngle) * 180 / Math.PI;
    
    return { centerX, centerY, rotation: initialRotation };
}

/**
 * Calculate arrow endpoint position for a component
 * @param {object} componentState - Component state
 * @param {object} dims - Component dimensions
 * @returns {object} Arrow endpoint coordinates
 */
export function calculateArrowEndpoint(componentState, dims) {
    const centerPointX = componentState.posX; // posX now stores center X coordinate
    const centerPointY = componentState.posY; // posY now stores center Y coordinate
    const rotation = componentState.rotation || 0;
    
    // Calculate the raw arrow endpoint position
    const rawX = centerPointX + COMPONENT_SPACING * Math.cos(rotation * Math.PI / 180);
    const rawY = centerPointY + COMPONENT_SPACING * Math.sin(rotation * Math.PI / 180);
    
    // Snap the arrow tip to the grid for pixel-perfect positioning
    const snapped = snapToGrid(rawX, rawY, ARROW_TIP_SNAP_SIZE);
    
    return {
        x: snapped.x,
        y: snapped.y
    };
}

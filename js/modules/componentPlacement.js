// Component placement and positioning logic
// Handles calculating positions and rotations for new components

import { componentDimensions } from '../components.js';
import { COMPONENT_SPACING } from '../constants.js';

/**
 * Calculate placement position and rotation for a new component
 * @param {string} type - Component type
 * @param {HTMLElement} selectedComponent - Parent component (if any)
 * @param {object} componentState - Global component state
 * @param {object} nextPosition - Fallback position
 * @returns {object} Placement info with x, y, rotation
 */
export function calculateComponentPlacement(type, selectedComponent, componentState, nextPosition) {
    let placeX = nextPosition.x;
    let placeY = nextPosition.y;
    let initialRotation = 0;
    
    if (!selectedComponent) {
        return { x: placeX, y: placeY, rotation: initialRotation };
    }

    const selId = selectedComponent.getAttribute('data-id');
    const selState = componentState[selId];
    
    if (!selState || typeof selState.arrowX !== "number" || typeof selState.arrowY !== "number") {
        return { x: placeX, y: placeY, rotation: initialRotation };
    }

    const dims = componentDimensions[type];
    const selectedDims = componentDimensions[selectedComponent.getAttribute('data-type')];
    
    // Step 1: Center point of new component = arrow tip of parent
    const newCenterX = selState.arrowX;
    const newCenterY = selState.arrowY;
    
    // Step 2: Calculate arrow direction vector (normalized)
    const selectedCenterX = selState.posX + selectedDims.centerPoint.x;
    const selectedCenterY = selState.posY + selectedDims.centerPoint.y;
    
    const dx = selState.arrowX - selectedCenterX;
    const dy = selState.arrowY - selectedCenterY;
    const arrowLength = Math.sqrt(dx * dx + dy * dy);
    const arrowDirX = dx / arrowLength;
    const arrowDirY = dy / arrowLength;
    
    // Step 3: Calculate rotation to align new component's forwardVector with arrow direction
    const currentAngle = Math.atan2(dims.forwardVector.y, dims.forwardVector.x);
    const targetAngle = Math.atan2(arrowDirY, arrowDirX);
    initialRotation = (targetAngle - currentAngle) * 180 / Math.PI;
    
    // Step 4: Calculate component position to place center point at arrow tip
    placeX = newCenterX - dims.centerPoint.x;
    placeY = newCenterY - dims.centerPoint.y;
    
    return { x: placeX, y: placeY, rotation: initialRotation };
}

/**
 * Calculate arrow endpoint position for a component
 * @param {object} componentState - Component state
 * @param {object} dims - Component dimensions
 * @returns {object} Arrow endpoint coordinates
 */
export function calculateArrowEndpoint(componentState, dims) {
    const centerPointX = componentState.posX + dims.centerPoint.x;
    const centerPointY = componentState.posY + dims.centerPoint.y;
    const rotation = componentState.rotation || 0;
    
    return {
        x: centerPointX + COMPONENT_SPACING * Math.cos(rotation * Math.PI / 180),
        y: centerPointY + COMPONENT_SPACING * Math.sin(rotation * Math.PI / 180)
    };
}

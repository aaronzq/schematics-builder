// Component aperture scaling functionality
// Handles automatic scaling of aperture radius to match parent projections

import { changeComponentApertureRadius } from './componentUtils.js';
import { calculateApertureProjections } from '../rays.js';
import { SHOW_DEBUG_DRAWING } from '../constants.js';

/**
 * Auto-scale aperture radius to match parent's projection during component creation
 * @param {object} childDims - Child component dimensions
 * @param {number} compId - Component ID
 * @param {number} placeX - X position
 * @param {number} placeY - Y position
 * @param {number} initialRotation - Initial rotation
 * @param {HTMLElement} parentComponent - Parent component element
 * @param {object} componentState - Global component state
 * @returns {object} Scaled dimensions or original dimensions
 */
export function autoScaleApertureToMatchParent(childDims, compId, centerX, centerY, initialRotation, parentComponent, componentState) {
    const parentId = parseInt(parentComponent.getAttribute('data-id'));
    const parentState = componentState[parentId];
    
    if (!parentState || !parentState.dimensions) {
        console.warn('Parent state or dimensions not found, using original aperture radius');
        return childDims;
    }
    
    // Create temporary state for the child component to enable projection calculations
    const tempChildState = {
        posX: centerX,
        posY: centerY,
        rotation: initialRotation,
        dimensions: childDims,
        parentId: parentId,
        type: childDims.type || 'unknown'
    };
    
    // Temporarily add to componentState
    componentState[compId] = tempChildState;
    
    // Create a temporary component element for calculations
    const tempComponent = {
        getAttribute: (attr) => {
            if (attr === 'data-id') return compId.toString();
            if (attr === 'data-type') return tempChildState.type;
            return null;
        }
    };
    
    try {
        const scaledDims = performApertureScaling(tempComponent, childDims, true, componentState);
        return scaledDims || childDims;
        
    } catch (error) {
        console.error('Error during aperture scaling:', error);
        return childDims;
    } finally {
        // Clean up temporary state
        delete componentState[compId];
    }
}

/**
 * Auto-scale aperture radius for existing components during drag/rotation
 * @param {HTMLElement} component - Component element
 * @param {object} componentState - Global component state
 * @returns {object|null} Scaled dimensions or null
 */
export function autoScaleApertureForExistingComponent(component, componentState) {
    if (!component) return null;
    
    const compId = parseInt(component.getAttribute('data-id'));
    const state = componentState[compId];
    
    if (!state || state.parentId === null || !state.dimensions) {
        return null; // No parent or no dimensions to scale
    }
    
    const parentState = componentState[state.parentId];
    if (!parentState || !parentState.dimensions) {
        return null; // Parent not found
    }
    
    try {
        return performApertureScaling(component, state.dimensions, false, componentState);
        
    } catch (error) {
        console.error('Error during dynamic aperture scaling:', error);
        return null;
    }
}

/**
 * Core aperture scaling logic - used by both creation and dynamic scaling
 * @param {HTMLElement|object} component - Component element or mock object
 * @param {object} currentDims - Current dimensions
 * @param {boolean} isCreationTime - Whether this is during component creation
 * @param {object} componentState - Global component state
 * @returns {object|null} Scaled dimensions or null
 */
export function performApertureScaling(component, currentDims, isCreationTime, componentState) {
    // Calculate current projections
    const projections = calculateApertureProjections(component);
    if (!projections) {
        if (isCreationTime) {
            console.warn('Could not calculate initial projections, using original aperture radius');
        }
        return null;
    }
    
    const targetProjection = projections.parent.apertureProjection;
    const currentChildProjection = projections.child.apertureProjection;
    
    // Handle edge cases
    if (currentChildProjection === 0) {
        if (isCreationTime) {
            console.warn('Initial child projection is zero, cannot scale aperture effectively');
        }
        return null;
    }
    
    // Calculate scaling ratio
    const scalingRatio = targetProjection / currentChildProjection;
    const currentApertureRadius = currentDims.apertureRadius;
    const newApertureRadius = currentApertureRadius * scalingRatio;
    
    // Ensure the new radius is reasonable
    if (newApertureRadius <= 0 || newApertureRadius > 200) {
        if (isCreationTime) {
            console.warn(`Calculated aperture radius ${newApertureRadius.toFixed(2)} is unreasonable, using original`);
        }
        return null;
    }
    
    // Apply the new aperture radius
    const scaledDims = changeComponentApertureRadius(currentDims, newApertureRadius);
    
    // Logging based on context
    if (isCreationTime) {
        console.log(`Auto-scaling aperture: Target projection=${targetProjection.toFixed(2)}, Initial child projection=${currentChildProjection.toFixed(2)}`);
        console.log(`Aperture scaling complete:`);
        console.log(`  Original radius: ${currentApertureRadius.toFixed(2)} → New radius: ${newApertureRadius.toFixed(2)} (ratio: ${scalingRatio.toFixed(3)})`);
        console.log(`  Target projection: ${targetProjection.toFixed(2)}, Expected child projection: ${targetProjection.toFixed(2)}`);
    } else {
        console.log(`Dynamic aperture scaling: ${currentApertureRadius.toFixed(1)} → ${newApertureRadius.toFixed(1)} (ratio: ${scalingRatio.toFixed(2)})`);
    }
    
    return scaledDims;
}

/**
 * Recursively update aperture scaling for all children and descendants
 * @param {HTMLElement} parentComponent - Parent component element
 * @param {object} componentState - Global component state
 * @param {function} getComponentById - Function to get component by ID
 * @param {function} updateAperturePointDrawings - Function to update aperture point visuals
 */
export function recursivelyUpdateChildrenApertures(parentComponent, componentState, getComponentById, updateAperturePointDrawings) {
    if (!parentComponent) return;
    
    const parentId = parseInt(parentComponent.getAttribute('data-id'));
    const parentState = componentState[parentId];
    
    if (!parentState || !parentState.children || parentState.children.length === 0) {
        return; // No children to update
    }
    
    // Process all direct children
    for (const childId of parentState.children) {
        const childComponent = getComponentById(childId);
        const childState = componentState[childId];
        
        if (!childComponent || !childState) {
            console.warn(`Child component ${childId} not found during recursive aperture update`);
            continue;
        }
        
        // Update this child's aperture to match its parent (the component being dragged/rotated)
        const scaledDims = autoScaleApertureForExistingComponent(childComponent, componentState);
        if (scaledDims) {
            childState.dimensions = scaledDims;
            console.log(`Recursively updated aperture for child component ${childId} (${childState.type})`);
            
            // Update the visual representation of aperture points
            if (updateAperturePointDrawings) {
                updateAperturePointDrawings(childComponent, scaledDims);
            }
        }
        
        // Recursively update this child's descendants
        recursivelyUpdateChildrenApertures(childComponent, componentState, getComponentById, updateAperturePointDrawings);
    }
}

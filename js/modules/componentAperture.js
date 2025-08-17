// Component aperture scaling functionality
// Handles automatic scaling of aperture radius to match parent projections

import { setApertureRadius, flipUpVector } from './componentUtils.js';
import { transformToGlobal } from '../utils/mathUtils.js';
import { SHOW_DEBUG_DRAWING } from '../constants.js';

/**
 * CORE APERTURE POLICY: Calculate optimal aperture radius for a component based on its parent
 * This is the single source of truth for all aperture scaling decisions
 * @param {object} childState - Child component state
 * @param {object} parentState - Parent component state  
 * @param {boolean} logDetails - Whether to log calculation details
 * @returns {object|null} - New dimensions with scaled aperture, or null if scaling not possible
 */
export function calculateOptimalAperture(childState, parentState, logDetails = false) {
    // Validate inputs
    if (!childState || !parentState) {
        if (logDetails) console.warn('Invalid child or parent state provided');
        return null;
    }
    
    if (!childState.dimensions || !parentState.dimensions) {
        if (logDetails) console.warn('Missing dimensions in child or parent state');
        return null;
    }
    
    const childDims = childState.dimensions;
    const parentDims = parentState.dimensions;
    
    // Calculate projections using the established logic
    const projections = calculateProjections_internal(childState, parentState);
    if (!projections) {
        if (logDetails) console.warn('Could not calculate aperture projections');
        return null;
    }
    
    const targetProjection = projections.parent.apertureProjection;
    const currentChildProjection = projections.child.apertureProjection;
    
    // Handle edge cases
    if (currentChildProjection === 0) {
        if (logDetails) console.warn('Child projection is zero, cannot scale aperture');
        return null;
    }
    
    // Calculate optimal aperture radius
    const scalingRatio = targetProjection / currentChildProjection;
    const currentRadius = childDims.apertureRadius || 0;
    const optimalRadius = currentRadius * scalingRatio;
    
    // Validate the calculated radius
    if (optimalRadius <= 0 || optimalRadius > 200) {
        if (logDetails) console.warn(`Calculated aperture radius ${optimalRadius.toFixed(2)} is unreasonable`);
        return null;
    }
    
    // Apply the optimal radius to create new dimensions
    const optimizedDimensions = setApertureRadius(childDims, optimalRadius);
    
    // Logging if requested
    if (logDetails) {
        console.log(`APERTURE CALCULATION: Component ${childState.type} (ID: ${childState.componentId || 'temp'})`);
        console.log(`  Target projection: ${targetProjection.toFixed(2)}, Current: ${currentChildProjection.toFixed(2)}`);
        console.log(`  Radius: ${currentRadius.toFixed(2)} → ${optimalRadius.toFixed(2)} (ratio: ${scalingRatio.toFixed(3)})`);
    }
    
    return optimizedDimensions;
}

/**
 * Internal helper: Calculate projections using component states directly
 * @param {object} childState - Child component state
 * @param {object} parentState - Parent component state
 * @returns {object|null} Projection data or null
 */
function calculateProjections_internal(childState, parentState) {
    const childDims = childState.dimensions;
    const parentDims = parentState.dimensions;
    
    // Calculate global center positions
    const childCenter = transformToGlobal(childDims.centerPoint.x, childDims.centerPoint.y, childState);
    const parentCenter = transformToGlobal(parentDims.centerPoint.x, parentDims.centerPoint.y, parentState);
    
    // Calculate center trace line direction vector
    const traceDx = childCenter.x - parentCenter.x;
    const traceDy = childCenter.y - parentCenter.y;
    const traceLength = Math.sqrt(traceDx * traceDx + traceDy * traceDy);
    
    if (traceLength === 0) return null;
    
    // Calculate perpendicular direction to the trace line
    const traceUnitX = traceDx / traceLength;
    const traceUnitY = traceDy / traceLength;
    const perpUnitX = -traceUnitY;
    const perpUnitY = traceUnitX;
    
    // Get aperture radius values
    const childApertureRadius = childDims.apertureRadius || 0;
    const parentApertureRadius = parentDims.apertureRadius || 0;
    
    // Transform upVectors to global coordinates
    const childUpVector = childDims.upVector;
    const parentUpVector = parentDims.upVector;
    
    const childGlobalUpX = childUpVector.x * Math.cos(childState.rotation * Math.PI / 180) - 
                          childUpVector.y * Math.sin(childState.rotation * Math.PI / 180);
    const childGlobalUpY = childUpVector.x * Math.sin(childState.rotation * Math.PI / 180) + 
                          childUpVector.y * Math.cos(childState.rotation * Math.PI / 180);
    
    const parentGlobalUpX = parentUpVector.x * Math.cos(parentState.rotation * Math.PI / 180) - 
                           parentUpVector.y * Math.sin(parentState.rotation * Math.PI / 180);
    const parentGlobalUpY = parentUpVector.x * Math.sin(parentState.rotation * Math.PI / 180) + 
                           parentUpVector.y * Math.cos(parentState.rotation * Math.PI / 180);
    
    // Calculate projections: dot product with perpendicular direction
    const childUpProjection = Math.abs(childGlobalUpX * perpUnitX + childGlobalUpY * perpUnitY);
    const parentUpProjection = Math.abs(parentGlobalUpX * perpUnitX + parentGlobalUpY * perpUnitY);
    
    // Calculate final aperture projections
    const childApertureProjection = childApertureRadius * childUpProjection;
    const parentApertureProjection = parentApertureRadius * parentUpProjection;
    
    return {
        child: {
            apertureRadius: childApertureRadius,
            apertureProjection: childApertureProjection,
            upProjectionFactor: childUpProjection
        },
        parent: {
            apertureRadius: parentApertureRadius,
            apertureProjection: parentApertureProjection,
            upProjectionFactor: parentUpProjection
        }
    };
}

/**
 * Auto-scale aperture radius to match parent's projection during component creation
 * @param {object} childDims - Child component dimensions
 * @param {number} compId - Component ID
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} initialRotation - Initial rotation
 * @param {HTMLElement} parentComponent - Parent component element
 * @param {object} componentState - Global component state
 * @returns {object} Scaled dimensions or original dimensions
 */
export function autoScaleForNewComponentPlacement(childDims, compId, centerX, centerY, initialRotation, parentComponent, componentState) {
    const parentId = parseInt(parentComponent.getAttribute('data-id'));
    const parentState = componentState[parentId];
    
    if (!parentState) {
        console.warn('Parent state not found, using original aperture radius');
        return childDims;
    }
    
    // Create temporary child state for calculation
    const tempChildState = {
        posX: centerX,
        posY: centerY,
        rotation: initialRotation,
        dimensions: childDims,
        parentId: parentId,
        type: childDims.type || 'unknown',
        componentId: compId
    };
    
    try {
        // Use core aperture policy to calculate optimal dimensions
        const optimizedDimensions = calculateOptimalAperture(tempChildState, parentState, true);
        return optimizedDimensions || childDims;
        
    } catch (error) {
        console.error('Error during component creation aperture scaling:', error);
        return childDims;
    }
}

/**
 * Auto-scale aperture radius for existing components during drag/rotation
 * @param {HTMLElement} component - Component element
 * @param {object} componentState - Global component state
 * @returns {object|null} Scaled dimensions or null
 */
export function autoScaleForComponentDragRotation(component, componentState) {
    if (!component) return null;
    
    const compId = parseInt(component.getAttribute('data-id'));
    const childState = componentState[compId];
    
    if (!childState || childState.parentId === null) {
        return null; // No parent to scale against
    }
    
    const parentState = componentState[childState.parentId];
    if (!parentState) {
        return null; // Parent not found
    }
    
    try {
        // Use core aperture policy to calculate optimal dimensions
        return calculateOptimalAperture(childState, parentState, false);
        
    } catch (error) {
        console.error('Error during dynamic aperture scaling:', error);
        return null;
    }
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
        const scaledDims = autoScaleForComponentDragRotation(childComponent, componentState);
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

/**
 * Handle upVector flipping to avoid crossing aperture lines
 * @param {object} dims - Component dimensions
 * @param {number} compId - Component ID
 * @param {object} placement - Placement info
 * @param {string} type - Component type
 * @param {HTMLElement} selectedComponent - Currently selected component
 * @param {object} componentState - Global component state
 * @returns {object} Final dimensions (possibly flipped)
 */
export function handleCrossing(dims, compId, placement, type, selectedComponent, componentState) {
    if (!selectedComponent) return dims;

    const parentId = parseInt(selectedComponent.getAttribute('data-id'));
    
    // Test with normal orientation
    const tempState = {
        posX: placement.centerX,
        posY: placement.centerY,
        rotation: placement.rotation,
        dimensions: dims,
        parentId: parentId,
        type: type
    };
    
    componentState[compId] = tempState;
    const linesCrossNormal = checkLinesCross(compId, componentState);
    
    if (linesCrossNormal) {
        // Test with flipped orientation
        const flippedDims = flipUpVector(dims);
        tempState.dimensions = flippedDims;
        const linesCrossFlipped = checkLinesCross(compId, componentState);
        
        if (!linesCrossFlipped) {
            console.log(`Component ${compId} (${type}) FLIPPED to avoid crossing aperture lines`);
            delete componentState[compId];
            return flippedDims;
        }
    }
    
    delete componentState[compId];
    return dims;
}

/**
 * Helper function to check if aperture lines cross between a component and its parent
 * @param {number} componentId - Component ID to check
 * @param {object} componentState - Global component state
 * @returns {boolean} True if aperture lines cross, false otherwise
 */
export function checkLinesCross(componentId, componentState) {
    const state = componentState[componentId];
    
    // Return false if component has no parent or invalid state
    if (!state || state.parentId === null) return false;
    
    const parentState = componentState[state.parentId];
    if (!parentState) return false;
    
    // Get component orientations
    const childDims = state.dimensions;
    const parentDims = parentState.dimensions;
    
    if (!childDims || !parentDims) return false;
    
    // Calculate global positions for child and parent aperture points and center points
    const childUpper = transformToGlobal(childDims.aperturePoints.upper.x, childDims.aperturePoints.upper.y, state);
    const childLower = transformToGlobal(childDims.aperturePoints.lower.x, childDims.aperturePoints.lower.y, state);
    const childCenter = transformToGlobal(childDims.centerPoint.x, childDims.centerPoint.y, state);
    const parentUpper = transformToGlobal(parentDims.aperturePoints.upper.x, parentDims.aperturePoints.upper.y, parentState);
    const parentLower = transformToGlobal(parentDims.aperturePoints.lower.x, parentDims.aperturePoints.lower.y, parentState);
    const parentCenter = transformToGlobal(parentDims.centerPoint.x, parentDims.centerPoint.y, parentState);
    
    // Determine connection points based on child component's ray shape
    let upperRayStart, upperRayEnd, lowerRayStart, lowerRayEnd;
    
    switch (childDims.rayShape) {
        case 'collimated':
            // Parent upper to child upper, parent lower to child lower
            upperRayStart = parentUpper;
            upperRayEnd = childUpper;
            lowerRayStart = parentLower;
            lowerRayEnd = childLower;
            break;
        case 'divergent':
            // Parent center to child upper, parent center to child lower
            upperRayStart = parentCenter;
            upperRayEnd = childUpper;
            lowerRayStart = parentCenter;
            lowerRayEnd = childLower;
            break;
        case 'convergent':
            // Parent upper to child center, parent lower to child center
            upperRayStart = parentUpper;
            upperRayEnd = childCenter;
            lowerRayStart = parentLower;
            lowerRayEnd = childCenter;
            break;
        default:
            // Fallback to collimated behavior
            upperRayStart = parentUpper;
            upperRayEnd = childUpper;
            lowerRayStart = parentLower;
            lowerRayEnd = childLower;
            break;
    }
    
    // Check if the aperture lines cross by using line intersection logic
    // Lines cross if they intersect between their endpoints
    
    // Calculate intersection point using parametric line equations
    const x1 = upperRayStart.x, y1 = upperRayStart.y;
    const x2 = upperRayEnd.x, y2 = upperRayEnd.y;
    const x3 = lowerRayStart.x, y3 = lowerRayStart.y;
    const x4 = lowerRayEnd.x, y4 = lowerRayEnd.y;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    // Lines are parallel if denominator is 0
    if (Math.abs(denom) < 1e-10) return false;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    // Lines intersect within their segments if both t and u are between 0 and 1
    const linesIntersect = (t >= 0 && t <= 1 && u >= 0 && u <= 1);
    
    return linesIntersect;
}

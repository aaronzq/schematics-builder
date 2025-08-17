// Component aperture scaling functionality
// Handles automatic scaling of aperture radius to match parent projections

import { setApertureRadius, flipUpVector } from './componentUtils.js';
import { transformToGlobal } from '../utils/mathUtils.js';
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
export function autoScaleToMatchParent(childDims, compId, centerX, centerY, initialRotation, parentComponent, componentState) {
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
export function autoScaleForExistingComponent(component, componentState) {
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
    const projections = calculateProjections(component, componentState);
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
    const scaledDims = setApertureRadius(currentDims, newApertureRadius);
    
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
        const scaledDims = autoScaleForExistingComponent(childComponent, componentState);
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

/**
 * Calculate aperture radius projections onto the vertical direction of center trace line
 * @param {HTMLElement} component - The component element
 * @param {object} componentState - Global component state
 * @returns {Object|null} - Object containing projections for both component and parent, or null if no parent
 */
export function calculateProjections(component, componentState) {
    if (!component) return null;
    
    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    
    if (!state || state.parentId === null) {
        console.warn('Component has no parent - cannot calculate aperture projections');
        return null;
    }
    
    const parentState = componentState[state.parentId];
    if (!parentState) {
        console.warn('Parent state not found');
        return null;
    }
    
    // Get component dimensions (use stored dimensions, not original)
    const childDims = state.dimensions;
    const parentDims = parentState.dimensions;
    
    if (!childDims || !parentDims) {
        console.warn('Component dimensions not found');
        return null;
    }
    
    // Calculate global center positions
    const childCenter = transformToGlobal(childDims.centerPoint.x, childDims.centerPoint.y, state);
    const parentCenter = transformToGlobal(parentDims.centerPoint.x, parentDims.centerPoint.y, parentState);
    
    // Calculate center trace line direction vector
    const traceDx = childCenter.x - parentCenter.x;
    const traceDy = childCenter.y - parentCenter.y;
    const traceLength = Math.sqrt(traceDx * traceDx + traceDy * traceDy);
    
    if (traceLength === 0) {
        console.warn('Components are at the same position - cannot calculate projections');
        return null;
    }
    
    // Normalize the trace line direction vector
    const traceUnitX = traceDx / traceLength;
    const traceUnitY = traceDy / traceLength;
    
    // Calculate perpendicular (vertical) direction to the trace line
    // Perpendicular vector is (-dy, dx) normalized
    const perpUnitX = -traceUnitY;
    const perpUnitY = traceUnitX;
    
    // For each component, calculate the projection of aperture radius onto perpendicular direction
    // This means: how much of the aperture radius extends in the direction perpendicular to the center line
    
    // Get aperture radius values
    const childApertureRadius = childDims.apertureRadius || 0;
    const parentApertureRadius = parentDims.apertureRadius || 0;
    
    // Calculate aperture vector directions for both components
    // The aperture extends in the upVector direction, so we need to project upVector onto perpendicular
    const childUpVector = childDims.upVector;
    const parentUpVector = parentDims.upVector;
    
    // Transform upVectors to global coordinates (accounting for rotation)
    const childGlobalUpX = childUpVector.x * Math.cos(state.rotation * Math.PI / 180) - 
                          childUpVector.y * Math.sin(state.rotation * Math.PI / 180);
    const childGlobalUpY = childUpVector.x * Math.sin(state.rotation * Math.PI / 180) + 
                          childUpVector.y * Math.cos(state.rotation * Math.PI / 180);
    
    const parentGlobalUpX = parentUpVector.x * Math.cos(parentState.rotation * Math.PI / 180) - 
                           parentUpVector.y * Math.sin(parentState.rotation * Math.PI / 180);
    const parentGlobalUpY = parentUpVector.x * Math.sin(parentState.rotation * Math.PI / 180) + 
                           parentUpVector.y * Math.cos(parentState.rotation * Math.PI / 180);
    
    // Calculate projections: dot product of normalized upVector with perpendicular direction
    const childUpProjection = Math.abs(childGlobalUpX * perpUnitX + childGlobalUpY * perpUnitY);
    const parentUpProjection = Math.abs(parentGlobalUpX * perpUnitX + parentGlobalUpY * perpUnitY);
    
    // Calculate final aperture projections (aperture radius * projection factor)
    const childApertureProjection = childApertureRadius * childUpProjection;
    const parentApertureProjection = parentApertureRadius * parentUpProjection;
    
    const result = {
        centerTraceInfo: {
            parentCenter: { x: parentCenter.x, y: parentCenter.y },
            childCenter: { x: childCenter.x, y: childCenter.y },
            direction: { x: traceUnitX, y: traceUnitY },
            perpendicular: { x: perpUnitX, y: perpUnitY },
            length: traceLength
        },
        child: {
            componentId: parseInt(compId),
            componentType: state.type,
            apertureRadius: childApertureRadius,
            upVectorGlobal: { x: childGlobalUpX, y: childGlobalUpY },
            upProjectionFactor: childUpProjection,
            apertureProjection: childApertureProjection
        },
        parent: {
            componentId: state.parentId,
            componentType: parentState.type,
            apertureRadius: parentApertureRadius,
            upVectorGlobal: { x: parentGlobalUpX, y: parentGlobalUpY },
            upProjectionFactor: parentUpProjection,
            apertureProjection: parentApertureProjection
        }
    };
    
    // console.log('Aperture Projections Calculation:');
    // console.log(`  Center trace line: (${parentCenter.x.toFixed(1)}, ${parentCenter.y.toFixed(1)}) → (${childCenter.x.toFixed(1)}, ${childCenter.y.toFixed(1)})`);
    // console.log(`  Trace direction: (${traceUnitX.toFixed(3)}, ${traceUnitY.toFixed(3)}), Length: ${traceLength.toFixed(1)}`);
    // console.log(`  Perpendicular direction: (${perpUnitX.toFixed(3)}, ${perpUnitY.toFixed(3)})`);
    // console.log(`  Child (${state.type}): Radius=${childApertureRadius}, Projection=${childApertureProjection.toFixed(2)}`);
    // console.log(`  Parent (${parentState.type}): Radius=${parentApertureRadius}, Projection=${parentApertureProjection.toFixed(2)}`);
    
    return result;
}

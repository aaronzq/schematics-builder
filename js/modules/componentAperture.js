// Component aperture scaling functionality
// Handles automatic scaling of aperture radius to match parent projections

import { setApertureRadius, flipUpVector, setConeAngle } from './componentUtils.js';
import { transformToGlobal } from '../utils/mathUtils.js';
import { SHOW_DEBUG_DRAWING } from '../constants.js';

/**
 * CORE APERTURE POLICY: Calculate optimal aperture radius for a component based on its parent
 * This is the single source of truth for all aperture scaling decisions
 * Ray shape behaviors:
 * - collimated: projection-based scaling, cone angle = 0
 * - divergent: cone-based scaling with inheritance/calculation, cone angle stored once
 * - convergent: always calculates cone angle from current geometry, dynamic aperture scaling
 * @param {object} childState - Child component state
 * @param {object} parentState - Parent component state  
 * @param {boolean} logDetails - Whether to log calculation details
 * @returns {object|null} - New dimensions with scaled aperture and updated cone angle, or null if scaling not possible
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
    
    // Get ray shape from child component (determines the policy to use)
    const childRayShape = childDims.rayShape || 'collimated';
    const parentRayShape = parentDims.rayShape || 'collimated';
    const parentConeAngle = parentDims.coneAngle || 0;
    
    // Calculate center line length for non-collimated cases
    const childCenter = transformToGlobal(childDims.centerPoint.x, childDims.centerPoint.y, childState);
    const parentCenter = transformToGlobal(parentDims.centerPoint.x, parentDims.centerPoint.y, parentState);
    const centerLineDx = childCenter.x - parentCenter.x;
    const centerLineDy = childCenter.y - parentCenter.y;
    const centerLineLength = Math.sqrt(centerLineDx * centerLineDx + centerLineDy * centerLineDy);
    
    let optimizedDimensions = null;
    
    if (logDetails) {
        console.log(`APERTURE CALCULATION: Component ${childState.type} (ID: ${childState.componentId || 'temp'})`);
        console.log(`  Ray Shape: ${childRayShape}, Parent Ray Shape: ${parentRayShape}`);
        console.log(`  Center Line Length: ${centerLineLength.toFixed(2)}`);
        console.log(`  Parent Cone Angle: ${parentConeAngle}°`);
    }
    
    switch (childRayShape) {
        case 'collimated':
            // Use current projection-based policy
            optimizedDimensions = handleCollimatedRays(childState, parentState, logDetails);
            // Set cone angle to 0 for collimated rays
            if (optimizedDimensions) {
                optimizedDimensions = setConeAngle(optimizedDimensions, 0);
                if (logDetails) console.log(`  Set cone angle to 0° (collimated)`);
            }
            break;
            
        case 'divergent':
            // Handle divergent rays with cone angle inheritance/calculation logic
            optimizedDimensions = handleDivergentRays(childState, parentState, parentRayShape, centerLineLength, logDetails);
            break;
            
        case 'convergent':
            // Handle convergent rays with dynamic cone angle calculation from current geometry
            optimizedDimensions = handleConvergentRays(childState, parentState, parentRayShape, centerLineLength, logDetails);
            break;
            
        default:
            if (logDetails) console.warn(`Unknown ray shape: ${childRayShape}, falling back to collimated`);
            optimizedDimensions = handleCollimatedRays(childState, parentState, logDetails);
            if (optimizedDimensions) {
                optimizedDimensions = setConeAngle(optimizedDimensions, 0);
            }
            break;
    }
    
    return optimizedDimensions;
}

/**
 * Handle collimated ray scaling using projection-based policy
 * @param {object} childState - Child component state
 * @param {object} parentState - Parent component state
 * @param {boolean} logDetails - Whether to log calculation details
 * @returns {object|null} Scaled dimensions or null
 */
function handleCollimatedRays(childState, parentState, logDetails) {
    // Use the existing projection-based logic
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
    const currentRadius = childState.dimensions.apertureRadius || 0;
    const optimalRadius = currentRadius * scalingRatio;
    
    // Validate the calculated radius
    if (optimalRadius <= 0 || optimalRadius > 200) {
        if (logDetails) console.warn(`Calculated aperture radius ${optimalRadius.toFixed(2)} is unreasonable`);
        return null;
    }
    
    // Apply the optimal radius to create new dimensions
    const optimizedDimensions = setApertureRadius(childState.dimensions, optimalRadius);
    
    if (logDetails) {
        console.log(`  Target projection: ${targetProjection.toFixed(2)}, Current: ${currentChildProjection.toFixed(2)}`);
        console.log(`  Radius: ${currentRadius.toFixed(2)} → ${optimalRadius.toFixed(2)} (ratio: ${scalingRatio.toFixed(3)})`);
    }
    
    return optimizedDimensions;
}

/**
 * Handle divergent ray scaling using cone-based policy
 * @param {object} childState - Child component state
 * @param {object} parentState - Parent component state
 * @param {string} parentRayShape - Parent component's ray shape
 * @param {number} centerLineLength - Distance between parent and child centers
 * @param {boolean} logDetails - Whether to log calculation details
 * @returns {object|null} Scaled dimensions or null
 */
function handleDivergentRays(childState, parentState, parentRayShape, centerLineLength, logDetails) {
    const parentConeAngle = parentState.dimensions.coneAngle || 0;
    const currentChildConeAngle = childState.dimensions.coneAngle || 0;
    
    if (centerLineLength === 0) {
        if (logDetails) console.warn('Center line length is zero, cannot calculate divergent aperture');
        return null;
    }
    
    let finalConeAngle = 0;
    let optimizedDimensions = null;
    
    // Determine cone angle based on parent's ray shape and whether child already has a calculated cone angle
    if (parentRayShape === 'collimated' || parentConeAngle === 0) {
        // Parent is collimated: use stored cone angle if available, otherwise calculate once
        if (currentChildConeAngle > 0) {
            // Child already has a calculated cone angle - use it to calculate new aperture radius
            finalConeAngle = currentChildConeAngle;
            
            // Calculate new aperture radius based on stored cone angle and current center line length
            const projections = calculateProjections_internal(childState, parentState);
            if (!projections) {
                if (logDetails) console.warn('Could not calculate projections for stored cone angle aperture scaling');
                return null;
            }
            
            const childUpProjectionFactor = projections.child.upProjectionFactor;
            if (childUpProjectionFactor === 0) {
                if (logDetails) console.warn('Child up projection factor is zero, cannot scale aperture');
                return null;
            }
            
            // Convert cone angle to radians and calculate target aperture projection
            const coneAngleRad = finalConeAngle * Math.PI / 180;
            const targetApertureProjection = centerLineLength * Math.tan(coneAngleRad);
            
            // Calculate required aperture radius: targetProjection / projectionFactor
            const requiredApertureRadius = targetApertureProjection / childUpProjectionFactor;
            
            // Validate the calculated radius
            if (requiredApertureRadius <= 0 || requiredApertureRadius > 200) {
                if (logDetails) console.warn(`Calculated aperture radius ${requiredApertureRadius.toFixed(2)} is unreasonable`);
                return null;
            }
            
            // Apply the calculated radius and stored cone angle
            optimizedDimensions = setApertureRadius(childState.dimensions, requiredApertureRadius);
            optimizedDimensions = setConeAngle(optimizedDimensions, finalConeAngle);
            
            if (logDetails) {
                console.log(`  Parent is collimated: using stored cone angle to calculate new aperture`);
                console.log(`  Stored cone angle: ${finalConeAngle.toFixed(2)}°`);
                console.log(`  Target aperture projection: ${targetApertureProjection.toFixed(2)}`);
                console.log(`  Up projection factor: ${childUpProjectionFactor.toFixed(3)}`);
                console.log(`  Calculated radius: ${requiredApertureRadius.toFixed(2)}`);
            }
        } else {
            // Child doesn't have a cone angle yet - calculate it once from current geometry
            finalConeAngle = calculateConeAngleFromGeometry(childState, parentState, centerLineLength, logDetails);
            if (finalConeAngle === null) return null;
            
            // Store the calculated cone angle for future use
            optimizedDimensions = setConeAngle(childState.dimensions, finalConeAngle);
            
            if (logDetails) {
                console.log(`  Parent is collimated: calculated cone angle from geometry (first time)`);
                console.log(`  Calculated cone angle: ${finalConeAngle.toFixed(2)}° (will be stored for future use)`);
                console.log(`  Keeping current aperture radius: ${childState.dimensions.apertureRadius.toFixed(2)}`);
            }
        }
    } else {
        // Parent is divergent/convergent: inherit cone angle and scale aperture
        finalConeAngle = parentConeAngle;
        
        // Convert cone angle from degrees to radians
        const parentConeAngleRad = parentConeAngle * Math.PI / 180;
        
        // Calculate target aperture projection: centerLineLength × tan(parentConeAngle)
        const targetApertureProjection = centerLineLength * Math.tan(parentConeAngleRad);
        
        // Calculate current child projection factor
        const projections = calculateProjections_internal(childState, parentState);
        if (!projections) {
            if (logDetails) console.warn('Could not calculate projection factors for divergent rays');
            return null;
        }
        
        const childUpProjectionFactor = projections.child.upProjectionFactor;
        if (childUpProjectionFactor === 0) {
            if (logDetails) console.warn('Child up projection factor is zero, cannot scale aperture');
            return null;
        }
        
        // Calculate required aperture radius: targetProjection / projectionFactor
        const requiredApertureRadius = targetApertureProjection / childUpProjectionFactor;
        
        // Validate the calculated radius
        if (requiredApertureRadius <= 0 || requiredApertureRadius > 200) {
            if (logDetails) console.warn(`Calculated aperture radius ${requiredApertureRadius.toFixed(2)} is unreasonable`);
            return null;
        }
        
        // Apply the calculated radius and inherited cone angle
        optimizedDimensions = setApertureRadius(childState.dimensions, requiredApertureRadius);
        optimizedDimensions = setConeAngle(optimizedDimensions, finalConeAngle);
        
        if (logDetails) {
            console.log(`  Parent has cone angle: inheriting and scaling aperture`);
            console.log(`  Target aperture projection: ${targetApertureProjection.toFixed(2)}`);
            console.log(`  Up projection factor: ${childUpProjectionFactor.toFixed(3)}`);
            console.log(`  Required radius: ${requiredApertureRadius.toFixed(2)}`);
            console.log(`  Inherited cone angle: ${finalConeAngle}°`);
        }
    }
    
    return optimizedDimensions;
}

/**
 * Handle convergent ray policy (always calculates cone angle from current geometry)
 * For convergent rays, the cone angle is always calculated based on the current
 * aperture and center line distance to reflect the actual convergence geometry
 * @param {object} childState - Child component state
 * @param {object} parentState - Parent component state
 * @param {string} parentRayShape - Parent component's ray shape
 * @param {number} centerLineLength - Distance between parent and child centers
 * @param {boolean} logDetails - Whether to log calculation details
 * @returns {object|null} Dimensions with updated cone angle and scaled aperture
 */
function handleConvergentRays(childState, parentState, parentRayShape, centerLineLength, logDetails) {
    const parentConeAngle = parentState.dimensions.coneAngle || 0;
    let finalConeAngle = 0;
    
    // For convergent rays, ALWAYS calculate cone angle from current geometry
    // This ensures the cone angle reflects the actual convergence based on current aperture and distance
    if (centerLineLength === 0) {
        if (logDetails) console.warn('Center line length is zero, cannot calculate convergent cone angle');
        return null;
    }
    
    finalConeAngle = calculateConeAngleFromGeometry(childState, parentState, centerLineLength, logDetails);
    if (finalConeAngle === null) return null;
    
    // Calculate aperture radius based on the calculated cone angle and current distance
    const projections = calculateProjections_internal(childState, parentState);
    if (!projections) {
        if (logDetails) console.warn('Could not calculate projections for convergent aperture scaling');
        return null;
    }
    
    const childUpProjectionFactor = projections.child.upProjectionFactor;
    if (childUpProjectionFactor === 0) {
        if (logDetails) console.warn('Child up projection factor is zero, cannot scale aperture');
        return null;
    }
    
    // Convert cone angle to radians and calculate target aperture projection
    const coneAngleRad = finalConeAngle * Math.PI / 180;
    const targetApertureProjection = centerLineLength * Math.tan(coneAngleRad);
    
    // Calculate required aperture radius: targetProjection / projectionFactor
    const requiredApertureRadius = targetApertureProjection / childUpProjectionFactor;
    
    // Validate the calculated radius
    if (requiredApertureRadius <= 0 || requiredApertureRadius > 200) {
        if (logDetails) console.warn(`Calculated aperture radius ${requiredApertureRadius.toFixed(2)} is unreasonable`);
        return null;
    }
    
    // Apply the calculated radius and cone angle
    const optimizedDimensions = setApertureRadius(childState.dimensions, requiredApertureRadius);
    const finalDimensions = setConeAngle(optimizedDimensions, finalConeAngle);
    
    if (logDetails) {
        console.log(`  Convergent rays: calculated cone angle from current geometry`);
        console.log(`  Calculated cone angle: ${finalConeAngle.toFixed(2)}°`);
        console.log(`  Target aperture projection: ${targetApertureProjection.toFixed(2)}`);
        console.log(`  Up projection factor: ${childUpProjectionFactor.toFixed(3)}`);
        console.log(`  Calculated radius: ${requiredApertureRadius.toFixed(2)}`);
    }
    
    return finalDimensions;
}

/**
 * Calculate cone angle from current component geometry
 * Uses the angle between center line and aperture rays to determine cone angle
 * @param {object} childState - Child component state
 * @param {object} parentState - Parent component state
 * @param {number} centerLineLength - Distance between parent and child centers
 * @param {boolean} logDetails - Whether to log calculation details
 * @returns {number|null} Calculated cone angle in degrees, or null if calculation failed
 */
function calculateConeAngleFromGeometry(childState, parentState, centerLineLength, logDetails) {
    if (centerLineLength === 0) {
        if (logDetails) console.warn('Cannot calculate cone angle: center line length is zero');
        return null;
    }
    
    const childDims = childState.dimensions;
    const currentApertureRadius = childDims.apertureRadius || 0;
    
    if (currentApertureRadius === 0) {
        if (logDetails) console.warn('Cannot calculate cone angle: aperture radius is zero');
        return null;
    }
    
    // Get projection factor to account for component orientation
    const projections = calculateProjections_internal(childState, parentState);
    if (!projections) {
        if (logDetails) console.warn('Could not calculate projections for cone angle calculation');
        return null;
    }
    
    const childUpProjectionFactor = projections.child.upProjectionFactor;
    if (childUpProjectionFactor === 0) {
        if (logDetails) console.warn('Cannot calculate cone angle: up projection factor is zero');
        return null;
    }
    
    // Calculate effective aperture projection
    const effectiveApertureProjection = currentApertureRadius * childUpProjectionFactor;
    
    // Calculate cone angle: arctan(apertureProjection / centerLineLength)
    const coneAngleRad = Math.atan(effectiveApertureProjection / centerLineLength);
    const coneAngleDeg = coneAngleRad * 180 / Math.PI;
    
    // Validate calculated cone angle
    if (coneAngleDeg < 0 || coneAngleDeg > 90) {
        if (logDetails) console.warn(`Calculated cone angle ${coneAngleDeg.toFixed(2)}° is out of valid range (0-90°)`);
        return null;
    }
    
    if (logDetails) {
        console.log(`  Geometry calculation: aperture=${currentApertureRadius.toFixed(2)}, projection=${effectiveApertureProjection.toFixed(2)}`);
        console.log(`  Center line length: ${centerLineLength.toFixed(2)}`);
        console.log(`  Calculated cone angle: arctan(${effectiveApertureProjection.toFixed(2)}/${centerLineLength.toFixed(2)}) = ${coneAngleDeg.toFixed(2)}°`);
    }
    
    return coneAngleDeg;
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
 * @param {string} componentType - Component type
 * @param {number} compId - Component ID
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} initialRotation - Initial rotation
 * @param {HTMLElement} parentComponent - Parent component element
 * @param {object} componentState - Global component state
 * @returns {object} Scaled dimensions or original dimensions
 */
export function autoScaleForNewComponentPlacement(childDims, componentType, compId, centerX, centerY, initialRotation, parentComponent, componentState) {
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
        type: componentType,
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

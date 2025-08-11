// Component lifecycle management
// Handles adding, removing, and state management of components

import { components, componentDimensions, flipComponentUpVector, changeComponentApertureRadius } from './components.js';
import { showTraceLines, drawTraceLines, updateTraceLines, doApertureLinessCross, calculateApertureProjections } from './traceLines.js';
import { 
    COMPONENT_SPACING, 
    SHOW_DEBUG_DRAWING, 
    UP_VECTOR_LENGTH, 
    FORWARD_VECTOR_LENGTH,
    CENTER_MARKER_RADIUS,
    APERTURE_POINT_RADIUS,
    LOWER_APERTURE_POINT_RADIUS
} from './constants.js';
import { ensureAllMarkers } from './utils/svgUtils.js';
import { validateComponentType } from './utils/validators.js';

// Global state
let idCounter = 0;
let selectedComponent = null;
let nextX = 0;
let nextY = 0;

// Component state management
export const componentState = {};
// Simple parent-child hierarchy: no more tree/branches
// Each component stores its parent and children information

// State accessors
export function getSelectedComponent() {
    return selectedComponent;
}

export function setSelectedComponent(component) {
    selectedComponent = component;
}

export function getNextPosition() {
    return { x: nextX, y: nextY };
}

export function setNextPosition(x, y) {
    nextX = x;
    nextY = y;
}

// Add a new component to the canvas
export function addComponent(type) {
    const validation = validateComponentType(type);
    if (!validation.valid) {
        console.error(validation.error);
        return;
    }

    const svg = document.getElementById("canvas");
    const componentsGroup = document.getElementById("components");
    const ns = "http://www.w3.org/2000/svg";

    // Determine placement: use selected component's arrow endpoint and direction
    let placeX = 0, placeY = 0;
    let initialRotation = 0;
    
    if (selectedComponent) {
        const selId = selectedComponent.getAttribute('data-id');
        const selState = componentState[selId];
        if (selState && typeof selState.arrowX === "number" && typeof selState.arrowY === "number") {
            // Get component dimensions 
            let dims = componentDimensions[type];
            
            // Step 1: Center point of new component = arrow tip of parent
            const newCenterX = selState.arrowX;
            const newCenterY = selState.arrowY;
            
            // Step 2: Calculate arrow direction vector (normalized)
            // Arrow starts from the selected component's center point (not its SVG position)
            const selectedDims = componentDimensions[selectedComponent.getAttribute('data-type')];
            const selectedCenterX = selState.posX + selectedDims.centerPoint.x;
            const selectedCenterY = selState.posY + selectedDims.centerPoint.y;
            
            const dx = selState.arrowX - selectedCenterX;
            const dy = selState.arrowY - selectedCenterY;
            const arrowLength = Math.sqrt(dx * dx + dy * dy);
            const arrowDirX = dx / arrowLength;  // Normalized arrow direction
            const arrowDirY = dy / arrowLength;
            
            // Step 3: Calculate rotation to align new component's forwardVector with arrow direction
            // Current forwardVector in component's local coordinates
            const currentForwardX = dims.forwardVector.x;
            const currentForwardY = dims.forwardVector.y;
            
            // Calculate required rotation angle
            // We want: rotated_forwardVector = arrow_direction
            const currentAngle = Math.atan2(currentForwardY, currentForwardX);
            const targetAngle = Math.atan2(arrowDirY, arrowDirX);
            initialRotation = (targetAngle - currentAngle) * 180 / Math.PI;
            
            // Log alignment verification
            const arrowAngleDeg = targetAngle * 180 / Math.PI;
            const forwardAngleDeg = currentAngle * 180 / Math.PI;
            console.log(`ForwardVector alignment: Arrow angle=${arrowAngleDeg.toFixed(1)}°, Original forward=${forwardAngleDeg.toFixed(1)}°, Rotation applied=${initialRotation.toFixed(1)}°`);
            console.log(`Arrow direction vector: (${arrowDirX.toFixed(3)}, ${arrowDirY.toFixed(3)})`);
            console.log(`Original forwardVector: (${currentForwardX}, ${currentForwardY})`);
            
            // Step 4: Calculate component position to place center point at arrow tip
            // Since SVG transform = translate(placeX, placeY) + rotate(..., centerPoint.x, centerPoint.y)
            // The actual center point will be at (placeX + centerPoint.x, placeY + centerPoint.y)
            // We want this to equal (newCenterX, newCenterY)
            placeX = newCenterX - dims.centerPoint.x;
            placeY = newCenterY - dims.centerPoint.y;
        } else {
            placeX = nextX;
            placeY = nextY;
        }
    } else {
        placeX = nextX;
        placeY = nextY;
    }

    // Create component group
    const g = document.createElementNS(ns, "g");
    g.setAttribute("class", "component");
    const compId = idCounter++;
    g.setAttribute("data-id", compId);
    g.setAttribute("data-type", type);
    
    // Get component dimensions
    let dims = componentDimensions[type];
    
    // Auto-scale aperture radius to match parent's projection (if component has a parent)
    if (selectedComponent) {
        dims = _autoScaleApertureToMatchParent(dims, compId, placeX, placeY, initialRotation, selectedComponent);
    }
    
    let shouldFlipUpVector = false;
    
    // If there's a selected component (parent), check if we need to flip to avoid crossing lines
    if (selectedComponent) {
        const parentId = parseInt(selectedComponent.getAttribute('data-id'));
        
        // Create temporary state to test intersection with normal orientation
        const tempState = {
            posX: placeX,
            posY: placeY,
            rotation: initialRotation,
            dimensions: dims,
            parentId: parentId,
            type: type
        };
        
        // Temporarily add to componentState for intersection test
        componentState[compId] = tempState;
        
        // Check if aperture lines would cross with normal orientation
        const linesCrossNormal = doApertureLinessCross(compId);
        
        if (linesCrossNormal) {
            // Test with flipped orientation
            const flippedDims = flipComponentUpVector(dims);
            tempState.dimensions = flippedDims;
            
            const linesCrossFlipped = doApertureLinessCross(compId);
            
            // Choose the orientation that doesn't create crossing lines
            if (!linesCrossFlipped) {
                shouldFlipUpVector = true;
                dims = flippedDims;
                console.log(`Component ${compId} (${type}) FLIPPED to avoid crossing aperture lines - forwardVector: (${dims.forwardVector.x}, ${dims.forwardVector.y})`);
            } else {
                // Both orientations create crossing lines, keep normal
                console.log(`Component ${compId} (${type}) kept NORMAL orientation (both would cross) - forwardVector: (${dims.forwardVector.x}, ${dims.forwardVector.y})`);
            }
        } else {
            console.log(`Component ${compId} (${type}) created with NORMAL forwardVector (no crossing) - forwardVector: (${dims.forwardVector.x}, ${dims.forwardVector.y})`);
        }
        
        // Remove temporary state entry (will be recreated properly below)
        delete componentState[compId];
    } else {
        console.log(`Component ${compId} (${type}) created with NORMAL upVector (root component) - forwardVector: (${dims.forwardVector.x}, ${dims.forwardVector.y})`);
    }
    
    // Apply rotation around centerPoint
    g.setAttribute("transform", `translate(${placeX},${placeY}) rotate(${initialRotation} ${dims.centerPoint.x} ${dims.centerPoint.y})`);

    // Store persistent state
    const centerPointX = placeX + dims.centerPoint.x;
    const centerPointY = placeY + dims.centerPoint.y;
    
    componentState[compId] = {
        posX: placeX,
        posY: placeY,
        rotation: initialRotation,
        arrowX: centerPointX + COMPONENT_SPACING * Math.cos(initialRotation * Math.PI / 180),
        arrowY: centerPointY + COMPONENT_SPACING * Math.sin(initialRotation * Math.PI / 180),
        selected: false,
        type: type,
        dimensions: dims,  // Store the actual dimensions used (flipped or normal)
        parentId: null,  // Parent component ID (null for root components)
        children: []     // Array of child component IDs
    };

    // Track component hierarchy: simple parent-child relationships
    _updateComponentHierarchy(compId);

    // Update nextX/nextY for default placement
    nextX = componentState[compId].arrowX;
    nextY = componentState[compId].arrowY;

    // Add hit area for better selection, centered on component
    const hitArea = document.createElementNS(ns, "rect");
    hitArea.setAttribute("class", "component-hit-area");
    hitArea.setAttribute("x", -dims.width/2 + dims.offsetX);
    hitArea.setAttribute("y", -dims.height/2);
    hitArea.setAttribute("width", dims.width);
    hitArea.setAttribute("height", dims.height);
    hitArea.setAttribute('visibility', 'hidden');
    g.appendChild(hitArea);

    // Add the component's SVG elements
    const componentGroup = components[type].draw(ns);
    while (componentGroup.firstChild) {
        const child = componentGroup.firstChild;
        // Disable pointer events on all child elements so only the main group handles mouse events
        child.setAttribute('pointer-events', 'none');
        g.appendChild(child);
    }

    // Add center marker (red dot) and direction vectors - only if debug is enabled
    if (SHOW_DEBUG_DRAWING) {
        // Center marker (red dot)
        const centerMarker = document.createElementNS(ns, "circle");
        centerMarker.setAttribute("cx", dims.centerPoint.x);
        centerMarker.setAttribute("cy", dims.centerPoint.y);
        centerMarker.setAttribute("r", CENTER_MARKER_RADIUS);
        centerMarker.setAttribute("fill", "red");
        centerMarker.setAttribute('pointer-events', 'none');
        g.appendChild(centerMarker);
        
        // Up vector (green arrow)
        const upLine = document.createElementNS(ns, "line");
        upLine.setAttribute("x1", dims.centerPoint.x);
        upLine.setAttribute("y1", dims.centerPoint.y);
        upLine.setAttribute("x2", dims.centerPoint.x + dims.upVector.x * UP_VECTOR_LENGTH);
        upLine.setAttribute("y2", dims.centerPoint.y + dims.upVector.y * UP_VECTOR_LENGTH);
        upLine.setAttribute("stroke", "green");
        upLine.setAttribute("stroke-width", "1");
        upLine.setAttribute("marker-end", "url(#upVectorArrow)");
        upLine.setAttribute('pointer-events', 'none');
        g.appendChild(upLine);
        
        // Forward vector (blue arrow)
        const forwardLine = document.createElementNS(ns, "line");
        forwardLine.setAttribute("x1", dims.centerPoint.x);
        forwardLine.setAttribute("y1", dims.centerPoint.y);
        forwardLine.setAttribute("x2", dims.centerPoint.x + dims.forwardVector.x * FORWARD_VECTOR_LENGTH);
        forwardLine.setAttribute("y2", dims.centerPoint.y + dims.forwardVector.y * FORWARD_VECTOR_LENGTH);
        forwardLine.setAttribute("stroke", "blue");
        forwardLine.setAttribute("stroke-width", "1");
        forwardLine.setAttribute("marker-end", "url(#forwardVectorArrow)");
        forwardLine.setAttribute('pointer-events', 'none');
        g.appendChild(forwardLine);
        
        // Aperture points (pair of blue dots with explicit coordinates)
        _drawAperturePoints(g, dims, ns);
        
        // Ensure vector arrow markers exist
        ensureAllMarkers(svg);
    }

    // Add to components group
    componentsGroup.appendChild(g);

    // Return the created component for further processing (like event attachment)
    return { element: g, id: compId };
}

// Remove a component
export function removeComponent(component) {
    if (!component) return null;

    const compId = component.getAttribute('data-id');
    const componentsGroup = document.getElementById('components');

    // Find previous component in DOM for selection fallback
    let prevComponent = null;
    for (const child of componentsGroup.children) {
        if (child === component) break;
        prevComponent = child;
    }

    // Clean up hierarchy tracking
    _cleanupComponentHierarchy(parseInt(compId));

    // Remove from DOM and state
    component.remove();
    delete componentState[compId];

    // Return previous component for selection fallback
    return prevComponent;
}

// Get component by ID
export function getComponentById(id) {
    const componentsGroup = document.getElementById('components');
    for (const child of componentsGroup.children) {
        if (child.getAttribute('data-id') == id) {
            return child;
        }
    }
    return null;
}

// Update component position and state
export function updateComponentPosition(component, x, y) {
    if (!component) return;

    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    if (!state) return;

    // Get component dimensions for centerPoint
    const type = component.getAttribute('data-type');
    const dims = componentDimensions[type];
    if (!dims) return;

    // Calculate delta for moving arrow endpoint
    const dx = x - state.posX;
    const dy = y - state.posY;

    // Update state
    state.posX = x;
    state.posY = y;

    // Auto-scale aperture to match parent's projection if component has a parent
    if (state.parentId !== null) {
        const scaledDims = _autoScaleApertureForExistingComponent(component);
        if (scaledDims) {
            state.dimensions = scaledDims;
        }
    }
    
    // Recursively update aperture scaling for all children and descendants
    _recursivelyUpdateChildrenApertures(component);

    // Update transform with correct rotation around centerPoint (use possibly updated dimensions)
    const currentDims = state.dimensions || dims;
    const rotation = state.rotation || 0;
    component.setAttribute("transform", `translate(${x},${y}) rotate(${rotation} ${currentDims.centerPoint.x} ${currentDims.centerPoint.y})`);

    // Move arrow endpoint by same delta
    if (typeof state.arrowX === "number" && typeof state.arrowY === "number") {
        state.arrowX += dx;
        state.arrowY += dy;
    }
    
    // Update trace lines if they are currently visible
    updateTraceLines();
}

// Update component rotation
export function updateComponentRotation(component, rotation) {
    if (!component) return;

    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    const type = component.getAttribute('data-type');
    const dims = componentDimensions[type];
    if (!state || !dims) return;

    state.rotation = rotation;
    
    // Auto-scale aperture to match parent's projection if component has a parent
    if (state.parentId !== null) {
        const scaledDims = _autoScaleApertureForExistingComponent(component);
        if (scaledDims) {
            state.dimensions = scaledDims;
        }
    }
    
    // Recursively update aperture scaling for all children and descendants
    _recursivelyUpdateChildrenApertures(component);
    
    // Calculate rotation center (component position + centerPoint offset) - use possibly updated dimensions
    const currentDims = state.dimensions || dims;
    const rotationCenterX = state.posX + currentDims.centerPoint.x;
    const rotationCenterY = state.posY + currentDims.centerPoint.y;
    
    // Apply rotation around the centerPoint
    component.setAttribute("transform", `translate(${state.posX},${state.posY}) rotate(${rotation} ${currentDims.centerPoint.x} ${currentDims.centerPoint.y})`);
    
    // Update trace lines if they are currently visible
    updateTraceLines();
}

// Private helper functions
function _updateComponentHierarchy(compId) {
    // If a component is selected, it becomes the parent of the new component
    if (selectedComponent) {
        const parentId = parseInt(selectedComponent.getAttribute('data-id'));
        
        // Set parent-child relationship
        componentState[compId].parentId = parentId;
        componentState[parentId].children.push(compId);
        
        console.log(`Component ${compId} (${componentState[compId].type}) added as child of Component ${parentId} (${componentState[parentId].type})`);
        
        // logComponentInfo(compId);
        
        // Update trace lines if they're enabled
        if (showTraceLines) {
            drawTraceLines();
        }
    } else {
        // First component or no selection - this is a root component
        componentState[compId].parentId = null;
        console.log(`Component ${compId} (${componentState[compId].type}) created as root component (no parent)`);
        // logComponentInfo(compId);
        
        // Update trace lines if they're enabled
        if (showTraceLines) {
            drawTraceLines();
        }
    }
}

function _cleanupComponentHierarchy(compIdNum) {
    const componentToRemove = componentState[compIdNum];
    if (!componentToRemove) return;

    // Remove this component from its parent's children array
    if (componentToRemove.parentId !== null) {
        const parentState = componentState[componentToRemove.parentId];
        if (parentState) {
            const childIndex = parentState.children.indexOf(compIdNum);
            if (childIndex > -1) {
                parentState.children.splice(childIndex, 1);
                console.log(`Removed Component ${compIdNum} from parent ${componentToRemove.parentId}'s children`);
            }
        }
    }

    // For all children of this component, remove their parent reference
    if (componentToRemove.children && componentToRemove.children.length > 0) {
        componentToRemove.children.forEach(childId => {
            const childState = componentState[childId];
            if (childState) {
                childState.parentId = null;
                console.log(`Component ${childId} parent reference cleared (was child of deleted ${compIdNum})`);
            }
        });
    }

    console.log(`Component ${compIdNum} (${componentToRemove.type}) removed from hierarchy`);
    
    // Update trace lines if they're enabled
    if (showTraceLines) {
        drawTraceLines();
    }
}

// Log information about a specific component
export function logComponentInfo(compId) {
    const state = componentState[compId];
    if (!state) return;
    
    // Calculate global center coordinates
    const centerX = state.posX + state.dimensions.centerPoint.x;
    const centerY = state.posY + state.dimensions.centerPoint.y;
    
    // Parent/children information
    const parentInfo = state.parentId !== null ? `Parent: ${state.parentId} (${componentState[state.parentId].type})` : 'No Parent (Root)';
    const childrenInfo = state.children.length > 0 ? 
        `Children: [${state.children.map(childId => `${childId} (${componentState[childId].type})`).join(', ')}]` : 
        'No Children';
    
    // Coordinate information
    const coordinateInfo = `SVG Position: (${state.posX.toFixed(1)}, ${state.posY.toFixed(1)}) | Center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)}) | Rotation: ${(state.rotation || 0).toFixed(1)}°`;
    const arrowInfo = `Arrow Endpoint: (${state.arrowX.toFixed(1)}, ${state.arrowY.toFixed(1)})`;
    
    // Aperture information
    const apertureRadius = state.dimensions.apertureRadius || 'undefined';
    const upperAperture = state.dimensions.aperturePoints ? 
        `(${state.dimensions.aperturePoints.upper.x.toFixed(1)}, ${state.dimensions.aperturePoints.upper.y.toFixed(1)})` : 
        'undefined';
    const lowerAperture = state.dimensions.aperturePoints ? 
        `(${state.dimensions.aperturePoints.lower.x.toFixed(1)}, ${state.dimensions.aperturePoints.lower.y.toFixed(1)})` : 
        'undefined';
    const apertureInfo = `Aperture Radius: ${apertureRadius} | Upper: ${upperAperture} | Lower: ${lowerAperture}`;
    
    console.log(`=== Selected Component ${compId} (${state.type}) ===`);
    console.log(`  Hierarchy: ${parentInfo}, ${childrenInfo}`);
    console.log(`  Coordinates: ${coordinateInfo}`);
    console.log(`  Arrow: ${arrowInfo}`);
    console.log(`  Aperture: ${apertureInfo}`);
    
    // Calculate and log aperture projections if component has a parent
    if (state.parentId !== null) {
        const component = getComponentById(compId);
        const projections = calculateApertureProjections(component);
        if (projections) {
            console.log(`  Parent projection: ${projections.parent.apertureProjection.toFixed(2)} ,  Child projection: ${projections.child.apertureProjection.toFixed(2)}`);
        }
    }
}

// Helper function to auto-scale aperture radius to match parent's projection
function _autoScaleApertureToMatchParent(childDims, compId, placeX, placeY, initialRotation, parentComponent) {
    const parentId = parseInt(parentComponent.getAttribute('data-id'));
    const parentState = componentState[parentId];
    
    if (!parentState || !parentState.dimensions) {
        console.warn('Parent state or dimensions not found, using original aperture radius');
        return childDims;
    }
    
    // Create temporary state for the child component to enable projection calculations
    const tempChildState = {
        posX: placeX,
        posY: placeY,
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
        const scaledDims = _performApertureScaling(tempComponent, childDims, true);
        return scaledDims || childDims;
        
    } catch (error) {
        console.error('Error during aperture scaling:', error);
        return childDims;
    } finally {
        // Clean up temporary state
        delete componentState[compId];
    }
}

// Helper function to auto-scale aperture radius for existing components during drag/rotation
function _autoScaleApertureForExistingComponent(component) {
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
        return _performApertureScaling(component, state.dimensions, false);
        
    } catch (error) {
        console.error('Error during dynamic aperture scaling:', error);
        return null;
    }
}

// Core aperture scaling logic - used by both creation and dynamic scaling
function _performApertureScaling(component, currentDims, isCreationTime) {
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
        // Update aperture point drawings for existing components
        _updateAperturePointDrawings(component, scaledDims);
    }
    
    return scaledDims;
}

// Helper function to update aperture point drawings when dimensions change
function _updateAperturePointDrawings(component, newDimensions) {
    if (!SHOW_DEBUG_DRAWING || !component || !newDimensions) return;
    
    // Update existing aperture points
    _drawAperturePoints(component, newDimensions);
    
    console.log(`Updated aperture points: Upper (${newDimensions.aperturePoints.upper.x.toFixed(1)}, ${newDimensions.aperturePoints.upper.y.toFixed(1)}), Lower (${newDimensions.aperturePoints.lower.x.toFixed(1)}, ${newDimensions.aperturePoints.lower.y.toFixed(1)})`);
}

// Unified function to draw or update aperture points
function _drawAperturePoints(parentElement, dimensions, ns = null) {
    if (!dimensions || !dimensions.aperturePoints) return;
    
    const isCreation = ns !== null; // If ns is provided, we're creating new elements
    
    if (isCreation) {
        // Creating new aperture points during component creation
        
        // Upper aperture point (in upVector direction)
        const upperAperturePoint = document.createElementNS(ns, "circle");
        upperAperturePoint.setAttribute("cx", dimensions.aperturePoints.upper.x);
        upperAperturePoint.setAttribute("cy", dimensions.aperturePoints.upper.y);
        upperAperturePoint.setAttribute("r", APERTURE_POINT_RADIUS);
        upperAperturePoint.setAttribute("fill", "blue");
        upperAperturePoint.setAttribute('pointer-events', 'none');
        upperAperturePoint.setAttribute('data-aperture-type', 'upper'); // Add identifier
        parentElement.appendChild(upperAperturePoint);
        
        // Lower aperture point (opposite to upVector direction)
        const lowerAperturePoint = document.createElementNS(ns, "circle");
        lowerAperturePoint.setAttribute("cx", dimensions.aperturePoints.lower.x);
        lowerAperturePoint.setAttribute("cy", dimensions.aperturePoints.lower.y);
        lowerAperturePoint.setAttribute("r", LOWER_APERTURE_POINT_RADIUS);
        lowerAperturePoint.setAttribute("fill", "blue");
        lowerAperturePoint.setAttribute('pointer-events', 'none');
        lowerAperturePoint.setAttribute('data-aperture-type', 'lower'); // Add identifier
        parentElement.appendChild(lowerAperturePoint);
        
    } else {
        // Updating existing aperture points during dynamic scaling
        
        // Find existing aperture points by their data attributes (more reliable than radius matching)
        const upperAperturePoint = parentElement.querySelector('circle[data-aperture-type="upper"]');
        const lowerAperturePoint = parentElement.querySelector('circle[data-aperture-type="lower"]');
        
        // Fallback: find by radius if data attributes not found (for backward compatibility)
        let fallbackUpper = null, fallbackLower = null;
        if (!upperAperturePoint || !lowerAperturePoint) {
            const allCircles = parentElement.querySelectorAll('circle[fill="blue"]');
            for (const circle of allCircles) {
                const radius = parseFloat(circle.getAttribute('r'));
                if (radius === APERTURE_POINT_RADIUS && !fallbackUpper) {
                    fallbackUpper = circle;
                } else if (radius === LOWER_APERTURE_POINT_RADIUS && !fallbackLower) {
                    fallbackLower = circle;
                }
            }
        }
        
        // Update upper aperture point position
        const finalUpperPoint = upperAperturePoint || fallbackUpper;
        if (finalUpperPoint && dimensions.aperturePoints.upper) {
            finalUpperPoint.setAttribute("cx", dimensions.aperturePoints.upper.x);
            finalUpperPoint.setAttribute("cy", dimensions.aperturePoints.upper.y);
            // Add data attribute if it was found via fallback
            if (!finalUpperPoint.hasAttribute('data-aperture-type')) {
                finalUpperPoint.setAttribute('data-aperture-type', 'upper');
            }
        }
        
        // Update lower aperture point position
        const finalLowerPoint = lowerAperturePoint || fallbackLower;
        if (finalLowerPoint && dimensions.aperturePoints.lower) {
            finalLowerPoint.setAttribute("cx", dimensions.aperturePoints.lower.x);
            finalLowerPoint.setAttribute("cy", dimensions.aperturePoints.lower.y);
            // Add data attribute if it was found via fallback
            if (!finalLowerPoint.hasAttribute('data-aperture-type')) {
                finalLowerPoint.setAttribute('data-aperture-type', 'lower');
            }
        }
    }
}

// Helper function to recursively update aperture scaling for all children and descendants
function _recursivelyUpdateChildrenApertures(parentComponent) {
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
        const scaledDims = _autoScaleApertureForExistingComponent(childComponent);
        if (scaledDims) {
            childState.dimensions = scaledDims;
            console.log(`Recursively updated aperture for child component ${childId} (${childState.type})`);
        }
        
        // Recursively update this child's descendants
        _recursivelyUpdateChildrenApertures(childComponent);
    }
}

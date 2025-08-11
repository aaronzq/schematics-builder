// Component lifecycle management
// Handles adding, removing, and state management of components

import { components, componentDimensions, flipComponentUpVector } from './components.js';
import { showTraceLines, drawTraceLines, updateTraceLines, doApertureLinessCross } from './traceLines.js';
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
        // Upper aperture point (in upVector direction)
        const upperAperturePoint = document.createElementNS(ns, "circle");
        upperAperturePoint.setAttribute("cx", dims.aperturePoints.upper.x);
        upperAperturePoint.setAttribute("cy", dims.aperturePoints.upper.y);
        upperAperturePoint.setAttribute("r", APERTURE_POINT_RADIUS);
        upperAperturePoint.setAttribute("fill", "blue");
        upperAperturePoint.setAttribute('pointer-events', 'none');
        g.appendChild(upperAperturePoint);
        
        // Lower aperture point (opposite to upVector direction)
        const lowerAperturePoint = document.createElementNS(ns, "circle");
        lowerAperturePoint.setAttribute("cx", dims.aperturePoints.lower.x);
        lowerAperturePoint.setAttribute("cy", dims.aperturePoints.lower.y);
        lowerAperturePoint.setAttribute("r", LOWER_APERTURE_POINT_RADIUS);
        lowerAperturePoint.setAttribute("fill", "blue");
        lowerAperturePoint.setAttribute('pointer-events', 'none');
        g.appendChild(lowerAperturePoint);
        
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

    // Update transform with correct rotation around centerPoint
    const rotation = state.rotation || 0;
    component.setAttribute("transform", `translate(${x},${y}) rotate(${rotation} ${dims.centerPoint.x} ${dims.centerPoint.y})`);

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
    
    // Calculate rotation center (component position + centerPoint offset)
    const rotationCenterX = state.posX + dims.centerPoint.x;
    const rotationCenterY = state.posY + dims.centerPoint.y;
    
    // Apply rotation around the centerPoint
    component.setAttribute("transform", `translate(${state.posX},${state.posY}) rotate(${rotation} ${dims.centerPoint.x} ${dims.centerPoint.y})`);
    
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
    
    console.log(`=== Selected Component ${compId} (${state.type}) ===`);
    console.log(`  Hierarchy: ${parentInfo}, ${childrenInfo}`);
    console.log(`  Coordinates: ${coordinateInfo}`);
    console.log(`  Arrow: ${arrowInfo}`);
}

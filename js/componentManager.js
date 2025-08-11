// Component lifecycle management
// Handles adding, removing, and state management of components

import { components, componentDimensions } from './components.js';
import { showTraceLines, drawTraceLines, updateTraceLines } from './traceLines.js';

// Global state
let idCounter = 0;
let selectedComponent = null;
let nextX = 0;
let nextY = 0;

// Constants
const COMPONENT_SPACING = 150;
const SHOW_DEBUG_DRAWING = true;

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
    if (!components[type]) {
        console.error(`Unknown component type: ${type}`);
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
            placeX = selState.arrowX;
            placeY = selState.arrowY;
            // Calculate arrow direction to align new component
            const dx = selState.arrowX - selState.posX;
            const dy = selState.arrowY - selState.posY;
            initialRotation = Math.atan2(dy, dx) * 180 / Math.PI;
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
    const dims = componentDimensions[type];
    
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
        centerMarker.setAttribute("r", "2");
        centerMarker.setAttribute("fill", "red");
        centerMarker.setAttribute('pointer-events', 'none');
        g.appendChild(centerMarker);
        
        // Up vector (green arrow)
        const upVectorLength = 60;
        const upLine = document.createElementNS(ns, "line");
        upLine.setAttribute("x1", dims.centerPoint.x);
        upLine.setAttribute("y1", dims.centerPoint.y);
        upLine.setAttribute("x2", dims.centerPoint.x + dims.upVector.x * upVectorLength);
        upLine.setAttribute("y2", dims.centerPoint.y + dims.upVector.y * upVectorLength);
        upLine.setAttribute("stroke", "green");
        upLine.setAttribute("stroke-width", "1");
        upLine.setAttribute("marker-end", "url(#upVectorArrow)");
        upLine.setAttribute('pointer-events', 'none');
        g.appendChild(upLine);
        
        // Forward vector (blue arrow)
        const forwardVectorLength = 60;
        const forwardLine = document.createElementNS(ns, "line");
        forwardLine.setAttribute("x1", dims.centerPoint.x);
        forwardLine.setAttribute("y1", dims.centerPoint.y);
        forwardLine.setAttribute("x2", dims.centerPoint.x + dims.forwardVector.x * forwardVectorLength);
        forwardLine.setAttribute("y2", dims.centerPoint.y + dims.forwardVector.y * forwardVectorLength);
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
        upperAperturePoint.setAttribute("r", "2");
        upperAperturePoint.setAttribute("fill", "blue");
        upperAperturePoint.setAttribute('pointer-events', 'none');
        g.appendChild(upperAperturePoint);
        
        // Lower aperture point (opposite to upVector direction)
        const lowerAperturePoint = document.createElementNS(ns, "circle");
        lowerAperturePoint.setAttribute("cx", dims.aperturePoints.lower.x);
        lowerAperturePoint.setAttribute("cy", dims.aperturePoints.lower.y);
        lowerAperturePoint.setAttribute("r", "2");
        lowerAperturePoint.setAttribute("fill", "blue");
        lowerAperturePoint.setAttribute('pointer-events', 'none');
        g.appendChild(lowerAperturePoint);
        
        // Ensure vector arrow markers exist
        _ensureVectorArrowMarkers(svg);
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

    // Calculate delta for moving arrow endpoint
    const dx = x - state.posX;
    const dy = y - state.posY;

    // Update state
    state.posX = x;
    state.posY = y;

    // Update transform
    const rotation = state.rotation || 0;
    component.setAttribute("transform", `translate(${x},${y}) rotate(${rotation})`);

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
    
    const parentInfo = state.parentId !== null ? `Parent: ${state.parentId} (${componentState[state.parentId].type})` : 'No Parent (Root)';
    const childrenInfo = state.children.length > 0 ? 
        `Children: [${state.children.map(childId => `${childId} (${componentState[childId].type})`).join(', ')}]` : 
        'No Children';
    
    console.log(`Selected Component ${compId} (${state.type}) - ${parentInfo}, ${childrenInfo}`);
}

// Private helper function to ensure vector arrow markers exist
function _ensureVectorArrowMarkers(svg) {
    let defs = svg.querySelector("defs");
    if (!defs) {
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        svg.insertBefore(defs, svg.firstChild);
    }
    
    // Up vector arrow marker (green)
    if (!svg.querySelector("#upVectorArrow")) {
        const upMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        upMarker.setAttribute("id", "upVectorArrow");
        upMarker.setAttribute("markerWidth", "8");
        upMarker.setAttribute("markerHeight", "6");
        upMarker.setAttribute("refX", "8");
        upMarker.setAttribute("refY", "3");
        upMarker.setAttribute("orient", "auto");
        upMarker.setAttribute("markerUnits", "strokeWidth");
        const upPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        upPath.setAttribute("d", "M0,0 L8,3 L0,6 Z");
        upPath.setAttribute("fill", "green");
        upMarker.appendChild(upPath);
        defs.appendChild(upMarker);
    }
    
    // Forward vector arrow marker (blue)
    if (!svg.querySelector("#forwardVectorArrow")) {
        const forwardMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        forwardMarker.setAttribute("id", "forwardVectorArrow");
        forwardMarker.setAttribute("markerWidth", "8");
        forwardMarker.setAttribute("markerHeight", "6");
        forwardMarker.setAttribute("refX", "8");
        forwardMarker.setAttribute("refY", "3");
        forwardMarker.setAttribute("orient", "auto");
        forwardMarker.setAttribute("markerUnits", "strokeWidth");
        const forwardPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        forwardPath.setAttribute("d", "M0,0 L8,3 L0,6 Z");
        forwardPath.setAttribute("fill", "blue");
        forwardMarker.appendChild(forwardPath);
        defs.appendChild(forwardMarker);
    }
}

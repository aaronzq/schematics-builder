// Simplified Component Manager - Core lifecycle management
// Handles adding, removing, and state management of components using focused modules

import { componentDimensions } from './components.js';
import { flipUpVector } from './modules/componentUtils.js';
import { updateTraceLines } from './traceLines.js';
import { validateComponentType } from './utils/validators.js';

// Import focused modules
import { calculateComponentPlacement, calculateArrowEndpoint } from './modules/componentPlacement.js';
import { updateComponentHierarchy, cleanupComponentHierarchy } from './modules/componentHierarchy.js';
import { 
    autoScaleForNewComponentPlacement, 
    autoScaleForComponentDragRotation,
    recursivelyUpdateChildrenApertures,
    checkLinesCross,
    handleCrossing
} from './modules/componentAperture.js';
import { 
    createComponentGroup, 
    addHitArea, 
    addComponentSVG, 
    addDebugElements,
    updateAperturePointDrawings 
} from './modules/componentRenderer.js';

// Global state
let idCounter = 0;
let selectedComponent = null;
let nextX = 0;
let nextY = 0;

// Component state management
export const componentState = {};

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

/**
 * Add a new component to the canvas
 * @param {string} type - Component type
 * @returns {object|null} Created component info or null if failed
 */
export function addComponent(type) {
    const validation = validateComponentType(type);
    if (!validation.valid) {
        console.error(validation.error);
        return null;
    }

    const svg = document.getElementById("canvas");
    const componentsGroup = document.getElementById("components");
    const compId = idCounter++;

    // Calculate placement
    const placement = calculateComponentPlacement(type, selectedComponent, componentState, { x: nextX, y: nextY });
    let dims = componentDimensions[type];
    
    // Auto-scale aperture radius to match parent's projection (if component has a parent)
    if (selectedComponent) {
        dims = autoScaleForNewComponentPlacement(dims, type, compId, placement.centerX, placement.centerY, placement.rotation, selectedComponent, componentState);
    }
    
    // Handle upVector flipping to avoid crossing aperture lines
    dims = handleCrossing(dims, compId, placement, type, selectedComponent, componentState);
    
    // Create component group and visual elements
    const group = createComponentGroup(compId, type, placement.centerX, placement.centerY, placement.rotation, dims);
    addHitArea(group, dims);
    addComponentSVG(group, type);
    addDebugElements(group, dims, svg);
    
    // Create and store component state (posX/posY now store center coordinates)
    const arrowEndpoint = calculateArrowEndpoint({ 
        posX: placement.centerX, 
        posY: placement.centerY, 
        rotation: placement.rotation 
    }, dims);
    
    componentState[compId] = {
        posX: placement.centerX,
        posY: placement.centerY,
        rotation: placement.rotation,
        arrowX: arrowEndpoint.x,
        arrowY: arrowEndpoint.y,
        selected: false,
        type: type,
        dimensions: dims,
        parentId: null,
        children: []
    };

    // Update hierarchy and next position
    updateComponentHierarchy(compId, selectedComponent, componentState);
    nextX = arrowEndpoint.x;
    nextY = arrowEndpoint.y;

    // Add to DOM
    componentsGroup.appendChild(group);

    return { element: group, id: compId };
}

/**
 * Remove a component from the canvas
 * @param {HTMLElement} component - Component to remove
 * @returns {HTMLElement|null} Previous component for selection fallback
 */
export function removeComponent(component) {
    if (!component) return null;

    const compId = component.getAttribute('data-id');
    const componentsGroup = document.getElementById('components');

    // Find previous component for selection fallback
    let prevComponent = null;
    for (const child of componentsGroup.children) {
        if (child === component) break;
        prevComponent = child;
    }

    // Clean up hierarchy and state
    cleanupComponentHierarchy(parseInt(compId), componentState);
    component.remove();
    delete componentState[compId];

    return prevComponent;
}

/**
 * Get component by ID
 * @param {number} id - Component ID
 * @returns {HTMLElement|null} Component element or null
 */
export function getComponentById(id) {
    const componentsGroup = document.getElementById('components');
    for (const child of componentsGroup.children) {
        if (child.getAttribute('data-id') == id) {
            return child;
        }
    }
    return null;
}

/**
 * Update component position and state
 * @param {HTMLElement} component - Component to update
 * @param {number} centerX - New center X position
 * @param {number} centerY - New center Y position
 */
export function updateComponentPosition(component, centerX, centerY) {
    if (!component) return;

    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    if (!state) return;

    // Calculate delta from previous center position and update state
    const dx = centerX - state.posX;
    const dy = centerY - state.posY;
    state.posX = centerX;
    state.posY = centerY;

    // Handle aperture scaling
    handleApertureScaling(component, state);
    recursivelyUpdateChildrenApertures(component, componentState, getComponentById, updateAperturePointDrawings);

    // Update transform - convert center position to top-left corner for SVG transform
    const currentDims = state.dimensions || componentDimensions[component.getAttribute('data-type')];
    const rotation = state.rotation || 0;
    const svgX = centerX - currentDims.centerPoint.x;
    const svgY = centerY - currentDims.centerPoint.y;
    component.setAttribute("transform", `translate(${svgX},${svgY}) rotate(${rotation} ${currentDims.centerPoint.x} ${currentDims.centerPoint.y})`);

    if (typeof state.arrowX === "number" && typeof state.arrowY === "number") {
        state.arrowX += dx;
        state.arrowY += dy;
    }
    
    updateTraceLines();
}

/**
 * Update component rotation
 * @param {HTMLElement} component - Component to update
 * @param {number} rotation - New rotation angle
 */
export function updateComponentRotation(component, rotation) {
    if (!component) return;

    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    if (!state) return;

    state.rotation = rotation;
    
    // Handle aperture scaling
    handleApertureScaling(component, state);
    recursivelyUpdateChildrenApertures(component, componentState, getComponentById, updateAperturePointDrawings);
    
    // Update transform - convert center position to top-left corner for SVG transform
    const currentDims = state.dimensions || componentDimensions[component.getAttribute('data-type')];
    const svgX = state.posX - currentDims.centerPoint.x;
    const svgY = state.posY - currentDims.centerPoint.y;
    component.setAttribute("transform", `translate(${svgX},${svgY}) rotate(${rotation} ${currentDims.centerPoint.x} ${currentDims.centerPoint.y})`);
    
    updateTraceLines();
}

/**
 * Log detailed information about a component
 * @param {number} compId - Component ID
 */
export function logComponentInfo(compId) {
    const state = componentState[compId];
    if (!state) return;
    
    // posX/posY now store center coordinates directly
    const centerX = state.posX;
    const centerY = state.posY;
    
    // Build info strings
    const parentInfo = state.parentId !== null ? 
        `Parent: ${state.parentId} (${componentState[state.parentId].type})` : 
        'No Parent (Root)';
    const childrenInfo = state.children.length > 0 ? 
        `Children: [${state.children.map(childId => `${childId} (${componentState[childId].type})`).join(', ')}]` : 
        'No Children';

    console.log(`=== Selected Component ${compId} (${state.type}) ===`);
    console.log(`  Hierarchy: ${parentInfo}, ${childrenInfo}`);
    console.log(`  Center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)}) | Rotation: ${(state.rotation || 0).toFixed(1)}°`);
    console.log(`  Arrow: (${state.arrowX.toFixed(1)}, ${state.arrowY.toFixed(1)})`);
    
    // Log aperture info if available
    if (state.dimensions.apertureRadius) {
        const aperturePoints = state.dimensions.aperturePoints;
        const upperPos = aperturePoints ? `(${aperturePoints.upper.x.toFixed(1)}, ${aperturePoints.upper.y.toFixed(1)})` : 'undefined';
        const lowerPos = aperturePoints ? `(${aperturePoints.lower.x.toFixed(1)}, ${aperturePoints.lower.y.toFixed(1)})` : 'undefined';
        const rayShape = state.dimensions.rayShape || 'unknown';
        const coneAngle = state.dimensions.coneAngle !== undefined ? `${state.dimensions.coneAngle.toFixed(1)}°` : 'undefined';
        console.log(`  Aperture: Radius=${state.dimensions.apertureRadius.toFixed(2)} | Upper=${upperPos} | Lower=${lowerPos}`);
        console.log(`  Ray Shape: ${rayShape} | Cone Angle: ${coneAngle}`);
    }
}

// Private helper functions

/**
 * Handle component aperture scaling if it has a parent
 * @param {HTMLElement} component - Component element
 * @param {object} state - Component state
 */
function handleApertureScaling(component, state) {
    if (state.parentId !== null) {
        const scaledDims = autoScaleForComponentDragRotation(component, componentState);
        if (scaledDims) {
            state.dimensions = scaledDims;
            updateAperturePointDrawings(component, scaledDims);
        }
    }
}

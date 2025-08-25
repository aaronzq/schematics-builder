/**
 * Prompt the user to select a schematic JSON file and import it.
 */
export function promptImportSchematicJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const schematic = JSON.parse(e.target.result);
                importSchematicFromJSON(schematic);
            } catch (err) {
                alert('Failed to parse schematic JSON.');
            }
        };
        reader.readAsText(file);
    });
    input.click();
    input.remove();
}

/**
 * Import a schematic from a JSON object and reconstruct the layout and hierarchy.
 * @param {object} schematic - The parsed schematic JSON object.
 */
export async function importSchematicFromJSON(schematic) {
    // Reset the action log for a new session
    actions = [];
    if (!schematic || !Array.isArray(schematic.actions)) {
        alert('Invalid schematic file.');
        return;
    }
    // Remove any lingering arrows and rotation handles
    const svg = document.getElementById('canvas');
    if (!svg) return;
    // Remove all arrow groups
    svg.querySelectorAll('[id^="arrow-preview-"]').forEach(el => el.remove());
    // Remove all rotation handles
    svg.querySelectorAll('[id^="rotation-handle-"]').forEach(el => el.remove());

    // Clear existing components
    const componentsGroup = document.getElementById('components');
    while (componentsGroup.firstChild) {
        componentsGroup.removeChild(componentsGroup.firstChild);
    }
    for (const key in componentState) {
        delete componentState[key];
    }
    // Reset global state
    selectedComponent = null;
    idCounter = 0;
    nextX = schematic.nextPosition?.x || 0;
    nextY = schematic.nextPosition?.y || 0;

    // Map from schematic id to created element/id
    const idMap = {};

    // Import setupComponentEventListeners from eventHandler
    // (import here to avoid circular dependency at module top level)
    const { setupComponentEventListeners } = await import('./eventHandler.js');

    // Build a map from id to component data for quick lookup
    const compDataMap = {};
    for (const comp of schematic.components) {
        compDataMap[comp.id] = comp;
    }

    // Track the max id to update idCounter after import
    let maxId = 0;

    // Replay actions to reconstruct schematic with original IDs
    const oldToNewId = {};
    for (const act of schematic.actions) {
        if (act.action === 'add') {
            // Set selectedComponent to parent if needed for hierarchy
            let parentElement = null;
            let parentIdToUse = act.parentId;
            // If parent is missing (deleted), make this a root
            if (parentIdToUse !== null && parentIdToUse !== undefined && (oldToNewId[parentIdToUse] === undefined || idMap[oldToNewId[parentIdToUse]] === undefined)) {
                parentIdToUse = null;
            }
            if (parentIdToUse !== null && parentIdToUse !== undefined && oldToNewId[parentIdToUse] !== undefined && idMap[oldToNewId[parentIdToUse]] !== undefined) {
                parentElement = idMap[oldToNewId[parentIdToUse]].element;
            }
            setSelectedComponent(parentElement);

            // Force idCounter to match the original id for this add
            const prevIdCounter = idCounter;
            idCounter = act.id;
            const compData = compDataMap[act.id];
            if (!compData) continue;
            const result = addComponent(compData.type);
            idCounter = Math.max(prevIdCounter, idCounter + 1);
            if (!result) continue;

            // Attach event listeners for interaction
            setupComponentEventListeners(result.element, result.id);

            // Defensive: ensure state exists before setting properties
            const state = componentState[result.id];
            if (!state) continue;

            // Set all properties from compData
            if (compData.posX !== undefined && compData.posY !== undefined) {
                updateComponentPosition(result.element, compData.posX, compData.posY);
            }
            if (compData.rotation !== undefined) {
                updateComponentRotation(result.element, compData.rotation);
            }
            // rayPolygonColor: now array
            if (Array.isArray(compData.rayPolygonColor)) {
                state.rayPolygonColor = compData.rayPolygonColor.slice();
            } else if (compData.rayPolygonColor !== undefined) {
                // legacy: single value
                state.rayPolygonColor = [compData.rayPolygonColor];
            } else {
                state.rayPolygonColor = ['#00ffff'];
            }
            if (compData.dimensions !== undefined) {
                state.dimensions = compData.dimensions;
            }
            // Do NOT set state.children from compData here to avoid duplicate children.
            if (compData.visible !== undefined) {
                state.visible = compData.visible;
                if (compData.visible) {
                    showComponent(result.element);
                } else {
                    hideComponent(result.element);
                }
            }
            if (compData.arrowX !== undefined) {
                state.arrowX = compData.arrowX;
            }
            if (compData.arrowY !== undefined) {
                state.arrowY = compData.arrowY;
            }
            // rayShape: now array
            if (Array.isArray(compData.rayShape)) {
                state.rayShape = compData.rayShape.slice();
            } else if (compData.rayShape !== undefined) {
                // legacy: single value
                state.rayShape = [compData.rayShape];
            } else if (compData.dimensions && compData.dimensions.rayShape) {
                state.rayShape = [compData.dimensions.rayShape];
            } else {
                state.rayShape = ['collimated'];
            }
            // Set parentId in state (for completeness)
            state.parentId = parentIdToUse;

            // Store in idMap for child lookup
            idMap[result.id] = { element: result.element, id: result.id };
            oldToNewId[act.id] = result.id;

            // Track max id
            if (result.id > maxId) maxId = result.id;
        } else if (act.action === 'remove') {
            // Remove the component if it exists
            const newId = oldToNewId[act.id];
            if (newId !== undefined && idMap[newId] && idMap[newId].element) {
                removeComponent(idMap[newId].element);
                delete idMap[newId];
            } else {
                console.warn(`Skipped 'remove' action for id=${act.id}: component was never added or already removed.`);
            }
        }
    }

    // Update idCounter to avoid collisions for future adds
    idCounter = maxId + 1;

    // Fit viewport to all components after import
    const { updateCanvasViewBox } = await import('./viewportManager.js');
    updateCanvasViewBox();

    // Redraw aperture rays to reflect imported ray colors/shapes
    const { drawApertureRays } = await import('./rays.js');
    drawApertureRays();
}
/**
 * Export the current schematic to a JSON object, including a hierarchy action list.
 */
export function exportSchematicToJSON() {
    const componentsGroup = document.getElementById('components');
    const schematic = {
        components: [],
        actions: [],
        nextPosition: { x: nextX, y: nextY }
    };

    // 1. Export all component states
    for (const compId in componentState) {
        const state = componentState[compId];
        const compExport = {
            id: Number(compId),
            type: state.type,
            posX: state.posX,
            posY: state.posY,
            rotation: state.rotation,
            arrowX: state.arrowX,
            arrowY: state.arrowY,
            parentId: state.parentId,
            children: state.children,
            visible: state.visible,
            dimensions: state.dimensions,
            rayPolygonColor: Array.isArray(state.rayPolygonColor) ? state.rayPolygonColor.slice() : [state.rayPolygonColor],
            rayShape: Array.isArray(state.rayShape) ? state.rayShape.slice() : [state.rayShape]
            // Add more fields as needed
        };
        schematic.components.push(compExport);
    }

    // 2. Use the real-time action log for deterministic replay
    schematic.actions = actions.slice();
    return schematic;
}

/**
 * Download the current schematic as a JSON file.
 */
export function downloadSchematicJSON() {
    const schematic = exportSchematicToJSON();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(schematic, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "schematic.json");
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
}
/**
 * Flip the SVG of the selected component horizontally (left-right).
 * Only affects the SVG appearance, not the logical properties.
 */
/**
 * Flip the SVG of the selected component horizontally or vertically.
 * @param {'horizontal'|'vertical'} direction - Flip direction
 */
export function flipSelectedComponentSVG(direction = 'horizontal') {
    const component = getSelectedComponent();
    if (!component) {
        console.log('No component selected to flip');
        return;
    }
    if (direction === 'horizontal') {
        // Toggle data-flipped-h
        const isFlippedH = component.getAttribute('data-flipped-h') === 'true';
        component.setAttribute('data-flipped-h', isFlippedH ? 'false' : 'true');
    } else if (direction === 'vertical') {
        // Toggle data-flipped-v
        const isFlippedV = component.getAttribute('data-flipped-v') === 'true';
        component.setAttribute('data-flipped-v', isFlippedV ? 'false' : 'true');
    }
    // Reapply transform to update flip
    reapplyComponentTransform(component);
    console.log(`Flipped SVG for selected component (${direction}).`);
}

function getFlipTransform(component) {
    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    const dims = (state && state.dimensions) ? state.dimensions : componentDimensions[component.getAttribute('data-type')];
    const cx = dims.centerPoint.x;
    const cy = dims.centerPoint.y;
    let transform = '';
    if (component.getAttribute('data-flipped-h') === 'true') {
        transform += ` translate(${cx},${cy}) scale(-1,1) translate(${-cx},${-cy})`;
    }
    if (component.getAttribute('data-flipped-v') === 'true') {
        transform += ` translate(${cx},${cy}) scale(1,-1) translate(${-cx},${-cy})`;
    }
    return transform;
}

function reapplyComponentTransform(component) {
    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    if (!state) return;
    const currentDims = state.dimensions || componentDimensions[component.getAttribute('data-type')];
    const rotation = state.rotation || 0;
    const svgX = state.posX - currentDims.centerPoint.x;
    const svgY = state.posY - currentDims.centerPoint.y;
    let baseTransform = `translate(${svgX},${svgY}) rotate(${rotation} ${currentDims.centerPoint.x} ${currentDims.centerPoint.y})`;
    baseTransform += getFlipTransform(component);
    component.setAttribute('transform', baseTransform.trim());
}
// Simplified Component Manager - Core lifecycle management
// Handles adding, removing, and state management of components using focused modules

import { componentDimensions } from './components.js';
import { flipUpVector } from './modules/componentUtils.js';
import { updateTraceLines } from './traceLines.js';
import { validateComponentType } from './utils/validators.js';
import { HIDDEN_COMPONENT_OPACITY, VISIBLE_COMPONENT_OPACITY, GRID_SIZE, ROTATION_SNAP_INCREMENT } from './constants.js';
import { DEFAULT_SOLID_RAY_COLOR } from './constants.js';


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

// Real-time action log for add/remove operations
export let actions = [];

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
        visible: true,  // Track visibility state
        type: type,
        dimensions: dims,
        parentId: null,
        children: [],
        rayPolygonColor: ['#00ffff'],
        rayShape: [dims.rayShape || 'collimated']
    };

    // Update hierarchy and next position
    updateComponentHierarchy(compId, selectedComponent, componentState);
    nextX = arrowEndpoint.x;
    nextY = arrowEndpoint.y;

    // Log action
    let parentId = selectedComponent ? parseInt(selectedComponent.getAttribute('data-id')) : null;
    actions.push({ action: 'add', id: compId, parentId });

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

    // Log action
    actions.push({ action: 'remove', id: parseInt(compId) });

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

    // Only update if position changes by at least GRID_SIZE
    const dx = centerX - state.posX;
    const dy = centerY - state.posY;
    if (Math.abs(dx) < GRID_SIZE && Math.abs(dy) < GRID_SIZE) {
        return;
    }
    state.posX = centerX;
    state.posY = centerY;

    // Handle aperture scaling
    handleApertureScaling(component, state);
    recursivelyUpdateChildrenApertures(component, componentState, getComponentById, updateAperturePointDrawings);

    // Update transform and preserve flip
    reapplyComponentTransform(component);

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

    // Only update if rotation changes by at least ROTATION_SNAP_INCREMENT
    if (Math.abs(rotation - state.rotation) < ROTATION_SNAP_INCREMENT) {
        return;
    }
    state.rotation = rotation;
    
    // Handle aperture scaling
    handleApertureScaling(component, state);
    recursivelyUpdateChildrenApertures(component, componentState, getComponentById, updateAperturePointDrawings);

    // Update transform and preserve flip
    reapplyComponentTransform(component);
    
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
    
    // Build info strings with defensive checks
    let parentInfo;
    if (state.parentId !== null) {
        const parentState = componentState[state.parentId];
        if (parentState) {
            parentInfo = `Parent: ${state.parentId} (${parentState.type})`;
        } else {
            parentInfo = `Parent: ${state.parentId} (deleted)`;
        }
    } else {
        parentInfo = 'No Parent (Root)';
    }
    let childrenInfo;
    if (state.children.length > 0) {
        childrenInfo = 'Children: [' + state.children.map(childId => {
            const childState = componentState[childId];
            return childState ? `${childId} (${childState.type})` : `${childId} (deleted)`;
        }).join(', ') + ']';
    } else {
        childrenInfo = 'No Children';
    }

    console.log(`=== Selected Component ${compId} (${state.type}) ===`);
    console.log(`  Hierarchy: ${parentInfo}, ${childrenInfo}`);
    console.log(`  Center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)}) | Rotation: ${(state.rotation || 0).toFixed(1)}°`);
    console.log(`  Arrow: (${state.arrowX.toFixed(1)}, ${state.arrowY.toFixed(1)})`);
    console.log(`  Visibility: ${state.visible ? 'Visible' : 'Hidden'}`);
    
    // Log upVector and forwardVector
    if (state.dimensions) {
        const up = state.dimensions.upVector;
        const fwd = state.dimensions.forwardVector;
        if (up) {
            console.log(`  upVector:   (${up.x.toFixed(3)}, ${up.y.toFixed(3)})`);
        }
        if (fwd) {
            console.log(`  forwardVector: (${fwd.x.toFixed(3)}, ${fwd.y.toFixed(3)})`);
        }
    }
    // Log aperture info if available
    if (state.dimensions.apertureRadius) {
        const aperturePoints = state.dimensions.aperturePoints;
        const upperPos = aperturePoints ? `(${aperturePoints.upper.x.toFixed(1)}, ${aperturePoints.upper.y.toFixed(1)})` : 'undefined';
        const lowerPos = aperturePoints ? `(${aperturePoints.lower.x.toFixed(1)}, ${aperturePoints.lower.y.toFixed(1)})` : 'undefined';
        const coneAngle = state.dimensions.coneAngle !== undefined ? `${state.dimensions.coneAngle.toFixed(1)}°` : 'undefined';
        console.log(`  Aperture: Radius=${state.dimensions.apertureRadius.toFixed(2)} | Upper=${upperPos} | Lower=${lowerPos}`);
        // Log all ray shapes and colors
        if (Array.isArray(state.rayShape) && Array.isArray(state.rayPolygonColor)) {
            for (let i = 0; i < state.rayShape.length; i++) {
                const shape = state.rayShape[i] || 'unknown';
                const color = state.rayPolygonColor[i] || '(default)';
                console.log(`  Ray ${i + 1}: Shape: ${shape} | Color: ${color}`);
            }
        } else {
            const shape = state.rayShape || 'unknown';
            const color = state.rayPolygonColor || '(default)';
            console.log(`  Ray: Shape: ${shape} | Color: ${color}`);
        }
        console.log(`  Cone Angle: ${coneAngle}`);
    }
}

/**
 * Hide a component by making only its drawing elements transparent while keeping functionality
 * @param {HTMLElement} component - Component to hide
 */
export function hideComponent(component) {
    if (!component) return;

    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    if (!state) return;

    // Update state
    state.visible = false;

    // Make only the component drawing elements transparent
    // This affects paths, rects, circles, ellipses, etc. from the component's draw function
    // but excludes debug elements, hitboxes, and other non-drawing elements
    const drawingElements = component.querySelectorAll('path, rect:not(.component-hit-area), circle:not([data-aperture-type]):not([fill="red"]), ellipse, line:not([stroke="green"]):not([stroke="blue"])');
    drawingElements.forEach(element => {
        element.style.opacity = HIDDEN_COMPONENT_OPACITY;
    });
    
    console.log(`Hidden component ${compId} (${state.type}) - only drawing elements are transparent`);
}

/**
 * Show a previously hidden component by restoring drawing elements opacity
 * @param {HTMLElement} component - Component to show
 */
export function showComponent(component) {
    if (!component) return;

    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    if (!state) return;

    // Update state
    state.visible = true;

    // Restore opacity for drawing elements only
    const drawingElements = component.querySelectorAll('path, rect:not(.component-hit-area), circle:not([data-aperture-type]):not([fill="red"]), ellipse, line:not([stroke="green"]):not([stroke="blue"])');
    drawingElements.forEach(element => {
        element.style.opacity = VISIBLE_COMPONENT_OPACITY;
    });
    
    console.log(`Showed component ${compId} (${state.type}) - drawing elements restored to full opacity`);
}

/**
 * Hide the currently selected component
 */
export function hideSelectedComponent() {
    const component = getSelectedComponent();
    if (!component) {
        console.log('No component selected to hide');
        return;
    }
    
    hideComponent(component);
}

/**
 * Show the currently selected component
 */
export function showSelectedComponent() {
    const component = getSelectedComponent();
    if (!component) {
        console.log('No component selected to show');
        return;
    }
    
    showComponent(component);
}

/**
 * Show all hidden components
 */
export function showAllComponents() {
    const componentsGroup = document.getElementById('components');
    if (!componentsGroup) return;

    let hiddenCount = 0;
    
    // Iterate through all components
    for (const component of componentsGroup.children) {
        const compId = component.getAttribute('data-id');
        const state = componentState[compId];
        
        if (state && !state.visible) {
            showComponent(component);
            hiddenCount++;
        }
    }
    
    console.log(`Showed ${hiddenCount} hidden components`);
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

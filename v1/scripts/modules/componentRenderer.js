// Component rendering and SVG DOM manipulation
// Handles visual representation of components including debug drawings

import { 
    SHOW_DEBUG_DRAWING, 
    UP_VECTOR_LENGTH, 
    FORWARD_VECTOR_LENGTH,
    CENTER_MARKER_RADIUS,
    APERTURE_POINT_RADIUS,
    LOWER_APERTURE_POINT_RADIUS
} from '../constants.js';
import { ensureAllMarkers } from '../utils/svgUtils.js';
import { components } from '../components.js';

/**
 * Create component group with basic structure
 * @param {number} compId - Component ID
 * @param {string} type - Component type
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} rotation - Rotation angle
 * @param {object} dims - Component dimensions
 * @returns {HTMLElement} Component group element
 */
export function createComponentGroup(compId, type, centerX, centerY, rotation, dims) {
    const ns = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(ns, "g");
    g.setAttribute("class", "component");
    g.setAttribute("data-id", compId);
    g.setAttribute("data-type", type);
    
    // Convert center position to top-left corner for SVG transform
    const svgX = centerX - dims.centerPoint.x;
    const svgY = centerY - dims.centerPoint.y;
    g.setAttribute("transform", `translate(${svgX},${svgY}) rotate(${rotation} ${dims.centerPoint.x} ${dims.centerPoint.y})`);
    
    return g;
}

/**
 * Add hit area for better component selection
 * @param {HTMLElement} group - Component group element
 * @param {object} dims - Component dimensions
 */
export function addHitArea(group, dims) {
    const ns = "http://www.w3.org/2000/svg";
    const hitArea = document.createElementNS(ns, "rect");
    hitArea.setAttribute("class", "component-hit-area");
    hitArea.setAttribute("x", -dims.width/2 + dims.offsetX);
    hitArea.setAttribute("y", -dims.height/2);
    hitArea.setAttribute("width", dims.width);
    hitArea.setAttribute("height", dims.height);
    hitArea.setAttribute('visibility', 'hidden');
    group.appendChild(hitArea);
}

/**
 * Add component's SVG elements to the group
 * @param {HTMLElement} group - Component group element
 * @param {string} type - Component type
 */
export function addComponentSVG(group, type) {
    const ns = "http://www.w3.org/2000/svg";
    const componentGroup = components[type].draw(ns);
    
    while (componentGroup.firstChild) {
        const child = componentGroup.firstChild;
        // Disable pointer events on all child elements so only the main group handles mouse events
        child.setAttribute('pointer-events', 'none');
        group.appendChild(child);
    }
}

/**
 * Add debug visual elements (markers, vectors, aperture points)
 * @param {HTMLElement} group - Component group element
 * @param {object} dims - Component dimensions
 * @param {HTMLElement} svg - Main SVG element
 */
export function addDebugElements(group, dims, svg) {
    if (!SHOW_DEBUG_DRAWING) return;
    
    const ns = "http://www.w3.org/2000/svg";
    
    // Center marker (red dot)
    const centerMarker = document.createElementNS(ns, "circle");
    centerMarker.setAttribute("cx", dims.centerPoint.x);
    centerMarker.setAttribute("cy", dims.centerPoint.y);
    centerMarker.setAttribute("r", CENTER_MARKER_RADIUS);
    centerMarker.setAttribute("fill", "red");
    centerMarker.setAttribute('pointer-events', 'none');
    group.appendChild(centerMarker);
    
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
    group.appendChild(upLine);
    
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
    group.appendChild(forwardLine);
    
    // Aperture points
    drawAperturePoints(group, dims, ns);
    
    // Ensure vector arrow markers exist
    ensureAllMarkers(svg);
}

/**
 * Draw or update aperture points
 * @param {HTMLElement} parentElement - Parent element (component group)
 * @param {object} dimensions - Component dimensions
 * @param {string|null} ns - SVG namespace (null for updates)
 */
export function drawAperturePoints(parentElement, dimensions, ns = null) {
    if (!dimensions || !dimensions.aperturePoints) return;
    
    const isCreation = ns !== null;
    
    if (isCreation) {
        // Creating new aperture points during component creation
        createAperturePoint(parentElement, dimensions.aperturePoints.upper, 'upper', APERTURE_POINT_RADIUS, ns);
        createAperturePoint(parentElement, dimensions.aperturePoints.lower, 'lower', LOWER_APERTURE_POINT_RADIUS, ns);
    } else {
        // Updating existing aperture points during dynamic scaling
        updateAperturePoint(parentElement, dimensions.aperturePoints.upper, 'upper');
        updateAperturePoint(parentElement, dimensions.aperturePoints.lower, 'lower');
    }
}

/**
 * Create a new aperture point
 * @param {HTMLElement} parent - Parent element
 * @param {object} position - Point position {x, y}
 * @param {string} type - Point type ('upper' or 'lower')
 * @param {number} radius - Point radius
 * @param {string} ns - SVG namespace
 */
function createAperturePoint(parent, position, type, radius, ns) {
    const point = document.createElementNS(ns, "circle");
    point.setAttribute("cx", position.x);
    point.setAttribute("cy", position.y);
    point.setAttribute("r", radius);
    point.setAttribute("fill", "blue");
    point.setAttribute('pointer-events', 'none');
    point.setAttribute('data-aperture-type', type);
    parent.appendChild(point);
}

/**
 * Update existing aperture point position
 * @param {HTMLElement} parent - Parent element
 * @param {object} position - New position {x, y}
 * @param {string} type - Point type ('upper' or 'lower')
 */
function updateAperturePoint(parent, position, type) {
    // Find existing aperture point by data attribute
    let aperturePoint = parent.querySelector(`circle[data-aperture-type="${type}"]`);
    
    // Fallback: find by radius if data attribute not found
    if (!aperturePoint) {
        const expectedRadius = type === 'upper' ? APERTURE_POINT_RADIUS : LOWER_APERTURE_POINT_RADIUS;
        const allCircles = parent.querySelectorAll('circle[fill="blue"]');
        for (const circle of allCircles) {
            const radius = parseFloat(circle.getAttribute('r'));
            if (radius === expectedRadius && !circle.hasAttribute('data-aperture-type')) {
                aperturePoint = circle;
                break;
            }
        }
    }
    
    // Update position and ensure data attribute exists
    if (aperturePoint && position) {
        aperturePoint.setAttribute("cx", position.x);
        aperturePoint.setAttribute("cy", position.y);
        if (!aperturePoint.hasAttribute('data-aperture-type')) {
            aperturePoint.setAttribute('data-aperture-type', type);
        }
    }
}

/**
 * Update aperture point drawings when dimensions change
 * @param {HTMLElement} component - Component element
 * @param {object} newDimensions - New component dimensions
 */
export function updateAperturePointDrawings(component, newDimensions) {
    if (!SHOW_DEBUG_DRAWING || !component || !newDimensions) return;
    
    // Update existing aperture points
    drawAperturePoints(component, newDimensions);
    
    console.log(`Updated aperture points: Upper (${newDimensions.aperturePoints.upper.x.toFixed(1)}, ${newDimensions.aperturePoints.upper.y.toFixed(1)}), Lower (${newDimensions.aperturePoints.lower.x.toFixed(1)}, ${newDimensions.aperturePoints.lower.y.toFixed(1)})`);
}

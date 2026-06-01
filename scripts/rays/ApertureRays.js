/**
 * ApertureRays.js — Ray polygon rendering for all 5 aperture shapes.
 * 
 * Draws SVG polygons connecting parent-child component apertures based on ray shapes.
 * Supports all combinations: collimated, divergent, convergent, manual, and array modes.
 */

import { componentManager } from '../components/ComponentManager.js';
import { DEFAULT_SOLID_RAY_COLOR, DEFAULT_RAY_POLYGON_OPACITY } from '../config.js';

// Ray visibility settings
export let showApertureRays = true;

/**
 * Draw aperture rays connecting all parent-child component relationships.
 * Dispatches to the appropriate polygon function based on ray shapes.
 */
export function drawApertureRays() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;
    
    // Remove existing aperture rays
    hideApertureRays();
    
    // Create aperture rays group
    const rayGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    rayGroup.setAttribute("id", "aperture-rays");
    
    // Iterate through all components with parents
    componentManager.components.forEach((child) => {
        if (child.parent === null) return;
        
        const rawParent = componentManager.getComponent(child.parent);
        if (!rawParent) return;
        // Remap to the composite exit port only when the parent is a composite member
        // from a DIFFERENT instance than the child. Within the same composite, the
        // internal parent pointer must be used as-is (entry → exit wiring is internal).
        const sameCompositeInstance = child.isCompositeInstance &&
            rawParent.isCompositeInstance &&
            child.compositeInstanceId === rawParent.compositeInstanceId;
        const parent = sameCompositeInstance
            ? rawParent
            : componentManager.getCompositeExitPort(rawParent);
        if (!parent) return;
        
        // Dispatch to appropriate rendering function based on child's ray shape
        // and parent's ray shape (for array mode decision)
        const polygons = getPolygonsForConnection(parent, child);
        
        polygons.forEach(polygon => {
            rayGroup.appendChild(polygon);
        });
    });
    
    // Insert aperture rays before trace-lines-group (or schematics) so traces appear on top of rays
    const traceLinesGroup = document.getElementById("trace-lines-group");
    const schematicsGroup = document.getElementById("schematics");
    const insertBefore = traceLinesGroup || schematicsGroup;
    if (insertBefore) {
        canvas.insertBefore(rayGroup, insertBefore);
    } else {
        canvas.appendChild(rayGroup);
    }
}

/**
 * Determine which polygon(s) to draw for a parent-child connection.
 * Returns an array of SVG polygon elements.
 * 
 * Dispatches based on child.rayShape with special handling for array mode
 * depending on whether parent is also array mode.
 *
 * Exported so the composite preview dialog can reuse identical ray geometry.
 */
export function getPolygonsForConnection(parent, child) {
    const polygons = [];
    
    switch (child.rayShape) {
        case 'collimated':
            const collimated = _createCollimatedPolygon(parent, child);
            if (collimated) polygons.push(collimated);
            break;
        case 'divergent':
            const divergent = _createDivergentPolygon(parent, child);
            if (divergent) polygons.push(divergent);
            break;
        case 'convergent':
            const convergent = _createConvergentPolygon(parent, child);
            if (convergent) polygons.push(convergent);
            break;
        case 'manual':
            const manual = _createManualPolygon(parent, child);
            if (manual) polygons.push(manual);
            break;
        case 'array':
            if (parent.rayShape === 'array') {
                // Parent is array, child is array: center-aligned segment-to-segment connections
                _createArrayToArrayPolygons(parent, child, polygons);
            } else {
                // Parent is non-array (collimated/divergent/convergent/manual), child is array:
                // treat child as manual — connect parent upper/lower to child full extent
                const arrayAsManual = _createArrayAsManualPolygon(parent, child);
                if (arrayAsManual) polygons.push(arrayAsManual);
            }
            break;
    }
    
    return polygons;
}

// ─── Polygon creation functions ─────────────────────────────────────────────

/**
 * Return the upper and lower world-space extent of a parent's aperture.
 * For array parents, uses the full ±radius boundary (ignoring sub-segment size),
 * so the extent is always at ±apertureRadius regardless of arraySizeRatio.
 * For all other shapes the two values equal pts[0]/pts[1].
 */
function _getParentExtentWorld(parent) {
    if (parent.rayShape === 'array') {
        const [upper, lower] = parent.getApertureFullExtentWorld();
        return { upper, lower };
    }
    const pts = parent.getAperturePointsWorld();
    if (!pts || pts.length < 2) return null;
    return { upper: pts[0], lower: pts[pts.length - 1] };
}

/**
 * Collimated: 4-vertex polygon [parentUpper, childUpper, childLower, parentLower]
 */
function _createCollimatedPolygon(parent, child) {
    const parentExtent = _getParentExtentWorld(parent);
    const childPts = child.getAperturePointsWorld();
    
    if (!parentExtent || !childPts || childPts.length < 2) {
        return null;
    }
    
    const parentUpper = parentExtent.upper;
    const parentLower = parentExtent.lower;
    const childUpper = childPts[0];
    const childLower = childPts[1];
    
    child.coneAngle = 0;
    return _createPolygonElement(
        [parentUpper, childUpper, childLower, parentLower],
        child
    );
}

/**
 * Divergent: 3-vertex polygon [parentCenter, childUpper, childLower]
 * coneAngle logic:
 *   - If parent.coneAngle != 0: inherit it, recalculate child aperture radius
 *     from the axis distance so the beam expands at the same angle.
 *   - If parent.coneAngle == 0: keep child aperture radius, derive and assign
 *     coneAngle = atan(childRadius / axisDistance).
 */
function _createDivergentPolygon(parent, child) {
    const parentCenter = parent.getApertureCenterWorld();
    const childCenter  = child.getApertureCenterWorld();

    // Axis distance between the two aperture centres
    const dx   = childCenter.x - parentCenter.x;
    const dy   = childCenter.y - parentCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1e-6) {
        if (parent.coneAngle && parent.coneAngle !== 0) {
            // Inherit parent cone angle; recalculate child aperture radius
            child.coneAngle = parent.coneAngle;
            const newRadius = dist * Math.tan(parent.coneAngle * Math.PI / 180);
            child.setApertureRadius(parseFloat(newRadius.toFixed(2)));
        } else {
            // Keep child aperture radius; derive its cone angle
            const halfAngleDeg = Math.atan2(child.apertureRadius, dist) * 180 / Math.PI;
            child.coneAngle = parseFloat(halfAngleDeg.toFixed(2));
        }
    }

    // Re-fetch aperture points after potential radius change
    const childPts = child.getAperturePointsWorld();
    if (!childPts || childPts.length < 2) return null;

    const childUpper = childPts[0];
    const childLower = childPts[1];

    return _createPolygonElement(
        [parentCenter, childUpper, childLower],
        child
    );
}

/**
 * Convergent: 3-vertex polygon [parentUpper, childCenter, parentLower]
 * Also calculates and assigns child.coneAngle from the geometry.
 */
function _createConvergentPolygon(parent, child) {
    const parentExtent = _getParentExtentWorld(parent);
    const childCenter = child.getApertureCenterWorld();
    
    if (!parentExtent) {
        return null;
    }
    
    const parentUpper = parentExtent.upper;
    const parentLower = parentExtent.lower;

    // Compute cone half-angle: angle at childCenter between axis and edge ray.
    // Axis = childCenter → parentCenter (midpoint of parentUpper/parentLower).
    const parentCenterW = parent.getApertureCenterWorld();
    const axDx = parentCenterW.x - childCenter.x;
    const axDy = parentCenterW.y - childCenter.y;
    const axLen = Math.sqrt(axDx * axDx + axDy * axDy);
    if (axLen > 1e-6) {
        // Edge ray: childCenter → parentUpper
        const edDx = parentUpper.x - childCenter.x;
        const edDy = parentUpper.y - childCenter.y;
        const edLen = Math.sqrt(edDx * edDx + edDy * edDy);
        // cos(θ) = dot(axis, edge) / (|axis| * |edge|)
        const dot = axDx * edDx + axDy * edDy;
        const cosAngle = Math.min(1, Math.max(-1, dot / (axLen * edLen)));
        const halfAngleDeg = Math.acos(cosAngle) * 180 / Math.PI;
        child.coneAngle = parseFloat(halfAngleDeg.toFixed(2));
    }
    
    return _createPolygonElement(
        [parentUpper, childCenter, parentLower],
        child
    );
}

/**
 * Manual: 4-vertex polygon [parentUpper, childUpper, childLower, parentLower]
 * Same geometry as collimated, but semantically different (no auto-scaling).
 */
function _createManualPolygon(parent, child) {
    return _createCollimatedPolygon(parent, child);
}

/**
 * Array as manual: single 4-vertex polygon spanning the full child aperture extent.
 * Uses child's first point (top of first segment) and last point (bottom of last segment).
 * [parentUpper, childTop, childBottom, parentLower]
 */
function _createArrayAsManualPolygon(parent, child) {
    const parentPts = parent.getAperturePointsWorld();
    // Use full ±radius extent for the child (not sub-segment endpoints)
    const childExtent = child.getApertureFullExtentWorld();

    if (!parentPts || parentPts.length < 2 || !childExtent) {
        return null;
    }

    const parentUpper = parentPts[0];
    const parentLower = parentPts[parentPts.length - 1];
    const [childTop, childBottom] = childExtent;

    return _createPolygonElement(
        [parentUpper, childTop, childBottom, parentLower],
        child
    );
}

/**
 * Array-to-Array: Multiple 4-vertex polygons, one per matching segment pair.
 * [parentSegTop[i], childSegTop[i], childSegBot[i], parentSegBot[i]]
 * Uses center-aligned pairing: if counts differ, the center segments are connected
 * and the outer ones on the side with more segments are ignored.
 */
function _createArrayToArrayPolygons(parent, child, polygons) {
    const parentPts = parent.getAperturePointsWorld();
    const childPts = child.getAperturePointsWorld();
    
    if (!parentPts || !childPts) return;
    
    // Determine number of matching segment pairs (center-aligned)
    const n = Math.min(parent.arraySegments, child.arraySegments);
    const parentOffset = Math.floor((parent.arraySegments - n) / 2);
    const childOffset  = Math.floor((child.arraySegments  - n) / 2);
    
    // Each segment has 2 points (top, bot), so segment i uses indices [2i, 2i+1]
    for (let i = 0; i < n; i++) {
        const parentSegTopIdx = (parentOffset + i) * 2;
        const parentSegBotIdx = (parentOffset + i) * 2 + 1;
        const childSegTopIdx  = (childOffset  + i) * 2;
        const childSegBotIdx  = (childOffset  + i) * 2 + 1;
        
        if (parentSegTopIdx >= parentPts.length || parentSegBotIdx >= parentPts.length ||
            childSegTopIdx >= childPts.length || childSegBotIdx >= childPts.length) {
            break;
        }
        
        const polygon = _createPolygonElement(
            [
                parentPts[parentSegTopIdx],  // parentSegTop[i]
                childPts[childSegTopIdx],    // childSegTop[i]
                childPts[childSegBotIdx],    // childSegBot[i]
                parentPts[parentSegBotIdx]   // parentSegBot[i]
            ],
            child
        );
        
        if (polygon) {
            polygons.push(polygon);
        }
    }
}

// ─── SVG polygon element creation ───────────────────────────────────────────

/**
 * Create an SVG polygon element with the given vertices and child's color/opacity.
 * Vertices should be an array of {x, y} objects.
 */
function _createPolygonElement(vertices, child) {
    if (!vertices || vertices.length < 3) {
        return null;
    }
    
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    
    // Build points string: "x1,y1 x2,y2 x3,y3 ..."
    const pointsString = vertices
        .map(pt => `${pt.x},${pt.y}`)
        .join(" ");
    
    polygon.setAttribute("points", pointsString);
    polygon.setAttribute("fill", child.rayPolygonColor || DEFAULT_SOLID_RAY_COLOR);
    polygon.setAttribute("fill-opacity", child.rayPolygonOpacity ?? DEFAULT_RAY_POLYGON_OPACITY);
    polygon.setAttribute("stroke", "none");
    polygon.setAttribute("pointer-events", "none");
    
    return polygon;
}

// ─── Visibility controls ───────────────────────────────────────────────────

/**
 * Hide aperture rays by removing the group from the canvas.
 */
export function hideApertureRays() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;
    
    const rayGroup = canvas.querySelector("#aperture-rays");
    if (rayGroup) {
        rayGroup.remove();
    }
}

/**
 * Toggle aperture rays visibility.
 */
export function toggleApertureRays() {
    showApertureRays = !showApertureRays;
    
    if (showApertureRays) {
        drawApertureRays();
    } else {
        hideApertureRays();
    }
}


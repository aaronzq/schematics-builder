/**
 * ApertureScaling.js
 *
 * Pure-function helpers for aperture scaling. No top-level imports from
 * ComponentManager to avoid a circular dependency
 * (ComponentManager → ApertureScaling → ComponentManager).
 *
 * All exported functions receive Component objects directly — callers are
 * responsible for resolving IDs via componentManager.getComponent().
 */

/**
 * Calculate aperture projections for a child-parent pair.
 *
 * Projects each component's upVector (scaled by apertureRadius) onto the
 * perpendicular of the center-to-center line. This gives the "apparent half-width"
 * of each aperture as seen along the optical axis — the fundamental quantity used
 * for collimated ray scaling.
 *
 * @param {Component} child
 * @param {Component} parent
 * @returns {{ child: {apertureProjection, upProjectionFactor, apertureRadius},
 *             parent: {apertureProjection, upProjectionFactor, apertureRadius} } | null}
 */
export function calculateProjections(child, parent) {
    const childCenter  = child.getCenterPointWorld();
    const parentCenter = parent.getCenterPointWorld();

    const dx = childCenter.x - parentCenter.x;
    const dy = childCenter.y - parentCenter.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return null;

    // Unit vector along the center line, and its perpendicular
    const px = -dy / len;   // perpendicular (90° CCW)
    const py =  dx / len;

    // Rotate each component's local upVector by its world rotation
    const rotateUp = (upVec, rotDeg) => {
        const rad = rotDeg * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return {
            x: upVec.x * cos - upVec.y * sin,
            y: upVec.x * sin + upVec.y * cos
        };
    };

    const childGlobalUp  = rotateUp(child.upVector,  child.rotation);
    const parentGlobalUp = rotateUp(parent.upVector, parent.rotation);

    // |dot(globalUp, perp)| — how much of the aperture is visible from the side
    const childUpFactor  = Math.abs(childGlobalUp.x  * px + childGlobalUp.y  * py);
    const parentUpFactor = Math.abs(parentGlobalUp.x * px + parentGlobalUp.y * py);

    return {
        child: {
            apertureRadius:     child.apertureRadius,
            upProjectionFactor: childUpFactor,
            apertureProjection: child.apertureRadius  * childUpFactor
        },
        parent: {
            apertureRadius:     parent.apertureRadius,
            upProjectionFactor: parentUpFactor,
            apertureProjection: parent.apertureRadius * parentUpFactor
        }
    };
}

/**
 * Scale a child component's apertureRadius so its projected aperture width
 * matches its parent's (collimated ray rule).
 * Returns true if the radius was updated, false otherwise.
 *
 * @param {Component} child
 * @param {Component} parent
 * @returns {boolean}
 */
function scaleApertureToParent(child, parent) {
    const proj = calculateProjections(child, parent);
    if (!proj) return false;

    const childProj  = proj.child.apertureProjection;
    const parentProj = proj.parent.apertureProjection;

    if (childProj === 0) return false;

    const ratio     = parentProj / childProj;
    const newRadius = child.apertureRadius * ratio;

    if (newRadius <= 0 || newRadius > 200 || !isFinite(newRadius)) return false;

    child.setApertureRadius(newRadius);
    return true;
}

/**
 * Check whether the upper and lower aperture rays between child and parent
 * cross each other (indicating the child's upVector points the wrong way).
 *
 * For collimated rays: upper ray = parentUpper→childUpper,
 *                      lower ray = parentLower→childLower.
 * If these two segments intersect, the child's upVector is flipped.
 *
 * @param {Component} child
 * @param {Component} parent
 * @returns {boolean}
 */
function checkLinesCross(child, parent) {
    const childPts  = child.getAperturePointsWorld();   // [upper, lower]
    const parentPts = parent.getAperturePointsWorld();  // [upper, lower]

    if (!childPts || childPts.length < 2) return false;
    if (!parentPts || parentPts.length < 2) return false;

    // Use first and last points as upper/lower extremes.
    // For array apertures childPts has 2n points; pts[0] is the top of the first
    // segment and pts[length-1] is the bottom of the last — the true full extent.
    // For standard 2-point shapes this is identical to [0] and [1].
    const x1 = parentPts[0].x,                     y1 = parentPts[0].y;                     // parentUpper
    const x2 = childPts[0].x,                      y2 = childPts[0].y;                      // childUpper
    const x3 = parentPts[parentPts.length - 1].x,  y3 = parentPts[parentPts.length - 1].y;  // parentLower
    const x4 = childPts[childPts.length - 1].x,    y4 = childPts[childPts.length - 1].y;    // childLower

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return false;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return (t >= 0 && t <= 1 && u >= 0 && u <= 1);
}

/**
 * Flip a component's upVector (negate it) and recompute its aperturePoints.
 * Called when checkLinesCross detects a crossed orientation.
 *
 * @param {Component} comp
 */
function flipUpVector(comp) {
    comp.upVector = { x: -comp.upVector.x, y: -comp.upVector.y };
    comp.aperturePoints = comp._getAperturePoints();
}

/**
 * Apply aperture scaling (and crossing correction) to a single child component
 * relative to its parent.
 *
 * 1. Scale child's apertureRadius to match parent projection.
 * 2. If aperture lines cross, flip the child's upVector and re-scale.
 *
 * @param {Component} child   - The child component to scale.
 * @param {Component} parent  - The parent component (already resolved by caller).
 */
export function applyApertureScaling(child, parent) {
    if (!parent) return;

    // Composite members have their ray geometry frozen against *external* cascades
    // (e.g. a component outside the composite rescaling into it).
    // However, intra-composite cascades — where the parent is a sibling in the same
    // composite instance — must still propagate so that adjusting the entry port
    // correctly updates all downstream members.
    // Manual / Array: user controls radius directly — skip auto-scaling
    if (child.rayShape === 'manual' || child.rayShape === 'array') return;

    // Convergent: child aperture is independent of parent — skip auto-scaling.
    // The polygon converges to the child's own aperture centre; the user controls
    // apertureRadius freely via the slider.
    if (child.rayShape === 'convergent') return;

    // Divergent: aperture size depends on whether the parent already has a cone angle.
    if (child.rayShape === 'divergent') {
        const childCenter  = child.getApertureCenterWorld();
        const parentCenter = parent.getApertureCenterWorld();
        const dx   = childCenter.x - parentCenter.x;
        const dy   = childCenter.y - parentCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1e-6) {
            if (parent.coneAngle && parent.coneAngle !== 0) {
                // Inherit parent cone angle → recalculate child aperture radius
                child.coneAngle = parent.coneAngle;
                const newRadius = dist * Math.tan(parent.coneAngle * Math.PI / 180);
                child.setApertureRadius(parseFloat(newRadius.toFixed(2)));
            } else {
                // Keep child aperture radius → derive cone angle from geometry
                child.coneAngle = parseFloat(
                    (Math.atan2(child.apertureRadius, dist) * 180 / Math.PI).toFixed(2)
                );
            }
        }
        return;
    }

    // Collimated and Array: scale child's apertureRadius to match parent projection.
    // For array, segments scale proportionally since they are derived from apertureRadius.
    // 1. Scale to match parent projection
    scaleApertureToParent(child, parent);

    // 2. Crossing check — if rays cross, flip upVector and re-scale.
    if (child.apertureRadius > 0 && parent.apertureRadius > 0 && checkLinesCross(child, parent)) {
        flipUpVector(child);
        scaleApertureToParent(child, parent);
    }
}

/**
 * Recursively apply aperture scaling to all descendants of a given component.
 * Call this after any component is moved, rotated, or scaled so that the
 * entire sub-tree stays visually coherent.
 *
 * @param {Component} root          The component whose children should be updated.
 * @param {Function}  getComponent  (id) => Component | undefined — resolver for child lookups.
 */
export function recursivelyUpdateChildrenApertures(root, getComponent) {
    if (!root.children || root.children.length === 0) return;

    for (const childId of root.children) {
        const child = getComponent(childId);
        if (!child) continue;

        const rawParent = getComponent(child.parent);
        // If the parent is a non-exit composite member, resolve to exit port
        const parent = (rawParent && rawParent.isCompositeInstance && !rawParent.isExitPort)
            ? (() => {
                for (const mId of (rawParent.groupMembers || [])) {
                    const m = getComponent(mId);
                    if (m && m.isExitPort && m.compositeInstanceId === rawParent.compositeInstanceId) return m;
                }
                return rawParent;
              })()
            : rawParent;
        if (!parent) continue;

        applyApertureScaling(child, parent);
        recursivelyUpdateChildrenApertures(child, getComponent);
    }
}

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

    const x1 = parentPts[0].x, y1 = parentPts[0].y;  // parentUpper
    const x2 = childPts[0].x,  y2 = childPts[0].y;   // childUpper
    const x3 = parentPts[1].x, y3 = parentPts[1].y;  // parentLower
    const x4 = childPts[1].x,  y4 = childPts[1].y;   // childLower

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

    // 1. Scale to match parent projection
    scaleApertureToParent(child, parent);

    // 2. Crossing check — if rays cross, flip upVector and re-scale.
    // Skip when either aperture radius is 0: the two aperture points of that
    // component collapse to a single coordinate, causing the segment-intersection
    // test to produce false positives (the shared endpoint satisfies t=0 or u=0,
    // which is within [0,1]).  A flip is also meaningless for a zero-radius aperture.
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

        const parent = getComponent(child.parent);
        if (!parent) continue;

        applyApertureScaling(child, parent);
        recursivelyUpdateChildrenApertures(child, getComponent);
    }
}

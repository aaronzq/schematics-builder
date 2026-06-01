import { drawTraceLines } from './TraceLines.js';
import { drawApertureRays, showApertureRays } from './ApertureRays.js';
import { applyApertureScaling, recursivelyUpdateChildrenApertures } from './ApertureScaling.js';
import { componentManager } from '../components/ComponentManager.js';

document.addEventListener('ray:selectionChanged', applyRayHighlight);

/**
 * Main function to update all ray/line visualizations in the scene.
 * This should be called whenever the scene state changes (component add/move/rotate/scale/delete).
 * 
 * @param {string|null} sourceId - Optional ID of the component that triggered the update
 */
export function updateRays(sourceId = null) {
    // 1. Recalculate aperture sizes for the whole tree
    updateApertureScaling(sourceId);

    // 2. Draw parent-child trace lines
    drawTraceLines();

    // 3. Draw aperture rays
    if (showApertureRays) {
        drawApertureRays();
    }

    // 4. Overlay dashed highlight on affected rays
    applyRayHighlight();
}

/**
 * Resolve the single component whose ray color the user can actually edit
 * for the current selection:
 *  - Composite selected → entry port (the ray panel targets the entry port)
 *  - Group or single component → currentId
 *
 * @returns {number|null}
 */
function _getHighlightSeedId() {
    const id = componentManager.currentId;
    if (id == null) return null;
    const comp = componentManager.components.get(id);
    // For composites currentId is the exit port; the editable component is the entry port
    if (comp && comp.isCompositeInstance && comp.isExitPort) {
        return componentManager.getCompositeEntryPortId(id) ?? id;
    }
    return id;
}

/**
 * Compute the set of component IDs whose ray polygon will be affected when
 * the user edits the color/opacity of the currently selected component's ray.
 *
 * Starting from the single editable seed:
 *  - The seed's own incoming ray (seed is the child in that polygon)
 *  - Descendants that have rayColorInheritFromParent=true, recursively
 *
 * @returns {Set<number>}
 */
function getAffectedChildIds() {
    const seedId = _getHighlightSeedId();
    if (seedId == null) return new Set();

    const affected = new Set();
    const comp = componentManager.components.get(seedId);
    if (!comp) return affected;

    // Seed's own incoming ray
    if (comp.parent !== null) affected.add(seedId);

    // Inheriting descendants
    comp.children.forEach(childId => {
        const child = componentManager.components.get(childId);
        if (!child) return;
        if (child.rayColorInheritFromParent ?? true) {
            affected.add(childId);
            _walkInheritChain(childId, affected);
        }
    });

    return affected;
}

function _walkInheritChain(compId, affected) {
    const comp = componentManager.components.get(compId);
    if (!comp) return;
    comp.children.forEach(childId => {
        const child = componentManager.components.get(childId);
        if (!child) return;
        if (child.rayColorInheritFromParent ?? true) {
            affected.add(childId);
            _walkInheritChain(childId, affected);
        }
    });
}

/**
 * Overlay dashed contours on ray polygons that belong to components
 * affected by the current selection. Removes any previous overlay first.
 */
function applyRayHighlight() {
    const existing = document.getElementById('ray-highlight-overlay');
    if (existing) existing.remove();

    if (componentManager.selectedIds.size === 0) return;

    const affectedIds = getAffectedChildIds();
    if (affectedIds.size === 0) return;

    const rayGroup = document.getElementById('aperture-rays');
    if (!rayGroup) return;

    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlay.setAttribute('id', 'ray-highlight-overlay');
    overlay.style.setProperty('pointer-events', 'none', 'important');
    overlay.style.setProperty('mix-blend-mode', 'normal', 'important');

    const canvas = document.getElementById('canvas');

    rayGroup.querySelectorAll('polygon[data-child-id]').forEach(polygon => {
        if (!affectedIds.has(+polygon.dataset.childId)) return;

        const rayColor = polygon.getAttribute('fill') || '#888';
        const outline = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        outline.setAttribute('points', polygon.getAttribute('points'));
        outline.style.setProperty('fill', 'none', 'important');
        outline.style.setProperty('stroke', rayColor, 'important');
        outline.style.setProperty('stroke-opacity', '1', 'important');
        outline.style.setProperty('stroke-width', '2px', 'important');
        outline.style.setProperty('stroke-dasharray', '6 5', 'important');
        outline.style.setProperty('pointer-events', 'none', 'important');
        outline.classList.add('ray-highlight-outline');
        overlay.appendChild(outline);
    });

    if (overlay.childElementCount === 0) return;

    if (canvas) {
        // Prefer inserting before the components group so highlights sit beneath component drawings
        const schematicsGroup = document.getElementById('schematics');
        if (schematicsGroup) {
            canvas.insertBefore(overlay, schematicsGroup);
        } else if (rayGroup && rayGroup.parentNode) {
            // Fallback: insert right after the ray group
            rayGroup.parentNode.insertBefore(overlay, rayGroup.nextSibling);
        } else {
            canvas.appendChild(overlay);
        }
    } else {
        rayGroup.insertAdjacentElement('afterend', overlay);
    }
}

/**
 * Recalculate aperture radii for all components (or just a subtree when sourceId is given).
 * Walks from each root down through children so parents are always scaled before their children.
 */
function updateApertureScaling(sourceId = null) {
    const getComponent = (id) => componentManager.getComponent(id);

    if (sourceId !== null) {
        // Targeted update: scale the changed component itself, then propagate downward
        const source = getComponent(sourceId);
        if (source && source.parent !== null) {
            const rawParent = getComponent(source.parent);
            const sameInst = source.isCompositeInstance &&
                rawParent?.isCompositeInstance &&
                source.compositeInstanceId === rawParent.compositeInstanceId;
            const parent = sameInst ? rawParent : componentManager.getCompositeExitPort(rawParent);
            applyApertureScaling(source, parent);
        }
        if (source) recursivelyUpdateChildrenApertures(source, getComponent);
        return;
    }

    // Full update: process every root, then recursively update their subtrees
    componentManager.components.forEach((component) => {
        if (component.parent === null) {
            recursivelyUpdateChildrenApertures(component, getComponent);
        }
    });
}

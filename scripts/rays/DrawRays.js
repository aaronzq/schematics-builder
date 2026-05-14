import { drawTraceLines } from './TraceLines.js';
import { drawApertureRays, showApertureRays } from './ApertureRays.js';
import { applyApertureScaling, recursivelyUpdateChildrenApertures } from './ApertureScaling.js';
import { componentManager } from '../components/ComponentManager.js';

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

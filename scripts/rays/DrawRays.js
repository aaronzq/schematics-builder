import { drawTraceLines } from './TraceLines.js';
import { drawApertureRays, showApertureRays } from './ApertureRays.js';

/**
 * Main function to update all ray/line visualizations in the scene.
 * This should be called whenever the scene state changes (component add/move/rotate/scale/delete).
 * 
 * @param {string|null} sourceId - Optional ID of the component that triggered the update
 */
export function updateRays(sourceId = null) {
    // 1. Draw parent-child trace lines
    drawTraceLines();

    // 2. Draw aperture rays
    if (showApertureRays) {
        drawApertureRays();
    }
}

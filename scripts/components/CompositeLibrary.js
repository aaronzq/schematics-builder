/**
 * CompositeLibrary.js
 * -------------------
 * Defines app-shipped (built-in) composite component definitions and merges
 * them into the shared `components` registry at module-load time.
 *
 * A composite component is a named group of basic components with fixed
 * relative positions, rotations, and optical parameters.  The registry key
 * of each member must correspond to a key in ComponentLibrary.js.
 *
 * Import this module once (e.g. in App.js or index.js) for the side-effect
 * of populating `components` with the entries below.  No function call is
 * required after import.
 */

import { components } from './ComponentLibrary.js';

// ---------------------------------------------------------------------------
// Built-in composite definitions
// ---------------------------------------------------------------------------

const compositeDefinitions = {

    /**
     * Fiber-Coupled Source
     * ────────────────────
     * A collimated laser beam enters a beamsplitter cube (for optional
     * pick-off / monitoring), then is focused by a convex lens into a
     * detector (acting as a fiber-input coupler).
     *
     * Layout (all offsets relative to group centroid, SVG units, x+ = right):
     *
     *   [cube @ -80]  ──→  [lens @ 0]  ──→  [detector @ 100]
     *
     * Entry face : cube (index 0)  — where collimated light enters
     * Exit face  : detector (index 2) — fiber-input / focal point
     */
    'fiber-coupled-source': {
        key: 'fiber-coupled-source',
        label: 'Fiber Coupled Source',
        category: 'Composite',
        isComposite: true,
        isBuiltIn: true,

        members: [
            {
                // Member 0 — Beamsplitter Cube (entry optic)
                type: 'cube',
                relX: -80,
                relY: 0,
                rotation: 0,
                scale: 1,
                apertureRadius: 20,
                coneAngle: 0,
                rayShape: 'collimated',
                rayPolygonColor: '#00ccff',
                rayPolygonColor2: '#00ccff',
                gradientEnabled: false,
                internalParentIndex: null     // root member
            },
            {
                // Member 1 — Convex Lens (focusing element)
                type: 'lens',
                relX: 0,
                relY: 0,
                rotation: 0,
                scale: 1,
                apertureRadius: 20,
                coneAngle: 0,
                rayShape: 'convergent',
                rayPolygonColor: '#00ccff',
                rayPolygonColor2: '#00ccff',
                gradientEnabled: false,
                internalParentIndex: 0        // downstream of cube
            },
            {
                // Member 2 — Detector (fiber input / focal point)
                type: 'detector',
                relX: 100,
                relY: 0,
                rotation: 0,
                scale: 1,
                apertureRadius: 20,
                coneAngle: 10,
                rayShape: 'convergent',
                rayPolygonColor: '#00ccff',
                rayPolygonColor2: '#00ccff',
                gradientEnabled: false,
                internalParentIndex: 1        // downstream of lens
            }
        ],

        entryMemberIndex: 0,   // light enters at the cube
        exitMemberIndex: 2     // light exits / terminates at the detector
    },

    /**
     * Epi-Illumination Module
     * ───────────────────────
     * A collimated beam enters a beamsplitter cube; the transmitted arm
     * goes into an objective (epi path).  The reflected arm is not modelled
     * here — only the forward (epi) optical train is captured.
     *
     * Layout:
     *
     *   [cube @ -60]  ──→  [objective @ 80]
     *
     * Entry face : cube (index 0)
     * Exit face  : objective (index 1) — focused at sample
     */
    'epi-illumination-module': {
        key: 'epi-illumination-module',
        label: 'Epi-Illumination Module',
        category: 'Composite',
        isComposite: true,
        isBuiltIn: true,

        members: [
            {
                // Member 0 — Beamsplitter Cube
                type: 'cube',
                relX: -60,
                relY: 0,
                rotation: 0,
                scale: 1,
                apertureRadius: 20,
                coneAngle: 0,
                rayShape: 'collimated',
                rayPolygonColor: '#aaff00',
                rayPolygonColor2: '#aaff00',
                gradientEnabled: false,
                internalParentIndex: null
            },
            {
                // Member 1 — Objective
                type: 'objective',
                relX: 80,
                relY: 0,
                rotation: 0,
                scale: 1,
                apertureRadius: 20,
                coneAngle: 15,
                rayShape: 'convergent',
                rayPolygonColor: '#aaff00',
                rayPolygonColor2: '#aaff00',
                gradientEnabled: false,
                internalParentIndex: 0
            }
        ],

        entryMemberIndex: 0,
        exitMemberIndex: 1
    }
};

// ---------------------------------------------------------------------------
// Side-effect: merge composite definitions into the shared registry
// ---------------------------------------------------------------------------
Object.assign(components, compositeDefinitions);

// Export for unit-testing / inspection (optional).
export { compositeDefinitions };

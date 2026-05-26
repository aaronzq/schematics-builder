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
     * 4F Relay — Inherit Color
     * ────────────────────────
     * Two symmetric lenses with a point (focal plane) in the middle.
     * All members have rayColorInheritFromParent = true, so changing
     * the entry lens color propagates through the whole relay.
     *
     * Layout (offsets relative to group centroid, SVG units, x+ = right):
     *
     *   [lens @ -100]  ──→  [point @ 0]  ──→  [lens @ +100]
     *
     * Entry : lens (index 0)
     * Exit  : lens (index 2)
     */
    '4f-relay-inherit': {
        key: '4f-relay-inherit',
        label: '4F Relay (Inherit Color)',
        category: 'Composite',
        isComposite: true,
        isBuiltIn: true,

        members: [
            {
                // Member 0 — Input lens (entry)
                type: 'lens',
                relX: -100,
                relY: 0,
                rotation: 0,
                scale: 1,
                apertureRadius: 20,
                coneAngle: 0,
                rayShape: 'collimated',
                rayPolygonColor: 'hsl(200, 70%, 50%)',
                rayPolygonOpacity: 0.2,
                rayColorInheritFromParent: true,
                internalParentIndex: null
            },
            {
                // Member 1 — Point (back focal / Fourier plane)
                type: 'point',
                relX: 0,
                relY: 0,
                rotation: 0,
                scale: 1,
                apertureRadius: 0,
                coneAngle: 10,
                rayShape: 'convergent',
                rayPolygonColor: 'hsl(200, 70%, 50%)',
                rayPolygonOpacity: 0.2,
                rayColorInheritFromParent: true,
                internalParentIndex: 0
            },
            {
                // Member 2 — Output lens (exit)
                type: 'lens',
                relX: 100,
                relY: 0,
                rotation: 0,
                scale: 1,
                apertureRadius: 20,
                coneAngle: 0,
                rayShape: 'divergent',
                rayPolygonColor: 'hsl(200, 70%, 50%)',
                rayPolygonOpacity: 0.2,
                rayColorInheritFromParent: true,
                internalParentIndex: 1
            }
        ],

        entryMemberIndex: 0,
        exitMemberIndex: 2
    },

    /**
     * 4F Relay — Custom Colors
     * ────────────────────────
     * Same optical layout, but each ray segment uses a distinct color
     * and rayColorInheritFromParent = false on all members.
     * Useful for testing per-segment color independence.
     *
     * Layout:
     *
     *   [lens @ -100]  ──→  [point @ 0]  ──→  [lens @ +100]
     *   (blue-cyan)          (amber)           (magenta)
     */
    '4f-relay-colors': {
        key: '4f-relay-colors',
        label: '4F Relay (Custom Colors)',
        category: 'Composite',
        isComposite: true,
        isBuiltIn: true,

        members: [
            {
                // Member 0 — Input lens (entry) — blue-cyan
                type: 'lens',
                relX: -100,
                relY: 0,
                rotation: 0,
                scale: 1,
                apertureRadius: 20,
                coneAngle: 0,
                rayShape: 'manual',
                rayPolygonColor: 'hsl(200, 70%, 50%)',
                rayPolygonOpacity: 0.2,
                rayColorInheritFromParent: false,
                internalParentIndex: null
            },
            {
                // Member 1 — Point (Fourier plane) — amber
                type: 'point',
                relX: 0,
                relY: 0,
                rotation: 0,
                scale: 1,
                apertureRadius: 0,
                coneAngle: 10,
                rayShape: 'convergent',
                rayPolygonColor: 'hsl(40, 70%, 50%)',
                rayPolygonOpacity: 0.2,
                rayColorInheritFromParent: false,
                internalParentIndex: 0
            },
            {
                // Member 2 — Output lens (exit) — magenta
                type: 'lens',
                relX: 100,
                relY: 0,
                rotation: 0,
                scale: 1,
                apertureRadius: 20,
                coneAngle: 0,
                rayShape: 'divergent',
                rayPolygonColor: 'hsl(320, 70%, 50%)',
                rayPolygonOpacity: 0.2,
                rayColorInheritFromParent: false,
                internalParentIndex: 1
            }
        ],

        entryMemberIndex: 0,
        exitMemberIndex: 2
    }
};

// ---------------------------------------------------------------------------
// Side-effect: merge composite definitions into the shared registry
// ---------------------------------------------------------------------------
Object.assign(components, compositeDefinitions);

// Export for unit-testing / inspection (optional).
export { compositeDefinitions };

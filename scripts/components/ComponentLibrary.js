import { DEFAULT_APERTURE_RADIUS, DEFAULT_CONE_ANGLE } from '../config.js';

const SVG_NS = 'http://www.w3.org/2000/svg';


// =============================================================================
// HOW TO ADD A NEW COMPONENT  (copy the TEMPLATE below, fill in the blanks)
// =============================================================================
//
// STEP 1 — Add an entry to `components` in THIS file.
//          Key  : kebab-case string, e.g. 'my-component'
//          Value: object with the fields shown in the TEMPLATE.
//          Set `category` to place it in an existing sidebar section, or
//          use a new string to create a new section automatically.
//
// That's it — no other files need to change.
// The sidebar menu is generated dynamically by ComponentMenu.js → buildComponentMenu().
// ButtonHandlers.js → setupComponentButtons() auto-wires click handlers.
//
// ---- TEMPLATE ---------------------------------------------------------------
//
// 'my-component': {
//     // Sidebar category heading. Creates the section automatically if new.
//     category: 'My Category',
//
//     // Button label shown in the sidebar.
//     label: 'My Component',
//
//     // Tight bounding box of the SVG artwork in local coordinates.
//     // Used for hit-testing and the selection highlight box.
//     localBounds: { minX: -W/2, maxX: W/2, minY: -H/2, maxY: H/2 },
//
//     // The optical interaction point (where ray trace lines meet).
//     // Usually { x:0, y:0 } for symmetric elements; offset for asymmetric ones.
//     centerPoint: { x: 0, y: 0 },
//
//     // The aperture indicator center (often same as centerPoint).
//     apertureCenter: { x: 0, y: 0 },
//
//     // Unit vector pointing "up" in local space (aperture points are placed
//     // along this axis). Almost always { x:0, y:-1 }.
//     upVector: { x: 0, y: -1 },
//
//     // Unit vector pointing "forward" (arrow handle direction).
//     // Almost always { x:1, y:0 }.
//     forwardVector: { x: 1, y: 0 },
//
//     // Half-height of the clear aperture in local units.
//     apertureRadius: DEFAULT_APERTURE_RADIUS,
//
//     // Half-angle of the illumination cone in degrees.
//     // 0 = collimated, >0 = divergent/convergent.
//     coneAngle: DEFAULT_CONE_ANGLE,
//
//     // Ray geometry coming *out* of this component.
//     // One of: 'collimated' | 'divergent' | 'convergent'
//     rayShape: 'collimated',
//
//     // SVG drawing function — return a <g> element built with document.createElementNS.
//     draw: (ns) => {
//         const g = document.createElementNS(ns, 'g');
//         // ... append child elements ...
//         return g;
//     }
// },
//
// =============================================================================


export const components = {

    // ── Lens ─────────────────────────────────────────────────────────────────

    objective: {
        category: 'Lens',
        label: 'Objective',
        localBounds: { minX: -64.5, maxX: 64.5, minY: -30, maxY: 30 },
        centerPoint: { x: 0, y: 0 },
        forwardVector: { x: 1, y: 0 },
        apertureCenter: {x: 0, y: 0},
        upVector: { x: 0, y: -1 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            // Conical front (tapered head)
            const cone = document.createElementNS(ns, "path");
            cone.setAttribute("d", "M -46.5 -30 L -48.5 -30 L -64.5 -15 L -64.5 15 L -48.5 30 L -46.5 30 Z");
            cone.setAttribute("fill", "#d9d9d9");
            cone.setAttribute("stroke", "black");
            cone.setAttribute("stroke-width", "1.5");
            g.appendChild(cone);

            // Front barrel (dark gray)
            const frontBarrel = document.createElementNS(ns, "rect");
            frontBarrel.setAttribute("x", "-48.5");
            frontBarrel.setAttribute("y", -30);
            frontBarrel.setAttribute("width", 10);
            frontBarrel.setAttribute("height", 60);
            frontBarrel.setAttribute("fill", "#5a5a5a");
            frontBarrel.setAttribute("stroke", "black");
            frontBarrel.setAttribute("stroke-width", "1.5");
            g.appendChild(frontBarrel);

            // Green ring
            const greenRing = document.createElementNS(ns, "rect");
            greenRing.setAttribute("x", "-38.5");
            greenRing.setAttribute("y", -30);
            greenRing.setAttribute("width", 5);
            greenRing.setAttribute("height", 60);
            greenRing.setAttribute("fill", "#d9d9d9");
            greenRing.setAttribute("stroke", "black");
            greenRing.setAttribute("stroke-width", "1");
            g.appendChild(greenRing);

            // Rear barrel
            const rearBarrel = document.createElementNS(ns, "rect");
            rearBarrel.setAttribute("x", "-33.5");
            rearBarrel.setAttribute("y", -30);
            rearBarrel.setAttribute("width", 90);
            rearBarrel.setAttribute("height", 60);
            rearBarrel.setAttribute("fill", "#888888");
            rearBarrel.setAttribute("stroke", "black");
            rearBarrel.setAttribute("stroke-width", "1.5");
            g.appendChild(rearBarrel);

            // End cap
            const endCap = document.createElementNS(ns, "rect");
            endCap.setAttribute("x", "56.5");
            endCap.setAttribute("y", -21);
            endCap.setAttribute("width", 8);
            endCap.setAttribute("height", 42);
            endCap.setAttribute("fill", "#686868");
            endCap.setAttribute("fill-opacity", "1");
            endCap.setAttribute("stroke", "black");
            endCap.setAttribute("stroke-width", "1.5");
            g.appendChild(endCap);

            return g;
        }
    },

    lens: {
        category: 'Lens',
        label: 'Convex Lens',
        localBounds: { minX: -6, maxX: 6, minY: -30, maxY: 30 },
        centerPoint: { x: 0, y: 0 },
        forwardVector: { x: 1, y: 0 },
        apertureCenter: {x: 0, y: 0},
        upVector: { x: 0, y: -1 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, "g");
            
            // Double convex lens shape
            const lens = document.createElementNS(ns, "path");
            lens.setAttribute("d", "M 0 -30 C 6 -27 6 27 0 30 C -6 27 -6 -27 0 -30");
            lens.setAttribute("stroke", "black");
            lens.setAttribute("stroke-width", "1.5");
            lens.setAttribute("fill", "#145ec0");
            lens.setAttribute("fill-opacity", "0.3");
            g.appendChild(lens);
            return g;
        }
    },

    'lenslet-array': {
        category: 'Lens',
        label: 'Lenslet Array',
        // Lenslet array: 5 small double-convex lenslets stacked vertically.
        // Overall height ~60 units, width ~12 units.
        localBounds: { minX: -7.5, maxX: 7.5, minY: -30, maxY: 30 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, 'g');

            // 5 small double-convex lenslets, evenly spaced over 60-unit height
            const count = 5;
            const spacing = 12;           // px between lenslet centres
            const lensHalf = 6;           // half-height of each lenslet
            const curve   = 3.6;          // horizontal bulge of the Bézier curves

            for (let i = 0; i < count; i++) {
                const cy = (i - (count - 1) / 2) * spacing;  // centre y of this lenslet
                const t  = cy - lensHalf;
                const b  = cy + lensHalf;

                const lens = document.createElementNS(ns, 'path');
                // Double-convex outline using two cubic Bézier curves
                lens.setAttribute('d',
                    `M 0 ${t} C ${curve} ${t + 1} ${curve} ${b - 1} 0 ${b}` +
                    ` C ${-curve} ${b - 1} ${-curve} ${t + 1} 0 ${t}`);
                lens.setAttribute('stroke', 'black');
                lens.setAttribute('stroke-width', '1');
                lens.setAttribute('fill', '#145ec0');
                lens.setAttribute('fill-opacity', '0.3');
                g.appendChild(lens);
            }

            return g;
        }
    },

    // ── Mirrors ───────────────────────────────────────────────────────────────

    mirror: {
        category: 'Mirrors',
        label: 'Flat Mirror',
        localBounds: { minX: -3, maxX: 3, minY: -30, maxY: 30 },
        centerPoint: { x: -3, y: 0 },
        apertureCenter: {x: -3, y: 0},
        forwardVector: { x: 1, y: 0 },
        upVector: { x: 0, y: -1 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, "g");
            
            // Mirror line
            const mirror = document.createElementNS(ns, "path");
            mirror.setAttribute("d", "M -3 -30 L 3 -30 L 3 30 L -3 30 Z");
            mirror.setAttribute("stroke", "black");
            mirror.setAttribute("stroke-width", "1.5");
            mirror.setAttribute("fill", "#8caed6");
            mirror.setAttribute("fill-opacity", "1");
            g.appendChild(mirror);

            const backsurface = document.createElementNS(ns, "line");
            backsurface.setAttribute("x1", "-3");
            backsurface.setAttribute("y1", "-30.75");
            backsurface.setAttribute("x2", "-3");
            backsurface.setAttribute("y2", "30.75");
            backsurface.setAttribute("stroke", "black");
            backsurface.setAttribute("stroke-width", "2.5");
            g.appendChild(backsurface);

            return g;
        }
    },

    // ── Prisms ────────────────────────────────────────────────────────────────

    'right-angle-prism': {
        category: 'Prisms',
        label: 'Right-Angle Prism',
        // Right-angle prism: triangle with legs of 60 units, apex at left, base on right.
        // Artwork spans x: [-30, 0], y: [-30, 30] — center of the hypotenuse face at origin.
        localBounds: { minX: -30, maxX: 0, minY: -30, maxY: 30 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, 'g');

            const prism = document.createElementNS(ns, 'path');
            // Hypotenuse on x=0 (top-right to bottom-right), apex at (-30, 0)
            prism.setAttribute('d', 'M 0 -30 L 0 30 L -30 0 Z');
            prism.setAttribute('fill', '#145ec0');
            prism.setAttribute('fill-opacity', '0.3');
            prism.setAttribute('stroke', 'black');
            prism.setAttribute('stroke-width', '1.5');
            g.appendChild(prism);

            return g;
        }
    },

    // ── Detectors ─────────────────────────────────────────────────────────────

    detector: {
        category: 'Detectors',
        label: 'Detector',
        // Grey enclosure 80×60, centred at origin. Adapter ring extends 5 units to the left.
        // Aperture (input face) is at x = -40 (left wall of enclosure).
        localBounds: { minX: -45, maxX: 40, minY: -30, maxY: 30 },
        centerPoint:    { x: -40, y: 0 },
        apertureCenter: { x: -40, y: 0 },
        upVector:     { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            const totalWidth = 80;
            const totalHeight = 60;
            const border = 1.5;

            const xLeft = -totalWidth / 2;
            const yTop = -totalHeight / 2;
            const xRight = xLeft + totalWidth;
            const yBottom = yTop + totalHeight;

            // Outer enclosure
            const framePath = document.createElementNS(ns, "path");
            framePath.setAttribute("d", `M ${xLeft} ${yTop} H ${xRight} V ${yBottom} H ${xLeft} Z`);
            framePath.setAttribute("fill", "#cccccc");
            framePath.setAttribute("stroke", "black");
            framePath.setAttribute("stroke-width", border);
            g.appendChild(framePath);

            // Adapter ring (input side)
            const adapter = document.createElementNS(ns, "rect");
            adapter.setAttribute("x", xLeft - 5);
            adapter.setAttribute("y", yTop + totalHeight / 6);
            adapter.setAttribute("width", 5);
            adapter.setAttribute("height", totalHeight * 2 / 3);
            adapter.setAttribute("fill", "#2e2e2e");
            adapter.setAttribute("stroke", "black");
            adapter.setAttribute("stroke-width", border);
            g.appendChild(adapter);

            return g;
        }
    },

    // ── Misc ──────────────────────────────────────────────────────────────────

    plane: {
        category: 'Misc',
        label: 'Plane',
        localBounds: { minX: -3, maxX: 3, minY: -20, maxY: 20 },
        centerPoint: { x: 0, y: 0 },
        forwardVector: { x: 1, y: 0 },
        apertureCenter: {x: 0, y: 0},
        upVector: { x: 0, y: -1 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',
        
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");
            
            // Solid vertical line
            const plane = document.createElementNS(ns, "line");
            plane.setAttribute("x1", "0");
            plane.setAttribute("y1", "-20");
            plane.setAttribute("x2", "0");
            plane.setAttribute("y2", "20");
            plane.setAttribute("stroke", "black");
            plane.setAttribute("stroke-width", "1.5");
            g.appendChild(plane);

            return g;
        }
    },

}


/**
 * Get all available component types
 * @returns {Array<string>} List of component type names
 */
export function getComponentList() {
  return Object.keys(components);
}

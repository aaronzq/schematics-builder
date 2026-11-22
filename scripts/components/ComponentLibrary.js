import { DEFAULT_APERTURE_RADIUS, DEFAULT_CONE_ANGLE } from '../config.js';
import { couplerPorts } from './FiberPorts.js';

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
        isComposite: false,
        isBuiltIn: true,
        localBounds: { minX: -69, maxX: 69, minY: -33, maxY: 33 },
        centerPoint: { x: 0, y: 0 },
        forwardVector: { x: 1, y: 0 },
        apertureCenter: {x: 0, y: 0},
        upVector: { x: 0, y: -1 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            // Tip
            const tip = document.createElementNS(ns, "path");
            tip.setAttribute("d", "M -69 -10 L -69 10 L -65 14 L -65 -14 Z ");
            tip.setAttribute("fill", "#e6e6e6");
            tip.setAttribute("stroke", "black");
            tip.setAttribute("stroke-width", "1.5");
            g.appendChild(tip);
            

            const cone = document.createElementNS(ns, "path");
            cone.setAttribute("d", "M -65 -14 L -65 14 L -53 26 L -53 -26 Z");
            cone.setAttribute("fill", "#e6e6e6");
            cone.setAttribute("stroke", "black");
            cone.setAttribute("stroke-width", "1.5");
            g.appendChild(cone);

            
            const barrel1 = document.createElementNS(ns, "rect");
            barrel1.setAttribute("x", "-53");
            barrel1.setAttribute("y", "-27");
            barrel1.setAttribute("width", 10);
            barrel1.setAttribute("height", 54);
            barrel1.setAttribute("fill", "#e6e6e6");
            barrel1.setAttribute("stroke", "black");
            barrel1.setAttribute("stroke-width", "1.5");
            g.appendChild(barrel1);

            const barrel2 = document.createElementNS(ns, "rect");
            barrel2.setAttribute("x", "-43");
            barrel2.setAttribute("y", "-30");
            barrel2.setAttribute("width", 10);
            barrel2.setAttribute("height", 60);
            barrel2.setAttribute("fill", "#e6e6e6");
            barrel2.setAttribute("stroke", "black");
            barrel2.setAttribute("stroke-width", "1.5");
            g.appendChild(barrel2);

            // Ring
            const Ring = document.createElementNS(ns, "rect");
            Ring.setAttribute("x", "-33");
            Ring.setAttribute("y", -30);
            Ring.setAttribute("width", 3);
            Ring.setAttribute("height", 60);
            Ring.setAttribute("fill", "#ffffff");
            Ring.setAttribute("stroke", "black");
            Ring.setAttribute("stroke-width", "1.5");
            g.appendChild(Ring);

            // Rear barrel
            const rearBarrel = document.createElementNS(ns, "rect");
            rearBarrel.setAttribute("x", "-30");
            rearBarrel.setAttribute("y", -30);
            rearBarrel.setAttribute("width", 90);
            rearBarrel.setAttribute("height", 60);
            rearBarrel.setAttribute("fill", "#e6e6e6");
            rearBarrel.setAttribute("stroke", "black");
            rearBarrel.setAttribute("stroke-width", "1.5");
            g.appendChild(rearBarrel);

            // End cap
            const endCap = document.createElementNS(ns, "path");
            endCap.setAttribute("d", "M 60 -30 L 63 -33 L 69 -33 L 69 33 L 63 33 L 60 30 Z");
            endCap.setAttribute("fill", "#e6e6e6");
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
        isComposite: false,
        isBuiltIn: true,
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
        isComposite: false,
        isBuiltIn: true,
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
        isComposite: false,
        isBuiltIn: true,
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

    cube: {
        category: 'Mirrors',
        label: 'Beamsplitter Cube',
        isComposite: false,
        isBuiltIn: true,
        localBounds: { minX: -30, maxX: 30, minY: -30, maxY: 30 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0.7071067811865476, y: -0.7071067811865476 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            const cube = document.createElementNS(ns, "path");
            cube.setAttribute("d", "M -30 -30 L -30 30 L 30 30 L 30 -30 Z");
            cube.setAttribute("stroke", "black");
            cube.setAttribute("stroke-width", "1.5");
            cube.setAttribute("fill", "#145ec0");
            cube.setAttribute("fill-opacity", "0.4");
            g.appendChild(cube);

            const surface = document.createElementNS(ns, "line");
            surface.setAttribute("x1", "-30");
            surface.setAttribute("y1", "30");
            surface.setAttribute("x2", "30");
            surface.setAttribute("y2", "-30");
            surface.setAttribute("stroke", "black");
            surface.setAttribute("stroke-width", "2.5");
            g.appendChild(surface);

            return g;
        }
    },

    // ── Prisms ────────────────────────────────────────────────────────────────

    // Reflective collimator is grouped into the existing Mirrors sidebar category.
    'reflective-collimator': {
        category: 'Mirrors',
        label: 'Reflective Collimator',
        isComposite: false,
        isBuiltIn: true,
        localBounds: { minX: -29, maxX: 20, minY: -19, maxY: 19 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, 'g');

            // Bare parabolic mirror surface. The quadratic midpoint is (0,0),
            // matching the component's optical center and ray junction.
            const mirror = document.createElementNS(ns, 'path');
            // Trace of the supplied cutaway: shallow upper-left end, steeper
            // lower-right end; tangent at the illuminated center is about 37 degrees.
            mirror.setAttribute('d', 'M -26.8 -17 Q 4.2 -0.1 18.4 17.2');
            mirror.setAttribute('fill', 'none');
            mirror.setAttribute('stroke', 'black');
            mirror.setAttribute('stroke-width', '3');
            mirror.setAttribute('stroke-linecap', 'round');
            g.appendChild(mirror);

            // Qualitative focus-side indicator, transformed with the artwork.
            // Its tip denotes direction only, not a calculated focal position.
            const focusArrow = document.createElementNS(ns, 'path');
            focusArrow.setAttribute('d', 'M 0 6 V 16 M -3 12 L 0 16 L 3 12');
            focusArrow.setAttribute('fill', 'none');
            focusArrow.setAttribute('stroke', '#d32f2f');
            focusArrow.setAttribute('stroke-width', '1.5');
            focusArrow.setAttribute('stroke-linecap', 'round');
            focusArrow.setAttribute('stroke-linejoin', 'round');
            focusArrow.setAttribute('pointer-events', 'none');
            const focusTitle = document.createElementNS(ns, 'title');
            focusTitle.textContent = 'Focus direction (schematic; not focal distance)';
            focusArrow.appendChild(focusTitle);
            g.appendChild(focusArrow);

            return g;
        }
    },

    'right-angle-prism': {
        category: 'Prisms',
        label: 'Right-Angle Prism',
        isComposite: false,
        isBuiltIn: true,
        // Right-angle prism: triangle with legs of 60 units, apex at left, base on right.
        // Artwork spans x: [-30, 0], y: [-30, 30] — center of the hypotenuse face at origin.
        // Oriented 45° toward the upper-right by default.
        localBounds: { minX: -30, maxX: 30, minY: -30, maxY: 30 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        // upVector and forwardVector rotated -45° so the prism points to the upper-right.
        upVector: { x: 0.7071067811865476, y: -0.7071067811865476 },
        forwardVector: { x:  1, y: 0 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, 'g');

            const prism = document.createElementNS(ns, 'path');
            // Hypotenuse on x=0 (top-right to bottom-right), apex at (-30, 0)
            prism.setAttribute('d', 'M -30 -30 L -30 30 L 30 -30 Z');
            prism.setAttribute('fill', '#145ec0');
            prism.setAttribute('fill-opacity', '0.3');
            prism.setAttribute('stroke', 'black');
            prism.setAttribute('stroke-width', '1.5');
            g.appendChild(prism);

            return g;
        }
    },

    // ── Diffractive Optics ───────────────────────────────────────────────

    grating: {
        category: 'Diffractive Optics',
        label: 'Transmission Grating',
        isComposite: false,
        isBuiltIn: true,
        localBounds: { minX: -5, maxX: 5, minY: -30, maxY: 30 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, 'g');

            // Transparent substrate.
            const substrate = document.createElementNS(ns, 'rect');
            substrate.setAttribute('x', '-5');
            substrate.setAttribute('y', '-30');
            substrate.setAttribute('width', '10');
            substrate.setAttribute('height', '60');
            substrate.setAttribute('rx', '1');
            substrate.setAttribute('fill', '#7ec8e3');
            substrate.setAttribute('fill-opacity', '0.35');
            substrate.setAttribute('stroke', 'black');
            substrate.setAttribute('stroke-width', '1.5');
            g.appendChild(substrate);

            // Repeated diagonal marks represent the grating grooves.
            for (let y = -25; y <= 25; y += 5) {
                const groove = document.createElementNS(ns, 'line');
                groove.setAttribute('x1', '-5');
                groove.setAttribute('y1', String(y - 2));
                groove.setAttribute('x2', '5');
                groove.setAttribute('y2', String(y + 2));
                groove.setAttribute('stroke', '#245b78');
                groove.setAttribute('stroke-width', '1');
                g.appendChild(groove);
            }

            return g;
        }
    },

    // ── Fiber Optics ──────────────────────────────────────────────────────

    'supercontinuum-source': {
        category: 'Light Sources',
        label: 'Supercontinuum Source (Fiber Output)',
        isComposite: false,
        isBuiltIn: true,
        localBounds: { minX: -152, maxX: 2, minY: -52, maxY: 52 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: 2,
        coneAngle: 0,
        rayShape: 'collimated',
        draw: (ns) => {
            const g = document.createElementNS(ns, 'g');
            const add = (tag, attrs, text) => {
                const el = document.createElementNS(ns, tag);
                Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
                if (text) el.textContent = text;
                g.appendChild(el);
                return el;
            };
            add('rect', { x: -150, y: -50, width: 120, height: 100,
                fill: 'white', stroke: 'black', 'stroke-width': 2 });
            // Qualitative broadband spectrum: intensity versus wavelength.
            // Unique IDs keep multiple sources and sidebar previews independent.
            const gradientId = `source-spectrum-${crypto.randomUUID()}`;
            const defs = add('defs', {});
            const gradient = document.createElementNS(ns, 'linearGradient');
            gradient.setAttribute('id', gradientId);
            gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
            gradient.setAttribute('x1', '-132');
            gradient.setAttribute('x2', '-47');
            gradient.setAttribute('y1', '0');
            gradient.setAttribute('y2', '0');
            ['#7b2cbf', '#3546d3', '#008cdd', '#16a34a', '#e6bd00', '#f58220', '#dc2626'].forEach((color, i) => {
                const stop = document.createElementNS(ns, 'stop');
                stop.setAttribute('offset', `${i / 6 * 100}%`);
                stop.setAttribute('stop-color', color);
                gradient.appendChild(stop);
            });
            defs.appendChild(gradient);
            add('path', { d: 'M -135 -39 V -8 H -45', fill: 'none',
                stroke: '#555', 'stroke-width': 1 });
            add('path', { d: 'M -132 -10 C -128 -30 -122 -33 -114 -27 S -102 -18 -95 -31 S -85 -42 -78 -33 S -68 -44 -59 -30 S -52 -16 -47 -11',
                fill: 'none', stroke: `url(#${gradientId})`, 'stroke-width': 2,
                'stroke-linecap': 'round' });
            add('text', { x: -90, y: 16, 'text-anchor': 'middle',
                'font-family': 'Arial, sans-serif', 'font-size': 12,
                'font-weight': 'bold', fill: 'black' }, 'Supercontinuum');
            add('text', { x: -90, y: 33, 'text-anchor': 'middle',
                'font-family': 'Arial, sans-serif', 'font-size': 12,
                'font-weight': 'bold', fill: 'black' }, 'source');
            add('path', { d: 'M -30 0 H -24 C -18 0 -18 10 -12 10 S -6 0 0 0',
                fill: 'none', stroke: 'black', 'stroke-width': 2 });
            add('rect', { x: -34, y: -4, width: 7, height: 8,
                fill: '#ddd', stroke: 'black', 'stroke-width': 1 });
            return g;
        }
    },

    'draw-fiber': {
        category: 'Fiber Optics', label: 'Draw Fiber (drag; Esc to cancel)',
        isComposite: false, isBuiltIn: true,
        localBounds: { minX: -30, maxX: 30, minY: -12, maxY: 12 },
        centerPoint: { x: 0, y: 0 }, apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 }, forwardVector: { x: 1, y: 0 },
        apertureRadius: 0, rayShape: 'manual',
        draw: (ns, instance) => {
            const g = document.createElementNS(ns, 'g');
            const path = document.createElementNS(ns, 'path');
            const points = instance?.fiberPoints;
            path.setAttribute('d', points?.length
                ? points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
                : 'M -30 0 C -10 -28 10 28 30 0');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', 'black');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            g.appendChild(path);
            return g;
        }
    },

    'fiber-coupler': {
        category: 'Fiber Optics',
        label: '2×2 Fiber Coupler',
        isComposite: false,
        isBuiltIn: true,
        localBounds: { minX: -64, maxX: 64, minY: -20, maxY: 20 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: 4,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',
        couplerSplitRatio: 50,
        couplerArmLength: 40,

        draw: (ns, instance) => {
            const g = document.createElementNS(ns, 'g');
            const ratio = instance?.couplerSplitRatio ?? 50;
            const armLength = instance?.couplerArmLength ?? 40;
            const halfBodyWidth = 20;

            couplerPorts(instance).forEach(port => {
                const side = port.x < 0 ? -1 : 1;
                const y = Math.sign(port.y) * 6;
                const fiber = document.createElementNS(ns, 'path');
                fiber.setAttribute('d', `M ${side * 20} ${y} C ${side * (20 + armLength / 2)} ${y} ${side * (20 + armLength / 2)} ${port.y} ${port.x} ${port.y}`);
                fiber.setAttribute('fill', 'none');
                fiber.setAttribute('stroke', 'black');
                fiber.setAttribute('stroke-width', '2');
                g.appendChild(fiber);
                const dot = document.createElementNS(ns, 'circle');
                dot.setAttribute('cx', port.x);
                dot.setAttribute('cy', port.y);
                dot.setAttribute('r', '3');
                dot.setAttribute('fill', instance?.couplerActivePort === port.id ? '#2196f3' : 'white');
                dot.setAttribute('stroke', 'black');
                dot.setAttribute('data-fiber-port', port.id);
                const title = document.createElementNS(ns, 'title');
                title.textContent = port.label;
                dot.appendChild(title);
                g.appendChild(dot);
            });

            const body = document.createElementNS(ns, 'rect');
            body.setAttribute('x', String(-halfBodyWidth));
            body.setAttribute('y', '-12');
            body.setAttribute('width', String(halfBodyWidth * 2));
            body.setAttribute('height', '24');
            body.setAttribute('fill', 'white');
            body.setAttribute('stroke', 'black');
            body.setAttribute('stroke-width', '2');
            g.appendChild(body);

            const label = document.createElementNS(ns, 'text');
            label.setAttribute('x', '0');
            label.setAttribute('y', '4');
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-family', 'Arial, sans-serif');
            label.setAttribute('font-size', '9');
            label.setAttribute('font-weight', '600');
            label.setAttribute('fill', 'black');
            label.setAttribute('pointer-events', 'none');
            label.textContent = `${Math.round(ratio)}/${Math.round(100 - ratio)}`;
            g.appendChild(label);

            return g;
        }
    },

    'polarization-controller': {
        category: 'Fiber Optics',
        label: 'Polarization Controller',
        isComposite: false,
        isBuiltIn: true,
        localBounds: { minX: -48, maxX: 48, minY: -29, maxY: 2 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: 4,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, 'g');

            const fiber = document.createElementNS(ns, 'line');
            fiber.setAttribute('x1', '-48');
            fiber.setAttribute('y1', '0');
            fiber.setAttribute('x2', '48');
            fiber.setAttribute('y2', '0');
            fiber.setAttribute('stroke', 'black');
            fiber.setAttribute('stroke-width', '3');
            fiber.setAttribute('stroke-linecap', 'round');
            g.appendChild(fiber);

            // Three overlapping fiber loops, matching a paddle-style controller symbol.
            [-16, 0, 16].forEach(cx => {
                const loop = document.createElementNS(ns, 'circle');
                loop.setAttribute('cx', String(cx));
                loop.setAttribute('cy', '-14');
                loop.setAttribute('r', '14');
                loop.setAttribute('fill', 'none');
                loop.setAttribute('stroke', 'black');
                loop.setAttribute('stroke-width', '3');
                g.appendChild(loop);
            });

            return g;
        }
    },

    fiber: {
        category: 'Fiber Optics',
        label: 'Fiber',
        isComposite: false,
        isBuiltIn: true,
        localBounds: { minX: -45, maxX: 45, minY: -25, maxY: 2 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: 4,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, 'g');

            const fiberLine = document.createElementNS(ns, 'line');
            fiberLine.setAttribute('x1', '-45');
            fiberLine.setAttribute('y1', '0');
            fiberLine.setAttribute('x2', '45');
            fiberLine.setAttribute('y2', '0');
            fiberLine.setAttribute('stroke', 'black');
            fiberLine.setAttribute('stroke-width', '3');
            fiberLine.setAttribute('stroke-linecap', 'round');
            g.appendChild(fiberLine);

            // Two overlapping loops identify a coiled fiber section.
            [-9, 9].forEach(cx => {
                const loop = document.createElementNS(ns, 'circle');
                loop.setAttribute('cx', String(cx));
                loop.setAttribute('cy', '-12');
                loop.setAttribute('r', '12');
                loop.setAttribute('fill', 'none');
                loop.setAttribute('stroke', 'black');
                loop.setAttribute('stroke-width', '3');
                g.appendChild(loop);
            });

            return g;
        }
    },

    // ── Detectors ────────────────────────────────────────────────────────────

    detector: {
        category: 'Detectors',
        label: 'Detector',
        isComposite: false,
        isBuiltIn: true,
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

    // ── Optoelectronics ───────────────────────────────────────────────────────

    slm: {
        category: 'Optoelectronics',
        label: 'SLM',
        isComposite: false,
        isBuiltIn: true,
        localBounds: { minX: -5, maxX: 5, minY: -40, maxY: 40 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            const baseplate = document.createElementNS(ns, "rect");
            baseplate.setAttribute("x", "0");
            baseplate.setAttribute("y", "-40");
            baseplate.setAttribute("width", "5");
            baseplate.setAttribute("height", "80");
            baseplate.setAttribute("stroke", "black");
            baseplate.setAttribute("stroke-width", "1.5");
            baseplate.setAttribute("fill", "#868686");
            g.appendChild(baseplate);

            const lc = document.createElementNS(ns, "rect");
            lc.setAttribute("x", "-5");
            lc.setAttribute("y", "-30");
            lc.setAttribute("width", "5");
            lc.setAttribute("height", "60");
            lc.setAttribute("fill", "#145ec0");
            lc.setAttribute("fill-opacity", "0.5");
            g.appendChild(lc);

            return g;
        }
    },

    dmd: {
        category: 'Optoelectronics',
        label: 'DMD',
        isComposite: false,
        isBuiltIn: true,
        localBounds: { minX: -5, maxX: 5, minY: -40, maxY: 40 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            const baseplate = document.createElementNS(ns, "rect");
            baseplate.setAttribute("x", "0");
            baseplate.setAttribute("y", "-40");
            baseplate.setAttribute("width", "5");
            baseplate.setAttribute("height", "80");
            baseplate.setAttribute("stroke", "black");
            baseplate.setAttribute("stroke-width", "1.5");
            baseplate.setAttribute("fill", "#868686");
            g.appendChild(baseplate);

            const mirror1 = document.createElementNS(ns, "rect");
            mirror1.setAttribute("x", "-5");
            mirror1.setAttribute("y", "-30");
            mirror1.setAttribute("width", "5");
            mirror1.setAttribute("height", "18");
            mirror1.setAttribute("fill", "#000000");
            g.appendChild(mirror1);

            const mirror2 = document.createElementNS(ns, "rect");
            mirror2.setAttribute("x", "-5");
            mirror2.setAttribute("y", "-5");
            mirror2.setAttribute("width", "5");
            mirror2.setAttribute("height", "10");
            mirror2.setAttribute("fill", "#000000");
            g.appendChild(mirror2);

            const mirror3 = document.createElementNS(ns, "rect");
            mirror3.setAttribute("x", "-5");
            mirror3.setAttribute("y", "10");
            mirror3.setAttribute("width", "5");
            mirror3.setAttribute("height", "20");
            mirror3.setAttribute("fill", "#000000");
            g.appendChild(mirror3);

            return g;
        }
    },

    'polygon-scanner': {
        category: 'Optoelectronics',
        label: 'Polygon Scanner',
        isComposite: false,
        isBuiltIn: true,
        // Hexagonal body centered at hub (0,0): x: [-73, 73], y: [-83, 83].
        localBounds: { minX: -73, maxX: 73, minY: -83, maxY: 83 },
        centerPoint: { x: -73, y: 0 },
        apertureCenter: { x: -73, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'collimated',

        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            const baseplate = document.createElementNS(ns, "path");
            baseplate.setAttribute("d", "M -73 -42 L -73 42 L 0 83 L 73 42 L 73 -42 L 0 -83 Z");
            baseplate.setAttribute("stroke", "black");
            baseplate.setAttribute("stroke-width", "1.5");
            baseplate.setAttribute("fill", "#a8a8a8");
            g.appendChild(baseplate);

            // Rotation indicator — 240-degree arc around hub (0, 0)
            const centerX = 0, centerY = 0, radius = 25;
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (240 * Math.PI / 180);
            const startX = centerX + radius * Math.cos(startAngle);
            const startY = centerY + radius * Math.sin(startAngle);
            const endX   = centerX + radius * Math.cos(endAngle);
            const endY   = centerY + radius * Math.sin(endAngle);

            const rotationArc = document.createElementNS(ns, "path");
            rotationArc.setAttribute("d", `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`);
            rotationArc.setAttribute("stroke", "black");
            rotationArc.setAttribute("stroke-width", "1.5");
            rotationArc.setAttribute("fill", "none");
            g.appendChild(rotationArc);

            // Arrowhead at arc end
            const arrowSize = 6;
            const arrowAngle = endAngle + Math.PI / 6 - Math.PI / 2;
            const arrow = document.createElementNS(ns, "path");
            arrow.setAttribute("d",
                `M ${endX} ${endY} L ${endX + arrowSize * Math.cos(arrowAngle)} ${endY + arrowSize * Math.sin(arrowAngle)}` +
                ` M ${endX} ${endY} L ${endX + arrowSize * Math.cos(arrowAngle - Math.PI/3)} ${endY + arrowSize * Math.sin(arrowAngle - Math.PI/3)}`
            );
            arrow.setAttribute("stroke", "black");
            arrow.setAttribute("stroke-width", "1.5");
            arrow.setAttribute("stroke-linecap", "round");
            g.appendChild(arrow);

            return g;
        }
    },

    // ── Misc ──────────────────────────────────────────────────────────────────
    
    point: {
        category: 'Misc',
        label: 'Point',
        isComposite: false,
        isBuiltIn: true,
        localBounds: { minX: -2.5, maxX: 2.5, minY: -2.5, maxY: 2.5 },
        centerPoint: { x: 0, y: 0 },
        apertureCenter: { x: 0, y: 0 },
        upVector: { x: 0, y: -1 },
        forwardVector: { x: 1, y: 0 },
        apertureRadius: DEFAULT_APERTURE_RADIUS,
        coneAngle: DEFAULT_CONE_ANGLE,
        rayShape: 'convergent',

        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            const point = document.createElementNS(ns, "circle");
            point.setAttribute("cx", "0");
            point.setAttribute("cy", "0");
            point.setAttribute("r", "2.5");
            point.setAttribute("stroke", "black");
            point.setAttribute("fill", "black");
            g.appendChild(point);

            return g;
        }
    },

    plane: {
        category: 'Misc',
        label: 'Plane',
        isComposite: false,
        isBuiltIn: true,
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
components['mouse-sample'] = {
    category: 'Samples',
    label: 'Mouse Sample',
    isComposite: false,
    isBuiltIn: true,
    localBounds: { minX: -93, maxX: 53, minY: -31, maxY: 24 },
    // The optical target sits on the upper back, beneath an imaging objective.
    centerPoint: { x: 0, y: -24 },
    apertureCenter: { x: 0, y: -24 },
    upVector: { x: 1, y: 0 },
    forwardVector: { x: 0, y: -1 },
    apertureRadius: 5,
    coneAngle: 0,
    rayShape: 'convergent',
    draw: ns => {
        const g = document.createElementNS(ns, 'g');
        const add = (tag, attrs) => {
            const el = document.createElementNS(ns, tag);
            Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
            g.appendChild(el);
        };
        add('path', { d: 'M -30 13 C -50 20 -64 13 -75 18 S -85 20 -91 22',
            fill: 'none', stroke: '#c69c96', 'stroke-width': 3,
            'stroke-linecap': 'round' });
        // Small paws sit below the body.
        add('ellipse', { cx: -15, cy: 20, rx: 10, ry: 3, fill: '#b9958c' });
        add('ellipse', { cx: 27, cy: 20, rx: 8, ry: 3, fill: '#b9958c' });
        add('path', { d: 'M -37 15 C -43 -1 -29 -20 -10 -25 C 6 -30 20 -21 25 -9 C 34 -8 41 -1 46 7 L 51 14 Q 49 18 40 17 L 29 16 Q 24 22 11 18 Q -6 24 -25 19 Q -35 22 -37 15 Z',
            fill: '#595654', stroke: '#4c4947', 'stroke-width': 1,
            'stroke-linejoin': 'round' });
        add('path', { d: 'M 22 -7 C 13 -12 12 -29 21 -29 C 31 -29 34 -13 27 -7 Z',
            fill: '#77716b', stroke: '#504b48', 'stroke-width': 1 });
        add('path', { d: 'M 23 -10 C 18 -14 17 -24 22 -25 C 28 -24 29 -14 25 -10 Z',
            fill: '#c9a79c' });
        add('circle', { cx: 37, cy: 3, r: 2, fill: '#181818' });
        add('circle', { cx: 37.5, cy: 2.5, r: 0.6, fill: 'white' });
        add('ellipse', { cx: 50, cy: 13, rx: 2, ry: 1.8, fill: '#292522' });
        return g;
    }
};

components['fiber-coupler-1x2'] = {
    ...components['fiber-coupler'],
    label: '1×2 Fiber Coupler',
    draw: (ns, instance) => components['fiber-coupler'].draw(ns,
        instance || { type: 'fiber-coupler-1x2' })
};

components['connect-fiber'] = {
    ...components['draw-fiber'],
    label: 'Connect Fiber (click start and end; Esc to cancel)',
    draw: ns => {
        const g = document.createElementNS(ns, 'g');
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', 'M -30 -10 H -10 Q 0 -10 0 0 Q 0 10 10 10 H 30');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'black');
        path.setAttribute('stroke-width', '2');
        g.appendChild(path);
        return g;
    }
};

export function getComponentList() {
  return Object.keys(components);
}

// Component definitions and drawing functions
// All optical component shapes, dimensions, and drawing logic
// 
// =============================================================================
// This file is designed for adding/removing/modifying 
// user-defined components. Only modify the componentDimensions and components 
// objects below. For utility functions, see modules/componentUtils.js
// =============================================================================

import { calculateAperturePoints } from './modules/componentUtils.js';
import { DEFAULT_APERTURE_RADIUS, DEFAULT_CONE_ANGLE } from './constants.js';

// Component dimensions definition
export const componentDimensions = {
    objective: { 
        width: 129, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    lens: { 
        width: 10, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    lens2: { 
        width: 10, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    lens3: { 
        width: 18, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    mirror: { 
        width: 6, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: -3, y: 0 }, // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    plate: { 
        width: 6, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 }, // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    cube: { 
        width: 84, 
        height: 84, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 }, // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    detector: { 
        width: 85, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: -45, y: 0 }, // Center at component origin
        upVector: { x: 0, y: -1 },     // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 },  // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,            // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                      // Cone angle in degrees
        rayShape: 'collimated',        // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    'lenslet-array': { 
        width: 15, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',        // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    plane: { 
        width: 6, 
        height: 40, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    mask: {
        width: 6, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    aperture: {
        width: 6, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    'wedge-prism': {
        width: 32, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); } 
    },
    grating: {
        width: 10,
        height: 60,
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    doe: {
        width: 10,
        height: 60,
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }
    },
    dmd: {
        width: 10, 
        height: 80, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }  
    },
    slm: {
        width: 10, 
        height: 80, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }, // Forward direction (positive X)
        apertureRadius: DEFAULT_APERTURE_RADIUS,           // Scalar radius for aperture points
        coneAngle: DEFAULT_CONE_ANGLE,                     // Cone angle in degrees
        rayShape: 'collimated',       // Ray shape: collimated, divergent, or convergent
        get aperturePoints() { return calculateAperturePoints(this.centerPoint, this.upVector, this.apertureRadius); }  
    }    
};

// Component drawing functions
export const components = {
    lens: {
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

    lens2: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            // Double concave lens shape
            const lens = document.createElementNS(ns, "path");
            lens.setAttribute("d", "M 5 -30 C 0 -22 0 22 5 30 L -5 30 C 0 22 0 -22 -5 -30 Z");
            lens.setAttribute("stroke", "black");
            lens.setAttribute("stroke-width", "1.5");
            lens.setAttribute("fill", "#145ec0");
            lens.setAttribute("fill-opacity", "0.3");
            g.appendChild(lens);
            return g;
        }
    },

    lens3: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            // Double concave lens shape
            const lens = document.createElementNS(ns, "path");
            lens.setAttribute("d", "M 3 -30 L 3 30 L -3 30 C 0 20 -9 15 -9 0 C -9 -15 0 -20 -3 -30 Z");
            lens.setAttribute("stroke", "black");
            lens.setAttribute("stroke-width", "1.5");
            lens.setAttribute("fill", "#145ec0");
            lens.setAttribute("fill-opacity", "0.3");
            g.appendChild(lens);
            return g;
        }
    },

    objective: {
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
            greenRing.setAttribute("fill", "green");
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

    mirror: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");
            
            // Mirror line
            const mirror = document.createElementNS(ns, "path");
            mirror.setAttribute("d", "M -3 -30 L 3 -30 L 3 30 L -3 30 Z");
            mirror.setAttribute("stroke", "black");
            mirror.setAttribute("stroke-width", "1.5");
            mirror.setAttribute("fill", "#145ec0");
            mirror.setAttribute("fill-opacity", "0.4");
            g.appendChild(mirror);

            const backsurface = document.createElementNS(ns, "line");
            backsurface.setAttribute("x1", "3");
            backsurface.setAttribute("y1", "-30.75");
            backsurface.setAttribute("x2", "3");
            backsurface.setAttribute("y2", "30.75");
            backsurface.setAttribute("stroke", "black");
            backsurface.setAttribute("stroke-width", "2.5");
            g.appendChild(backsurface);

            return g;
        }
    },

    plate: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            // Plate
            const plate = document.createElementNS(ns, "path");
            plate.setAttribute("d", "M -3 -30 L 3 -30 L 3 30 L -3 30 Z");
            plate.setAttribute("stroke", "black");
            plate.setAttribute("stroke-width", "1.5");
            plate.setAttribute("fill", "#145ec0");
            plate.setAttribute("fill-opacity", "0.4");
            g.appendChild(plate);

            return g;
        }
    },
    
    cube: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            // Cube
            const cube = document.createElementNS(ns, "path");
            cube.setAttribute("d", "M 0 -42 L -42 0 L 0 42 L 42 0 Z");
            cube.setAttribute("stroke", "black");
            cube.setAttribute("stroke-width", "1.5");
            cube.setAttribute("fill", "#145ec0");
            cube.setAttribute("fill-opacity", "0.4");
            g.appendChild(cube);

            const surface = document.createElementNS(ns, "line");
            surface.setAttribute("x1", "0");
            surface.setAttribute("y1", "-42");
            surface.setAttribute("x2", "0");
            surface.setAttribute("y2", "42");
            surface.setAttribute("stroke", "black");
            surface.setAttribute("stroke-width", "2.5");
            g.appendChild(surface);

            return g;
        }
    }, 

    detector: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            const totalWidth = 80;
            const totalHeight = 60;
            const border = 1.5; // Border thickness

            const xLeft = -totalWidth / 2;
            const yTop = -totalHeight / 2;
            const xRight = xLeft + totalWidth;
            const yBottom = yTop + totalHeight;

            // Outer enclosure 
            const framePath = document.createElementNS(ns, "path");
            framePath.setAttribute("d", `
            M ${xLeft} ${yTop}
            H ${xRight}
            V ${yBottom}
            H ${xLeft}
            Z
            `);
            framePath.setAttribute("fill", "#cccccc");
            framePath.setAttribute("stroke", "black");
            framePath.setAttribute("stroke-width", border);
            g.appendChild(framePath);
            
            // Adapter ring
            const adapter = document.createElementNS(ns, "rect");
            adapter.setAttribute("x", xLeft-5);
            adapter.setAttribute("y", yTop+totalHeight/6);
            adapter.setAttribute("width", 5);
            adapter.setAttribute("height", totalHeight*2/3);
            adapter.setAttribute("fill", "#2e2e2e");
            adapter.setAttribute("stroke", "black");
            adapter.setAttribute("stroke-width", border);
            g.appendChild(adapter);

            return g;
        }
    },
    
    'lenslet-array': {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");
            
            // Create 5 small lenses vertically stacked
            for (let i = 0; i < 5; i++) {
                const yOffset = (i - 2) * 12; // Center around 0, spacing of 12px (reduced from 15px)
                
                // Small lens shape (scaled down from original lens)
                const lens = document.createElementNS(ns, "path");
                const scale = 0.2; // Scale factor reduced to make lenses smaller
                const height = 30 * scale; // 6px height
                const curve = 18 * scale; // 1.8px curve
                
                lens.setAttribute("d", `M 0 ${yOffset - height} C ${curve} ${yOffset - height + 3*scale} ${curve} ${yOffset + height - 3*scale} 0 ${yOffset + height} C ${-curve} ${yOffset + height - 3*scale} ${-curve} ${yOffset - height + 3*scale} 0 ${yOffset - height}`);
                lens.setAttribute("stroke", "black");
                lens.setAttribute("stroke-width", "1");
                lens.setAttribute("fill", "#145ec0");
                lens.setAttribute("fill-opacity", "0.3");
                g.appendChild(lens);
            }
            
            return g;
        }
    },

    plane: {
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

    mask: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");
            
            const totalWidth = 6;
            const totalHeight = 60;
            const border = 1.5; // Border thickness

            const xLeft = -totalWidth / 2;
            const yTop = -totalHeight / 2;
            const xRight = xLeft + totalWidth;
            const yBottom = yTop + totalHeight;

            // Outer enclosure 
            const plate = document.createElementNS(ns, "path");
            plate.setAttribute("d", `
            M ${xLeft} ${yTop}
            H ${xRight}
            V ${yBottom}
            H ${xLeft}
            Z
            `);
            plate.setAttribute("fill", "#ffffff");
            plate.setAttribute("stroke", "black");
            plate.setAttribute("stroke-width", border);
            g.appendChild(plate);

            const blockout1 = document.createElementNS(ns, "rect");
            blockout1.setAttribute("x", xLeft);
            blockout1.setAttribute("y", yTop);
            blockout1.setAttribute("width", totalWidth);
            blockout1.setAttribute("height", 10);
            blockout1.setAttribute("fill", "#000000");
            g.appendChild(blockout1);

            const blockout2 = document.createElementNS(ns, "rect");
            blockout2.setAttribute("x", xLeft);
            blockout2.setAttribute("y", yTop+15);
            blockout2.setAttribute("width", totalWidth);
            blockout2.setAttribute("height", 5);
            blockout2.setAttribute("fill", "#000000");
            g.appendChild(blockout2);

            const blockout3 = document.createElementNS(ns, "rect");
            blockout3.setAttribute("x", xLeft);
            blockout3.setAttribute("y", yTop+30);
            blockout3.setAttribute("width", totalWidth);
            blockout3.setAttribute("height", 15);
            blockout3.setAttribute("fill", "#000000");
            g.appendChild(blockout3);

            const blockout4 = document.createElementNS(ns, "rect");
            blockout4.setAttribute("x", xLeft);
            blockout4.setAttribute("y", yTop+52);
            blockout4.setAttribute("width", totalWidth);
            blockout4.setAttribute("height", 8);
            blockout4.setAttribute("fill", "#000000");
            g.appendChild(blockout4);

            return g;
        }
    },

    aperture: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            const totalWidth = 6;
            const totalHeight = 60;

            const opening = 20;
            const blockout = (totalHeight - opening)/2;
            const xLeft = -totalWidth / 2

            const blockout1 = document.createElementNS(ns, "rect");
            blockout1.setAttribute("x", xLeft);
            blockout1.setAttribute("y", -totalHeight/2);
            blockout1.setAttribute("width", totalWidth);
            blockout1.setAttribute("height", blockout);
            blockout1.setAttribute("fill", "#000000");
            g.appendChild(blockout1);

            const blockout2 = document.createElementNS(ns, "rect");
            blockout2.setAttribute("x", xLeft);
            blockout2.setAttribute("y", -totalHeight/2+blockout+opening);
            blockout2.setAttribute("width", totalWidth);
            blockout2.setAttribute("height", blockout);
            blockout2.setAttribute("fill", "#000000");
            g.appendChild(blockout2);

            return g;
        }
    },

    'wedge-prism': {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");
            
            const border = 1.5;

            const prism = document.createElementNS(ns, "path");
            prism.setAttribute("d", 'M -10 -30 L -10 30 L 15 30 L 5 -30 Z');
            prism.setAttribute("fill", "#145ec0");
            prism.setAttribute("fill-opacity", "0.3");
            prism.setAttribute("stroke", "black");
            prism.setAttribute("stroke-width", border);
            g.appendChild(prism);

            return g;
        }
    },

    grating: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            const border = 1.5;

            const baseplate = document.createElementNS(ns, "path");
            baseplate.setAttribute("d", 'M 0 -30 L 3 -30 L 3 30 L 0 30 L -3 28 L 0 20 L -3 18 L 0 10 L -3 8 L 0 0 L -3 -2 L 0 -10 L -3 -12 L 0 -20 L -3 -22 L 0 -30');
            baseplate.setAttribute("stroke", "black");
            baseplate.setAttribute("stroke-width", border);
            baseplate.setAttribute("fill", "#145ec0");
            baseplate.setAttribute("fill-opacity", "0.4");
            g.appendChild(baseplate);

            return g;
        }
    },

    doe: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            const border = 1.5;

            const baseplate = document.createElementNS(ns, "path");
            baseplate.setAttribute("d", 'M 0 -30 L 4 -30 L 4 30 L 0 30 L 0 28 L -2 28 L -2 20 L -1 20 L -1 12 L -3 12 L -3 4 L -1 4 L -1 -4 L -4 -4 L -4 -12 L -1 -12 L -1 -20 L -2 -20 L -2 -28 L 0 -28 L 0 -30');
            baseplate.setAttribute("stroke", "black");
            baseplate.setAttribute("stroke-width", border);
            baseplate.setAttribute("fill", "#145ec0");
            baseplate.setAttribute("fill-opacity", "0.4");
            g.appendChild(baseplate);

            return g;
        }
    },

    dmd: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");
            
            const border = 1.5;

            const baseplate = document.createElementNS(ns, "rect");
            baseplate.setAttribute("x", 0);
            baseplate.setAttribute("y", -40);
            baseplate.setAttribute("width", 5);
            baseplate.setAttribute("height", 80);
            baseplate.setAttribute("stroke", "black");
            baseplate.setAttribute("stroke-width", border);
            baseplate.setAttribute("fill", "#868686");
            g.appendChild(baseplate);

            const mirror1 = document.createElementNS(ns, "rect");
            mirror1.setAttribute("x", -5);
            mirror1.setAttribute("y", -30);
            mirror1.setAttribute("width", 5);
            mirror1.setAttribute("height", 18);
            mirror1.setAttribute("fill", "#000000");
            g.appendChild(mirror1);

            const mirror2 = document.createElementNS(ns, "rect");
            mirror2.setAttribute("x", -5);
            mirror2.setAttribute("y", -5);
            mirror2.setAttribute("width", 5);
            mirror2.setAttribute("height", 10);
            mirror2.setAttribute("fill", "#000000");
            g.appendChild(mirror2);

            const mirror3 = document.createElementNS(ns, "rect");
            mirror3.setAttribute("x", -5);
            mirror3.setAttribute("y", 10);
            mirror3.setAttribute("width", 5);
            mirror3.setAttribute("height", 20);
            mirror3.setAttribute("fill", "#000000");
            g.appendChild(mirror3);

            return g;
        }
    },

    slm: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");
            
            const border = 1.5;

            const baseplate = document.createElementNS(ns, "rect");
            baseplate.setAttribute("x", 0);
            baseplate.setAttribute("y", -40);
            baseplate.setAttribute("width", 5);
            baseplate.setAttribute("height", 80);
            baseplate.setAttribute("stroke", "black");
            baseplate.setAttribute("stroke-width", border);
            baseplate.setAttribute("fill", "#868686");
            g.appendChild(baseplate);

            const lc = document.createElementNS(ns, "rect");
            lc.setAttribute("x", -5);
            lc.setAttribute("y", -30);
            lc.setAttribute("width", 5);
            lc.setAttribute("height", 60);
            lc.setAttribute("fill", "#145ec0");
            lc.setAttribute("fill-opacity", "0.5");
            g.appendChild(lc);

            return g;
        }
    }

};

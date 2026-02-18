import { DEFAULT_APERTURE_RADIUS, DEFAULT_CONE_ANGLE } from '../config.js';

const SVG_NS = 'http://www.w3.org/2000/svg';


export const components = {
    objective: { 
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

    mirror: { 
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

    plane: { 
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

// Component definitions and drawing functions
// All optical component shapes, dimensions, and drawing logic

// Component dimensions definition
export const componentDimensions = {
    objective: { 
        width: 129, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 } // Forward direction (positive X)
    },
    lens: { 
        width: 60, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 } // Forward direction (positive X)
    },
    mirror: { 
        width: 60, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: -3, y: 0 }, // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 } // Forward direction (positive X)
    },
    detector: { 
        width: 56, 
        height: 80, 
        offsetX: 0,
        centerPoint: { x: -25, y: 0 }, // Center at component origin
        upVector: { x: 0, y: -1 },     // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 }  // Forward direction (positive X)
    },
    'lenslet-array': { 
        width: 25, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 } // Forward direction (positive X)
    },
    plane: { 
        width: 6, 
        height: 60, 
        offsetX: 0,
        centerPoint: { x: 0, y: 0 },  // Center at component origin
        upVector: { x: 0, y: -1 },    // Up direction (negative Y)
        forwardVector: { x: 1, y: 0 } // Forward direction (positive X)
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
            lens.setAttribute("fill", "#145ec0ff");
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
            rearBarrel.setAttribute("fill", "#888");
            rearBarrel.setAttribute("stroke", "black");
            rearBarrel.setAttribute("stroke-width", "1.5");
            g.appendChild(rearBarrel);

            // End cap
            const endCap = document.createElementNS(ns, "rect");
            endCap.setAttribute("x", "56.5");
            endCap.setAttribute("y", -21);
            endCap.setAttribute("width", 8);
            endCap.setAttribute("height", 42);
            endCap.setAttribute("fill", "#686868ff");
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
            mirror.setAttribute("fill", "#145ec0ff");
            mirror.setAttribute("fill-opacity", "0.4");
            g.appendChild(mirror);

            const backsurface = document.createElementNS(ns, "line");
            backsurface.setAttribute("x1", "3");
            backsurface.setAttribute("y1", "-30");
            backsurface.setAttribute("x2", "3");
            backsurface.setAttribute("y2", "30");
            backsurface.setAttribute("stroke", "black");
            backsurface.setAttribute("stroke-width", "2.5");
            g.appendChild(backsurface);

            return g;
        }
    },
    
    detector: {
        draw: (ns) => {
            const g = document.createElementNS(ns, "g");

            const totalWidth = 50;
            const totalHeight = 80;
            const border = 1.5; // Border thickness

            const xLeft = -totalWidth / 2;
            const yTop = -totalHeight / 2;
            const xRight = xLeft + totalWidth;
            const yBottom = yTop + totalHeight;

            // Bold outer enclosure using path
            const framePath = document.createElementNS(ns, "path");
            framePath.setAttribute("d", `
            M ${xLeft} ${yTop}
            H ${xRight}
            V ${yBottom}
            H ${xLeft}
            Z
            `);
            framePath.setAttribute("fill", "none");
            framePath.setAttribute("stroke", "black");
            framePath.setAttribute("stroke-width", border * 2);
            g.appendChild(framePath);

            // Inner body (gray detection area)
            const inner = document.createElementNS(ns, "rect");
            inner.setAttribute("x", xLeft + border * 2);
            inner.setAttribute("y", yTop + border * 2);
            inner.setAttribute("width", totalWidth - border * 4);
            inner.setAttribute("height", totalHeight - border * 4);
            inner.setAttribute("fill", "#cccccc");
            g.appendChild(inner);

            // Yellow screw markers (rectangular)
            const screwTop = document.createElementNS(ns, "rect");
            screwTop.setAttribute("x", xLeft + 4);
            screwTop.setAttribute("y", yTop + 4);
            screwTop.setAttribute("width", 5);
            screwTop.setAttribute("height", 5);
            screwTop.setAttribute("fill", "gold");
            g.appendChild(screwTop);

            const screwBottom = document.createElementNS(ns, "rect");
            screwBottom.setAttribute("x", xLeft + 4);
            screwBottom.setAttribute("y", yBottom - 9);
            screwBottom.setAttribute("width", 5);
            screwBottom.setAttribute("height", 5);
            screwBottom.setAttribute("fill", "gold");
            g.appendChild(screwBottom);

            // Right-side connector
            const connector = document.createElementNS(ns, "rect");
            connector.setAttribute("x", xRight - 1);
            connector.setAttribute("y", -25);
            connector.setAttribute("width", 6);
            connector.setAttribute("height", 16);
            connector.setAttribute("fill", "#555");
            connector.setAttribute("stroke", "black");
            g.appendChild(connector);

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
                const curve = 12 * scale; // 1.8px curve
                
                lens.setAttribute("d", `M 0 ${yOffset - height} C ${curve} ${yOffset - height + 3*scale} ${curve} ${yOffset + height - 3*scale} 0 ${yOffset + height} C ${-curve} ${yOffset + height - 3*scale} ${-curve} ${yOffset - height + 3*scale} 0 ${yOffset - height}`);
                lens.setAttribute("stroke", "black");
                lens.setAttribute("stroke-width", "1");
                lens.setAttribute("fill", "#145ec0ff");
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
    }
};

// Utility function to get available component types
export function getAvailableComponentTypes() {
    return Object.keys(components);
}

// Utility function to check if a component type exists
export function isValidComponentType(type) {
    return components.hasOwnProperty(type);
}

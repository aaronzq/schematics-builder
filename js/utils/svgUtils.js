// SVG utility functions
// Centralized SVG element creation and marker management

const SVG_NS = "http://www.w3.org/2000/svg";

// Create SVG element with namespace
export function createSVGElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tagName);
    
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
    
    return element;
}

// Ensure SVG defs element exists
export function ensureDefs(svg) {
    let defs = svg.querySelector("defs");
    if (!defs) {
        defs = createSVGElement("defs");
        svg.insertBefore(defs, svg.firstChild);
    }
    return defs;
}

// Create and ensure all necessary markers exist
export function ensureAllMarkers(svg) {
    const defs = ensureDefs(svg);
    
    // Arrowhead marker (blue - for arrows)
    if (!svg.querySelector("#arrowhead")) {
        const marker = createSVGElement("marker", {
            id: "arrowhead",
            markerWidth: "10",
            markerHeight: "7",
            refX: "10",
            refY: "3.5",
            orient: "auto",
            markerUnits: "strokeWidth"
        });
        
        const path = createSVGElement("path", {
            d: "M0,0 L10,3.5 L0,7 Z",
            fill: "#2196F3"
        });
        
        marker.appendChild(path);
        defs.appendChild(marker);
    }
    
    // Up vector arrow marker (green)
    if (!svg.querySelector("#upVectorArrow")) {
        const marker = createSVGElement("marker", {
            id: "upVectorArrow",
            markerWidth: "8",
            markerHeight: "6",
            refX: "8",
            refY: "3",
            orient: "auto",
            markerUnits: "strokeWidth"
        });
        
        const path = createSVGElement("path", {
            d: "M0,0 L8,3 L0,6 Z",
            fill: "green"
        });
        
        marker.appendChild(path);
        defs.appendChild(marker);
    }
    
    // Forward vector arrow marker (blue)
    if (!svg.querySelector("#forwardVectorArrow")) {
        const marker = createSVGElement("marker", {
            id: "forwardVectorArrow",
            markerWidth: "8",
            markerHeight: "6",
            refX: "8",
            refY: "3",
            orient: "auto",
            markerUnits: "strokeWidth"
        });
        
        const path = createSVGElement("path", {
            d: "M0,0 L8,3 L0,6 Z",
            fill: "blue"
        });
        
        marker.appendChild(path);
        defs.appendChild(marker);
    }
}

// Remove element by ID if it exists
export function removeElementById(parentElement, id) {
    const element = parentElement.querySelector(`#${id}`);
    if (element) {
        element.remove();
        return true;
    }
    return false;
}

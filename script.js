let idCounter = 0;
// Debug settings
const SHOW_CENTER_MARKERS = false; // Set to false to hide red debug dots

// Trace line settings
let showTraceLines = false;
const componentCreationOrder = []; // Track order of component creation
const componentBranches = {}; // Track branching relationships: {parentId: [childId1, childId2, ...]}

// Persistent state for each component, indexed by data-id
const componentState = {};
let draggingElement = null;
let offsetX = 0;
let offsetY = 0;
let nextX = 0;
let nextY = 0;

// Component dimensions definition
const componentDimensions = {
    objective: { width: 129, height: 60, offsetX: 0 },  // Centered: -82.5 to +46.5, total width 129px
    lens: { width: 60, height: 60, offsetX: 0 },
    mirror: { width: 60, height: 60, offsetX: 0 },
    detector: { width: 56, height: 80, offsetX: 0 },  // Updated to match actual detector size with connector
    'lenslet-array': { width: 25, height: 60, offsetX: 0 }  // 5 small lenses stacked vertically
};

// Initialize the SVG viewBox
function initCanvas() {
    const svg = document.getElementById("canvas");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Get the container size and set SVG size
    function resizeSVG() {
        const workspace = document.querySelector('.workspace');
        const rect = workspace.getBoundingClientRect();
        svg.setAttribute('width', rect.width);
        svg.setAttribute('height', rect.height);
        svg.setAttribute("viewBox", `${-rect.width/2} ${-rect.height/2} ${rect.width} ${rect.height}`);
    }
    resizeSVG();
    window.addEventListener('resize', resizeSVG);

    // Get the components group and remove any transform
    const componentsGroup = document.getElementById("components");
    componentsGroup.removeAttribute("transform");

    // Clear any existing components
    while (componentsGroup.firstChild) {
        componentsGroup.removeChild(componentsGroup.firstChild);
    }

    // Initialize component placement at (0,0)
    nextX = 0;
    nextY = 0;
}

// Component definitions
const components = {
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
            cone.setAttribute("d", "M -46.5 -30 L -48.5 -30 L -64.5 -9 L -64.5 9 L -48.5 30 L -46.5 30 Z");
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

            // // Debug vertical center line at x = 0
            // const centerLine = document.createElementNS(ns, "line");
            // centerLine.setAttribute("x1", "0");
            // centerLine.setAttribute("y1", "-40");
            // centerLine.setAttribute("x2", "0");
            // centerLine.setAttribute("y2", "40");
            // centerLine.setAttribute("stroke", "blue");
            // centerLine.setAttribute("stroke-width", "0.5");
            // centerLine.setAttribute("stroke-dasharray", "2,2");
            // g.appendChild(centerLine);

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
    }
};

// Keep track of the center position for component placement
let selectedComponent = null;
const COMPONENT_SPACING = 150; // Spacing between components

// Calculate the bounding box of all components and adjust viewBox
function updateCanvasViewBox() {
    const svg = document.getElementById("canvas");
    const components = svg.getElementsByClassName("component");
    if (components.length === 0) {
        return;  // Keep using the initial viewBox set in initCanvas
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    // Calculate bounds including component dimensions and arrow endpoints
    for (const comp of components) {
        const transform = comp.getAttribute("transform");
        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
        const [centerX, centerY] = [parseFloat(match[1]), parseFloat(match[2])];
        const type = comp.getAttribute("data-type");
        const dims = componentDimensions[type];
        // Component bounds
        const left = centerX + (-dims.width/2 + dims.offsetX);
        const right = centerX + (dims.width/2 + dims.offsetX);
        const top = centerY - dims.height/2;
        const bottom = centerY + dims.height/2;
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        minY = Math.min(minY, top);
        maxY = Math.max(maxY, bottom);
        // Arrow endpoint bounds (from persistent state)
        const compId = comp.getAttribute('data-id');
        const state = componentState[compId];
        if (state && typeof state.arrowX === "number" && typeof state.arrowY === "number") {
            minX = Math.min(minX, state.arrowX);
            maxX = Math.max(maxX, state.arrowX);
            minY = Math.min(minY, state.arrowY);
            maxY = Math.max(maxY, state.arrowY);
        }
    }
    // Add padding (10% on each side and ensure minimum size)
    const width = Math.max(maxX - minX, 400);  // Minimum width
    const height = Math.max(maxY - minY, 300);  // Minimum height
    const padding = {
        x: Math.max(width * 0.1, 50),   // 10% padding with 50px minimum
        y: Math.max(height * 0.1, 50)    // 10% padding with 50px minimum
    };
    // Center the viewBox on the bounding box of all components and arrows
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const viewBoxWidth = width + 2 * padding.x;
    const viewBoxHeight = height + 2 * padding.y;
    const viewBoxX = centerX - viewBoxWidth / 2;
    const viewBoxY = centerY - viewBoxHeight / 2;
    svg.setAttribute("viewBox", `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
}

// Add a new component to the canvas
function addComponent(type) {
    if (!components[type]) return;
    const svg = document.getElementById("canvas");
    const componentsGroup = document.getElementById("components");
    const ns = "http://www.w3.org/2000/svg";

    // Determine placement: use selected component's arrow endpoint and direction
    let placeX = 0, placeY = 0;
    let initialRotation = 0;
    if (selectedComponent) {
        const selId = selectedComponent.getAttribute('data-id');
        const selState = componentState[selId];
        if (selState && typeof selState.arrowX === "number" && typeof selState.arrowY === "number") {
            placeX = selState.arrowX;
            placeY = selState.arrowY;
            // Calculate arrow direction to align new component
            const dx = selState.arrowX - selState.posX;
            const dy = selState.arrowY - selState.posY;
            initialRotation = Math.atan2(dy, dx) * 180 / Math.PI;
        } else {
            placeX = nextX;
            placeY = nextY;
        }
    } else {
        placeX = nextX;
        placeY = nextY;
    }

    // Create component group
    const g = document.createElementNS(ns, "g");
    g.setAttribute("class", "component");
    const compId = idCounter++;
    g.setAttribute("data-id", compId);
    g.setAttribute("data-type", type);
    g.setAttribute("transform", `translate(${placeX},${placeY}) rotate(${initialRotation})`);
    // Store persistent state
    componentState[compId] = {
        posX: placeX,
        posY: placeY,
        rotation: initialRotation,
        arrowX: placeX + COMPONENT_SPACING * Math.cos(initialRotation * Math.PI / 180),
        arrowY: placeY + COMPONENT_SPACING * Math.sin(initialRotation * Math.PI / 180),
        selected: false,
        type: type
    };

    // Track component creation order and branching
    let parentId = null;
    if (selectedComponent) {
        parentId = parseInt(selectedComponent.getAttribute('data-id'));
        
        // Check if the selected component is in a branch
        let isInBranch = false;
        let branchParentId = null;
        
        for (const bParentId in componentBranches) {
            if (componentBranches[bParentId].includes(parentId)) {
                isInBranch = true;
                branchParentId = parseInt(bParentId);
                break;
            }
        }
        
        if (isInBranch) {
            // Adding to an existing branch - extend that branch
            componentBranches[branchParentId].push(compId);
        } else {
            // Check if this creates a new branch (parent is not the last component in main sequence)
            const parentIndex = componentCreationOrder.indexOf(parentId);
            if (parentIndex !== -1 && parentIndex < componentCreationOrder.length - 1) {
                // This creates a new branch - add to parent's branch list
                if (!componentBranches[parentId]) {
                    componentBranches[parentId] = [];
                }
                componentBranches[parentId].push(compId);
            } else {
                // This continues the main sequence
                componentCreationOrder.push(compId);
            }
        }
    } else {
        // First component or no selection
        componentCreationOrder.push(compId);
    }
    
    // Store parent relationship in component state
    componentState[compId].parentId = parentId;

    // Update nextX/nextY for default placement
    nextX = componentState[compId].arrowX;
    nextY = componentState[compId].arrowY;

    // Get component dimensions
    const dims = componentDimensions[type];

    // Add hit area for better selection, centered on component
    const hitArea = document.createElementNS(ns, "rect");
    hitArea.setAttribute("class", "component-hit-area");
    hitArea.setAttribute("x", -dims.width/2 + dims.offsetX);
    hitArea.setAttribute("y", -dims.height/2);
    hitArea.setAttribute("width", dims.width);
    hitArea.setAttribute("height", dims.height);
    hitArea.setAttribute('visibility', 'hidden');
    g.appendChild(hitArea);

    // Add the component's SVG elements
    const componentGroup = components[type].draw(ns);
    while (componentGroup.firstChild) {
        const child = componentGroup.firstChild;
        // Disable pointer events on all child elements so only the main group handles mouse events
        child.setAttribute('pointer-events', 'none');
        g.appendChild(child);
    }

    // Add center marker (red dot) on top - only if debug is enabled
    if (SHOW_CENTER_MARKERS) {
        const centerMarker = document.createElementNS(ns, "circle");
        centerMarker.setAttribute("cx", dims.offsetX);
        centerMarker.setAttribute("cy", "0");
        centerMarker.setAttribute("r", "2");
        centerMarker.setAttribute("fill", "red");
        centerMarker.setAttribute('pointer-events', 'none');
        
        // Add the center marker on top of everything
        g.appendChild(centerMarker);
    }

    // Add event listeners
    g.addEventListener("mousedown", startDrag);
    g.addEventListener("mouseenter", function(e) {
        e.stopPropagation();
        showHitbox(g, true);
    });
    g.addEventListener("mouseleave", function(e) {
        e.stopPropagation();
        if (!componentState[compId].selected) showHitbox(g, false);
    });
    g.addEventListener("click", function(e) {
        e.stopPropagation();
        if (selectedComponent && selectedComponent !== g) {
            componentState[selectedComponent.getAttribute('data-id')].selected = false;
            showHitbox(selectedComponent, false);
            removeArrowFromComponent(selectedComponent);
        }
        selectedComponent = g;
        componentState[compId].selected = true;
        showHitbox(g, true);
        showArrowForComponent(g);
    });

    // Add to components group instead of directly to SVG
    componentsGroup.appendChild(g);

    // Update canvas viewBox to include new component
    updateCanvasViewBox();

    // Automatically select the newly created component
    if (selectedComponent && selectedComponent !== g) {
        componentState[selectedComponent.getAttribute('data-id')].selected = false;
        showHitbox(selectedComponent, false);
        removeArrowFromComponent(selectedComponent);
    }
    selectedComponent = g;
    componentState[compId].selected = true;
    showHitbox(g, true);
    showArrowForComponent(g);
}

function showArrowForComponent(component) {
    removeArrowFromComponent(component); // Remove any existing arrow for this component
    const svg = document.getElementById("canvas");
    // Get persistent state
    const compId = component.getAttribute('data-id');
    const state = componentState[compId];
    const type = state.type;
    const dims = componentDimensions[type];
    // All components rotate around their own hitbox center
    let centerX = state.posX;
    let centerY = state.posY;
    const rotation = state.rotation;

    // Always use the latest stored arrow endpoint for initial arrow position
    if (typeof state.arrowX !== "number" || typeof state.arrowY !== "number") {
        state.arrowX = centerX + COMPONENT_SPACING;
        state.arrowY = centerY;
    }
    let targetX = state.arrowX;
    let targetY = state.arrowY;

    // Draw arrow group
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "g");
    arrow.setAttribute("id", `arrow-preview-${component.getAttribute('data-id')}`);
    // Main line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", centerX);
    line.setAttribute("y1", centerY);
    line.setAttribute("x2", targetX);
    line.setAttribute("y2", targetY);
    line.setAttribute("stroke", "#2196F3");
    line.setAttribute("stroke-width", "3");
    line.setAttribute("marker-end", "url(#arrowhead)");
    arrow.appendChild(line);
    // Draggable handle at arrow end
    const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    handle.setAttribute("cx", targetX);
    handle.setAttribute("cy", targetY);
    handle.setAttribute("r", "10");
    handle.setAttribute("fill", "#fff");
    handle.setAttribute("stroke", "#2196F3");
    handle.setAttribute("stroke-width", "2");
    handle.setAttribute("cursor", "pointer");
    handle.setAttribute("id", `arrow-handle-${component.getAttribute('data-id')}`);
    arrow.appendChild(handle);

    // Rotation handle (only if selected)
    if (state.selected) {
        const rotationHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        // Place handle 40px above center (relative to rotation)
        const handleRadius = 12;
        const handleDistance = 40;
        // Calculate rotated position
        const angleRad = rotation * Math.PI / 180;
        const rx = centerX + handleDistance * Math.cos(angleRad - Math.PI/2);
        const ry = centerY + handleDistance * Math.sin(angleRad - Math.PI/2);
        rotationHandle.setAttribute("cx", rx);
        rotationHandle.setAttribute("cy", ry);
        rotationHandle.setAttribute("r", handleRadius);
        rotationHandle.setAttribute("fill", "#ffe082");
        rotationHandle.setAttribute("stroke", "#fbc02d");
        rotationHandle.setAttribute("stroke-width", "2");
        rotationHandle.setAttribute("cursor", "grab");
        rotationHandle.setAttribute("id", `rotation-handle-${compId}`);
        arrow.appendChild(rotationHandle);

        // Drag logic for rotation handle
        let draggingRotation = false;
        function dragRotationHandle(e) {
            if (!draggingRotation) return;
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());
            // Calculate angle from center to cursor
            const dx = cursorpt.x - centerX;
            const dy = cursorpt.y - centerY;
            let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
            // Snap to 5 degree increments
            angle = Math.round(angle / 5) * 5;
            state.rotation = angle;
            // All components rotate around their own hitbox center
            component.setAttribute("transform", `translate(${centerX},${centerY}) rotate(${angle})`);
            state.posX = centerX;
            state.posY = centerY;
            // Show angle display
            showAngleDisplay(centerX, centerY, angle);
            // Update arrow and hitbox
            showArrowForComponent(component);
            showHitbox(component, true);
        }
        function stopDragRotationHandle() {
            draggingRotation = false;
            document.removeEventListener("mousemove", dragRotationHandle);
            document.removeEventListener("mouseup", stopDragRotationHandle);
            // Hide angle display when rotation stops
            hideAngleDisplay();
        }
        rotationHandle.addEventListener("mousedown", function(e) {
            e.stopPropagation();
            draggingRotation = true;
            document.addEventListener("mousemove", dragRotationHandle);
            document.addEventListener("mouseup", stopDragRotationHandle);
        });
    }

    // Arrowhead marker (if not present)
    let defs = svg.querySelector("defs");
    if (!defs) {
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        svg.insertBefore(defs, svg.firstChild);
    }
    if (!svg.querySelector("#arrowhead")) {
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", "arrowhead");
        marker.setAttribute("markerWidth", "10");
        marker.setAttribute("markerHeight", "7");
        marker.setAttribute("refX", "10");
        marker.setAttribute("refY", "3.5");
        marker.setAttribute("orient", "auto");
        marker.setAttribute("markerUnits", "strokeWidth");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M0,0 L10,3.5 L0,7 Z");
        path.setAttribute("fill", "#2196F3");
        marker.appendChild(path);
        defs.appendChild(marker);
    }
    svg.appendChild(arrow);
    // Drag logic for handle
    let draggingArrow = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    handle.addEventListener("mousedown", function(e) {
        e.stopPropagation();
        draggingArrow = true;
        // Get mouse position in SVG coordinates
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());
        // Set drag offsets for smooth dragging (relative to last saved endpoint)
        dragOffsetX = cursorpt.x - state.arrowX;
        dragOffsetY = cursorpt.y - state.arrowY;
        document.addEventListener("mousemove", dragArrowHandle);
        document.addEventListener("mouseup", stopDragArrowHandle);
    });
    function dragArrowHandle(e) {
        if (!draggingArrow) return;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());
        // Snap to 10px grid
        let newX = Math.round((cursorpt.x - dragOffsetX) / 10) * 10;
        let newY = Math.round((cursorpt.y - dragOffsetY) / 10) * 10;
        // Update arrow line and handle
        line.setAttribute("x2", newX);
        line.setAttribute("y2", newY);
        handle.setAttribute("cx", newX);
        handle.setAttribute("cy", newY);
        // Do NOT update arrow endpoint for this component here
        // Only update on mouseup (see stopDragArrowHandle)
    }
    function stopDragArrowHandle() {
        draggingArrow = false;
        document.removeEventListener("mousemove", dragArrowHandle);
        document.removeEventListener("mouseup", stopDragArrowHandle);
        // Store the final position as the new arrow endpoint for future drags
        const finalX = parseFloat(line.getAttribute("x2"));
        const finalY = parseFloat(line.getAttribute("y2"));
        state.arrowX = finalX;
        state.arrowY = finalY;
    }
}

function removeArrowFromComponent(component) {
    const svg = document.getElementById("canvas");
    const arrow = svg.querySelector(`#arrow-preview-${component.getAttribute('data-id')}`);
    if (arrow) arrow.remove();
}

function showHitbox(component, show) {
    const hitArea = component.querySelector('.component-hit-area');
    if (hitArea) {
        hitArea.setAttribute('visibility', show ? 'visible' : 'hidden');
    }
}

// Show angle display during rotation
function showAngleDisplay(x, y, angle) {
    const svg = document.getElementById("canvas");
    
    // Remove existing angle display
    hideAngleDisplay();
    
    // Create angle display group
    const angleDisplay = document.createElementNS("http://www.w3.org/2000/svg", "g");
    angleDisplay.setAttribute("id", "angle-display");
    
    // Background circle
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bg.setAttribute("cx", x);
    bg.setAttribute("cy", y - 70);
    bg.setAttribute("r", "25");
    bg.setAttribute("fill", "rgba(0, 0, 0, 0.8)");
    bg.setAttribute("stroke", "#fbc02d");
    bg.setAttribute("stroke-width", "2");
    angleDisplay.appendChild(bg);
    
    // Angle text
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y - 65);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-family", "Arial, sans-serif");
    text.setAttribute("font-size", "14");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("fill", "white");
    text.textContent = `${Math.round(angle)}°`;
    angleDisplay.appendChild(text);
    
    svg.appendChild(angleDisplay);
}

// Hide angle display
function hideAngleDisplay() {
    const svg = document.getElementById("canvas");
    const angleDisplay = svg.querySelector("#angle-display");
    if (angleDisplay) {
        angleDisplay.remove();
    }
}

// Show trace lines connecting component centers in creation order
function drawTraceLines() {
    const svg = document.getElementById("canvas");
    
    // Remove existing trace lines
    hideTraceLines();
    
    // Create trace lines group
    const traceLinesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    traceLinesGroup.setAttribute("id", "trace-lines");
    
    // Track which connections we've already drawn to avoid duplicates
    const drawnConnections = new Set();
    
    // Function to draw a line between two components
    function drawLine(fromId, toId) {
        const fromState = componentState[fromId];
        const toState = componentState[toId];
        
        if (!fromState || !toState) return;
        
        // Create a unique connection identifier (sorted to avoid duplicates)
        const connectionKey = [fromId, toId].sort().join('-');
        
        // Skip if we've already drawn this connection
        if (drawnConnections.has(connectionKey)) return;
        drawnConnections.add(connectionKey);
        
        // Draw dotted line between component centers
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", fromState.posX);
        line.setAttribute("y1", fromState.posY);
        line.setAttribute("x2", toState.posX);
        line.setAttribute("y2", toState.posY);
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("stroke-dasharray", "5,5");
        line.setAttribute("pointer-events", "none");
        
        traceLinesGroup.appendChild(line);
    }
    
    // Draw main sequence lines
    for (let i = 0; i < componentCreationOrder.length - 1; i++) {
        const currentId = componentCreationOrder[i];
        const nextId = componentCreationOrder[i + 1];
        drawLine(currentId, nextId);
    }
    
    // Draw branch lines
    for (const parentId in componentBranches) {
        const parentIdNum = parseInt(parentId);
        const children = componentBranches[parentId];
        
        // Draw line from parent to first child in branch
        if (children.length > 0) {
            drawLine(parentIdNum, children[0]);
        }
        
        // Draw lines between consecutive children in the same branch
        for (let i = 0; i < children.length - 1; i++) {
            drawLine(children[i], children[i + 1]);
        }
    }
    
    // Insert trace lines before components so they appear behind
    const componentsGroup = document.getElementById("components");
    svg.insertBefore(traceLinesGroup, componentsGroup);
}

// Hide trace lines
function hideTraceLines() {
    const svg = document.getElementById("canvas");
    const traceLinesGroup = svg.querySelector("#trace-lines");
    if (traceLinesGroup) {
        traceLinesGroup.remove();
    }
}

// Toggle trace lines
function toggleTraceLines() {
    showTraceLines = !showTraceLines;
    const traceBtn = document.getElementById('trace-btn');
    
    if (showTraceLines) {
        drawTraceLines();
        traceBtn.textContent = 'Hide Trace Line';
    } else {
        hideTraceLines();
        traceBtn.textContent = 'Show Trace Line';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('mousedown', function(e) {
        // Only clear selection if clicking outside any component
        const svg = document.getElementById('canvas');
        if (e.target === svg) {
            if (selectedComponent) {
                selectedComponent.selected = false;
                showHitbox(selectedComponent, false);
                removeArrowFromComponent(selectedComponent);
                selectedComponent = null;
            }
        }
    });

    // Delete selected component on Delete button click
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            if (selectedComponent) {
                const compId = selectedComponent.getAttribute('data-id');
                // Find previous component in DOM
                const componentsGroup = document.getElementById('components');
                let prevComponent = null;
                let found = false;
                for (const child of componentsGroup.children) {
                    if (child === selectedComponent) {
                        found = true;
                        break;
                    }
                    prevComponent = child;
                }
                // Remove from creation order tracking and branch relationships
                const compIdNum = parseInt(compId);
                const orderIndex = componentCreationOrder.indexOf(compIdNum);
                if (orderIndex > -1) {
                    componentCreationOrder.splice(orderIndex, 1);
                }
                
                // Remove from branches if it's a branch child
                for (const parentId in componentBranches) {
                    const branchIndex = componentBranches[parentId].indexOf(compIdNum);
                    if (branchIndex > -1) {
                        componentBranches[parentId].splice(branchIndex, 1);
                        // Remove empty branch arrays
                        if (componentBranches[parentId].length === 0) {
                            delete componentBranches[parentId];
                        }
                        break;
                    }
                }
                
                // If this component had branches, remove them
                if (componentBranches[compIdNum]) {
                    delete componentBranches[compIdNum];
                }
                // Remove selected
                selectedComponent.remove();
                removeArrowFromComponent(selectedComponent);
                delete componentState[compId];
                // Select previous if exists
                if (prevComponent) {
                    selectedComponent = prevComponent;
                    const prevId = prevComponent.getAttribute('data-id');
                    componentState[prevId].selected = true;
                    showHitbox(prevComponent, true);
                    showArrowForComponent(prevComponent);
                } else {
                    selectedComponent = null;
                }
                updateCanvasViewBox();
                // Update trace lines if they're shown
                if (showTraceLines) {
                    drawTraceLines();
                }
            }
        });
    }

    // Trace line button
    const traceBtn = document.getElementById('trace-btn');
    if (traceBtn) {
        traceBtn.addEventListener('click', toggleTraceLines);
    }

    // Delete selected component on Delete key
    document.addEventListener('keydown', function(e) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponent) {
            const compId = selectedComponent.getAttribute('data-id');
            // Find previous component in DOM
            const componentsGroup = document.getElementById('components');
            let prevComponent = null;
            let found = false;
            for (const child of componentsGroup.children) {
                if (child === selectedComponent) {
                    found = true;
                    break;
                }
                prevComponent = child;
            }
            // Remove from creation order tracking and branch relationships
            const compIdNum = parseInt(compId);
            const orderIndex = componentCreationOrder.indexOf(compIdNum);
            if (orderIndex > -1) {
                componentCreationOrder.splice(orderIndex, 1);
            }
            
            // Remove from branches if it's a branch child
            for (const parentId in componentBranches) {
                const branchIndex = componentBranches[parentId].indexOf(compIdNum);
                if (branchIndex > -1) {
                    componentBranches[parentId].splice(branchIndex, 1);
                    // Remove empty branch arrays
                    if (componentBranches[parentId].length === 0) {
                        delete componentBranches[parentId];
                    }
                    break;
                }
            }
            
            // If this component had branches, remove them
            if (componentBranches[compIdNum]) {
                delete componentBranches[compIdNum];
            }
            // Remove selected
            selectedComponent.remove();
            removeArrowFromComponent(selectedComponent);
            delete componentState[compId];
            // Select previous if exists
            if (prevComponent) {
                selectedComponent = prevComponent;
                const prevId = prevComponent.getAttribute('data-id');
                componentState[prevId].selected = true;
                showHitbox(prevComponent, true);
                showArrowForComponent(prevComponent);
            } else {
                selectedComponent = null;
            }
            updateCanvasViewBox();
            // Update trace lines if they're shown
            if (showTraceLines) {
                drawTraceLines();
            }
        }
    });
});

// Drag and drop functionality
function startDrag(e) {
    draggingElement = e.currentTarget;
    const transform = draggingElement.getAttribute("transform");
    const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
    const [x, y] = [parseFloat(match[1]), parseFloat(match[2])];
    
    const svg = document.getElementById("canvas");
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());
    
    offsetX = cursorpt.x - x;
    offsetY = cursorpt.y - y;
    
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", stopDrag);
    // Deselect previous component and remove its arrow/rotation handle immediately
    if (selectedComponent && selectedComponent !== e.currentTarget) {
        const prevId = selectedComponent.getAttribute('data-id');
        componentState[prevId].selected = false;
        showHitbox(selectedComponent, false);
        removeArrowFromComponent(selectedComponent);
        selectedComponent = null;
    }
}

function drag(e) {
    if (!draggingElement) return;
    const svg = document.getElementById("canvas");
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());
    const x = Math.round((cursorpt.x - offsetX) / 10) * 10;
    const y = Math.round((cursorpt.y - offsetY) / 10) * 10;
    // Get persistent state
    const compId = draggingElement.getAttribute('data-id');
    const state = componentState[compId];
    // Get previous position
    const prevX = state.posX;
    const prevY = state.posY;
    const dx = x - prevX;
    const dy = y - prevY;
    // Update position
    state.posX = x;
    state.posY = y;
    const rotation = state.rotation || 0;
    // All components rotate around their own hitbox center
    draggingElement.setAttribute("transform", `translate(${x},${y}) rotate(${rotation})`);
    // Move arrow endpoint by same delta
    if (typeof state.arrowX === "number" && typeof state.arrowY === "number") {
        state.arrowX += dx;
        state.arrowY += dy;
    }
    showArrowForComponent(draggingElement);
    
    // Update trace lines if they're shown
    if (showTraceLines) {
        drawTraceLines();
    }
}

function stopDrag() {
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);
    draggingElement = null;
}

// Initialize the canvas when the page loads
document.addEventListener('DOMContentLoaded', initCanvas);

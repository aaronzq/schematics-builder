import { componentDimensions } from './components.js';
import { 
    MIN_CANVAS_WIDTH, 
    MIN_CANVAS_HEIGHT, 
    CANVAS_PADDING_PERCENT, 
    MIN_CANVAS_PADDING, 
    GRID_SIZE 
} from './constants.js';

// Initialize the SVG viewBox
export function initCanvas() {
    const svg = document.getElementById("canvas");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Get the container size and set SVG size
    function resizeSVG() {
    const workspace = document.querySelector('.workspace-area');
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
}

// Calculate the bounding box of all components and adjust viewBox
export function updateCanvasViewBox() {
    const svg = document.getElementById("canvas");
    const components = svg.getElementsByClassName("component");
    if (components.length === 0) {
        return;  // Keep using the initial viewBox set in initCanvas
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Import componentState dynamically to avoid circular imports
    import('./componentManager.js').then(({ componentState }) => {
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

        // Add padding (configurable percentage on each side and ensure minimum size)
        const width = Math.max(maxX - minX, MIN_CANVAS_WIDTH);
        const height = Math.max(maxY - minY, MIN_CANVAS_HEIGHT);
        const padding = {
            x: Math.max(width * CANVAS_PADDING_PERCENT, MIN_CANVAS_PADDING),
            y: Math.max(height * CANVAS_PADDING_PERCENT, MIN_CANVAS_PADDING)
        };

        // Center the viewBox on the bounding box of all components and arrows
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const viewBoxWidth = width + 2 * padding.x;
        const viewBoxHeight = height + 2 * padding.y;
        const viewBoxX = centerX - viewBoxWidth / 2;
        const viewBoxY = centerY - viewBoxHeight / 2;

        svg.setAttribute("viewBox", `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    });
}

// Convert screen coordinates to SVG coordinates
export function screenToSVG(clientX, clientY) {
    const svg = document.getElementById("canvas");
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}

// Snap coordinates to grid
export function snapToGrid(x, y, gridSize = GRID_SIZE) {
    return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize
    };
}

// Mathematical utility functions
// Centralized math operations for coordinate transformations and calculations

// Transform local component coordinates to global canvas coordinates
export function transformToGlobal(localX, localY, componentState) {
    const rotation = (componentState.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    // Get the component's center point
    const dims = componentState.dimensions;
    const centerX = dims.centerPoint.x;
    const centerY = dims.centerPoint.y;
    
    // First, translate point relative to center point
    const relativeX = localX - centerX;
    const relativeY = localY - centerY;
    
    // Apply rotation around center point
    const rotatedX = relativeX * cos - relativeY * sin;
    const rotatedY = relativeX * sin + relativeY * cos;
    
    // Add to world center position (posX/posY now store center coordinates)
    return {
        x: componentState.posX + rotatedX,
        y: componentState.posY + rotatedY
    };
}

// Parse SVG transform attribute to extract translation values
export function parseTransform(transformString) {
    const match = transformString.match(/translate\(([^,]+),([^)]+)\)/);
    return match ? [parseFloat(match[1]), parseFloat(match[2])] : [0, 0];
}

// Calculate angle between two points
export function calculateAngle(fromX, fromY, toX, toY) {
    return Math.atan2(toY - fromY, toX - fromX);
}

// Normalize angle to 0-360 degree range
export function normalizeAngle(angleDegrees) {
    return ((angleDegrees % 360) + 360) % 360;
}

// Snap angle to specified increment
export function snapAngle(angle, increment) {
    return Math.round(angle / increment) * increment;
}

// Calculate distance between two points
export function calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Normalize vector
export function normalizeVector(x, y) {
    const length = Math.sqrt(x * x + y * y);
    return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

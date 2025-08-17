// Component utility functions
// Helper functions for component manipulation and validation

// Helper function to calculate aperture points based on center, upVector, and radius
export function calculateAperturePoints(centerPoint, upVector, apertureRadius) {
    return {
        upper: { 
            x: centerPoint.x + upVector.x * apertureRadius, 
            y: centerPoint.y + upVector.y * apertureRadius 
        },
        lower: { 
            x: centerPoint.x - upVector.x * apertureRadius, 
            y: centerPoint.y - upVector.y * apertureRadius 
        }
    };
}

// Helper function to flip upVector and recalculate aperture points
export function flipUpVector(componentDims) {
    // Create a copy of the component dimensions
    const flippedDims = { ...componentDims };
    
    // Flip the upVector (multiply by -1)
    flippedDims.upVector = { 
        x: -componentDims.upVector.x, 
        y: -componentDims.upVector.y 
    };
    
    // Keep forwardVector unchanged
    flippedDims.forwardVector = { ...componentDims.forwardVector };
    
    // Recalculate aperture points with the flipped upVector
    flippedDims.aperturePoints = calculateAperturePoints(
        componentDims.centerPoint, 
        flippedDims.upVector, 
        componentDims.apertureRadius
    );
    
    return flippedDims;
}

// Helper function to set aperture radius and recalculate aperture points
export function setApertureRadius(componentDims, newApertureRadius) {
    // Create a copy of the component dimensions
    const modifiedDims = { ...componentDims };
    
    // Validate the new aperture radius
    if (typeof newApertureRadius !== 'number' || newApertureRadius < 0) {
        console.warn('Invalid aperture radius. Must be a non-negative number.');
        return componentDims; // Return original if invalid
    }
    
    // Update the aperture radius
    modifiedDims.apertureRadius = newApertureRadius;
    
    // Keep vectors unchanged
    modifiedDims.upVector = { ...componentDims.upVector };
    modifiedDims.forwardVector = { ...componentDims.forwardVector };
    
    // Recalculate aperture points with the new radius
    modifiedDims.aperturePoints = calculateAperturePoints(
        componentDims.centerPoint, 
        componentDims.upVector, 
        newApertureRadius
    );
    
    return modifiedDims;
}

// Helper function to set cone angle
export function setConeAngle(componentDims, newConeAngle) {
    // Create a copy of the component dimensions
    const modifiedDims = { ...componentDims };
    
    // Validate the new cone angle
    if (typeof newConeAngle !== 'number' || newConeAngle < 0 || newConeAngle > 90) {
        console.warn('Invalid cone angle. Must be a number between 0 and 90 degrees.');
        return componentDims; // Return original if invalid
    }
    
    // Update the cone angle
    modifiedDims.coneAngle = newConeAngle;
    
    // Keep other properties unchanged
    modifiedDims.upVector = { ...componentDims.upVector };
    modifiedDims.forwardVector = { ...componentDims.forwardVector };
    modifiedDims.aperturePoints = { ...componentDims.aperturePoints };
    
    return modifiedDims;
}

// Helper function to change ray shape
export function changeComponentRayShape(componentDims, newRayShape) {
    // Valid ray shape values
    const validRayShapes = ['collimated', 'divergent', 'convergent'];
    
    // Validate the new ray shape
    if (!validRayShapes.includes(newRayShape)) {
        console.warn('Invalid ray shape. Must be one of: collimated, divergent, convergent');
        return componentDims; // Return original if invalid
    }
    
    // Create a copy of the component dimensions
    const modifiedDims = { ...componentDims };
    
    // Update the ray shape
    modifiedDims.rayShape = newRayShape;
    
    // Keep all other properties unchanged
    modifiedDims.upVector = { ...componentDims.upVector };
    modifiedDims.forwardVector = { ...componentDims.forwardVector };
    modifiedDims.aperturePoints = { ...componentDims.aperturePoints };
    
    return modifiedDims;
}

// Utility function to get available component types
export function getAvailableComponentTypes(componentsObj) {
    return Object.keys(componentsObj);
}

// Utility function to get valid ray shapes
export function getValidRayShapes() {
    return ['collimated', 'divergent', 'convergent'];
}

// Utility function to check if a component type exists
export function isValidComponentType(type, componentsObj) {
    return componentsObj.hasOwnProperty(type);
}

// Utility function to check if a ray shape is valid
export function isValidRayShape(rayShape) {
    return getValidRayShapes().includes(rayShape);
}

// Validation utilities
// Input validation and error checking functions

import { components } from '../components.js';

// Validate component type
export function validateComponentType(type) {
    if (typeof type !== 'string') {
        return { valid: false, error: 'Component type must be a string' };
    }
    
    if (!components[type]) {
        return { valid: false, error: `Unknown component type: ${type}` };
    }
    
    return { valid: true };
}

// Validate coordinates
export function validateCoordinates(x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') {
        return { valid: false, error: 'Coordinates must be numbers' };
    }
    
    if (!isFinite(x) || !isFinite(y)) {
        return { valid: false, error: 'Coordinates must be finite numbers' };
    }
    
    return { valid: true };
}

// Validate component ID
export function validateComponentId(id) {
    if (id === null || id === undefined) {
        return { valid: false, error: 'Component ID cannot be null or undefined' };
    }
    
    const numId = parseInt(id);
    if (isNaN(numId) || numId < 0) {
        return { valid: false, error: 'Component ID must be a non-negative integer' };
    }
    
    return { valid: true };
}

// Validate rotation angle
export function validateRotation(rotation) {
    if (typeof rotation !== 'number') {
        return { valid: false, error: 'Rotation must be a number' };
    }
    
    if (!isFinite(rotation)) {
        return { valid: false, error: 'Rotation must be a finite number' };
    }
    
    return { valid: true };
}

// Validate component state object
export function validateComponentState(state) {
    if (!state || typeof state !== 'object') {
        return { valid: false, error: 'Component state must be an object' };
    }
    
    const requiredFields = ['posX', 'posY', 'type', 'dimensions'];
    const missingFields = requiredFields.filter(field => !(field in state));
    
    if (missingFields.length > 0) {
        return { valid: false, error: `Missing required fields: ${missingFields.join(', ')}` };
    }
    
    // Validate coordinates
    const coordValidation = validateCoordinates(state.posX, state.posY);
    if (!coordValidation.valid) {
        return coordValidation;
    }
    
    // Validate component type
    const typeValidation = validateComponentType(state.type);
    if (!typeValidation.valid) {
        return typeValidation;
    }
    
    // Validate rotation if present
    if ('rotation' in state) {
        const rotationValidation = validateRotation(state.rotation);
        if (!rotationValidation.valid) {
            return rotationValidation;
        }
    }
    
    return { valid: true };
}

// Validate SVG element
export function validateSVGElement(element) {
    if (!element) {
        return { valid: false, error: 'SVG element cannot be null or undefined' };
    }
    
    if (!(element instanceof SVGElement)) {
        return { valid: false, error: 'Element must be an SVG element' };
    }
    
    return { valid: true };
}

// Validate DOM element exists
export function validateDOMElement(selector) {
    const element = document.getElementById(selector) || document.querySelector(selector);
    if (!element) {
        return { valid: false, error: `Element not found: ${selector}` };
    }
    
    return { valid: true, element };
}

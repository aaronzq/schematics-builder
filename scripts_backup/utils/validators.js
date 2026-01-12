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

// Component class
export class Component {
constructor(typeOrConfig) {
  // If string is passed, load from library
  if (typeof typeOrConfig === 'string') {
    const type = typeOrConfig;
    const definition = components[type];
    if (!definition) {
      throw new Error(`Unknown component type: ${type}`);
    }
    
    // Use library definition as config
    const config = {
      type: type,
      name: definition.name || type,
      width: definition.width,
      height: definition.height,
      centerPoint: definition.centerPoint,
      upVector: definition.upVector,
      forwardVector: definition.forwardVector,
      apertureCenter: definition.apertureCenter,
      apertureRadius: definition.apertureRadius,
      coneAngle: definition.coneAngle,
      rayShape: definition.rayShape,
      drawFunction: definition.draw
    };
    
    // Initialize with library config
    this._initializeFromConfig(config);
  } else {
    // Original behavior: config object passed
    this._initializeFromConfig(typeOrConfig);
  }
}

_initializeFromConfig(config) {
  // Validate required properties 
  if (!config.type) throw new Error('Component type is required');
  if (!config.drawFunction) throw new Error('Draw function is required');

  // ===== Type and Identity =====
  this.type = config.type;
  this.name = config.name || config.type;
  this.id = config.id || this._generateId();

  // ===== Geometric Properties =====
  this.width = config.width || 10;
  this.height = config.height || 60;
  this.centerPoint = config.centerPoint || { x: 0, y: 0 };
  this.forwardVector = config.forwardVector || { x: 1, y: 0 };
  this.apertureCenter = config.apertureCenter || { x: 0, y: 0 };
  this.upVector = config.upVector || { x: 0, y: -1 };
  this.apertureRadius = config.apertureRadius || 15;
  this.coneAngle = config.coneAngle ?? 0;
  this.rayShape = config.rayShape || 'collimated';

  // ===== Position and Orientation (Instance-specific) =====
  this.x = 0;
  this.y = 0;
  this.rotation = 0;
  this.scale = 1;

  // ===== Appearance =====
  this.visible = true;
  this.flipX = false;
  this.flipY = false;

  // ===== SVG Element =====
  this.element = null;
  this.drawFunction = config.drawFunction;
}
}

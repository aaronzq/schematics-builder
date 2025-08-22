import { enableCanvasPan, enableCanvasZoom } from './viewportManager.js';
// Enable right mouse drag-to-pan and mouse wheel zoom after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	enableCanvasPan();
	enableCanvasZoom();
});
// Main application entry point
// Coordinates all modules and provides the public API

// Import all modules
import './eventHandler.js'; // This will initialize the app when DOM loads

// The eventHandler module handles initialization and sets up the global addComponent function
// All other functionality is modularized into their respective files:

// Core modules:
// components.js - Component definitions and drawing functions
// componentManager.js - Component lifecycle (add/remove) and state management  
// viewportManager.js - Viewport management and coordinate transformations
// interactionHandler.js - Drag, rotation, and interaction functionality
// arrowDisplay.js - Arrow display and rotation controls
// traceLines.js - Trace line visualization
// eventHandler.js - Event management and application initialization

// Component sub-modules (in modules/):
// modules/componentAperture.js - Aperture scaling functionality
// modules/componentHierarchy.js - Parent-child relationship management
// modules/componentPlacement.js - Component positioning and placement logic
// modules/componentRenderer.js - SVG rendering and visual elements

// The application uses a clean modular architecture with clear separation of concerns

console.log('Optical Schematic Builder initialized with modular architecture');

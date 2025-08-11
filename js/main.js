// Main application entry point
// Coordinates all modules and provides the public API

// Import all modules
import './eventHandler.js'; // This will initialize the app when DOM loads

// The eventHandler module handles initialization and sets up the global addComponent function
// All other functionality is modularized into their respective files:

// components.js - Component definitions and drawing functions
// componentManager.js - Component lifecycle (add/remove) and state management  
// canvasManager.js - Canvas/viewport management and coordinate transformations
// dragHandler.js - Drag and drop functionality
// arrowHandler.js - Arrow display and rotation controls
// traceLines.js - Trace line visualization
// eventHandler.js - Event management and application initialization

// The application is now fully modular with clear separation of concerns:
// 1. Component definitions are isolated and easily extensible
// 2. Component lifecycle management is centralized 
// 3. Canvas operations are abstracted
// 4. Drag operations are self-contained
// 5. Arrow/rotation logic is separated
// 6. Trace lines are their own feature module
// 7. Event handling is centralized and coordinates all modules

console.log('Optical Schematic Builder initialized with modular architecture');

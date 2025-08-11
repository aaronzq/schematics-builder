# Schematics Builder 

## Root Files

### Core Application Files
- **`main.js`** - Application entry point and module coordination
- **`eventHandler.js`** - Centralized event management and app initialization
- **`componentManager.js`** - Core component lifecycle management (refactored from 643 to 216 lines)
- **`components.js`** - Component definitions and drawing functions
- **`constants.js`** - Application constants and configuration
- **`traceLines.js`** - Trace line visualization and optical path calculations

### Feature Modules  
- **`viewportManager.js`** - Viewport management and coordinate transformations (renamed from canvasManager.js)
- **`interactionHandler.js`** - Drag, rotation, and user interactions (renamed from dragHandler.js)  
- **`arrowDisplay.js`** - Arrow display and rotation controls (renamed from arrowHandler.js)

## Modular Sub-components (`/modules/`)

These are focused, single-responsibility modules extracted from the original monolithic componentManager:

- **`componentAperture.js`** - Aperture scaling calculations and recursive updates
- **`componentHierarchy.js`** - Parent-child relationship management  
- **`componentPlacement.js`** - Component positioning and placement logic
- **`componentRenderer.js`** - SVG DOM manipulation and visual rendering

## Utility Modules (`/utils/`)

- **`mathUtils.js`** - Mathematical calculations and transformations
- **`svgUtils.js`** - SVG marker creation and management
- **`validators.js`** - Input validation and error checking


## Import Structure

```
main.js
├── eventHandler.js
    ├── componentManager.js
    │   ├── modules/componentPlacement.js
    │   ├── modules/componentHierarchy.js  
    │   ├── modules/componentAperture.js
    │   └── modules/componentRenderer.js
    ├── viewportManager.js
    ├── interactionHandler.js
    ├── arrowDisplay.js
    ├── traceLines.js
    └── components.js
```



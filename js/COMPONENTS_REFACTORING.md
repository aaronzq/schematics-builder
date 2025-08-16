# Components Refactoring

## Overview
The component-related scripts have been refactored to separate concerns and improve maintainability for collaboration.

## File Structure

### `components.js`
**Purpose**: Main component definitions file for collaborators
**Contains**:
- `componentDimensions`: Object defining dimensions, properties, and physics for each component type
- `components`: Object containing drawing functions for each component type

**Usage**: This file should be the primary location for adding, removing, or modifying user-defined components.

### `componentUtils.js`
**Purpose**: Utility functions for component manipulation and validation
**Contains**:
- `calculateAperturePoints()`: Calculate aperture points based on center, upVector, and radius
- `flipComponentUpVector()`: Flip component upVector and recalculate aperture points
- `changeComponentApertureRadius()`: Change aperture radius and recalculate points
- `changeComponentRayShape()`: Change ray shape with validation
- `getAvailableComponentTypes()`: Get list of available component types
- `getValidRayShapes()`: Get list of valid ray shapes
- `isValidComponentType()`: Check if component type exists
- `isValidRayShape()`: Check if ray shape is valid

## Migration Notes
- Import statements have been updated in affected files
- Utility functions now accept component objects as parameters to avoid circular dependencies
- The main `components.js` file is now focused solely on component definitions and drawings

## For Collaborators
When adding new components:
1. Add dimension definition to `componentDimensions` in `components.js`
2. Add drawing function to `components` in `components.js`
3. Use utility functions from `componentUtils.js` for component manipulation

# Ray Drawing Function Analysis: Legacy vs Current Implementation

**Date:** February 9, 2026  
**Focus:** Ray drawing functionality for optical schematics

---

## Executive Summary

This document provides a detailed comparison between the **legacy implementation** (scripts_backup/) and the **current implementation** (scripts/) with special emphasis on ray drawing functionality that will be reimplemented in the coming days.

### Key Finding
The legacy version had a **comprehensive ray drawing system** with multiple ray shapes, gradient rendering, and interactive UI controls. The current version has **only basic skeleton code** for trace lines and no actual ray rendering implementation yet.

---

## 1. Legacy Implementation (scripts_backup/)

### 1.1 Core Ray Drawing Architecture

#### **File: `rays.js` (426 lines)**

##### **Main Function: `drawApertureRays()`**
- **Purpose**: Renders aperture rays connecting parent-child component relationships
- **Complexity**: High - handles multiple ray types, gradients, and display modes

##### **Key Features:**

1. **Ray Display Modes** (via `rayDisplayMode` variable):
   - `'both'`: Shows both dotted outlines and solid filled polygons
   - `'dotted'`: Shows only dotted ray outlines
   - `'solid'`: Shows only filled ray polygons

2. **Ray Shapes** (4 types per component):
   - **`collimated`**: Parallel rays from parent aperture to child aperture
     - Upper parent → Upper child
     - Lower parent → Lower child
   
   - **`divergent`**: Expanding rays from parent center
     - Parent center → Upper child
     - Parent center → Lower child
   
   - **`convergent`**: Focusing rays to child center
     - Upper parent → Child center
     - Lower parent → Child center
   
   - **`manual`**: User-controlled aperture with custom radius
     - Same geometry as collimated but aperture radius is manually adjustable

3. **Multi-Ray Support**: Each component can have **multiple ray layers**
   - Arrays: `rayShape[]`, `rayPolygonColor[]`, `rayPolygonColor2[]`, `gradientEnabled[]`
   - Each index represents a separate ray layer with independent properties

4. **Gradient Rendering** (complex implementation):
   - **Perpendicular gradient**: Gradient runs perpendicular to ray direction
   - **Calculation**:
     - Uses `calculateProjections_internal()` to determine ray width
     - Creates SVG `linearGradient` with 5 color stops
     - Interpolates between `color1` and `color2` in HSL color space
     - Handles edge cases (near-zero projections, invalid coordinates)
   - **Fallback**: Uses solid color when gradient calculation fails

5. **Polygon Ray Rendering**:
   ```javascript
   // Creates 4-point polygon for filled rays
   points = `${uStart.x},${uStart.y} ${uEnd.x},${uEnd.y} 
             ${lEnd.x},${lEnd.y} ${lStart.x},${lStart.y}`
   ```

6. **Dotted Outline Rendering**:
   - Draws two dashed lines for upper and lower ray boundaries
   - Stroke: black, width: 1px, dasharray: "3,3"

##### **Ray Shape Menu Integration:**
```javascript
export function initRayShapeMenuIntegration(hideMenu, showMenu, shouldShow, getSelected)
```
- Allows circular dependency resolution between `rays.js` and `rayMenu.js`

##### **Toggle Functions:**
- `toggleApertureRays()`: Show/hide all aperture rays
- `toggleSolidRays()`: Cycle through display modes
- `toggleRaysIntegrated()`: Integrated toggle with UI button

---

#### **File: `traceLines.js` (109 lines)**

##### **Main Function: `drawCenterTraceLines()`**
- **Purpose**: Draws black dotted lines connecting parent and child center points
- **Visual Style**: 
  - Black stroke
  - Width: 1px
  - Dasharray: "5,5"
  - No pointer events

##### **Architecture:**
- Simple iteration through `componentState` object
- Connects `parentCenter` to `childCenter` for each parent-child pair
- Inserted **before** components group so lines appear behind components

##### **Legacy Compatibility:**
- `drawTraceLines()`: Calls both center lines and aperture rays
- `hideTraceLines()`: Hides both
- `updateTraceLines()`: Updates both if visible

---

#### **File: `rayMenu.js` (745 lines) - COMPLEX UI**

##### **Purpose**: Interactive UI for ray configuration per component

##### **Key Features:**

1. **Menu Structure**:
   - Banner-style menu at top of canvas
   - One row per ray layer
   - Dynamic width matching canvas

2. **Per-Ray Controls** (for each ray index):
   
   a. **Ray Shape Dropdown**:
   ```javascript
   validRayShapes.forEach(shape => {
     // Options: collimated, divergent, convergent, manual
   })
   ```
   - Changes aperture calculation behavior
   - First ray (index 0) triggers aperture auto-scaling

   b. **Manual Aperture Radius Slider** (only for `manual` mode):
   - Range: 0 to 50
   - Step: 0.1
   - Real-time updates with cone angle recalculation

   c. **Hue Slider** (single or dual-knob):
   - **Single mode**: Standard range input (0-359°)
   - **Dual mode** (gradient enabled): Custom dual-knob implementation
     - Two draggable knobs for color1 and color2
     - Background slider shows full hue spectrum
     - Selected knob enlarges (20px vs 16px)
     - Real-time position calculation

   d. **Hue Input Field**:
   - Number input (0-359)
   - Updates selected knob in dual mode

   e. **Gradient Toggle Button**:
   - Visual gradient icon rectangle
   - Switches between solid and gradient fill
   - Re-renders menu when toggled

   f. **Color Swatch Button** (🎨):
   - Opens popup showing all used colors in scene
   - Excludes root component colors
   - Click to apply color to current ray
   - Auto-close on outside click

   g. **Add/Remove Buttons**:
   - `+` button on last row to add new ray layer
   - `−` button on each row (except when only 1 ray) to remove

3. **Slider Active Flag**:
   ```javascript
   let isSliderActive = false;
   ```
   - Prevents menu flickering during slider drag
   - Set during mousedown/mouseup events

4. **Color System**:
   - HSL-based color manipulation
   - RGB ↔ HEX ↔ HSL conversions
   - Gradient interpolation in HSL space for smooth transitions

5. **Event Handling**:
   - Shape change → aperture recalculation + recursive child updates
   - Hue slider → real-time ray redraw
   - Gradient toggle → menu re-render
   - Swatch click → color application

---

#### **File: `arrows.js` (149 lines)**

##### **Purpose**: Arrow positioning handle for component placement (not ray drawing)

##### **Features:**
- Draggable arrow handle at component forward direction
- Rotation handle for selected components
- Stores arrow endpoint in `state.arrowX/arrowY`
- Uses marker-end for arrowhead rendering

---

### 1.2 Supporting Modules

#### **File: `modules/componentAperture.js` (729 lines) - CRITICAL**

##### **Core Function: `calculateOptimalAperture()`**
- **Purpose**: Single source of truth for aperture scaling logic
- **Returns**: Optimized dimensions with scaled aperture and updated cone angle

##### **Ray Shape Policies:**

1. **Collimated Rays**:
   - Uses projection-based scaling
   - `targetProjection / currentChildProjection = scalingRatio`
   - `optimalRadius = currentRadius × scalingRatio`
   - Cone angle = 0°

2. **Divergent Rays**:
   - **First time** (no stored cone angle): Calculate from geometry
   - **Subsequent times**: Use stored cone angle + scale aperture
   - **Inheritance**: Inherits parent's cone angle if parent is divergent/convergent
   - Formula: `targetApertureProjection = centerLineLength × tan(coneAngle)`
   - Required radius: `targetProjection / projectionFactor`

3. **Convergent Rays**:
   - **Always** recalculates cone angle from current geometry
   - Uses parent aperture projection for cone angle calculation
   - `coneAngle = atan(parentApertureProjection / centerLineLength)`
   - Then scales aperture based on calculated cone angle

4. **Manual Rays**:
   - **No auto-scaling** of aperture radius
   - Only updates cone angle based on current geometry
   - User maintains full control via radius slider

##### **Helper Functions:**

- `calculateProjections_internal()`: Calculates aperture projections
  - Transforms upVectors to global coordinates
  - Projects onto perpendicular direction to center trace line
  - Returns projection factors for scaling calculations

- `calculateConeAngleFromGeometry()`: Geometric cone angle calculation
  - Uses `atan(parentApertureProjection / centerLineLength)`
  - Validates range (0-90°)

- `handleCrossing()`: Prevents aperture line crossing
  - Tests both normal and flipped orientations
  - Automatically flips upVector if crossing detected

- `checkLinesCross()`: Line intersection detection
  - Uses parametric line equations
  - Returns true if aperture lines intersect between endpoints

- `autoScaleForNewComponentPlacement()`: Scales aperture during creation
- `autoScaleForComponentDragRotation()`: Scales aperture during interaction
- `recursivelyUpdateChildrenApertures()`: Updates entire component tree

---

#### **File: `modules/componentUtils.js`**

##### **Aperture Manipulation Functions:**

```javascript
export function calculateAperturePoints(centerPoint, upVector, apertureRadius)
```
- Calculates upper and lower aperture point positions

```javascript
export function flipUpVector(componentDims)
```
- Flips upVector and recalculates aperture points

```javascript
export function setApertureRadius(componentDims, newApertureRadius)
```
- Updates aperture radius and recalculates points

```javascript
export function setConeAngle(componentDims, newConeAngle)
```
- Updates cone angle property

---

### 1.3 Data Structure (Legacy)

#### **Component State Object:**
```javascript
componentState[compId] = {
  type: 'beam_splitter',
  posX: 100,
  posY: 200,
  rotation: 45,
  
  // Parent-child relationships
  parentId: 5,           // null for root component
  children: [7, 9, 12],  // Array of child component IDs
  
  // Aperture and ray properties
  dimensions: {
    centerPoint: { x: 0, y: 0 },
    upVector: { x: 0, y: -1 },
    apertureRadius: 15,
    aperturePoints: {
      upper: { x: 0, y: -15 },
      lower: { x: 0, y: 15 }
    },
    coneAngle: 10.5,
    rayShape: 'divergent'  // Stored in dimensions for single ray
  },
  
  // Multi-ray support (overrides dimensions.rayShape)
  rayShape: ['divergent', 'collimated', 'convergent'],
  rayPolygonColor: ['#00ffff', '#ff00ff', '#ffff00'],
  rayPolygonColor2: ['#0000ff', '#ff0000', '#00ff00'],
  gradientEnabled: [true, false, true],
  
  // Arrow handle
  arrowX: 150,
  arrowY: 200,
  
  // Selection state
  selected: false
}
```

---

### 1.4 Integration Points (Legacy)

#### **eventHandler.js**:
- Imports ray drawing functions
- Updates rays on component drag/rotation/scale
- Shows/hides ray menu based on selection

#### **main.js**:
- Imports and exposes ray toggle functions
- Registers event listeners for UI buttons

#### **componentManager.js**:
- Updates rays after component add/remove
- Exports schematic with ray properties

---

## 2. Current Implementation (scripts/)

### 2.1 Existing Ray Infrastructure

#### **File: `rays/DrawRays.js` (13 lines) - SKELETON ONLY**

```javascript
import { drawTraceLines } from './TraceLines.js';

export function updateRays(sourceId = null) {
    drawTraceLines();
    // Future: traceOpticalRays(); 
}
```

**Status**: Placeholder with no actual ray drawing implementation

---

#### **File: `rays/TraceLines.js` (91 lines) - BASIC IMPLEMENTATION**

##### **Function: `drawTraceLines()`**
- Similar to legacy but adapted to new architecture
- Uses `componentManager.components` (Map-based storage)
- Gets positions via `component.getPosition()` method
- Creates/updates trace-lines-group

##### **Differences from Legacy:**
- Uses class-based Component objects instead of state objects
- Accesses parent via `component.parent` property (ID reference)
- Uses `componentManager.getComponent()` for lookups

##### **Toggle Functions:**
- `toggleTraceLines()`: Show/hide center lines
- `updateTraceLines()`: Refresh if visible
- `hideTraceLines()`: Clear trace lines group

---

### 2.2 Component Architecture (Current)

#### **File: `components/Component.js` (382 lines) - CLASS-BASED**

##### **Class Structure:**
```javascript
export class Component {
  constructor(typeOrConfig) {
    // Geometry
    this.width = 10;
    this.height = 60;
    this.centerPoint = { x: 0, y: 0 };
    this.forwardVector = { x: 1, y: 0 };
    this.upVector = { x: 0, y: -1 };
    
    // Aperture
    this.apertureCenter = { x: 0, y: 0 };
    this.apertureRadius = 15;
    this.aperturePoints = [];  // Array of {x, y}
    
    // Ray properties
    this.coneAngle = 0;
    this.rayShape = 'collimated';
    
    // Transform
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.scale = 1;
    
    // Relationships
    this.parent = null;         // Component ID reference
    this.children = [];         // Array of IDs
    
    // Multi-selection grouping
    this.isGrouped = false;
    this.groupMembers = new Set();
    
    // SVG elements
    this.element = null;
    this.shapeGroup = null;
    this.debugGroup = null;
    this.drawFunction = null;
  }
}
```

##### **Methods:**
- `setPosition(x, y)`, `getPosition()`
- `setRotation(angle)`, `getRotation()`
- `setScale(scale)`, `getScale()`
- `setVisible(visible)`, `isVisible()`
- `setParent(parentId)`, `getParent()`
- `addChild(childId)`, `removeChild(childId)`, `getChildren()`
- `render(canvas)`: Renders component to SVG
- `updateDebugDrawings()`: Updates debug markers (center, up vector, aperture points)

##### **Aperture Points Calculation:**
```javascript
_getAperturePoints() {
  const numPoints = 2;
  for (let i = 0; i < numPoints; i++) {
    const t = 1 - (i / (numPoints - 1)) * 2;  // Range: 1 to -1
    points.push({
      x: apertureCenter.x + upVector.x * t * apertureRadius,
      y: apertureCenter.y + upVector.y * t * apertureRadius
    });
  }
}
```

---

#### **File: `components/ComponentManager.js`**

##### **Data Storage:**
```javascript
class ComponentManager {
  constructor() {
    this.components = new Map();  // id → Component instance
    this.nextId = 1;
  }
}
```

##### **Methods:**
- `addComponent(component)`: Adds to Map, sets parent/child relationships
- `removeComponent(componentId)`: Removes and updates relationships
- `getComponent(id)`: Returns Component instance or null
- `getAllComponents()`: Returns array of all components

---

### 2.3 Configuration (Current)

#### **File: `config.js`**

```javascript
// Aperture settings
export const DEFAULT_APERTURE_RADIUS = 15;
export const APERTURE_POINT_RADIUS = 3;
export const LOWER_APERTURE_POINT_RADIUS = 2;

// Ray rendering
export const DEFAULT_SOLID_RAY_COLOR = '#00ffff';
export const DEFAULT_RAY_POLYGON_OPACITY = 0.2;

// Ray shapes
export const RAY_SHAPES = {
  COLLIMATED: 'collimated',
  DIVERGENT: 'divergent',
  CONVERGENT: 'convergent',
  MANUAL: 'manual'
};

// Handle types
export const HANDLE_TYPES = {
  APERTURE: 'aperture',
  ROTATION: 'rotation',
  ARROW: 'arrow'
};
```

---

### 2.4 Missing from Current Implementation

1. **No actual ray polygon rendering**
2. **No ray shape menu UI**
3. **No multi-ray support** (no arrays for rayShape, colors, etc.)
4. **No gradient rendering**
5. **No aperture auto-scaling logic**
6. **No cone angle calculations**
7. **No projection-based scaling**
8. **No ray display mode toggle** (dotted/solid/both)
9. **No color picker UI**
10. **No recursive aperture updates**

---

## 3. Detailed Behavioral Analysis

### 3.1 Ray Drawing Workflow (Legacy)

#### **Step 1: Component Placement**
```
User clicks arrow handle
  ↓
Calculate placement position
  ↓
autoScaleForNewComponentPlacement()
  ↓
calculateOptimalAperture()
  ↓
Apply scaled aperture to new component
  ↓
drawApertureRays()
```

#### **Step 2: Component Drag/Rotation**
```
User drags or rotates component
  ↓
Update component position/rotation
  ↓
autoScaleForComponentDragRotation()
  ↓
calculateOptimalAperture()
  ↓
recursivelyUpdateChildrenApertures()
  ↓
drawApertureRays()
  ↓
updateAperturePointDrawings() for visual feedback
```

#### **Step 3: Ray Shape Change**
```
User changes rayShape dropdown (rayMenu)
  ↓
Update state.rayShape[index]
  ↓
If index === 0:
  - autoScaleForComponentDragRotation()
  - recursivelyUpdateChildrenApertures()
  ↓
drawApertureRays()
  ↓
Re-render menu (if mode changed to/from 'manual')
```

#### **Step 4: Color Change**
```
User drags hue slider or inputs hue value
  ↓
Update HSL hue value
  ↓
Convert to RGB
  ↓
Convert to HEX
  ↓
Update state.rayPolygonColor[index]
  ↓
drawApertureRays() [real-time during drag]
```

#### **Step 5: Gradient Toggle**
```
User clicks gradient button
  ↓
Toggle state.gradientEnabled[index]
  ↓
Re-render menu (show/hide second color picker)
  ↓
drawApertureRays()
```

---

### 3.2 Aperture Scaling Algorithms (Legacy)

#### **Collimated Ray Scaling:**
```
Input: childState, parentState

1. Calculate projections:
   childProjection = childRadius × |childUpVector · perpDirection|
   parentProjection = parentRadius × |parentUpVector · perpDirection|

2. Calculate scaling ratio:
   scalingRatio = parentProjection / childProjection

3. Calculate optimal radius:
   optimalRadius = currentRadius × scalingRatio

4. Validate and apply:
   if (optimalRadius > 0 && optimalRadius <= 200):
     return setApertureRadius(childDims, optimalRadius)
```

#### **Divergent Ray Scaling:**
```
Input: childState, parentState, centerLineLength

Case 1: Parent is collimated
  If child has stored cone angle:
    - Use stored cone angle
    - Calculate: targetProjection = centerLineLength × tan(coneAngle)
    - Calculate: requiredRadius = targetProjection / projectionFactor
  Else (first time):
    - Calculate cone angle from current geometry
    - Store cone angle
    - Keep current aperture radius

Case 2: Parent is divergent/convergent
  - Inherit parent's cone angle
  - Calculate: targetProjection = centerLineLength × tan(parentConeAngle)
  - Calculate: requiredRadius = targetProjection / projectionFactor
```

#### **Convergent Ray Scaling:**
```
Input: childState, parentState, centerLineLength

Always:
  1. Calculate cone angle from current geometry:
     coneAngle = atan(parentApertureProjection / centerLineLength)
  
  2. Calculate target projection:
     targetProjection = centerLineLength × tan(coneAngle)
  
  3. Calculate required radius:
     requiredRadius = targetProjection / projectionFactor
  
  4. Apply both cone angle and radius
```

#### **Manual Ray Behavior:**
```
Input: childState, parentState, centerLineLength

1. Do NOT auto-scale aperture radius
2. Update cone angle only:
   coneAngle = atan(|parentProj - childProj| / centerLineLength)
3. User controls radius via slider
```

---

### 3.3 Projection Calculation (Legacy)

```javascript
function calculateProjections_internal(childState, parentState) {
  // 1. Get global center positions
  childCenter = transformToGlobal(childDims.centerPoint, childState)
  parentCenter = transformToGlobal(parentDims.centerPoint, parentState)
  
  // 2. Calculate center trace line direction
  traceDx = childCenter.x - parentCenter.x
  traceDy = childCenter.y - parentCenter.y
  traceLength = sqrt(traceDx² + traceDy²)
  
  // 3. Calculate perpendicular direction
  traceUnitX = traceDx / traceLength
  traceUnitY = traceDy / traceLength
  perpUnitX = -traceUnitY
  perpUnitY = traceUnitX
  
  // 4. Transform upVectors to global coordinates (rotate by component rotation)
  childGlobalUp = rotate(childUpVector, childState.rotation)
  parentGlobalUp = rotate(parentUpVector, parentState.rotation)
  
  // 5. Calculate projection factors (dot product with perpendicular)
  childUpProjection = |childGlobalUp · perpUnit|
  parentUpProjection = |parentGlobalUp · perpUnit|
  
  // 6. Calculate aperture projections
  childApertureProjection = childRadius × childUpProjection
  parentApertureProjection = parentRadius × parentUpProjection
  
  return {
    child: { apertureProjection, upProjectionFactor },
    parent: { apertureProjection, upProjectionFactor }
  }
}
```

---

### 3.4 Gradient Rendering Algorithm (Legacy)

```javascript
function renderGradient(compId, rayIndex, color1, color2, childState, parentState) {
  // 1. Calculate ray width from projections
  projections = calculateProjections_internal(childState, parentState)
  rayWidth = max(projections.parent.apertureProjection, 
                 projections.child.apertureProjection)
  
  // 2. Calculate ray direction from parent center to child center
  rayDx = childCenter.x - parentCenter.x
  rayDy = childCenter.y - parentCenter.y
  rayLength = sqrt(rayDx² + rayDy²)
  
  // 3. Calculate perpendicular direction for gradient
  perpDx = -rayDy / rayLength
  perpDy = rayDx / rayLength
  
  // 4. Calculate gradient center (midpoint of ray)
  gradientCenterX = (parentCenter.x + childCenter.x) / 2
  gradientCenterY = (parentCenter.y + childCenter.y) / 2
  
  // 5. Calculate gradient endpoints
  gradientExtent = rayWidth / 1
  x1 = gradientCenterX - perpDx × gradientExtent
  y1 = gradientCenterY - perpDy × gradientExtent
  x2 = gradientCenterX + perpDx × gradientExtent
  y2 = gradientCenterY + perpDy × gradientExtent
  
  // 6. Create SVG gradient with 5 color stops
  gradient.setAttribute("x1", x1)
  gradient.setAttribute("y1", y1)
  gradient.setAttribute("x2", x2)
  gradient.setAttribute("y2", y2)
  
  // 7. Interpolate colors in HSL space
  hsl1 = rgbToHsl(hexToRgb(color1))
  hsl2 = rgbToHsl(hexToRgb(color2))
  
  for (stopIndex = 0 to 4) {
    ratio = stopIndex / 4  // 0, 0.25, 0.5, 0.75, 1.0
    interpolatedHue = hsl1.h + (hsl2.h - hsl1.h) × ratio
    interpolatedSat = (hsl1.s + hsl2.s) / 2
    interpolatedLight = (hsl1.l + hsl2.l) / 2
    
    interpolatedColor = hslToRgb(interpolatedHue, interpolatedSat, interpolatedLight)
    stop.setAttribute("offset", `${ratio × 100}%`)
    stop.setAttribute("stop-color", rgbToHex(interpolatedColor))
    stop.setAttribute("stop-opacity", DEFAULT_RAY_POLYGON_OPACITY)
  }
}
```

---

## 4. Implementation Recommendations

### 4.1 Immediate Next Steps

#### **Phase 1: Basic Ray Rendering (Day 1-2)**

1. **Create `DrawApertureRays.js` in scripts/rays/**
   - Implement basic `drawApertureRays()` function
   - Support single ray per component initially
   - Implement collimated ray shape only
   - Use solid color (no gradients yet)
   - Support dotted outline mode

2. **Extend Component class**
   ```javascript
   // Add to Component.js
   this.rayPolygonColor = '#00ffff';
   this.rayPolygonOpacity = 0.2;
   ```

3. **Update `updateRays()` in DrawRays.js**
   ```javascript
   export function updateRays(sourceId = null) {
       drawTraceLines();
       drawApertureRays();  // NEW
   }
   ```

4. **Add toggle button to UI**
   - Button to show/hide aperture rays
   - Button to toggle display mode (dotted/solid/both)

---

#### **Phase 2: Multiple Ray Shapes (Day 3-4)**

1. **Implement ray shape geometry**
   - Divergent rays (parent center to child apertures)
   - Convergent rays (parent apertures to child center)
   - Manual rays (same as collimated but no auto-scaling)

2. **Create `ApertureCalculations.js` in scripts/utils/**
   - Port `calculateProjections_internal()`
   - Port `calculateOptimalAperture()`
   - Adapt to class-based Component structure

3. **Add ray shape property UI**
   - Simple dropdown in debug panel or component properties
   - Update `drawApertureRays()` when ray shape changes

---

#### **Phase 3: Aperture Auto-Scaling (Day 5-7)**

1. **Port aperture scaling logic**
   - Implement projection-based scaling for collimated
   - Implement cone-based scaling for divergent/convergent
   - Add cone angle calculation and storage

2. **Add scaling triggers**
   - Component creation: `autoScaleForNewComponentPlacement()`
   - Component drag/rotation: `autoScaleForComponentDragRotation()`
   - Recursive updates: `recursivelyUpdateChildrenApertures()`

3. **Update Component class**
   ```javascript
   this.coneAngle = 0;  // Already exists
   // Add methods:
   setConeAngle(angle) { ... }
   setApertureRadius(radius) { ... }
   calculateOptimalAperture(parent) { ... }
   ```

---

#### **Phase 4: Advanced Features (Day 8-10)**

1. **Multi-ray support**
   ```javascript
   // Add to Component class
   this.rayLayers = [{
     shape: 'collimated',
     color: '#00ffff',
     color2: '#ff00ff',
     gradientEnabled: false
   }];
   ```

2. **Gradient rendering**
   - Port gradient calculation algorithm
   - Create SVG gradients in `<defs>`
   - Handle edge cases (zero projections, etc.)

3. **Ray shape menu UI**
   - Create `RayMenu.js` component
   - Implement color picker with hue slider
   - Add dual-knob slider for gradients
   - Add color swatch popup

---

### 4.2 Architecture Considerations

#### **Use Class Methods:**
```javascript
class Component {
  // Current method-based approach is good
  calculateApertureProjection(perpDirection) {
    const globalUp = this.getGlobalUpVector();
    return this.apertureRadius * Math.abs(
      globalUp.x * perpDirection.x + 
      globalUp.y * perpDirection.y
    );
  }
  
  getGlobalUpVector() {
    const rad = this.rotation * Math.PI / 180;
    return {
      x: this.upVector.x * Math.cos(rad) - this.upVector.y * Math.sin(rad),
      y: this.upVector.x * Math.sin(rad) + this.upVector.y * Math.cos(rad)
    };
  }
}
```

#### **Event System:**
```javascript
// Consider using events for ray updates
componentManager.on('component:moved', (component) => {
  updateRays(component.id);
});

componentManager.on('component:rotated', (component) => {
  updateRays(component.id);
});
```

#### **Performance:**
- Ray rendering can be expensive with many components
- Consider caching gradient SVG definitions
- Use `requestAnimationFrame` for smooth updates during drag
- Only update visible rays (viewport culling if needed)

---

### 4.3 Data Migration

#### **Legacy → Current Mapping:**

| Legacy (componentState)        | Current (Component class)     |
|-------------------------------|-------------------------------|
| `state.posX/posY`             | `component.x/y`               |
| `state.rotation`              | `component.rotation`          |
| `state.parentId`              | `component.parent` (ID)       |
| `state.children[]`            | `component.children[]`        |
| `state.dimensions`            | Component class properties    |
| `state.rayShape[]`            | `component.rayLayers[].shape` |
| `state.rayPolygonColor[]`     | `component.rayLayers[].color` |
| `state.gradientEnabled[]`     | `component.rayLayers[].gradientEnabled` |

---

### 4.4 Testing Strategy

1. **Unit Tests for Calculations:**
   - Test projection calculations with various component orientations
   - Test cone angle calculations
   - Test scaling ratios

2. **Visual Regression Tests:**
   - Compare rendered rays against legacy version
   - Test with example JSON files

3. **Integration Tests:**
   - Test ray updates during component drag
   - Test recursive aperture updates
   - Test ray shape changes

4. **Edge Cases:**
   - Zero-length center line
   - Components at same position
   - 90° rotations (edge-on orientations)
   - Very large aperture radii

---

## 5. Key Differences Summary

| Aspect                  | Legacy (scripts_backup)              | Current (scripts)                |
|------------------------|--------------------------------------|----------------------------------|
| **Architecture**       | Object-based `componentState`        | Class-based `Component`          |
| **Storage**            | Plain object with ID keys            | `Map<id, Component>`             |
| **Ray Rendering**      | Full implementation (426 lines)      | Skeleton only (13 lines)         |
| **Ray Shapes**         | 4 types fully implemented            | Not implemented                  |
| **Multi-ray**          | Full support with arrays             | Not implemented                  |
| **Gradients**          | Complex perpendicular gradients      | Not implemented                  |
| **Aperture Scaling**   | Sophisticated projection-based       | Not implemented                  |
| **Ray UI**             | Complex 745-line menu                | Not implemented                  |
| **Trace Lines**        | Basic implementation                 | Basic implementation (similar)   |
| **Color System**       | HSL-based with conversions           | Not implemented                  |
| **Display Modes**      | 3 modes (dotted/solid/both)          | Not implemented                  |

---

## 6. Code Snippets Reference

### 6.1 Key Legacy Functions to Port

#### **Ray Polygon Creation:**
```javascript
// From rays.js lines 113-124
const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
const points = `${uStart.x},${uStart.y} ${uEnd.x},${uEnd.y} ${lEnd.x},${lEnd.y} ${lStart.x},${lStart.y}`;
polygon.setAttribute("points", points);
polygon.setAttribute("fill", fillColor);
polygon.setAttribute("fill-opacity", DEFAULT_RAY_POLYGON_OPACITY);
polygon.setAttribute("stroke", "none");
polygon.setAttribute("pointer-events", "none");
```

#### **Projection Calculation:**
```javascript
// From componentAperture.js lines 468-514
const childGlobalUpX = childUpVector.x * Math.cos(childState.rotation * Math.PI / 180) - 
                      childUpVector.y * Math.sin(childState.rotation * Math.PI / 180);
const childGlobalUpY = childUpVector.x * Math.sin(childState.rotation * Math.PI / 180) + 
                      childUpVector.y * Math.cos(childState.rotation * Math.PI / 180);

const childUpProjection = Math.abs(childGlobalUpX * perpUnitX + childGlobalUpY * perpUnitY);
const childApertureProjection = childApertureRadius * childUpProjection;
```

#### **Gradient Creation:**
```javascript
// From rays.js lines 178-237
const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
gradient.setAttribute("id", gradientId);
gradient.setAttribute("gradientUnits", "userSpaceOnUse");
gradient.setAttribute("x1", x1);
gradient.setAttribute("y1", y1);
gradient.setAttribute("x2", x2);
gradient.setAttribute("y2", y2);

for (let stopIndex = 0; stopIndex < 5; stopIndex++) {
    const ratio = stopIndex / 4;
    const interpolatedHue = hsl1.h + (hsl2.h - hsl1.h) * ratio;
    const interpolatedRgb = hslToRgb(interpolatedHue, interpolatedSat, interpolatedLight);
    
    stop.setAttribute("offset", `${ratio * 100}%`);
    stop.setAttribute("stop-color", rgbToHex(interpolatedRgb.r, interpolatedRgb.g, interpolatedRgb.b));
    stop.setAttribute("stop-opacity", DEFAULT_RAY_POLYGON_OPACITY);
}
```

---

## 7. Conclusion

The legacy implementation provides a **comprehensive ray drawing system** with sophisticated features including:
- Multiple ray shapes with different geometric behaviors
- Projection-based automatic aperture scaling
- Complex gradient rendering perpendicular to ray direction
- Interactive UI with dual-knob color pickers
- Multi-ray layer support

The current implementation has **only trace lines** and needs complete ray rendering functionality built from scratch, adapting the legacy logic to the new class-based architecture.

**Estimated Implementation Time:** 8-10 days for full feature parity
**Priority Order:** Basic rendering → Ray shapes → Aperture scaling → Advanced features (gradients, UI)

---

**Document End**

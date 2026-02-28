# Optical Schematics Builder - Architecture & Implementation Guide

## Core Philosophy

**Component-Centric Design**: The application is built around components as the primary data structure. Components contain all information needed to replicate schematics: position, rotation, scale, hierarchy relationships, aperture properties, and ray configurations. Rays are synthesized from component properties—they are not independent entities.

**Interactive Workflow**: Users build optical paths by sequentially selecting and spawning components:
1. Click a component in library → spawns with an arrow handle
2. Arrow indicates where next component will spawn (adjustable)
3. Select component → becomes "current" (parent for next spawn)
4. Add next component → becomes child of current
5. Drag, rotate, scale components → rays update automatically
6. Build tree structures by changing selection

**Hierarchy System**: Each component has ONE parent (or null for roots) and MULTIPLE children. This tree structure defines ray connections and enables recursive updates throughout the optical chain.

## Interactions

### 1. Component Selection Modes

The application supports three distinct selection states that enable different interaction capabilities:

**Mode 1: Single Component Selection**
- **Condition**: `selectedIds.size === 1` AND `currentId === selectedIds[0]`
- **How to Achieve**: 
  - Click on an individual ungrouped component
  - Use selection box on a single ungrouped component
- **Indicators**:
  - Component id has been added to `selectedIds` and `currentId` in Component manager
  - Shows rotation handle (top)
  - Shows scale handle (bottom)
  - Shows arrow handle (for spawning)
  - No unified bounding box

**Mode 2: Multiple Selection (No Focus)**
- **Condition**: `selectedIds.size > 1` AND `currentId === null`
- **How to Achieve**:
  - Draw selection box around multiple ungrouped components
  - Draw selection box that includes a mix of grouped and ungrouped components (mixed selection → Mode 2)
  - Draw selection box that includes components from different groups (not all in same group → Mode 2)
  - Start dragging by clicking within empty space inside the unified bounding box (transitions from Mode 3 to Mode 2 by removing currentId)
- **Indicators**:
  - All component ids has been added to `selectedIds` in Component manager but `currentId` is empty
  - Shows unified bounding box around all
  - Shows group rotation handle (on unified bbox)
  - Shows group scale handle (on unified bbox)
  - No individual component handles
  - No arrow handle visible

**Mode 3: Multiple Selection (One Focused)**
- **Condition**: `selectedIds.size > 1` AND `currentId !== null` AND `selectedIds.has(currentId)`
- **How to Achieve**:
  - **Use selection box to select components that are ALL in the SAME group** (auto-expands to entire group, first selected becomes focused)
  - **Click on any grouped component** (auto-selects entire group, clicked one becomes focused)
  - Start dragging on any grouped component (triggers Mode 3 with that component focused)
  - **Important**: Clicking an ungrouped component from a multi-selection will transition to Mode 1 (single selection)
- **Indicators**:
  - All component ids has been added to `selectedIds` in Component manager and `currentId` is the component being clicked/dragged or selected via selection box
  - Shows unified bounding box around all
  - Shows group rotation handle (on unified bbox)
  - Shows group scale handle (on unified bbox)
  - Shows arrow handle for the focused component
  - Focused component is used as parent for new spawns


#### Mode Transition Logic

**Code Implementation** (in [ComponentManager.js](scripts/components/ComponentManager.js#L75-L100) and [InteractionHandlers.js](scripts/events/InteractionHandlers.js#L770-L810)):

```javascript
// Single component selection - sets both currentId and selectedIds
selectComponent(id) {
  this.selectedIds.clear();
  this.selectedIds.add(id);
  
  // If grouped, auto-expand to select all group members
  if (component.isGrouped) {
    this.selectMultiple([id]); // Expands selectedIds but keeps currentId
  }
  
  this.currentId = id; // Always set after selectMultiple
  // Result: If grouped -> State 3, if not grouped -> State 1
}

// Multiple selection - clears currentId unless specified
selectMultiple(ids) {
  this.selectedIds = new Set(ids);
  this.currentId = null; // No focus by default
  // Auto-expands groups
}

// Selection box completion
if (selectedIds.length > 1) {
  // Check if ALL selected components are in the SAME group
  const allInSameGroup = checkIfAllInSameGroup(selectedIds);
  if (allInSameGroup) {
    // Mode 3: All components in same group, set first as currentId
    componentManager.currentId = selectedIds[0];
  } else {
    // Mode 2: Mixed selection (ungrouped, or different groups)
    componentManager.currentId = null;
  }
} else if (selectedIds.length === 1) {
  componentManager.currentId = selectedIds[0]; // Mode 1
}

// Clicking component during drag
componentManager.selectComponent(draggedId); // Mode 3 if grouped and multiple selected

// Clicking empty space inside unified bounding box
if (mousedownInsideBboxButNotOnComponent) {
  componentManager.currentId = null; // Mode 2 (remove focus)
}
```

**Key Implementation Details**:
- `currentId` istransitions to Mode 3 ONLY when ALL selected components are in the SAME group
- Selection box uses Mode 2 for mixed selections (grouped + ungrouped, or different groups)`
- Selection box always starts in Mode 2 (no focus) when multiple components selected
- Clicking a grouped component transitions to Mode 3 (multi-selection with focus)
- Clicking an ungrouped component transitions to Mode 1 (single selection)
- Arrow handle only shown when `currentId !== null`
- Group vs individual handles determined by `selectedIds.size`

### 2. Component spawning, dragging, rotation, scaling

**New Component Spawning**:
- **Mode 1**: New component spawns at arrow tip, becomes child of selected component
- **Mode 2**: Cannot spawn new components (no arrow handle visible)
- **Mode 3**: New component spawns at focused component's arrow tip, becomes child of focused component

**Dragging Behavior**:
- **Mode 1**: Drag single ungrouped component
  - Triggered by: Mousedown on component element
  - Snaps to DRAGGING_SNAP_INCREMENT (2.5) per component
  - Updates rotation/scale/arrow handles during drag
  
- **Mode 2**: Drag entire multi-selection without focus
  - Triggered by: Mousedown inside unified bounding box (not on any component)
  - If transitioning from Mode 3: Removes currentId (clears focus)
  - Snaps to DRAGGING_SNAP_INCREMENT (2.5) as a group (maintains exact relative positions)
  - Updates group rotation/scale handles during drag
  - No arrow handle (currentId becomes null)
  
- **Mode 3**: Drag entire multi-selection with focused component
  - Triggered by: Mousedown on any grouped component
  - Snaps to DRAGGING_SNAP_INCREMENT (2.5) as a group (maintains exact relative positions)
  - Updates group rotation/scale handles during drag
  - Shows and updates arrow handle for the focused component (currentId)

**Rotation Handle**:
- **Mode 1**: Rotates single component around its center
  - Shows **absolute rotation angle** in value gauge (e.g., 0°, 45°, 90°)
  - Snaps to ROTATION_SNAP_INCREMENT (2.5°)
  - No angle limits
- **Mode 2 & 3**: Rotates entire group around group centroid
  - Shows **relative angle difference** from initial state in value gauge (e.g., +15°, -30°)
  - Snaps to ROTATION_SNAP_INCREMENT (2.5°)
  - No angle limits

**Scale Handle**:
- **Mode 1**: Scales single component from its center
  - Shows **absolute scale value** in value gauge (e.g., 1.0x, 1.5x)
  - Snaps to SCALE_SNAP_INCREMENT (0.1)
  - Limits: MIN_SCALE (0.8) to MAX_SCALE (2.0)
- **Mode 2 & 3**: Scales entire group from group centroid (maintains relative positions)
  - Shows **relative scale factor** from initial state in value gauge (e.g., 1.2x, 0.9x)
  - Snaps to SCALE_SNAP_INCREMENT (0.1)
  - Limits: Dynamic - calculated per component to ensure no individual component exceeds MIN_SCALE (0.8) or MAX_SCALE (2.0)



### 3. Menu button (secondary-toolbar) Visibility & Functionality

The secondary toolbar buttons dynamically show/hide based on the current selection mode and component state. This provides a cleaner UI by only showing relevant actions.

**Implementation**: The `updateToolbarButtons()` function in [ButtonHandlers.js](scripts/events/ButtonHandlers.js) is called whenever selection state changes (select, deselect, group, ungroup, delete, cut-link, change-parent).

#### Button Visibility by Mode

**No Selection (Mode 0)**:


**Single Selection (Mode 1)**:
- ✅ `delete-btn` - Delete selected component
- ✅ `hide-component-btn` - Hide selected component
- ✅ `show-component-btn` - Show selected component
- ✅ `show-all-components-btn` - Show all hidden components
- ✅ `flip-horizontal-btn` - Flip component horizontally
- ✅ `flip-vertical-btn` - Flip component vertically
- ✅ `cut-link-btn` - Remove parent link (only if component has a parent)
- ✅ `re-link-btn` - Change parent of component

**Multiple Selection (Mode 2 - No Focus)**:
- ✅ `delete-btn` - Delete all selected components
- ✅ `hide-component-btn` - Hide all selected components
- ✅ `show-component-btn` - Show all selected components
- ✅ `show-all-components-btn` - Show all hidden components
- ✅ `group-btn` - Create group (only if components aren't already grouped)
- ✅ `ungroup-btn` - Ungroup (only if any selected component is grouped)

**Multiple Selection (Mode 3 - One Focused)**:
- ✅ `delete-btn` - Delete all selected components
- ✅ `hide-component-btn` - Hide all selected components
- ✅ `show-component-btn` - Show all selected components
- ✅ `show-all-components-btn` - Show all hidden components
- ✅ `flip-horizontal-btn` - Flip all selected components horizontally
- ✅ `flip-vertical-btn` - Flip all selected components vertically
- ✅ `ungroup-btn` - Ungroup the group (components already grouped)
- ✅ `cut-link-btn` - Remove parent link from focused component (only if it has a parent)
- ✅ `re-link-btn` - Change parent of focused component

#### Button Functionality Details

**Link Management Buttons** (Mode 1 & 3 only):
- `cut-link-btn` - Remove parent-child link from the current component (currentId)
  - Visibility: Only shown when `currentId` is set AND that component has a parent
  - Removes the component's parent relationship
  - Updates children array of former parent
  - Automatically updates ray visualization and toolbar buttons
- `re-link-btn` - Change parent of the current component (currentId)
  - Visibility: Always shown when `currentId` is set
  - Enters interactive re-link mode with visual feedback
  - Shows dotted red line from component to current parent (if exists)
  - Click any other component to set as new parent
  - Includes cycle detection to prevent circular parent relationships
  - Cannot link component to itself
  - Click canvas to cancel
  - Automatically updates ray visualization and toolbar buttons

**Group Management Buttons** (Mode 2 & 3):
- `group-btn` - Create group from selected components (Mode 2 only)
  - Visibility: Only shown in Mode 2 when 2+ ungrouped components are selected
  - Hidden in Mode 3 (components already grouped)
- `ungroup-btn` - Ungroup selected components
  - Visibility: Only shown when any selected component is grouped
  - Removes group relationships from all components in the group
  - Removes unified bounding box and group rotation/scale handles
  - If `currentId` exists (Mode 3), preserves it and transitions to Mode 1 (single selection)
    - Shows individual rotation, scale, and arrow handles for the preserved component
  - If no `currentId` (Mode 2), fully deselects all components
  - Automatically updates toolbar buttons

### 4. Mouse cursor hovering and hover box

#### Hover Box Behavior

**Purpose**: Provides visual feedback when hovering over components to indicate interactivity and grouping relationships.

**Hover Box Types**:
1. **Single Component Hover Box** (`#hover-box`)
   - Gray solid stroke (#555, width 2.5)
   - Matches component's bounding box (accounts for rotation and scale)
   - Pointer-events disabled (doesn't block mouse interactions)

2. **Selection Hover Boxes** (`.selection-hover-box`)
   - Multiple boxes shown simultaneously for grouped components
   - Same styling as single hover box
   - Used during multi-selection hover and group hover

**Hover Behavior by State**:

**Mode 1: Single Ungrouped Component**
- **Trigger**: Mouse over ungrouped component
- **Display**: Single hover box around the component
- **Removal**: Mouse leaves component area

**Mode 2: Multiple Components Selected (No Focus)**
- **Trigger (A)**: Mouse over any selected component
  - Shows single hover box for that component only
- **Trigger (B)**: Mouse inside unified bounding box (not on any component)
  - Shows hover boxes for ALL selected components simultaneously
  - Cursor changes to 'move' to indicate drag-ready state
- **Removal**: Mouse leaves component or unified bbox area

**Mode 3: Multiple Components Selected (One Focused)**
- **Trigger**: Mouse over focused component
  - Shows single hover box for focused component
- **Behavior**: Same as Mode 2 when hovering over non-focused selected components

**Grouped Components (Not Selected)**
- **Trigger**: Mouse over any member of a group
- **Display**: Multiple hover boxes for ALL group members simultaneously
- **Logic**: Uses `component.isGrouped` and `component.groupMembers` properties
- **Removal**: Mouse leaves the component area

**Hover Box Suppression**:
- No hover boxes shown when:
  - Selection box is being actively drawn
  - Canvas is being panned
  - Component is being dragged
  - Rotation/scale handles are being dragged

**Implementation Details** (in [HoverHandlers.js](scripts/events/HoverHandlers.js)):
```javascript
// Single hover box tracking
let hoverBox = null;

// Multiple hover boxes for groups/selections
let selectionHoverBoxes = new Map(); // Maps component ID → hover box element

// Key functions:
showHoverBox(id)                    // Show single hover box for one component
showMultipleHoverBoxes(componentIds) // Show hover boxes for multiple components
removeHoverBox()                     // Remove single hover box
clearSelectionHoverBoxes()          // Remove all selection hover boxes
```

**Hover Box Transform**:
- Uses SVG transform: `translate(x, y) rotate(rotation) scale(sx, sy) translate(-cx, -cy)`
  - Matches `_updateTransform` exactly so the box tracks the component geometry precisely
- Box rect attributes use `localBounds` directly: `x=lb.minX, y=lb.minY, width=lb.maxX-lb.minX, height=lb.maxY-lb.minY`
  - `translate(-cx,-cy)` in the transform shifts these to the correct position automatically
  - Supports asymmetric components (e.g. `mirror`) without any manual offset correction
- Automatically updates when component position/rotation/scale changes

### 5. Rays

#### 5.1 Ray System Overview

The ray system visualizes optical paths between connected components using colored polygons and dotted outlines. Rays are **derived entities** - they are synthesized from component properties and hierarchy relationships, not stored independently.

**Core Principle**: Rays connect parent → child through aperture points, with shape determined by optical configuration.

#### 5.2 Ray Shapes (4 Types)

**1. Collimated (Parallel Rays)**
- **Geometry**: Parent aperture → Child aperture (4-vertex polygon)
- **Vertices**: `[parentUpper, childUpper, childLower, parentLower]`
- **Use Case**: Lenses, mirrors, most optical elements
- **Aperture Scaling**: `scalingRatio = parentProjection / childProjection`
  - Projects aperture points onto perpendicular to center line
  - Maintains parallel ray appearance regardless of rotation

**2. Divergent (Expanding Rays)**
- **Geometry**: Parent center → Child aperture (triangular polygon)
- **Vertices**: `[parentCenter, childUpper, childLower, parentCenter]`
- **Use Case**: Light sources, point emitters
- **Aperture Scaling**: `radius = distance × tan(coneAngle)`
  - Cone angle inherited from parent or calculated
  - Aperture grows linearly with distance

**3. Convergent (Focusing Rays)**
- **Geometry**: Parent aperture → Child center (triangular polygon)
- **Vertices**: `[parentUpper, childCenter, childCenter, parentLower]`
- **Use Case**: Focal points, detectors
- **Aperture Scaling**: Dynamic `coneAngle = atan(parentProjection / distance)`
  - Cone angle calculated from parent geometry
  - Aperture shrinks toward focal point

**4. Manual**
- **Geometry**: Same as collimated
- **Aperture Scaling**: None - user controls radius directly
- **Use Case**: Custom aperture control, override auto-scaling
- **User Control**: Slider adjusts aperture radius (0-50)

#### 5.3 Multi-Ray System

Each parent-child connection supports **multiple ray layers** with independent configurations:

**Data Structure** (per component):
```javascript
{
    rayShape: ['collimated', 'divergent', 'convergent'],    // Array of shapes
    rayPolygonColor: ['#00ffff', '#ff00ff', '#ffff00'],     // Primary colors
    rayPolygonColor2: ['#0000ff', '#ff0000', '#00ff00'],    // Gradient end colors
    gradientEnabled: [true, false, true],                    // Gradient toggle per ray
    // Future: rayOpacity: [0.2, 0.2, 0.2]                   // Per-ray opacity
}
```

**Rendering Order**:
- Rays drawn behind components (inserted before `#components` group)
- Multiple rays per connection rendered in array order
- Each ray independently configurable

#### 5.4 Gradient Rendering System

**Perpendicular Gradient**: Gradient runs across ray width (perpendicular to center line), not along ray length.

**Algorithm**:
1. Calculate ray direction: parent center → child center
2. Calculate perpendicular vector: 90° rotation of ray direction
3. Calculate ray width using aperture projections: `max(parentProj, childProj)`
4. Position gradient endpoints: `gradientCenter ± perpendicular × rayWidth`
5. Create 5-stop HSL gradient interpolating between color1 and color2
6. Apply as SVG `linearGradient` with `fill="url(#gradient-id)"`

**Color Interpolation**:
- Direct hue progression from color1.hue to color2.hue (allows negative steps)
- Average saturation and lightness between colors
- 5 evenly distributed color stops at 0%, 25%, 50%, 75%, 100%
- Opacity embedded in gradient stops for PowerPoint compatibility

**Edge Cases**:
- If ray width < 2 (edge-on orientation): fallback to solid color
- If invalid gradient coordinates: fallback to solid color
- Gradient disabled during extreme rotations to prevent artifacts

#### 5.5 Ray Display Modes

Three display modes controlled by `rayDisplayMode`:

**1. Both** (default)
- Shows solid colored/gradient polygons
- Overlays black dotted lines on aperture boundaries
- Visual: Full optical path with boundaries marked

**2. Dotted Only**
- Shows only black dotted lines (stroke-dasharray: "3,3")
- No solid polygons
- Visual: Minimal outline view

**3. Solid Only**
- Shows only colored/gradient polygons
- No dotted outlines
- Visual: Clean presentation mode

**Toggle Sequence**: Hide → Show Outline → Show Solid → Show Both → Hide

#### 5.6 Aperture Scaling Algorithm

**Purpose**: Automatically calculate optimal aperture radius so rays appear visually coherent when components are positioned/rotated arbitrarily.

**Projection-Based Scaling** (Collimated):
```javascript
// 1. Transform upVectors to global coordinates
childGlobalUp = rotate(childUpVector, childRotation)
parentGlobalUp = rotate(parentUpVector, parentRotation)

// 2. Calculate perpendicular to center line
centerLine = childCenter - parentCenter
perpendicular = rotate(centerLine, 90°)

// 3. Project upVectors onto perpendicular
childProjection = |childGlobalUp · perpendicular| × childRadius
parentProjection = |parentGlobalUp · perpendicular| × parentRadius

// 4. Calculate scaling ratio
scalingRatio = parentProjection / childProjection
newRadius = childRadius × scalingRatio
```

**Cone-Based Scaling** (Divergent/Convergent):
```javascript
// Divergent
distance = |childCenter - parentCenter|
coneAngle = inherited or calculated
newRadius = distance × tan(coneAngle)

// Convergent
parentProjection = calculated as above
coneAngle = atan(parentProjection / distance)
// Child aperture shrinks toward focal point
```

**Recursive Updates**:
- When component moves/rotates → recalculate its aperture
- Propagate changes to ALL children recursively
- Update triggered by: drag, rotation, scale, parent change, ray config change

#### 5.7 Trace Lines (Center Lines)

**Purpose**: Dotted lines connecting component centers to show optical axis.

**Rendering**:
- Black dotted lines (stroke-dasharray: "5,5")
- Connects parent center → child center
- Drawn behind components (in separate `#center-trace-lines` group)
- Independent of ray display (can show/hide separately)

**Toggle**: Separate from ray visibility toggle

#### 5.8 Ray Configuration UI (Legacy scripts_backup)

**Menu Layout**: Banner at top of canvas, dynamically sized to canvas width

**Per-Ray Controls**:
1. **Ray Label**: "Ray 1", "Ray 2", etc.
2. **Shape Dropdown**: Select collimated/divergent/convergent/manual
3. **Aperture Slider**: (Manual mode only) 0-50 range, step 0.1
4. **Hue Controls**:
   - **Solid Mode**: Single hue slider (0-359°)
   - **Gradient Mode**: Dual-knob slider with custom knobs
     - Knob 1 (color1): 20px diameter when selected
     - Knob 2 (color2): 16px diameter when selected
     - Drag knobs to adjust hue positions
     - Real-time ray updates during drag
5. **Gradient Toggle**: Switch between solid/gradient
6. **Numeric Input**: Direct hue entry (0-359)
7. **Color Swatch Picker**: Copy colors from other rays
8. **Add/Remove Buttons**: Manage ray layers

**Interaction Behavior**:
- Menu appears when component selected (if rays visible)
- Menu hides when rays toggled off
- Menu updates when selection changes
- Slider interactions prevent menu re-rendering (isSliderActive flag)

#### 5.9 Implementation Status

**Legacy (scripts_backup/) - Fully Implemented**:
- ✅ All 4 ray shapes with correct geometry
- ✅ Multi-ray support (arrays in component state)
- ✅ Gradient rendering with HSL interpolation
- ✅ Projection-based aperture scaling (collimated)
- ✅ Cone-based scaling (divergent/convergent)
- ✅ Ray configuration menu (745 lines)
- ✅ Display mode toggling (both/dotted/solid)
- ✅ Trace lines (center dotted lines)
- ✅ Color swatch system
- ✅ Recursive aperture updates

**Current (scripts/) - Partially Implemented**:
- ✅ Basic trace lines (DrawRays.js, TraceLines.js)
- ✅ Component class with aperture properties
- ❌ Ray polygon rendering (solid/gradient)
- ❌ Aperture scaling algorithm
- ❌ Multi-ray support
- ❌ Ray configuration UI
- ❌ Display mode controls
- ❌ Gradient system

**Migration Path**:
1. Port aperture scaling algorithm (calculateProjections_internal)
2. Port ray polygon rendering (collimated first)
3. Port gradient system
4. Port multi-ray data structure
5. Port ray configuration UI
6. Port divergent/convergent geometries

#### 5.10 Key Constants (from legacy config)

```javascript
DEFAULT_SOLID_RAY_COLOR = '#00ffff'      // Cyan default
DEFAULT_RAY_POLYGON_OPACITY = 0.2        // 20% opacity for polygons
RAY_SHAPES = ['collimated', 'divergent', 'convergent', 'manual']
```

### 6. Canvas panning and zooming

#### 6.1 Canvas System Overview

The canvas system manages viewport transformations (pan/zoom), grid rendering, and component bounds calculations. Built around SVG viewBox manipulation for smooth, scale-independent interactions.

**Core Component**: `CanvasManager` class (singleton) in [Canvas.js](scripts/Canvas.js)

#### 6.2 Viewport Management

**ViewBox System**:
```javascript
currentViewBox = {
    x: number,      // Top-left X coordinate in SVG space
    y: number,      // Top-left Y coordinate in SVG space
    width: number,  // Viewport width in SVG units
    height: number  // Viewport height in SVG units
}
```

**Initial State**:
- Default viewBox: 400×300 SVG units
- Applied zoom: 0.25 (INITIAL_ZOOM constant)
- Resulting initial view: 1600×1200 SVG units, centered at origin

**ViewBox Limits**:
```javascript
MIN_VIEWBOX_WIDTH = 100
MIN_VIEWBOX_HEIGHT = 75
MAX_VIEWBOX_WIDTH = 4000
MAX_VIEWBOX_HEIGHT = 3000
```

#### 6.3 Panning System

**Trigger**: Right mouse button (button === 2) drag

**Implementation** (in [InteractionHandlers.js](scripts/events/InteractionHandlers.js#L457-L515)):
```javascript
setupCanvasPanning() {
  // Right-click mousedown → start panning
  // Cursor changes to 'grabbing'
  // Mousemove → calculate delta, convert screen→SVG space
  // Mouseup → end panning, restore cursor
  // Context menu disabled (right-click doesn't show menu)
}
```

**Coordinate Transformation**:
```javascript
// Screen space delta (pixels)
deltaScreenX = currentX - startX
deltaScreenY = currentY - startY

// Convert to SVG space using CTM (Current Transformation Matrix)
const CTM = svg.getScreenCTM()
const scale = CTM.a  // Extract scale factor
deltaX = -deltaScreenX / scale  // Negative: drag right = pan left
deltaY = -deltaScreenY / scale

// Update viewBox
canvas.pan(deltaX, deltaY)
```

**Pan Method**:
```javascript
pan(deltaX, deltaY) {
    this.currentViewBox.x += deltaX
    this.currentViewBox.y += deltaY
    this.updateViewBox()  // Updates SVG viewBox attribute, redraws grid
}
```

**State Tracking**:
- `isPanning` flag prevents interference with other interactions
- Hover boxes suppressed during panning
- Cursor feedback: 'grabbing' during drag, 'default' after release

#### 6.4 Zoom System

**Trigger**: Mouse wheel or trackpad pinch gesture

**Implementation** (in [InteractionHandlers.js](scripts/events/InteractionHandlers.js#L517-L611)):

**Mouse Wheel Zoom**:
- Scroll up: `zoomFactor = 1.1` (zoom in 10%)
- Scroll down: `zoomFactor = 0.9` (zoom out 10%)
- Discrete zoom steps

**Trackpad Pinch Zoom** (Mac):
- Detected via `e.ctrlKey` on wheel event
- Smooth, continuous zoom: `zoomFactor = 1 - (e.deltaY × 0.01)`
- Uses granular deltaY values from trackpad

**Safari Gesture Events** (Mac):
- `gesturestart` → initialize lastScale = 1
- `gesturechange` → calculate zoom from e.scale / lastScale
- `gestureend` → cleanup
- More reliable for Mac trackpad pinch than wheel events

**Zoom Method**:
```javascript
zoom(zoomFactor, center = null) {
    // Center point for zoom (default: viewBox center, or mouse position)
    const centerX = center ? center.x : this.currentViewBox.x + this.currentViewBox.width / 2
    const centerY = center ? center.y : this.currentViewBox.y + this.currentViewBox.height / 2

    // Calculate new dimensions
    const newWidth = this.currentViewBox.width / zoomFactor
    const newHeight = this.currentViewBox.height / zoomFactor

    // Apply limits
    const clampedWidth = clamp(newWidth, MIN_VIEWBOX_WIDTH, MAX_VIEWBOX_WIDTH)
    const clampedHeight = clamp(newHeight, MIN_VIEWBOX_HEIGHT, MAX_VIEWBOX_HEIGHT)

    // Calculate actual zoom factor (may differ if limits hit)
    const actualZoomFactor = this.currentViewBox.width / clampedWidth

    // Keep center point fixed (point under cursor stays in same position)
    this.currentViewBox.x = centerX - (centerX - this.currentViewBox.x) / actualZoomFactor
    this.currentViewBox.y = centerY - (centerY - this.currentViewBox.y) / actualZoomFactor
    this.currentViewBox.width = clampedWidth
    this.currentViewBox.height = clampedHeight

    this.updateViewBox()  // Updates SVG, redraws grid
}
```

**Center-Point Preservation**:
- Zoom operation keeps the point under the mouse cursor at the same visual position
- Achieved by adjusting viewBox x/y based on zoom factor
- Creates intuitive "zoom toward cursor" behavior

#### 6.5 Auto-Centering System

**Purpose**: Automatically frame all components with appropriate padding

**Trigger**: 
- Initial load
- Component add/remove
- Explicit "Fit to Components" button click

**Algorithm** (in [Canvas.js](scripts/Canvas.js#L49-L110)):
```javascript
centerAllComponents() {
    // 1. Calculate bounding box of all components
    const bounds = this.calculateComponentsBounds()
    
    // 2. Calculate padding (20% of dimensions or min 200 units)
    const paddingX = max(bounds.width × 0.2, 200)
    const paddingY = max(bounds.height × 0.2, 200)
    
    // 3. Ensure minimum canvas dimensions
    const viewBoxWidth = max(bounds.width + 2×paddingX, 400)
    const viewBoxHeight = max(bounds.height + 2×paddingY, 300)
    
    // 4. Center viewBox on component center
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    
    this.currentViewBox = {
        x: centerX - viewBoxWidth / 2,
        y: centerY - viewBoxHeight / 2,
        width: viewBoxWidth,
        height: viewBoxHeight
    }
    
    this.updateViewBox()
}
```

**Component Bounds Calculation**:
```javascript
calculateComponentsBounds() {
    // For each component:
    //   - Get position, rotation, scale
    //   - Calculate 4 corners of bounding box
    //   - Rotate corners by component rotation
    //   - Track min/max X/Y across all components
    
    // Returns: { x, y, width, height }
}
```

**Edge Case**: If no components exist, defaults to viewBox centered at origin (±200, ±150)

#### 6.6 Grid System

**Purpose**: Visual reference grid snapped to SVG coordinates

**Grid Configuration**:
```javascript
GRID_SIZE = 50                  // Grid line spacing (SVG units)
GRID_EXTEND_FACTOR = 5          // How far beyond viewBox to draw
```

**Dynamic Grid Rendering** (in [Canvas.js](scripts/Canvas.js#L176-L229)):
```javascript
drawGrid() {
    // 1. Clear previous grid lines
    // 2. If grid hidden, return early
    
    // 3. Calculate extended grid area (covers viewBox × (1 + 2×EXTEND_FACTOR))
    const gridAreaX = viewBox.x - viewBox.width × 5
    const gridAreaWidth = viewBox.width × 11  // 1 + 2×5
    
    // 4. Calculate first/last grid line positions (snapped to GRID_SIZE)
    const firstGridX = floor(gridAreaX / 50) × 50
    const lastGridX = ceil((gridAreaX + gridAreaWidth) / 50) × 50
    
    // 5. Draw vertical lines (x = firstGridX to lastGridX, step 50)
    // 6. Draw horizontal lines (y = firstGridY to lastGridY, step 50)
    
    // Lines: stroke="#e0e0e0", stroke-width="1"
}
```

**Grid Behavior**:
- Automatically redraws on viewBox change (pan/zoom)
- Extended area prevents visible edges during panning
- Grid lines snapped to GRID_SIZE for consistency
- Toggle visibility without re-calculation

**Grid Toggle**:
```javascript
toggleGrid() {
    this.gridVisible = !this.gridVisible
    this.drawGrid()
    // Updates button text: 'Hide Grid' ↔ 'Show Grid'
}
```

#### 6.7 Coordinate Spaces

**Three Coordinate Systems**:

1. **Screen Space** (pixels)
   - Mouse events (e.clientX, e.clientY)
   - Browser window coordinates

2. **SVG Space** (SVG units)
   - ViewBox coordinates
   - Component positions
   - Grid lines

3. **Component Local Space**
   - Relative to component center
   - Pre-rotation, pre-scale

**Transformation Methods**:
```javascript
// Screen → SVG
const pt = svg.createSVGPoint()
pt.x = e.clientX
pt.y = e.clientY
const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())

// SVG → Screen
const CTM = svg.getScreenCTM()
const screenX = svgX × CTM.a + CTM.e
const screenY = svgY × CTM.d + CTM.f

// Component Local → SVG (via transform attribute)
// transform = `translate(x, y) rotate(rotation) scale(scale)`
```

#### 6.8 Canvas Manager API

**Singleton Instance**:
```javascript
import { canvas } from './Canvas.js'
```

**Public Methods**:
```javascript
canvas.pan(deltaX, deltaY)              // Pan viewport
canvas.zoom(zoomFactor, center)         // Zoom at point
canvas.centerAllComponents()            // Auto-frame all components
canvas.updateViewBox()                  // Apply viewBox changes
canvas.getCurrentViewBox()              // Get current viewBox
canvas.setViewBox(viewBox)              // Set viewBox directly
canvas.toggleGrid()                     // Toggle grid visibility
canvas.drawGrid()                       // Force grid redraw
canvas.calculateComponentsBounds()      // Get all components' bounds
```

**Exported Utility**:
```javascript
import { autoCenter } from './Canvas.js'
autoCenter()  // Shorthand for canvas.centerAllComponents()
```

#### 6.9 Integration Points

**Initialization** (in [App.js](scripts/App.js)):
```javascript
import { canvas } from './Canvas.js'
import { setupCanvasPanning, setupCanvasZoom } from './events/InteractionHandlers.js'

// Canvas manager auto-initializes on import (singleton constructor)
setupCanvasPanning()  // Register right-click pan handlers
setupCanvasZoom()     // Register wheel/gesture zoom handlers
```

**Grid Toggle Button**:
```javascript
document.getElementById('toggle-grid-btn').addEventListener('click', () => {
    canvas.toggleGrid()
})
```

**Fit Button**:
```javascript
document.getElementById('center-all-btn').addEventListener('click', () => {
    canvas.centerAllComponents()
})
```

#### 6.10 Performance Considerations

**Grid Rendering Optimization**:
- Extended grid area (11× viewBox) minimizes redraw frequency
- Only redraws when viewBox changes (not on every pan event)
- Uses line primitives (lightweight SVG elements)

**ViewBox Updates**:
- Throttled by browser's animation frame rate
- No explicit throttling in code (relies on browser optimization)

**Transform Caching**:
- CTM (Current Transformation Matrix) calculated per interaction
- Not cached globally (browser handles efficiently)

**Memory Management**:
- Grid lines removed and recreated on each draw
- No memory leaks from accumulated elements

#### 6.11 Platform-Specific Behavior

**macOS**:
- Two-finger trackpad scroll: Regular pan (doesn't trigger zoom)
- Pinch gesture: Smooth, continuous zoom via `e.ctrlKey` detection
- Safari: Uses `gesturestart/gesturechange/gestureend` events for more reliable pinch
- Trackpad zoom: Granular deltaY values (0.01 multiplier)

**Windows/Linux**:
- Mouse wheel: Discrete zoom steps (1.1/0.9 factor)
- Two-finger scroll: May trigger zoom depending on browser

**Browser Compatibility**:
- Chrome/Edge: wheel events with `e.ctrlKey` for pinch
- Safari: Gesture events for native pinch support
- Firefox: wheel events only (no gesture events)



## Implementation Status: scripts/ vs scripts_backup/

### ✅ Fully Implemented (Current scripts/)
- **Canvas Management**: Pan, zoom, viewport, grid system
- **Component Library**: Complete component definitions with optical elements. Each entry carries `category`, `label`, `localBounds`, `centerPoint`, `apertureCenter`, `upVector`, `forwardVector`, `apertureRadius`, `coneAngle`, `rayShape`, and a `draw(ns)` function. The sidebar menu is **generated dynamically** from these definitions by `buildComponentMenu()` — no `index.html` changes needed to add a component.
- **Component Manager**: State management, add/remove, positioning, rotation
- **Interaction System**: Drag, rotation handle, scale handle, arrow handle
- **Event System**: Mouse/keyboard handlers, selection logic
- **UI Elements**: Value display, hover handlers, button handlers

### 🔄 In Progress / Refinement Needed
- **Aperture Scaling Algorithm**: Basic implementation exists, needs full recursive updates
- **Ray Configuration Menu**: UI not yet ported from scripts_backup
- **Trace Lines**: Center dotted lines not yet implemented
- **Component Flipping**: Horizontal/vertical flip logic
- **Multi-Ray Support**: Single ray works, multiple rays per connection pending
- **Ray Rendering**: Collimated, divergent, convergent rays with gradients
- **File I/O**: JSON import/export, filename editor

### ❌ Not Yet Implemented
- **Gallery System**: Example schematics loader
- **Component Preview**: Hover tooltips
- **Debug Visualization**: Vector/aperture indicators
- **Undo/Redo**: Action log exists but not connected
- **SVG Export**: JSON export works, SVG export pending 


## Core Architecture Concepts



### 2. Component State & Hierarchy

**State Object** (Single Source of Truth — `Component` instance):
```javascript
{
    id: number            // unique auto-incremented ID
    type: string          // 'lens' | 'mirror' | 'objective' | 'plane' | ...
    x, y: number          // world position of centerPoint
    rotation: number      // degrees
    scale: number         // uniform scale
    flipX, flipY: boolean // mirror along local axes
    visible: boolean

    // Geometry (from ComponentLibrary, immutable per type)
    centerPoint: { x, y }     // pivot point in local space
    apertureCenter: { x, y }  // center of aperture face in local space
    aperturePoints: [{x,y}]   // aperture endpoints in local space (top/bottom)
    upVector: { x, y }        // local "up" direction (for aperture orientation)
    forwardVector: { x, y }   // local optical axis direction
    localBounds: { minX, maxX, minY, maxY } // visual extent in local space

    // Optical properties
    apertureRadius: number
    coneAngle: number
    rayShape: string          // 'collimated' | 'divergent' | 'convergent' | 'custom'
    rayPolygonColor: string
    rayPolygonOpacity: number

    // Arrow handle
    arrowVector: { x, y }     // offset from centerPoint world pos to arrow tip

    // Hierarchy
    parent: number | null     // parent component id
    children: number[]        // child component ids
    isGrouped: boolean
    groupMembers: Set<number> // ids of all members in same group
}
```

**Hierarchy Rules**:
- One parent, multiple children (tree structure)
- Rays connect parent → child via aperture points
- Recursive updates propagate down tree
- Deletion orphans children (become roots)

### 2. Coordinate Systems

Three spaces requiring transformation:
1. **Screen**: Mouse pixels (clientX/Y)
2. **SVG / world**: Canvas space with pan/zoom applied
3. **Local**: Component-relative, defined in `ComponentLibrary.js`

#### centerPoint — the positional anchor

Every component has a `centerPoint: {x, y}` defined in local space. The component's `(x, y)` world position IS the world location of `centerPoint`. This makes `centerPoint` the rotation pivot, scale anchor, and spawn origin.

**SVG transform chain** (applied by `_updateTransform`):
```
translate(x, y)  →  rotate(θ)  →  scale(sx, sy)  →  translate(-cx, -cy)
```
Reading right-to-left (SVG matrix order): first shift local space so `centerPoint` is at the origin, then scale+flip, then rotate, then move to world position. Result: `centerPoint` in world space always equals `(x, y)`.

#### localBounds — the visual extent

`localBounds: { minX, maxX, minY, maxY }` describes the actual rendered bounding rectangle in **pre-translate local space** (i.e., before `translate(-cx,-cy)` is applied). This is the source of truth for component size — `width` and `height` are derived from it.

For symmetric components (`centerPoint = {0,0}`), `localBounds` is symmetric around zero. For asymmetric ones (e.g. `mirror` with `centerPoint.x = -30`), `localBounds` correctly spans from the mount point to the aperture face.

#### _localToWorld — the canonical transform helper

```javascript
// In Component.js — mirrors the SVG transform chain exactly
_localToWorld(localX, localY) {
  // 1. translate(-cx,-cy):  shift into post-translate space
  const lx = (localX - cx) * flipX;
  const ly = (localY - cy) * flipY;
  // 2. scale + rotate + translate(x,y)
  return {
    x: this.x + (lx * cos - ly * sin) * this.scale,
    y: this.y + (lx * sin + ly * cos) * this.scale
  };
}
```

**World-space getters** (use these everywhere instead of manual math):
| Method | Returns |
|---|---|
| `getCenterPointWorld()` | `centerPoint` in world coords (= `{x, y}`) |
| `getApertureCenterWorld()` | `apertureCenter` in world coords |
| `getAperturePointsWorld()` | array of aperture endpoints in world coords |
| `getArrowEndpoint()` | arrow tip in world coords |
| `getBoundingBox()` | axis-aligned world bbox from `localBounds` corners |

#### Key rule
> **Never use `component.x / component.y` as the visual center.** It is the world position of `centerPoint`, which may not be the geometric center of the drawn shape. Always use `getCenterPointWorld()` for handles, `getAperturePointsWorld()` for rays, and `localBounds` for bounding rectangles.

### 3. Aperture System

#### Aperture geometry (per component type, in local space)

- **`apertureCenter: {x, y}`** — the center of the aperture face (where the optical axis crosses the element). Defined in local space. Converted to world space via `getApertureCenterWorld()`.
- **`upVector: {x, y}`** — local unit direction pointing "up" along the aperture face (perpendicular to the optical axis).
- **`apertureRadius`** — half-width of the aperture along `upVector`.
- **`aperturePoints`** — the two aperture endpoints (top and bottom), computed as:
  ```
  aperturePoints[0] = apertureCenter + upVector × apertureRadius   // top
  aperturePoints[1] = apertureCenter - upVector × apertureRadius   // bottom
  ```
  In world space: `getAperturePointsWorld()` — used as ray polygon vertices.

#### Trace lines (in `TraceLines.js`)
Dotted lines connect parent `apertureCenter` → child `apertureCenter` in world space (`getApertureCenterWorld()`).

#### Aperture scaling strategies
- **Collimated** (parallel): `radius = parentAperture / cos(deviation)`
- **Divergent** (expanding): `radius = distance × tan(coneAngle)`
- **Convergent** (focusing): dynamic cone angle from geometry
- **Custom**: user-controlled radius slider (no auto-scaling)

**Recursion**: when component moves/rotates → recalculate its aperture → recursively update all children.

### 4. Ray Visualization

**Ray Types** (4-vertex SVG polygons):
- **Collimated**: Parent aperture → Child aperture (parallel)
- **Divergent**: Parent center → Child aperture (expanding)
- **Convergent**: Parent aperture → Child center (focusing)

**Multi-Ray**: Each parent-child connection supports multiple rays with independent colors/gradients.

**Rendering**: Rays drawn behind components. Update triggered by any geometry change.

## Critical Pipelines

### Pipeline 1: Component Creation
```
User clicks component button
  → Generate unique ID
  → Determine parent (selected component or null)
  → Create SVG group at arrow position
  → Initialize state (type, position, parent/child links)
  → Calculate aperture (if has parent)
  → Draw rays
```

### Pipeline 2: Drag Interaction
```
Mouse down → Capture component
Mouse move → Transform screen → SVG coords
          → Snap to grid
          → Update position & transform
          → Recalculate apertures (recursive)
          → Redraw rays
Mouse up → Finalize
```

### Pipeline 3: Ray Update Cascade
```
Trigger (move/rotate/config change)
  → Calculate component's aperture
  → For each child:
      → Calculate child aperture
      → Recurse to child's children
  → Redraw all rays in scene
```

### Pipeline 4: Import/Export
```
Export: State → JSON (includes action log)
Import: JSON → Replay actions → Restore state → Rebuild DOM
```

## Implementation Priorities

### Must-Have (Core Functionality)
1. ✅ Component state management
2. ✅ Hierarchy system (parent/child)
3. ✅ Coordinate transformations
4. ✅ Drag/rotate/scale interactions
5. ✅ Arrow handle for spawning
6. ✅ Basic ray rendering (collimated)
7. 🔄 Aperture scaling (collimated mode working)
8. ✅ JSON import/export

### Should-Have (Enhanced UX)
9. 🔄 Full aperture scaling (divergent/convergent)
10. ❌ Ray configuration UI (color, shape, gradient)
11. ❌ Multi-ray support per connection
12. ✅ Grid snapping
13. ✅ Canvas pan/zoom
14. ❌ Trace lines (dotted center lines)
15. ❌ Component preview tooltips

### Nice-to-Have (Polish)
16. ❌ SVG export (clean, presentation-ready)
17. ❌ Gallery with examples
18. ❌ Debug visualization mode
19. ❌ Undo/redo
20. ❌ Component flip operations
21. ❌ Keyboard shortcuts

## Key Implementation Rules

1. **State First**: Update state, then DOM. Never read from DOM as source of truth.
2. **Center-Based**: All positioning uses component center, not corners.
3. **Transform Order**: `translate(x,y) rotate(angle, centerX, centerY)` — never reverse.
4. **Recursive Updates**: Changes propagate DOWN tree only (parent → children).
5. **Grid Snapping**: Apply in SVG space, to center coordinates.
6. **Event Cleanup**: Remove listeners on component delete and drag end.
7. **Circular Refs**: Hierarchy is tree—no circular parent-child refs allowed.
8. **Aperture Triggers**: Recalculate on: position, rotation, parent change, ray config change.

## File Organization (Current scripts/)

```
scripts/
├── App.js              # Initialization
├── Canvas.js           # Viewport, pan, zoom
├── Fileio.js           # Import/export
├── config.js           # Constants
├── components/         # Component system
│   ├── Component.js            # State & lifecycle
│   ├── ComponentManager.js     # Add/remove/update
│   ├── ComponentLibrary.js     # Component definitions: category, label, localBounds, draw fn, optical props
│   ├── ComponentMenu.js        # buildComponentMenu() — dynamically generates sidebar from library definitions
│   └── ComponentActions.js     # Operations
├── events/             # Interactions
│   ├── InteractionHandlers.js  # Selection/click
│   ├── ArrowHandle.js          # Spawn position
│   ├── RotationHandle.js       # Rotate control
│   ├── ScaleHandle.js          # Scale control
│   ├── ValueDisplay.js         # Real-time values
│   └── ButtonHandlers.js       # UI buttons
├── rays/               # Ray system
│   ├── DrawRays.js             # Main rendering
│   ├── ApertureRays.js         # Geometry calc
│   └── TraceLines.js           # Center lines
└── utils/              # Helpers
    ├── mathUtils.js
    ├── svgUtils.js
    ├── colorUtils.js
    └── domUtils.js
```

## Adding a New Component

**Only one file needs to change: `scripts/components/ComponentLibrary.js`.**

Add an entry to the `components` object. The sidebar button and category section are generated automatically by `buildComponentMenu()` at startup.

```js
'my-component': {
    // --- Sidebar ---
    category: 'My Category',   // existing or new section name
    label:    'My Label',      // text on the sidebar button

    // --- Geometry (local coordinate space) ---
    localBounds:    { minX: -W/2, maxX: W/2, minY: -H/2, maxY: H/2 },
    centerPoint:    { x: 0, y: 0 },   // rotation pivot & ray-trace anchor
    apertureCenter: { x: 0, y: 0 },   // where aperture points are centred
    upVector:       { x: 0, y: -1 },  // direction aperture extends along
    forwardVector:  { x: 1, y: 0 },   // direction arrow handle points

    // --- Optical properties ---
    apertureRadius: DEFAULT_APERTURE_RADIUS,
    coneAngle:      DEFAULT_CONE_ANGLE,
    rayShape:       'collimated',      // 'collimated' | 'divergent' | 'convergent'

    // --- SVG artwork ---
    draw: (ns) => {
        const g = document.createElementNS(ns, 'g');
        // ... build SVG children ...
        return g;
    }
},
```

### Dynamic sidebar generation (`ComponentMenu.js`)

`buildComponentMenu()` runs once at `DOMContentLoaded` (before `setupComponentButtons()`):

1. Iterates `Object.entries(components)` in insertion order.
2. Groups entries by `category` into a `Map` — new categories are created automatically.
3. For each category builds: `.component-menu` → `.category-header` → `.category-content` → `<button data-component="key">label</button>`.
4. Injects everything into `<div id="component-menu-root">` in `index.html`.
5. Attaches collapse/expand click listeners to each `.category-header`.

`setupComponentButtons()` in `ButtonHandlers.js` uses event delegation (`e.target.closest('button[data-component]')`), so it works on the dynamically generated buttons without any changes.

## Implementation Plans

### Plan 1: Undo/Redo System

**Design Philosophy**: Component-centric action log that records user operations. Each action is reversible by storing both the action and the state needed to undo it.

#### Data Structure (Expandable)

```javascript
// Action log (global array)
const actionHistory = {
    actions: [],           // Array of action objects
    currentIndex: -1,      // Points to current action (-1 = nothing)
    maxHistory: 100        // Limit to prevent memory issues
};

// Base action interface - all actions extend this
{
    type: string,          // Action type identifier
    timestamp: number,     // When action occurred
    componentId?: number,  // Affected component (optional for global actions)
}

// Expandable action types:

// 1. Component lifecycle actions
{
    type: 'add',
    componentId: 1,
    componentType: 'lens',
    parentId: 5,
    state: { /* full state snapshot */ }
}

{
    type: 'remove',
    componentId: 1,
    state: { /* snapshot before deletion */ },
    childrenIds: [7, 8],
    parentId: 5
}

// 2. Transform actions (can be batched)
{
    type: 'move',
    componentId: 1,
    oldPos: { x, y },
    newPos: { x, y }
}

{
    type: 'rotate',
    componentId: 1,
    oldRotation: 45,
    newRotation: 90
}

{
    type: 'scale',
    componentId: 1,
    oldScale: { x: 1, y: 1 },
    newScale: { x: 1.5, y: 1.5 }
}

// 3. Property changes (generic, highly expandable)
{
    type: 'property',
    componentId: 1,
    propertyPath: 'rayShape[0]',      // Dot/bracket notation for nested props
    oldValue: 'collimated',
    newValue: 'divergent'
}

// 4. Ray-specific actions (future)
{
    type: 'ray.add',                  // Add new ray layer
    componentId: 1,
    rayIndex: 2,
    rayConfig: { shape: 'collimated', color: '#00ffff' }
}

{
    type: 'ray.remove',               // Remove ray layer
    componentId: 1,
    rayIndex: 1,
    rayConfig: { /* snapshot */ }
}

{
    type: 'ray.configure',            // Modify ray properties
    componentId: 1,
    rayIndex: 0,
    changes: {
        shape: { old: 'collimated', new: 'divergent' },
        color: { old: '#00ffff', new: '#ff00ff' }
    }
}

{
    type: 'ray.gradient',             // Toggle gradient
    componentId: 1,
    rayIndex: 0,
    oldEnabled: false,
    newEnabled: true,
    oldColor2: undefined,
    newColor2: '#ff00ff'
}

// 5. Aperture actions (future)
{
    type: 'aperture.manual',          // Manual aperture adjustment
    componentId: 1,
    oldRadius: 15,
    newRadius: 25
}

{
    type: 'aperture.mode',            // Change aperture mode
    componentId: 1,
    oldMode: 'auto',
    newMode: 'manual'
}

// 6. Visibility/display actions
{
    type: 'visibility',
    componentId: 1,
    oldVisible: true,
    newVisible: false
}

{
    type: 'flip',
    componentId: 1,
    axis: 'horizontal' | 'vertical',
    oldFlipped: false,
    newFlipped: true
}

// 7. Batch/composite actions (future)
{
    type: 'batch',                    // Multiple actions as one undo step
    actions: [/* array of actions */],
    description: 'Move multiple components'
}

// 8. Global actions (future)
{
    type: 'global.grid',
    oldVisible: true,
    newVisible: false
}

{
    type: 'global.viewport',
    oldViewBox: { x, y, width, height },
    newViewBox: { x, y, width, height }
}
```

**Expandability Strategy**:
- Use string-based `type` field for easy extension
- Namespace action types with dots (e.g., 'ray.add', 'aperture.manual')
- Generic `property` type handles any simple property change
- Action handlers use switch/case or map lookup for easy addition
```

#### Implementation Steps

**Step 1: Expandable Action Recording Layer**
```javascript
// Action handler registry (easily extensible)
const actionHandlers = new Map();

// Register handler for each action type
function registerActionHandler(type, undoFn, redoFn) {
    actionHandlers.set(type, { undo: undoFn, redo: redoFn });
}

// Core recording function
function recordAction(action) {
    // Skip if in silent mode (during undo/redo)
    if (isSilentMode) return;
    
    // Remove any actions after current index (branching undo)
    actionHistory.actions = actionHistory.actions.slice(0, actionHistory.currentIndex + 1);
    
    // Add timestamp
    action.timestamp = Date.now();
    
    // Add new action
    actionHistory.actions.push(action);
    actionHistory.currentIndex++;
    
    // Limit history size
    if (actionHistory.actions.length > actionHistory.maxHistory) {
        actionHistory.actions.shift();
        actionHistory.currentIndex--;
    }
    
    updateUndoRedoUI();
}
```

**Step 2: Register Core Action Handlers**
```javascript
// Component lifecycle
registerActionHandler('add', 
    (action) => removeComponentSilently(action.componentId),
    (action) => restoreComponent(action.state)
);

registerActionHandler('remove',
    (action) => restoreComponent(action.state),
    (action) => removeComponentSilently(action.componentId)
);

// Transforms
registerActionHandler('move',
    (action) => updateComponentPosition(action.componentId, action.oldPos.x, action.oldPos.y),
    (action) => updateComponentPosition(action.componentId, action.newPos.x, action.newPos.y)
);

registerActionHandler('rotate',
    (action) => updateComponentRotation(action.componentId, action.oldRotation),
    (action) => updateComponentRotation(action.componentId, action.newRotation)
);

registerActionHandler('scale',
    (action) => updateComponentScale(action.componentId, action.oldScale.x, action.oldScale.y),
    (action) => updateComponentScale(action.componentId, action.newScale.x, action.newScale.y)
);

// Generic property changes
registerActionHandler('property',
    (action) => setComponentProperty(action.componentId, action.propertyPath, action.oldValue),
    (action) => setComponentProperty(action.componentId, action.propertyPath, action.newValue)
);

// Future: Ray actions (register when implemented)
registerActionHandler('ray.add',
    (action) => removeRayLayer(action.componentId, action.rayIndex),
    (action) => addRayLayer(action.componentId, action.rayIndex, action.rayConfig)
);

// Future: Aperture actions
registerActionHandler('aperture.manual',
    (action) => setApertureRadius(action.componentId, action.oldRadius),
    (action) => setApertureRadius(action.componentId, action.newRadius)
);
```

**Step 3: Unified Undo/Redo Operations**
```javascript
function undo() {
    if (actionHistory.currentIndex < 0) return;
    
    const action = actionHistory.actions[actionHistory.currentIndex];
    const handler = actionHandlers.get(action.type);
    
    if (!handler) {
        console.warn(`No handler registered for action type: ${action.type}`);
        return;
    }
    
    isSilentMode = true;
    handler.undo(action);
    isSilentMode = false;
    
    actionHistory.currentIndex--;
    redrawRays();
    updateUndoRedoUI();
}

function redo() {
    if (actionHistory.currentIndex >= actionHistory.actions.length - 1) return;
    
    actionHistory.currentIndex++;
    const action = actionHistory.actions[actionHistory.currentIndex];
    const handler = actionHandlers.get(action.type);
    
    if (!handler) {
        console.warn(`No handler registered for action type: ${action.type}`);
        actionHistory.currentIndex--;
        return;
    }
    
    isSilentMode = true;
    handler.redo(action);
    isSilentMode = false;
    
    redrawRays();
    updateUndoRedoUI();
}
```

**Step 4: Integration Points** (Same as before, but calls recordAction)
- Add Undo/Redo buttons to toolbar
- Enable/disable based on history state
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)
- Show action description on hover

#### Key Considerations

- **Silent Operations**: Operations during undo/redo shouldn't record new actions
- **Batch Operations**: Group related actions (e.g., multi-select move)
- **Memory Management**: Limit history size, consider compacting old actions
- **State Snapshots**: For complex operations, store full state snapshot
- **Hierarchy Consistency**: Ensure parent-child links are maintained correctly

---

### Plan 2: JSON Export/Import System

**Design Philosophy**: Export complete schematic state to JSON for persistence and sharing. Import reconstructs schematic by replaying actions and restoring state.

#### JSON Schema

```javascript
{
    version: "1.0",                    // Schema version for compatibility
    timestamp: "2026-02-10T12:00:00Z",
    metadata: {
        filename: "my_schematic.json",
        author: "",                     // Optional
        description: ""                 // Optional
    },
    
    // Action log for replay-based import
    actions: [
        {
            action: 'add',
            id: 1,
            type: 'objective',
            parentId: null,
            timestamp: 1234567890
        },
        {
            action: 'add',
            id: 2,
            type: 'lens',
            parentId: 1,
            timestamp: 1234567891
        },
        // ... more actions
    ],
    
    // Complete component state (snapshot-based import fallback)
    components: [
        {
            id: 1,
            type: 'objective',
            posX: 0,
            posY: 0,
            rotation: 0,
            scaleX: 1.0,
            scaleY: 1.0,
            parentId: null,
            children: [2, 3],
            visible: true,
            selected: false,
            arrowX: 150,
            arrowY: 0,
            
            // Ray configuration
            rayShape: ['collimated'],
            rayPolygonColor: ['#00ffff'],
            rayPolygonColor2: ['#ff00ff'],
            gradientEnabled: [false],
            
            // Aperture/optical properties
            dimensions: {
                width: 129,
                height: 60,
                centerPoint: { x: 0, y: 0 },
                upVector: { x: 0, y: -1 },
                forwardVector: { x: 1, y: 0 },
                apertureRadius: 15,
                coneAngle: 0,
                rayShape: 'collimated',
                aperturePoints: {
                    upper: { x: 0, y: -15 },
                    lower: { x: 0, y: 15 }
                }
            }
        },
        // ... more components
    ],
    
    // Global settings
    settings: {
        gridVisible: true,
        traceLinesVisible: false,
        raysVisible: true,
        viewport: {
            x: 0,
            y: 0,
            width: 1000,
            height: 750
        }
    }
}
```

#### Export Implementation

**Step 1: Prepare Export Data**
```javascript
function exportSchematic() {
    // Deselect all components (clean state)
    deselectAll();
    
    // Build actions array from history
    const actions = actionHistory.actions.map(action => ({
        action: action.type === 'add' ? 'add' : 'remove',
        id: action.componentId,
        type: action.componentType,
        parentId: action.parentId,
        timestamp: action.timestamp
    }));
    
    // Build components array from current state
    const components = Object.values(componentState).map(comp => ({
        id: comp.id,
        type: comp.type,
        posX: comp.posX,
        posY: comp.posY,
        rotation: comp.rotation,
        scaleX: comp.scaleX,
        scaleY: comp.scaleY,
        parentId: comp.parentId,
        children: [...comp.children],
        visible: comp.visible,
        arrowX: comp.arrowX,
        arrowY: comp.arrowY,
        rayShape: [...comp.rayShape],
        rayPolygonColor: [...comp.rayPolygonColor],
        rayPolygonColor2: comp.rayPolygonColor2 ? [...comp.rayPolygonColor2] : [],
        gradientEnabled: [...comp.gradientEnabled],
        dimensions: deepClone(comp.dimensions)
    }));
    
    // Get current viewport
    const svg = document.getElementById('canvas');
    const viewBox = svg.getAttribute('viewBox').split(' ').map(Number);
    
    return {
        version: "1.0",
        timestamp: new Date().toISOString(),
        metadata: {
            filename: getFilename() || "untitled.json",
            author: "",
            description: ""
        },
        actions: actions,
        components: components,
        settings: {
            gridVisible: gridVisible,
            traceLinesVisible: traceLinesVisible,
            raysVisible: raysVisible,
            viewport: {
                x: viewBox[0],
                y: viewBox[1],
                width: viewBox[2],
                height: viewBox[3]
            }
        }
    };
}
```

**Step 2: Download JSON File**
```javascript
function downloadJSON() {
    const data = exportSchematic();
    const json = JSON.stringify(data, null, 2); // Pretty print
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = data.metadata.filename;
    a.click();
    
    URL.revokeObjectURL(url);
}
```

#### Import Implementation

**Step 1: File Loading**
```javascript
function importSchematic() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        const data = JSON.parse(text);
        
        loadSchematic(data);
    };
    
    input.click();
}
```

**Step 2: Schematic Reconstruction**
```javascript
function loadSchematic(data) {
    // Validate version
    if (data.version !== "1.0") {
        console.warn('Unsupported schema version:', data.version);
    }
    
    // Clear current schematic
    clearCanvas();
    componentState = {};
    actionHistory.actions = [];
    actionHistory.currentIndex = -1;
    idCounter = 0;
    
    // Choose import strategy
    if (data.actions && data.actions.length > 0) {
        // Replay-based import (preferred)
        replayActions(data.actions, data.components);
    } else {
        // Snapshot-based import (fallback)
        restoreSnapshot(data.components);
    }
    
    // Restore global settings
    restoreSettings(data.settings);
    
    // Restore filename
    if (data.metadata.filename) {
        setFilename(data.metadata.filename);
    }
    
    // Final updates
    recalculateAllApertures();
    redrawRays();
    autoCenter();
}
```

**Step 3: Replay-Based Import** (Preferred)
```javascript
function replayActions(actions, componentsData) {
    // Create lookup map for component data
    const dataMap = {};
    componentsData.forEach(comp => {
        dataMap[comp.id] = comp;
    });
    
    // Track max ID for counter
    let maxId = 0;
    
    // Replay each action
    actions.forEach(actionData => {
        if (actionData.action === 'add') {
            const compData = dataMap[actionData.id];
            if (!compData) return;
            
            // Set ID counter to match original
            idCounter = actionData.id;
            
            // Select parent if exists
            if (actionData.parentId !== null) {
                const parentEl = document.querySelector(`[data-id="${actionData.parentId}"]`);
                if (parentEl) selectComponent(parentEl);
            } else {
                deselectAll();
            }
            
            // Add component
            const result = addComponentSilently(compData.type);
            
            // Restore all properties from snapshot
            restoreComponentProperties(result.id, compData);
            
            maxId = Math.max(maxId, actionData.id);
        }
        // Handle 'remove' actions if needed
    });
    
    // Update ID counter
    idCounter = maxId + 1;
}
```

**Step 4: Snapshot-Based Import** (Fallback)
```javascript
function restoreSnapshot(components) {
    // Sort by ID to maintain order
    components.sort((a, b) => a.id - b.id);
    
    // First pass: Create all components
    components.forEach(compData => {
        idCounter = compData.id;
        
        const result = addComponentSilently(compData.type);
        componentState[result.id] = {
            ...componentState[result.id],
            ...compData,
            children: [] // Reset, will rebuild in second pass
        };
        
        updateComponentTransform(result.element, compData);
    });
    
    // Second pass: Restore hierarchy
    components.forEach(compData => {
        if (compData.parentId !== null) {
            const parentState = componentState[compData.parentId];
            if (parentState && !parentState.children.includes(compData.id)) {
                parentState.children.push(compData.id);
            }
        }
    });
    
    // Update ID counter
    idCounter = Math.max(...components.map(c => c.id)) + 1;
}
```

**Step 5: Property Restoration**
```javascript
function restoreComponentProperties(id, compData) {
    const state = componentState[id];
    const element = document.querySelector(`[data-id="${id}"]`);
    
    // Position & transform
    state.posX = compData.posX;
    state.posY = compData.posY;
    state.rotation = compData.rotation;
    state.scaleX = compData.scaleX;
    state.scaleY = compData.scaleY;
    updateComponentTransform(element, state);
    
    // Arrow position
    state.arrowX = compData.arrowX;
    state.arrowY = compData.arrowY;
    
    // Visibility
    state.visible = compData.visible;
    if (!compData.visible) hideComponent(element);
    
    // Ray configuration
    state.rayShape = [...compData.rayShape];
    state.rayPolygonColor = [...compData.rayPolygonColor];
    state.rayPolygonColor2 = compData.rayPolygonColor2 ? [...compData.rayPolygonColor2] : [];
    state.gradientEnabled = [...compData.gradientEnabled];
    
    // Dimensions (deep clone)
    state.dimensions = deepClone(compData.dimensions);
    
    // Hierarchy (already set, but ensure consistency)
    state.parentId = compData.parentId;
    state.children = [...compData.children];
}
```

#### Integration Points

**Export Button Handler**:
```javascript
document.getElementById('export-schematic-btn').addEventListener('click', () => {
    downloadJSON();
});
```

**Import Button Handler**:
```javascript
document.getElementById('import-schematic-btn').addEventListener('click', () => {
    importSchematic();
});
```

**Keyboard Shortcuts**:
```javascript
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
            e.preventDefault();
            downloadJSON();
        } else if (e.key === 'o') {
            e.preventDefault();
            importSchematic();
        }
    }
});
```

#### Error Handling

```javascript
function loadSchematic(data) {
    try {
        // Validate structure
        if (!data.components || !Array.isArray(data.components)) {
            throw new Error('Invalid schematic format: missing components array');
        }
        
        // Check for circular references
        validateHierarchy(data.components);
        
        // Proceed with import
        // ...
        
    } catch (error) {
        console.error('Failed to load schematic:', error);
        alert(`Failed to load schematic: ${error.message}`);
        
        // Don't leave canvas in broken state
        clearCanvas();
    }
}

function validateHierarchy(components) {
    const compMap = new Map(components.map(c => [c.id, c]));
    
    components.forEach(comp => {
        // Check parent exists
        if (comp.parentId !== null && !compMap.has(comp.parentId)) {
            throw new Error(`Component ${comp.id} references non-existent parent ${comp.parentId}`);
        }
        
        // Check for self-reference
        if (comp.parentId === comp.id) {
            throw new Error(`Component ${comp.id} references itself as parent`);
        }
        
        // Check children exist
        comp.children.forEach(childId => {
            if (!compMap.has(childId)) {
                throw new Error(`Component ${comp.id} references non-existent child ${childId}`);
            }
        });
    });
}
```

#### Key Considerations

- **Version Compatibility**: Check schema version, handle migrations
- **Data Validation**: Validate JSON structure before loading
- **Error Recovery**: Don't leave canvas in broken state on error
- **ID Management**: Properly restore and update ID counter
- **Hierarchy Integrity**: Validate parent-child relationships
- **Silent Operations**: Import shouldn't trigger undo recording
- **Auto-Save**: Consider periodic auto-save to localStorage
- **File Format**: Use `.json` extension, human-readable formatting

---

## Next Steps for Development

### Immediate (Complete Core)
1. Complete aperture scaling for divergent/convergent rays
2. Implement ray configuration UI (port from scripts_backup/rayMenu.js)
3. Add multi-ray support (extend arrays in state)
4. Implement trace lines toggle

### Short-Term (Improve UX)
5. **Implement JSON export/import** (high priority for persistence)
6. **Implement undo/redo system** (high priority for UX)
7. Add SVG export with cleanup
8. Implement component flip (horizontal/vertical)
9. Add component preview tooltips
10. Gallery system for examples

### Long-Term (Polish)
11. Keyboard shortcuts (Ctrl+Z, Ctrl+S, etc.)
12. Debug visualization toggle
13. Performance optimization for large schematics
14. Auto-save to localStorage
15. Collaborative editing (future consideration)

---

## Ray Drawing System (Consolidated from Analysis)

### Legacy Implementation Overview

The legacy system (scripts_backup/) had a sophisticated 426-line ray drawing implementation with:

**Features**:
- **4 Ray Shapes**: Collimated, divergent, convergent, manual
- **Multi-Ray Layers**: Multiple rays per parent-child connection with independent configs
- **Gradient Rendering**: Perpendicular gradients with HSL interpolation
- **Display Modes**: Dotted outlines, solid fills, or both
- **Interactive UI**: 745-line ray configuration menu with dual-knob color pickers
- **Automatic Aperture Scaling**: Projection-based algorithm for visual coherence

### Current Status (scripts/)

**Implemented**:
- ✅ Basic trace lines (dotted center lines)
- ✅ Component class with aperture properties

**Not Implemented**:
- ❌ Aperture ray polygon rendering
- ❌ Ray shape geometries
- ❌ Aperture scaling algorithm
- ❌ Multi-ray support
- ❌ Gradient system
- ❌ Ray configuration UI

### Ray Shape Geometries

#### 1. Collimated (Parallel Rays)
```
Parent Aperture → Child Aperture
Vertices: [parentUpper, childUpper, childLower, parentLower]
Use case: Lenses, mirrors, most optical elements
```

#### 2. Divergent (Expanding Rays)
```
Parent Center → Child Aperture
Vertices: [parentCenter, childUpper, childLower, parentCenter]
Use case: Light sources, point emitters
Aperture scaling: radius = distance × tan(coneAngle)
```

#### 3. Convergent (Focusing Rays)
```
Parent Aperture → Child Center
Vertices: [parentUpper, childCenter, childCenter, parentLower]
Use case: Focal points, detectors
Aperture scaling: Dynamic cone angle from geometry
```

#### 4. Manual
```
Same as collimated, but user controls aperture radius
No automatic scaling
```

### Aperture Scaling Algorithm (Critical Component)

**Purpose**: Calculate optimal aperture radius so rays appear visually coherent when components are positioned/rotated arbitrarily.

**Key Steps**:
1. **Calculate Projections**: Project parent/child apertures onto perpendicular to center line
2. **Determine Scaling Ratio**: Based on projection mismatch
3. **Apply Ray Shape Policy**:
   - **Collimated**: `scalingRatio = parentProj / childProj`
   - **Divergent**: `radius = distance × tan(coneAngle)` (cone angle inherited or calculated)
   - **Convergent**: Dynamic `coneAngle = atan(parentProj / distance)`, then scale
   - **Manual**: No scaling, user controls
4. **Recursive Update**: Propagate changes to all descendant components

**Projection Calculation**:
```javascript
// Transform upVectors to global coords (account for rotation)
childGlobalUp = rotate(childUpVector, childRotation)
parentGlobalUp = rotate(parentUpVector, parentRotation)

// Calculate perpendicular to center line
centerLine = childCenter - parentCenter
perpendicular = rotate(centerLine, 90°)

// Project upVectors onto perpendicular
childProjection = |childGlobalUp · perpendicular| × childRadius
parentProjection = |parentGlobalUp · perpendicular| × parentRadius
```

### Gradient System

**Perpendicular Gradient**: Gradient runs perpendicular to ray direction (across ray width, not along length)

**Algorithm**:
1. Calculate ray width from max projection
2. Calculate ray direction (parent center → child center)
3. Calculate perpendicular direction
4. Position gradient endpoints at ±rayWidth from center
5. Create 5-stop gradient interpolating in HSL color space
6. Apply with `fill="url(#gradient-id)"`

### Multi-Ray Data Structure

```javascript
// Component state (current implementation needs this)
{
    // Ray configuration arrays (index = layer)
    rayShape: ['collimated', 'divergent', 'convergent'],
    rayPolygonColor: ['#00ffff', '#ff00ff', '#ffff00'],
    rayPolygonColor2: ['#0000ff', '#ff0000', '#00ff00'],  // Gradient end colors
    gradientEnabled: [true, false, true],
    rayOpacity: [0.2, 0.2, 0.2]  // Per-ray opacity
}
```

### Ray Configuration UI Components

**Per-Ray Controls** (needs implementation):
1. **Shape Dropdown**: Select collimated/divergent/convergent/manual
2. **Aperture Slider**: For manual mode only (0-50, step 0.1)
3. **Hue Slider**: Single-knob (solid) or dual-knob (gradient)
4. **Gradient Toggle**: Switch between solid/gradient
5. **Color Swatch**: Show/apply colors from other components
6. **Add/Remove Buttons**: Manage ray layers

**Menu Behavior**:
- Banner at top of canvas
- One row per ray layer
- Dynamic width matching canvas
- Show when component selected
- Hide when deselected or dragging

---

## Flexible Implementation Plan

### Decision Framework: What to Implement First?

**Priority Factors**:
1. **User Value**: Features users need most
2. **Dependency Chain**: What's required for other features
3. **Complexity**: Balance quick wins with complex features
4. **Risk**: Get critical/difficult parts working early

### Dependency Map

```
Foundation Layer (Must implement first):
├── Component State System ✅
├── Hierarchy System ✅
├── Canvas/Viewport ✅
├── Basic Interaction ✅
└── Coordinate Transforms ✅

Core Optical Layer (Critical path):
├── Aperture Point Calculation ❌
├── Projection Algorithm ❌
├── Basic Ray Rendering (collimated) ❌
│   └── Enables: Visual feedback for component placement
└── Aperture Scaling (collimated) ❌
    └── Enables: Coherent ray appearance

Advanced Optical Layer:
├── Divergent/Convergent Shapes 🔄
│   └── Requires: Aperture scaling working
├── Multi-Ray Support ❌
│   └── Requires: Basic ray rendering
└── Gradient System ❌
    └── Requires: Multi-ray support

User Interface Layer:
├── Ray Configuration Menu ❌
│   └── Requires: Ray rendering + multi-ray
├── Component Menu/Library UI 🔄
├── Gallery System ❌
└── Preview Tooltips ❌

Persistence Layer:
├── JSON Export ✅ (basic)
├── JSON Import ✅ (basic)
├── SVG Export ❌
└── Undo/Redo System ❌
    └── Can implement anytime (parallel track)

Polish Layer:
├── Trace Lines ✅
├── Debug Visualization ❌
├── Component Flip ❌
└── Keyboard Shortcuts ❌
```

### Recommended Implementation Phases

#### **Phase 1: Core Ray System (Week 1)** - Foundation
**Goal**: Get basic ray rendering working

**Priority**: CRITICAL - Enables visual feedback

**Tasks**:
1. ✅ Day 1-2: **Aperture Point Calculation**
   - Implement `calculateAperturePoints()`
   - Add to Component class
   - Test with various rotations

2. ✅ Day 2-3: **Basic Ray Rendering (Collimated)**
   - Create `DrawApertureRays.js`
   - Render 4-point polygon for collimated rays
   - Solid color only (no gradients)
   - Hook into `updateRays()`

3. ✅ Day 3-4: **Projection Calculation**
   - Implement `calculateProjections()`
   - Handle coordinate transforms
   - Test with various component orientations

4. ✅ Day 4-5: **Collimated Aperture Scaling**
   - Implement projection-based scaling
   - Recursive child updates
   - Test with drag/rotate interactions

**Deliverable**: Components with working collimated rays that scale correctly

---

#### **Phase 2: Ray Shapes (Week 2)** - Expand Capabilities
**Goal**: Support all ray types

**Priority**: HIGH - Core feature differentiation

**Tasks**:
1. 🔄 Day 1-2: **Divergent Ray Geometry**
   - Implement cone-based scaling
   - Cone angle calculation/inheritance
   - Test with light source components

2. 🔄 Day 2-3: **Convergent Ray Geometry**
   - Dynamic cone angle calculation
   - Test with detector components

3. 🔄 Day 3-4: **Manual Mode**
   - Disable auto-scaling
   - Store user-set radius
   - Update cone angle only

4. 🔄 Day 4-5: **Ray Shape Switching**
   - Add property to component state
   - Recalculate aperture on shape change
   - Test transitions between shapes

**Deliverable**: All 4 ray shapes working with proper geometry

---

#### **Phase 3: Multi-Ray & Gradients (Week 3)** - Visual Enhancement
**Goal**: Multiple rays per connection, gradient fills

**Priority**: MEDIUM-HIGH - Differentiates from basic tools

**Tasks**:
1. ❌ Day 1-2: **Multi-Ray Data Structure**
   - Extend component state with arrays
   - Modify rendering loop for multiple rays
   - Test with 2-3 rays per connection

2. ❌ Day 2-3: **Gradient Rendering**
   - Implement perpendicular gradient calculation
   - SVG gradient element creation
   - HSL color interpolation
   - Test with various orientations

3. ❌ Day 3-4: **Display Modes**
   - Dotted outline mode
   - Solid fill mode
   - Both mode
   - Toggle controls

4. ❌ Day 4-5: **Ray Appearance Controls**
   - Opacity setting
   - Color selection
   - Per-ray configuration

**Deliverable**: Multiple colored rays with gradients

---

#### **Phase 4: Configuration UI (Week 4)** - User Control
**Goal**: Interactive menu for ray configuration

**Priority**: MEDIUM - Required for user customization

**Tasks**:
1. ❌ Day 1-2: **Basic Menu Structure**
   - Banner layout
   - Show/hide on selection
   - Position at canvas top

2. ❌ Day 2-3: **Shape & Aperture Controls**
   - Shape dropdown
   - Aperture slider (manual mode)
   - Connect to state updates

3. ❌ Day 3-4: **Color Controls**
   - Single hue slider
   - Dual-knob slider for gradients
   - Color swatch panel

4. ❌ Day 4-5: **Multi-Ray Management**
   - Add/remove ray buttons
   - Per-ray configuration rows
   - Copy ray settings

**Deliverable**: Full interactive ray configuration UI

---

#### **Phase 5: Undo/Redo (Week 5)** - User Experience
**Goal**: Implement action history system

**Priority**: MEDIUM - Parallel to Phase 3/4

**Tasks**:
1. ❌ Day 1-2: **Action Recording System**
   - Implement expandable action log
   - Register core handlers
   - Hook into existing operations

2. ❌ Day 2-3: **Undo/Redo Operations**
   - Implement undo logic
   - Implement redo logic
   - Test with various actions

3. ❌ Day 3-4: **UI Integration**
   - Add undo/redo buttons
   - Keyboard shortcuts (Ctrl+Z/Y)
   - Action descriptions

4. ❌ Day 4-5: **Testing & Edge Cases**
   - Test all action types
   - Batch operations
   - History limits

**Deliverable**: Working undo/redo with keyboard shortcuts

---

#### **Phase 6: Import/Export (Week 5)** - Persistence
**Goal**: Robust JSON export/import

**Priority**: MEDIUM - Parallel to Phase 5

**Tasks**:
1. ✅ Day 1-2: **Export Implementation** (mostly done)
   - Clean state preparation
   - JSON schema generation
   - File download

2. ✅ Day 2-3: **Import Implementation** (mostly done)
   - File loading
   - JSON validation
   - State restoration

3. ❌ Day 3-4: **Error Handling**
   - Schema validation
   - Hierarchy validation
   - Graceful error recovery

4. ❌ Day 4-5: **SVG Export**
   - Clean up temporary elements
   - Serialize SVG DOM
   - Download formatted SVG

**Deliverable**: Reliable save/load with SVG export

---

#### **Phase 7: Polish & Advanced Features (Week 6+)** - Enhancement
**Goal**: Improve UX and add nice-to-have features

**Priority**: LOW - Can be deferred

**Tasks**:
- ❌ Gallery system with examples
- ❌ Component preview tooltips
- ❌ Debug visualization mode
- ❌ Component flip operations
- ❌ Additional keyboard shortcuts
- ❌ Performance optimization
- ❌ Auto-save to localStorage

---

### Alternative Priority Orders

#### **Option A: User-Centric (Recommended)**
Focus on delivering complete user-facing features sequentially.

```
1. Phase 1: Core Ray System (critical)
2. Phase 2: Ray Shapes (expand capabilities)
3. Phase 4: Configuration UI (enables customization)
4. Phase 3: Multi-Ray & Gradients (visual polish)
5. Phase 5: Undo/Redo (UX improvement)
6. Phase 6: Import/Export improvements
7. Phase 7: Polish features
```

**Rationale**: Users get working ray system ASAP, then controls, then polish.

---

#### **Option B: Technical (Risk-First)**
Tackle hardest problems first to derisk project.

```
1. Phase 1: Core Ray System
2. Phase 2: Ray Shapes (complex geometry)
3. Phase 3: Multi-Ray & Gradients (complex rendering)
4. Phase 5: Undo/Redo (complex state management)
5. Phase 4: Configuration UI (UI polish)
6. Phase 6: Import/Export
7. Phase 7: Polish
```

**Rationale**: Get complex algorithms working early, UI is easier to adjust later.

---

#### **Option C: Incremental (Balanced)**
Deliver small increments with immediate value.

```
1. Phase 1: Core Ray System (collimated only)
   → Deploy: Basic working version
2. Phase 2: Ray Shapes
   → Deploy: Full ray capabilities
3. Phase 5: Undo/Redo (parallel track)
4. Phase 4: Configuration UI (basic version)
   → Deploy: User customization
5. Phase 3: Multi-Ray & Gradients
   → Deploy: Advanced visualization
6. Phase 6: Import/Export (SVG)
7. Phase 7: Polish
```

**Rationale**: Multiple deployment points, early user feedback.

---

### Flexible Adaptation Strategy

**Checkpoint After Each Phase**:
1. Review what's working
2. Gather user feedback (if applicable)
3. Re-prioritize remaining phases
4. Adjust scope based on complexity

**If Time Constrained**:
- Phase 1 + Phase 2 = Minimum Viable Product
- Add Phase 4 (basic UI) for usability
- Defer Phase 3, 5, 6, 7

**If Ahead of Schedule**:
- Start Phase 5 in parallel with Phase 3
- Add Phase 7 features incrementally
- Consider additional features:
  - Real-time collaboration
  - Component marketplace
  - Advanced export formats (PDF, PNG)

---

## Quick Reference (Updated)

**Add Component**: Select parent → Click component button → Spawns at arrow position  
**Move**: Drag component → Snaps to grid → Rays update  
**Rotate**: Drag rotation handle → Snaps to angle increments  
**Scale**: Drag scale handle → Maintains aspect ratio  
**Configure Rays**: Click component → Menu appears (needs implementation)  
**Export**: JSON for save/load, SVG for presentation (SVG pending)  
**Import**: Load JSON → Replays actions → Rebuilds schematic  

**Key Concept**: Components define everything. Rays are derived. Hierarchy drives updates.



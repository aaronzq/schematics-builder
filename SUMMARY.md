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
  - Snaps to DRAGGING_SNAP_INCREMENT (1) per component
  - Updates rotation/scale/arrow handles during drag
  
- **Mode 2**: Drag entire multi-selection without focus
  - Triggered by: Mousedown inside unified bounding box (not on any component)
  - If transitioning from Mode 3: Removes currentId (clears focus)
  - Snaps to DRAGGING_SNAP_INCREMENT (1) as a group (maintains exact relative positions)
  - Updates group rotation/scale handles during drag
  - No arrow handle (currentId becomes null)
  
- **Mode 3**: Drag entire multi-selection with focused component
  - Triggered by: Mousedown on any grouped component
  - Snaps to DRAGGING_SNAP_INCREMENT (1) as a group (maintains exact relative positions)
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
  - **Composite-aware**: When `currentId` is a composite exit port, the button checks and operates on the **entry port's** external parent instead (the composite is treated as a single opaque unit)
  - Removes the component's parent relationship
  - Updates children array of former parent
  - Automatically updates ray visualization and toolbar buttons
- `re-link-btn` - Change parent of the current component (currentId)
  - Visibility: Always shown when `currentId` is set
  - Enters interactive re-link mode with visual feedback
  - **Composite-aware**: When `currentId` is a composite exit port, re-link mode operates on the **entry port** and excludes all sibling members of the same composite instance from valid parent candidates
  - Shows dotted red line from component to current parent (if exists)
  - Click any other component to set as new parent
  - Includes cycle detection to prevent circular parent relationships
  - Cannot link component to itself or to any member of the same composite instance
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

#### 5.2 Ray Shapes (5 Types)

**1. Collimated (Parallel Rays)**
- **Geometry**: Parent aperture → Child aperture (4-vertex polygon)
- **Vertices**: `[parentUpper, childUpper, childLower, parentLower]`
- **Use Case**: Lenses, mirrors, most optical elements
- **Aperture Scaling**: `scalingRatio = parentProjection / childProjection`
  - Projects aperture points onto perpendicular to center line
  - Maintains parallel ray appearance regardless of rotation

**2. Divergent (Expanding Rays)**
- **Geometry**: Parent center → Child aperture (triangular polygon)
- **Vertices**: `[parentCenter, childUpper, childLower]`
- **Use Case**: Light sources, point emitters
- **Aperture Scaling**: `radius = distance × tan(coneAngle)`
  - Cone angle inherited from parent or calculated from geometry
  - Aperture grows linearly with distance

**3. Convergent (Focusing Rays)**
- **Geometry**: Parent aperture → Child center (triangular polygon)
- **Vertices**: `[parentUpper, childCenter, parentLower]`
- **Use Case**: Focal points, detectors
- **Aperture Scaling**: Child aperture is fully decoupled (user-controlled)
  - `coneAngle` computed from geometry: `acos(dot(axis, edge) / (|axis|×|edge|))`
  - User controls `apertureRadius` directly via slider

**4. Manual**
- **Geometry**: Same as collimated (4-vertex polygon)
- **Aperture Scaling**: None — user controls radius directly
- **Use Case**: Custom aperture control, override auto-scaling
- **User Control**: Slider adjusts aperture radius (0-200)

**5. Array (Multi-Element)**
- **Geometry**: Multiple 4-vertex polygons, one per matching segment pair
- **Vertices per segment**: `[parentSegTop[i], childSegTop[i], childSegBot[i], parentSegBot[i]]`
- **Use Case**: Fiber bundles, multi-element apertures, segmented beam splitters
- **Parameters**: `arraySegments` (1–10) and `arrayGap` (gap between segments in local units)
- **Aperture Scaling**: Same projection-based scaling as collimated; gaps scale proportionally
- **Array-to-Array**: Both parent and child must be 'array'; segments connect pairwise (min count used)

#### 5.3 Single-Ray-Per-Component Model

Each component has **one** ray configuration. The current implementation uses a flat
per-component model rather than per-connection ray arrays.

**Data Structure** (per component):
```javascript
{
    rayShape: 'collimated',          // One of: 'collimated' | 'divergent' | 'convergent' | 'manual' | 'array'
    rayPolygonColor: '#00ffff',      // HSL or hex color string
    rayPolygonOpacity: 0.2,          // 0–1 fill opacity
    rayColorInheritFromParent: true, // If true, inherits parent's color & opacity on spawn
    apertureRadius: 15,              // Half-width of aperture in local units
    apertureCenterOffset: 0,         // Signed offset along upVector (manual & array only)
    arraySegments: 5,                // Number of segments (array only)
    arrayGap: 0,                     // Gap between segments in local units (array only)
    coneAngle: 0,                    // Half-angle in degrees (divergent/convergent)
}
```

**Rendering Order**:
- Aperture rays polygon group (`#aperture-rays`) inserted before trace-lines and schematics
- One polygon element per parent-child connection (or N polygons for array-to-array)
- Color propagation: when a component is spawned, if `rayColorInheritFromParent` is true,
  the child inherits `rayPolygonColor` and `rayPolygonOpacity` from its parent.

#### 5.4 Gradient Rendering System

**Status**: Not yet implemented in `scripts/`. Rays currently render as solid-color SVG polygons only.

The legacy `scripts_backup/` contained a gradient system (perpendicular HSL gradient across ray width) which has not been ported. The current `_createPolygonElement` helper sets `fill` to a flat `child.rayPolygonColor` and `fill-opacity` to `child.rayPolygonOpacity`.

#### 5.5 Ray Display Modes

**Current (scripts/)**: Two independent toggles via toolbar buttons:
- **Toggle Rays** (`rays-toggle-btn`) — shows/hides solid aperture ray polygons (`showApertureRays` flag in `ApertureRays.js`)
- **Toggle Trace** (`trace-btn`) — shows/hides center dotted trace lines (`showTraceLines` flag in `TraceLines.js`)

Each toggle is fully independent and re-renders on change.

**Not yet implemented**: Combined display mode cycling (Both / Dotted Only / Solid Only / Hide), dotted boundary lines on aperture edges.

#### 5.6 Aperture Scaling Algorithm

**Purpose**: Automatically calculate optimal aperture radius so rays appear visually coherent when components are positioned/rotated arbitrarily.

**Projection-Based Scaling** (Collimated / Array):
```javascript
// 1. Transform upVectors to global coordinates
childGlobalUp  = rotate(child.upVector,  child.rotation)
parentGlobalUp = rotate(parent.upVector, parent.rotation)

// 2. Calculate perpendicular to center line
centerLine   = childCenter - parentCenter
perpendicular = rotate90(centerLine)   // 90° CCW unit vector

// 3. Project upVectors onto perpendicular
childProjection  = |childGlobalUp  · perpendicular| × childRadius
parentProjection = |parentGlobalUp · perpendicular| × parentRadius

// 4. Scale child radius to match parent projection
scalingRatio = parentProjection / childProjection
newRadius    = childRadius × scalingRatio
```

**Manual — No Auto-Scaling**: Manual mode skips radius scaling entirely. Only `coneAngle` is computed and stored from geometry for display in the ray panel.

**Array Aperture Scaling**:
- When **parent is array or collimated**: child 'array' uses the same projection-based radius scaling. Segments rescale proportionally (derived from `apertureRadius`); `arrayGap` is re-clamped after radius changes.
- When **child is array but parent is not array**: child is treated as **manual** — `apertureRadius`, `apertureCenterOffset`, `arraySegments`, and `arrayGap` are all user-controlled with no auto-scaling.

**Divergent Scaling**:
```javascript
distance = |childApertureCenter - parentApertureCenter|
if (parent.coneAngle !== 0) {
    child.coneAngle = parent.coneAngle          // inherit
    newRadius = distance × tan(parent.coneAngle)
} else {
    // keep child radius, derive cone angle from geometry
    child.coneAngle = atan2(child.apertureRadius, distance)
}
```

**Convergent Scaling**: Child aperture is fully decoupled from parent — user sets `apertureRadius` directly. `coneAngle` is computed from `acos(dot(axis, edge) / (|axis| × |edge|))` and stored purely for display.

**Crossing Correction**: After projection-based scaling, if the upper ray (parentUpper→childUpper) and lower ray (parentLower→childLower) intersect, the child's `upVector` is negated and scaling is re-applied. This correction is **skipped** when either aperture radius is 0.

**Recursive Updates**: `recursivelyUpdateChildrenApertures(component, getComponent)` — walks tree depth-first; parents scaled before children. Triggered by drag, rotation, scale, parent change, or ray config change.

#### 5.7 Trace Lines (Center Lines)

**Purpose**: Dotted lines connecting component centers to show optical axis.

**Rendering**:
- Black dotted lines (stroke-dasharray: "5,5")
- Connects parent center → child center
- Drawn behind components (in separate `#trace-lines-group` SVG group)
- Independent of ray display (can show/hide separately)

**Toggle**: Separate from ray visibility toggle

#### 5.8 Ray Configuration UI (Right Panel)

**Implementation**: `scripts/rays/RayMenu.js`, rendered into `#ray-panel-body`.
Updates whenever selection changes via `ComponentManager.onSelectionChanged` callback.

**Panel Layout**: Fixed right-side panel; shows empty state when nothing selected.

**Per-Component Controls**:
1. **Ray Shape Dropdown**: Select collimated / divergent / convergent / manual / array
2. **Color Section**:
   - **Inherit from Parent** checkbox (disabled for non-entry composite members)
   - **Color Hue** slider (0–359°, synced across children when inherit is on)
   - **Opacity** slider (0–1, step 0.05)
3. **Aperture Radius** slider (0–200; disabled when parent controls aperture, e.g. collimated/array with parent)
4. **Center Offset** slider (-100 to 100; shifts aperture along `upVector`)
5. **Array Settings section** (visible only when shape = 'array'):
   - **Segments** number input (1–10)
   - **Gap** slider (0–2, step 0.1)

**Composite-aware behavior**:
- Non-entry composite members show "Inherit from parent (entry port only)" lock note
- `rayLocked` members still respond to intra-composite propagation

**Interaction Behavior**:
- Panel renders immediately when `currentId` changes
- Color propagation: changing hue/opacity cascades to all descendants with `rayColorInheritFromParent = true`
- All slider changes call `updateRays()` and `rebuildDebugForComponent()` in real time

#### 5.9 Implementation Status

**Current (scripts/) - Fully Implemented**:
- ✅ All 5 ray shapes: collimated, divergent, convergent, manual, array (`ApertureRays.js`)
- ✅ Array-to-array segment-pair rendering
- ✅ Projection-based aperture scaling with crossing-correction and upVector flip (`ApertureScaling.js`)
- ✅ Cone-based scaling for divergent (inherit or derive cone angle)
- ✅ Convergent aperture decoupling (user-controlled radius + computed coneAngle)
- ✅ Recursive aperture updates via `recursivelyUpdateChildrenApertures`
- ✅ Composite-aware aperture cascades (intra-instance vs. external parent)
- ✅ Ray configuration right-panel UI (`RayMenu.js`)
- ✅ Color inheritance propagation down the component tree
- ✅ Trace lines (`TraceLines.js`)
- ✅ Toggle controls (aperture rays + trace lines separately)

**Not Yet Implemented in scripts/**:
- ❌ Gradient rendering (solid color only; no HSL perpendicular gradient)
- ❌ Multi-ray layers per connection (one polygon per parent-child pair only)
- ❌ Display mode toggling (both/dotted/solid) — currently solid only
- ❌ Color swatch picker

**Legacy scripts_backup/** contains the old gradient + multi-ray implementation for reference.

#### 5.10 Key Constants (from legacy config)

```javascript
DEFAULT_SOLID_RAY_COLOR = '#00ffff'      // Cyan default
DEFAULT_RAY_POLYGON_OPACITY = 0.2        // 20% opacity for polygons
RAY_SHAPES = ['collimated', 'divergent', 'convergent', 'manual', 'array']
DRAGGING_SNAP_INCREMENT = 1              // SVG units
ROTATION_SNAP_INCREMENT = 2.5            // degrees
SCALE_SNAP_INCREMENT = 0.1
MIN_SCALE = 0.8
MAX_SCALE = 2.0
DEFAULT_ARRAY_SEGMENTS = 5
MAX_ARRAY_SEGMENTS = 10
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
- **Component Manager**: State management, add/remove, positioning, rotation, composite expansion
- **Interaction System**: Drag, rotation handle, scale handle, arrow handle, selection box, re-link mode
- **Event System**: Mouse/keyboard handlers, selection logic
- **UI Elements**: Value display, hover handlers, button handlers, sidebar resize
- **Ray Rendering**: All 5 ray shapes (collimated, divergent, convergent, manual, array) with solid-color polygons
- **Aperture Scaling**: Full projection-based and cone-based scaling with recursive updates and crossing correction
- **Trace Lines**: Center dotted lines with independent toggle
- **Ray Configuration Panel**: Right-side panel with shape, color, opacity, radius, offset, array settings
- **Composite Components**: Built-in composites (CompositeLibrary.js), user-defined composites (SaveCompositeDialog.js + UserComponentStore.js + localStorage), composite-aware ray/parent logic
- **Component Snapshots/Thumbnails**: SVG previews in sidebar (ComponentSnapshot.js)
- **Component Flipping**: Horizontal/vertical flip with reflection matrix transform
- **Debug Visualization**: DebugLayer.js — center markers, up/forward vectors, aperture points, array segment points (toggle via `SHOW_DEBUG_DRAWING` in config.js)
- **File I/O**: Filename editor (Google Docs-style)

### ❌ Not Yet Implemented
- **JSON Import/Export**: `import-schematic-btn` and `export-schematic-btn` exist in HTML but have no JS handlers
- **SVG Export**: `export-svg-btn` exists in HTML but has no JS handler
- **Reset Canvas**: `reset-canvas-btn` exists in HTML but has no JS handler
- **Gallery Integration**: `gallery/index.html` exists; `saveCanvasAndNavigate()` called from HTML but not defined in scripts
- **Undo/Redo**: UI buttons exist (`undo-btn`, `redo-btn`) but no action history is implemented
- **Gradient Rendering**: Solid color only; no HSL perpendicular gradient
- **Multi-Ray Layers**: One polygon per parent-child pair; no stacked rays per connection
- **Ray Display Mode Toggling**: No "dotted only" / "solid only" / "both" modes yet


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
    apertureCenterOffset: number  // signed offset along upVector (manual & array)
    coneAngle: number
    rayShape: string          // 'collimated' | 'divergent' | 'convergent' | 'manual' | 'array'
    rayPolygonColor: string
    rayPolygonOpacity: number
    rayColorInheritFromParent: boolean
    arraySegments: number     // array mode only (1-10)
    arrayGap: number          // array mode only (gap between segments in local units)

    // Arrow handle
    arrowVector: { x, y }     // offset from centerPoint world pos to arrow tip

    // Hierarchy
    parent: number | null     // parent component id
    children: number[]        // child component ids
    isGrouped: boolean
    groupMembers: Set<number> // ids of all members in same group

    // Composite instance flags
    isCompositeInstance: boolean  // true if part of a spawned composite
    compositeKey: string | null   // back-reference to composite definition key
    compositeInstanceId: number | null  // unique ID per composite expansion
    isExitPort: boolean           // designated exit port of the composite
    isEntryPort: boolean          // designated entry port of the composite
    rayLocked: boolean            // true = ray/aperture config frozen from external cascades
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

#### localToWorld — the canonical transform helper

```javascript
// In Component.js — mirrors the SVG transform chain exactly (rotation + position only,
// no scale/flip — optical geometry is always scale/flip-independent)
localToWorld(localX, localY) {
  // translate(-cx,-cy) then rotate then translate(x,y)
  const lx = localX - cx;
  const ly = localY - cy;
  return {
    x: this.x + (lx * cos - ly * sin),
    y: this.y + (lx * sin + ly * cos)
  };
}
```

> **Note**: This is a **public** method on Component. Scale and flip are **excluded** by design — both are visual-only and must not affect ray geometry (apertures, arrow handle).

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

#### Aperture properties (per Component instance)

| Property | Type | Default | Description |
|---|---|---|---|
| `apertureCenter` | `{x,y}` | from definition | Local-space origin of the aperture face (immutable — from ComponentLibrary) |
| `apertureCenterOffset` | `number` | `0` | Signed displacement along `upVector` from `apertureCenter`. The effective center shifts but `apertureCenter` is preserved for reset/undo |
| `upVector` | `{x,y}` | from definition | Unit vector defining aperture orientation; may be flipped by crossing correction |
| `apertureRadius` | `number` | `15` | Half-height of the total aperture span along `upVector` |
| `aperturePoints` | `Array<{x,y}>` | computed | Local-space boundary points (2 for standard shapes; `segments×2` for array) |
| `coneAngle` | `number` | `0` | Half-angle of illumination cone in degrees |
| `rayShape` | `string` | `'collimated'` | One of: `collimated`, `divergent`, `convergent`, `manual`, `array` |
| `arraySegments` | `number` | `5` | Sub-aperture segment count (array mode only; max 10) |
| `arrayGap` | `number` | `0` | Gap between segments in local units (array mode only; clamped) |

#### Effective aperture center

```
effectiveCenter = apertureCenter + upVector × apertureCenterOffset
```

`apertureCenter` is **never mutated** — it comes from the component library definition. `apertureCenterOffset` is the user-adjustable parameter. Reset = set offset to `0`. Used by `_getEffectiveApertureCenter()`.

#### Aperture points by shape

| Ray Shape | Point Count | Layout |
|---|---|---|
| `collimated` | 2 | `[upper, lower]` — effectiveCenter ± upVector × radius |
| `divergent` | 2 | Same as collimated |
| `convergent` | 2 | Same as collimated |
| `manual` | 2 | Same — user adjusts radius and offset |
| `array` | `segments × 2` | Pairs of `[segTop, segBot]` ordered upper → lower |

#### Array segment geometry

For `n` segments, gap `g`, and aperture radius `r`:
```
totalSpan     = 2 × r
segmentLength = (totalSpan − (n−1) × g) / n
```
Walking from upper (+r) to lower (−r) along `upVector`:
```
seg[0].top = effectiveCenter + upVector × r
seg[0].bot = seg[0].top − upVector × segmentLength
  (gap g)
seg[1].top = seg[0].bot − upVector × g
  ...
```
**Gap clamping**: `arrayGap` ∈ `[0, 2r / (n−1)]` when `n > 1`; forced to `0` when `n = 1`.

**Segment count limit**: `arraySegments` ∈ `[1, MAX_ARRAY_SEGMENTS]` (= 10).

#### Trace lines (in `TraceLines.js`)
Dotted lines connect parent `apertureCenter` → child `apertureCenter` in world space (`getApertureCenterWorld()`).

#### Aperture scaling strategies

- **Collimated / Array**: Projection-based — `scalingRatio = parentProjection / childProjection` where each projection is `|globalUp · perpendicular| × radius`.
- **Divergent**: `radius = distance × tan(coneAngle)`; cone angle inherited from parent or derived from geometry.
- **Convergent**: Child aperture is user-controlled. `coneAngle` is computed from geometry for display only.
- **Manual**: Radius scaling skipped entirely. `coneAngle` stored for display only.
- **Array (non-array parent)**: Treated as manual — no auto-scaling.

**Recursion**: `recursivelyUpdateChildrenApertures(root, getComponent)` walks the tree depth-first, calling `applyApertureScaling(child, parent)` for each node. Triggered whenever a component moves, rotates, scales, changes parent, or changes its ray config.

### 4. Ray Visualization

**Ray Types** (4-vertex SVG polygons):
- **Collimated**: Parent aperture → Child aperture (parallel)
- **Divergent**: Parent center → Child aperture (expanding)
- **Convergent**: Parent aperture → Child center (focusing)

**Single-Ray per connection**: Each parent-child pair renders exactly one polygon (or N polygons for array-to-array). Color/opacity are per-component properties; change to a parent propagates down the tree when `rayColorInheritFromParent` is true.

**Rendering**: Rays drawn behind components (`#aperture-rays` group). Update triggered by any geometry change.

#### Rays module file map

| File | Purpose |
|---|---|
| `scripts/rays/DrawRays.js` | Orchestrator: triggers aperture scaling → trace lines → aperture ray polygons |
| `scripts/rays/ApertureScaling.js` | Projection-based scaling, crossing correction, recursive tree walk |
| `scripts/rays/ApertureRays.js` | SVG polygon rendering for all 5 ray shapes |
| `scripts/rays/TraceLines.js` | Center-to-center dotted lines |
| `scripts/rays/RayMenu.js` | Right-panel ray configuration UI |

### 5. Debug Visualization (`DebugLayer.js`)

All debug elements live inside `#debug-overlay` (world-space SVG group; no inherited transforms). Enabled/disabled globally by `SHOW_DEBUG_DRAWING` in `config.js`.

**Per-component debug elements** (built by `_buildDebugGroup(comp)`):

| Element | Attribute | Description |
|---|---|---|
| Center marker | Red dot | Component's `centerPoint` in world space |
| Up vector | Green arrow | Direction and length of `upVector` (`UP_VECTOR_LENGTH` = 60) |
| Forward vector | Blue arrow | Direction and length of `forwardVector` (`FORWARD_VECTOR_LENGTH` = 60) |
| Upper aperture dot | Blue (3px) | Top of aperture (`effectiveCenter + upVector × radius`) |
| Lower aperture dot | Blue (2px) | Bottom of aperture |
| Array segment dots | Grey (2px) | Top and bottom of each array segment (array mode only) |
| Manual offset marker | Orange dot | Effective aperture center when offset ≠ 0 (manual/array) |

**Key exports**:
```javascript
initDebugLayer()                    // called once at app start
refreshDebugLayer()                 // full rebuild (add/delete/load)
refreshDebugForComponent(comp)      // lightweight reposition (drag/rotate/scale)
rebuildDebugForComponent(comp)      // full rebuild for one component (config change)
removeDebugForComponent(compId)     // remove one component's debug group
```
`Component.onTransformChanged` static callback is set by `DebugLayer` to receive live transform updates during drag/rotate/scale without circular imports.

### 5. Composite Component System

#### Overview

Composite components are named groups of basic components with fixed relative positions and optical parameters. They appear and behave as single units from the outside but contain multiple `Component` instances internally.

#### Key Files
| File | Role |
|---|---|
| `CompositeLibrary.js` | Built-in composite definitions; merged into `components` registry at import time |
| `SaveCompositeDialog.js` | 3-phase `<dialog>` for saving selected components as a user composite |
| `UserComponentStore.js` | localStorage persistence for user composites; merges into registry on load |
| `ComponentSnapshot.js` | Generates SVG thumbnail for sidebar button (basic + composite) |

#### Composite Definition Schema
```javascript
{
    key: 'my-composite',
    label: 'My Composite',
    category: 'User Components',  // or 'Composite' for built-ins
    isComposite: true,
    isBuiltIn: false,   // true for CompositeLibrary entries
    members: [
        {
            type: 'lens',           // must match a ComponentLibrary key
            relX: 0, relY: 0,      // position relative to group centroid
            rotation: 0, scale: 1,
            apertureRadius: 20, coneAngle: 0,
            rayShape: 'collimated',
            rayPolygonColor: '#00ccff',
            internalParentIndex: null  // null = root member; number = index in members[]
        },
        // ...
    ],
    entryMemberIndex: 0,  // index of the entry port member
    exitMemberIndex: 2,   // index of the exit port member
}
```

#### Composite Instance Flags (per Component)
- `isCompositeInstance: true` — component is part of a spawned composite
- `compositeKey` — back-reference to the composite definition key
- `compositeInstanceId` — unique integer per expansion (distinguishes multiple instances of the same composite)
- `isEntryPort: true` — this member is the composite's entry; receives external parent links
- `isExitPort: true` — this member is the composite's exit; used for external child spawning and arrow handle
- `rayLocked: true` — non-entry members; aperture config frozen from external cascades (intra-composite cascades still propagate)

#### Composite-Aware Logic
- **Ray rendering**: `rawParent` is remapped to the composite's exit port for external connections
- **Re-link / cut-link**: operate on the entry port's external parent, not the exit port
- **Arrow handle**: shown on exit port only (forwardVector of the exit member drives spawn direction)
- **Save as Composite button** (`save-as-composite-btn`): visible when 2+ non-composite components selected (Mode 2)
- **Composite bbox**: drawn in grey (`COMPOSITE_BBOX_STROKE = '#555'`) to distinguish from the blue group bbox

#### Save-as-Composite Flow (3 phases)
1. **Phase A** — Name the composite; see a spatial SVG preview of selected components
2. **Phase B** — Click to pick the Entry Port in the preview
3. **Phase C** — Click to pick the Exit Port → saves to localStorage, merges into registry, rebuilds sidebar menu

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
(Not yet implemented — buttons exist in HTML but have no JS handlers)
Future: Export: Serialize component Map → JSON → download file
        Import: Load JSON → reconstruct Component instances → rebuild DOM → updateRays()
```

## Implementation Priorities

### Fully Implemented ✅
1. Component state management
2. Hierarchy system (parent/child)
3. Coordinate transformations
4. Drag/rotate/scale interactions
5. Arrow handle for spawning
6. All 5 ray shapes with polygon rendering
7. Aperture scaling — all modes (collimated, divergent, convergent, manual, array)
8. Grid snapping & canvas pan/zoom
9. Trace lines (dotted center lines)
10. Ray configuration right-panel UI
11. Composite components (built-in + user-defined + localStorage)
12. Component flip operations (reflection matrix)
13. Debug visualization layer (DebugLayer.js)
14. Filename editor

### Not Yet Implemented ❌
1. JSON import / export (HTML buttons exist, no JS handlers)
2. SVG export (HTML button exists, no handler)
3. Reset canvas (HTML button exists, no handler)
4. Gallery integration (`saveCanvasAndNavigate()` not defined in scripts)
5. Undo / redo (UI buttons exist, no history stack)
6. Gradient rendering (perpendicular HSL gradient across ray width)
7. Multi-ray layers per parent-child connection
8. Ray display mode cycling (both / dotted only / solid only)
9. Component preview tooltips
10. Keyboard shortcuts

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



---

## Phase 8: Composite Component System

### 8.1 Overview & Motivation

The app currently only has **basic components** (primitives defined in `ComponentLibrary.js`). Phase 8 introduces **composite components**  pre-assembled multi-component groups that behave as a single unit and can be:

- **App-shipped** (`isBuiltIn: true`): defined in `CompositeLibrary.js`, appear inside existing sidebar categories (e.g. "Source", "Imaging")
- **User-created** (`isBuiltIn: false`): saved by the user via the "Save as Composite" dialog, stored in `localStorage`, appear in a new "User Components" sidebar category

Both types are unified under the same JSON-serializable definition schema and merge into the existing `components` registry.

---

### 8.2 Terminology

| Term | Definition |
|---|---|
| **Basic component** | Existing single-element primitive (`ComponentLibrary.js`); `isComposite: false` |
| **Composite component** | Multi-element assembly; `isComposite: true`; app-shipped or user-created |
| **Composite definition** | The JSON schema object stored in the registry (no `draw` fn) |
| **Composite instance** | Live `Component` objects on canvas after expanding a composite definition |

---

### 8.3 Unified Composite Definition Schema

```javascript
{
  key: string,                    // unique registry key, e.g. 'two_photon_excitation'
  label: string,                  // display name in sidebar
  category: string,               // sidebar category, e.g. 'Source', 'User Components'
  isComposite: true,
  isBuiltIn: boolean,             // true = app-shipped, false = user-created (localStorage)
  members: [
    {
      type: string,               // basic component key (e.g. 'laser', 'lens')
      relX: number,               // X offset from group centroid (SVG units)
      relY: number,               // Y offset from group centroid
      rotation: number,           // degrees
      scale: number,              // multiplier
      apertureRadius: number,     // frozen at save time
      coneAngle: number,          // frozen at save time
      rayShape: string,           // 'collimated'|'divergent'|'convergent'|'manual' frozen
      rayPolygonColor: string,    // frozen - primary color
      rayPolygonColor2: string,   // frozen - gradient end color (may be same)
      gradientEnabled: boolean,   // frozen
      internalParentIndex: number | null  // index into members[] for parent, null for roots
    }
  ],
  entryMemberIndex: number,       // index of entry port member
  exitMemberIndex: number         // index of exit port member (receives external children)
}
```

**Key rules**:
- `draw` is never stored. Synthesized at render time from `componentLibrary[member.type].draw(ns)` with transform wrappers.
- All `members[i].ray*` fields are **frozen**  they cannot be changed after the composite is saved.
- Only basic component types (not other composites) can be members.

---

### 8.4 Composite Instance Behavior on Canvas

When a composite component is spawned:

1. **Expansion**: All `members[]` are instantiated as individual `Component` objects at centroid-relative world positions.
2. **Locked group**: All member instances are grouped together (`isGrouped = true`, `groupMembers` Set). Cannot be ungrouped.
3. **Flags on each instance**:
   - `isCompositeInstance = true`
   - `compositeKey = string`
   - `isExitPort = true` on the exit member only
   - `isEntryPort = true` on the entry member only
   - `rayLocked = true`  all ray/aperture config UI disabled
4. **`currentId` override**: `selectComponent(id)` always resolves `currentId` to the exit port member's ID.
5. **Link operations resolve to entry port**: Cut-link and re-link check `currentId` for `isExitPort`; if true, they transparently redirect to the entry port so the composite's **external parent link** is managed correctly.
6. **Composite siblings excluded from re-link targets**: `getValidParentComponents()` excludes all members sharing the same `compositeInstanceId` to prevent internal rewiring.
7. **Ungroup blocked**: `ungroupSelectedComponents()` returns early with `console.warn` if any member has `isCompositeInstance === true`.
6. **External parent wiring**: Entry port receives external parent; exit port exposes arrow handle.
7. **`save-as-composite-btn`** hidden when any selected component has `isCompositeInstance === true`.

---

### 8.5 New Files

| File | Purpose |
|---|---|
| `scripts/components/CompositeLibrary.js` | App-shipped composite definitions; merges into `components` at module load |
| `scripts/components/UserComponentStore.js` | `localStorage` CRUD; fires `'user-components-changed'` DOM event |
| `scripts/components/ComponentSnapshot.js` | Pure `generateSnapshot(def)`  SVG thumbnail for sidebar |
| `scripts/components/SaveCompositeDialog.js` | 3-phase dialog for user composite creation |

---

### 8.6 Modified Files

| File | Changes |
|---|---|
| `scripts/components/ComponentLibrary.js` | Add `isComposite: false, isBuiltIn: true` to all entries |
| `scripts/components/Component.js` | Add 4 fields to `_initializeFromConfig()` |
| `scripts/components/ComponentManager.js` | Composite expansion, exit-port override, ungroup block, `getCompositeEntryPortId()`, `getCompositeSiblingIds()` |
| `scripts/components/ComponentMenu.js` | `buildComponentMenu` to `refreshSidebarMenu`; thumbnails; delete buttons |
| `scripts/events/ButtonHandlers.js` | `save-as-composite-btn` and `ungroup-btn` visibility gating |
| `index.html` | Add `save-as-composite-btn` and `save-composite-dialog` |
| `scripts/App.js` | Import `CompositeLibrary.js`; `loadUserComponents()` before `refreshSidebarMenu()` |

---

### 8.7 Init Sequence (App.js)

```javascript
import './components/CompositeLibrary.js';   // (1) merges app-shipped composites at import time

// DOMContentLoaded:
loadUserComponents();        // (2) merges user composites from localStorage into `components`
refreshSidebarMenu();        // (3) builds sidebar (replaces buildComponentMenu)
setupComponentButtons();     // (4) unchanged
setupActionButtons();        // (5) unchanged
```

---

### 8.8 ComponentSnapshot.js API

```javascript
/**
 * Generate a self-contained SVG thumbnail for a component definition.
 * @param {object} def    - entry from the `components` registry
 * @param {object} [opts] - { width: 60, height: 60 }
 * @returns {SVGElement}  - standalone <svg>, no ID conflicts
 */
export function generateSnapshot(def, opts = { width: 60, height: 60 }) { ... }
```

- **Basic**: calls `def.draw(ns)`, viewBox from `localBounds` padded 20%.
- **Composite**: per-member `componentLibrary[m.type].draw(ns)` in `<g transform>` wrappers; aperture geometry from `ApertureRays.js`; ray polygon per internalParentchild pair; viewBox fits group centroid.

---

### 8.9 SaveCompositeDialog Flow

3-phase compact dialog with spatial preview:

```
Phase A           Phase B                Phase C                [Save]
Name + spatial    Click entry port       Click exit port
preview           in spatial preview     in spatial preview
```

**Key design decisions**:
- **Spatial preview** (not a list): The dialog renders an SVG that mirrors the actual canvas layout — same positions, rotations, scales, flips, and ray polygons. Users can see which component is on the left vs right.
- **No category selector**: All user-created composites go to the "User Components" category automatically.
- **Config-driven sizing**: Dialog width and preview height are exported from `config.js` (`COMPOSITE_DIALOG`) so they can be tuned from one place. Inline styles apply `MIN_WIDTH`/`MAX_WIDTH` at open-time; CSS sets matching preview heights.
- **Animated instructions**: Entry/exit port selection phases show a bouncing arrow animation with color-coded prompts (blue for entry, orange for exit). The arrow and text are vertically centered on the same line height.
- **Click-on-component**: Users click directly on components in the spatial preview SVG to designate ports. Hit areas show colored hover highlights. Selected ports get animated dashed-ring indicators.
- **Phase A**: Name input + read-only spatial preview of the selection.
- **Phase B**: Same spatial preview with clickable hit areas; animated blue instruction "Click where light enters →".
- **Phase C**: Entry port dimmed + locked; remaining components clickable; animated orange instruction "Click where light exits →".
- Save: calls `UserComponentStore.saveUserComponent(def)` with category forced to `'User Components'` and frozen ray props from live instances.

---

### 8.10 Multi-Agent Implementation Plan

#### Phase 1  5 Parallel Workstreams

**Agent A  Schema & Data Layer** _(no dependencies)_
- `ComponentLibrary.js`: add `isComposite: false, isBuiltIn: true` to ALL entries
- New `CompositeLibrary.js`: define 1 app-shipped composite; `Object.assign(components, ...)` at module load
- New `UserComponentStore.js`: `loadUserComponents()`, `saveUserComponent(def)`, `deleteUserComponent(key)`; dispatch `new CustomEvent('user-components-changed')` on `document` on every mutation

**Agent B  Snapshot Renderer** _(no dependencies)_
- New `ComponentSnapshot.js`
- `generateSnapshot(def, opts?)`: pure function, no side effects, no DOM ID conflicts
- Basic path: `def.draw(ns)` + viewBox from `localBounds` padded 20%
- Composite path: per-member draw in `<g transform>`; ray polygons from `ApertureRays.js` geometry; viewBox fits group centroid

**Agent D  Composite Expansion & Behavior** _(no dependencies)_
- `Component.js`: add `isCompositeInstance = false`, `compositeKey = null`, `isExitPort = false`, `rayLocked = false` to `_initializeFromConfig()`
- `ComponentManager.js`:
  - `_expandComposite(def, spawnPos, externalParentId)`: spawn all members, set flags, wire `internalParentIndex` links, wire external parent to entry member, call `groupSelectedComponents()`, mark exit member `isExitPort = true`, force `currentId` to exit port ID
  - `addComponent(type)`: if `components[type].isComposite`  call `_expandComposite`
  - `selectComponent(id)`: after group expansion check; if any groupMember `isExitPort === true`  override `this.currentId`
  - `ungroupSelectedComponents()`: early return + `console.warn` if any member `isCompositeInstance === true`

**Agent C  Menu Rebuild** _(stubs for Agent A event + Agent B generateSnapshot)_
- `ComponentMenu.js`: rename `buildComponentMenu`  `refreshSidebarMenu`; keep alias
- Per-button: embed `generateSnapshot(def)` SVG thumbnail above label
- Add `` delete button for `isBuiltIn: false` entries  calls `UserComponentStore.deleteUserComponent(key)`
- `document.addEventListener('user-components-changed', () => refreshSidebarMenu())`

**Agent E  Save Dialog & UI Wiring** _(depends on A store API + B snapshot + D flags)_
- New `SaveCompositeDialog.js`: 3-phase dialog (8.9)
- `index.html`: add `<button id="save-as-composite-btn">` in secondary toolbar; add `<dialog id="save-composite-dialog">`
- `ButtonHandlers.js`: show `save-as-composite-btn` in Mode 2/3 only when NO selected member has `isCompositeInstance === true`; hide `ungroup-btn` when ANY selected has `isCompositeInstance === true`
- `App.js`: side-effect `import './components/CompositeLibrary.js'`; call `loadUserComponents()` then `refreshSidebarMenu()` replacing `buildComponentMenu()`

#### Phase 2  Integration (sequential)

1. Replace all `buildComponentMenu()` calls  `refreshSidebarMenu()`
2. Verify `'user-components-changed'` event triggers re-render
3. Smoke test:
   - Spawn composite  locked group, correct member count
   - Click any member  `currentId` resolves to exit port
   - Attempt ungroup  blocked with warning in console
   - Ray props frozen; UI controls disabled
   - Delete user composite  sidebar updates immediately
   - Save composite  persists across page reload
   - Thumbnail renders rays for composite entries
4. Update SUMMARY.md 8 with any deviations

---

### 8.11 Further Considerations

- **Export portability**: Composite member instances export as plain objects with flags. Composite definitions NOT embedded in schematic JSON. `Fileio.js` impact deferred.
- **Multi-ray future**: `members[].rayPolygonColor` is a single value now. When Phase 3 multi-ray lands, migrate to `rayLayers: [{shape, color, color2, gradient, opacity}]`.
- **Nested composites**: Blocked  `members[].type` must be a basic component key. Deferred.
- **ApertureRays.js purity**: Geometry helpers must remain importable without DOM side effects for off-screen snapshot rendering.

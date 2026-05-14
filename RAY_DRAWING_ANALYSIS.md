# Ray Drawing System — Architecture & Implementation Guide

**Date:** April 20, 2026
**Status:** Active development on `dev` branch

---

## 1. Design Philosophy

The ray drawing system is **component-centric**: rays are derived entities synthesized from each component's aperture properties and parent-child hierarchy. No ray data exists outside of components. This design enables:

- **Undo/redo**: snapshot component properties → rays rebuild automatically.
- **Save/load**: serialize component state only → rays are recalculated on load.
- **Recursive updates**: move a parent → all descendants' apertures rescale → rays redraw.

---

## 2. Aperture Data Model (per Component)

Every component stores these aperture/ray properties (defined in `Component.js`):

| Property | Type | Default | Description |
|---|---|---|---|
| `apertureCenter` | `{x,y}` | from definition | Local-space origin of the aperture (immutable — from ComponentLibrary definition) |
| `apertureCenterOffset` | `number` | `0` | Signed displacement along `upVector` from `apertureCenter`. Effective center = `apertureCenter + upVector × offset`. Preserves original for reset/undo |
| `upVector` | `{x,y}` | from definition | Unit vector defining aperture orientation (may be flipped by crossing correction) |
| `apertureRadius` | `number` | `15` | Half-height of the total aperture span |
| `aperturePoints` | `Array<{x,y}>` | computed | Local-space boundary points (2 for standard shapes, `segments×2` for array) |
| `coneAngle` | `number` | `0` | Half-angle of illumination cone in degrees |
| `rayShape` | `string` | `'collimated'` | One of: `collimated`, `divergent`, `convergent`, `manual`, `array` |
| `rayPolygonColor` | `string` | `'#00ffff'` | Fill color for ray polygons |
| `rayPolygonOpacity` | `number` | `0.2` | Fill opacity |
| `arraySegments` | `number` | `5` | Number of sub-aperture segments (array mode only) |
| `arrayGap` | `number` | `0` | Gap between segments in local units (array mode only) |

### 2.1 Effective Aperture Center

The **effective center** is the working aperture origin, computed as:

```
effectiveCenter = apertureCenter + upVector × apertureCenterOffset
```

- `apertureCenter` comes from the component library definition and is **never mutated**.
- `apertureCenterOffset` is the user-adjustable parameter (manual and array modes).
- Reset = set `apertureCenterOffset` to `0`.

### 2.2 Aperture Points by Shape

| Ray Shape | Point Count | Layout |
|---|---|---|
| `collimated` | 2 | `[upper, lower]` — effective center ± upVector × radius |
| `divergent` | 2 | Same as collimated |
| `convergent` | 2 | Same as collimated |
| `manual` | 2 | Same — user adjusts radius and center offset |
| `array` | `segments × 2` | Pairs of `[segTop, segBot]` ordered upper → lower |

### 2.3 Array Segment Geometry

For `n` segments with gap `g` and total aperture radius `r`:

```
totalSpan = 2 × r
segmentLength = (totalSpan - (n - 1) × g) / n
```

Segments are laid out from the upper edge (+r along upVector) downward:

```
seg[0].top  = effectiveCenter + upVector × r
seg[0].bot  = seg[0].top - upVector × segmentLength
  (gap)
seg[1].top  = seg[0].bot - upVector × g
seg[1].bot  = seg[1].top - upVector × segmentLength
  ...
```

**Gap clamping**: `arrayGap` is clamped to `[0, 2r / (n-1)]` when `n > 1`, ensuring segment length ≥ 0. When `n = 1`, gap is forced to `0`.

**Segment count limit**: `arraySegments` is clamped to `[1, MAX_ARRAY_SEGMENTS]` (currently 10).

---

## 3. Ray Shapes (5 Types)

### 3.1 Collimated (Parallel Rays)

- **Geometry**: Parent aperture → Child aperture (4-vertex polygon)
- **Vertices**: `[parentUpper, childUpper, childLower, parentLower]`
- **Aperture scaling**: Projection-based — `scalingRatio = parentProjection / childProjection`
- **Use case**: Default for all optical elements (lenses, mirrors, etc.)

### 3.2 Divergent (Expanding Rays)

- **Geometry**: Parent center → Child aperture (triangle)
- **Vertices**: `[parentCenter, childUpper, childLower]`
- **Aperture scaling**: `radius = distance × tan(coneAngle)`, cone angle inherited or calculated
- **Use case**: Light sources, point emitters

### 3.3 Convergent (Focusing Rays)

- **Geometry**: Parent aperture → Child center (triangle)
- **Vertices**: `[parentUpper, childCenter, parentLower]`
- **Aperture scaling**: `coneAngle = atan(parentProjection / distance)`, dynamic recalc
- **Use case**: Focal points, detectors

### 3.4 Manual

- **Geometry**: Same as collimated (4-vertex polygon)
- **Aperture scaling**: **None** — user controls `apertureRadius` and `apertureCenterOffset` directly via the ray menu
- **Cone angle**: Computed from geometry for informational display only
- **Use case**: Override auto-scaling, custom aperture control

### 3.5 Array

**Geometry & Rendering** (depends on parent ray shape):

1. **Parent is Array, Child is Array**:
   - Draw segment-to-segment connections: for each pair of matching segments (index `i`), draw one 4-vertex polygon
   - **Vertices**: `[parentSegTop[i], childSegTop[i], childSegBot[i], parentSegBot[i]]`
   - **Matching**: Only connect the first `min(parentSegments, childSegments)` pairs
   - **Scaling**: Each segment's individual geometry is pre-scaled by aperture scaling algorithm

2. **Parent is Non-Array, Child is Array**:
   - Treat child as **manual mode** (no auto-scaling)
   - Draw single 4-vertex polygon: `[parentUpper, childUpper, childLower, parentLower]`
   - Child's `apertureRadius`, `apertureCenterOffset`, `arraySegments`, and `arrayGap` are all user-controlled

**Aperture Scaling**:
- Overall `apertureRadius` scales like collimated (projection-based)
- Segments scale proportionally with `apertureRadius`
- Gap is re-clamped after radius changes

**User Controls**: `apertureRadius`, `apertureCenterOffset`, `arraySegments`, `arrayGap`

**Use case**: Fiber bundles, lenslet arrays, multi-slit apertures

---

## 4. Aperture Scaling Algorithm

### 4.1 Projection-Based Scaling (Collimated / Array)

```javascript
// 1. Transform upVectors to global coordinates
childGlobalUp  = rotate(child.upVector,  child.rotation)
parentGlobalUp = rotate(parent.upVector, parent.rotation)

// 2. Calculate perpendicular to center line
centerLine = childCenter - parentCenter
perpendicular = rotate90(centerLine)

// 3. Project upVectors onto perpendicular
childProjection  = |childGlobalUp · perpendicular|  × childRadius
parentProjection = |parentGlobalUp · perpendicular| × parentRadius

// 4. Scale child radius to match parent projection
scalingRatio = parentProjection / childProjection
newRadius = childRadius × scalingRatio
```

### 4.2 Manual — No Auto-Scaling

Manual mode skips radius scaling entirely. Only `coneAngle` is computed from geometry for display:

```javascript
coneAngle = atan(parentProjection / distance) × 180 / π
```

### 4.3 Array Aperture Scaling

**When parent is array or non-array**:
- Array mode applies the same projection-based scaling to `apertureRadius` (same formula as collimated)
- Since segments are derived from `apertureRadius`, `arraySegments`, and `arrayGap`, they rescale proportionally
- Gap is re-clamped after radius changes to ensure segment length ≥ 0

**When child is array but parent is not**:
- Child is treated as manual mode — `apertureRadius`, `apertureCenterOffset`, `arraySegments`, and `arrayGap` are all user-controlled with no auto-scaling

### 4.4 Crossing Correction

After scaling, if the upper and lower ray lines (parentUpper→childUpper, parentLower→childLower) intersect, the child's `upVector` is flipped and scaling is re-applied. Skipped when either aperture radius is 0.

### 4.5 Recursive Updates

`recursivelyUpdateChildrenApertures(root, getComponent)` walks the component tree depth-first, applying `applyApertureScaling()` to each child relative to its parent.

---

## 5. Debug Visualization

### 5.1 Always-On Debug Elements (when `SHOW_DEBUG_DRAWING = true`)

Per component, drawn in `#debug-overlay` (world-space, no inherited transform):

| Element | Color | Description |
|---|---|---|
| Center marker | Red dot | Component's `centerPoint` in world space |
| Up vector | Green arrow | Direction of `upVector`, fixed display length |
| Forward vector | Blue arrow | Direction of `forwardVector`, fixed display length |
| Upper aperture dot | Blue | Top of overall aperture (effective center + upVector × radius) |
| Lower aperture dot | Blue (smaller) | Bottom of overall aperture |

### 5.2 Aperture Edit Overlay (shown on double-click / ray menu open)

Temporary visualization shown only when the ray configuration menu is active for a component. Controlled by `showApertureEditOverlay()` / `hideApertureEditOverlay()`.

**Manual mode**:
- Orange dot at the effective aperture center (shows offset position)

**Array mode**:
- Grey dots at each segment boundary (top and bottom of each segment)

---

## 6. Ray Configuration UI (Double-Click Menu)

**Trigger**: Double-click on a component invokes a floating menu positioned near the component.

**Controls** (per ray shape):

| Control | Shapes | Description |
|---|---|---|
| Ray shape dropdown | All | Select collimated / divergent / convergent / manual / array |
| Hue slider (0–359°) | All | Ray polygon color |
| Aperture radius slider | Manual, Array | Direct control of `apertureRadius` |
| Center offset slider | Manual, Array | Adjust `apertureCenterOffset` along upVector |
| Segment count spinner | Array | Number of segments (1–10) |
| Gap slider | Array | Gap between segments |

**Behavior**:
- Menu opens → `showApertureEditOverlay()` on the component
- Menu closes → `hideApertureEditOverlay()`
- Any parameter change → update component properties → `updateRays(componentId)` → refresh overlay
- Menu follows component if it moves while open

---

## 7. Implementation Status

### Phase 1: Aperture Data Model ✅ (Complete)

- [x] 5 ray shapes defined in `config.js` (collimated, divergent, convergent, manual, array)
- [x] `apertureCenterOffset` property on Component (preserves original center for undo)
- [x] `arraySegments` and `arrayGap` properties with clamping validation
- [x] `_getEffectiveApertureCenter()` helper
- [x] `_getAperturePoints()` dispatches on ray shape (2 pts for standard, n×2 for array)
- [x] Setters with validation: `setApertureCenterOffset()`, `setArraySegments()`, `setArrayGap()`
- [x] `showApertureEditOverlay()` / `hideApertureEditOverlay()` for debug visualization
- [x] `ApertureScaling.js` handles manual (skip) and array (scale like collimated)
- [x] Debug elements use effective aperture center

### Phase 2: Ray Polygon Rendering ✅ (Complete)

- [x] **DebugLayer.js** — Centralized debug visualization owner, isolated from Component.js
  - [x] Exports: `initDebugLayer()`, `refreshDebugLayer()`, `refreshDebugForComponent()`, `rebuildDebugForComponent()`, `removeDebugForComponent()`
  - [x] Component.onTransformChanged callback for live updates during drag/rotate/scale
  - [x] Manages #debug-overlay SVG group
  
- [x] **ApertureRays.js Phase 2** — All 5 polygon rendering functions implemented
  - [x] `getPolygonsForConnection(parent, child)` dispatcher based on child.rayShape
  - [x] `_createCollimatedPolygon()` — 4-vertex rectangle
  - [x] `_createDivergentPolygon()` — 3-vertex triangle (parent center → child aperture upper/lower)
  - [x] `_createConvergentPolygon()` — 3-vertex triangle (parent aperture upper/lower → child center)
  - [x] `_createManualPolygon()` — Same as collimated (4 vertices)
  - [x] `_createArrayToArrayPolygons()` — Multiple 4-vertex per min(parentSegments, childSegments) segment pair
  - [x] Special case: array with non-array parent → treat as manual (single 4-vertex polygon)
  - [x] Ray polygons rendered in #aperture-rays group (behind components)
  - [x] Uses child's rayPolygonColor and rayPolygonOpacity
  - [x] Exports: `drawApertureRays()`, `hideApertureRays()`, `toggleApertureRays()`, `updateRays()`

- [x] Array mode debug display simplified to segment dot overlay (no parent-child lines)

### Phase 3: Double-Click Ray Menu UI ⏳ (In Progress)

- [x] **RayMenu.js** — Floating dialog for ray configuration
  - [x] `setupRayMenu()` creates HTML dialog with all controls
  - [x] `openRayMenu(component)` populates form and shows dialog
  - [x] `closeRayMenu()` hides dialog and clears debug overlay
  - [x] Controls: Ray shape dropdown (all 5 types), hue slider (0–359°), opacity slider, aperture radius, center offset
  - [x] Array-specific: segment count spinner (1–10), gap slider
  - [x] Debug overlay toggle checkbox
  - [x] Menu positioned near component in canvas space
  - [x] All sliders wire to component property updates + `updateRays()` + `rebuildDebugForComponent()`

- [x] **InteractionHandlers.js** — Double-click event handler
  - [x] `setupRayMenu()` wires double-click listener to canvas
  - [x] Detects component under cursor, extracts component ID, calls `openRayMenu(component)`
  
- [x] **CSS Styles** — Floating dialog styling in `style.css`
  - [x] Dialog positioning, header, controls, footer buttons
  - [x] Responsive layout with overflow scrolling
  - [x] Color scheme matches app theme

- [x] **App.js Integration**
  - [x] Imports `setupRayMenu()` from RayMenu.js and InteractionHandlers.js
  - [x] Calls both during `initializeApp()` initialization sequence

### Phase 4: Advanced Features

- [ ] Gradient rendering (perpendicular SVG linearGradient with HSL interpolation)
- [ ] Multi-ray layers per connection (arrays of shape/color per component)
- [ ] Divergent/convergent aperture scaling (cone-based)
- [ ] Color swatch picker
- [ ] Ray menu add/remove ray layer buttons
- [ ] Save/load ray configuration in composite definitions

---

## 8. Key Constants (config.js)

```javascript
// Aperture defaults
DEFAULT_APERTURE_RADIUS = 15
DEFAULT_CONE_ANGLE = 0
DEFAULT_APERTURE_CENTER_OFFSET = 0
DEFAULT_ARRAY_SEGMENTS = 5
DEFAULT_ARRAY_GAP = 0
MAX_ARRAY_SEGMENTS = 10

// Ray rendering
DEFAULT_SOLID_RAY_COLOR = '#00ffff'
DEFAULT_RAY_POLYGON_OPACITY = 0.2

// Ray shapes
RAY_SHAPES = { COLLIMATED, DIVERGENT, CONVERGENT, MANUAL, ARRAY }

// Debug visualization
ARRAY_SEGMENT_POINT_RADIUS = 2
ARRAY_SEGMENT_POINT_COLOR = '#888'
MANUAL_CENTER_MARKER_COLOR = '#e88c22'
```

---

## 9. File Map

| File | Purpose |
|---|---|
| `scripts/components/Component.js` | Aperture data model, point computation, debug overlay |
| `scripts/rays/ApertureScaling.js` | Projection-based scaling, crossing correction, recursive updates |
| `scripts/rays/ApertureRays.js` | Ray polygon SVG rendering (Phase 2) |
| `scripts/rays/DrawRays.js` | Orchestrator: trace lines + aperture rays + scaling |
| `scripts/rays/TraceLines.js` | Center-to-center dotted lines |
| `scripts/config.js` | All aperture/ray constants |

---

**Document End**

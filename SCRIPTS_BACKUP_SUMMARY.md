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

## Implementation Status: scripts/ vs scripts_backup/

### ✅ Fully Implemented (Current scripts/)
- **Canvas Management**: Pan, zoom, viewport, grid system
- **Component Library**: Complete component definitions with 40+ optical elements
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

### 1. Component State & Hierarchy

**State Object** (Single Source of Truth):
```javascript
{
    id: unique ID
    type: 'lens' | 'mirror' | etc.
    posX, posY: center coordinates
    rotation: degrees
    scaleX, scaleY: scale factors
    parentId: null | parent ID  // null = root
    children: [child IDs]       // array
    dimensions: { /* aperture, vectors */ }
    rayShape: ['collimated']    // per-ray array
    rayPolygonColor: ['#00ffff']
    visible, selected: booleans
    arrowX, arrowY: spawn position
}
```

**Hierarchy Rules**:
- One parent, multiple children (tree structure)
- Rays connect parent → child
- Recursive updates propagate down tree
- Deletion orphans children (become roots)

### 2. Coordinate Systems

Three spaces requiring transformation:
1. **Screen**: Mouse pixels
2. **SVG**: Canvas with pan/zoom
3. **Local**: Component-relative

**Critical**: Always transform screen → SVG for interactions. Components positioned by center (not corner). Rotation around center.

### 3. Aperture System

**Purpose**: Calculate optimal aperture radius so rays look coherent.

**Scaling Strategies**:
- **Collimated** (parallel): `radius = parentAperture / cos(deviation)`
- **Divergent** (expanding): `radius = distance × tan(coneAngle)`  
- **Convergent** (focusing): Dynamic cone angle from geometry

**Recursion**: When component moves/rotates → recalculate its aperture → recursively update all children.

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
│   ├── ComponentLibrary.js     # Definitions
│   ├── ComponentMenu.js        # Spawn UI
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



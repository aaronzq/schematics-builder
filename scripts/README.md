# Refactored Scripts Architecture

## Overview

The scripts have been reorganized into a modular, layered architecture following clean code principles. This README documents the new structure and guidelines for future development.

## Directory Structure

```
scripts/
├── app/                          # Application layer
│   ├── App.js                   # Main app initialization
│   └── config.js                # Configuration & constants
│
├── core/                         # Core systems (no external dependencies)
│   ├── EventBus.js              # Event system for decoupling
│   └── ComponentStore.js        # Centralized state management
│
├── components/                   # Component definitions & rendering
│   ├── definitions/             # Component templates (data only)
│   ├── renderers/               # SVG drawing functions
│   └── ComponentRegistry.js      # Component type registry
│
├── rendering/                    # Low-level rendering
│   ├── SVGRenderer.js           # Core SVG API wrapper
│   ├── ArrowRenderer.js         # Arrow drawing
│   ├── RayRenderer.js           # Ray drawing
│   ├── GridRenderer.js          # Grid drawing
│   └── ViewportManager.js       # Pan/zoom/transforms
│
├── features/                     # Feature-specific logic
│   ├── aperture/                # Aperture scaling
│   ├── rays/                    # Ray customization UI
│   ├── placement/               # Component placement logic
│   └── hierarchy/               # Parent-child relationships
│
├── ui/                           # User interface components
│   ├── components/              # Reusable UI components
│   ├── toolbar/                 # Toolbar UI
│   ├── sidebar/                 # Sidebar/menu UI
│   └── preview/                 # Component preview
│
├── interactions/                 # User interaction handling
│   ├── DragHandler.js           # Drag operations
│   ├── RotationHandler.js       # Rotation handle
│   ├── KeyboardHandler.js       # Keyboard shortcuts
│   └── SelectionHandler.js      # Selection logic
│
├── services/                     # Business logic services
│   ├── ImportExportService.js   # File I/O
│   ├── StorageService.js        # Browser storage
│   └── ValidationService.js     # Input validation
│
└── utils/                        # Utility functions
    ├── mathUtils.js             # Math operations
    ├── svgUtils.js              # SVG manipulation
    ├── colorUtils.js            # Color conversions
    └── domUtils.js              # DOM helpers
```

## Core Systems

### 1. EventBus (`core/EventBus.js`)
**Purpose:** Decouples modules by providing a centralized event system

```javascript
import { eventBus } from './core/EventBus.js';

// Emit event
eventBus.emit('component:added', { id: '123', type: 'lens' });

// Listen to event
eventBus.on('component:added', (data) => {
  console.log('Component added:', data);
});

// One-time listener
eventBus.once('app:ready', () => {
  console.log('App is ready');
});
```

**Benefits:**
- No circular dependencies
- Loose coupling between modules
- Easy to track data flow

### 2. ComponentStore (`core/ComponentStore.js`)
**Purpose:** Centralized, immutable state management

```javascript
import { componentStore } from './core/ComponentStore.js';

// Add component
componentStore.add('comp-1', {
  type: 'lens',
  x: 100,
  y: 200,
  rotation: 0
});

// Get component (returns copy)
const comp = componentStore.get('comp-1');

// Update component
componentStore.update('comp-1', { x: 150 });

// Subscribe to changes
const unsubscribe = componentStore.subscribe((event) => {
  console.log('State changed:', event.type);
});
```

**Features:**
- Immutable reads (deep copies)
- Controlled mutations
- Change subscriptions
- No global state leaks

## Configuration

All application constants are in `app/config.js`:

```javascript
import * as config from './app/config.js';

console.log(config.COMPONENT_SPACING);      // 150
console.log(config.DEFAULT_APERTURE_RADIUS);// 15
console.log(config.ARROW_COLOR);             // '#2196F3'
```

## Utilities

### Math Utils
```javascript
import { distance, rotatePoint, snap } from './utils/mathUtils.js';

const dist = distance(0, 0, 100, 100);
const rotated = rotatePoint(10, 0, 45);
const snapped = snap(47.3, 2.5); // 47.5
```

### SVG Utils
```javascript
import { createSVGElement, setTransform, getBBox } from './utils/svgUtils.js';

const circle = createSVGElement('circle', { cx: 50, cy: 50, r: 20 });
setTransform(circle, 'translate(100, 100)');
const bbox = getBBox(circle);
```

### Color Utils
```javascript
import { hexToRgb, lighten, mixColors } from './utils/colorUtils.js';

const rgb = hexToRgb('#FF0000');
const lighter = lighten('#FF0000', 20);
const mixed = mixColors('#FF0000', '#00FF00', 0.5);
```

### DOM Utils
```javascript
import { byId, on, addClass, setText } from './utils/domUtils.js';

const btn = byId('my-button');
on(btn, 'click', () => console.log('clicked'));
addClass(btn, 'active');
setText(btn, 'Click me!');
```

## Development Guidelines

### 1. **Module Dependencies**
- Minimize circular dependencies
- Use EventBus for cross-module communication
- Import only what you need

### 2. **State Management**
- All component state goes through ComponentStore
- Never modify returned store data directly
- Use store.subscribe() to react to changes

### 3. **Event Naming Convention**
```
{domain}:{action}
component:added
component:moved
component:removed
component:selected
ray:updated
ui:rendered
```

### 4. **File Organization**
- Keep files under 300 lines
- One class/export per file (where practical)
- Group related files in folders

### 5. **Immutability**
- ComponentStore returns copies, not references
- Don't mutate configuration objects
- Use spread operator for state updates

## Migration Path

The refactored code maintains the original visual and functional design while improving:
- **Code clarity** - Clear responsibilities
- **Maintainability** - Smaller, focused files
- **Testability** - Isolated, pure functions
- **Scalability** - Easy to add new features

Old scripts are backed up in `scripts_backup/` folder.

## Next Steps

1. ✅ **Phase 1:** Core infrastructure (EventBus, Store, Utilities, Config)
2. ⏳ **Phase 2:** Component system (Definitions, Registry, Renderers)
3. ⏳ **Phase 3:** Rendering layer (SVG, Arrows, Rays, Grid, Viewport)
4. ⏳ **Phase 4:** UI components (Toolbar, Sidebar, Menus)
5. ⏳ **Phase 5:** Feature modules (Aperture, Rays, Placement, Hierarchy)
6. ⏳ **Phase 6:** Interactions (Drag, Rotation, Selection, Keyboard)
7. ⏳ **Phase 7:** Services (Import/Export, Storage, Validation)
8. ⏳ **Phase 8:** Integration testing and optimization

## Testing

Each module should be testable in isolation:

```javascript
import { ComponentStore } from './core/ComponentStore.js';

const store = new ComponentStore();
store.add('test-1', { type: 'lens', x: 0, y: 0 });
assert(store.has('test-1'));
assert(store.get('test-1').type === 'lens');
```

## Performance Considerations

- **Deep copies** in ComponentStore are necessary for immutability
- Consider implementing a ChangeDetection strategy later if needed
- SVG rendering should be batched when possible
- Use requestAnimationFrame for animations

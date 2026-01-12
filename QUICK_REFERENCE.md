# Quick Reference Guide

## Importing Core Systems

```javascript
// Event Bus - For inter-module communication
import { eventBus } from './core/EventBus.js';

// Component Store - For state management
import { componentStore } from './core/ComponentStore.js';

// Configuration - For constants
import * as config from './app/config.js';
```

## EventBus Examples

```javascript
// Listen to component events
eventBus.on('component:added', ({ id, component }) => {
  console.log('Component added:', id);
});

// Emit an event
eventBus.emit('component:moved', { id: 'lens-1', x: 150, y: 200 });

// One-time listener
eventBus.once('app:initialized', () => {
  console.log('App ready!');
});

// Stop listening
eventBus.off('component:added');
```

## ComponentStore Examples

```javascript
// Add a component
componentStore.add('lens-1', {
  type: 'lens',
  x: 100,
  y: 200,
  rotation: 0,
  visible: true
});

// Get component (safe, returns copy)
const lens = componentStore.get('lens-1');

// Get all components
const allComponents = componentStore.getAll();

// Update component
componentStore.update('lens-1', {
  x: 150,
  rotation: 45
});

// Check if exists
if (componentStore.has('lens-1')) {
  // Do something
}

// Remove component
componentStore.remove('lens-1');

// Subscribe to changes
const unsubscribe = componentStore.subscribe((event) => {
  switch (event.type) {
    case 'add':
      console.log('Added:', event.id);
      break;
    case 'update':
      console.log('Updated:', event.id, event.updates);
      break;
    case 'remove':
      console.log('Removed:', event.id);
      break;
  }
});

// Unsubscribe
unsubscribe();

// Clear all
componentStore.clear();
```

## Configuration Examples

```javascript
import * as config from './app/config.js';

// Grid settings
console.log(config.GRID_SIZE); // 2.5

// Component defaults
console.log(config.COMPONENT_SPACING); // 150

// Arrow styling
console.log(config.ARROW_COLOR); // '#2196F3'
console.log(config.ARROW_STROKE_WIDTH); // 2

// Ray rendering
console.log(config.DEFAULT_APERTURE_RADIUS); // 15
console.log(config.DEFAULT_RAY_POLYGON_OPACITY); // 0.2

// Ray shapes
console.log(config.RAY_SHAPES.COLLIMATED);
console.log(config.RAY_SHAPES.DIVERGENT);
console.log(config.RAY_SHAPES.CONVERGENT);
console.log(config.RAY_SHAPES.MANUAL);
```

## Math Utilities

```javascript
import * as math from './utils/mathUtils.js';

// Distance and angles
math.distance(0, 0, 100, 100); // 141.42...
math.angleBetween(0, 0, 100, 0); // 0

// Conversions
math.degreesToRadians(90); // 1.5707...
math.radiansToDegrees(Math.PI); // 180

// Point operations
math.rotatePoint(10, 0, 45); // {x: 7.07..., y: 7.07...}
math.translatePoint(10, 10, 5, 5); // {x: 15, y: 15}
math.scalePoint(100, 100, 0.5); // {x: 50, y: 50}

// Snapping and clamping
math.snap(47.3, 2.5); // 47.5 (snaps to nearest 2.5)
math.clamp(150, 0, 100); // 100

// Vectors
math.normalizeVector({x: 3, y: 4}); // {x: 0.6, y: 0.8}
math.vectorLength({x: 3, y: 4}); // 5
math.dotProduct({x: 1, y: 0}, {x: 0, y: 1}); // 0

// Interpolation
math.lerp(0, 100, 0.5); // 50
```

## SVG Utilities

```javascript
import * as svg from './utils/svgUtils.js';

// Create elements
const circle = svg.createSVGElement('circle', { cx: 50, cy: 50, r: 20 });
const group = svg.createSVGGroup('my-group', 'my-class');
const line = svg.createSVGLine(0, 0, 100, 100, { stroke: '#000', strokeWidth: 2 });

// Transform operations
svg.setTransform(element, 'translate(100, 100)');
svg.applyTransforms(element, ['translate(100, 100)', 'rotate(45)']);
svg.parseTransform('translate(100, 100) rotate(45)'); // {x: 100, y: 100, rotation: 45}

// Styling
svg.applyStyles(element, { fill: 'red', opacity: 0.5 });

// Cloning and measurement
const clone = svg.cloneSVGElement(element);
const bbox = svg.getBBox(element); // {x, y, width, height}

// ViewBox
svg.getViewBox(svg); // "0 0 800 600"
svg.setViewBox(svg, 0, 0, 800, 600);
```

## Color Utilities

```javascript
import * as color from './utils/colorUtils.js';

// Conversions
color.hexToRgb('#FF0000'); // {r: 255, g: 0, b: 0}
color.rgbToHex(255, 0, 0); // '#FF0000'
color.hexToHsl('#FF0000'); // {h: 0, s: 100, l: 50}
color.hslToRgb(0, 100, 50); // {r: 255, g: 0, b: 0}

// Color manipulation
color.lighten('#FF0000', 20); // '#FF6666'
color.darken('#FF0000', 20); // '#990000'
color.mixColors('#FF0000', '#0000FF', 0.5); // '#7F007F' (purple)
color.isLight('#FFFFFF'); // true
```

## DOM Utilities

```javascript
import * as dom from './utils/domUtils.js';

// Query elements
const btn = dom.byId('my-button');
const items = dom.byClass('item');
const first = dom.select('.container');
const all = dom.selectAll('.item');

// Event handling
dom.on(btn, 'click', () => console.log('Clicked'));
dom.off(btn, 'click', handler);

// CSS classes
dom.addClass(btn, 'active');
dom.removeClass(btn, 'active');
dom.toggleClass(btn, 'active');
dom.hasClass(btn, 'active'); // true/false

// Content
dom.setText(btn, 'Click me!');
dom.getText(btn); // 'Click me!'
dom.setHTML(container, '<p>Hello</p>');
dom.getHTML(container); // '<p>Hello</p>'

// Values
dom.setValue(input, 'text');
dom.getValue(input); // 'text'

// Attributes
dom.setAttr(element, 'data-id', '123');
dom.getAttr(element, 'data-id'); // '123'

// Visibility
dom.show(element);
dom.hide(element);
dom.toggleVisibility(element);

// Styles
dom.setStyles(element, {
  backgroundColor: 'blue',
  padding: '10px',
  color: 'white'
});

// Position
const pos = dom.getPosition(element);
// {top, left, right, bottom, width, height}

// Create and manipulate
const newBtn = dom.createElement('button', {
  class: 'primary',
  'data-action': 'save'
}, 'Save');
dom.append(container, newBtn);
dom.remove(newBtn);
```

## Common Patterns

### Pattern 1: React to Component Changes
```javascript
componentStore.subscribe((event) => {
  if (event.type === 'update' && event.id === 'lens-1') {
    // Redraw affected rays
    eventBus.emit('rays:redraw', { componentId: 'lens-1' });
  }
});
```

### Pattern 2: Handle User Action
```javascript
dom.on(addButton, 'click', () => {
  const comp = { type: 'lens', x: 100, y: 100 };
  const id = generateId();
  componentStore.add(id, comp);
  eventBus.emit('component:added', { id, component: comp });
});
```

### Pattern 3: Coordinate Transformation
```javascript
function rotateComponentHandle(componentId, angleChange) {
  const comp = componentStore.get(componentId);
  const newRotation = math.snap(
    comp.rotation + angleChange,
    config.ROTATION_SNAP_INCREMENT
  );
  componentStore.update(componentId, { rotation: newRotation });
}
```

### Pattern 4: SVG Rendering
```javascript
function renderComponent(componentData) {
  const group = svg.createSVGGroup(componentData.id, 'component');
  const circle = svg.createSVGCircle(0, 0, 10, { fill: '#000' });
  group.appendChild(circle);
  
  const transforms = [
    `translate(${componentData.x}, ${componentData.y})`,
    `rotate(${componentData.rotation})`
  ];
  svg.applyTransforms(group, transforms);
  
  return group;
}
```

## Module Dependency Map

```
No dependencies:
└── utils/
    ├── mathUtils.js
    ├── colorUtils.js
    ├── domUtils.js
    └── svgUtils.js

Core foundation:
├── core/EventBus.js (no deps)
└── core/ComponentStore.js (no deps)

Configuration:
└── app/config.js (no deps)

Application:
└── app/App.js (uses core)
```

## File Size Reference

- `EventBus.js` - ~65 lines
- `ComponentStore.js` - ~115 lines
- `config.js` - ~60 lines
- `App.js` - ~45 lines
- Utilities - ~850 lines total

**Total Phase 1: ~1,140 lines of clean, documented code**

---

Ready to start Phase 2? Let's build the Component System! 🚀

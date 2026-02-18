# GitHub Copilot Instructions

## General Rules
- Always refer to `SUMMARY.md` for the detailed design and interaction logic. **Update `SUMMARY.md` whenever design decisions change.**
- Use a helpful, collegial tone. Keep explanations brief but with enough context to understand the code.

## Project Overview
**Optical Schematics Builder** is a vanilla JS, no-build, no-framework web app (HTML + CSS + ES modules). It runs directly in the browser — there is **no build step, no package manager, no npm/node required**. Open `index.html` directly or serve via any static file server.

## Architecture

```
scripts/
├── App.js              # Entry point — wires all event handlers on DOMContentLoaded
├── Canvas.js           # SVG viewport/grid/pan/zoom (exports singleton `canvas` and `autoCenter`)
├── config.js           # ALL constants live here (snap increments, colors, sizes, limits)
├── Fileio.js           # JSON import/export, SVG export, filename editor
├── components/
│   ├── ComponentLibrary.js  # Static map of component type → SVG draw fn + optical properties
│   ├── Component.js         # Component class: position, rotation, scale, aperture, hierarchy
│   ├── ComponentManager.js  # Singleton state: Map<id, Component>, selection, currentId
│   ├── ComponentActions.js  # addComponent() — thin wrapper that calls manager + updateRays()
│   ├── ComponentMenu.js     # Sidebar UI category folding
│   └── index.js             # Re-exports: { componentManager, addComponent }
├── events/
│   ├── ButtonHandlers.js    # Toolbar button wiring + updateToolbarButtons()
│   ├── InteractionHandlers.js # Drag, selection box, canvas pan, unified bbox logic
│   ├── ArrowHandle.js       # Arrow handle (spawn-point indicator) for currentId
│   ├── RotationHandle.js    # Per-component and group rotation handle
│   ├── ScaleHandle.js       # Per-component and group scale handle
│   ├── HoverHandlers.js     # Hover boxes (single + group/selection)
│   └── ValueDisplay.js      # Angle/scale gauge shown during handle drag
└── rays/
    ├── DrawRays.js      # updateRays() — call this after ANY scene change
    ├── TraceLines.js    # Dotted lines connecting parent→child centers
    └── ApertureRays.js  # Semi-transparent polygons connecting aperture points
```

## Key Data Flow & Conventions

### "Call updateRays() after every scene change"
`updateRays()` in `rays/DrawRays.js` redraws all trace lines and aperture ray polygons. It must be called after adding, moving, rotating, scaling, deleting, or relinking components. `ComponentActions.addComponent()` already does this; every other mutation site must call it explicitly.

### Component as the source of truth
Each `Component` instance holds all optical and visual state: `x`, `y`, `rotation`, `scale`, `flipX`, `flipY`, `visible`, `parent` (id or null), `children` (id[]), `isGrouped`, `groupMembers` (Set of ids), `apertureRadius`, `coneAngle`, `rayShape`, `rayPolygonColor`, `rayPolygonOpacity`. Rays are **synthesized** from these properties — they are never stored independently.

### Selection state lives in ComponentManager
- `componentManager.currentId` — the "focused" component (parent for spawning, anchor for single handles)
- `componentManager.selectedIds` — Set of selected component ids
- Three selection modes drive toolbar visibility and handle display (see SUMMARY.md §1):
  - **Mode 1**: `selectedIds.size === 1`, `currentId` set
  - **Mode 2**: `selectedIds.size > 1`, `currentId === null`
  - **Mode 3**: `selectedIds.size > 1`, `currentId` set (all in same group)
- After any selection change, call `updateToolbarButtons()` from `ButtonHandlers.js`.

### Adding a new component type
1. Add an entry to `scripts/components/ComponentLibrary.js` with `width`, `height`, `centerPoint`, `upVector`, `forwardVector`, `apertureCenter`, `apertureRadius`, `coneAngle`, `rayShape`, and a `draw(ns)` function returning an SVG `<g>`.
2. Add a button in `index.html` with `class="component-btn"` and `data-type="<key>"`. The button is auto-wired in `ButtonHandlers.js → setupComponentButtons()`.

### All constants in `config.js`
Never hardcode magic numbers. Import from `scripts/config.js` (e.g., `ARROW_LENGTH`, `ROTATION_SNAP_INCREMENT`, `MIN_SCALE`, `MAX_SCALE`, `GRID_SIZE`).

### SVG layer order (bottom → top in DOM)
`#grid` → `#trace-lines-group` → `#aperture-rays` → `#schematics` (components) → handles/overlays

## Developer Workflow
- **Run locally**: serve the repo root with any static server, e.g. `python -m http.server 8080` then open `http://localhost:8080`.
- **No build step**: ES modules load natively via `<script type="module" src="scripts/App.js">` in `index.html`.
- **Debug drawing**: set `SHOW_DEBUG_DRAWING = true` in `config.js` to visualize aperture points, center markers, and vectors.
- **Example schematics**: JSON files in `examples/` can be loaded via File → Import JSON.
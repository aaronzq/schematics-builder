# Optical Schematics Builder — User Manual

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Canvas Navigation](#2-canvas-navigation)
3. [Building an Optical Path](#3-building-an-optical-path)
4. [Selection Modes](#4-selection-modes)
5. [Toolbar Actions](#5-toolbar-actions)
6. [Ray Configuration](#6-ray-configuration)
7. [Composite Components](#7-composite-components)
8. [Saving and Loading](#8-saving-and-loading)

---

## 1. Getting Started

Open `index.html` directly in a browser — no build step, no server required (a local static server also works). The left sidebar lists all available components organized by category.

---

## 2. Canvas Navigation

| Action | Input |
|---|---|
| Pan | Right-click drag |
| Zoom in/out | Mouse wheel or trackpad pinch |
| Fit to canvas | Click **Fit** in the toolbar |
| Toggle grid | Click **Grid** in the toolbar |

---

## 3. Building an Optical Path

### Adding the first component

Click any component button in the sidebar. The component appears at the canvas center with:
- A **green arrow handle** pointing right — drag it to set where the next component will spawn
- A **gold rotation handle** (top) — drag to rotate
- A **gold scale handle** (bottom) — drag to resize

### Adding downstream components

While a component is selected (Mode 1 or Mode 3), click any sidebar button to spawn a child component at the arrow tip. The new component automatically becomes the child of the current one, and rays connect them.

### Repositioning

Drag any component to move it. Rays and apertures update in real time.

### Rotating

Drag the gold **rotation handle** (top) around the component. The current angle is shown in the value display.

### Scaling

Drag the gold **scale handle** (bottom) up/down. The current scale factor is shown in the value display.

### Flipping

Use the **Flip H** / **Flip V** toolbar buttons to mirror the selected component(s) horizontally or vertically.

### Changing the spawn arrow direction

Drag the **green arrow handle** tip to any angle. The next spawned child will appear at that position.

---

## 4. Selection Modes

The app has three selection states:

### Mode 1 — Single component
- Click any ungrouped component
- Shows: rotation handle, scale handle, arrow handle
- Can spawn a new child from the arrow

### Mode 2 — Multiple, no focus
- Draw a selection box around multiple components, or drag within the unified bounding box
- Shows: unified bounding box with group rotation/scale handles
- No arrow handle; cannot spawn

### Mode 3 — Multiple, one focused
- Click any component that belongs to a group, or draw a box selecting only members of the same group
- The clicked/first-selected component is the "focused" one
- Shows: unified bounding box + group handles + arrow handle for the focused component
- Can spawn a new child from the focused component's arrow

**Tip**: Clicking an ungrouped component always goes to Mode 1. Clicking a grouped component always goes to Mode 3.

---

## 5. Toolbar Actions

| Button | Available in | Action |
|---|---|---|
| Delete | Mode 1, 2, 3 | Delete selected component(s) |
| Hide | Mode 1, 2, 3 | Hide selected component(s) |
| Show | Mode 1, 2, 3 | Show selected component(s) |
| Show All | Mode 1, 2, 3 | Show all hidden components |
| Flip H / Flip V | Mode 1, 3 | Mirror component(s) |
| Cut Link | Mode 1, 3 | Remove the parent–child link from the focused component |
| Re-link | Mode 1, 3 | Click another component to set it as the new parent |
| Group | Mode 2 | Group selected ungrouped components |
| Ungroup | Mode 2, 3 | Remove group relationships |
| Toggle Rays | Always | Show/hide aperture ray polygons |
| Toggle Trace | Always | Show/hide center dotted lines |
| Save as Composite | Mode 2, 3 (non-composite only) | Save selection as a reusable composite component |

### Cut Link
Removes the parent–child connection from the focused component. The component becomes a root (no parent). Rays to/from it are removed.

### Re-link
Enters re-link mode: a red dotted line shows the current parent connection. Click any other component to set it as the new parent. Click empty canvas to cancel. Cycle detection prevents circular links.

---

## 6. Ray Configuration

Select a component to see its ray settings in the right panel.

### Ray Shape

| Shape | Polygon geometry | When to use |
|---|---|---|
| **Collimated** | Rectangle — parallel rays | Standard lenses, most optical elements |
| **Divergent** | Triangle from parent center to child aperture | Light sources, point emitters |
| **Convergent** | Triangle from parent aperture to child center | Focal points, detectors |
| **Manual** | Same as collimated — **no auto-scaling** | When you want to fix the aperture size |
| **Array** | N segment rectangles | Fiber bundles, multi-element apertures |

### Color

- **Inherit from parent** (checkbox): when checked, this component copies its parent's color and opacity. Changing the parent's color cascades down the chain to all inheriting children.
- **Color Hue** slider: sets the ray color (hue only; saturation/lightness are fixed).
- **Opacity** slider: sets the ray fill transparency (0 = invisible, 1 = fully opaque).

### Aperture

- **Aperture Radius** slider: half-height of the aperture. Disabled for collimated/array when the parent controls the radius.
- **Center Offset** slider: shifts the aperture center along the component's local up-axis.

### Array settings (Array shape only)

- **Segments**: number of sub-apertures (1–10).
- **Gap**: gap between segments in local units.

---

## 7. Composite Components

Composite components bundle multiple basic components into a single reusable unit. They appear in the sidebar alongside basic components and spawn as a group.

### Using a built-in or saved composite

Click the composite button in the sidebar. The system:
1. Places the **entry port** at the spawn position
2. Lays out all member components at their saved relative positions
3. Wires internal parent–child links
4. Connects the entry port to the external parent (inheriting its ray color if enabled)
5. Sets the **exit port** as the focused component so you can continue building

### Composite entry and exit ports

Every composite has one **entry port** (where the optical path enters) and one **exit port** (where it exits and where the arrow handle lives for downstream spawning). The exit port is what connects to the next component you add.

### Ray propagation through composites

Ray geometry (aperture scaling, cone angle, divergence) propagates **fully** through composite members just as it does for normal components. Each member uses its own configured ray shape.

### Locking the entry aperture with Manual ray shape

If you want the **entry port's aperture size to be fixed** regardless of what connects upstream, save the composite with the entry member's ray shape set to **Manual**. Because Manual mode skips all aperture auto-scaling, the entry port's aperture radius will never be overridden by the upstream parent's projection.

> **How it works**: `applyApertureScaling` immediately returns when `child.rayShape === 'manual'`. Since the entry port is the child of the upstream component, Manual prevents any external resize while still allowing downstream members to propagate normally.

This is the recommended approach when you want a composite to have a fixed input aperture — e.g., a fiber-coupled stage where the fiber acceptance aperture is a fixed physical constraint.

### Ray color behavior

When a composite is spawned and the entry port has **Inherit from parent** enabled, it picks up the upstream component's color. That color then cascades to any downstream composite members that also have **Inherit from parent** enabled. Members with **Inherit from parent** disabled keep their individually saved colors.

Non-entry composite members display their ray panel as **read-only** (locked notice shown). To change ray properties of a composite's internal members, edit the composite definition in `CompositeLibrary.js` (built-ins) or re-save it via the Save as Composite dialog (user composites).

### Saving your own composite

1. Select 2 or more non-composite components (Mode 2 or 3).
2. Click **Save as Composite** in the toolbar.
3. **Phase 1**: Name the composite; review the spatial preview.
4. **Phase 2**: Click the component where light **enters**.
5. **Phase 3**: Click the component where light **exits** → Save.

The composite is saved to browser `localStorage` and immediately appears in the sidebar under **User Components**.

### Composite bounding box

A composite group is shown with a **grey dashed** bounding box (Mode 3) to distinguish it from the blue bounding box of a manually grouped selection.

### Re-linking and cut-link on composites

Cut-link and Re-link on a composite's exit port operate on the **entry port's external parent link**, treating the entire composite as a single unit. You cannot re-link to any component inside the same composite instance.

---

## 8. Saving and Loading

> **Note**: JSON import/export and SVG export are not yet implemented (buttons exist in the toolbar but have no handlers). Saving currently happens automatically for user composites via `localStorage`.

### User composites persist automatically

User composites are saved to `localStorage` and reloaded on every page open. They survive page refreshes but are browser-local.

---

## Tips

- **Continue from any component**: click any existing component to make it the current one (Mode 1), then click a sidebar button to spawn a child from it.
- **Branch the optical path**: select any intermediate component and spawn from it to create a second optical branch.
- **Hide visual clutter**: use **Toggle Trace** to hide center dotted lines, or **Toggle Rays** to hide aperture polygons, while keeping the other visible.
- **Use Manual ray shape for custom apertures**: any component set to Manual ignores parent-driven aperture scaling — useful for detectors, spatial light modulators, or fixed-aperture elements.
- **Use Convergent at focal points**: Convergent shape frees the child aperture from auto-scaling so you can set it independently.

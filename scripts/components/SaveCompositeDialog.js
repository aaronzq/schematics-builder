/**
 * SaveCompositeDialog.js
 * ----------------------
 * 3-phase <dialog> for saving the current multi-selection as a user composite
 * component definition.
 *
 * Phase A — Name + spatial preview of selected components in actual layout
 * Phase B — Pick Entry Port (click on component in spatial preview)
 * Phase C — Pick Exit Port (click on component in spatial preview) → Save
 *
 * The dialog renders an SVG preview that mirrors the actual canvas layout —
 * same positions, same rays, same appearance — so the user can orient
 * left/right and identify components spatially.
 *
 * Category is always "User Components" — no selector needed.
 */

import { components as componentRegistry } from './ComponentLibrary.js';
import { saveUserComponent } from './UserComponentStore.js';
import { COMPOSITE_DIALOG } from '../config.js';
import { getPolygonsForConnection } from '../rays/ApertureRays.js';

// ---------------------------------------------------------------------------
// Module-level dialog state
// ---------------------------------------------------------------------------

/** @type {HTMLDialogElement|null} */
let dialog = null;

/** Index of the current phase (0 = A, 1 = B, 2 = C). */
let phase = 0;

/** Mutable working state gathered across phases. */
const state = {
    label: '',
    entryId: null,   // component id chosen as entry port
    exitId: null,    // component id chosen as exit port
    memberIds: [],   // ordered array of selected component ids
};

/** Reference to the componentManager passed in at open time. */
let _cm = null;

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open the save-composite dialog for the current multi-selection.
 * @param {import('./ComponentManager.js').ComponentManager} componentManager
 */
export function openSaveCompositeDialog(componentManager) {
    _cm = componentManager;

    const ids = Array.from(_cm.selectedIds);
    if (ids.length < 2) {
        alert('Please select 2 or more components to save as a composite.');
        return;
    }

    // Reset state
    state.label    = '';
    state.entryId  = null;
    state.exitId   = null;
    state.memberIds = ids;
    phase = 0;

    // Lazily grab the dialog element
    if (!dialog) {
        dialog = document.getElementById('save-composite-dialog');
    }
    if (!dialog) {
        console.error('[SaveCompositeDialog] #save-composite-dialog not found in DOM');
        return;
    }

    // Apply config-driven sizing
    dialog.style.minWidth = COMPOSITE_DIALOG.MIN_WIDTH + 'px';
    dialog.style.maxWidth = COMPOSITE_DIALOG.MAX_WIDTH + 'px';

    _renderPhase();
    dialog.showModal();
}

// ---------------------------------------------------------------------------
// Phase rendering
// ---------------------------------------------------------------------------

function _renderPhase() {
    // Clear previous content
    while (dialog.firstChild) dialog.removeChild(dialog.firstChild);

    if (phase === 0) _renderPhaseA();
    else if (phase === 1) _renderPhaseB();
    else if (phase === 2) _renderPhaseC();
}

// ── Phase A — Name + spatial preview ────────────────────────────────────────

function _renderPhaseA() {
    const wrap = _el('div', { className: 'scd-phase' });

    // ── Header row ──────────────────────────────────────────────────────────
    const header = _el('div', { className: 'scd-header-row' });
    const title = _el('h3', { className: 'scd-title', textContent: 'Save Composite' });
    const stepBadge = _el('span', { className: 'scd-step-badge', textContent: '1 / 3' });
    header.appendChild(title);
    header.appendChild(stepBadge);
    wrap.appendChild(header);

    // ── Name input row ──────────────────────────────────────────────────────
    const nameRow = _el('div', { className: 'scd-name-row' });
    const nameInput = _el('input', {
        className: 'scd-input',
        type: 'text',
        placeholder: 'Name your composite, e.g. "4f Relay"',
        value: state.label
    });
    nameRow.appendChild(nameInput);
    wrap.appendChild(nameRow);

    // ── Spatial preview ─────────────────────────────────────────────────────
    const previewContainer = _el('div', { className: 'scd-spatial-preview' });
    const svgPreview = _buildSpatialPreview();
    previewContainer.appendChild(svgPreview);
    wrap.appendChild(previewContainer);

    // ── Buttons ─────────────────────────────────────────────────────────────
    const btnRow = _el('div', { className: 'scd-btn-row' });

    const cancelBtn = _el('button', { className: 'scd-btn scd-btn-secondary', textContent: 'Cancel' });
    cancelBtn.addEventListener('click', _close);

    const nextBtn = _el('button', { className: 'scd-btn scd-btn-primary', textContent: 'Next →' });
    nextBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (!name) {
            nameInput.focus();
            nameInput.classList.add('scd-input-error');
            return;
        }
        nameInput.classList.remove('scd-input-error');
        state.label = name;
        phase = 1;
        _renderPhase();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(nextBtn);
    wrap.appendChild(btnRow);

    dialog.appendChild(wrap);
    requestAnimationFrame(() => nameInput.focus());
}

// ── Phase B — Pick entry port ───────────────────────────────────────────────

function _renderPhaseB() {
    const wrap = _el('div', { className: 'scd-phase' });

    // Header
    const header = _el('div', { className: 'scd-header-row' });
    const title = _el('h3', { className: 'scd-title', textContent: 'Select Entry Port' });
    const stepBadge = _el('span', { className: 'scd-step-badge', textContent: '2 / 3' });
    header.appendChild(title);
    header.appendChild(stepBadge);
    wrap.appendChild(header);

    // Animated instruction
    const instruction = _buildAnimatedInstruction('entry');
    wrap.appendChild(instruction);

    // Spatial preview with clickable components
    const previewContainer = _el('div', { className: 'scd-spatial-preview scd-preview-interactive' });
    const svgPreview = _buildSpatialPreview({
        interactive: true,
        mode: 'entry',
        onSelect: (id) => {
            state.entryId = id;
            _renderPhase();
        },
        entryId: state.entryId,
        exitId: null
    });
    previewContainer.appendChild(svgPreview);
    wrap.appendChild(previewContainer);

    // Buttons
    const btnRow = _el('div', { className: 'scd-btn-row' });

    const backBtn = _el('button', { className: 'scd-btn scd-btn-secondary', textContent: '← Back' });
    backBtn.addEventListener('click', () => { phase = 0; _renderPhase(); });

    const cancelBtn = _el('button', { className: 'scd-btn scd-btn-secondary', textContent: 'Cancel' });
    cancelBtn.addEventListener('click', _close);

    const nextBtn = _el('button', { className: 'scd-btn scd-btn-primary', textContent: 'Next →' });
    nextBtn.disabled = (state.entryId === null);
    if (state.entryId === null) nextBtn.classList.add('scd-btn-disabled');
    nextBtn.addEventListener('click', () => {
        if (state.entryId === null) return;
        phase = 2;
        _renderPhase();
    });

    btnRow.appendChild(backBtn);
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(nextBtn);
    wrap.appendChild(btnRow);

    dialog.appendChild(wrap);
}

// ── Phase C — Pick exit port ────────────────────────────────────────────────

function _renderPhaseC() {
    const wrap = _el('div', { className: 'scd-phase' });

    // Header
    const header = _el('div', { className: 'scd-header-row' });
    const title = _el('h3', { className: 'scd-title', textContent: 'Select Exit Port' });
    const stepBadge = _el('span', { className: 'scd-step-badge', textContent: '3 / 3' });
    header.appendChild(title);
    header.appendChild(stepBadge);
    wrap.appendChild(header);

    // Animated instruction
    const instruction = _buildAnimatedInstruction('exit');
    wrap.appendChild(instruction);

    // Spatial preview with clickable components
    const previewContainer = _el('div', { className: 'scd-spatial-preview scd-preview-interactive' });
    const svgPreview = _buildSpatialPreview({
        interactive: true,
        mode: 'exit',
        onSelect: (id) => {
            state.exitId = id;
            _renderPhase();
        },
        entryId: state.entryId,
        exitId: state.exitId
    });
    previewContainer.appendChild(svgPreview);
    wrap.appendChild(previewContainer);

    // Warning area
    const warningEl = _el('div', { className: 'scd-warning' });
    warningEl.style.display = 'none';
    wrap.appendChild(warningEl);

    // Buttons
    const btnRow = _el('div', { className: 'scd-btn-row' });

    const backBtn = _el('button', { className: 'scd-btn scd-btn-secondary', textContent: '← Back' });
    backBtn.addEventListener('click', () => { phase = 1; _renderPhase(); });

    const cancelBtn = _el('button', { className: 'scd-btn scd-btn-secondary', textContent: 'Cancel' });
    cancelBtn.addEventListener('click', _close);

    const saveBtn = _el('button', { className: 'scd-btn scd-btn-primary', textContent: 'Save' });
    saveBtn.disabled = (state.exitId === null);
    if (state.exitId === null) saveBtn.classList.add('scd-btn-disabled');
    saveBtn.addEventListener('click', () => {
        if (state.exitId === null) return;
        if (state.exitId === state.entryId) {
            warningEl.textContent = '⚠ Entry and exit must be different components.';
            warningEl.style.display = 'block';
            return;
        }
        _buildAndSaveComposite();
    });

    btnRow.appendChild(backBtn);
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    wrap.appendChild(btnRow);

    dialog.appendChild(wrap);
}

// ---------------------------------------------------------------------------
// Animated instruction builder
// ---------------------------------------------------------------------------

/**
 * Build the animated instruction banner for port selection phases.
 * Uses inline SVG arrow animations and a pulsing text prompt.
 * @param {'entry'|'exit'} mode
 * @returns {HTMLElement}
 */
function _buildAnimatedInstruction(mode) {
    const instruction = _el('div', { className: 'scd-instruction' });

    const isEntry = mode === 'entry';
    const color = isEntry ? '#2196F3' : '#FF9800';
    const text = isEntry
        ? 'Click where light enters'
        : 'Click where light exits';

    // Animated arrow SVG
    const arrowWrap = _el('div', { className: `scd-anim-arrow ${isEntry ? 'scd-anim-entry' : 'scd-anim-exit'}` });
    const arrowSvg = document.createElementNS(SVG_NS, 'svg');
    arrowSvg.setAttribute('width', '36');
    arrowSvg.setAttribute('height', '22');
    arrowSvg.setAttribute('viewBox', '0 0 36 22');

    // Arrow path
    const arrowPath = document.createElementNS(SVG_NS, 'path');
    arrowPath.setAttribute('d', isEntry
        ? 'M4 11 L24 11 M18 5 L24 11 L18 17'
        : 'M12 11 L32 11 M26 5 L32 11 L26 17');
    arrowPath.setAttribute('stroke', color);
    arrowPath.setAttribute('stroke-width', '2.5');
    arrowPath.setAttribute('fill', 'none');
    arrowPath.setAttribute('stroke-linecap', 'round');
    arrowPath.setAttribute('stroke-linejoin', 'round');

    // Opacity pulse
    const opacityAnim = document.createElementNS(SVG_NS, 'animate');
    opacityAnim.setAttribute('attributeName', 'opacity');
    opacityAnim.setAttribute('values', '1;0.3;1');
    opacityAnim.setAttribute('dur', '1.4s');
    opacityAnim.setAttribute('repeatCount', 'indefinite');
    arrowPath.appendChild(opacityAnim);

    arrowSvg.appendChild(arrowPath);

    // Translate bounce
    const bounceAnim = document.createElementNS(SVG_NS, 'animateTransform');
    bounceAnim.setAttribute('attributeName', 'transform');
    bounceAnim.setAttribute('type', 'translate');
    bounceAnim.setAttribute('values', '-3,0;5,0;-3,0');
    bounceAnim.setAttribute('dur', '1.4s');
    bounceAnim.setAttribute('repeatCount', 'indefinite');
    arrowSvg.appendChild(bounceAnim);

    arrowWrap.appendChild(arrowSvg);
    instruction.appendChild(arrowWrap);

    // Text
    const instrText = _el('span', {
        className: 'scd-instruction-text',
        textContent: text
    });
    instrText.style.color = color;
    instruction.appendChild(instrText);

    return instruction;
}

// ---------------------------------------------------------------------------
// Spatial preview — renders selected components in actual layout with rays
// ---------------------------------------------------------------------------

/**
 * Build an SVG element that shows the selected components in their actual
 * spatial layout (same relative positions, orientations) with ray polygons.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.interactive]  - make components clickable
 * @param {'entry'|'exit'} [opts.mode]  - which port we're selecting
 * @param {function} [opts.onSelect]    - callback(componentId) on click
 * @param {number|null} [opts.entryId]  - highlight as entry
 * @param {number|null} [opts.exitId]   - highlight as exit
 * @returns {SVGElement}
 */
function _buildSpatialPreview(opts = {}) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'scd-preview-svg');

    const ids = state.memberIds;
    if (ids.length === 0) return svg;

    // ── 1. Compute bounding box of all members ──────────────────────────────
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const compDataList = [];

    ids.forEach(id => {
        const comp = _cm.getComponent(id);
        if (!comp) return;
        const def = componentRegistry[comp.type];

        const s = comp.scale ?? 1;
        const lb = def?.localBounds ?? comp.localBounds;

        // Use the component's own getBoundingBox() which correctly accounts for
        // centerPoint offset, rotation, and scale — giving a true world-space AABB.
        const bb = comp.getBoundingBox();
        minX = Math.min(minX, bb.minX);
        maxX = Math.max(maxX, bb.maxX);
        minY = Math.min(minY, bb.minY);
        maxY = Math.max(maxY, bb.maxY);

        // halfW/halfH are the max extents from centerPoint in world space.
        // Used for ring/hit-area radii (divided by scale inside the wrapper transform).
        let halfW, halfH;
        if (lb) {
            const cx = comp.centerPoint?.x ?? 0;
            const cy = comp.centerPoint?.y ?? 0;
            halfW = Math.max(Math.abs(lb.maxX - cx), Math.abs(lb.minX - cx)) * s;
            halfH = Math.max(Math.abs(lb.maxY - cy), Math.abs(lb.minY - cy)) * s;
        } else {
            halfW = halfH = (comp.apertureRadius ?? 15) * s;
        }

        compDataList.push({ id, comp, def, halfW, halfH });
    });

    // Add padding
    const contentW = (maxX - minX) || 60;
    const contentH = (maxY - minY) || 60;
    const pad = Math.max(contentW, contentH) * 0.18;

    const vbX = minX - pad;
    const vbY = minY - pad;
    const vbW = contentW + pad * 2;
    const vbH = contentH + pad * 2;

    svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Compute a representative scale for stroke widths (so they look consistent)
    const viewScale = Math.max(vbW, vbH) / 300;

    // ── 2. Draw ray polygons (behind components) ────────────────────────────
    const rayGroup = document.createElementNS(SVG_NS, 'g');
    rayGroup.setAttribute('class', 'scd-ray-group');

    ids.forEach(id => {
        const comp = _cm.getComponent(id);
        if (!comp || comp.parent === null) return;

        // Only draw ray if parent is also in this selection
        if (!ids.includes(comp.parent)) return;

        const parentComp = _cm.getComponent(comp.parent);
        if (!parentComp) return;

        const polygons = getPolygonsForConnection(parentComp, comp);
        polygons.forEach(p => {
            p.setAttribute('pointer-events', 'none');
            rayGroup.appendChild(p);
        });
    });

    svg.appendChild(rayGroup);

    // ── 3. Draw each component ──────────────────────────────────────────────
    compDataList.forEach(({ id, comp, def, halfW, halfH }) => {
        if (!def || !def.draw) return;

        const wrapper = document.createElementNS(SVG_NS, 'g');
        wrapper.setAttribute('class', 'scd-comp-wrapper');

        // Mirror Component._updateTransform exactly:
        // translate(x,y) → rotate(θ) → matrix(s·a, s·b, s·c, s·d, 0, 0) → translate(-cx, -cy)
        const rotation = comp.rotation ?? 0;
        const scale    = comp.scale    ?? 1;
        const cx = comp.centerPoint?.x ?? 0;
        const cy = comp.centerPoint?.y ?? 0;
        const { a, b, c, d } = comp._getFlipMatrix();

        const transformParts = [`translate(${comp.x},${comp.y})`];
        if (rotation !== 0) transformParts.push(`rotate(${rotation})`);
        transformParts.push(`matrix(${scale*a},${scale*b},${scale*c},${scale*d},0,0)`);
        if (cx !== 0 || cy !== 0) transformParts.push(`translate(${-cx},${-cy})`);

        wrapper.setAttribute('transform', transformParts.join(' '));

        // Clone the component artwork
        let artwork;
        try {
            artwork = def.draw(SVG_NS);
        } catch (e) {
            return;
        }
        _prefixIds(artwork);
        wrapper.appendChild(artwork);

        // ── Highlight rings for entry/exit ───────────────────────────────────
        const isEntry = (id === opts.entryId);
        const isExit = (id === opts.exitId);
        const isDisabled = (opts.mode === 'exit' && isEntry);

        if (isEntry || isExit) {
            const ringColor = isEntry ? '#2196F3' : '#FF9800';
            const r = Math.max(halfW, halfH) / scale + 5 * viewScale;
            const ring = document.createElementNS(SVG_NS, 'circle');
            ring.setAttribute('cx', 0);
            ring.setAttribute('cy', 0);
            ring.setAttribute('r', r);
            ring.setAttribute('fill', isEntry ? 'rgba(33,150,243,0.06)' : 'rgba(255,152,0,0.06)');
            ring.setAttribute('stroke', ringColor);
            ring.setAttribute('stroke-width', 1.5 * viewScale / scale);
            ring.setAttribute('stroke-dasharray', `${4 * viewScale / scale} ${3 * viewScale / scale}`);
            ring.setAttribute('pointer-events', 'none');
            ring.setAttribute('class', 'scd-port-ring');

            // Animated spinning dash
            const dashAnim = document.createElementNS(SVG_NS, 'animate');
            dashAnim.setAttribute('attributeName', 'stroke-dashoffset');
            dashAnim.setAttribute('values', `0;${14 * viewScale / scale}`);
            dashAnim.setAttribute('dur', '0.8s');
            dashAnim.setAttribute('repeatCount', 'indefinite');
            ring.appendChild(dashAnim);
            wrapper.appendChild(ring);

            // Port label
            const portLabel = document.createElementNS(SVG_NS, 'text');
            portLabel.setAttribute('x', 0);
            portLabel.setAttribute('y', -r - 3 * viewScale / scale);
            portLabel.setAttribute('text-anchor', 'middle');
            portLabel.setAttribute('fill', ringColor);
            portLabel.setAttribute('font-size', `${9 * viewScale / scale}`);
            portLabel.setAttribute('font-weight', '600');
            portLabel.setAttribute('pointer-events', 'none');
            if (rotation !== 0) {
                portLabel.setAttribute('transform', `rotate(${-rotation})`);
            }
            portLabel.textContent = isEntry ? '● Entry' : '● Exit';
            wrapper.appendChild(portLabel);
        }

        // ── Interactive hit area ────────────────────────────────────────────
        if (opts.interactive && !isDisabled) {
            const hitR = Math.max(halfW, halfH) / scale + 4 * viewScale;
            const hitArea = document.createElementNS(SVG_NS, 'circle');
            hitArea.setAttribute('cx', 0);
            hitArea.setAttribute('cy', 0);
            hitArea.setAttribute('r', hitR);
            hitArea.setAttribute('fill', 'transparent');
            hitArea.setAttribute('stroke', 'transparent');
            hitArea.setAttribute('stroke-width', 3 * viewScale / scale);
            hitArea.setAttribute('class', 'scd-hit-area');
            hitArea.style.cursor = 'pointer';
            hitArea.style.pointerEvents = 'all';

            const hoverColor = opts.mode === 'entry'
                ? { stroke: 'rgba(33,150,243,0.5)', fill: 'rgba(33,150,243,0.08)' }
                : { stroke: 'rgba(255,152,0,0.5)', fill: 'rgba(255,152,0,0.08)' };

            hitArea.addEventListener('click', (e) => {
                e.stopPropagation();
                if (opts.onSelect) opts.onSelect(id);
            });

            hitArea.addEventListener('mouseenter', () => {
                hitArea.setAttribute('stroke', hoverColor.stroke);
                hitArea.setAttribute('fill', hoverColor.fill);
            });
            hitArea.addEventListener('mouseleave', () => {
                hitArea.setAttribute('stroke', 'transparent');
                hitArea.setAttribute('fill', 'transparent');
            });

            wrapper.appendChild(hitArea);
        }

        // Dim disabled (entry port in exit-selection phase)
        if (isDisabled) {
            wrapper.style.opacity = '0.3';
            wrapper.style.pointerEvents = 'none';
        }

        // Hide hidden components (matches real canvas behaviour)
        if (!comp.visible) {
            wrapper.style.opacity = '0';
        }

        // Component type name label below
        const nameLabel = document.createElementNS(SVG_NS, 'text');
        const labelY = (halfH / scale) + 8 * viewScale / scale;
        nameLabel.setAttribute('x', 0);
        nameLabel.setAttribute('y', labelY);
        nameLabel.setAttribute('text-anchor', 'middle');
        nameLabel.setAttribute('fill', '#888');
        nameLabel.setAttribute('font-size', `${7 * viewScale / scale}`);
        nameLabel.setAttribute('font-family', 'Segoe UI, sans-serif');
        nameLabel.setAttribute('pointer-events', 'none');
        if (rotation !== 0) {
            nameLabel.setAttribute('transform', `rotate(${-rotation})`);
        }
        nameLabel.textContent = def.label ?? comp.type;
        wrapper.appendChild(nameLabel);

        svg.appendChild(wrapper);
    });

    return svg;
}

// ---------------------------------------------------------------------------
// Build & save
// ---------------------------------------------------------------------------

function _buildAndSaveComposite() {
    const ids = state.memberIds;

    const idToIndex = new Map(ids.map((id, i) => [id, i]));

    // Compute group centroid
    let sumX = 0, sumY = 0;
    ids.forEach(id => {
        const comp = _cm.getComponent(id);
        if (comp) { sumX += comp.x; sumY += comp.y; }
    });
    const centroidX = sumX / ids.length;
    const centroidY = sumY / ids.length;

    // Build members array
    const members = ids.map(id => {
        const comp = _cm.getComponent(id);
        const relX = comp.x - centroidX;
        const relY = comp.y - centroidY;

        let internalParentIndex = null;
        if (comp.parent !== null && idToIndex.has(comp.parent)) {
            internalParentIndex = idToIndex.get(comp.parent);
        }

        return {
            type:                comp.type,
            relX,
            relY,
            rotation:            comp.rotation            ?? 0,
            scale:               comp.scale               ?? 1,
            // Full aperture/ray state — enough to reproduce identical ray drawing
            rayShape:            comp.rayShape            || 'collimated',
            apertureRadius:      comp.apertureRadius      ?? 15,
            apertureCenterOffset: comp.apertureCenterOffset ?? 0,
            coneAngle:           comp.coneAngle           ?? 0,
            upVector:            { x: comp.upVector.x, y: comp.upVector.y },
            arraySegments:       comp.arraySegments       ?? 5,
            arraySizeRatio:      comp.arraySizeRatio      ?? 0.8,
            arrayPositionRatio:  comp.arrayPositionRatio  ?? 1.0,
            rayPolygonColor:             comp.rayPolygonColor             || '#00ffff',
            rayPolygonOpacity:           comp.rayPolygonOpacity           ?? 0.2,
            rayColorInheritFromParent:   comp.rayColorInheritFromParent   ?? true,
            rayPolygonColor2:            comp.rayPolygonColor2            || comp.rayPolygonColor || '#00ffff',
            gradientEnabled:             comp.gradientEnabled             ?? false,
            visible:                     comp.visible                     ?? true,
            internalParentIndex
        };
    });

    // Derive a stable key
    const keyBase = state.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const key = `user_${keyBase}_${Date.now()}`;

    // Capture a clean SVG snapshot from the live components
    const snapshotSvg = _buildSnapshotSvg(ids);

    const def = {
        key,
        label:           state.label,
        category:        'User Components',
        isComposite:     true,
        isBuiltIn:       false,
        members,
        entryMemberIndex: idToIndex.get(state.entryId) ?? 0,
        exitMemberIndex:  idToIndex.get(state.exitId)  ?? (ids.length - 1),
        snapshotSvg
    };

    try {
        saveUserComponent(def);
        console.log(`[SaveCompositeDialog] Saved composite "${state.label}" as key "${key}"`);
    } catch (err) {
        console.error('[SaveCompositeDialog] saveUserComponent failed:', err);
        alert(`Failed to save composite: ${err.message}`);
        return;
    }

    _close();
}

/**
 * Build a clean SVG snapshot of the selected components — artwork + ray
 * polygons only, no interactive overlays, labels, or rings.  The SVG is
 * serialised to a string so it can be persisted in localStorage.
 *
 * Uses the same world-space transform chain as _buildSpatialPreview but
 * strips all dialog-specific decorations.
 *
 * @param {string[]} ids - ordered component IDs
 * @returns {string}     - serialised SVG markup
 */
function _buildSnapshotSvg(ids) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    if (!ids || ids.length === 0) return '';

    // ── 1. Compute bounding box ─────────────────────────────────────────────
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const compDataList = [];

    ids.forEach(id => {
        const comp = _cm.getComponent(id);
        if (!comp) return;
        const def = componentRegistry[comp.type];

        const bb = comp.getBoundingBox();
        minX = Math.min(minX, bb.minX);
        maxX = Math.max(maxX, bb.maxX);
        minY = Math.min(minY, bb.minY);
        maxY = Math.max(maxY, bb.maxY);

        compDataList.push({ id, comp, def });
    });

    const contentW = (maxX - minX) || 60;
    const contentH = (maxY - minY) || 60;
    const pad = Math.max(contentW, contentH) * 0.18;

    svg.setAttribute('viewBox',
        `${minX - pad} ${minY - pad} ${contentW + pad * 2} ${contentH + pad * 2}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // ── 2. Ray polygons (behind components) ─────────────────────────────────
    const rayGroup = document.createElementNS(SVG_NS, 'g');

    ids.forEach(id => {
        const comp = _cm.getComponent(id);
        if (!comp || comp.parent === null) return;
        if (!ids.includes(comp.parent)) return;

        const parentComp = _cm.getComponent(comp.parent);
        if (!parentComp) return;

        const polygons = getPolygonsForConnection(parentComp, comp);
        polygons.forEach(p => rayGroup.appendChild(p));
    });

    svg.appendChild(rayGroup);

    // ── 3. Component artwork ────────────────────────────────────────────────
    compDataList.forEach(({ comp, def }) => {
        if (!def || !def.draw) return;

        const wrapper = document.createElementNS(SVG_NS, 'g');

        // Mirror Component._updateTransform exactly
        const rotation = comp.rotation ?? 0;
        const scale    = comp.scale    ?? 1;
        const cx = comp.centerPoint?.x ?? 0;
        const cy = comp.centerPoint?.y ?? 0;
        const { a, b, c, d } = comp._getFlipMatrix();

        const tp = [`translate(${comp.x},${comp.y})`];
        if (rotation !== 0) tp.push(`rotate(${rotation})`);
        tp.push(`matrix(${scale*a},${scale*b},${scale*c},${scale*d},0,0)`);
        if (cx !== 0 || cy !== 0) tp.push(`translate(${-cx},${-cy})`);
        wrapper.setAttribute('transform', tp.join(' '));

        // Respect visibility (matches real canvas behaviour)
        if (!comp.visible) wrapper.style.opacity = '0';

        let artwork;
        try { artwork = def.draw(SVG_NS); } catch { return; }
        _prefixIds(artwork);
        wrapper.appendChild(artwork);
        svg.appendChild(wrapper);
    });

    // Serialise to string
    const serialiser = new XMLSerializer();
    return serialiser.serializeToString(svg);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _close() {
    if (dialog) dialog.close();
}

/**
 * Minimal element factory.
 * @param {string} tag
 * @param {Object} [props]
 * @returns {HTMLElement}
 */
function _el(tag, props = {}) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
        if (k === 'textContent') el.textContent = v;
        else if (k === 'className') el.className = v;
        else el.setAttribute(k === 'htmlFor' ? 'for' : k, v);
    }
    return el;
}

/**
 * Prefix every element ID (and href/xlink:href references) inside `root`
 * with a unique random string to prevent collisions with the main canvas.
 */
function _prefixIds(root) {
    const prefix = `scd-${Math.random().toString(36).slice(2)}-`;
    const elementsWithId = root.querySelectorAll('[id]');
    const idMap = new Map();

    elementsWithId.forEach(el => {
        const oldId = el.getAttribute('id');
        idMap.set(oldId, prefix + oldId);
    });

    idMap.forEach((newId, oldId) => {
        const el = root.querySelector(`[id="${oldId}"]`);
        if (el) el.setAttribute('id', newId);
    });

    const allEls = [root, ...root.querySelectorAll('*')];
    allEls.forEach(el => {
        _rewriteAttr(el, 'href', idMap);
        _rewriteAttr(el, 'xlink:href', idMap);
        _rewriteAttr(el, 'fill', idMap);
        _rewriteAttr(el, 'stroke', idMap);
        _rewriteAttr(el, 'clip-path', idMap);
        _rewriteAttr(el, 'filter', idMap);
        _rewriteAttr(el, 'mask', idMap);
        _rewriteAttr(el, 'marker-start', idMap);
        _rewriteAttr(el, 'marker-mid', idMap);
        _rewriteAttr(el, 'marker-end', idMap);
    });
}

function _rewriteAttr(el, attr, idMap) {
    const val = el.getAttribute(attr);
    if (!val) return;
    const urlMatch = val.match(/^url\(#(.+)\)$/);
    if (urlMatch) {
        const newId = idMap.get(urlMatch[1]);
        if (newId) el.setAttribute(attr, `url(#${newId})`);
        return;
    }
    if (val.startsWith('#')) {
        const newId = idMap.get(val.slice(1));
        if (newId) el.setAttribute(attr, `#${newId}`);
    }
}

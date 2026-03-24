/**
 * SaveCompositeDialog.js
 * ----------------------
 * 3-phase <dialog> for saving the current multi-selection as a user composite
 * component definition.
 *
 * Phase A — Name + Category + Preview
 * Phase B — Pick Entry Port
 * Phase C — Pick Exit Port → Save
 *
 * The dialog element (#save-composite-dialog) must already exist in the DOM
 * (added to index.html by Agent E).  All interior content is built here with
 * document.createElement — no innerHTML.
 */

import { components as componentRegistry } from './ComponentLibrary.js';
import { saveUserComponent } from './UserComponentStore.js';
import { generateSnapshot } from './ComponentSnapshot.js';

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
    category: 'User Components',
    entryId: null,   // component id chosen as entry port
    exitId: null,    // component id chosen as exit port
    memberIds: [],   // ordered array of selected component ids
};

/** Reference to the componentManager passed in at open time. */
let _cm = null;

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
    state.category = 'User Components';
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

// ── Phase A ─────────────────────────────────────────────────────────────────

function _renderPhaseA() {
    const wrap = _el('div', { className: 'scd-phase' });

    // ── Title ────────────────────────────────────────────────────────────────
    const title = _el('h3', { className: 'scd-title', textContent: 'Save as Composite (1 / 3)' });
    wrap.appendChild(title);

    const subtitle = _el('p', { className: 'scd-subtitle', textContent: 'Name your composite and choose a category.' });
    wrap.appendChild(subtitle);

    // ── Name input ───────────────────────────────────────────────────────────
    const nameLabel = _el('label', { className: 'scd-label', textContent: 'Name' });
    const nameInput = _el('input', {
        className: 'scd-input',
        type: 'text',
        placeholder: 'e.g. 4f Relay',
        value: state.label
    });
    nameLabel.appendChild(nameInput);
    wrap.appendChild(nameLabel);

    // ── Category dropdown ────────────────────────────────────────────────────
    const catLabel = _el('label', { className: 'scd-label', textContent: 'Category' });
    const catSelect = _el('select', { className: 'scd-select' });

    // Collect unique categories from registry
    const catSet = new Set();
    for (const def of Object.values(componentRegistry)) {
        if (def.category) catSet.add(def.category);
    }
    // Always ensure "User Components" is present
    catSet.add('User Components');

    for (const cat of catSet) {
        const opt = _el('option', { value: cat, textContent: cat });
        if (cat === state.category) opt.selected = true;
        catSelect.appendChild(opt);
    }

    catLabel.appendChild(catSelect);
    wrap.appendChild(catLabel);

    // ── Live preview ─────────────────────────────────────────────────────────
    const previewTitle = _el('p', { className: 'scd-label', textContent: 'Preview (selection)' });
    wrap.appendChild(previewTitle);

    const previewArea = _el('div', { className: 'scd-preview-area' });
    _buildSelectionPreview(previewArea);
    wrap.appendChild(previewArea);

    // ── Buttons ───────────────────────────────────────────────────────────────
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
        state.label    = name;
        state.category = catSelect.value;
        phase = 1;
        _renderPhase();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(nextBtn);
    wrap.appendChild(btnRow);

    dialog.appendChild(wrap);

    // Focus the name input immediately
    requestAnimationFrame(() => nameInput.focus());
}

/**
 * Render individual component snapshots side-by-side as a rough preview.
 * @param {HTMLElement} container
 */
function _buildSelectionPreview(container) {
    state.memberIds.forEach(id => {
        const comp = _cm.getComponent(id);
        if (!comp) return;
        const def = componentRegistry[comp.type];
        if (!def) return;

        const item = _el('div', { className: 'scd-preview-item' });

        try {
            const svgEl = generateSnapshot(def, { width: 48, height: 48 });
            item.appendChild(svgEl);
        } catch (e) {
            const placeholder = _el('div', { className: 'scd-preview-placeholder', textContent: '?' });
            item.appendChild(placeholder);
        }

        const lbl = _el('span', { className: 'scd-preview-label', textContent: def.label ?? comp.type });
        item.appendChild(lbl);

        container.appendChild(item);
    });
}

// ── Phase B ─────────────────────────────────────────────────────────────────

function _renderPhaseB() {
    const wrap = _el('div', { className: 'scd-phase' });

    const title = _el('h3', { className: 'scd-title', textContent: 'Save as Composite (2 / 3)' });
    wrap.appendChild(title);

    const subtitle = _el('p', { className: 'scd-subtitle', textContent: 'Click the component where light enters.' });
    wrap.appendChild(subtitle);

    const list = _el('div', { className: 'scd-member-list' });

    state.memberIds.forEach(id => {
        const comp = _cm.getComponent(id);
        if (!comp) return;
        const def  = componentRegistry[comp.type];
        const lbl  = def?.label ?? comp.type;

        const item = _el('div', { className: 'scd-member-item' });
        if (id === state.entryId) item.classList.add('scd-member-selected');

        // Mini snapshot
        if (def) {
            try {
                const svgEl = generateSnapshot(def, { width: 36, height: 36 });
                item.appendChild(svgEl);
            } catch {/* ignore */}
        }

        const labelSpan = _el('span', { className: 'scd-member-label', textContent: lbl });
        item.appendChild(labelSpan);

        const badge = _el('span', { className: 'scd-member-badge scd-badge-entry', textContent: '← Entry' });
        badge.style.display = (id === state.entryId) ? '' : 'none';
        item.appendChild(badge);

        item.addEventListener('click', () => {
            state.entryId = id;
            // Re-render to show updated selection
            _renderPhase();
        });

        list.appendChild(item);
    });

    wrap.appendChild(list);

    const btnRow = _el('div', { className: 'scd-btn-row' });

    const backBtn = _el('button', { className: 'scd-btn scd-btn-secondary', textContent: '← Back' });
    backBtn.addEventListener('click', () => { phase = 0; _renderPhase(); });

    const cancelBtn = _el('button', { className: 'scd-btn scd-btn-secondary', textContent: 'Cancel' });
    cancelBtn.addEventListener('click', _close);

    const nextBtn = _el('button', { className: 'scd-btn scd-btn-primary', textContent: 'Next →' });
    nextBtn.addEventListener('click', () => {
        if (state.entryId === null) {
            subtitle.textContent = '⚠ Please click a component to set as entry port.';
            subtitle.style.color = '#c00';
            return;
        }
        phase = 2;
        _renderPhase();
    });

    btnRow.appendChild(backBtn);
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(nextBtn);
    wrap.appendChild(btnRow);

    dialog.appendChild(wrap);
}

// ── Phase C ─────────────────────────────────────────────────────────────────

function _renderPhaseC() {
    const wrap = _el('div', { className: 'scd-phase' });

    const title = _el('h3', { className: 'scd-title', textContent: 'Save as Composite (3 / 3)' });
    wrap.appendChild(title);

    const subtitle = _el('p', { className: 'scd-subtitle', textContent: 'Click the component where light exits.' });
    wrap.appendChild(subtitle);

    const list = _el('div', { className: 'scd-member-list' });

    state.memberIds.forEach(id => {
        const comp = _cm.getComponent(id);
        if (!comp) return;
        const def  = componentRegistry[comp.type];
        const lbl  = def?.label ?? comp.type;

        const isEntry = (id === state.entryId);
        const isExit  = (id === state.exitId);

        const item = _el('div', { className: 'scd-member-item' });
        if (isEntry) item.classList.add('scd-member-disabled');
        if (isExit)  item.classList.add('scd-member-selected');

        if (def) {
            try {
                const svgEl = generateSnapshot(def, { width: 36, height: 36 });
                if (isEntry) svgEl.style.opacity = '0.35';
                item.appendChild(svgEl);
            } catch {/* ignore */}
        }

        const labelSpan = _el('span', { className: 'scd-member-label', textContent: lbl });
        item.appendChild(labelSpan);

        if (isEntry) {
            const entryBadge = _el('span', { className: 'scd-member-badge scd-badge-entry', textContent: '← Entry' });
            item.appendChild(entryBadge);
        }

        const exitBadge = _el('span', { className: 'scd-member-badge scd-badge-exit', textContent: 'Exit →' });
        exitBadge.style.display = isExit ? '' : 'none';
        item.appendChild(exitBadge);

        if (!isEntry) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                state.exitId = id;
                _renderPhase();
            });
        }

        list.appendChild(item);
    });

    wrap.appendChild(list);

    const btnRow = _el('div', { className: 'scd-btn-row' });

    const backBtn = _el('button', { className: 'scd-btn scd-btn-secondary', textContent: '← Back' });
    backBtn.addEventListener('click', () => { phase = 1; _renderPhase(); });

    const cancelBtn = _el('button', { className: 'scd-btn scd-btn-secondary', textContent: 'Cancel' });
    cancelBtn.addEventListener('click', _close);

    const saveBtn = _el('button', { className: 'scd-btn scd-btn-primary', textContent: 'Save Composite' });
    saveBtn.addEventListener('click', () => {
        if (state.exitId === null) {
            subtitle.textContent = '⚠ Please click a component to set as exit port.';
            subtitle.style.color = '#c00';
            return;
        }
        if (state.exitId === state.entryId) {
            subtitle.textContent = '⚠ Entry and exit ports must be different components.';
            subtitle.style.color = '#c00';
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
// Build & save
// ---------------------------------------------------------------------------

/**
 * Assemble the composite definition from the current multi-selection and
 * the choices made in phases A–C, then persist it via saveUserComponent().
 */
function _buildAndSaveComposite() {
    const ids = state.memberIds;

    // Build an id → index lookup so we can resolve internalParentIndex
    const idToIndex = new Map(ids.map((id, i) => [id, i]));

    // Compute group centroid (average of all member world positions)
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

        // internalParentIndex: find a member whose id matches comp.parent
        let internalParentIndex = null;
        if (comp.parent !== null && idToIndex.has(comp.parent)) {
            internalParentIndex = idToIndex.get(comp.parent);
        }

        return {
            type:                comp.type,
            relX,
            relY,
            rotation:            comp.rotation   ?? 0,
            scale:               comp.scale       ?? 1,
            // Freeze ray props from the live instance
            apertureRadius:      comp.apertureRadius    ?? 15,
            coneAngle:           comp.coneAngle         ?? 0,
            rayShape:            comp.rayShape          || 'collimated',
            rayPolygonColor:     comp.rayPolygonColor   || '#00ffff',
            rayPolygonColor2:    comp.rayPolygonColor2  || comp.rayPolygonColor || '#00ffff',
            gradientEnabled:     comp.gradientEnabled   ?? false,
            internalParentIndex
        };
    });

    // Derive a stable key from the label + timestamp
    const keyBase = state.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const key = `user_${keyBase}_${Date.now()}`;

    const def = {
        key,
        label:           state.label,
        category:        state.category,
        isComposite:     true,
        isBuiltIn:       false,
        members,
        entryMemberIndex: idToIndex.get(state.entryId) ?? 0,
        exitMemberIndex:  idToIndex.get(state.exitId)  ?? (ids.length - 1)
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

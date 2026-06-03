/**
 * UserComponentStore.js
 * ----------------------
 * Persistence layer for user-created composite component definitions.
 *
 * User composites are stored as a JSON array in localStorage under the key
 * 'userCompositeComponents'.  Each definition follows the same schema as the
 * built-in composites in CompositeLibrary.js, with:
 *   isBuiltIn  : false
 *   isComposite: true
 *
 * The module also merges loaded definitions into the shared `components`
 * registry (imported from ComponentLibrary.js) so they are immediately
 * available to the rest of the app after `loadUserComponents()` is called.
 *
 * Events
 * ------
 * Both `saveUserComponent` and `deleteUserComponent` dispatch a
 * CustomEvent named 'user-components-changed' on `document` after
 * mutating the store, so UI layers can react and rebuild menus.
 */

import { components } from './ComponentLibrary.js';

const STORAGE_KEY = 'userCompositeComponents';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Read the raw array from localStorage.
 * Returns an empty array when the key is absent or the value is corrupt.
 * @returns {Object[]}
 */
function _readStore() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Overwrite the entire store with the provided array.
 * @param {Object[]} defs
 */
function _writeStore(defs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defs));
}

/**
 * Fire the 'user-components-changed' CustomEvent on document.
 */
function _notify() {
    document.dispatchEvent(new CustomEvent('user-components-changed'));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load all user composites from localStorage and merge them into the shared
 * `components` registry.  Call this once during app initialisation (before
 * the sidebar menu is built).
 *
 * Existing registry entries with the same key are overwritten so that
 * edits made between sessions are reflected immediately.
 */
export function loadUserComponents() {
    const defs = _readStore();
    for (const def of defs) {
        components[def.key] = def;
    }
}

/**
 * Persist a new (or updated) composite definition.
 *
 * - Enforces `isBuiltIn: false` and `isComposite: true` regardless of what
 *   the caller supplies.
 * - Replaces any existing entry with the same `def.key`.
 * - Merges the definition into the live `components` registry.
 * - Fires 'user-components-changed'.
 *
 * @param {Object} def  Composite definition object; must have a `key` field.
 */
export function saveUserComponent(def) {
    if (!def || typeof def.key !== 'string' || !def.key) {
        throw new Error('UserComponentStore.saveUserComponent: def.key must be a non-empty string.');
    }

    // Enforce user-component flags
    const sanitised = { ...def, isBuiltIn: false, isComposite: true };

    // Update persistent store
    const defs = _readStore();
    const idx = defs.findIndex(d => d.key === sanitised.key);
    if (idx >= 0) {
        defs[idx] = sanitised;
    } else {
        defs.push(sanitised);
    }
    _writeStore(defs);

    // Merge into live registry
    components[sanitised.key] = sanitised;

    _notify();
}

/**
 * Return all local user composite definitions for file export.
 * The returned objects are detached copies so callers can safely format them.
 *
 * @returns {Object[]}
 */
export function exportUserComponents() {
    return _readStore().map(def => ({ ...def, isBuiltIn: false, isComposite: true }));
}

/**
 * Bulk-import user composite definitions.
 *
 * Imported entries are merged into the current local store by key. Existing
 * entries with matching keys are overwritten; unrelated local entries remain.
 * Every imported entry is forced to be a user composite.
 *
 * @param {Object[]} defs
 * @returns {number} Number of imported definitions.
 */
export function importUserComponents(defs) {
    if (!Array.isArray(defs)) {
        throw new Error('UserComponentStore.importUserComponents: defs must be an array.');
    }

    const sanitisedDefs = defs.map((def, index) => {
        if (!def || typeof def !== 'object') {
            throw new Error(`User component at index ${index} must be an object.`);
        }
        if (def.isComposite !== true) {
            const label = def.key !== undefined && def.key !== null ? def.key : index;
            throw new Error(`User component "${label}" must have isComposite: true.`);
        }
        if (typeof def.key !== 'string' || !def.key.trim()) {
            throw new Error(`User component at index ${index} must have a non-empty string key.`);
        }

        return {
            ...def,
            key: def.key.trim(),
            category: def.category || 'User Components',
            isBuiltIn: false,
            isComposite: true
        };
    });

    const merged = _readStore();
    for (const def of sanitisedDefs) {
        const idx = merged.findIndex(existing => existing.key === def.key);
        if (idx >= 0) {
            merged[idx] = def;
        } else {
            merged.push(def);
        }
        components[def.key] = def;
    }

    _writeStore(merged);
    _notify();
    return sanitisedDefs.length;
}

/**
 * Delete a user composite by key.
 *
 * Removes the entry from localStorage and from the live `components` registry.
 * Fires 'user-components-changed'.
 *
 * @param {string} key  The registry key of the composite to delete.
 */
export function deleteUserComponent(key) {
    if (typeof key !== 'string' || !key) {
        throw new Error('UserComponentStore.deleteUserComponent: key must be a non-empty string.');
    }

    // Remove from persistent store
    const defs = _readStore().filter(d => d.key !== key);
    _writeStore(defs);

    // Remove from live registry (only if it is a user composite — guard against
    // accidentally deleting a built-in)
    if (components[key] && components[key].isBuiltIn === false) {
        delete components[key];
    }

    _notify();
}

/**
 * Return a copy of all user composite definitions currently in localStorage.
 * Does not modify the registry.
 *
 * @returns {Object[]}
 */
export function getUserComponents() {
    return _readStore();
}

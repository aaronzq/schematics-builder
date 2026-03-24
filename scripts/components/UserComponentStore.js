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

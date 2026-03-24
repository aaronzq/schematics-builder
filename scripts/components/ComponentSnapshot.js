/**
 * ComponentSnapshot.js
 * --------------------
 * Pure function that generates a self-contained SVG <svg> element suitable
 * for use as a sidebar thumbnail.  No global state is mutated; no IDs from
 * the main canvas are touched.
 *
 * Works for both basic components (def.isComposite === false / absent) and
 * composite components (def.isComposite === true).
 */

import { components as componentLibrary } from './ComponentLibrary.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a self-contained SVG thumbnail for a component definition.
 * Works for both basic and composite definitions.
 *
 * @param {object} def    - entry from the `components` registry
 * @param {object} [opts] - { width: 60, height: 60 }
 * @returns {SVGElement}  - standalone <svg> element, no ID conflicts
 */
export function generateSnapshot(def, opts = {}) {
    const width  = opts.width  ?? 60;
    const height = opts.height ?? 60;

    if (!def) {
        return _makeEmptySvg(width, height);
    }

    if (def.isComposite) {
        return _renderComposite(def, width, height);
    }

    return _renderBasic(def, width, height);
}

// ---------------------------------------------------------------------------
// Basic component rendering
// ---------------------------------------------------------------------------

function _renderBasic(def, width, height) {
    const svg = _createSvg();

    // Call def.draw(ns) — it expects the SVG namespace string, returns a <g>
    let artwork;
    try {
        artwork = def.draw(SVG_NS);
    } catch (e) {
        console.warn('[ComponentSnapshot] draw() threw for basic def:', e);
        return _makeEmptySvg(width, height);
    }

    // Prefix any IDs inside artwork to prevent collisions with the main canvas
    _prefixIds(artwork);

    svg.appendChild(artwork);

    // Compute viewBox from localBounds with 20 % padding
    const lb = def.localBounds;
    if (lb) {
        _applyViewBox(svg, lb.minX, lb.minY, lb.maxX - lb.minX, lb.maxY - lb.minY, 0.20);
    }

    svg.setAttribute('width',  width);
    svg.setAttribute('height', height);
    return svg;
}

// ---------------------------------------------------------------------------
// Composite component rendering
// ---------------------------------------------------------------------------

function _renderComposite(def, width, height) {
    const svg = _createSvg();

    if (!Array.isArray(def.members) || def.members.length === 0) {
        return _makeEmptySvg(width, height);
    }

    // ── 1. Render ray polygons first (so they appear behind components) ──────

    const rayGroup = document.createElementNS(SVG_NS, 'g');
    rayGroup.setAttribute('class', 'snapshot-rays');

    def.members.forEach((member) => {
        if (member.internalParentIndex === null || member.internalParentIndex === undefined) {
            return; // root member — no ray polygon
        }

        const parentIdx = member.internalParentIndex;
        if (parentIdx < 0 || parentIdx >= def.members.length) return;

        const parentMember = def.members[parentIdx];

        // Inline aperture-point geometry (mirrors Component._getAperturePoints +
        // Component._localToWorld at identity rotation, scale=1, no flip):
        //
        //   upper = apertureCenter + upVector * (+apertureRadius)
        //   lower = apertureCenter + upVector * (-apertureRadius)
        //
        // We use the definition-level upVector (0,-1) as the default when the
        // member type's definition is available; otherwise fall back to (0,-1).

        const memberDef = componentLibrary[member.type];
        const parentDef = componentLibrary[parentMember.type];

        const mUp = (memberDef  && memberDef.upVector)  || { x: 0, y: -1 };
        const pUp = (parentDef && parentDef.upVector) || { x: 0, y: -1 };

        const mAC = (memberDef  && memberDef.apertureCenter)  || { x: 0, y: 0 };
        const pAC = (parentDef && parentDef.apertureCenter) || { x: 0, y: 0 };

        const mR = member.apertureRadius ?? 15;
        const pR = parentMember.apertureRadius ?? 15;

        // Local aperture points → offset by member's relX/relY
        const mUpper = {
            x: member.relX + mAC.x + mUp.x * mR,
            y: member.relY + mAC.y + mUp.y * mR
        };
        const mLower = {
            x: member.relX + mAC.x - mUp.x * mR,
            y: member.relY + mAC.y - mUp.y * mR
        };
        const pUpper = {
            x: parentMember.relX + pAC.x + pUp.x * pR,
            y: parentMember.relY + pAC.y + pUp.y * pR
        };
        const pLower = {
            x: parentMember.relX + pAC.x - pUp.x * pR,
            y: parentMember.relY + pAC.y - pUp.y * pR
        };

        const color   = member.rayPolygonColor || '#00ffff';
        const opacity = 0.2;

        const polygon = document.createElementNS(SVG_NS, 'polygon');
        polygon.setAttribute('points',
            `${pUpper.x},${pUpper.y} ${mUpper.x},${mUpper.y} ${mLower.x},${mLower.y} ${pLower.x},${pLower.y}`
        );
        polygon.setAttribute('fill', color);
        polygon.setAttribute('fill-opacity', opacity);
        polygon.setAttribute('stroke', 'none');
        polygon.setAttribute('pointer-events', 'none');
        rayGroup.appendChild(polygon);
    });

    svg.appendChild(rayGroup);

    // ── 2. Render each member's artwork ──────────────────────────────────────

    let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;

    def.members.forEach((member) => {
        const memberDef = componentLibrary[member.type];
        if (!memberDef) {
            console.warn(`[ComponentSnapshot] Unknown member type "${member.type}" — skipping.`);
            return;
        }

        let artwork;
        try {
            artwork = memberDef.draw(SVG_NS);
        } catch (e) {
            console.warn(`[ComponentSnapshot] draw() threw for member type "${member.type}":`, e);
            return;
        }

        _prefixIds(artwork);

        // Build transform: translate(relX, relY) rotate(rotation) scale(scale)
        const relX     = member.relX      ?? 0;
        const relY     = member.relY      ?? 0;
        const rotation = member.rotation  ?? 0;
        const scale    = member.scale     ?? 1;

        const transformParts = [`translate(${relX},${relY})`];
        if (rotation !== 0)    transformParts.push(`rotate(${rotation})`);
        if (scale    !== 1)    transformParts.push(`scale(${scale})`);

        const wrapper = document.createElementNS(SVG_NS, 'g');
        wrapper.setAttribute('transform', transformParts.join(' '));
        wrapper.appendChild(artwork);
        svg.appendChild(wrapper);

        // Expand bounding box estimate using memberDef.localBounds (or apertureRadius fallback)
        const lb = memberDef.localBounds;
        if (lb) {
            // Apply scale (rotation ignored for tight bounding — just use worst-case extent)
            const halfW = ((lb.maxX - lb.minX) / 2) * scale;
            const halfH = ((lb.maxY - lb.minY) / 2) * scale;
            bMinX = Math.min(bMinX, relX - halfW);
            bMaxX = Math.max(bMaxX, relX + halfW);
            bMinY = Math.min(bMinY, relY - halfH);
            bMaxY = Math.max(bMaxY, relY + halfH);
        } else {
            // Fallback: use apertureRadius as half-size estimate
            const r = member.apertureRadius ?? 15;
            bMinX = Math.min(bMinX, relX - r);
            bMaxX = Math.max(bMaxX, relX + r);
            bMinY = Math.min(bMinY, relY - r);
            bMaxY = Math.max(bMaxY, relY + r);
        }
    });

    // Guard against degenerate bounds (e.g. all members were unknown/failed)
    if (!isFinite(bMinX)) {
        return _makeEmptySvg(width, height);
    }

    _applyViewBox(svg, bMinX, bMinY, bMaxX - bMinX, bMaxY - bMinY, 0.20);

    svg.setAttribute('width',  width);
    svg.setAttribute('height', height);
    return svg;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a bare detached <svg> element in the SVG namespace. */
function _createSvg() {
    return document.createElementNS(SVG_NS, 'svg');
}

/** Return a minimal empty <svg> for error / empty cases. */
function _makeEmptySvg(width, height) {
    const svg = _createSvg();
    svg.setAttribute('width',   width);
    svg.setAttribute('height',  height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    return svg;
}

/**
 * Apply a viewBox with symmetric padding.
 * @param {SVGElement} svg
 * @param {number} x       - left edge of content
 * @param {number} y       - top edge of content
 * @param {number} w       - content width
 * @param {number} h       - content height
 * @param {number} pad     - fractional padding (e.g. 0.20 for 20 %)
 */
function _applyViewBox(svg, x, y, w, h, pad) {
    // Avoid zero-dimension viewBox
    const safeW = w  || 60;
    const safeH = h  || 60;

    const px = safeW * pad;
    const py = safeH * pad;

    svg.setAttribute('viewBox', `${x - px} ${y - py} ${safeW + 2 * px} ${safeH + 2 * py}`);
}

/**
 * Prefix every element ID (and any href/xlink:href that references an ID)
 * inside `root` with a unique random string to prevent collisions with the
 * main canvas document.
 *
 * @param {SVGElement} root
 */
function _prefixIds(root) {
    const prefix = `snap-${Math.random().toString(36).slice(2)}-`;

    // Collect all elements that carry an id
    const elementsWithId = root.querySelectorAll('[id]');

    // Build old-id → new-id map first, then apply, so href rewrites are correct
    const idMap = new Map();
    elementsWithId.forEach((el) => {
        const oldId = el.getAttribute('id');
        const newId = prefix + oldId;
        idMap.set(oldId, newId);
    });

    // Rename IDs
    idMap.forEach((newId, oldId) => {
        const el = root.querySelector(`[id="${oldId}"]`);
        if (el) el.setAttribute('id', newId);
    });

    // Rewrite href / xlink:href / fill="url(#...)" / marker-* references
    const allEls = [root, ...root.querySelectorAll('*')];
    allEls.forEach((el) => {
        _rewriteUrlAttr(el, 'href',          idMap);
        _rewriteUrlAttr(el, 'xlink:href',    idMap);
        _rewriteUrlAttr(el, 'fill',          idMap);
        _rewriteUrlAttr(el, 'stroke',        idMap);
        _rewriteUrlAttr(el, 'marker-start',  idMap);
        _rewriteUrlAttr(el, 'marker-mid',    idMap);
        _rewriteUrlAttr(el, 'marker-end',    idMap);
        _rewriteUrlAttr(el, 'clip-path',     idMap);
        _rewriteUrlAttr(el, 'filter',        idMap);
        _rewriteUrlAttr(el, 'mask',          idMap);
    });
}

/**
 * If `attrName` on `el` is a CSS url(#id) or bare #id reference, rewrite it.
 * @param {Element}     el
 * @param {string}      attrName
 * @param {Map<string,string>} idMap
 */
function _rewriteUrlAttr(el, attrName, idMap) {
    const val = el.getAttribute(attrName);
    if (!val) return;

    // url(#someId)
    const urlMatch = val.match(/^url\(#(.+)\)$/);
    if (urlMatch) {
        const oldId = urlMatch[1];
        const newId = idMap.get(oldId);
        if (newId) el.setAttribute(attrName, `url(#${newId})`);
        return;
    }

    // bare #someId (used in href / xlink:href)
    if (val.startsWith('#')) {
        const oldId = val.slice(1);
        const newId = idMap.get(oldId);
        if (newId) el.setAttribute(attrName, `#${newId}`);
    }
}

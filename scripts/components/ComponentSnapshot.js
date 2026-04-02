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

    // If a serialised SVG snapshot was captured at save time, use it directly.
    if (def.snapshotSvg) {
        return _renderFromSavedSvg(def.snapshotSvg, width, height);
    }

    if (def.isComposite) {
        return _renderComposite(def, width, height);
    }

    return _renderBasic(def, width, height);
}

// ---------------------------------------------------------------------------
// Saved-SVG rendering (pixel-perfect snapshot captured at save time)
// ---------------------------------------------------------------------------

function _renderFromSavedSvg(svgString, width, height) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const parsedSvg = doc.documentElement;

        // Check for parse errors
        if (parsedSvg.querySelector('parsererror')) {
            console.warn('[ComponentSnapshot] Failed to parse saved SVG snapshot.');
            return _makeEmptySvg(width, height);
        }

        // Prefix IDs to avoid collisions with the main canvas
        _prefixIds(parsedSvg);

        // Ensure it scales properly in the sidebar button
        parsedSvg.setAttribute('width', '100%');
        parsedSvg.setAttribute('height', '100%');
        parsedSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        return parsedSvg;
    } catch (e) {
        console.warn('[ComponentSnapshot] Error restoring saved SVG:', e);
        return _makeEmptySvg(width, height);
    }
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

    svg.setAttribute('width',  '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
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

        // centerPoint offset — _localToWorld subtracts this before placing at (relX,relY)
        const mCP = (memberDef  && memberDef.centerPoint)  || { x: 0, y: 0 };
        const pCP = (parentDef && parentDef.centerPoint) || { x: 0, y: 0 };

        const mR = member.apertureRadius ?? 15;
        const pR = parentMember.apertureRadius ?? 15;

        // Member rotation
        const mRot = (member.rotation ?? 0) * Math.PI / 180;
        const mCos = Math.cos(mRot), mSin = Math.sin(mRot);

        // Parent rotation
        const pRot = (parentMember.rotation ?? 0) * Math.PI / 180;
        const pCos = Math.cos(pRot), pSin = Math.sin(pRot);

        // Local aperture points → apply full _localToWorld logic:
        //   local  = (apertureCenter - centerPoint) + upVector * (±radius)
        //   world  = relXY + rotate(local, rotation)
        const mUpLx = (mAC.x - mCP.x) + mUp.x * mR;
        const mUpLy = (mAC.y - mCP.y) + mUp.y * mR;
        const mLoLx = (mAC.x - mCP.x) - mUp.x * mR;
        const mLoLy = (mAC.y - mCP.y) - mUp.y * mR;

        const mUpper = {
            x: member.relX + mUpLx * mCos - mUpLy * mSin,
            y: member.relY + mUpLx * mSin + mUpLy * mCos
        };
        const mLower = {
            x: member.relX + mLoLx * mCos - mLoLy * mSin,
            y: member.relY + mLoLx * mSin + mLoLy * mCos
        };

        const pUpLx = (pAC.x - pCP.x) + pUp.x * pR;
        const pUpLy = (pAC.y - pCP.y) + pUp.y * pR;
        const pLoLx = (pAC.x - pCP.x) - pUp.x * pR;
        const pLoLy = (pAC.y - pCP.y) - pUp.y * pR;

        const pUpper = {
            x: parentMember.relX + pUpLx * pCos - pUpLy * pSin,
            y: parentMember.relY + pUpLx * pSin + pUpLy * pCos
        };
        const pLower = {
            x: parentMember.relX + pLoLx * pCos - pLoLy * pSin,
            y: parentMember.relY + pLoLx * pSin + pLoLy * pCos
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

        // Build transform matching the real canvas chain:
        // translate(relX, relY) → rotate → scale → translate(-cx, -cy)
        const relX     = member.relX      ?? 0;
        const relY     = member.relY      ?? 0;
        const rotation = member.rotation  ?? 0;
        const scale    = member.scale     ?? 1;
        const cx       = memberDef.centerPoint?.x ?? 0;
        const cy       = memberDef.centerPoint?.y ?? 0;

        const transformParts = [`translate(${relX},${relY})`];
        if (rotation !== 0)    transformParts.push(`rotate(${rotation})`);
        if (scale    !== 1)    transformParts.push(`scale(${scale})`);
        if (cx !== 0 || cy !== 0) transformParts.push(`translate(${-cx},${-cy})`);

        const wrapper = document.createElementNS(SVG_NS, 'g');
        wrapper.setAttribute('transform', transformParts.join(' '));
        wrapper.appendChild(artwork);
        svg.appendChild(wrapper);

        // Expand bounding box estimate using memberDef.localBounds (or apertureRadius fallback).
        // After translate(-cx,-cy), the artwork origin shifts so that centerPoint sits at (relX,relY).
        // The local bounds corners must be offset by (-cx,-cy) before applying relX/relY.
        const lb = memberDef.localBounds;
        if (lb) {
            const lbMinX = (lb.minX - cx) * scale;
            const lbMaxX = (lb.maxX - cx) * scale;
            const lbMinY = (lb.minY - cy) * scale;
            const lbMaxY = (lb.maxY - cy) * scale;
            bMinX = Math.min(bMinX, relX + lbMinX);
            bMaxX = Math.max(bMaxX, relX + lbMaxX);
            bMinY = Math.min(bMinY, relY + lbMinY);
            bMaxY = Math.max(bMaxY, relY + lbMaxY);
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

    svg.setAttribute('width',  '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
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
    svg.setAttribute('width',   '100%');
    svg.setAttribute('height',  '100%');
    svg.setAttribute('viewBox', `0 0 ${width || 60} ${height || 60}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    return svg;
}

/**
 * Apply a viewBox with symmetric padding.
 *
 * The viewBox is expanded so that the content occupies at most MAX_FILL of
 * the icon area (i.e. the content is never larger than MAX_FILL × icon size).
 * This means small artwork like the Point circle gets natural whitespace rather
 * than being blown up to fill the entire button.
 *
 * @param {SVGElement} svg
 * @param {number} x        - left edge of content
 * @param {number} y        - top edge of content
 * @param {number} w        - content width
 * @param {number} h        - content height
 * @param {number} pad      - fractional padding added to content (e.g. 0.20)
 */
function _applyViewBox(svg, x, y, w, h, pad) {
    // Avoid zero-dimension content
    const safeW = w || 60;
    const safeH = h || 60;

    // Add the requested proportional padding around the content.
    const px = safeW * pad;
    const py = safeH * pad;
    const paddedW = safeW + 2 * px;
    const paddedH = safeH + 2 * py;

    // Enforce a minimum viewBox size so that tiny components (e.g. Point, r=2.5)
    // don't fill the icon.  We choose a reference size equal to the largest
    // dimension of a "typical" component (~40 SVG units for Plane/Lens).
    const MIN_VIEW = 40;
    const finalW = Math.max(paddedW, MIN_VIEW);
    const finalH = Math.max(paddedH, MIN_VIEW);

    // Re-centre so the content stays in the middle of the expanded viewBox.
    const cx = x - px + paddedW / 2;
    const cy = y - py + paddedH / 2;
    const vx = cx - finalW / 2;
    const vy = cy - finalH / 2;

    svg.setAttribute('viewBox', `${vx} ${vy} ${finalW} ${finalH}`);
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

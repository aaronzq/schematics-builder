/**
 * DebugLayer — standalone debug visualization for all components.
 *
 * Owns the #debug-overlay SVG group. Reads component data (positions, vectors,
 * aperture points, array segments, etc.) and draws everything in world space.
 * Controlled by SHOW_DEBUG_DRAWING in config.js.
 *
 * Other modules should NEVER create SVG elements inside #debug-overlay directly.
 * Instead they call the exports here:
 *   initDebugLayer()              — once at startup
 *   refreshDebugLayer()           — full rebuild (add/delete/load)
 *   refreshDebugForComponent(comp) — lightweight per-component reposition (drag/rotate/scale)
 *   removeDebugForComponent(compId) — remove one component's debug group
 */

import {
  SHOW_DEBUG_DRAWING,
  UP_VECTOR_LENGTH,
  FORWARD_VECTOR_LENGTH,
  CENTER_MARKER_RADIUS,
  APERTURE_POINT_RADIUS,
  LOWER_APERTURE_POINT_RADIUS,
  ARRAY_SEGMENT_POINT_RADIUS,
  ARRAY_SEGMENT_POINT_COLOR,
  MANUAL_CENTER_MARKER_COLOR
} from '../config.js';
import { ensureDebugMarkers } from './svgUtils.js';
import { componentManager } from '../components/index.js';
import { Component } from '../components/Component.js';

const NS = 'http://www.w3.org/2000/svg';

/** Cached reference to #debug-overlay <g> */
let _overlayGroup = null;

// ─── helpers ───────────────────────────────────────────────────────────

/**
 * Rotate a local direction vector by a component's rotation (no flip, no scale).
 */
function _rotateDir(comp, lx, ly) {
  const rad = comp.rotation * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: lx * cos - ly * sin, y: lx * sin + ly * cos };
}

/**
 * Transform a local-space point to world space using rotation + position only
 * (no flip, no scale). Matches Component.localToWorld semantics.
 */
function _localToWorld(comp, lx, ly) {
  const d = _rotateDir(comp, lx - comp.centerPoint.x, ly - comp.centerPoint.y);
  return { x: comp.x + d.x, y: comp.y + d.y };
}

// ─── per-component SVG build ───────────────────────────────────────────

/**
 * Build the full debug <g> for one component (center, vectors, aperture dots,
 * array segments, manual offset marker). Returns the <g> element.
 */
function _buildDebugGroup(comp) {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('data-debug-for', comp.id);
  g.setAttribute('pointer-events', 'none');

  // Center marker (red dot)
  const center = document.createElementNS(NS, 'circle');
  center.setAttribute('r', CENTER_MARKER_RADIUS);
  center.setAttribute('fill', 'red');
  center.setAttribute('data-role', 'center');
  g.appendChild(center);

  // Up vector (green arrow)
  const upLine = document.createElementNS(NS, 'line');
  upLine.setAttribute('stroke', 'green');
  upLine.setAttribute('stroke-width', '1');
  upLine.setAttribute('marker-end', 'url(#upVectorArrow)');
  upLine.setAttribute('data-role', 'up-vector');
  g.appendChild(upLine);

  // Forward vector (blue arrow)
  const fwdLine = document.createElementNS(NS, 'line');
  fwdLine.setAttribute('stroke', 'blue');
  fwdLine.setAttribute('stroke-width', '1');
  fwdLine.setAttribute('marker-end', 'url(#forwardVectorArrow)');
  fwdLine.setAttribute('data-role', 'forward-vector');
  g.appendChild(fwdLine);

  // Aperture upper/lower dots (blue)
  if (comp.apertureRadius > 0) {
    const upperDot = document.createElementNS(NS, 'circle');
    upperDot.setAttribute('r', APERTURE_POINT_RADIUS);
    upperDot.setAttribute('fill', 'blue');
    upperDot.setAttribute('data-role', 'aperture-upper');
    g.appendChild(upperDot);

    const lowerDot = document.createElementNS(NS, 'circle');
    lowerDot.setAttribute('r', LOWER_APERTURE_POINT_RADIUS);
    lowerDot.setAttribute('fill', 'blue');
    lowerDot.setAttribute('data-role', 'aperture-lower');
    g.appendChild(lowerDot);
  }

  // Array segment dots + lines
  if (comp.rayShape === 'array') {
    const n = comp.arraySegments;
    for (let i = 0; i < n; i++) {
      const topDot = document.createElementNS(NS, 'circle');
      topDot.setAttribute('r', ARRAY_SEGMENT_POINT_RADIUS);
      topDot.setAttribute('fill', ARRAY_SEGMENT_POINT_COLOR);
      topDot.setAttribute('data-role', `seg-top-${i}`);
      g.appendChild(topDot);

      const botDot = document.createElementNS(NS, 'circle');
      botDot.setAttribute('r', ARRAY_SEGMENT_POINT_RADIUS);
      botDot.setAttribute('fill', ARRAY_SEGMENT_POINT_COLOR);
      botDot.setAttribute('data-role', `seg-bot-${i}`);
      g.appendChild(botDot);

      const segLine = document.createElementNS(NS, 'line');
      segLine.setAttribute('stroke', ARRAY_SEGMENT_POINT_COLOR);
      segLine.setAttribute('stroke-width', '1');
      segLine.setAttribute('data-role', `seg-line-${i}`);
      g.appendChild(segLine);
    }
  }

  return g;
}

// ─── per-component SVG position update ─────────────────────────────────

/**
 * Reposition all debug SVG elements for one component using current world-space
 * coordinates. The <g> must already exist in #debug-overlay.
 */
function _positionDebugGroup(g, comp) {
  const oc = _localToWorld(comp, comp.centerPoint.x, comp.centerPoint.y);

  // Center marker
  const center = g.querySelector('[data-role="center"]');
  if (center) { center.setAttribute('cx', oc.x); center.setAttribute('cy', oc.y); }

  // Up vector
  const upDir = _rotateDir(comp, comp.upVector.x, comp.upVector.y);
  const upLine = g.querySelector('[data-role="up-vector"]');
  if (upLine) {
    upLine.setAttribute('x1', oc.x);
    upLine.setAttribute('y1', oc.y);
    upLine.setAttribute('x2', oc.x + upDir.x * UP_VECTOR_LENGTH);
    upLine.setAttribute('y2', oc.y + upDir.y * UP_VECTOR_LENGTH);
  }

  // Forward vector
  const fwdDir = _rotateDir(comp, comp.forwardVector.x, comp.forwardVector.y);
  const fwdLine = g.querySelector('[data-role="forward-vector"]');
  if (fwdLine) {
    fwdLine.setAttribute('x1', oc.x);
    fwdLine.setAttribute('y1', oc.y);
    fwdLine.setAttribute('x2', oc.x + fwdDir.x * FORWARD_VECTOR_LENGTH);
    fwdLine.setAttribute('y2', oc.y + fwdDir.y * FORWARD_VECTOR_LENGTH);
  }

  // Aperture upper/lower dots
  if (comp.apertureRadius > 0) {
    const ec = comp._getEffectiveApertureCenter();
    const ac = _localToWorld(comp, ec.x, ec.y);
    const upD = _rotateDir(comp, comp.upVector.x, comp.upVector.y);

    const upperDot = g.querySelector('[data-role="aperture-upper"]');
    if (upperDot) {
      upperDot.setAttribute('cx', ac.x + upD.x * comp.apertureRadius);
      upperDot.setAttribute('cy', ac.y + upD.y * comp.apertureRadius);
    }
    const lowerDot = g.querySelector('[data-role="aperture-lower"]');
    if (lowerDot) {
      lowerDot.setAttribute('cx', ac.x - upD.x * comp.apertureRadius);
      lowerDot.setAttribute('cy', ac.y - upD.y * comp.apertureRadius);
    }
  }

  // Offset-center marker
  if (comp.rayShape === 'manual' || comp.rayShape === 'array') {
    const ec = comp._getEffectiveApertureCenter();
    const acW = _localToWorld(comp, ec.x, ec.y);
    const marker = g.querySelector('[data-role="offset-center"]');
    if (marker) { marker.setAttribute('cx', acW.x); marker.setAttribute('cy', acW.y); }
  }

  // Array segment dots + lines
  if (comp.rayShape === 'array') {
    const pts = comp.aperturePoints;
    for (let i = 0; i < comp.arraySegments; i++) {
      const topIdx = i * 2;
      const botIdx = i * 2 + 1;
      if (topIdx >= pts.length || botIdx >= pts.length) break;

      const topW = _localToWorld(comp, pts[topIdx].x, pts[topIdx].y);
      const botW = _localToWorld(comp, pts[botIdx].x, pts[botIdx].y);

      const topDot = g.querySelector(`[data-role="seg-top-${i}"]`);
      if (topDot) { topDot.setAttribute('cx', topW.x); topDot.setAttribute('cy', topW.y); }

      const botDot = g.querySelector(`[data-role="seg-bot-${i}"]`);
      if (botDot) { botDot.setAttribute('cx', botW.x); botDot.setAttribute('cy', botW.y); }

      const segLine = g.querySelector(`[data-role="seg-line-${i}"]`);
      if (segLine) {
        segLine.setAttribute('x1', topW.x); segLine.setAttribute('y1', topW.y);
        segLine.setAttribute('x2', botW.x); segLine.setAttribute('y2', botW.y);
      }
    }
  }
}

// ─── public API ────────────────────────────────────────────────────────

/**
 * One-time setup. Call from App.js after DOM is ready.
 * If SHOW_DEBUG_DRAWING is false, the overlay group is hidden and no elements
 * are created.
 */
export function initDebugLayer() {
  const svg = document.getElementById('canvas');
  if (!svg) return;

  _overlayGroup = document.getElementById('debug-overlay');
  if (!_overlayGroup) return;

  if (!SHOW_DEBUG_DRAWING) {
    _overlayGroup.style.display = 'none';
    return;
  }

  ensureDebugMarkers(svg);

  // Register live-update hook so debug dots track drag/rotate/scale
  Component.onTransformChanged = (comp) => refreshDebugForComponent(comp);

  refreshDebugLayer();
}

/**
 * Full rebuild: clear all debug elements and recreate for every component.
 * Use after bulk operations (load file, add/delete component).
 */
export function refreshDebugLayer() {
  if (!SHOW_DEBUG_DRAWING || !_overlayGroup) return;

  // Clear existing
  while (_overlayGroup.firstChild) _overlayGroup.removeChild(_overlayGroup.firstChild);

  // Build + position for each component
  for (const [, comp] of componentManager.components) {
    const g = _buildDebugGroup(comp);
    _overlayGroup.appendChild(g);
    _positionDebugGroup(g, comp);
  }
}

/**
 * Lightweight per-component reposition — call during drag/rotate/scale for
 * live updates without full rebuild.
 *
 * If the component's debug group doesn't exist yet (e.g. rayShape changed and
 * needs new elements), falls back to a full rebuild of that component's group.
 */
export function refreshDebugForComponent(comp) {
  if (!SHOW_DEBUG_DRAWING || !_overlayGroup) return;

  let g = _overlayGroup.querySelector(`[data-debug-for="${comp.id}"]`);

  if (!g) {
    // First time or structure changed — build fresh
    g = _buildDebugGroup(comp);
    _overlayGroup.appendChild(g);
  }

  _positionDebugGroup(g, comp);
}

/**
 * Rebuild the debug group for a component from scratch (e.g. when rayShape or
 * arraySegments changes and the SVG structure needs new/fewer elements).
 */
export function rebuildDebugForComponent(comp) {
  if (!SHOW_DEBUG_DRAWING || !_overlayGroup) return;

  // Remove old
  const old = _overlayGroup.querySelector(`[data-debug-for="${comp.id}"]`);
  if (old) old.remove();

  // Build + position
  const g = _buildDebugGroup(comp);
  _overlayGroup.appendChild(g);
  _positionDebugGroup(g, comp);
}

/**
 * Remove one component's debug group. Call on component deletion.
 */
export function removeDebugForComponent(compId) {
  if (!_overlayGroup) return;
  const g = _overlayGroup.querySelector(`[data-debug-for="${compId}"]`);
  if (g) g.remove();
}

import { components as componentLibrary } from './ComponentLibrary.js';
import { 
  ARROW_LENGTH,
  SHOW_DEBUG_DRAWING,
  UP_VECTOR_LENGTH,
  FORWARD_VECTOR_LENGTH,
  CENTER_MARKER_RADIUS,
  APERTURE_POINT_RADIUS,
  LOWER_APERTURE_POINT_RADIUS
} from '../config.js';
import { ensureDebugMarkers } from '../utils/svgUtils.js';

export class Component {
  constructor(typeOrConfig) {
    if (typeof typeOrConfig === 'string') {
      const type = typeOrConfig;
      const definition = componentLibrary[type];
      if (!definition) {
        throw new Error(`Unknown component type: ${type}`);
      }
      
      const config = {
        type: type,
        name: definition.name || type,
        localBounds: definition.localBounds,
        centerPoint: definition.centerPoint,
        upVector: definition.upVector,
        forwardVector: definition.forwardVector,
        apertureCenter: definition.apertureCenter,
        apertureRadius: definition.apertureRadius,
        coneAngle: definition.coneAngle,
        rayShape: definition.rayShape,
        drawFunction: definition.draw
      };
      
      this._initializeFromConfig(config);
    } else {
      this._initializeFromConfig(typeOrConfig);
    }
  }

  _initializeFromConfig(config) {
    if (!config.type) throw new Error('Component type is required');
    if (!config.drawFunction) throw new Error('Draw function is required');

    this.type = config.type;
    this.name = config.name || config.type;
    this.id = config.id || this._generateId();

    // localBounds: actual visual extent in local coords (pre-translate(-cx,-cy)).
    // width/height are derived from localBounds for backward-compat; localBounds is the source of truth.
    this.localBounds = config.localBounds || { minX: -5, maxX: 5, minY: -30, maxY: 30 };
    this.width = this.localBounds.maxX - this.localBounds.minX;
    this.height = this.localBounds.maxY - this.localBounds.minY;
    this.centerPoint = config.centerPoint || { x: 0, y: 0 };
    this.forwardVector = config.forwardVector || { x: 1, y: 0 };
    this.apertureCenter = config.apertureCenter || { x: 0, y: 0 };
    this.upVector = config.upVector || { x: 0, y: -1 };
    this.apertureRadius = config.apertureRadius ?? 15;
    this.aperturePoints = this._getAperturePoints();
    this.coneAngle = config.coneAngle ?? 0;
    this.rayShape = config.rayShape || 'collimated';
    this.rayPolygonColor = config.rayPolygonColor || '#00ffff';
    this.rayPolygonOpacity = config.rayPolygonOpacity ?? 0.2;

    // Arrow vector for positioning handle - defaults to forwardVector * ARROW_LENGTH
    this.arrowVector = config.arrowVector || {
      x: this.forwardVector.x * ARROW_LENGTH,
      y: this.forwardVector.y * ARROW_LENGTH
    };

    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.scale = 1;

    this.visible = true;
    this.flipX = false;
    this.flipY = false;

    this.element = null;
    this.shapeGroup = null;
    this.debugGroup = null;
    this.drawFunction = config.drawFunction;
    
    // Parent-child relationships
    this.parent = null;
    this.children = [];
    
    // Group relationships for multi-selection grouping
    this.isGrouped = false;
    this.groupMembers = new Set();
  }

  _getAperturePoints() {
    const points = [];
    const numPoints = 2;
    
    for (let i = 0; i < numPoints; i++) {
      // Reverse t so index 0 is visually upper (positive upVector direction)
      // and higher indices are visually lower (negative upVector direction)
      const t = 1 - (i / (numPoints - 1)) * 2;
      
      points.push({
        x: this.apertureCenter.x + this.upVector.x * t * this.apertureRadius,
        y: this.apertureCenter.y + this.upVector.y * t * this.apertureRadius
      });
    }
    
    return points;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    if (this.element) {
      this._updateTransform(this.element);
    }
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  setRotation(angle) {
    this.rotation = angle;
    if (this.element) {
      this._updateTransform(this.element);
    }
  }

  getRotation() {
    return this.rotation;
  }

  setScale(scale) {
    this.scale = scale;
    if (this.element) {
      this._updateTransform(this.element);
    }
  }

  getScale() {
    return this.scale;
  }

  setVisible(visible) {
    this.visible = visible;
    if (this.shapeGroup) {
      this.shapeGroup.style.opacity = visible ? '1' : '0';
    }
  }

  isVisible() {
    return this.visible;
  }

  flipHorizontal() {
    this.flipX = !this.flipX;
    if (this.element) {
      this._updateTransform(this.element);
    }
  }

  flipVertical() {
    this.flipY = !this.flipY;
    if (this.element) {
      this._updateTransform(this.element);
    }
  }

  getFlip() {
    return { flipX: this.flipX, flipY: this.flipY };
  }

  setApertureRadius(radius) {
    this.apertureRadius = radius;
    this.aperturePoints = this._getAperturePoints();
  }

  setConeAngle(angle) {
    this.coneAngle = angle;
  }

  setRayShape(shape) {
    this.rayShape = shape;
  }

  setArrowVector(x, y) {
    this.arrowVector = { x, y };
  }

  getArrowVector() {
    return this.arrowVector;
  }

  /**
   * Shared helper: transforms a local-space point to world space,
   * matching the SVG transform chain:
   *   translate(x,y) → rotate → scale+flip → translate(-cx,-cy)
   */
  _localToWorld(localX, localY) {
    const cx = this.centerPoint.x;
    const cy = this.centerPoint.y;
    const flipX = this.flipX ? -1 : 1;
    const flipY = this.flipY ? -1 : 1;
    const rad = this.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // Step 1: translate(-cx, -cy)
    const lx = (localX - cx) * flipX;
    const ly = (localY - cy) * flipY;
    // Step 2: scale+flip then rotate
    return {
      x: this.x + (lx * cos - ly * sin) * this.scale,
      y: this.y + (lx * sin + ly * cos) * this.scale
    };
  }

  /** Returns centerPoint in world coordinates. */
  getCenterPointWorld() {
    return this._localToWorld(this.centerPoint.x, this.centerPoint.y);
  }

  /** Returns apertureCenter in world coordinates. */
  getApertureCenterWorld() {
    return this._localToWorld(this.apertureCenter.x, this.apertureCenter.y);
  }

  /** Returns all aperturePoints in world coordinates. */
  getAperturePointsWorld() {
    return this.aperturePoints.map(p => this._localToWorld(p.x, p.y));
  }

  getArrowEndpoint() {
    // Returns the absolute position of the arrow tip in world coordinates.
    // The arrow originates from the optical center (centerPoint in world space).
    const oc = this.getCenterPointWorld();
    return {
      x: oc.x + this.arrowVector.x,
      y: oc.y + this.arrowVector.y
    };
  }

  getProperties() {
    return {
      localBounds: this.localBounds,
      centerPoint: this.centerPoint,
      upVector: this.upVector,
      forwardVector: this.forwardVector,
      apertureCenter: this.apertureCenter,
      apertureRadius: this.apertureRadius,
      aperturePoints: this._getAperturePoints(),
      coneAngle: this.coneAngle,
      rayShape: this.rayShape
    };
  }

  getTransform() {
    return {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scale: this.scale,
      flipX: this.flipX,
      flipY: this.flipY
    };
  }

  render() {
    const ns = 'http://www.w3.org/2000/svg';

    // Create main group for this component
    const group = document.createElementNS(ns, 'g');
    group.setAttribute('id', this.id);
    group.setAttribute('class', `component component-${this.type}`);
    group.setAttribute('data-type', this.type);

    // Wrap shape in its own group for visibility control
    const shapeGroup = document.createElementNS(ns, 'g');
    const shape = this.drawFunction(ns);
    shapeGroup.appendChild(shape);
    group.appendChild(shapeGroup);
    this.shapeGroup = shapeGroup;

    // Add debug elements if enabled
    if (SHOW_DEBUG_DRAWING) {
      this._addDebugElements(group, ns);
    }

    // Apply position and rotation transform
    this._updateTransform(group);

    // Set initial visibility
    this.shapeGroup.style.opacity = this.visible ? '1' : '0';
    
    // Store reference
    this.element = group;

    return group;
  }

  _addDebugElements(group, ns) {
    // Ensure debug markers exist in SVG
    const svg = document.getElementById('canvas');
    if (svg) {
      ensureDebugMarkers(svg);
    }

    // The debugGroup lives in the top-level #debug-overlay layer, NOT inside the
    // component's <g>. This means it inherits NO component transform (no scale, no
    // rotate, no flip). All positions are written directly in world coordinates and
    // are refreshed by _updateDebugElements() whenever the component moves/rotates/scales.
    const debugGroup = document.createElementNS(ns, 'g');
    debugGroup.setAttribute('data-debug-for', this.id);
    debugGroup.setAttribute('pointer-events', 'none');
    this.debugGroup = debugGroup;

    // Center marker (red dot)
    const centerMarker = document.createElementNS(ns, 'circle');
    centerMarker.setAttribute('r', CENTER_MARKER_RADIUS);
    centerMarker.setAttribute('fill', 'red');
    centerMarker.setAttribute('pointer-events', 'none');
    centerMarker.setAttribute('data-debug-role', 'center');
    debugGroup.appendChild(centerMarker);

    // Up vector (green arrow)
    const upLine = document.createElementNS(ns, 'line');
    upLine.setAttribute('stroke', 'green');
    upLine.setAttribute('stroke-width', '1');
    upLine.setAttribute('marker-end', 'url(#upVectorArrow)');
    upLine.setAttribute('pointer-events', 'none');
    upLine.setAttribute('data-debug-role', 'up-vector');
    debugGroup.appendChild(upLine);

    // Forward vector (blue arrow)
    const forwardLine = document.createElementNS(ns, 'line');
    forwardLine.setAttribute('stroke', 'blue');
    forwardLine.setAttribute('stroke-width', '1');
    forwardLine.setAttribute('marker-end', 'url(#forwardVectorArrow)');
    forwardLine.setAttribute('pointer-events', 'none');
    forwardLine.setAttribute('data-debug-role', 'forward-vector');
    debugGroup.appendChild(forwardLine);

    // Aperture points (blue dots) — only when radius > 0
    if (this.apertureRadius > 0) {
      const upperPoint = document.createElementNS(ns, 'circle');
      upperPoint.setAttribute('r', APERTURE_POINT_RADIUS);
      upperPoint.setAttribute('fill', 'blue');
      upperPoint.setAttribute('pointer-events', 'none');
      upperPoint.setAttribute('data-debug-role', 'aperture-upper');
      debugGroup.appendChild(upperPoint);

      const lowerPoint = document.createElementNS(ns, 'circle');
      lowerPoint.setAttribute('r', LOWER_APERTURE_POINT_RADIUS);
      lowerPoint.setAttribute('fill', 'blue');
      lowerPoint.setAttribute('pointer-events', 'none');
      lowerPoint.setAttribute('data-debug-role', 'aperture-lower');
      debugGroup.appendChild(lowerPoint);
    }

    // Attach to the overlay layer (world-space, no inherited transform)
    const overlay = document.getElementById('debug-overlay');
    if (overlay) {
      overlay.appendChild(debugGroup);
    }

    // Set initial world-space positions
    this._updateDebugElements();
  }

  /** Reposition all debug elements using current world-space coordinates.
   *  Called every time the component transform changes. Because the debugGroup
   *  lives in #debug-overlay (no inherited transform), cx/cy attributes are
   *  written directly as world coordinates.
   */
  _updateDebugElements() {
    if (!this.debugGroup) return;

    // Debug elements reflect only rotation and position — not scale, not flip.
    const rad = this.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Rotate a local direction vector by rotation only (no flip, no scale).
    const rotateDir = (lx, ly) => ({
      x: lx * cos - ly * sin,
      y: lx * sin + ly * cos
    });

    // Translate a local point to world space using rotation + position only
    // (no flip, no scale): world = (x,y) + rotate(local - centerPoint)
    const localToWorldNoScale = (lx, ly) => {
      const d = rotateDir(lx - this.centerPoint.x, ly - this.centerPoint.y);
      return { x: this.x + d.x, y: this.y + d.y };
    };

    // Optical center in world space (rotation + position only)
    const oc = localToWorldNoScale(this.centerPoint.x, this.centerPoint.y);

    // --- Center marker ---
    const centerMarker = this.debugGroup.querySelector('[data-debug-role="center"]');
    if (centerMarker) {
      centerMarker.setAttribute('cx', oc.x);
      centerMarker.setAttribute('cy', oc.y);
    }

    // --- Up vector: fixed display length, rotation+flip only ---
    const upDir = rotateDir(this.upVector.x, this.upVector.y);
    const upLine = this.debugGroup.querySelector('[data-debug-role="up-vector"]');
    if (upLine) {
      upLine.setAttribute('x1', oc.x);
      upLine.setAttribute('y1', oc.y);
      upLine.setAttribute('x2', oc.x + upDir.x * UP_VECTOR_LENGTH);
      upLine.setAttribute('y2', oc.y + upDir.y * UP_VECTOR_LENGTH);
    }

    // --- Forward vector: fixed display length, rotation+flip only ---
    const fwdDir = rotateDir(this.forwardVector.x, this.forwardVector.y);
    const fwdLine = this.debugGroup.querySelector('[data-debug-role="forward-vector"]');
    if (fwdLine) {
      fwdLine.setAttribute('x1', oc.x);
      fwdLine.setAttribute('y1', oc.y);
      fwdLine.setAttribute('x2', oc.x + fwdDir.x * FORWARD_VECTOR_LENGTH);
      fwdLine.setAttribute('y2', oc.y + fwdDir.y * FORWARD_VECTOR_LENGTH);
    }

    // --- Aperture points: fixed at true apertureRadius, rotation+flip only ---
    if (this.apertureRadius > 0) {
      const ac = localToWorldNoScale(this.apertureCenter.x, this.apertureCenter.y);
      const upD = rotateDir(this.upVector.x, this.upVector.y);

      const upperDot = this.debugGroup.querySelector('[data-debug-role="aperture-upper"]');
      if (upperDot) {
        upperDot.setAttribute('cx', ac.x + upD.x * this.apertureRadius);
        upperDot.setAttribute('cy', ac.y + upD.y * this.apertureRadius);
      }
      const lowerDot = this.debugGroup.querySelector('[data-debug-role="aperture-lower"]');
      if (lowerDot) {
        lowerDot.setAttribute('cx', ac.x - upD.x * this.apertureRadius);
        lowerDot.setAttribute('cy', ac.y - upD.y * this.apertureRadius);
      }
    }
  }

  /** Remove the debug overlay group from the DOM. Call on component deletion. */
  removeDebugElements() {
    if (this.debugGroup) {
      this.debugGroup.remove();
      this.debugGroup = null;
    }
  }

  getBoundingBox() {
    // Compute axis-aligned world bounding box using localBounds corners + _localToWorld.
    const corners = [
      this._localToWorld(this.localBounds.minX, this.localBounds.minY),
      this._localToWorld(this.localBounds.maxX, this.localBounds.minY),
      this._localToWorld(this.localBounds.maxX, this.localBounds.maxY),
      this._localToWorld(this.localBounds.minX, this.localBounds.maxY)
    ];
    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));
    const minY = Math.min(...corners.map(c => c.y));
    const maxY = Math.max(...corners.map(c => c.y));
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }

  _updateTransform(element) {
    const cx = this.centerPoint.x;
    const cy = this.centerPoint.y;
    const sx = this.scale * (this.flipX ? -1 : 1);
    const sy = this.scale * (this.flipY ? -1 : 1);

    // Rotate & scale around centerPoint, then place centerPoint at (x, y) in world space.
    // Chain: translate(x,y) → rotate → scale+flip → translate(-cx,-cy)
    // Net effect: centerPoint stays fixed at (x,y) as rotation changes.
    const transform = [
      `translate(${this.x}, ${this.y})`,
      `rotate(${this.rotation})`,
      `scale(${sx}, ${sy})`,
      `translate(${-cx}, ${-cy})`
    ].join(' ');

    element.setAttribute('transform', transform);

    // Refresh debug overlay elements (world-space, lives outside this element)
    if (this.debugGroup) {
      this._updateDebugElements();
    }
  }

  _generateId() {
    return `${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Group management methods
  setGroupMembers(ids) {
    this.isGrouped = true;
    this.groupMembers = new Set(ids);
  }

  clearGroup() {
    this.isGrouped = false;
    this.groupMembers.clear();
  }
}

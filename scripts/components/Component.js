import { components as componentLibrary } from './ComponentLibrary.js';
import { 
  ARROW_LENGTH,
  DEFAULT_APERTURE_CENTER_OFFSET,
  DEFAULT_ARRAY_SEGMENTS,
  DEFAULT_ARRAY_GAP,
  MAX_ARRAY_SEGMENTS
} from '../config.js';

export class Component {
  /**
   * Optional callback invoked whenever a component's transform changes.
   * Set by DebugLayer (or any observer) — avoids circular imports.
   * Signature: (component) => void
   */
  static onTransformChanged = null;

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
    this.coneAngle = config.coneAngle ?? 0;
    this.rayShape = config.rayShape || 'collimated';
    this.rayPolygonColor = config.rayPolygonColor || '#00ffff';
    this.rayPolygonOpacity = config.rayPolygonOpacity ?? 0.2;

    // Manual / Array aperture properties
    // apertureCenterOffset: signed displacement along upVector from the definition's
    // apertureCenter. The original apertureCenter is preserved for easy reset/undo.
    this.apertureCenterOffset = config.apertureCenterOffset ?? DEFAULT_APERTURE_CENTER_OFFSET;
    this.arraySegments = config.arraySegments ?? DEFAULT_ARRAY_SEGMENTS;
    this.arrayGap = config.arrayGap ?? DEFAULT_ARRAY_GAP;

    // Compute aperture points (depends on rayShape, radius, offset, array params)
    this.aperturePoints = this._getAperturePoints();

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
    this.drawFunction = config.drawFunction;
    
    // Parent-child relationships
    this.parent = null;
    this.children = [];
    
    // Group relationships for multi-selection grouping
    this.isGrouped = false;
    this.groupMembers = new Set();

    // Composite instance flags
    this.isCompositeInstance = false;  // true if this is part of a spawned composite
    this.compositeKey = null;          // back-reference to composite definition key
    this.compositeInstanceId = null;   // unique ID per composite expansion (distinguishes instances)
    this.isExitPort = false;           // true if this is the designated exit port of a composite
    this.isEntryPort = false;          // true if this is the designated entry port of a composite
    this.rayLocked = false;            // true = ray/aperture config UI is frozen
  }

  /**
   * Effective aperture center in local coordinates.
   * Applies apertureCenterOffset along upVector, preserving the original
   * definition-based apertureCenter for reset/undo.
   */
  _getEffectiveApertureCenter() {
    return {
      x: this.apertureCenter.x + this.upVector.x * this.apertureCenterOffset,
      y: this.apertureCenter.y + this.upVector.y * this.apertureCenterOffset
    };
  }

  /**
   * Clamp arrayGap so segment length never goes negative.
   * maxGap = 2 * apertureRadius / (segments - 1) when segments > 1, else 0.
   */
  _clampArrayGap() {
    if (this.arraySegments <= 1) {
      this.arrayGap = 0;
      return;
    }
    const maxGap = (2 * this.apertureRadius) / (this.arraySegments - 1);
    if (this.arrayGap > maxGap) this.arrayGap = maxGap;
    if (this.arrayGap < 0) this.arrayGap = 0;
  }

  _getAperturePoints() {
    const ec = this._getEffectiveApertureCenter();
    const ux = this.upVector.x;
    const uy = this.upVector.y;
    const r = this.apertureRadius;

    if (this.rayShape === 'array') {
      // Array mode: equally spaced segments along the aperture span.
      // Each segment has a top and bottom point. Gaps sit between segments.
      this._clampArrayGap();
      const n = this.arraySegments;
      const totalSpan = 2 * r;                                      // full aperture span
      const segLen = (totalSpan - (n - 1) * this.arrayGap) / n;     // length per segment
      const points = [];

      // Walk from upper (+r) to lower (-r)
      // upperEdge is the top of the first segment
      let cursor = r; // distance from effective center along upVector
      for (let i = 0; i < n; i++) {
        const segTop = cursor;
        const segBot = cursor - segLen;
        points.push(
          { x: ec.x + ux * segTop, y: ec.y + uy * segTop },
          { x: ec.x + ux * segBot, y: ec.y + uy * segBot }
        );
        cursor = segBot - this.arrayGap; // skip gap
      }
      return points;
    }

    // collimated / divergent / convergent / manual: 2 points (upper, lower)
    return [
      { x: ec.x + ux * r, y: ec.y + uy * r },
      { x: ec.x - ux * r, y: ec.y - uy * r }
    ];
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
    this._clampArrayGap();
    this.aperturePoints = this._getAperturePoints();
  }

  setConeAngle(angle) {
    this.coneAngle = angle;
  }

  setRayShape(shape) {
    this.rayShape = shape;
    this.aperturePoints = this._getAperturePoints();
  }

  setApertureCenterOffset(offset) {
    this.apertureCenterOffset = offset;
    this.aperturePoints = this._getAperturePoints();
  }

  setArraySegments(n) {
    this.arraySegments = Math.max(1, Math.min(MAX_ARRAY_SEGMENTS, Math.round(n)));
    this._clampArrayGap();
    this.aperturePoints = this._getAperturePoints();
  }

  setArrayGap(gap) {
    this.arrayGap = Math.max(0, gap);
    this._clampArrayGap();
    this.aperturePoints = this._getAperturePoints();
  }

  setArrowVector(x, y) {
    this.arrowVector = { x, y };
  }

  getArrowVector() {
    return this.arrowVector;
  }

  /**
   * Compute the 2×2 flip matrix in local coordinates.
   *
   * "Flip horizontal" mirrors across the upVector axis (left↔right of upVector).
   * "Flip vertical"   mirrors across the axis perpendicular to upVector (up↔down of upVector).
   *                   The perpendicular axis is computed as (uy, -ux) — always orthogonal to
   *                   upVector, independent of forwardVector.
   *
   * Reflection of a point across a unit vector n = (nx, ny):
   *   M = [[2nx²-1,  2nx*ny],
   *        [2nx*ny,  2ny²-1]]
   *
   * For standard upVector=(0,-1) / forwardVector=(1,0) this reduces to the
   * familiar scale(-1,1) / scale(1,-1), so existing data is fully compatible.
   *
   * @returns {{ a:number, b:number, c:number, d:number }}
   *   The combined 2×2 matrix [[a,c],[b,d]] (SVG matrix column-major).
   */
  _getFlipMatrix() {
    // Identity to start
    let a = 1, b = 0, c = 0, d = 1;

    if (this.flipX) {
      // Reflect across upVector axis
      const ux = this.upVector.x;
      const uy = this.upVector.y;
      const ra = 2 * ux * ux - 1;
      const rb = 2 * ux * uy;
      const rc = 2 * ux * uy;
      const rd = 2 * uy * uy - 1;
      // Compose: new = R_up * current
      const na = ra * a + rc * b;
      const nb = rb * a + rd * b;
      const nc = ra * c + rc * d;
      const nd = rb * c + rd * d;
      a = na; b = nb; c = nc; d = nd;
    }

    if (this.flipY) {
      // Reflect across the axis perpendicular to upVector: perp = (uy, -ux)
      const fx = this.upVector.y;   //  uy
      const fy = -this.upVector.x;  // -ux
      const ra = 2 * fx * fx - 1;
      const rb = 2 * fx * fy;
      const rc = 2 * fx * fy;
      const rd = 2 * fy * fy - 1;
      // Compose: new = R_fwd * current
      const na = ra * a + rc * b;
      const nb = rb * a + rd * b;
      const nc = ra * c + rc * d;
      const nd = rb * c + rd * d;
      a = na; b = nb; c = nc; d = nd;
    }

    return { a, b, c, d };
  }

  /**
   * Shared helper: transforms a local-space point to world space.
   * Used for OPTICAL geometry only (aperture points, centerPoint, arrow endpoint).
   * Scale and flip are intentionally excluded — both are cosmetic (SVG artwork only)
   * and must not affect ray tracing, aperture positions, or the arrow handle.
   *
   * Chain: translate(-cx,-cy) → rotate → translate(x,y)
   */
  localToWorld(localX, localY) {
    const cx = this.centerPoint.x;
    const cy = this.centerPoint.y;
    const rad = this.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const lx = localX - cx;
    const ly = localY - cy;
    return {
      x: this.x + (lx * cos - ly * sin),
      y: this.y + (lx * sin + ly * cos)
    };
  }

  /** Returns centerPoint in world coordinates. */
  getCenterPointWorld() {
    return this.localToWorld(this.centerPoint.x, this.centerPoint.y);
  }

  /** Returns effective apertureCenter (with offset) in world coordinates. */
  getApertureCenterWorld() {
    const ec = this._getEffectiveApertureCenter();
    return this.localToWorld(ec.x, ec.y);
  }

  /** Returns all aperturePoints in world coordinates. */
  getAperturePointsWorld() {
    return this.aperturePoints.map(p => this.localToWorld(p.x, p.y));
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
      apertureCenterOffset: this.apertureCenterOffset,
      aperturePoints: this._getAperturePoints(),
      coneAngle: this.coneAngle,
      rayShape: this.rayShape,
      arraySegments: this.arraySegments,
      arrayGap: this.arrayGap
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

    // Invisible hit-area rect for reliable pointer events.
    // Covers the full localBounds area (same local coordinate space as the artwork)
    // with a minimum size so even thin/small components are easy to click.
    const MIN_HIT_SIZE = 10;
    const lb = this.localBounds;
    const hitW = Math.max(lb.maxX - lb.minX, MIN_HIT_SIZE);
    const hitH = Math.max(lb.maxY - lb.minY, MIN_HIT_SIZE);
    const hitCx = (lb.minX + lb.maxX) / 2;
    const hitCy = (lb.minY + lb.maxY) / 2;
    const hitArea = document.createElementNS(ns, 'rect');
    hitArea.setAttribute('class', 'component-hit-area');
    hitArea.setAttribute('x', hitCx - hitW / 2);
    hitArea.setAttribute('y', hitCy - hitH / 2);
    hitArea.setAttribute('width', hitW);
    hitArea.setAttribute('height', hitH);
    hitArea.setAttribute('fill', 'transparent');
    hitArea.setAttribute('pointer-events', 'all');
    group.appendChild(hitArea);

    // Wrap shape in its own group for visibility control
    const shapeGroup = document.createElementNS(ns, 'g');
    const shape = this.drawFunction(ns);
    shapeGroup.appendChild(shape);
    group.appendChild(shapeGroup);
    this.shapeGroup = shapeGroup;

    // Apply position and rotation transform
    this._updateTransform(group);

    // Set initial visibility
    this.shapeGroup.style.opacity = this.visible ? '1' : '0';
    
    // Store reference
    this.element = group;

    return group;
  }

  getBoundingBox() {
    // Compute axis-aligned world bounding box using localBounds corners.
    // Scale is applied explicitly here (visual extent scales with the component).
    const cx = this.centerPoint.x;
    const cy = this.centerPoint.y;
    const rad = this.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const s = this.scale;
    const corners = [
      { x: this.localBounds.minX, y: this.localBounds.minY },
      { x: this.localBounds.maxX, y: this.localBounds.minY },
      { x: this.localBounds.maxX, y: this.localBounds.maxY },
      { x: this.localBounds.minX, y: this.localBounds.maxY }
    ].map(({ x, y }) => {
      const lx = (x - cx) * s;
      const ly = (y - cy) * s;
      return { x: this.x + (lx * cos - ly * sin), y: this.y + (lx * sin + ly * cos) };
    });
    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));
    const minY = Math.min(...corners.map(c => c.y));
    const maxY = Math.max(...corners.map(c => c.y));
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }

  _updateTransform(element) {
    const cx = this.centerPoint.x;
    const cy = this.centerPoint.y;
    const s = this.scale;

    // Build flip matrix (reflection across upVector / forwardVector axes)
    const { a, b, c, d } = this._getFlipMatrix();

    // Rotate & flip around centerPoint, then place centerPoint at (x, y) in world space.
    // Chain: translate(x,y) → rotate → (flip * scale) → translate(-cx,-cy)
    // Net effect: centerPoint stays fixed at (x,y) as rotation/flip changes.
    //
    // The flip+scale step is expressed as a matrix() transform:
    //   [ s*a  s*c ]   applied after translate(-cx,-cy)
    //   [ s*b  s*d ]
    const transform = [
      `translate(${this.x}, ${this.y})`,
      `rotate(${this.rotation})`,
      `matrix(${s*a}, ${s*b}, ${s*c}, ${s*d}, 0, 0)`,
      `translate(${-cx}, ${-cy})`
    ].join(' ');

    element.setAttribute('transform', transform);

    // Notify observers (e.g. DebugLayer) for live debug updates
    if (Component.onTransformChanged) {
      Component.onTransformChanged(this);
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

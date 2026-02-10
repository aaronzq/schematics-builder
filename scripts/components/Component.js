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
        width: definition.width,
        height: definition.height,
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

    this.width = config.width || 10;
    this.height = config.height || 60;
    this.centerPoint = config.centerPoint || { x: 0, y: 0 };
    this.forwardVector = config.forwardVector || { x: 1, y: 0 };
    this.apertureCenter = config.apertureCenter || { x: 0, y: 0 };
    this.upVector = config.upVector || { x: 0, y: -1 };
    this.apertureRadius = config.apertureRadius || 15;
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

  getArrowEndpoint() {
    // Returns the absolute position of the arrow endpoint in world coordinates
    return {
      x: this.x + this.arrowVector.x,
      y: this.y + this.arrowVector.y
    };
  }

  getProperties() {
    return {
      width: this.width,
      height: this.height,
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

    // Create a group for debug elements with counter-flip transform
    const debugGroup = document.createElementNS(ns, 'g');
    this.debugGroup = debugGroup;
    const counterFlipScale = `scale(${this.flipX ? -1 : 1}, ${this.flipY ? -1 : 1})`;
    debugGroup.setAttribute('transform', counterFlipScale);
    
    // Center marker (red dot)
    const centerMarker = document.createElementNS(ns, 'circle');
    centerMarker.setAttribute('cx', this.centerPoint.x);
    centerMarker.setAttribute('cy', this.centerPoint.y);
    centerMarker.setAttribute('r', CENTER_MARKER_RADIUS);
    centerMarker.setAttribute('fill', 'red');
    centerMarker.setAttribute('pointer-events', 'none');
    debugGroup.appendChild(centerMarker);

    // Up vector (green arrow)
    const upLine = document.createElementNS(ns, 'line');
    upLine.setAttribute('x1', this.centerPoint.x);
    upLine.setAttribute('y1', this.centerPoint.y);
    upLine.setAttribute('x2', this.centerPoint.x + this.upVector.x * UP_VECTOR_LENGTH);
    upLine.setAttribute('y2', this.centerPoint.y + this.upVector.y * UP_VECTOR_LENGTH);
    upLine.setAttribute('stroke', 'green');
    upLine.setAttribute('stroke-width', '1');
    upLine.setAttribute('marker-end', 'url(#upVectorArrow)');
    upLine.setAttribute('pointer-events', 'none');
    debugGroup.appendChild(upLine);

    // Forward vector (blue arrow)
    const forwardLine = document.createElementNS(ns, 'line');
    forwardLine.setAttribute('x1', this.centerPoint.x);
    forwardLine.setAttribute('y1', this.centerPoint.y);
    forwardLine.setAttribute('x2', this.centerPoint.x + this.forwardVector.x * FORWARD_VECTOR_LENGTH);
    forwardLine.setAttribute('y2', this.centerPoint.y + this.forwardVector.y * FORWARD_VECTOR_LENGTH);
    forwardLine.setAttribute('stroke', 'blue');
    forwardLine.setAttribute('stroke-width', '1');
    forwardLine.setAttribute('marker-end', 'url(#forwardVectorArrow)');
    forwardLine.setAttribute('pointer-events', 'none');
    debugGroup.appendChild(forwardLine);

    // Aperture points (blue dots)
    const aperturePoints = this._getAperturePoints();
    if (aperturePoints && aperturePoints.length >= 2) {
      // Upper aperture point
      const upperPoint = document.createElementNS(ns, 'circle');
      upperPoint.setAttribute('cx', aperturePoints[0].x);
      upperPoint.setAttribute('cy', aperturePoints[0].y);
      upperPoint.setAttribute('r', APERTURE_POINT_RADIUS);
      upperPoint.setAttribute('fill', 'blue');
      upperPoint.setAttribute('pointer-events', 'none');
      upperPoint.setAttribute('data-aperture-type', 'upper');
      debugGroup.appendChild(upperPoint);

      // Lower aperture point
      const lowerPoint = document.createElementNS(ns, 'circle');
      lowerPoint.setAttribute('cx', aperturePoints[1].x);
      lowerPoint.setAttribute('cy', aperturePoints[1].y);
      lowerPoint.setAttribute('r', LOWER_APERTURE_POINT_RADIUS);
      lowerPoint.setAttribute('fill', 'blue');
      lowerPoint.setAttribute('pointer-events', 'none');
      lowerPoint.setAttribute('data-aperture-type', 'lower');
      debugGroup.appendChild(lowerPoint);
    }
    
    group.appendChild(debugGroup);
  }

  getBoundingBox() {
    // (x, y) is the position of centerPoint on canvas
    // Calculate bounding box relative to centerPoint
    return {
      minX: this.x - (this.width / 2),
      maxX: this.x + (this.width / 2),
      minY: this.y - (this.height / 2),
      maxY: this.y + (this.height / 2),
      width: this.width,
      height: this.height
    };
  }

  _updateTransform(element) {
    const transforms = [];

    // Translate to position
    transforms.push(`translate(${this.x}, ${this.y})`);

    // Rotate
    transforms.push(`rotate(${this.rotation})`);

    // Scale
    transforms.push(`scale(${this.scale * (this.flipX ? -1 : 1)}, ${this.scale * (this.flipY ? -1 : 1)})`);

    element.setAttribute('transform', transforms.join(' '));
    
    // Update debug group counter-flip transform if it exists
    if (this.debugGroup) {
      const counterFlipScale = `scale(${this.flipX ? -1 : 1}, ${this.flipY ? -1 : 1})`;
      this.debugGroup.setAttribute('transform', counterFlipScale);
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

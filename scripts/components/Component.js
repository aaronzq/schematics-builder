import { components as componentLibrary } from './ComponentLibrary.js';

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

    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.scale = 1;

    this.visible = true;
    this.flipX = false;
    this.flipY = false;

    this.element = null;
    this.drawFunction = config.drawFunction;
  }

  _getAperturePoints() {
    const points = [];
    const numPoints = 2;
    
    for (let i = 0; i < numPoints; i++) {
      const t = (i / (numPoints - 1)) * 2 - 1;
      
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
    if (this.element) {
      this.element.style.display = visible ? 'block' : 'none';
      this.element.style.opacity = visible ? '1' : '0';
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

    // Draw the component-specific shape
    const shape = this.drawFunction(ns);
    group.appendChild(shape);

    // Apply position and rotation transform
    this._updateTransform(group);

    // Set visibility
    group.style.display = this.visible ? 'block' : 'none';
    group.style.opacity = this.visible ? '1' : '0';

    // Store reference
    this.element = group;

    return group;
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
  }

  _generateId() {
    return `${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

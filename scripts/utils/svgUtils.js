/**
 * SVG DOM manipulation utilities
 */

/**
 * Create SVG element with attributes
 * @param {string} tag - SVG tag name
 * @param {Object} attributes - Key-value attributes
 * @returns {SVGElement}
 */
export function createSVGElement(tag, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  });
  return element;
}

/**
 * Create SVG group element
 * @param {string} id - Element ID
 * @param {string} className - CSS class name
 * @returns {SVGElement}
 */
export function createSVGGroup(id, className = '') {
  return createSVGElement('g', { id, class: className });
}

/**
 * Create SVG circle
 * @param {number} cx - Center x
 * @param {number} cy - Center y
 * @param {number} r - Radius
 * @param {Object} style - Style attributes
 * @returns {SVGElement}
 */
export function createSVGCircle(cx, cy, r, style = {}) {
  const attrs = { cx, cy, r, ...style };
  return createSVGElement('circle', attrs);
}

/**
 * Create SVG line
 * @param {number} x1 - Start x
 * @param {number} y1 - Start y
 * @param {number} x2 - End x
 * @param {number} y2 - End y
 * @param {Object} style - Style attributes
 * @returns {SVGElement}
 */
export function createSVGLine(x1, y1, x2, y2, style = {}) {
  const attrs = { x1, y1, x2, y2, ...style };
  return createSVGElement('line', attrs);
}

/**
 * Create SVG path
 * @param {string} d - Path data
 * @param {Object} style - Style attributes
 * @returns {SVGElement}
 */
export function createSVGPath(d, style = {}) {
  const attrs = { d, ...style };
  return createSVGElement('path', attrs);
}

/**
 * Create SVG rectangle
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {Object} style - Style attributes
 * @returns {SVGElement}
 */
export function createSVGRect(x, y, width, height, style = {}) {
  const attrs = { x, y, width, height, ...style };
  return createSVGElement('rect', attrs);
}

/**
 * Create SVG polygon
 * @param {Array} points - Array of {x, y} points
 * @param {Object} style - Style attributes
 * @returns {SVGElement}
 */
export function createSVGPolygon(points, style = {}) {
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
  return createSVGElement('polygon', { points: pointsStr, ...style });
}

/**
 * Create SVG text
 * @param {string} text - Text content
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} style - Style attributes
 * @returns {SVGElement}
 */
export function createSVGText(text, x, y, style = {}) {
  const element = createSVGElement('text', { x, y, ...style });
  element.textContent = text;
  return element;
}

/**
 * Add transform to element
 * @param {SVGElement} element
 * @param {string} transform
 */
export function setTransform(element, transform) {
  element.setAttribute('transform', transform);
}

/**
 * Apply multiple transforms
 * @param {SVGElement} element
 * @param {Array} transforms - Array of transform strings
 */
export function applyTransforms(element, transforms) {
  element.setAttribute('transform', transforms.join(' '));
}

/**
 * Parse transform string
 * @param {string} transformStr
 * @returns {Object} Transform components
 */
export function parseTransform(transformStr) {
  const result = { x: 0, y: 0, rotation: 0, scale: 1, scaleX: 1, scaleY: 1 };

  const translateMatch = transformStr.match(/translate\(([^,]+),\s*([^)]+)\)/);
  if (translateMatch) {
    result.x = parseFloat(translateMatch[1]);
    result.y = parseFloat(translateMatch[2]);
  }

  const rotateMatch = transformStr.match(/rotate\(([^)]+)\)/);
  if (rotateMatch) {
    result.rotation = parseFloat(rotateMatch[1]);
  }

  const scaleMatch = transformStr.match(/scale\(([^,]+)(?:,\s*([^)]+))?\)/);
  if (scaleMatch) {
    result.scale = parseFloat(scaleMatch[1]);
    result.scaleX = parseFloat(scaleMatch[1]);
    result.scaleY = scaleMatch[2] ? parseFloat(scaleMatch[2]) : parseFloat(scaleMatch[1]);
  }

  return result;
}

/**
 * Add style attribute to element
 * @param {SVGElement} element
 * @param {Object} styles
 */
export function applyStyles(element, styles) {
  Object.entries(styles).forEach(([key, value]) => {
    element.style[key] = value;
  });
}

/**
 * Clone SVG element
 * @param {SVGElement} element
 * @returns {SVGElement}
 */
export function cloneSVGElement(element) {
  return element.cloneNode(true);
}

/**
 * Get element's bounding box
 * @param {SVGElement} element
 * @returns {Object} Bounding box {x, y, width, height}
 */
export function getBBox(element) {
  try {
    return element.getBBox();
  } catch (e) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}

/**
 * Get element's viewbox as string
 * @param {SVGElement} element
 * @returns {string}
 */
export function getViewBox(element) {
  return element.getAttribute('viewBox');
}

/**
 * Set element's viewbox
 * @param {SVGElement} element
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */
export function setViewBox(element, x, y, width, height) {
  element.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
}

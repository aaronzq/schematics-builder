/**
 * Mathematical utilities for optical schematic calculations
 */

/**
 * Calculate distance between two points
 * @param {number} x1 - First x coordinate
 * @param {number} y1 - First y coordinate
 * @param {number} x2 - Second x coordinate
 * @param {number} y2 - Second y coordinate
 * @returns {number} Distance
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points (in degrees)
 * @param {number} x1 - First x coordinate
 * @param {number} y1 - First y coordinate
 * @param {number} x2 - Second x coordinate
 * @param {number} y2 - Second y coordinate
 * @returns {number} Angle in degrees
 */
export function angleBetween(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
export function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {number} radians
 * @returns {number} Degrees
 */
export function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Snap value to nearest increment
 * @param {number} value
 * @param {number} increment
 * @returns {number}
 */
export function snap(value, increment) {
  return Math.round(value / increment) * increment;
}

/**
 * Clamp value between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Rotate point around origin
 * @param {number} x - Point x coordinate
 * @param {number} y - Point y coordinate
 * @param {number} angle - Rotation angle in degrees
 * @returns {Object} Rotated point {x, y}
 */
export function rotatePoint(x, y, angle) {
  const radians = degreesToRadians(angle);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos
  };
}

/**
 * Translate point by offset
 * @param {number} x - Point x coordinate
 * @param {number} y - Point y coordinate
 * @param {number} dx - X offset
 * @param {number} dy - Y offset
 * @returns {Object} Translated point {x, y}
 */
export function translatePoint(x, y, dx, dy) {
  return { x: x + dx, y: y + dy };
}

/**
 * Scale point from origin
 * @param {number} x - Point x coordinate
 * @param {number} y - Point y coordinate
 * @param {number} scale - Scale factor
 * @returns {Object} Scaled point {x, y}
 */
export function scalePoint(x, y, scale) {
  return { x: x * scale, y: y * scale };
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Get vector from two points
 * @param {number} x1 - First x coordinate
 * @param {number} y1 - First y coordinate
 * @param {number} x2 - Second x coordinate
 * @param {number} y2 - Second y coordinate
 * @returns {Object} Vector {x, y}
 */
export function getVector(x1, y1, x2, y2) {
  return { x: x2 - x1, y: y2 - y1 };
}

/**
 * Normalize vector
 * @param {Object} vector - Vector {x, y}
 * @returns {Object} Normalized vector {x, y}
 */
export function normalizeVector(vector) {
  const len = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: vector.x / len, y: vector.y / len };
}

/**
 * Calculate vector length
 * @param {Object} vector - Vector {x, y}
 * @returns {number}
 */
export function vectorLength(vector) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

/**
 * Dot product of two vectors
 * @param {Object} v1 - Vector {x, y}
 * @param {Object} v2 - Vector {x, y}
 * @returns {number}
 */
export function dotProduct(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y;
}

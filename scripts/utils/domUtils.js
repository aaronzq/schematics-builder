/**
 * DOM utilities for HTML manipulation
 */

/**
 * Get element by ID
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function byId(id) {
  return document.getElementById(id);
}

/**
 * Get elements by class
 * @param {string} className
 * @returns {NodeList}
 */
export function byClass(className) {
  return document.getElementsByClassName(className);
}

/**
 * Get element by query selector
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
export function select(selector) {
  return document.querySelector(selector);
}

/**
 * Get all elements by query selector
 * @param {string} selector
 * @returns {NodeList}
 */
export function selectAll(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Add event listener
 * @param {HTMLElement} element
 * @param {string} event
 * @param {Function} handler
 * @param {Object} options
 */
export function on(element, event, handler, options = {}) {
  if (!element) return;
  element.addEventListener(event, handler, options);
}

/**
 * Remove event listener
 * @param {HTMLElement} element
 * @param {string} event
 * @param {Function} handler
 */
export function off(element, event, handler) {
  if (!element) return;
  element.removeEventListener(event, handler);
}

/**
 * Add CSS class
 * @param {HTMLElement} element
 * @param {string} className
 */
export function addClass(element, className) {
  if (!element) return;
  element.classList.add(className);
}

/**
 * Remove CSS class
 * @param {HTMLElement} element
 * @param {string} className
 */
export function removeClass(element, className) {
  if (!element) return;
  element.classList.remove(className);
}

/**
 * Toggle CSS class
 * @param {HTMLElement} element
 * @param {string} className
 */
export function toggleClass(element, className) {
  if (!element) return;
  element.classList.toggle(className);
}

/**
 * Check if element has class
 * @param {HTMLElement} element
 * @param {string} className
 * @returns {boolean}
 */
export function hasClass(element, className) {
  if (!element) return false;
  return element.classList.contains(className);
}

/**
 * Set element text content
 * @param {HTMLElement} element
 * @param {string} text
 */
export function setText(element, text) {
  if (!element) return;
  element.textContent = text;
}

/**
 * Get element text content
 * @param {HTMLElement} element
 * @returns {string}
 */
export function getText(element) {
  if (!element) return '';
  return element.textContent;
}

/**
 * Set element HTML
 * @param {HTMLElement} element
 * @param {string} html
 */
export function setHTML(element, html) {
  if (!element) return;
  element.innerHTML = html;
}

/**
 * Get element HTML
 * @param {HTMLElement} element
 * @returns {string}
 */
export function getHTML(element) {
  if (!element) return '';
  return element.innerHTML;
}

/**
 * Set element attribute
 * @param {HTMLElement} element
 * @param {string} attr
 * @param {string} value
 */
export function setAttr(element, attr, value) {
  if (!element) return;
  element.setAttribute(attr, value);
}

/**
 * Get element attribute
 * @param {HTMLElement} element
 * @param {string} attr
 * @returns {string|null}
 */
export function getAttr(element, attr) {
  if (!element) return null;
  return element.getAttribute(attr);
}

/**
 * Set element value
 * @param {HTMLElement} element
 * @param {*} value
 */
export function setValue(element, value) {
  if (!element) return;
  element.value = value;
}

/**
 * Get element value
 * @param {HTMLElement} element
 * @returns {*}
 */
export function getValue(element) {
  if (!element) return '';
  return element.value;
}

/**
 * Show element
 * @param {HTMLElement} element
 */
export function show(element) {
  if (!element) return;
  element.style.display = '';
}

/**
 * Hide element
 * @param {HTMLElement} element
 */
export function hide(element) {
  if (!element) return;
  element.style.display = 'none';
}

/**
 * Toggle element visibility
 * @param {HTMLElement} element
 */
export function toggleVisibility(element) {
  if (!element) return;
  element.style.display = element.style.display === 'none' ? '' : 'none';
}

/**
 * Set element styles
 * @param {HTMLElement} element
 * @param {Object} styles
 */
export function setStyles(element, styles) {
  if (!element) return;
  Object.entries(styles).forEach(([key, value]) => {
    element.style[key] = value;
  });
}

/**
 * Get element position
 * @param {HTMLElement} element
 * @returns {Object} {top, left, right, bottom, width, height}
 */
export function getPosition(element) {
  if (!element) return {};
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Create HTML element
 * @param {string} tag
 * @param {Object} attrs
 * @param {string} text
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, text = '') {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') {
      element.className = value;
    } else if (key === 'style') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  if (text) element.textContent = text;
  return element;
}

/**
 * Append child element
 * @param {HTMLElement} parent
 * @param {HTMLElement} child
 */
export function append(parent, child) {
  if (!parent || !child) return;
  parent.appendChild(child);
}

/**
 * Remove element
 * @param {HTMLElement} element
 */
export function remove(element) {
  if (!element) return;
  element.remove();
}

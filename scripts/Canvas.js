import { componentManager } from './components/ComponentManager.js';
import {
  MIN_CANVAS_WIDTH,
  MIN_CANVAS_HEIGHT,
  CANVAS_PADDING_PERCENT,
  MIN_CANVAS_PADDING
} from './config.js';

export class CanvasManager {
  constructor() {
    this.canvas = document.getElementById('canvas');
    if (!this.canvas) {
      throw new Error('Canvas element (#canvas) not found');
    }
    
    this.currentViewBox = { x: -200, y: -150, width: 400, height: 300 };
    this.updateViewBox();
  }

  calculateComponentsBounds() {
    const components = Array.from(componentManager.components.values());
    if (components.length === 0) {
      return null;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    components.forEach(component => {
      const pos = component.getPosition();
      const scale = component.getScale();
      
      // Use actual component dimensions
      const halfWidth = (component.width / 2) * scale;
      const halfHeight = (component.height / 2) * scale;
      
      minX = Math.min(minX, pos.x - halfWidth);
      maxX = Math.max(maxX, pos.x + halfWidth);
      minY = Math.min(minY, pos.y - halfHeight);
      maxY = Math.max(maxY, pos.y + halfHeight);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  centerAllComponents() {
    const bounds = this.calculateComponentsBounds();
    
    if (!bounds) {
      // No components, set to default view
      this.currentViewBox = { x: -200, y: -150, width: 400, height: 300 };
      this.updateViewBox();
      return;
    }

    // Calculate padding
    const paddingX = Math.max(bounds.width * CANVAS_PADDING_PERCENT, MIN_CANVAS_PADDING);
    const paddingY = Math.max(bounds.height * CANVAS_PADDING_PERCENT, MIN_CANVAS_PADDING);

    // Calculate new viewBox with padding
    const viewBoxWidth = Math.max(bounds.width + 2 * paddingX, MIN_CANVAS_WIDTH);
    const viewBoxHeight = Math.max(bounds.height + 2 * paddingY, MIN_CANVAS_HEIGHT);

    // Center the viewBox on the components
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    this.currentViewBox = {
      x: centerX - viewBoxWidth / 2,
      y: centerY - viewBoxHeight / 2,
      width: viewBoxWidth,
      height: viewBoxHeight
    };

    this.updateViewBox();
  }

  updateViewBox() {
    const viewBox = `${this.currentViewBox.x} ${this.currentViewBox.y} ${this.currentViewBox.width} ${this.currentViewBox.height}`;
    this.canvas.setAttribute('viewBox', viewBox);
    
    console.log(`Canvas: Updated viewBox to ${viewBox}`);
  }

  getCurrentViewBox() {
    return { ...this.currentViewBox };
  }

  setViewBox(viewBox) {
    this.currentViewBox = { ...viewBox };
    this.updateViewBox();
  }

  fitToComponents(animate = false) {
    this.centerAllComponents();
  }

  pan(deltaX, deltaY) {
    this.currentViewBox.x += deltaX;
    this.currentViewBox.y += deltaY;
    this.updateViewBox();
  }

  zoom(zoomFactor, center = null) {
    const centerX = center ? center.x : this.currentViewBox.x + this.currentViewBox.width / 2;
    const centerY = center ? center.y : this.currentViewBox.y + this.currentViewBox.height / 2;

    const newWidth = this.currentViewBox.width / zoomFactor;
    const newHeight = this.currentViewBox.height / zoomFactor;

    this.currentViewBox.x = centerX - newWidth / 2;
    this.currentViewBox.y = centerY - newHeight / 2;
    this.currentViewBox.width = newWidth;
    this.currentViewBox.height = newHeight;

    this.updateViewBox();
  }
}

// Create singleton instance
export const canvas = new CanvasManager();

// Auto-center functionality - call this whenever components are added or moved
export function autoCenter() {
  canvas.centerAllComponents();
}
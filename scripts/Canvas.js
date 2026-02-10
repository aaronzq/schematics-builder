import { componentManager } from './components/ComponentManager.js';
import {
  MIN_CANVAS_WIDTH,
  MIN_CANVAS_HEIGHT,
  CANVAS_PADDING_PERCENT,
  MIN_CANVAS_PADDING,
  GRID_SIZE,
  GRID_EXTEND_FACTOR,
  MIN_VIEWBOX_WIDTH,
  MIN_VIEWBOX_HEIGHT,
  MAX_VIEWBOX_WIDTH,
  MAX_VIEWBOX_HEIGHT,
  INITIAL_ZOOM
} from './config.js';

export class CanvasManager {
  constructor() {
    this.canvas = document.getElementById('canvas');
    if (!this.canvas) {
      throw new Error('Canvas element (#canvas) not found');
    }
    
    this.gridGroup = document.getElementById('grid');
    if (!this.gridGroup) {
      console.warn('Grid group (#grid) not found');
    }
    
    this.gridVisible = true;
    
    // Apply initial zoom to default viewBox
    const defaultWidth = 400;
    const defaultHeight = 300;
    const zoomedWidth = defaultWidth / INITIAL_ZOOM;
    const zoomedHeight = defaultHeight / INITIAL_ZOOM;
    
    this.currentViewBox = { 
      x: -zoomedWidth / 2, 
      y: -zoomedHeight / 2, 
      width: zoomedWidth, 
      height: zoomedHeight 
    };
    this.updateViewBox();
    this.drawGrid();
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
    
    // Redraw grid when viewBox changes
    this.drawGrid();
    
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

    // Apply zoom limits by constraining the viewBox dimensions
    const clampedWidth = Math.max(MIN_VIEWBOX_WIDTH, Math.min(MAX_VIEWBOX_WIDTH, newWidth));
    const clampedHeight = Math.max(MIN_VIEWBOX_HEIGHT, Math.min(MAX_VIEWBOX_HEIGHT, newHeight));

    // Calculate actual zoom factor based on clamped dimensions
    const actualZoomFactorX = this.currentViewBox.width / clampedWidth;
    const actualZoomFactorY = this.currentViewBox.height / clampedHeight;
    const actualZoomFactor = Math.min(actualZoomFactorX, actualZoomFactorY);

    // Keep the center point fixed by adjusting the viewBox position
    // The point under the cursor should remain at the same position after zoom
    this.currentViewBox.x = centerX - (centerX - this.currentViewBox.x) / actualZoomFactor;
    this.currentViewBox.y = centerY - (centerY - this.currentViewBox.y) / actualZoomFactor;
    this.currentViewBox.width = clampedWidth;
    this.currentViewBox.height = clampedHeight;

    this.updateViewBox();
  }

  drawGrid() {
    if (!this.gridGroup) return;

    // Clear previous grid
    while (this.gridGroup.firstChild) {
      this.gridGroup.removeChild(this.gridGroup.firstChild);
    }

    // If grid is not visible, just clear and return
    if (!this.gridVisible) return;

    // Get current viewBox
    const vbX = this.currentViewBox.x;
    const vbY = this.currentViewBox.y;
    const vbWidth = this.currentViewBox.width;
    const vbHeight = this.currentViewBox.height;

    // Grid size in SVG units
    const gridSize = GRID_SIZE;
    const extend = GRID_EXTEND_FACTOR;

    // Extend grid to cover (1 + 2*extend)x the viewBox in all directions
    const gridAreaX = vbX - vbWidth * extend;
    const gridAreaY = vbY - vbHeight * extend;
    const gridAreaWidth = vbWidth * (1 + 2 * extend);
    const gridAreaHeight = vbHeight * (1 + 2 * extend);

    const firstGridX = Math.floor(gridAreaX / gridSize) * gridSize;
    const firstGridY = Math.floor(gridAreaY / gridSize) * gridSize;
    const lastGridX = Math.ceil((gridAreaX + gridAreaWidth) / gridSize) * gridSize;
    const lastGridY = Math.ceil((gridAreaY + gridAreaHeight) / gridSize) * gridSize;

    const ns = 'http://www.w3.org/2000/svg';

    // Draw vertical grid lines
    for (let x = firstGridX; x <= lastGridX; x += gridSize) {
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', gridAreaY);
      line.setAttribute('x2', x);
      line.setAttribute('y2', gridAreaY + gridAreaHeight);
      line.setAttribute('stroke', '#e0e0e0');
      line.setAttribute('stroke-width', '1');
      this.gridGroup.appendChild(line);
    }

    // Draw horizontal grid lines
    for (let y = firstGridY; y <= lastGridY; y += gridSize) {
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', gridAreaX);
      line.setAttribute('y1', y);
      line.setAttribute('x2', gridAreaX + gridAreaWidth);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#e0e0e0');
      line.setAttribute('stroke-width', '1');
      this.gridGroup.appendChild(line);
    }
  }

  toggleGrid() {
    this.gridVisible = !this.gridVisible;
    this.drawGrid();
    
    // Update button text if it exists
    const toggleBtn = document.getElementById('toggle-grid-btn');
    if (toggleBtn) {
      toggleBtn.textContent = this.gridVisible ? 'Hide Grid' : 'Show Grid';
    }
    
    return this.gridVisible;
  }

  hideGrid() {
    if (this.gridGroup) {
      this.gridGroup.style.display = 'none';
    }
  }

  showGrid() {
    if (this.gridGroup && this.gridVisible) {
      this.gridGroup.style.display = '';
    }
  }

}

// Create singleton instance
export const canvas = new CanvasManager();

// Auto-center functionality - call this whenever components are added or moved
export function autoCenter() {
  canvas.centerAllComponents();
}
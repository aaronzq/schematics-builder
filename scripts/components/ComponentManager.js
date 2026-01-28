import { Component } from './Component.js';
import { autoCenter } from '../Canvas.js';
import { showRotationHandle } from '../events/RotationHandle.js';
import { showScaleHandle } from '../events/ScaleHandle.js';
import { showArrowHandle } from '../events/ArrowHandle.js';

export class ComponentManager {
  constructor() {
    this.components = new Map();
    this.idCounter = 0;
    this.selectedId = null;
    this.nextPosition = { x: 0, y: 0 };
  }

  addComponent(type, position = null) {
    const id = this.idCounter++;
    const component = new Component(type);
    
    // Set position (use provided or default)
    const pos = position || this.nextPosition;
    
    // Compensate for centerPoint offset so the actual centerPoint lands at the desired position
    const centerPoint = component.centerPoint || { x: 0, y: 0 };
    component.setPosition(pos.x - centerPoint.x, pos.y - centerPoint.y);
    
    // Align new component's forward vector with the previously selected component's arrow vector
    if (this.selectedId !== null) {
      const previousComponent = this.components.get(this.selectedId);
      if (previousComponent) {
        const arrowVector = previousComponent.getArrowVector();
        // Calculate angle from arrow vector
        const angle = Math.atan2(arrowVector.y, arrowVector.x) * 180 / Math.PI;
        component.setRotation(angle);
        
        // Update arrow vector to follow the rotated forward vector
        const angleRad = angle * Math.PI / 180;
        const arrowLength = Math.sqrt(component.arrowVector.x ** 2 + component.arrowVector.y ** 2);
        component.setArrowVector(
          Math.cos(angleRad) * arrowLength,
          Math.sin(angleRad) * arrowLength
        );
      }
    }
    
    const group = component.render();
    group.setAttribute('data-id', id);
    const schematics = document.getElementById("schematics");
    if (!schematics) {
      throw new Error('Components group (#schematics) not found in canvas');
    }
    schematics.appendChild(group);

    this.components.set(id, component);
    
    console.log(`ComponentManager: Added ${type} [ID: ${id}] at (${pos.x}, ${pos.y})`);
    
    // Select the newly added component
    this.selectComponent(id);
    showRotationHandle(id);
    showScaleHandle(id);
    showArrowHandle(id);
    // Auto-center the canvas to show all components
    autoCenter();
    
    return { id, component };
  }

  selectComponent(id) {
    if (this.selectedId !== null) {
      const prevElement = document.querySelector(`[data-id="${this.selectedId}"]`);
      if (prevElement) {
        prevElement.classList.remove('selected');
      }
    }

    this.selectedId = id;
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.classList.add('selected');
    }

    // Update nextPosition to arrow tip
    this.updateNextPositionFromComponent(id);

    console.log(`Selected component [ID: ${id}]`);
  }

  deselectComponent() {
    if (this.selectedId !== null) {
      const prevElement = document.querySelector(`[data-id="${this.selectedId}"]`);
      if (prevElement) {
        prevElement.classList.remove('selected');
      }
      console.log(`Deselected component [ID: ${this.selectedId}]`);
      this.selectedId = null;
    }
  }

  getSelectedComponent() {
    if (this.selectedId === null) return null;
    const component = this.components.get(this.selectedId);
    return component ? { id: this.selectedId, component } : null;
  }

  getComponent(id) {
    return this.components.get(id);
  }

  updateComponentPosition(id, x, y) {
    const component = this.components.get(id);
    if (!component) return false;

    component.setPosition(x, y);

    console.log(`Updated position of component [ID: ${id}] to (${x}, ${y})`);

    // // Auto-center the canvas to show all components
    // autoCenter();

    return true;
  }

  updateComponentRotation(id, angle) {
    const component = this.components.get(id);
    if (!component) return false;

    component.setRotation(angle);

    console.log(`Updated rotation of component [ID: ${id}] to ${angle} degrees`);

    return true;
  }

  updateComponentScale(id, scale) {
    const component = this.components.get(id);
    if (!component) return false;

    component.setScale(scale);

    console.log(`Updated scale of component [ID: ${id}] to ${scale}`);

    return true;
  }

  updateNextPositionFromComponent(id) {
    const component = this.components.get(id);
    if (!component) return false;

    const endpoint = component.getArrowEndpoint();
    this.nextPosition = { x: endpoint.x, y: endpoint.y };

    console.log(`Next position updated to arrow tip: (${endpoint.x}, ${endpoint.y})`);

    return true;
  }

  deleteComponent(id) {
    const component = this.components.get(id);
    if (!component) return false;

    // Remove from DOM
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.remove();
    }

    // Remove from components map
    this.components.delete(id);

    // Deselect if this was the selected component
    if (this.selectedId === id) {
      this.selectedId = null;
    }

    console.log(`Deleted component [ID: ${id}]`);

    return true;
  }

  flipComponentHorizontal(id) {
    const component = this.components.get(id);
    if (!component) return false;

    component.flipHorizontal();

    console.log(`Flipped component [ID: ${id}] horizontally`);

    return true;
  }

  flipComponentVertical(id) {
    const component = this.components.get(id);
    if (!component) return false;

    component.flipVertical();

    console.log(`Flipped component [ID: ${id}] vertically`);

    return true;
  }

  hideComponent(id) {
    const component = this.components.get(id);
    if (!component) return false;

    component.setVisible(false);

    console.log(`Hid component [ID: ${id}]`);

    return true;
  }

  showComponent(id) {
    const component = this.components.get(id);
    if (!component) return false;

    component.setVisible(true);

    console.log(`Showed component [ID: ${id}]`);

    return true;
  }

  showAllComponents() {
    let count = 0;
    this.components.forEach((component, id) => {
      component.setVisible(true);
      count++;
    });

    console.log(`Showed all components (${count} total)`);

    return count;
  }

}

// Create singleton instance
export const componentManager = new ComponentManager();


import { Component } from './Component.js';
import { autoCenter } from '../Canvas.js';
import { showRotationHandle } from '../events/RotationHandle.js';
import { showScaleHandle } from '../events/ScaleHandle.js';
import { showArrowHandle } from '../events/ArrowHandle.js';

export class ComponentManager {
  constructor() {
    this.components = new Map();
    this.idCounter = 0;
    this.selectedIds = new Set();
    this.nextPosition = { x: 0, y: 0 };
    this.ignoreNextCanvasClick = false;
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
    if (this.selectedIds.size > 0) {
      const previousId = Array.from(this.selectedIds)[0];
      const previousComponent = this.components.get(previousId);
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
        
        // Set up parent-child relationship
        component.parent = previousId;
        previousComponent.children.push(id);
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
    // Clear previous selections
    this.selectedIds.forEach(prevId => {
      const prevElement = document.querySelector(`[data-id="${prevId}"]`);
      if (prevElement) {
        prevElement.classList.remove('selected');
      }
    });
    this.selectedIds.clear();

    // Set new selection
    this.selectedIds.add(id);
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.classList.add('selected');
    }

    // Check if this component is grouped and auto-select all group members
    const component = this.components.get(id);
    if (component && component.isGrouped && component.groupMembers.size > 0) {
      this.selectMultiple([id, ...component.groupMembers]);
    }

    // Update nextPosition to arrow tip
    this.updateNextPositionFromComponent(id);

    // Log component information
    if (component) {
      console.log(`   Selected component [ID: ${id}]`);
      console.log(`   Type: ${component.type}`);
      console.log(`   Position: (${component.x.toFixed(1)}, ${component.y.toFixed(1)})`);
      console.log(`   Rotation: ${component.rotation.toFixed(1)}°`);
      console.log(`   Scale: ${component.scale.toFixed(2)}X`);
      console.log(`   Parent: ${component.parent !== null ? component.parent : 'none'}`);
      console.log(`   Children: ${component.children.length > 0 ? '[' + component.children.join(', ') + ']' : 'none'}`);
      if (component.isGrouped) {
        console.log(`   Group members: [${Array.from(component.groupMembers).join(', ')}]`);
      }
    }
  }

  deselectComponent() {
    if (this.selectedIds.size === 0) return;
    
    // Deselect all selected components
    this.selectedIds.forEach(id => {
      const element = document.querySelector(`[data-id="${id}"]`);
      if (element) {
        element.classList.remove('selected');
      }
    });
    
    const idsArray = Array.from(this.selectedIds);
    if (idsArray.length === 1) {
      console.log(`Deselected component [ID: ${idsArray[0]}]`);
    } else {
      console.log(`Deselected multiple components: [${idsArray.join(', ')}]`);
    }
    
    this.selectedIds.clear();
  }

  getSelectedComponent() {
    if (this.selectedIds.size === 0) return null;
    const id = Array.from(this.selectedIds)[0];
    const component = this.components.get(id);
    return component ? { id, component } : null;
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

    // Remove from parent's children array
    if (component.parent !== null) {
      const parentComponent = this.components.get(component.parent);
      if (parentComponent) {
        const index = parentComponent.children.indexOf(id);
        if (index > -1) {
          parentComponent.children.splice(index, 1);
        }
      }
    }

    // Update children to have no parent
    component.children.forEach(childId => {
      const childComponent = this.components.get(childId);
      if (childComponent) {
        childComponent.parent = null;
      }
    });

    // Remove from DOM
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.remove();
    }

    // Remove from components map
    this.components.delete(id);

    // Remove from selection if selected
    this.selectedIds.delete(id);

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

  // Multi-selection methods
  selectMultiple(ids) {
    // Clear previous selections
    this.selectedIds.forEach(id => {
      const element = document.querySelector(`[data-id="${id}"]`);
      if (element) {
        element.classList.remove('selected');
      }
    });

    // Set new selections
    this.selectedIds = new Set(ids);
    this.selectedIds.forEach(id => {
      const element = document.querySelector(`[data-id="${id}"]`);
      if (element) {
        element.classList.add('selected');
      }
    });

    console.log(`Selected multiple components: [${Array.from(this.selectedIds).join(', ')}]`);
  }

  addToSelection(id) {
    this.selectedIds.add(id);
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.classList.add('selected');
    }

    console.log(`Added component [ID: ${id}] to selection`);
  }

  removeFromSelection(id) {
    this.selectedIds.delete(id);
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.classList.remove('selected');
    }

    console.log(`Removed component [ID: ${id}] from selection`);
  }

  getSelectedComponents() {
    const selected = [];
    this.selectedIds.forEach(id => {
      const component = this.components.get(id);
      if (component) {
        selected.push({ id, component });
      }
    });
    return selected;
  }

  createGroup() {
    if (this.selectedIds.size < 2) {
      console.log('Need at least 2 components selected to create a group');
      return false;
    }

    const memberIds = Array.from(this.selectedIds);
    
    // Set group relationships on all selected components
    memberIds.forEach(id => {
      const component = this.components.get(id);
      if (component) {
        // Each component stores all other members (excluding itself)
        const otherMembers = memberIds.filter(memberId => memberId !== id);
        component.setGroupMembers(otherMembers);
      }
    });

    console.log(`Created group with components: [${memberIds.join(', ')}]`);
    return true;
  }

  ungroupComponents() {
    if (this.selectedIds.size === 0) {
      console.log('No components selected to ungroup');
      return false;
    }

    let ungroupedCount = 0;
    this.selectedIds.forEach(id => {
      const component = this.components.get(id);
      if (component && component.isGrouped) {
        // Collect all group members before clearing
        const allGroupMembers = new Set([id, ...component.groupMembers]);
        
        // Clear group for this component and all its group members
        allGroupMembers.forEach(memberId => {
          const memberComponent = this.components.get(memberId);
          if (memberComponent && memberComponent.isGrouped) {
            memberComponent.clearGroup();
            ungroupedCount++;
          }
        });
      }
    });

    console.log(`Ungrouped ${ungroupedCount} component(s)`);
    return ungroupedCount > 0;
  }

}

// Create singleton instance
export const componentManager = new ComponentManager();


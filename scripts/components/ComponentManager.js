import { Component } from './Component.js';

export class ComponentManager {
  constructor() {
    // this.components = new Map();
    this.idCounter = 0;
    this.selectedId = null;
    this.nextPosition = { x: 400, y: 300 };
  }

  addComponent(type, position = null) {
    const id = this.idCounter++;
    const component = new Component(type);
    
    // Set position (use provided or default)
    const pos = position || this.nextPosition;
    
    // Compensate for centerPoint offset so the actual centerPoint lands at the desired position
    const centerPoint = component.centerPoint || { x: 0, y: 0 };
    component.setPosition(pos.x - centerPoint.x, pos.y - centerPoint.y);
    
    const group = component.render();
    group.setAttribute('data-id', id);
    const schematics = document.getElementById("schematics");
    if (!schematics) {
      throw new Error('Components group (#schematics) not found in canvas');
    }
    schematics.appendChild(group);


    // Store component
    // this.components.set(id, component);
    
    console.log(`✅ ComponentManager: Added ${type} [ID: ${id}] at (${pos.x}, ${pos.y})`);
    
    return { id, component };
  }

}

// Create singleton instance
export const componentManager = new ComponentManager();


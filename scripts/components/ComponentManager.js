import { Component } from './Component.js';
import { components as componentRegistry } from './ComponentLibrary.js';
import { autoCenter } from '../Canvas.js';
import { showRotationHandle, removeRotationHandle } from '../events/RotationHandle.js';
import { showScaleHandle, removeScaleHandle } from '../events/ScaleHandle.js';
import { showArrowHandle } from '../events/ArrowHandle.js';
import { showUnifiedBoundingBox, removeUnifiedBoundingBox } from '../events/InteractionHandlers.js';
import { updateToolbarButtons } from '../events/ButtonHandlers.js';
import { applyApertureScaling } from '../rays/ApertureScaling.js';
import { updateRays } from '../rays/DrawRays.js';
import { refreshDebugForComponent, removeDebugForComponent, refreshDebugLayer } from '../utils/DebugLayer.js';

export class ComponentManager {
  /** Optional callback: (component | null) => void. Registered by RayMenu. */
  static onSelectionChanged = null;

  constructor() {
    this.components = new Map();
    this.idCounter = 0;
    this.compositeInstanceCounter = 0;
    this.currentId = null;
    this.selectedIds = new Set();
    this.nextPosition = { x: 0, y: 0 };
    this.ignoreNextCanvasClick = false;
  }

  addComponent(type, position = null) {

    // If it's a composite definition, expand it instead of creating a single component
    const def = componentRegistry[type];
    if (def && def.isComposite) {
      const spawnPos = position || this.nextPosition;
      const externalParentId = this.currentId;
      this._expandComposite(def, spawnPos, externalParentId);
      return;
    }

    const id = this.idCounter++;
    const component = new Component(type);
    
    // Set position (use provided or default).
    // (x, y) is now the world position of the component's centerPoint,
    // so no offset compensation is needed.
    const pos = position || this.nextPosition;
    component.setPosition(pos.x, pos.y);
    
    // Align new component's forward vector with the previously selected component's arrow vector
    const previousId = this.currentId;
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

      // Inherit color from parent if the flag is set (default true)
      if (component.rayColorInheritFromParent ?? true) {
        component.rayPolygonColor   = previousComponent.rayPolygonColor;
        component.rayPolygonOpacity = previousComponent.rayPolygonOpacity;
      }

      // Scale aperture to match parent projection at spawn time
      applyApertureScaling(component, previousComponent);
    }
    
    
    const group = component.render();
    group.setAttribute('data-id', id);
    const schematics = document.getElementById("schematics");
    if (!schematics) {
      throw new Error('Components group (#schematics) not found in canvas');
    }
    schematics.appendChild(group);

    this.components.set(id, component);
    
    // Build debug overlay for the new component
    refreshDebugForComponent(component);
    
    console.log(`ComponentManager: Added ${type} [ID: ${id}] at (${pos.x}, ${pos.y})`);
    
    // Select the newly added component
    this.selectComponent(id);
    showRotationHandle(id);
    showScaleHandle(id);
    showArrowHandle(id);
    // Auto-center the canvas to show all components
    autoCenter();
    removeUnifiedBoundingBox();
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
      // Use selectMultiple which now handles group expansion logic automatically
      this.selectMultiple([id]);
    }

    // Update nextPosition to arrow tip
    this.currentId = id;
    this.updateNextPositionFromComponent(id);

    // Composite: resolve currentId to the exit port of the SAME composite instance.
    // Only applies if the clicked component itself is a composite member.
    // Non-composite components grouped with a composite remain their own currentId.
    if (component && component.isCompositeInstance && component.compositeInstanceId != null) {
      const instId = component.compositeInstanceId;
      // Check the component itself first
      if (component.isExitPort) {
        // Already the exit port — keep currentId as is
      } else {
        // Search group members for the exit port of the same instance
        for (const memberId of (component.groupMembers || [])) {
          const member = this.components.get(memberId);
          if (member && member.isExitPort && member.compositeInstanceId === instId) {
            this.currentId = memberId;
            this.updateNextPositionFromComponent(memberId);
            break;
          }
        }
      }
    }

    // Log component information
    if (component) {
      console.log(`================`);
      console.log(`   Selected component [${Array.from(this.selectedIds).join(', ')}]`);
      console.log(`   Current ID: ${this.currentId}`);
      console.log(`   Type: ${component.type}`);
      console.log(`   Position: (${component.x.toFixed(1)}, ${component.y.toFixed(1)})`);
      console.log(`   Rotation: ${component.rotation.toFixed(1)}°`);
      console.log(`   Scale: ${component.scale.toFixed(2)}X`);
      console.log(`   Parent: ${component.parent !== null ? component.parent : 'none'}`);
      console.log(`   Children: ${component.children.length > 0 ? '[' + component.children.join(', ') + ']' : 'none'}`);
      console.log(`   Aperture: radius=${component.apertureRadius}, offset=${component.apertureCenterOffset}, shape=${component.rayShape}, coneAngle=${component.coneAngle}°`);
      if (component.rayShape === 'array') {
        console.log(`   Array: segments=${component.arraySegments}, gap=${component.arrayGap?.toFixed(2)}`);
      }
      if (component.isGrouped) {
        console.log(`   Group members: [${Array.from(component.groupMembers).join(', ')}]`);
      }
    }
    
    // Update toolbar button visibility
    updateToolbarButtons();

    // Notify ray panel — always pass the entry port when a composite member is selected
    if (ComponentManager.onSelectionChanged) {
      const rayTarget = this.getCompositeEntryPort(component ?? null);
      ComponentManager.onSelectionChanged(rayTarget ?? null);
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
    
    // Update toolbar button visibility
    updateToolbarButtons();

    // Notify ray panel
    if (ComponentManager.onSelectionChanged) {
      ComponentManager.onSelectionChanged(null);
    }
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

    // Rotate arrowVector by the delta angle so the spawn arrow follows the component
    const prevAngle = component.getRotation();
    const deltaRad = (angle - prevAngle) * Math.PI / 180;
    const cos = Math.cos(deltaRad);
    const sin = Math.sin(deltaRad);
    const av = component.getArrowVector();
    component.setArrowVector(
      av.x * cos - av.y * sin,
      av.x * sin + av.y * cos
    );

    component.setRotation(angle);

    // Keep nextPosition in sync so the next spawned component lands at the arrow tip
    if (this.currentId === id) {
      this.updateNextPositionFromComponent(id);
    }

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

    // Remove debug overlay elements (use component.id, not the map key)
    removeDebugForComponent(component.id);

    // Remove from DOM
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.remove();
    }

    // Remove from components map
    this.components.delete(id);

    // Remove from selection if selected
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
      updateToolbarButtons();
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

  hideComponent(id = null) {
    // If no id provided, hide all selected components
    if (id === null) {
      if (this.selectedIds.size === 0) return false;
      
      let count = 0;
      this.selectedIds.forEach(selectedId => {
        const component = this.components.get(selectedId);
        if (component) {
          component.setVisible(false);
          count++;
        }
      });
      
      console.log(`Hid ${count} component(s): [${Array.from(this.selectedIds).join(', ')}]`);
      return count > 0;
    }
    
    // Hide specific component
    const component = this.components.get(id);
    if (!component) return false;

    component.setVisible(false);

    console.log(`Hid component [ID: ${id}]`);

    return true;
  }

  showComponent(id = null) {
    // If no id provided, show all selected components
    if (id === null) {
      if (this.selectedIds.size === 0) return false;
      
      let count = 0;
      this.selectedIds.forEach(selectedId => {
        const component = this.components.get(selectedId);
        if (component) {
          component.setVisible(true);
          count++;
        }
      });
      
      console.log(`Showed ${count} component(s): [${Array.from(this.selectedIds).join(', ')}]`);
      return count > 0;
    }
    
    // Show specific component
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

    // Expand selection to include groups for any selected component
    const expandedIds = new Set(ids);
    ids.forEach(id => {
      const component = this.components.get(id);
      if (component && component.isGrouped) {
        // Add all group members to the selection
        component.groupMembers.forEach(memberId => expandedIds.add(memberId));
      }
    });

    // Set new selections
    this.selectedIds = expandedIds;
    this.selectedIds.forEach(id => {
      const element = document.querySelector(`[data-id="${id}"]`);
      if (element) {
        element.classList.add('selected');
      }
    });

    console.log(`Selected multiple components: [${Array.from(this.selectedIds).join(', ')}]`);
    
    // Update toolbar button visibility
    updateToolbarButtons();
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

  // Multi-selection group transformation methods
  getGroupCentroid(ids) {
    const idsArray = Array.isArray(ids) ? ids : Array.from(ids);
    if (idsArray.length === 0) return { x: 0, y: 0 };

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let count = 0;

    idsArray.forEach(id => {
      const component = this.components.get(id);
      if (component) {
        const { x, y } = component.getPosition();
        const { width, height } = component;
        const rotation = component.getRotation() * Math.PI / 180;
        const scale = component.getScale();
        const cx = component.centerPoint?.x ?? 0;
        const cy = component.centerPoint?.y ?? 0;
        // Use localBounds for actual visual extent (matches _localToWorld transform chain)
        const lb = component.localBounds ?? {
          minX: -width / 2, maxX: width / 2,
          minY: -height / 2, maxY: height / 2
        };

        const corners = [
          { x: lb.minX, y: lb.minY },
          { x: lb.maxX, y: lb.minY },
          { x: lb.maxX, y: lb.maxY },
          { x: lb.minX, y: lb.maxY }
        ];

        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const fm = component._getFlipMatrix();

        corners.forEach(corner => {
          const dx = corner.x - cx;
          const dy = corner.y - cy;
          const lx = (fm.a * dx + fm.c * dy) * scale;
          const ly = (fm.b * dx + fm.d * dy) * scale;
          const worldX = x + (lx * cos - ly * sin);
          const worldY = y + (lx * sin + ly * cos);

          minX = Math.min(minX, worldX);
          maxX = Math.max(maxX, worldX);
          minY = Math.min(minY, worldY);
          maxY = Math.max(maxY, worldY);
        });

        count++;
      }
    });

    return count > 0 ? { x: (minX + maxX) / 2, y: (minY + maxY) / 2 } : { x: 0, y: 0 };
  }

  /**
   * Get initial states for all components in a group
   */
  getGroupInitialStates(ids) {
    const idsArray = Array.isArray(ids) ? ids : Array.from(ids);
    const states = new Map();

    idsArray.forEach(id => {
      const component = this.components.get(id);
      if (component) {
        const pos = component.getPosition();
        const av = component.getArrowVector();
        states.set(id, {
          x: pos.x,
          y: pos.y,
          rotation: component.getRotation(),
          scale: component.getScale(),
          arrowVector: { x: av.x, y: av.y }
        });
      }
    });

    return states;
  }

  /**
   * Update positions of multiple components by the same delta
   */
  updateGroupPositions(ids, deltaX, deltaY) {
    const idsArray = Array.isArray(ids) ? ids : Array.from(ids);
    
    idsArray.forEach(id => {
      const component = this.components.get(id);
      if (component) {
        const pos = component.getPosition();
        component.setPosition(pos.x + deltaX, pos.y + deltaY);
      }
    });
  }

  /**
   * Rotate multiple components around a centroid
   */
  updateGroupRotation(ids, centroid, angle, initialStates) {
    const idsArray = Array.isArray(ids) ? ids : Array.from(ids);
    
    const angleRad = angle * Math.PI / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    idsArray.forEach(id => {
      const component = this.components.get(id);
      const initialState = initialStates.get(id);
      if (component && initialState) {
        // Calculate initial angle from centroid
        const initialDx = initialState.x - centroid.x;
        const initialDy = initialState.y - centroid.y;
        const initialAngle = Math.atan2(initialDy, initialDx);
        const distance = Math.sqrt(initialDx * initialDx + initialDy * initialDy);
        
        // Calculate new position
        const newX = centroid.x + distance * Math.cos(initialAngle + angleRad);
        const newY = centroid.y + distance * Math.sin(initialAngle + angleRad);
        
        // Update position
        component.setPosition(newX, newY);
        
        // Update rotation
        const newRotation = initialState.rotation + angle;
        component.setRotation(newRotation);

        // Rotate arrowVector from its initial direction by the cumulative angle
        const av = initialState.arrowVector;
        if (av) {
          component.setArrowVector(
            av.x * cos - av.y * sin,
            av.x * sin + av.y * cos
          );
        }
      }
    });

    // Keep nextPosition in sync with the current exit port after group rotation
    if (this.currentId != null) {
      this.updateNextPositionFromComponent(this.currentId);
    }
  }

  /**
   * Scale multiple components around a centroid
   */
  updateGroupScale(ids, centroid, scaleFactor, initialStates) {
    const idsArray = Array.isArray(ids) ? ids : Array.from(ids);
    
    idsArray.forEach(id => {
      const component = this.components.get(id);
      const initialState = initialStates.get(id);
      if (component && initialState) {
        // Calculate initial distance from centroid
        const initialDx = initialState.x - centroid.x;
        const initialDy = initialState.y - centroid.y;
        
        // Calculate new position (scale distance from centroid)
        const newX = centroid.x + initialDx * scaleFactor;
        const newY = centroid.y + initialDy * scaleFactor;
        
        // Update position
        component.setPosition(newX, newY);
        
        // Update component's own scale
        const newScale = initialState.scale * scaleFactor;
        component.setScale(newScale);
      }
    });
  }

  /**
   * Expand a composite definition into individual Component instances,
   * group them together, wire parent-child relationships, and select them.
   *
   * @param {object} def             - Composite definition from the registry
   * @param {{x:number,y:number}} spawnPos - World position of the composite origin
   * @param {number|null} externalParentId - ID of the component upstream of this composite
   */
  _expandComposite(def, spawnPos, externalParentId) {
    const schematics = document.getElementById('schematics');
    if (!schematics) {
      throw new Error('Components group (#schematics) not found in canvas');
    }

    const compositeInstId = ++this.compositeInstanceCounter;
    const spawnedIds = [];   // parallel array matching def.members indices
    const spawnedComponents = [];

    // Offset so the entry port member lands exactly on the spawn position
    const entryMember = def.members[def.entryMemberIndex];
    const entryOffsetX = entryMember.relX ?? 0;
    const entryOffsetY = entryMember.relY ?? 0;

    // Compute delta rotation to align entry port's forward vector with the spawning arrow
    let deltaAngle = 0;
    if (externalParentId !== null && externalParentId !== undefined) {
      const externalParent = this.components.get(externalParentId);
      if (externalParent) {
        const arrowVec = externalParent.getArrowVector();
        const spawnAngle = Math.atan2(arrowVec.y, arrowVec.x) * 180 / Math.PI;
        const entryAngle = entryMember.rotation ?? 0;
        deltaAngle = spawnAngle - entryAngle;
      }
    }
    const deltaRad = deltaAngle * Math.PI / 180;
    const cosDelta = Math.cos(deltaRad);
    const sinDelta = Math.sin(deltaRad);

    // --- Pass 1: create and render all member components ---
    def.members.forEach((member, index) => {
      const id = this.idCounter++;
      const component = new Component(member.type);

      // Rotate relative offset by deltaAngle so the whole composite rotates around the entry port
      const dx = (member.relX ?? 0) - entryOffsetX;
      const dy = (member.relY ?? 0) - entryOffsetY;
      const rotatedDx = dx * cosDelta - dy * sinDelta;
      const rotatedDy = dx * sinDelta + dy * cosDelta;

      // Position: entry port at spawn origin, others relative to it
      component.setPosition(
        spawnPos.x + rotatedDx,
        spawnPos.y + rotatedDy
      );

      // Apply rotation (definition rotation + delta to align with spawning arrow)
      const finalRotation = (member.rotation ?? 0) + deltaAngle;
      component.setRotation(finalRotation);
      component.setScale(member.scale ?? 1);

      // Apply composite instance flags
      component.isCompositeInstance = true;
      component.compositeKey = def.key;
      component.compositeInstanceId = compositeInstId;

      // Restore display properties
      component.rayPolygonColor   = member.rayPolygonColor   ?? '#00ffff';
      component.rayPolygonOpacity = member.rayPolygonOpacity ?? 0.2;
      component.rayColorInheritFromParent = member.rayColorInheritFromParent ?? true;
      component.coneAngle         = member.coneAngle         ?? 0;

      // Restore upVector so aperturePoints orientation matches the saved layout.
      // upVector is in local space — the component's rotation handles world-space orientation,
      // so it must NOT be rotated by deltaAngle.
      // Must be set before calling any aperture setter.
      if (member.upVector) {
        component.upVector = { x: member.upVector.x, y: member.upVector.y };
      }

      // Update arrowVector to point in the final forward direction.
      // Must always be set — not just when deltaAngle != 0 — because the default
      // arrowVector is (ARROW_LENGTH, 0) and would be wrong for any member whose
      // finalRotation differs from 0.
      {
        const finalRad = finalRotation * Math.PI / 180;
        const arrowLen = Math.sqrt(component.arrowVector.x ** 2 + component.arrowVector.y ** 2);
        component.setArrowVector(Math.cos(finalRad) * arrowLen, Math.sin(finalRad) * arrowLen);
      }

      // Set rayShape first (plain assignment, just a string flag),
      // then use setters so _getAperturePoints() is always recomputed
      // with the correct shape, radius, offset, and array params.
      component.rayShape = member.rayShape ?? 'collimated';
      if (member.arraySegments != null) component.setArraySegments(member.arraySegments);
      if (member.arrayGap      != null) component.setArrayGap(member.arrayGap);
      component.setApertureRadius(member.apertureRadius ?? 15);
      if (member.apertureCenterOffset != null) component.setApertureCenterOffset(member.apertureCenterOffset);

      // Render to SVG
      const group = component.render();
      group.setAttribute('data-id', id);
      schematics.appendChild(group);

      this.components.set(id, component);
      spawnedIds.push(id);
      spawnedComponents.push(component);

      console.log(`ComponentManager: [Composite "${def.key}"] spawned member ${index} (${member.type}) [ID: ${id}]`);
    });

    // --- Pass 2: wire internal parent-child relationships ---
    def.members.forEach((member, index) => {
      if (member.internalParentIndex !== null && member.internalParentIndex !== undefined) {
        const parentId = spawnedIds[member.internalParentIndex];
        const parentComponent = spawnedComponents[member.internalParentIndex];
        const childId = spawnedIds[index];
        const childComponent = spawnedComponents[index];

        childComponent.parent = parentId;
        parentComponent.children.push(childId);
      }
    });

    // --- Wire entry port to external parent ---
    if (externalParentId !== null && externalParentId !== undefined) {
      const externalParent = this.components.get(externalParentId);
      const entryComponent = spawnedComponents[def.entryMemberIndex];
      const entryId = spawnedIds[def.entryMemberIndex];
      if (externalParent && entryComponent) {
        entryComponent.parent = externalParentId;
        externalParent.children.push(entryId);
      }
    }

    // --- Mark entry / exit ports ---
    spawnedComponents[def.entryMemberIndex].isEntryPort = true;
    spawnedComponents[def.exitMemberIndex].isExitPort = true;

    // --- Propagate external parent color into the composite at spawn time ---
    // If the entry port opts in to color inheritance and there is an external parent,
    // copy the parent's color/opacity into the entry port and cascade down the chain.
    const entryComp = spawnedComponents[def.entryMemberIndex];
    if (entryComp.rayColorInheritFromParent && externalParentId != null) {
      const extParent = this.components.get(externalParentId);
      if (extParent) {
        entryComp.rayPolygonColor   = extParent.rayPolygonColor;
        entryComp.rayPolygonOpacity = extParent.rayPolygonOpacity;
        // Cascade to downstream composite members that also opt in
        const propagate = (comp) => {
          for (const childId of comp.children) {
            const child = this.components.get(childId);
            if (!child || !child.isCompositeInstance ||
                child.compositeInstanceId !== comp.compositeInstanceId) continue;
            if (child.rayColorInheritFromParent ?? true) {
              child.rayPolygonColor   = comp.rayPolygonColor;
              child.rayPolygonOpacity = comp.rayPolygonOpacity;
              propagate(child);
            }
          }
        };
        propagate(entryComp);
      }
    }

    // --- Group all spawned members together ---
    spawnedIds.forEach(id => {
      const component = this.components.get(id);
      if (component) {
        const otherIds = spawnedIds.filter(otherId => otherId !== id);
        component.setGroupMembers(otherIds);
      }
    });

    // --- Select and set currentId to exit port ---
    const exitPortId = spawnedIds[def.exitMemberIndex];
    this.selectMultiple(spawnedIds);
    this.currentId = exitPortId;
    this.updateNextPositionFromComponent(exitPortId);

    // Show handles on the exit port
    showRotationHandle(exitPortId);
    showScaleHandle(exitPortId);
    showArrowHandle(exitPortId);

    autoCenter();
    removeUnifiedBoundingBox();
    updateRays();
    refreshDebugLayer();

    console.log(`ComponentManager: Composite "${def.key}" expanded — ${spawnedIds.length} members, exit port ID: ${exitPortId}`);
  }

  /**
   * Group selected components together
   */
  groupSelectedComponents() {
    const selectedIds = Array.from(this.selectedIds);
    if (selectedIds.length < 2) {
      console.log('Cannot group: need at least 2 components selected');
      return false;
    }

    // Set group relationship for all selected components
    selectedIds.forEach(id => {
      const component = this.components.get(id);
      if (component) {
        const otherIds = selectedIds.filter(otherId => otherId !== id);
        component.setGroupMembers(otherIds);
      }
    });

    console.log(`Grouped ${selectedIds.length} components: [${selectedIds.join(', ')}]`);
    return true;
  }

  /**
   * Ungroup all components in the group containing the selected component(s)
   */
  ungroupSelectedComponents() {
    const selectedIds = Array.from(this.selectedIds);
    const groupedIds = new Set();

    // Collect all components in any group that contains a selected component
    selectedIds.forEach(id => {
      const component = this.components.get(id);
      if (component && component.isGrouped) {
        groupedIds.add(id);
        component.groupMembers.forEach(memberId => groupedIds.add(memberId));
      }
    });

    if (groupedIds.size === 0) {
      console.log('No grouped components to ungroup');
      return false;
    }

    // --- Selective ungroup: each composite instance stays grouped internally ---
    // Partition into composite members (by instance) and non-composite members
    const compositeInstanceMap = new Map(); // compositeInstanceId → Set<id>
    const nonCompositeIds = new Set();
    groupedIds.forEach(id => {
      const comp = this.components.get(id);
      if (comp && comp.isCompositeInstance && comp.compositeInstanceId != null) {
        if (!compositeInstanceMap.has(comp.compositeInstanceId)) {
          compositeInstanceMap.set(comp.compositeInstanceId, new Set());
        }
        compositeInstanceMap.get(comp.compositeInstanceId).add(id);
      } else {
        nonCompositeIds.add(id);
      }
    });

    // If there is only ONE composite instance and NO non-composite members,
    // this is a single atomic composite — nothing to ungroup.
    if (nonCompositeIds.size === 0 && compositeInstanceMap.size <= 1) {
      console.warn('[ComponentManager] Cannot ungroup a single composite component — it is an atomic unit.');
      return false;
    }

    // Clear group on all non-composite members
    nonCompositeIds.forEach(id => {
      const comp = this.components.get(id);
      if (comp) comp.clearGroup();
    });

    // Rebuild each composite instance's group sets so they only reference
    // members of the SAME instance (removing cross-instance links).
    compositeInstanceMap.forEach((instanceIds) => {
      instanceIds.forEach(id => {
        const comp = this.components.get(id);
        if (comp) {
          const internalMembers = [...instanceIds].filter(otherId => otherId !== id);
          if (internalMembers.length > 0) {
            comp.setGroupMembers(internalMembers);
          } else {
            comp.clearGroup();
          }
        }
      });
    });

    // Remove group UI elements
    removeUnifiedBoundingBox();
    removeRotationHandle();
    removeScaleHandle();

    // Preserve currentId if it exists, otherwise clear selection
    const preservedCurrentId = this.currentId;

    // Clear all selections
    this.selectedIds.forEach(id => {
      const element = document.querySelector(`[data-id="${id}"]`);
      if (element) {
        element.classList.remove('selected');
      }
    });
    this.selectedIds.clear();

    // If there was a currentId, restore it as single selection (Mode 1)
    // For composite exit ports, selectComponent() will re-expand group naturally
    if (preservedCurrentId !== null && this.components.has(preservedCurrentId)) {
      this.selectComponent(preservedCurrentId);

      // Show appropriate handles
      if (this.selectedIds.size > 1) {
        // Composite re-expanded into its group
        showArrowHandle(this.currentId);
        showUnifiedBoundingBox();
      } else {
        showRotationHandle(preservedCurrentId);
        showScaleHandle(preservedCurrentId);
        showArrowHandle(preservedCurrentId);
      }

      console.log(`Ungrouped ${nonCompositeIds.size} non-composite component(s): [${Array.from(nonCompositeIds).join(', ')}]`);
      if (compositeIds.size > 0) {
        console.log(`Composite members preserved: [${Array.from(compositeIds).join(', ')}]`);
      }
      console.log(`Post-ungroup selection: currentId=${this.currentId}, selectedIds=[${Array.from(this.selectedIds).join(', ')}]`);
    } else {
      // No currentId - fully deselect
      this.currentId = null;
      console.log(`Ungrouped ${nonCompositeIds.size} non-composite component(s) — all deselected`);
    }

    // Update toolbar button visibility
    updateToolbarButtons();
    return true;
  }

  /**
   * Given a composite exit-port ID, find the entry-port ID of the same instance.
   * Returns null when the given id is not a composite exit port.
   */
  getCompositeEntryPortId(exitPortId) {
    const exitComp = this.components.get(exitPortId);
    if (!exitComp || !exitComp.isExitPort || !exitComp.isCompositeInstance) return null;
    const instId = exitComp.compositeInstanceId;
    for (const [id, comp] of this.components) {
      if (comp.isEntryPort && comp.compositeInstanceId === instId) return id;
    }
    return null;
  }

  /**
   * Given any composite member component, return its exit-port component.
   * Returns the component itself if it is already the exit port, or not a composite member.
   */
  getCompositeExitPort(component) {
    if (!component || !component.isCompositeInstance) return component;
    if (component.isExitPort) return component;
    const instId = component.compositeInstanceId;
    for (const memberId of (component.groupMembers || [])) {
      const member = this.components.get(memberId);
      if (member && member.isExitPort && member.compositeInstanceId === instId) return member;
    }
    return component; // fallback
  }

  /**
   * Given any composite member component, return its entry-port component.
   * Returns the component itself if it is already the entry port, or not a composite member.
   */
  getCompositeEntryPort(component) {
    if (!component || !component.isCompositeInstance) return component;
    if (component.isEntryPort) return component;
    const instId = component.compositeInstanceId;
    for (const memberId of (component.groupMembers || [])) {
      const member = this.components.get(memberId);
      if (member && member.isEntryPort && member.compositeInstanceId === instId) return member;
    }
    return component; // fallback
  }

  /**
   * Given a composite exit-port ID, find the entry-port ID of the same instance.
   * Returns null when the given id is not a composite exit port.
   */
  getCompositeEntryPortId(exitPortId) {
    const exitComp = this.components.get(exitPortId);
    if (!exitComp || !exitComp.isExitPort || !exitComp.isCompositeInstance) return null;
    const instId = exitComp.compositeInstanceId;
    for (const [id, comp] of this.components) {
      if (comp.isEntryPort && comp.compositeInstanceId === instId) return id;
    }
    return null;
  }

  /**
   * Collect all component IDs that belong to the same composite instance.
   * Returns an empty set when the given id is not a composite member.
   */
  getCompositeSiblingIds(memberId) {
    const comp = this.components.get(memberId);
    if (!comp || !comp.isCompositeInstance || comp.compositeInstanceId == null) return new Set();
    const instId = comp.compositeInstanceId;
    const siblings = new Set();
    for (const [id, c] of this.components) {
      if (c.compositeInstanceId === instId) siblings.add(id);
    }
    return siblings;
  }

  /**
   * Check if newParentId would create a circular parent relationship with childId
   * @param {number} childId - The component that would receive a new parent
   * @param {number} newParentId - The proposed new parent
   * @returns {boolean} - True if setting newParentId as parent would create a cycle
   */
  wouldCreateCycle(childId, newParentId) {
    if (childId === newParentId) return true;
    
    // Traverse up the parent chain from newParentId
    let currentId = newParentId;
    const visited = new Set();
    
    while (currentId !== null) {
      // Check for cycle
      if (currentId === childId) return true;
      
      // Check for infinite loop in existing parent chain (shouldn't happen but safety check)
      if (visited.has(currentId)) {
        console.warn(`Detected existing cycle in parent chain at component ${currentId}`);
        return true;
      }
      visited.add(currentId);
      
      const component = this.components.get(currentId);
      if (!component) break;
      
      currentId = component.parent;
    }
    
    return false;
  }

  /**
   * Remove parent relationship from a component
   * @param {number} id - Component ID to cut parent link from
   * @returns {boolean} - Success status
   */
  cutParentLink(id) {
    const component = this.components.get(id);
    if (!component) {
      console.log(`Component ${id} not found`);
      return false;
    }
    
    if (component.parent === null) {
      console.log(`Component ${id} has no parent to remove`);
      return false;
    }
    
    const parentId = component.parent;
    const parentComponent = this.components.get(parentId);
    
    // Remove from parent's children array
    if (parentComponent) {
      const index = parentComponent.children.indexOf(id);
      if (index > -1) {
        parentComponent.children.splice(index, 1);
      }
    }
    
    // Clear parent reference
    component.parent = null;
    
    console.log(`Cut parent link: Component ${id} is no longer child of ${parentId}`);
    updateToolbarButtons(); // Update toolbar since parent status changed
    return true;
  }

  /**
   * Change parent relationship of a component
   * @param {number} childId - Component to change parent of
   * @param {number} newParentId - New parent ID
   * @returns {boolean} - Success status
   */
  changeParent(childId, newParentId) {
    const childComponent = this.components.get(childId);
    const newParentComponent = this.components.get(newParentId);
    
    if (!childComponent) {
      console.log(`Child component ${childId} not found`);
      return false;
    }
    
    if (!newParentComponent) {
      console.log(`New parent component ${newParentId} not found`);
      return false;
    }
    
    // Check for circular dependency
    if (this.wouldCreateCycle(childId, newParentId)) {
      console.log(`Cannot set parent: would create circular dependency`);
      return false;
    }
    
    // Remove from old parent's children array
    const oldParentId = childComponent.parent;
    if (oldParentId !== null) {
      const oldParentComponent = this.components.get(oldParentId);
      if (oldParentComponent) {
        const index = oldParentComponent.children.indexOf(childId);
        if (index > -1) {
          oldParentComponent.children.splice(index, 1);
        }
      }
    }
    
    // Set new parent relationship
    childComponent.parent = newParentId;
    
    // Add to new parent's children array if not already there
    if (!newParentComponent.children.includes(childId)) {
      newParentComponent.children.push(childId);
    }
    
    console.log(`Changed parent: Component ${childId} now child of ${newParentId} (was ${oldParentId})`);
    updateToolbarButtons(); // Update toolbar since parent status changed
    return true;
  }

}

// Create singleton instance
export const componentManager = new ComponentManager();


import { Component } from '../components/Component.js';
import { componentManager, ComponentManager } from '../components/ComponentManager.js';
import { updateRays } from '../rays/DrawRays.js';
import { showRotationHandle, removeRotationHandle, showGroupRotationHandle } from '../events/RotationHandle.js';
import { showScaleHandle, removeScaleHandle, showGroupScaleHandle } from '../events/ScaleHandle.js';
import { showArrowHandle, removeArrowHandle } from '../events/ArrowHandle.js';
import { showUnifiedBoundingBox, removeUnifiedBoundingBox } from '../events/InteractionHandlers.js';
import { refreshDebugLayer } from '../utils/DebugLayer.js';

function clonePoint(point) {
  return point ? { x: point.x, y: point.y } : null;
}

function captureComponent(id, component) {
  return {
    mapId: id,
    componentId: component.id,
    type: component.type,
    name: component.name,
    x: component.x,
    y: component.y,
    rotation: component.rotation,
    scale: component.scale,
    visible: component.visible,
    compositeDefinedVisible: component.compositeDefinedVisible,
    flipX: component.flipX,
    flipY: component.flipY,
    arrowVector: clonePoint(component.arrowVector),
    upVector: clonePoint(component.upVector),
    parent: component.parent,
    children: [...component.children],
    isGrouped: component.isGrouped,
    groupMembers: [...component.groupMembers],
    rayShape: component.rayShape,
    rayPolygonColor: component.rayPolygonColor,
    rayPolygonOpacity: component.rayPolygonOpacity,
    rayColorInheritFromParent: component.rayColorInheritFromParent,
    rayGradientEnabled: component.rayGradientEnabled,
    rayPolygonColor2: component.rayPolygonColor2,
    apertureRadius: component.apertureRadius,
    apertureCenterOffset: component.apertureCenterOffset,
    arraySegments: component.arraySegments,
    arraySizeRatio: component.arraySizeRatio,
    arrayPositionRatio: component.arrayPositionRatio,
    coneAngle: component.coneAngle,
    isCompositeInstance: component.isCompositeInstance,
    compositeKey: component.compositeKey,
    compositeInstanceId: component.compositeInstanceId,
    isExitPort: component.isExitPort,
    isEntryPort: component.isEntryPort,
    rayLocked: component.rayLocked
  };
}

export function captureSceneSnapshot() {
  const components = [...componentManager.components.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, component]) => captureComponent(id, component));

  return {
    idCounter: componentManager.idCounter,
    compositeInstanceCounter: componentManager.compositeInstanceCounter,
    currentId: componentManager.currentId,
    selectedIds: [...componentManager.selectedIds].sort((a, b) => a - b),
    nextPosition: clonePoint(componentManager.nextPosition),
    components
  };
}

function restoreComponent(snapshot) {
  const component = new Component(snapshot.type);

  component.id = snapshot.componentId || component.id;
  component.name = snapshot.name || component.name;
  component.isCompositeInstance = !!snapshot.isCompositeInstance;
  component.compositeKey = snapshot.compositeKey ?? null;
  component.compositeInstanceId = snapshot.compositeInstanceId ?? null;
  component.isExitPort = !!snapshot.isExitPort;
  component.isEntryPort = !!snapshot.isEntryPort;
  component.rayLocked = !!snapshot.rayLocked;
  component.compositeDefinedVisible = snapshot.compositeDefinedVisible;

  component.flipX = !!snapshot.flipX;
  component.flipY = !!snapshot.flipY;
  if (snapshot.upVector) component.upVector = clonePoint(snapshot.upVector);
  component.rayShape = snapshot.rayShape || 'collimated';
  component.rayPolygonColor = snapshot.rayPolygonColor || component.rayPolygonColor;
  component.rayPolygonOpacity = snapshot.rayPolygonOpacity ?? component.rayPolygonOpacity;
  component.rayColorInheritFromParent = snapshot.rayColorInheritFromParent ?? component.rayColorInheritFromParent;
  component.rayGradientEnabled = snapshot.rayGradientEnabled ?? component.rayGradientEnabled;
  component.rayPolygonColor2 = snapshot.rayPolygonColor2 || component.rayPolygonColor2;
  component.coneAngle = snapshot.coneAngle ?? 0;
  component.setArraySegments(snapshot.arraySegments ?? component.arraySegments);
  component.setArraySizeRatio(snapshot.arraySizeRatio ?? component.arraySizeRatio);
  component.setArrayPositionRatio(snapshot.arrayPositionRatio ?? component.arrayPositionRatio);
  component.setApertureRadius(snapshot.apertureRadius ?? component.apertureRadius);
  component.setApertureCenterOffset(snapshot.apertureCenterOffset ?? component.apertureCenterOffset);
  if (snapshot.arrowVector) component.setArrowVector(snapshot.arrowVector.x, snapshot.arrowVector.y);
  component.setPosition(snapshot.x, snapshot.y);
  component.setRotation(snapshot.rotation);
  component.setScale(snapshot.scale);
  component.visible = snapshot.visible ?? true;

  component.parent = snapshot.parent;
  component.children = [...(snapshot.children || [])];
  if (snapshot.isGrouped) {
    component.setGroupMembers(snapshot.groupMembers || []);
  } else {
    component.clearGroup();
  }

  return component;
}

function refreshSelectionUi() {
  removeRotationHandle();
  removeScaleHandle();
  removeArrowHandle();
  removeUnifiedBoundingBox();

  componentManager.components.forEach((_component, id) => {
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) element.classList.toggle('selected', componentManager.selectedIds.has(id));
  });

  const selectedCount = componentManager.selectedIds.size;
  const currentId = componentManager.currentId;

  if (selectedCount > 1) {
    showUnifiedBoundingBox();
    showGroupRotationHandle();
    showGroupScaleHandle();
    if (currentId !== null && componentManager.components.has(currentId)) {
      showArrowHandle(currentId);
    }
  } else if (selectedCount === 1 && currentId !== null && componentManager.components.has(currentId)) {
    showRotationHandle(currentId);
    showScaleHandle(currentId);
    showArrowHandle(currentId);
  }

  const selectedComponent = currentId !== null ? componentManager.getComponent(currentId) : null;
  if (ComponentManager.onSelectionChanged) {
    ComponentManager.onSelectionChanged(
      selectedComponent ? componentManager.getCompositeEntryPort(selectedComponent) : null
    );
  }
  document.dispatchEvent(new CustomEvent('ray:selectionChanged'));
}

export function restoreSceneSnapshot(snapshot) {
  if (!snapshot) return;

  const schematics = document.getElementById('schematics');
  if (!schematics) return;

  removeRotationHandle();
  removeScaleHandle();
  removeArrowHandle();
  removeUnifiedBoundingBox();
  schematics.replaceChildren();

  componentManager.components.clear();
  componentManager.idCounter = snapshot.idCounter ?? 0;
  componentManager.compositeInstanceCounter = snapshot.compositeInstanceCounter ?? 0;
  componentManager.currentId = snapshot.currentId ?? null;
  componentManager.selectedIds = new Set(snapshot.selectedIds || []);
  componentManager.nextPosition = clonePoint(snapshot.nextPosition) || { x: 0, y: 0 };

  (snapshot.components || []).forEach(componentSnapshot => {
    const component = restoreComponent(componentSnapshot);
    const element = component.render();
    element.setAttribute('data-id', componentSnapshot.mapId);
    schematics.appendChild(element);
    componentManager.components.set(componentSnapshot.mapId, component);
  });

  if (componentManager.currentId !== null && !componentManager.components.has(componentManager.currentId)) {
    componentManager.currentId = null;
  }

  updateRays();
  refreshDebugLayer();
  refreshSelectionUi();
}

export function areSnapshotsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

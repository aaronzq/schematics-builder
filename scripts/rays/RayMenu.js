/**
 * RayMenu.js - Right-panel ray configuration (Phase 3)
 * Renders into #ray-panel-body. Updates whenever selection changes via
 * ComponentManager.onSelectionChanged callback.
 */

import { ComponentManager, componentManager } from '../components/ComponentManager.js';
import { updateRays } from './DrawRays.js';
import { rebuildDebugForComponent } from '../utils/DebugLayer.js';
import { APERTURE_RADIUS_STEP, APERTURE_OFFSET_STEP, ARRAY_SIZE_RATIO_STEP, ARRAY_POSITION_RATIO_STEP } from '../config.js';

let currentComponent = null;

// â”€â”€â”€ HTML template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EMPTY_HTML = `
  <div class="rp-empty">
    <p>Select a component<br>to configure its rays</p>
  </div>
`;

function buildPanelHTML(comp) {
  let hue = 180;
  if (comp.rayPolygonColor) {
    const m = comp.rayPolygonColor.match(/hsl\((\d+)/);
    if (m) hue = parseInt(m[1]);
  }

  const shape    = comp.rayShape              ?? 'collimated';
  const opacity  = comp.rayPolygonOpacity     ?? 0.2;
  const radius   = comp.apertureRadius        ?? 15;
  const offset   = comp.apertureCenterOffset  ?? 0;
  const segments = comp.arraySegments         ?? 3;
  const sizeRatio = comp.arraySizeRatio        ?? 0.8;
  const positionRatio = comp.arrayPositionRatio ?? 1.0;
  const inheritColor = comp.rayColorInheritFromParent ?? true;
  // Non-entry composite members have all ray controls locked in the UI;
  // only the entry port may be edited. Ray propagation still flows normally.
  const compLocked = comp.isCompositeInstance && !comp.isEntryPort;

  const arrayDisplay = shape === 'array' ? '' : 'none';

  // Radius slider is disabled when the parent fully controls the child aperture:
  //   - collimated: always parent-controlled
  //   - divergent with a parent that already has a non-zero cone angle
  //   - array: user-adjustable (not auto-scaled)
  const parentComp = (comp.parent != null) ? componentManager.getComponent(comp.parent) : null;
  const divergentParentControlled = shape === 'divergent' && parentComp && parentComp.coneAngle;
  const radiusDisabled = compLocked || (!!parentComp && (shape === 'collimated' || divergentParentControlled));

  return `
    ${compLocked ? '<div class="rp-locked-notice">Locked — edit via entry port</div>' : ''}
    <div class="rp-section">
      <div class="rp-field">
        <label class="rp-label${compLocked ? ' rp-label-disabled' : ''}" for="rp-shape">Ray Shape</label>
        <select id="rp-shape" class="rp-select"${compLocked ? ' disabled' : ''}>
          <option value="collimated" ${shape==='collimated'?'selected':''}>Collimated</option>
          <option value="divergent"  ${shape==='divergent' ?'selected':''}>Divergent</option>
          <option value="convergent" ${shape==='convergent'?'selected':''}>Convergent</option>
          <option value="manual"     ${shape==='manual'    ?'selected':''}>Manual</option>
          <option value="array"      ${shape==='array'     ?'selected':''}>Array</option>
        </select>
      </div>
    </div>

    <div class="rp-section rp-color-section">
      <div class="rp-section-title">Color</div>

      <div class="rp-field rp-field-checkbox">
        <label class="rp-checkbox-label${compLocked ? ' rp-label-disabled' : ''}" for="rp-inherit-color">
          <input type="checkbox" id="rp-inherit-color" ${inheritColor ? 'checked' : ''}${compLocked ? ' disabled' : ''}>
          Inherit from parent${compLocked ? ' <span class="rp-lock-note">(entry port only)</span>' : ''}
        </label>
      </div>

      <div class="rp-field">
        <label class="rp-label${compLocked ? ' rp-label-disabled' : ''}">Color Hue <span class="rp-value" id="rp-hue-val">${hue}&#176;</span></label>
        <input type="range" id="rp-hue" class="rp-slider rp-hue-slider"
               min="0" max="359" step="1" value="${hue}"${compLocked ? ' disabled' : ''}>
      </div>

      <div class="rp-field">
        <label class="rp-label${compLocked ? ' rp-label-disabled' : ''}">Opacity <span class="rp-value" id="rp-opacity-val">${opacity.toFixed(2)}</span></label>
        <input type="range" id="rp-opacity" class="rp-slider"
               min="0" max="1" step="0.05" value="${opacity}"${compLocked ? ' disabled' : ''}>
      </div>
    </div>

    <div class="rp-section">
      <div class="rp-field">
        <label class="rp-label${radiusDisabled ? ' rp-label-disabled' : ''}">Aperture Radius <span class="rp-value" id="rp-radius-val">${radius}</span></label>
        <input type="range" id="rp-radius" class="rp-slider"
               min="0" max="200" step="${APERTURE_RADIUS_STEP}" value="${radius}"${radiusDisabled ? ' disabled' : ''}>
      </div>

      <div class="rp-field">
        <label class="rp-label${compLocked ? ' rp-label-disabled' : ''}">Center Offset <span class="rp-value" id="rp-offset-val">${offset}</span></label>
        <input type="range" id="rp-offset" class="rp-slider"
               min="-100" max="100" step="${APERTURE_OFFSET_STEP}" value="${offset}"${compLocked ? ' disabled' : ''}>
      </div>
    </div>

    <div class="rp-section rp-array-section" id="rp-array-section" style="display:${arrayDisplay}">
      <div class="rp-section-title">Array Settings</div>
      <div class="rp-field">
        <label class="rp-label${compLocked ? ' rp-label-disabled' : ''}">Num of sub-aperture</label>
        <input type="number" id="rp-segments" class="rp-number"
               min="1" max="10" step="1" value="${segments}"${compLocked ? ' disabled' : ''}>
      </div>
      <div class="rp-field">
        <label class="rp-label${compLocked ? ' rp-label-disabled' : ''}">Size of sub-aperture <span class="rp-value" id="rp-size-ratio-val">${sizeRatio.toFixed(2)}</span></label>
        <input type="range" id="rp-size-ratio" class="rp-slider"
               min="0" max="2" step="${ARRAY_SIZE_RATIO_STEP}" value="${sizeRatio}"${compLocked ? ' disabled' : ''}>
      </div>
      <div class="rp-field">
        <label class="rp-label${compLocked ? ' rp-label-disabled' : ''}">Position of sub-aperture <span class="rp-value" id="rp-position-ratio-val">${positionRatio.toFixed(2)}</span></label>
        <input type="range" id="rp-position-ratio" class="rp-slider"
               min="0" max="2" step="${ARRAY_POSITION_RATIO_STEP}" value="${positionRatio}"${compLocked ? ' disabled' : ''}>
      </div>
    </div>
  `;
}

// â”€â”€â”€ Wire events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function wireEvents(body) {
  const get = id => body.querySelector('#' + id);

  const apply = () => {
    if (!currentComponent) return;
    updateRays();
    rebuildDebugForComponent(currentComponent);
  };

  get('rp-shape').addEventListener('change', e => {
    if (!currentComponent) return;
    const newShape = e.target.value;
    currentComponent.setRayShape(newShape);
    if (newShape === 'collimated') currentComponent.coneAngle = 0;
    body.querySelector('#rp-array-section').style.display =
      newShape === 'array' ? '' : 'none';

    // Re-evaluate whether the radius slider should be enabled or disabled.
    const parentComp = (currentComponent.parent != null)
      ? componentManager.getComponent(currentComponent.parent) : null;
    const divergentParentControlled = newShape === 'divergent' && parentComp && parentComp.coneAngle;
    const radiusDisabled = !!parentComp && (newShape === 'collimated' || divergentParentControlled);
    const radiusSlider = get('rp-radius');
    const radiusLabel  = radiusSlider?.closest('.rp-field')?.querySelector('.rp-label');
    radiusSlider.disabled = radiusDisabled;
    if (radiusLabel) radiusLabel.classList.toggle('rp-label-disabled', radiusDisabled);

    apply();
  });

  get('rp-inherit-color').addEventListener('change', e => {
    if (!currentComponent) return;
    currentComponent.rayColorInheritFromParent = e.target.checked;
    if (e.target.checked && currentComponent.parent != null) {
      const parentComp = componentManager.getComponent(currentComponent.parent);
      if (parentComp) {
        currentComponent.rayPolygonColor   = parentComp.rayPolygonColor;
        currentComponent.rayPolygonOpacity = parentComp.rayPolygonOpacity;
        // Sync hue slider UI
        const hueSlider = get('rp-hue');
        const hueVal    = body.querySelector('#rp-hue-val');
        const m = parentComp.rayPolygonColor?.match(/hsl\((\d+)/);
        if (m && hueSlider) {
          hueSlider.value = m[1];
          if (hueVal) hueVal.textContent = m[1] + '°';
        }
        // Sync opacity slider UI
        const opSlider = get('rp-opacity');
        const opVal    = body.querySelector('#rp-opacity-val');
        if (opSlider) {
          opSlider.value = parentComp.rayPolygonOpacity;
          if (opVal) opVal.textContent = parentComp.rayPolygonOpacity.toFixed(2);
        }
        // Extract hue for propagation
        const m2 = parentComp.rayPolygonColor?.match(/hsl\((\d+)/);
        const inheritedHue = m2 ? parseInt(m2[1]) : null;
        propagateColor(currentComponent, inheritedHue, parentComp.rayPolygonOpacity);
        apply();
      }
    }
  });

  // Propagate hue/opacity down the tree to all descendants that opt-in
  function propagateColor(comp, hue, opacity) {
    for (const childId of comp.children) {
      const child = componentManager.getComponent(childId);
      if (!child) continue;
      if (child.rayColorInheritFromParent ?? true) {
        if (hue !== null) child.rayPolygonColor = `hsl(${hue}, 70%, 50%)`;
        if (opacity !== null) child.rayPolygonOpacity = opacity;
        propagateColor(child, hue, opacity);
      }
    }
  }

  function untickInherit() {
    if (!currentComponent || !currentComponent.rayColorInheritFromParent) return;
    currentComponent.rayColorInheritFromParent = false;
    const cb = get('rp-inherit-color');
    if (cb) cb.checked = false;
  }

  get('rp-hue').addEventListener('input', e => {
    if (!currentComponent) return;
    untickInherit();
    const hue = parseInt(e.target.value);
    body.querySelector('#rp-hue-val').textContent = hue + '°';
    currentComponent.rayPolygonColor = `hsl(${hue}, 70%, 50%)`;
    propagateColor(currentComponent, hue, null);
    apply();
  });

  get('rp-opacity').addEventListener('input', e => {
    if (!currentComponent) return;
    untickInherit();
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-opacity-val').textContent = v.toFixed(2);
    currentComponent.rayPolygonOpacity = v;
    propagateColor(currentComponent, null, v);
    apply();
  });

  get('rp-radius').addEventListener('input', e => {
    if (!currentComponent) return;
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-radius-val').textContent = v;
    currentComponent.setApertureRadius(v);
    apply();
  });

  get('rp-offset').addEventListener('input', e => {
    if (!currentComponent) return;
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-offset-val').textContent = v;
    currentComponent.setApertureCenterOffset(v);
    apply();
  });

  get('rp-segments').addEventListener('change', e => {
    if (!currentComponent) return;
    currentComponent.setArraySegments(parseInt(e.target.value));
    apply();
  });

  get('rp-size-ratio').addEventListener('input', e => {
    if (!currentComponent) return;
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-size-ratio-val').textContent = v.toFixed(2);
    currentComponent.setArraySizeRatio(v);
    apply();
  });

  get('rp-position-ratio').addEventListener('input', e => {
    if (!currentComponent) return;
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-position-ratio-val').textContent = v.toFixed(2);
    currentComponent.setArrayPositionRatio(v);
    apply();
  });
}

// â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Call once during app init. Renders blank state and registers selection hook.
 */
export function setupRayMenu() {
  const body = document.getElementById('ray-panel-body');
  if (!body) return;

  body.innerHTML = EMPTY_HTML;

  ComponentManager.onSelectionChanged = (component) => {
    currentComponent = component;
    if (!component) {
      body.innerHTML = EMPTY_HTML;
      return;
    }
    body.innerHTML = buildPanelHTML(component);
    wireEvents(body);
  };
}

/**
 * RayMenu.js - Right-panel ray configuration (Phase 3)
 * Renders into #ray-panel-body. Updates whenever selection changes via
 * ComponentManager.onSelectionChanged callback.
 */

import { ComponentManager, componentManager } from '../components/ComponentManager.js';
import { updateRays } from './DrawRays.js';
import { rebuildDebugForComponent } from '../utils/DebugLayer.js';
import { APERTURE_RADIUS_STEP, APERTURE_OFFSET_STEP, ARRAY_SIZE_RATIO_STEP, ARRAY_POSITION_RATIO_STEP,
         DEFAULT_SOLID_RAY_COLOR, DEFAULT_RAY_POLYGON_OPACITY } from '../config.js';
import { actionHistory } from '../history/ActionHistory.js';
import { isCoupler, couplerPorts, branchPort } from '../components/FiberPorts.js';
import { showArrowHandle } from '../events/ArrowHandle.js';

/** Extract the 0-359 hue from either an HSL or 6-digit hex color string. */
function _colorToHue(color) {
  if (!color) return 0;
  const hslMatch = color.match(/hsl\((\d+)/);
  if (hslMatch) return parseInt(hslMatch[1]);
  const hex = color.replace('#', '');
  if (hex.length !== 6) return 0;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r)      h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else                h = (r - g) / d + 4;
  return Math.round(h * 60 + 360) % 360;
}

function _hueToRayColor(hue) {
  return `hsl(${hue}, 70%, 50%)`;
}

let currentComponent = null;

// â”€â”€â”€ HTML template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EMPTY_HTML = `
  <div class="rp-empty">
    <p>Select a component<br>to configure its rays</p>
  </div>
`;

function buildPanelHTML(comp) {
  const hue1 = _colorToHue(comp.rayPolygonColor  || DEFAULT_SOLID_RAY_COLOR);
  const hue2 = _colorToHue(comp.rayPolygonColor2 || comp.rayPolygonColor || DEFAULT_SOLID_RAY_COLOR);

  const shape    = comp.rayShape              ?? 'collimated';
  const opacity  = comp.rayPolygonOpacity     ?? DEFAULT_RAY_POLYGON_OPACITY;
  const radius   = comp.apertureRadius        ?? 15;
  const offset   = comp.apertureCenterOffset  ?? 0;
  const segments = comp.arraySegments         ?? 3;
  const sizeRatio = comp.arraySizeRatio        ?? 0.8;
  const positionRatio = comp.arrayPositionRatio ?? 1.0;
  const inheritColor = comp.rayColorInheritFromParent ?? true;
  const gradientEnabled = comp.rayGradientEnabled ?? false;
  const isFiberCoupler = isCoupler(comp);
  const couplerSplitRatio = comp.couplerSplitRatio ?? 50;
  const couplerArmLength = comp.couplerArmLength ?? 40;
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

      <div class="rp-field rp-field-checkbox rp-checkbox-row">
        <label class="rp-checkbox-label${compLocked ? ' rp-label-disabled' : ''}" for="rp-inherit-color">
          <input type="checkbox" id="rp-inherit-color" ${inheritColor ? 'checked' : ''}${compLocked ? ' disabled' : ''}>
          Inherit from parent${compLocked ? ' <span class="rp-lock-note">(entry port only)</span>' : ''}
        </label>
        <label class="rp-gradient-toggle${compLocked ? ' rp-label-disabled' : ''}">
          <input type="checkbox" id="rp-gradient" ${gradientEnabled ? 'checked' : ''}${compLocked ? ' disabled' : ''}>
          Color Gradient
        </label>
      </div>

      <div class="rp-field">
        <div class="rp-hue-label-row">
          <label class="rp-label${compLocked ? ' rp-label-disabled' : ''}">Color Hue</label>
          <span class="rp-value" id="rp-hue-val">${gradientEnabled ? hue1 + '&#176; / ' + hue2 + '&#176;' : hue1 + '&#176;'}</span>
        </div>
        <div class="rp-hue-track" id="rp-hue-track"${compLocked ? ' style="pointer-events:none;opacity:0.5"' : ''}>
          <div class="rp-hue-knob active" id="rp-knob1"
               style="left:${(hue1 / 359 * 100).toFixed(2)}%" title="Upper aperture (knob 1): ${hue1}&deg;"></div>
          <div class="rp-hue-knob" id="rp-knob2"
               style="left:${(hue2 / 359 * 100).toFixed(2)}%;display:${gradientEnabled ? 'block' : 'none'}" title="Lower aperture (knob 2): ${hue2}&deg;"></div>
        </div>
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

    ${isFiberCoupler ? `
    <div class="rp-section rp-coupler-section">
      <div class="rp-section-title">Fiber Coupler</div>
      <div class="rp-field">
        <label class="rp-label" for="rp-coupler-port">Port for next connection</label>
        <select id="rp-coupler-port" class="rp-select">
          ${couplerPorts(comp).filter(p => p.id !== comp.couplerInputPort).map(p => `<option value="${p.id}" ${p.id === comp.couplerActivePort ? 'selected' : ''}>${p.label}</option>`).join('')}
        </select>
      </div>
      <p>Left upper/input receives the upstream connection. Click an unused port circle or choose a port above, then add a component.</p>
      <div class="rp-field">
        <label class="rp-label">Splitting Ratio
          <span class="rp-value" id="rp-coupler-ratio-val">${Math.round(couplerSplitRatio)}/${Math.round(100 - couplerSplitRatio)}</span>
        </label>
        <input type="range" id="rp-coupler-ratio" class="rp-slider"
               min="0" max="100" step="1" value="${couplerSplitRatio}">
      </div>
      <div class="rp-field">
        <label class="rp-label">Arm Length
          <span class="rp-value" id="rp-coupler-arm-val">${Math.round(couplerArmLength)}</span>
        </label>
        <input type="range" id="rp-coupler-arm" class="rp-slider"
               min="10" max="150" step="5" value="${couplerArmLength}">
      </div>
    </div>` : ''}
  `;
}

// â”€â”€â”€ Wire events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function wireEvents(body) {
  const get = id => body.querySelector('#' + id);

  function syncSliderProgress(slider) {
    if (!slider) return;
    const min = parseFloat(slider.min || '0');
    const max = parseFloat(slider.max || '100');
    const value = parseFloat(slider.value || '0');
    const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--rp-slider-progress', `${Math.max(0, Math.min(100, progress))}%`);
  }

  body.querySelectorAll('.rp-slider').forEach(slider => {
    syncSliderProgress(slider);
    slider.addEventListener('input', () => syncSliderProgress(slider));
    slider.addEventListener('change', () => syncSliderProgress(slider));
  });

  const apply = () => {
    if (!currentComponent) return;
    updateRays();
    rebuildDebugForComponent(currentComponent);
  };

  const beginControlHistory = (label, type) => {
    if (!actionHistory.isApplyingHistory) actionHistory.begin(label, type);
  };

  const commitControlHistory = () => {
    if (!actionHistory.isApplyingHistory) actionHistory.commit();
  };

  get('rp-shape').addEventListener('change', e => {
    actionHistory.run('Change ray shape', 'ray-shape', () => {
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
  });

  get('rp-inherit-color').addEventListener('change', e => {
    actionHistory.run('Toggle color inheritance', 'ray-inherit-color', () => {
      if (!currentComponent) return;
      currentComponent.rayColorInheritFromParent = e.target.checked;
      if (e.target.checked && currentComponent.parent != null) {
        const parentComp = componentManager.getComponent(currentComponent.parent);
        if (parentComp) {
          const inheritedColor    = parentComp.rayPolygonColor;
          const inheritedOpacity  = parentComp.rayPolygonOpacity;
          const inheritedGradient = parentComp.rayGradientEnabled;
          const inheritedColor2   = parentComp.rayPolygonColor2;
          currentComponent.rayPolygonColor    = inheritedColor;
          currentComponent.rayPolygonOpacity  = inheritedOpacity;
          currentComponent.rayGradientEnabled = inheritedGradient;
          currentComponent.rayPolygonColor2   = inheritedColor2;
          // Sync knob1 position
          const knob1 = get('rp-knob1');
          const knob2 = get('rp-knob2');
          const hueVal = body.querySelector('#rp-hue-val');
          const h1 = _colorToHue(inheritedColor);
          const h2 = _colorToHue(inheritedColor2);
          if (knob1) knob1.style.left = `${(h1/359*100).toFixed(2)}%`;
          if (knob2) knob2.style.left = `${(h2/359*100).toFixed(2)}%`;
          if (knob2) knob2.style.display = inheritedGradient ? 'block' : 'none';
          const gradCb = get('rp-gradient');
          if (gradCb) gradCb.checked = inheritedGradient;
          if (hueVal) hueVal.innerHTML = inheritedGradient ? `${h1}&#176; / ${h2}&#176;` : `${h1}&#176;`;
          // Sync opacity slider UI
          const opSlider = get('rp-opacity');
          const opVal    = body.querySelector('#rp-opacity-val');
          if (opSlider) {
            opSlider.value = inheritedOpacity;
            syncSliderProgress(opSlider);
            if (opVal) opVal.textContent = inheritedOpacity.toFixed(2);
          }
          propagateColor(currentComponent, inheritedColor, inheritedOpacity, inheritedGradient, inheritedColor2);
          apply();
        }
      }
    });
  });

  // Propagate color/opacity/gradient down the tree to all descendants that opt-in.
  // Any null argument is skipped (i.e. that property is not changed on descendants).
  function propagateColor(comp, color, opacity, gradientEnabled, color2) {
    for (const childId of comp.children) {
      const child = componentManager.getComponent(childId);
      if (!child) continue;
      if (child.rayColorInheritFromParent ?? true) {
        if (color !== null && color !== undefined)           child.rayPolygonColor    = color;
        if (opacity !== null && opacity !== undefined)       child.rayPolygonOpacity  = opacity;
        if (gradientEnabled !== null && gradientEnabled !== undefined) child.rayGradientEnabled = gradientEnabled;
        if (color2 !== null && color2 !== undefined)         child.rayPolygonColor2   = color2;
        propagateColor(child, color, opacity, gradientEnabled, color2);
      }
    }
  }

  function untickInherit() {
    if (!currentComponent || !currentComponent.rayColorInheritFromParent) return;
    currentComponent.rayColorInheritFromParent = false;
    const cb = get('rp-inherit-color');
    if (cb) cb.checked = false;
  }

  // ── Dual-knob hue track ───────────────────────────────────────────────────

  /** Convert a pointer clientX to a 0–359 hue value relative to the hue track. */
  function _clientXToHue(clientX) {
    const track = get('rp-hue-track');
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return Math.round((x / rect.width) * 359);
  }

  /** Update a knob's CSS left position from a hue value (0–359). */
  function _setKnobHue(knobEl, hue, isKnob1) {
    knobEl.style.left = `${(hue / 359 * 100).toFixed(2)}%`;
    knobEl.title = `${isKnob1 ? 'Upper' : 'Lower'} aperture (knob ${isKnob1 ? 1 : 2}): ${hue}°`;
  }

  /** Attach pointer-drag listeners to a hue knob. */
  function _attachKnobDrag(knobEl, isKnob1) {
    knobEl.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      actionHistory.begin(isKnob1 ? 'Change ray color' : 'Change gradient color', 'ray-color');

      // Activate this knob visually
      const otherKnob = get(isKnob1 ? 'rp-knob2' : 'rp-knob1');
      knobEl.classList.add('active');
      if (otherKnob) otherKnob.classList.remove('active');

      const onMove = (moveEvent) => {
        if (!currentComponent) return;
        const hue = _clientXToHue(moveEvent.clientX);
        _setKnobHue(knobEl, hue, isKnob1);
        const color = `hsl(${hue}, 70%, 50%)`;

        untickInherit();
        if (isKnob1) {
          currentComponent.rayPolygonColor = color;
          propagateColor(currentComponent, color, null, null, null);
        } else {
          currentComponent.rayPolygonColor2 = color;
          propagateColor(currentComponent, null, null, null, color);
        }

        // Update hue value label
        const hueVal = body.querySelector('#rp-hue-val');
        if (hueVal) {
          const h1 = _colorToHue(currentComponent.rayPolygonColor);
          const h2 = _colorToHue(currentComponent.rayPolygonColor2);
          hueVal.innerHTML = (currentComponent.rayGradientEnabled)
            ? `${h1}&#176; / ${h2}&#176;`
            : `${h1}&#176;`;
        }
        apply();
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        actionHistory.commit();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  const knob1El = get('rp-knob1');
  const knob2El = get('rp-knob2');
  if (knob1El) _attachKnobDrag(knob1El, true);
  if (knob2El) _attachKnobDrag(knob2El, false);

  // Gradient toggle
  const gradientCb = get('rp-gradient');
  if (gradientCb) {
    gradientCb.addEventListener('change', e => {
      actionHistory.run('Toggle ray gradient', 'ray-gradient', () => {
        if (!currentComponent) return;
        untickInherit();
        const enabled = e.target.checked;
        currentComponent.rayGradientEnabled = enabled;
        if (enabled) {
          const h1 = _colorToHue(currentComponent.rayPolygonColor);
          const spacedHue = (h1 + 30) % 360;
          currentComponent.rayPolygonColor2 = _hueToRayColor(spacedHue);
          if (knob2El) _setKnobHue(knob2El, spacedHue, false);
          propagateColor(currentComponent, null, null, null, currentComponent.rayPolygonColor2);
        }
        // Show/hide knob2
        if (knob2El) knob2El.style.display = enabled ? 'block' : 'none';
        // Update value label
        const hueVal = body.querySelector('#rp-hue-val');
        if (hueVal) {
          const h1 = _colorToHue(currentComponent.rayPolygonColor);
          const h2 = _colorToHue(currentComponent.rayPolygonColor2);
          hueVal.innerHTML = enabled ? `${h1}&#176; / ${h2}&#176;` : `${h1}&#176;`;
        }
        propagateColor(currentComponent, null, null, enabled, null);
        apply();
      });
    });
  }

  get('rp-opacity').addEventListener('input', e => {
    if (!currentComponent) return;
    beginControlHistory('Change ray opacity', 'ray-opacity');
    untickInherit();
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-opacity-val').textContent = v.toFixed(2);
    currentComponent.rayPolygonOpacity = v;
    propagateColor(currentComponent, null, v, null, null);
    apply();
  });
  get('rp-opacity').addEventListener('change', commitControlHistory);

  get('rp-radius').addEventListener('input', e => {
    if (!currentComponent) return;
    beginControlHistory('Change aperture radius', 'aperture-radius');
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-radius-val').textContent = v;
    currentComponent.setApertureRadius(v);
    apply();
  });
  get('rp-radius').addEventListener('change', commitControlHistory);

  get('rp-offset').addEventListener('input', e => {
    if (!currentComponent) return;
    beginControlHistory('Change aperture offset', 'aperture-offset');
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-offset-val').textContent = v;
    currentComponent.setApertureCenterOffset(v);
    apply();
  });
  get('rp-offset').addEventListener('change', commitControlHistory);

  get('rp-segments').addEventListener('change', e => {
    actionHistory.run('Change array segments', 'array-segments', () => {
      if (!currentComponent) return;
      currentComponent.setArraySegments(parseInt(e.target.value));
      apply();
    });
  });

  get('rp-size-ratio').addEventListener('input', e => {
    if (!currentComponent) return;
    beginControlHistory('Change array size', 'array-size-ratio');
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-size-ratio-val').textContent = v.toFixed(2);
    currentComponent.setArraySizeRatio(v);
    apply();
  });
  get('rp-size-ratio').addEventListener('change', commitControlHistory);

  get('rp-position-ratio').addEventListener('input', e => {
    if (!currentComponent) return;
    beginControlHistory('Change array position', 'array-position-ratio');
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-position-ratio-val').textContent = v.toFixed(2);
    currentComponent.setArrayPositionRatio(v);
    apply();
  });
  get('rp-position-ratio').addEventListener('change', commitControlHistory);

  const couplerRatio = get('rp-coupler-ratio');
  if (couplerRatio) {
    couplerRatio.addEventListener('input', e => {
      if (!currentComponent) return;
      beginControlHistory('Change coupler splitting ratio', 'coupler-split-ratio');
      const ratio = parseFloat(e.target.value);
      currentComponent.setCouplerSplitRatio(ratio);
      body.querySelector('#rp-coupler-ratio-val').textContent =
        `${Math.round(ratio)}/${Math.round(100 - ratio)}`;

      const outputIds = currentComponent.children.filter(id => branchPort(currentComponent, componentManager.getComponent(id), componentManager).startsWith('out'));
      const totalOpacity = Math.min(1, (currentComponent.rayPolygonOpacity ?? 0.2) * 2);
      outputIds.forEach((id, index) => {
        const child = componentManager.getComponent(id);
        if (!child) return;
        const fraction = branchPort(currentComponent, child, componentManager) === 'out1' ? ratio / 100 : (100 - ratio) / 100;
        child.rayPolygonOpacity = totalOpacity * fraction;
        child.rayColorInheritFromParent = false;
      });
      apply();
    });
    couplerRatio.addEventListener('change', commitControlHistory);
  }

  const couplerArm = get('rp-coupler-arm');
  get('rp-coupler-port')?.addEventListener('change', e => {
    chooseCouplerPort(currentComponent, e.target.value);
  });
  if (couplerArm) {
    couplerArm.addEventListener('input', e => {
      if (!currentComponent) return;
      beginControlHistory('Change coupler arm length', 'coupler-arm-length');
      const length = parseFloat(e.target.value);
      currentComponent.setCouplerArmLength(length);
      componentManager.updateNextPositionFromComponent(componentManager.currentId);
      body.querySelector('#rp-coupler-arm-val').textContent = Math.round(length);
      apply();
    });
    couplerArm.addEventListener('change', commitControlHistory);
  }
}

// â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Call once during app init. Renders blank state and registers selection hook.
 */
export function setupRayMenu() {
  const body = document.getElementById('ray-panel-body');
  if (!body) return;

  body.innerHTML = EMPTY_HTML;

  document.addEventListener('mousedown', e => {
    const dot = e.target.closest?.('[data-fiber-port]');
    if (!dot) return;
    const element = dot.closest('.component');
    const id = Number(element?.getAttribute('data-id'));
    const comp = componentManager.getComponent(id);
    if (!isCoupler(comp)) return;
    e.preventDefault();
    e.stopPropagation();
    componentManager.selectComponent(id);
    chooseCouplerPort(comp, dot.getAttribute('data-fiber-port'));
  }, true);

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

function chooseCouplerPort(comp, port) {
  if (!comp || port === comp.couplerInputPort) return;
  const occupied = comp.children.some(id => branchPort(comp, componentManager.getComponent(id), componentManager) === port);
  if (occupied) { alert('This port already has a connection. Choose an unused port.'); return; }
  actionHistory.run('Select fiber port', 'fiber-port', () => {
    comp.couplerActivePort = port;
    const sign = port.startsWith('in') ? -1 : 1;
    const angle = comp.rotation * Math.PI / 180;
    comp.setArrowVector(sign * 150 * Math.cos(angle), sign * 150 * Math.sin(angle));
    comp._refreshDrawing();
    componentManager.updateNextPositionFromComponent(componentManager.currentId);
    showArrowHandle(componentManager.currentId);
  });
  const select = document.getElementById('rp-coupler-port');
  if (select) select.value = port;
}

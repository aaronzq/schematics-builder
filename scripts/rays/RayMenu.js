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
        <div class="rp-hue-label-row">
          <label class="rp-label${compLocked ? ' rp-label-disabled' : ''}">Color Hue
            <span class="rp-value" id="rp-hue-val">${gradientEnabled ? hue1 + '&#176; / ' + hue2 + '&#176;' : hue1 + '&#176;'}</span>
          </label>
          <label class="rp-gradient-toggle${compLocked ? ' rp-label-disabled' : ''}">
            <input type="checkbox" id="rp-gradient" ${gradientEnabled ? 'checked' : ''}${compLocked ? ' disabled' : ''}>
            Gradient
          </label>
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
          if (opVal) opVal.textContent = inheritedOpacity.toFixed(2);
        }
        propagateColor(currentComponent, inheritedColor, inheritedOpacity, inheritedGradient, inheritedColor2);
        apply();
      }
    }
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
      if (!currentComponent) return;
      untickInherit();
      const enabled = e.target.checked;
      currentComponent.rayGradientEnabled = enabled;
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
  }

  get('rp-opacity').addEventListener('input', e => {
    if (!currentComponent) return;
    untickInherit();
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-opacity-val').textContent = v.toFixed(2);
    currentComponent.rayPolygonOpacity = v;
    propagateColor(currentComponent, null, v, null, null);
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

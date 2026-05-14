/**
 * RayMenu.js - Right-panel ray configuration (Phase 3)
 * Renders into #ray-panel-body. Updates whenever selection changes via
 * ComponentManager.onSelectionChanged callback.
 */

import { ComponentManager, componentManager } from '../components/ComponentManager.js';
import { updateRays } from './DrawRays.js';
import { rebuildDebugForComponent } from '../utils/DebugLayer.js';

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
  const gap      = comp.arrayGap              ?? 0.5;

  const arrayDisplay = shape === 'array' ? '' : 'none';

  // Radius slider is disabled when the parent fully controls the child aperture:
  //   - collimated / array: always parent-controlled
  //   - divergent with a parent that already has a non-zero cone angle
  // NOTE: For composite entry ports (rayLocked siblings exist) the parent is outside
  // the composite, so standard rules apply.
  const parentComp = (comp.parent != null) ? componentManager.getComponent(comp.parent) : null;
  const divergentParentControlled = shape === 'divergent' && parentComp && parentComp.coneAngle;
  const radiusDisabled = !!parentComp && (shape === 'collimated' || shape === 'array' || divergentParentControlled);

  return `
    <div class="rp-section">
      <div class="rp-field">
        <label class="rp-label" for="rp-shape">Ray Shape</label>
        <select id="rp-shape" class="rp-select">
          <option value="collimated" ${shape==='collimated'?'selected':''}>Collimated</option>
          <option value="divergent"  ${shape==='divergent' ?'selected':''}>Divergent</option>
          <option value="convergent" ${shape==='convergent'?'selected':''}>Convergent</option>
          <option value="manual"     ${shape==='manual'    ?'selected':''}>Manual</option>
          <option value="array"      ${shape==='array'     ?'selected':''}>Array</option>
        </select>
      </div>

      <div class="rp-field">
        <label class="rp-label">Color Hue <span class="rp-value" id="rp-hue-val">${hue}&#176;</span></label>
        <input type="range" id="rp-hue" class="rp-slider rp-hue-slider"
               min="0" max="359" step="1" value="${hue}">
      </div>

      <div class="rp-field">
        <label class="rp-label">Opacity <span class="rp-value" id="rp-opacity-val">${opacity.toFixed(2)}</span></label>
        <input type="range" id="rp-opacity" class="rp-slider"
               min="0" max="1" step="0.05" value="${opacity}">
      </div>

      <div class="rp-field">
        <label class="rp-label${radiusDisabled ? ' rp-label-disabled' : ''}">Aperture Radius <span class="rp-value" id="rp-radius-val">${radius}</span></label>
        <input type="range" id="rp-radius" class="rp-slider"
               min="0" max="200" step="5" value="${radius}"${radiusDisabled ? ' disabled' : ''}>
      </div>

      <div class="rp-field">
        <label class="rp-label">Center Offset <span class="rp-value" id="rp-offset-val">${offset}</span></label>
        <input type="range" id="rp-offset" class="rp-slider"
               min="-100" max="100" step="5" value="${offset}">
      </div>
    </div>

    <div class="rp-section rp-array-section" id="rp-array-section" style="display:${arrayDisplay}">
      <div class="rp-section-title">Array Settings</div>
      <div class="rp-field">
        <label class="rp-label">Segments</label>
        <input type="number" id="rp-segments" class="rp-number"
               min="1" max="10" step="1" value="${segments}">
      </div>
      <div class="rp-field">
        <label class="rp-label">Gap <span class="rp-value" id="rp-gap-val">${gap.toFixed(1)}</span></label>
        <input type="range" id="rp-gap" class="rp-slider"
               min="0" max="2" step="0.1" value="${gap}">
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
    currentComponent.rayShape = newShape;
    if (newShape === 'collimated') currentComponent.coneAngle = 0;
    body.querySelector('#rp-array-section').style.display =
      newShape === 'array' ? '' : 'none';

    // Re-evaluate whether the radius slider should be enabled or disabled.
    const parentComp = (currentComponent.parent != null)
      ? componentManager.getComponent(currentComponent.parent) : null;
    const divergentParentControlled = newShape === 'divergent' && parentComp && parentComp.coneAngle;
    const radiusDisabled = !!parentComp && (newShape === 'collimated' || newShape === 'array' || divergentParentControlled);
    const radiusSlider = get('rp-radius');
    const radiusLabel  = radiusSlider?.closest('.rp-field')?.querySelector('.rp-label');
    radiusSlider.disabled = radiusDisabled;
    if (radiusLabel) radiusLabel.classList.toggle('rp-label-disabled', radiusDisabled);

    apply();
  });

  get('rp-hue').addEventListener('input', e => {
    if (!currentComponent) return;
    const hue = parseInt(e.target.value);
    body.querySelector('#rp-hue-val').textContent = hue + 'Â°';
    currentComponent.rayPolygonColor = `hsl(${hue}, 70%, 50%)`;
    apply();
  });

  get('rp-opacity').addEventListener('input', e => {
    if (!currentComponent) return;
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-opacity-val').textContent = v.toFixed(2);
    currentComponent.rayPolygonOpacity = v;
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

  get('rp-gap').addEventListener('input', e => {
    if (!currentComponent) return;
    const v = parseFloat(e.target.value);
    body.querySelector('#rp-gap-val').textContent = v.toFixed(1);
    currentComponent.setArrayGap(v);
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

import { canvas } from './Canvas.js';
import { components as componentRegistry } from './components/ComponentLibrary.js';
import { componentManager } from './components/index.js';
import { exportUserComponents, importUserComponents } from './components/UserComponentStore.js';
import { actionHistory } from './history/ActionHistory.js';
import { captureSceneSnapshot, restoreSceneSnapshot } from './history/HistorySnapshots.js';
import { showApertureRays } from './rays/ApertureRays.js';
import { showTraceLines } from './rays/TraceLines.js';

const SCHEMATIC_SCHEMA = 'schematics-builder.schematic';
const USER_COMPONENTS_SCHEMA = 'schematics-builder.user-components';
const FILE_VERSION = 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

// Setup filename editor to work like Google Docs/Slides
export function setupFilenameEditor() {
  const filenameInput = document.querySelector('.filename-text');

  if (filenameInput) {
    // Prevent Enter key from submitting or creating new lines
    filenameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        filenameInput.blur(); // Remove focus when Enter is pressed
      }
    });

    // Select all text when focused (like Google Docs)
    filenameInput.addEventListener('focus', () => {
      setTimeout(() => filenameInput.select(), 0);
    });

    // Prevent multi-line paste
    filenameInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
      const start = filenameInput.selectionStart;
      const end = filenameInput.selectionEnd;
      const currentValue = filenameInput.value;
      filenameInput.value = currentValue.substring(0, start) + cleanText + currentValue.substring(end);
      filenameInput.setSelectionRange(start + cleanText.length, start + cleanText.length);
    });
  }
}

export function setupFileActions() {
  const exportSchematicBtn = document.getElementById('export-schematic-btn');
  const importSchematicBtn = document.getElementById('import-schematic-btn');
  const exportUserComponentsBtn = document.getElementById('export-user-components-btn');
  const importUserComponentsBtn = document.getElementById('import-user-components-btn');
  const exportSvgBtn = document.getElementById('export-svg-btn');

  if (exportSchematicBtn) exportSchematicBtn.addEventListener('click', exportSchematicJSON);
  if (importSchematicBtn) importSchematicBtn.addEventListener('click', importSchematicJSON);
  if (exportUserComponentsBtn) exportUserComponentsBtn.addEventListener('click', exportUserComponentsJSON);
  if (importUserComponentsBtn) importUserComponentsBtn.addEventListener('click', importUserComponentsJSON);
  if (exportSvgBtn) exportSvgBtn.addEventListener('click', exportCanvasSVG);
}

export function getFilename() {
  const filenameInput = document.querySelector('.filename-text');
  const value = filenameInput ? filenameInput.value.trim() : '';
  return value || 'Untitled Schematic';
}

export function setFilename(filename) {
  const filenameInput = document.querySelector('.filename-text');
  if (filenameInput && typeof filename === 'string' && filename.trim()) {
    filenameInput.value = filename.trim();
  }
}

export function buildSchematicPayload() {
  return {
    schema: SCHEMATIC_SCHEMA,
    version: FILE_VERSION,
    metadata: {
      filename: getFilename(),
      exportedAt: new Date().toISOString()
    },
    canvas: {
      viewBox: canvas.getCurrentViewBox()
    },
    snapshot: captureSceneSnapshot()
  };
}

export function exportSchematicJSON() {
  const payload = buildSchematicPayload();
  downloadTextFile(
    `${sanitizeFilename(payload.metadata.filename)}.json`,
    JSON.stringify(payload, null, 2),
    'application/json'
  );
}

export async function importSchematicJSON() {
  try {
    const file = await pickFile('.json,application/json');
    if (!file) return;

    const data = JSON.parse(await file.text());
    validateSchematicPayload(data);
    validateCompositeDependencies(data.snapshot);

    if (data.metadata && data.metadata.filename) {
      setFilename(data.metadata.filename);
    }

    if (data.canvas && isValidViewBox(data.canvas.viewBox)) {
      canvas.setViewBox(data.canvas.viewBox);
    }

    restoreSceneSnapshot(data.snapshot);
    actionHistory.clear();
  } catch (error) {
    console.error('[Fileio] Failed to import schematic:', error);
    alert(`Failed to import schematic: ${error.message}`);
  }
}

export function buildUserComponentsPayload() {
  return {
    schema: USER_COMPONENTS_SCHEMA,
    version: FILE_VERSION,
    metadata: {
      exportedAt: new Date().toISOString()
    },
    components: exportUserComponents()
  };
}

export function exportUserComponentsJSON() {
  const payload = buildUserComponentsPayload();
  downloadTextFile(
    `${sanitizeFilename(getFilename())}-user-components.json`,
    JSON.stringify(payload, null, 2),
    'application/json'
  );
}

export async function importUserComponentsJSON() {
  try {
    const file = await pickFile('.json,application/json');
    if (!file) return;

    const data = JSON.parse(await file.text());
    validateUserComponentsPayload(data);
    const count = importUserComponents(data.components);
    console.log(`[Fileio] Imported ${count} user component(s).`);
  } catch (error) {
    console.error('[Fileio] Failed to import user components:', error);
    alert(`Failed to import user components: ${error.message}`);
  }
}

export function exportCanvasSVG() {
  try {
    const svgText = buildExportSVG();
    downloadTextFile(`${sanitizeFilename(getFilename())}.svg`, svgText, 'image/svg+xml');
  } catch (error) {
    console.error('[Fileio] Failed to export SVG:', error);
    alert(`Failed to export SVG: ${error.message}`);
  }
}

function validateSchematicPayload(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Schematic file must contain a JSON object.');
  }
  if (data.schema !== SCHEMATIC_SCHEMA) {
    throw new Error(`Unsupported schematic schema: ${data.schema || 'missing'}.`);
  }
  if (data.version !== FILE_VERSION) {
    throw new Error(`Unsupported schematic version: ${data.version || 'missing'}.`);
  }
  if (!data.snapshot || typeof data.snapshot !== 'object' || !Array.isArray(data.snapshot.components)) {
    throw new Error('Schematic file is missing a valid snapshot.components array.');
  }
}

function validateCompositeDependencies(snapshot) {
  const missingKeys = new Set();

  for (const component of snapshot.components || []) {
    if (component && component.isCompositeInstance && component.compositeKey && !componentRegistry[component.compositeKey]) {
      missingKeys.add(component.compositeKey);
    }
  }

  if (missingKeys.size > 0) {
    const keys = [...missingKeys].sort().join(', ');
    throw new Error(`Missing user component definition(s): ${keys}. Import USER COMPONENTS first, then import this schematic again.`);
  }
}

function validateUserComponentsPayload(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('User components file must contain a JSON object.');
  }
  if (data.schema !== USER_COMPONENTS_SCHEMA) {
    throw new Error(`Unsupported user components schema: ${data.schema || 'missing'}.`);
  }
  if (data.version !== FILE_VERSION) {
    throw new Error(`Unsupported user components version: ${data.version || 'missing'}.`);
  }
  if (!Array.isArray(data.components)) {
    throw new Error('User components file is missing a components array.');
  }
}

function isValidViewBox(viewBox) {
  return viewBox &&
    Number.isFinite(viewBox.x) &&
    Number.isFinite(viewBox.y) &&
    Number.isFinite(viewBox.width) &&
    Number.isFinite(viewBox.height) &&
    viewBox.width > 0 &&
    viewBox.height > 0;
}

function buildExportSVG() {
  const sourceSvg = document.getElementById('canvas');
  if (!sourceSvg) throw new Error('Canvas SVG not found.');

  const exportSvg = document.createElementNS(SVG_NS, 'svg');
  exportSvg.setAttribute('xmlns', SVG_NS);
  exportSvg.setAttribute('version', '1.1');

  const sourceDefs = sourceSvg.querySelector('defs');
  if (sourceDefs) {
    exportSvg.appendChild(sourceDefs.cloneNode(true));
  }

  const bounds = [];

  if (showApertureRays) {
    clonePresentationGroup(sourceSvg, exportSvg, 'aperture-rays');
    addElementBounds(bounds, document.getElementById('aperture-rays'));
  }

  if (showTraceLines) {
    clonePresentationGroup(sourceSvg, exportSvg, 'trace-lines-group');
    addElementBounds(bounds, document.getElementById('trace-lines-group'));
  }

  const schematicsClone = clonePresentationGroup(sourceSvg, exportSvg, 'schematics');
  if (!schematicsClone) {
    throw new Error('Schematics group not found.');
  }

  schematicsClone.querySelectorAll('.component-hit-area').forEach(el => el.remove());
  schematicsClone.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
  addVisibleComponentBounds(bounds);

  const viewBox = boundsToViewBox(bounds, canvas.getCurrentViewBox());
  exportSvg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
  exportSvg.setAttribute('width', String(viewBox.width));
  exportSvg.setAttribute('height', String(viewBox.height));

  const serialized = new XMLSerializer().serializeToString(exportSvg);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}\n`;
}

function clonePresentationGroup(sourceSvg, exportSvg, id) {
  const source = sourceSvg.querySelector(`#${id}`);
  if (!source) return null;

  const clone = source.cloneNode(true);
  stripExportOnlyElements(clone);
  exportSvg.appendChild(clone);
  return clone;
}

function stripExportOnlyElements(root) {
  root.querySelectorAll([
    '#grid',
    '#debug-overlay',
    '#unified-bounding-box',
    '#hover-box',
    '#value-display',
    '#relink-indicator',
    '#relink-text',
    '#ray-highlight-overlay',
    '.selection-hover-box',
    '.relink-hover-box',
    '.arrow-handle',
    '[id^="rotation-handle-"]',
    '[id^="scale-handle-"]',
    '#rotation-handle-group',
    '#scale-handle-group'
  ].join(',')).forEach(el => el.remove());
}

function addVisibleComponentBounds(bounds) {
  componentManager.components.forEach(component => {
    if (!component.visible) return;
    const bbox = component.getBoundingBox();
    if (bbox.width > 0 && bbox.height > 0) {
      bounds.push({
        minX: bbox.minX,
        minY: bbox.minY,
        maxX: bbox.maxX,
        maxY: bbox.maxY
      });
    }
  });
}

function addElementBounds(bounds, element) {
  if (!element) return;
  try {
    const bbox = element.getBBox();
    if (bbox.width > 0 || bbox.height > 0) {
      bounds.push({
        minX: bbox.x,
        minY: bbox.y,
        maxX: bbox.x + bbox.width,
        maxY: bbox.y + bbox.height
      });
    }
  } catch {
    // getBBox can fail for detached or empty SVG nodes; ignore them.
  }
}

function boundsToViewBox(bounds, fallbackViewBox) {
  if (!bounds.length) return fallbackViewBox;

  const minX = Math.min(...bounds.map(b => b.minX));
  const minY = Math.min(...bounds.map(b => b.minY));
  const maxX = Math.max(...bounds.map(b => b.maxX));
  const maxY = Math.max(...bounds.map(b => b.maxY));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const padding = Math.max(30, Math.max(width, height) * 0.08);

  return {
    x: minX - padding,
    y: minY - padding,
    width: width + padding * 2,
    height: height + padding * 2
  };
}

function pickFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => resolve((input.files && input.files[0]) || null), { once: true });
    input.click();
  });
}

function downloadTextFile(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(filename) {
  const clean = String(filename || 'Untitled Schematic')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ');
  return clean || 'Untitled Schematic';
}

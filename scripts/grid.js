import { GRID_SIZE } from './constants.js';

let gridVisible = false;

export function drawGrid() {
  const svg = document.getElementById('canvas');
  const gridGroup = document.getElementById('grid');
  // Clear previous grid
  while (gridGroup.firstChild) gridGroup.removeChild(gridGroup.firstChild);

  if (!gridVisible) return;

  // Get SVG viewBox
  let viewBox = svg.viewBox.baseVal;
  let vbX = viewBox.x;
  let vbY = viewBox.y;
  let vbWidth = viewBox.width;
  let vbHeight = viewBox.height;

  // Grid size in SVG units
  const gridSize = GRID_SIZE*10;

  // Find the first grid line at or before the left/top edge
  const firstGridX = Math.floor((vbX - vbWidth) / gridSize) * gridSize;
  const firstGridY = Math.floor((vbY - vbHeight) / gridSize) * gridSize;
  const lastGridX = Math.ceil((vbX + 2 * vbWidth) / gridSize) * gridSize;
  const lastGridY = Math.ceil((vbY + 2 * vbHeight) / gridSize) * gridSize;

  // Draw vertical grid lines to fill and extend beyond the viewBox
  for (let x = firstGridX; x <= lastGridX; x += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', vbY - vbHeight); // extend above
    line.setAttribute('x2', x);
    line.setAttribute('y2', vbY + 2 * vbHeight); // extend below
    line.setAttribute('stroke', '#e0e0e0');
    line.setAttribute('stroke-width', '1');
    gridGroup.appendChild(line);
  }

  // Draw horizontal grid lines to fill and extend beyond the viewBox
  for (let y = firstGridY; y <= lastGridY; y += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', vbX - vbWidth); // extend left
    line.setAttribute('y1', y);
    line.setAttribute('x2', vbX + 2 * vbWidth); // extend right
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#e0e0e0');
    line.setAttribute('stroke-width', '1');
    gridGroup.appendChild(line);
  }
}

export function toggleGrid() {
  gridVisible = !gridVisible;
  drawGrid();
  document.getElementById('toggle-grid-btn').textContent = gridVisible ? 'Hide Grid' : 'Show Grid';
}

// Call this before exporting SVG to hide the grid
export function hideGridForExport() {
  document.getElementById('grid').style.display = 'none';
}
// Call this after export to restore grid
export function showGridAfterExport() {
  if (gridVisible) document.getElementById('grid').style.display = '';
}
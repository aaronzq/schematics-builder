import { GRID_SIZE, GRID_EXTEND_FACTOR } from './constants.js';

let gridVisible = true;

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
  const gridSize = GRID_SIZE*20;
  const extend = GRID_EXTEND_FACTOR;

  // Extend grid to cover (1 + 2*extend)x the viewBox in all directions
  const gridAreaX = vbX - vbWidth * extend;
  const gridAreaY = vbY - vbHeight * extend;
  const gridAreaWidth = vbWidth * (1 + 2 * extend);
  const gridAreaHeight = vbHeight * (1 + 2 * extend);

  const firstGridX = Math.floor(gridAreaX / gridSize) * gridSize;
  const firstGridY = Math.floor(gridAreaY / gridSize) * gridSize;
  const lastGridX = Math.ceil((gridAreaX + gridAreaWidth) / gridSize) * gridSize;
  const lastGridY = Math.ceil((gridAreaY + gridAreaHeight) / gridSize) * gridSize;

  // Draw vertical grid lines
  for (let x = firstGridX; x <= lastGridX; x += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', gridAreaY);
    line.setAttribute('x2', x);
    line.setAttribute('y2', gridAreaY + gridAreaHeight);
    line.setAttribute('stroke', '#e0e0e0');
    line.setAttribute('stroke-width', '1');
    gridGroup.appendChild(line);
  }

  // Draw horizontal grid lines
  for (let y = firstGridY; y <= lastGridY; y += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', gridAreaX);
    line.setAttribute('y1', y);
    line.setAttribute('x2', gridAreaX + gridAreaWidth);
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
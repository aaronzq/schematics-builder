import { downloadSchematicJSON, promptImportSchematicJSON } from './componentManager.js';
// import { resetCanvas } from './componentManager.js';

window.addEventListener('DOMContentLoaded', () => {
	const exportBtn = document.getElementById('export-schematic-btn');
	if (exportBtn) {
		exportBtn.addEventListener('click', downloadSchematicJSON);
	}
	const importBtn = document.getElementById('import-schematic-btn');
	if (importBtn) {
		importBtn.addEventListener('click', promptImportSchematicJSON);
	}
	const resetBtn = document.getElementById('reset-canvas-btn');
	if (resetBtn) {
		resetBtn.addEventListener('click', () => {
			window.location.reload();
		});
	}
});


import { enableCanvasPan, enableCanvasZoom } from './viewportManager.js';
// Enable right mouse drag-to-pan and mouse wheel zoom after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	enableCanvasPan();
	enableCanvasZoom();
});


import './eventHandler.js'; // This will initialize the app when DOM loads


import { drawGrid, toggleGrid } from './grid.js';

window.addEventListener('resize', drawGrid);
document.getElementById('toggle-grid-btn').addEventListener('click', toggleGrid);


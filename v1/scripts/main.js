import { downloadSchematicJSON, promptImportSchematicJSON } from './componentManager.js';
import { enableCanvasPan, enableCanvasZoom } from './viewportManager.js';
import { galleryJsonPaths, renderGallery } from './gallery.js';
import { initComponentPreview } from './componentPreview.js';
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

	// Render gallery images dynamically
	renderGallery();

	// Initialize component preview tooltips
	initComponentPreview();

	// Add click listeners to gallery images for schematic import
	const galleryDiv = document.getElementById('gallery-images');
	if (galleryDiv) {
		const imgs = galleryDiv.getElementsByTagName('img');

		async function importSchematicFromFile(jsonPath) {
			try {
				const response = await fetch(jsonPath);
				if (!response.ok) throw new Error('File not found: ' + jsonPath);
				const schematic = await response.json();
				// Use the importSchematicFromJSON function from componentManager.js
				const mod = await import('./componentManager.js');
				mod.importSchematicFromJSON(schematic);
			} catch (err) {
				alert('Failed to load schematic: ' + err.message);
			}
		}

		for (let i = 0; i < imgs.length; i++) {
			const img = imgs[i];
			img.style.cursor = 'pointer';
			img.title = 'Click to import this schematic.';
			img.onclick = () => importSchematicFromFile(galleryJsonPaths[i]);
		}
	}
});

// Enable right mouse drag-to-pan and mouse wheel zoom after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	enableCanvasPan();
	enableCanvasZoom();
});

import './eventHandler.js'; // This will initialize the app when DOM loads


import { drawGrid, toggleGrid } from './grid.js';

window.addEventListener('resize', drawGrid);
document.getElementById('toggle-grid-btn').addEventListener('click', toggleGrid);


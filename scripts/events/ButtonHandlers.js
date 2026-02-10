import {
	addComponent,
	componentManager
} from '../components/index.js';
import { removeRotationHandle } from './RotationHandle.js';
import { removeScaleHandle } from './ScaleHandle.js';
import { removeArrowHandle } from './ArrowHandle.js';
import { canvas } from '../Canvas.js';
import { updateRays } from '../rays/DrawRays.js';
import { toggleApertureRays } from '../rays/ApertureRays.js';
import { toggleTraceLines } from '../rays/TraceLines.js';

export function setupComponentButtons() {
  const componentMenu = document.querySelector('.component-menu');
  if (!componentMenu) return;

  componentMenu.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-component]');
    if (button) {
      const type = button.dataset.component;
      addComponent(type);
    }
  });

  console.log('Component buttons initialized');
}

export function setupActionButtons() {
  // Delete button
  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const selected = componentManager.getSelectedComponent();
      if (selected) {
        componentManager.deleteComponent(selected.id);
        removeRotationHandle();
        removeScaleHandle();
        removeArrowHandle();
        updateRays();
      }
    });
  }

  // Flip horizontal button
  const flipHorizontalBtn = document.getElementById('flip-horizontal-btn');
  if (flipHorizontalBtn) {
    flipHorizontalBtn.addEventListener('click', () => {
      const selected = componentManager.getSelectedComponent();
      if (selected) {
        componentManager.flipComponentHorizontal(selected.id);
      }
    });
  }

  // Flip vertical button
  const flipVerticalBtn = document.getElementById('flip-vertical-btn');
  if (flipVerticalBtn) {
    flipVerticalBtn.addEventListener('click', () => {
      const selected = componentManager.getSelectedComponent();
      if (selected) {
        componentManager.flipComponentVertical(selected.id);
      }
    });
  }

  // Hide component button
  const hideComponentBtn = document.getElementById('hide-component-btn');
  if (hideComponentBtn) {
    hideComponentBtn.addEventListener('click', () => {
      const selected = componentManager.getSelectedComponent();
      if (selected) {
        componentManager.hideComponent(selected.id);
      }
    });
  }

  // Show component button
  const showComponentBtn = document.getElementById('show-component-btn');
  if (showComponentBtn) {
    showComponentBtn.addEventListener('click', () => {
      const selected = componentManager.getSelectedComponent();
      if (selected) {
        componentManager.showComponent(selected.id);
      }
    });
  }

  // Show all components button
  const showAllComponentsBtn = document.getElementById('show-all-components-btn');
  if (showAllComponentsBtn) {
    showAllComponentsBtn.addEventListener('click', () => {
      componentManager.showAllComponents();
    });
  }

  // Group button
  const groupBtn = document.getElementById('group-btn');
  if (groupBtn) {
    groupBtn.addEventListener('click', () => {
      if (componentManager.groupSelectedComponents()) {
        // Refresh display
        const selectedIds = Array.from(componentManager.selectedIds);
        componentManager.selectMultiple(selectedIds);
      }
    });
  }

  // Ungroup button
  const ungroupBtn = document.getElementById('ungroup-btn');
  if (ungroupBtn) {
    ungroupBtn.addEventListener('click', () => {
      componentManager.ungroupSelectedComponents();
    });
  }

  // Toggle grid button
  const toggleGridBtn = document.getElementById('toggle-grid-btn');
  if (toggleGridBtn) {
    toggleGridBtn.addEventListener('click', () => {
      canvas.toggleGrid();
    });
  }

  // Toggle trace lines button
  const traceBtn = document.getElementById('trace-btn');
  if (traceBtn) {
    traceBtn.addEventListener('click', () => {
      toggleTraceLines();
    });
  }

  // Toggle aperture rays button
  const raysToggleBtn = document.getElementById('rays-toggle-btn');
  if (raysToggleBtn) {
    raysToggleBtn.addEventListener('click', () => {
      toggleApertureRays();
    });
  }

  console.log('Action buttons initialized');
}


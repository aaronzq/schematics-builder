import {
	addComponent,
	componentManager
} from '../components/index.js';
import { removeRotationHandle } from './RotationHandle.js';
import { removeScaleHandle } from './ScaleHandle.js';
import { removeArrowHandle } from './ArrowHandle.js';
import { canvas } from '../Canvas.js';

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

  // Toggle grid button
  const toggleGridBtn = document.getElementById('toggle-grid-btn');
  if (toggleGridBtn) {
    toggleGridBtn.addEventListener('click', () => {
      canvas.toggleGrid();
    });
  }

  console.log('Action buttons initialized');
}


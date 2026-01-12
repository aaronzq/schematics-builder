import {
	addComponent
} from '../components/index.js';

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

  console.log('✅ Component buttons initialized');
}


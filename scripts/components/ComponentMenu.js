import { components } from './ComponentLibrary.js';

/**
 * Build the component sidebar menu dynamically from component definitions.
 * Groups components by their `category` field (preserving insertion order).
 * Injects the generated DOM into #component-menu-root, then wires up
 * category folding. Call this once before setupComponentButtons().
 */
export function buildComponentMenu() {
  const root = document.getElementById('component-menu-root');
  if (!root) {
    console.warn('buildComponentMenu: #component-menu-root not found');
    return;
  }

  // Group components by category, preserving insertion order
  const categoryMap = new Map();
  for (const [type, def] of Object.entries(components)) {
    const cat = def.category ?? 'Misc';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat).push({ type, label: def.label ?? type });
  }

  // Build DOM for each category
  for (const [category, items] of categoryMap) {
    const categoryId = category.toLowerCase().replace(/\s+/g, '-');

    const menuDiv = document.createElement('div');
    menuDiv.className = 'component-menu';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.setAttribute('data-category', categoryId);
    header.innerHTML =
      `<p class="category-title">${category}</p>` +
      `<span class="material-symbols-outlined category-icon">expand_more</span>`;
    menuDiv.appendChild(header);

    const content = document.createElement('div');
    content.className = 'category-content';
    content.setAttribute('data-category-content', categoryId);

    for (const { type, label } of items) {
      const btn = document.createElement('button');
      btn.setAttribute('data-component', type);
      btn.textContent = label;
      content.appendChild(btn);
    }

    menuDiv.appendChild(content);
    root.appendChild(menuDiv);
  }

  // Wire up category folding for the newly created headers
  root.querySelectorAll('.category-header').forEach(header => {
    header.addEventListener('click', () => {
      const categoryId = header.getAttribute('data-category');
      const content = root.querySelector(`[data-category-content="${categoryId}"]`);
      if (content) {
        header.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
      }
    });
  });
}

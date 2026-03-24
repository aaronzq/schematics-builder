import { components } from './ComponentLibrary.js';
import { generateSnapshot } from './ComponentSnapshot.js';
import { deleteUserComponent } from './UserComponentStore.js';

// Module-level flag so the 'user-components-changed' listener is only added once.
let menuListenerAdded = false;

/**
 * Build (or rebuild) the component sidebar menu dynamically from component
 * definitions.  Groups components by their `category` field (preserving
 * insertion order).  Injects the generated DOM into #component-menu-root,
 * then wires up category folding.
 *
 * Safe to call multiple times — clears the root before re-rendering.
 * Previously known as `buildComponentMenu`; that name is kept as an alias
 * for backward compatibility.
 */
export function refreshSidebarMenu() {
  const root = document.getElementById('component-menu-root');
  if (!root) {
    console.warn('refreshSidebarMenu: #component-menu-root not found');
    return;
  }

  // Clear existing menu so a re-call starts from scratch.
  root.innerHTML = '';

  // Group components by category, preserving insertion order.
  const categoryMap = new Map();
  for (const [type, def] of Object.entries(components)) {
    const cat = def.category ?? 'Misc';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat).push({ type, def });
  }

  // Build DOM for each category.
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

    for (const { type, def } of items) {
      const label = def.label ?? type;

      const btn = document.createElement('button');
      btn.setAttribute('data-component', type);

      // ── Thumbnail ────────────────────────────────────────────────────────
      try {
        const svgEl = generateSnapshot(def);
        if (svgEl) {
          const thumbDiv = document.createElement('div');
          thumbDiv.className = 'component-thumbnail';
          thumbDiv.appendChild(svgEl);
          btn.appendChild(thumbDiv);
        }
      } catch (err) {
        console.warn(`[ComponentMenu] thumbnail failed for "${type}":`, err);
      }

      // ── Label ────────────────────────────────────────────────────────────
      const labelSpan = document.createElement('span');
      labelSpan.className = 'component-label';
      labelSpan.textContent = label;
      btn.appendChild(labelSpan);

      // ── Delete button (user composites only) ─────────────────────────────
      if (def.isBuiltIn === false) {
        const delBtn = document.createElement('button');
        delBtn.className = 'component-delete-btn';
        delBtn.setAttribute('data-component-key', type);
        delBtn.setAttribute('title', `Delete "${label}"`);
        delBtn.textContent = '×';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteUserComponent(type);
        });
        btn.appendChild(delBtn);
      }

      content.appendChild(btn);
    }

    menuDiv.appendChild(content);
    root.appendChild(menuDiv);
  }

  // Wire up category folding for the newly created headers.
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

  // Listen for user-component changes and rebuild — registered only once.
  if (!menuListenerAdded) {
    document.addEventListener('user-components-changed', () => refreshSidebarMenu());
    menuListenerAdded = true;
  }
}

// Backward-compatibility alias so existing callers of buildComponentMenu() keep working.
export const buildComponentMenu = refreshSidebarMenu;

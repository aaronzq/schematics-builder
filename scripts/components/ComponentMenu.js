// Setup category folding in sidebar
export function setupCategoryFolding() {
  const categoryHeaders = document.querySelectorAll('.category-header');
  
  categoryHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const category = header.getAttribute('data-category');
      const content = document.querySelector(`[data-category-content="${category}"]`);
      
      if (content) {
        header.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
      }
    });
  });
}



// Example images (replace with your own image paths)
export const galleryImages = [
  { src: 'img/Bai_Lu_et_al_nm2024.svg', alt: 'Example Drawing 1' },
  { src: 'img/Bai_Lu_et_al_nm2024.svg', alt: 'Example Drawing 2' },
  { src: 'img/Bai_Lu_et_al_nm2024.svg', alt: 'Example Drawing 3' }
];

// Specify the JSON file path for each image (order matters)
export const galleryJsonPaths = [
  'examples/Bai_Lu_et_al_nm2024.json',
  'examples/Bai_Lu_et_al_nm2024.json',
  'examples/Bai_Lu_et_al_nm2024.json'
];

// Dynamically render the gallery images into the gallery-images div
export function renderGallery() {
  const galleryDiv = document.getElementById('gallery-images');
  if (!galleryDiv) return;
  galleryDiv.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    if (i < galleryImages.length) {
      const img = document.createElement('img');
      img.src = galleryImages[i].src;
      img.alt = galleryImages[i].alt;
      img.style.width = 'calc(33.33% - 0.33em)';
      img.style.height = 'auto';
      img.style.aspectRatio = '3/2';
      img.style.borderRadius = '8px';
      img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      img.style.background = '#fff';
      img.style.objectFit = 'contain';
      galleryDiv.appendChild(img);
    }
  }
}


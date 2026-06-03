
// Example images (replace with your own image paths)
export const galleryImages = [
  { src: 'img/Bai_Lu_et_al_nm2024.svg', alt: 'Bai_Lu_et_al_nm2024' },
  { src: 'img/Kabuli_Leyla_et_al_sr2025.svg', alt: 'Kabuli_Leyla_et_al_sr2025' },
  { src: 'img/Howe_Carmel_et_al_bioRxiv2025.svg', alt: 'Howe_Carmel_et_al_bioRxiv2025' }
];

// Specify the JSON file path for each image (order matters)
export const galleryJsonPaths = [
  'examples/Bai_Lu_et_al_nm2024.json',
  'examples/Kabuli_Leyla_et_al_sr2025.json',
  'examples/Howe_Carmel_et_al_bioRxiv2025.json'
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


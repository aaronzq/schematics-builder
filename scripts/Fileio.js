
// Setup filename editor to work like Google Docs/Slides
export function setupFilenameEditor() {
  const filenameInput = document.querySelector('.filename-text');
  
  if (filenameInput) {
    // Prevent Enter key from submitting or creating new lines
    filenameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        filenameInput.blur(); // Remove focus when Enter is pressed
      }
    });
    
    // Select all text when focused (like Google Docs)
    filenameInput.addEventListener('focus', () => {
      setTimeout(() => filenameInput.select(), 0);
    });
    
    // Prevent multi-line paste
    filenameInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
      const start = filenameInput.selectionStart;
      const end = filenameInput.selectionEnd;
      const currentValue = filenameInput.value;
      filenameInput.value = currentValue.substring(0, start) + cleanText + currentValue.substring(end);
      filenameInput.setSelectionRange(start + cleanText.length, start + cleanText.length);
    });
  }
}

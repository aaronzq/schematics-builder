export function showValueDisplay(x, y, value, unit = '°') {
  const svg = document.getElementById('canvas');
  if (!svg) return;
  
  hideValueDisplay();
  
  const display = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  display.setAttribute('id', 'value-display');
  
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('cx', x);
  bg.setAttribute('cy', y - 70);
  bg.setAttribute('r', '25');
  bg.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
  bg.setAttribute('stroke', '#fbc02d');
  bg.setAttribute('stroke-width', '2');
  display.appendChild(bg);
  
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', x);
  text.setAttribute('y', y - 65);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('font-family', 'Arial, sans-serif');
  text.setAttribute('font-size', '14');
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('fill', 'white');
  text.textContent = `${value.toFixed(1)}${unit}`;
  display.appendChild(text);
  
  svg.appendChild(display);
}

export function hideValueDisplay() {
  const svg = document.getElementById('canvas');
  if (!svg) return;
  
  const display = svg.querySelector('#value-display');
  if (display) {
    display.remove();
  }
}

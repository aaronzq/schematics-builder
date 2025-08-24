import { deselectAllComponents } from '../eventHandler.js';
import { hideGridForExport, showGridAfterExport } from '../grid.js';
import { updateCanvasViewBox } from '../viewportManager.js';
// Export SVG utility for the schematic builder

// Helper: Inline computed styles as SVG attributes for color compatibility
function inlineSVGStyles(svgElement) {
    const elements = svgElement.querySelectorAll('*');
    elements.forEach(el => {
        const computed = window.getComputedStyle(el);

        // Inline fill and stroke as 6-digit hex, ignore alpha (handled by fill-opacity)
        function toHex(color) {
            const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(color);
            if (!match) return color;
            const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
            return (
                '#' +
                [r, g, b]
                    .map(x => x.toString(16).padStart(2, '0'))
                    .join('')
            );
        }

        // Fill
        if (computed.fill && computed.fill !== 'none' && !el.hasAttribute('fill')) {
            el.setAttribute('fill', toHex(computed.fill));
        }
        // Fill opacity (from rgba or opacity)
        if (computed.fill && computed.fill.startsWith('rgba')) {
            const alpha = parseFloat(computed.fill.split(',')[3]);
            if (!isNaN(alpha) && alpha < 1) el.setAttribute('fill-opacity', alpha);
        } else if (computed.opacity && computed.opacity !== '1' && !el.hasAttribute('opacity')) {
            el.setAttribute('opacity', computed.opacity);
        }

        // Stroke
        if (computed.stroke && computed.stroke !== 'none' && !el.hasAttribute('stroke')) {
            el.setAttribute('stroke', toHex(computed.stroke));
        }
        // Stroke opacity (from rgba)
        if (computed.stroke && computed.stroke.startsWith('rgba')) {
            const alpha = parseFloat(computed.stroke.split(',')[3]);
            if (!isNaN(alpha) && alpha < 1) el.setAttribute('stroke-opacity', alpha);
        }
    });
}

export function exportCanvasAsSVG() {
    deselectAllComponents();
    // Hide grid before export, remember if it was visible
    const gridGroup = document.getElementById('grid');
    const wasGridVisible = gridGroup && gridGroup.style.display !== 'none';
    
    // Ensure viewBox is updated and centered on all components
    updateCanvasViewBox();
    hideGridForExport();
    setTimeout(() => {
        const svg = document.getElementById('canvas');
        if (!svg) {
            alert('SVG canvas not found!');
            // Restore grid if needed
            if (wasGridVisible) showGridAfterExport();
            return;
        }
        // Clone and clean
        const clone = svg.cloneNode(true);
        clone.removeAttribute('style');
        clone.setAttribute('width', svg.viewBox?.baseVal?.width || svg.width?.baseVal?.value || 1200);
        clone.setAttribute('height', svg.viewBox?.baseVal?.height || svg.height?.baseVal?.value || 400);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        // Inline styles for compatibility
        inlineSVGStyles(clone);

        // Serialize and download
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(clone);
        if (!source.startsWith('<?xml')) {
            source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
        }
        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schematic-export.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Restore grid if it was visible
        if (wasGridVisible) showGridAfterExport();
    }, 10);
}

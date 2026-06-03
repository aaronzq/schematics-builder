// Component Preview System
// Handles hover tooltips with SVG previews for component buttons

import { components } from './components.js';

class ComponentPreview {
    constructor() {
        this.tooltip = null;
        this.currentButton = null;
        this.hoverTimeout = null;
        this.init();
    }

    init() {
        this.createTooltip();
        this.attachEventListeners();
    }

    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'component-preview-tooltip';
        document.body.appendChild(this.tooltip);
    }

    attachEventListeners() {
        // Find all component buttons
        const componentButtons = document.querySelectorAll('.component-menu button[onclick^="addComponent"]');
        
        componentButtons.forEach(button => {
            button.addEventListener('mouseenter', (e) => this.handleMouseEnter(e));
            button.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
            button.addEventListener('mousemove', (e) => this.updateTooltipPosition(e));
        });
    }

    handleMouseEnter(event) {
        // Clear any existing timeout
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
        }

        // Set a delay before showing the tooltip
        this.hoverTimeout = setTimeout(() => {
            const button = event.target;
            const componentType = this.extractComponentType(button);
            
            if (componentType && components[componentType]) {
                this.showPreview(button, componentType, event);
            }
        }, 300); // 300ms delay
    }

    handleMouseLeave(event) {
        // Clear timeout if mouse leaves before delay
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }

        // Hide tooltip
        this.hidePreview();
    }

    updateTooltipPosition(event) {
        if (this.tooltip.classList.contains('show')) {
            this.positionTooltip(event);
        }
    }

    extractComponentType(button) {
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/addComponent\('([^']+)'\)/);
            return match ? match[1] : null;
        }
        return null;
    }

    showPreview(button, componentType, event) {
        this.currentButton = button;
        
        // Create the preview content
        const previewSVG = this.createPreviewSVG(componentType);
        const componentName = button.textContent.trim();
        
        this.tooltip.innerHTML = `
            ${previewSVG}
            <div class="tooltip-title">${componentName}</div>
        `;

        // Position and show the tooltip
        this.positionTooltip(event);
        this.tooltip.classList.add('show');
    }

    hidePreview() {
        this.tooltip.classList.remove('show');
        this.currentButton = null;
    }

    createPreviewSVG(componentType) {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        
        // Set SVG attributes
        svg.setAttribute("width", "80");
        svg.setAttribute("height", "60");
        svg.setAttribute("viewBox", "-40 -30 80 60");
        svg.setAttribute("xmlns", svgNS);
        
        // Create a background
        const bg = document.createElementNS(svgNS, "rect");
        bg.setAttribute("x", "-40");
        bg.setAttribute("y", "-30");
        bg.setAttribute("width", "80");
        bg.setAttribute("height", "60");
        bg.setAttribute("fill", "#f9f9f9");
        svg.appendChild(bg);

        // Get the component drawing function
        const componentDef = components[componentType];
        if (componentDef && componentDef.draw) {
            try {
                // Create the component using the existing draw function
                const componentGroup = componentDef.draw(svgNS);
                
                // Scale down the component if it's too large
                this.scaleComponentForPreview(componentGroup, componentType);
                
                svg.appendChild(componentGroup);
            } catch (error) {
                console.warn(`Error creating preview for ${componentType}:`, error);
                // Fallback: show a simple placeholder
                const placeholder = document.createElementNS(svgNS, "text");
                placeholder.setAttribute("x", "0");
                placeholder.setAttribute("y", "0");
                placeholder.setAttribute("text-anchor", "middle");
                placeholder.setAttribute("dominant-baseline", "middle");
                placeholder.setAttribute("font-size", "10");
                placeholder.setAttribute("fill", "#666");
                placeholder.textContent = "Preview";
                svg.appendChild(placeholder);
            }
        }

        return svg.outerHTML;
    }

    scaleComponentForPreview(componentGroup, componentType) {
        // Define scale factors for different component types
        const scaleFactors = {
            'objective': 0.4,
            'objective2': 0.4,
            'objective3': 0.6,
            'cube': 0.7,
            'detector': 0.7,
            'polygon-scanner': 0.3,
            'voice-coil-mirror': 1.2,
            'photo-diode': 1.5,
            'lens': 0.8,
            'lens-transparent': 0.8,
            'lens2': 0.8,
            'lens3': 0.8,
            'mirror': 0.8,
            'mirror2': 0.8,
            'mirror3': 0.8,
            'plate': 0.8,
            'mask': 0.8,
            'aperture': 0.8,
            'wedge-prism': 1.0,
            'wedge-prism2': 1.0,
            'right-angle-prism': 0.9,
            'grating': 0.8,
            'doe': 0.8,
            'dmd': 0.6,
            'slm': 0.6,
            'lenslet-array': 0.8,
            'point': 2.0,
            'plane': 1.0
        };

        const scale = scaleFactors[componentType] || 0.8;
        
        if (scale !== 1.0) {
            componentGroup.setAttribute("transform", `scale(${scale})`);
        }
    }

    positionTooltip(event) {
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = event.clientX + 15;
        let top = event.clientY - tooltipRect.height - 10;

        // Adjust horizontal position if tooltip would go off-screen
        if (left + tooltipRect.width > viewportWidth) {
            left = event.clientX - tooltipRect.width - 15;
        }

        // Adjust vertical position if tooltip would go off-screen
        if (top < 0) {
            top = event.clientY + 15;
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }
}

// Initialize the component preview system
export function initComponentPreview() {
    return new ComponentPreview();
}
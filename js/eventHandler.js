// Event handlers and application initialization
// Centralized event management and application startup

import { initCanvas, updateCanvasViewBox } from './viewportManager.js';
import { 
    addComponent, 
    removeComponent, 
    getSelectedComponent, 
    setSelectedComponent,
    componentState,
    logComponentInfo
} from './componentManager.js';
import { startDrag, showHitbox } from './interactionHandler.js';
import { showArrowForComponent, removeArrowFromComponent } from './arrowDisplay.js';
import { toggleTraceLines, drawTraceLines, showTraceLines } from './traceLines.js';
import { toggleApertureRays, showApertureRays } from './apertureRays.js';

// Initialize the application
export function initApp() {
    // Initialize canvas
    initCanvas();
    
    // Set up global event listeners
    setupGlobalEventListeners();
    
    // Set up UI event listeners
    setupUIEventListeners();
}

// Set up global document event listeners
function setupGlobalEventListeners() {
    // Click outside components to deselect
    document.addEventListener('mousedown', function(e) {
        const svg = document.getElementById('canvas');
        if (e.target === svg) {
            const selectedComponent = getSelectedComponent();
            if (selectedComponent) {
                const compId = selectedComponent.getAttribute('data-id');
                componentState[compId].selected = false;
                showHitbox(selectedComponent, false);
                removeArrowFromComponent(selectedComponent);
                setSelectedComponent(null);
            }
        }
    });

    // Delete selected component on Delete/Backspace key
    document.addEventListener('keydown', function(e) {
        if ((e.key === 'Delete' || e.key === 'Backspace')) {
            deleteSelectedComponent();
        }
    });
}

// Set up UI button event listeners
function setupUIEventListeners() {
    // Delete button
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteSelectedComponent);
    }

    // Trace line button
    const traceBtn = document.getElementById('trace-btn');
    if (traceBtn) {
        traceBtn.addEventListener('click', toggleTraceLines);
    }

    // Aperture rays button
    const raysBtn = document.getElementById('rays-btn');
    if (raysBtn) {
        raysBtn.addEventListener('click', toggleApertureRays);
    }
}

// Set up component event listeners (called when a component is created)
export function setupComponentEventListeners(component, componentId) {
    // Mouse events
    component.addEventListener("mousedown", startDrag);
    
    component.addEventListener("mouseenter", function(e) {
        e.stopPropagation();
        showHitbox(component, true);
    });
    
    component.addEventListener("mouseleave", function(e) {
        e.stopPropagation();
        if (!componentState[componentId].selected) {
            showHitbox(component, false);
        }
    });
    
    // Click to select
    component.addEventListener("click", function(e) {
        e.stopPropagation();
        selectComponent(component, componentId);
    });
}

// Select a component
function selectComponent(component, componentId) {
    const selectedComponent = getSelectedComponent();
    
    // Deselect previous component
    if (selectedComponent && selectedComponent !== component) {
        const prevId = selectedComponent.getAttribute('data-id');
        componentState[prevId].selected = false;
        showHitbox(selectedComponent, false);
        removeArrowFromComponent(selectedComponent);
    }
    
    // Select new component
    setSelectedComponent(component);
    componentState[componentId].selected = true;
    showHitbox(component, true);
    showArrowForComponent(component);
    
    // Log the selected component info
    logComponentInfo(componentId);
}

// Delete the currently selected component
function deleteSelectedComponent() {
    const selectedComponent = getSelectedComponent();
    if (!selectedComponent) return;

    const compId = selectedComponent.getAttribute('data-id');
    
    // Remove component and get previous component for selection fallback
    const prevComponent = removeComponent(selectedComponent);
    removeArrowFromComponent(selectedComponent);
    
    // Select previous component if exists
    if (prevComponent) {
        const prevId = prevComponent.getAttribute('data-id');
        setSelectedComponent(prevComponent);
        componentState[prevId].selected = true;
        showHitbox(prevComponent, true);
        showArrowForComponent(prevComponent);
    } else {
        setSelectedComponent(null);
    }
    
    updateCanvasViewBox();
    
    // Update trace lines and rays if they're shown
    if (showTraceLines || showApertureRays) {
        drawTraceLines();
    }
}

// Global function to add components (called from HTML buttons)
window.addComponent = function(type) {
    const result = addComponent(type);
    if (!result) return;
    
    const { element, id } = result;
    
    // Set up event listeners for the new component
    setupComponentEventListeners(element, id);
    
    // Update canvas viewBox to include new component
    updateCanvasViewBox();
    
    // Automatically select the newly created component
    selectComponent(element, id);
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

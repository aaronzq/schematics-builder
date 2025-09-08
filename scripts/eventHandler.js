
// Event handlers and application initialization
// Centralized event management and application startup

import { initCanvas, updateCanvasViewBox } from './viewportManager.js';
import { 
    addComponent, 
    removeComponent, 
    getSelectedComponent, 
    setSelectedComponent,
    componentState,
    logComponentInfo,
    hideSelectedComponent,
    showSelectedComponent,
    showAllComponents,
    importSchematicFromJSON,
    exportSchematicToJSON
} from './componentManager.js';
import { startDrag, showHitbox } from './interactionHandler.js';
import { showArrowForComponent, removeArrowFromComponent } from './arrows.js';
import { toggleTraceLines, drawTraceLines, showTraceLines } from './traceLines.js';
import { toggleRaysIntegrated, showApertureRays, drawApertureRays, initRayShapeMenuIntegration } from './rays.js';
import { showRayShapeMenu, hideRayShapeMenu, shouldShowRayShapeMenu } from './rayMenu.js';

// Initialize the application
export function initApp() {
    // Initialize canvas
    initCanvas();
    
    // Initialize ray shape menu integration
    initRayShapeMenuIntegration(hideRayShapeMenu, showRayShapeMenu, shouldShowRayShapeMenu, getSelectedComponent);
    
    // Set up global event listeners
    setupGlobalEventListeners();
    
    // Set up UI event listeners
    setupUIEventListeners();
    
    // Check for imported examples from gallery
    checkForImportedExample();
}

// Set up global document event listeners
function setupGlobalEventListeners() {
    // Click outside components to deselect (only on left mouse button)
    document.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return; // Only left mouse button
        const svg = document.getElementById('canvas');
        if (e.target === svg) {
            const selectedComponent = getSelectedComponent();
            if (selectedComponent) {
                const compId = selectedComponent.getAttribute('data-id');
                componentState[compId].selected = false;
                showHitbox(selectedComponent, false);
                removeArrowFromComponent(selectedComponent);
                setSelectedComponent(null);
                hideRayShapeMenu(); // Hide menu when deselecting
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

// Deselect all components (for use before export)
export function deselectAllComponents() {
    const selectedComponent = getSelectedComponent();
    if (selectedComponent) {
        const compId = selectedComponent.getAttribute('data-id');
        componentState[compId].selected = false;
        showHitbox(selectedComponent, false);
        removeArrowFromComponent(selectedComponent);
        setSelectedComponent(null);
        hideRayShapeMenu();
    }
}

// Set up UI button event listeners
function setupUIEventListeners() {
    // Export SVG button
    const exportSvgBtn = document.getElementById('export-svg-btn');
    if (exportSvgBtn) {
        exportSvgBtn.addEventListener('click', () => {
            import('./utils/exportUtils.js').then(mod => {
                if (mod.exportCanvasAsSVG) {
                    mod.exportCanvasAsSVG();
                }
            });
        });
    }
    // Flip Horizontal button
    const flipHBtn = document.getElementById('flip-horizontal-btn');
    if (flipHBtn) {
        flipHBtn.addEventListener('click', () => {
            import('./componentManager.js').then(mod => {
                if (mod.flipSelectedComponentSVG) {
                    mod.flipSelectedComponentSVG('horizontal');
                }
            });
        });
    }

    // Flip Vertical button
    const flipVBtn = document.getElementById('flip-vertical-btn');
    if (flipVBtn) {
        flipVBtn.addEventListener('click', () => {
            import('./componentManager.js').then(mod => {
                if (mod.flipSelectedComponentSVG) {
                    mod.flipSelectedComponentSVG('vertical');
                }
            });
        });
    }
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

    // Integrated rays toggle button
    const raysToggleBtn = document.getElementById('rays-toggle-btn');
    if (raysToggleBtn) {
        raysToggleBtn.addEventListener('click', toggleRaysIntegrated);
    }

    // Hide component button
    const hideComponentBtn = document.getElementById('hide-component-btn');
    if (hideComponentBtn) {
        hideComponentBtn.addEventListener('click', hideSelectedComponent);
    }

    // Show component button
    const showComponentBtn = document.getElementById('show-component-btn');
    if (showComponentBtn) {
        showComponentBtn.addEventListener('click', showSelectedComponent);
    }

    // Show all components button
    const showAllComponentsBtn = document.getElementById('show-all-components-btn');
    if (showAllComponentsBtn) {
        showAllComponentsBtn.addEventListener('click', showAllComponents);
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
        selectComponent(component, componentId, true); // showMenu = true for manual clicks
    });
}

// Select a component
function selectComponent(component, componentId, showMenu = true) {
    const selectedComponent = getSelectedComponent();
    
    // Hide ray shape menu from previous selection
    hideRayShapeMenu();
    
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
    
    // Show ray shape menu if appropriate and explicitly requested
    if (showMenu && shouldShowRayShapeMenu(component)) {
        showRayShapeMenu(component);
    }
    
    // Log the selected component info
    logComponentInfo(componentId);
}

// Delete the currently selected component
function deleteSelectedComponent() {
    const selectedComponent = getSelectedComponent();
    if (!selectedComponent) return;

    const compId = selectedComponent.getAttribute('data-id');
    
    // Hide ray shape menu
    hideRayShapeMenu();
    
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
        if (showApertureRays) {
            drawApertureRays();
        }
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
    selectComponent(element, id, false); // showMenu = false for automatic selection
};

// Global function to save canvas and navigate (called from HTML links)
window.saveCanvasAndNavigate = function(url) {
    try {
        const currentSchematic = exportSchematicToJSON();
        sessionStorage.setItem('savedCanvas', JSON.stringify(currentSchematic));
        window.location.href = url;
    } catch (err) {
        console.error('Failed to save canvas state:', err);
        // Navigate anyway
        window.location.href = url;
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Check for imported examples from gallery
async function checkForImportedExample() {
    const importedFile = sessionStorage.getItem('importExample');
    if (importedFile) {
        sessionStorage.removeItem('importExample'); // Clear the stored value
        
        try {
            const response = await fetch(`examples/${importedFile}`);
            if (!response.ok) throw new Error('File not found: ' + importedFile);
            const schematic = await response.json();
            
            // Import the schematic
            await importSchematicFromJSON(schematic);
            console.log('Successfully imported example:', importedFile);
        } catch (err) {
            console.error('Failed to load example schematic:', err);
            alert('Failed to load example: ' + err.message);
        }
    } else {
        // Check for saved canvas state from gallery navigation
        const savedCanvas = sessionStorage.getItem('savedCanvas');
        if (savedCanvas) {
            sessionStorage.removeItem('savedCanvas'); // Clear the stored value
            
            try {
                const schematic = JSON.parse(savedCanvas);
                await importSchematicFromJSON(schematic);
                console.log('Successfully restored previous canvas state');
            } catch (err) {
                console.error('Failed to restore canvas state:', err);
            }
        }
    }
}

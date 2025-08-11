// Component hierarchy management
// Handles parent-child relationships and hierarchy operations

import { showTraceLines, drawTraceLines } from '../traceLines.js';

/**
 * Update component hierarchy when adding a new component
 * @param {number} compId - New component ID
 * @param {HTMLElement} selectedComponent - Parent component (if any)
 * @param {object} componentState - Global component state
 */
export function updateComponentHierarchy(compId, selectedComponent, componentState) {
    if (selectedComponent) {
        const parentId = parseInt(selectedComponent.getAttribute('data-id'));
        
        // Set parent-child relationship
        componentState[compId].parentId = parentId;
        componentState[parentId].children.push(compId);
        
        console.log(`Component ${compId} (${componentState[compId].type}) added as child of Component ${parentId} (${componentState[parentId].type})`);
        
        // Update trace lines if they're enabled
        if (showTraceLines) {
            drawTraceLines();
        }
    } else {
        // First component or no selection - this is a root component
        componentState[compId].parentId = null;
        console.log(`Component ${compId} (${componentState[compId].type}) created as root component (no parent)`);
        
        // Update trace lines if they're enabled
        if (showTraceLines) {
            drawTraceLines();
        }
    }
}

/**
 * Clean up component hierarchy when removing a component
 * @param {number} compIdNum - Component ID to remove
 * @param {object} componentState - Global component state
 */
export function cleanupComponentHierarchy(compIdNum, componentState) {
    const componentToRemove = componentState[compIdNum];
    if (!componentToRemove) return;

    // Remove this component from its parent's children array
    if (componentToRemove.parentId !== null) {
        const parentState = componentState[componentToRemove.parentId];
        if (parentState) {
            const childIndex = parentState.children.indexOf(compIdNum);
            if (childIndex > -1) {
                parentState.children.splice(childIndex, 1);
                console.log(`Removed Component ${compIdNum} from parent ${componentToRemove.parentId}'s children`);
            }
        }
    }

    // For all children of this component, remove their parent reference
    if (componentToRemove.children && componentToRemove.children.length > 0) {
        componentToRemove.children.forEach(childId => {
            const childState = componentState[childId];
            if (childState) {
                childState.parentId = null;
                console.log(`Component ${childId} parent reference cleared (was child of deleted ${compIdNum})`);
            }
        });
    }

    console.log(`Component ${compIdNum} (${componentToRemove.type}) removed from hierarchy`);
    
    // Update trace lines if they're enabled
    if (showTraceLines) {
        drawTraceLines();
    }
}

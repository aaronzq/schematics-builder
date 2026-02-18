import { componentManager } from '../components/ComponentManager.js';
import { DEFAULT_SOLID_RAY_COLOR, DEFAULT_RAY_POLYGON_OPACITY } from '../config.js';

// Ray visibility settings
export let showApertureRays = true;

/**
 * Draw aperture rays connecting parent-child component relationships.
 * Creates semi-transparent polygons connecting aperture points.
 */
export function drawApertureRays() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;
    
    // Remove existing aperture rays
    hideApertureRays();
    
    // Create aperture rays group
    const rayGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    rayGroup.setAttribute("id", "aperture-rays");
    
    // Iterate through all components
    componentManager.components.forEach((component) => {
        // Skip if component has no parent
        if (component.parent === null) return;
        
        const parentComponent = componentManager.getComponent(component.parent);
        if (!parentComponent) return;
        
        // Get aperture points in world coordinates
        const childWorldPoints = component.getAperturePointsWorld();
        const parentWorldPoints = parentComponent.getAperturePointsWorld();

        if (!childWorldPoints || childWorldPoints.length < 2) return;
        if (!parentWorldPoints || parentWorldPoints.length < 2) return;

        const childUpper = childWorldPoints[0];
        const childLower = childWorldPoints[1];
        const parentUpper = parentWorldPoints[0];
        const parentLower = parentWorldPoints[1];
        
        // Draw collimated ray (rectangle connecting parent apertures to child apertures)
        // Upper parent → Upper child, Lower parent → Lower child
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const points = `${parentUpper.x},${parentUpper.y} ${childUpper.x},${childUpper.y} ${childLower.x},${childLower.y} ${parentLower.x},${parentLower.y}`;
        polygon.setAttribute("points", points);
        polygon.setAttribute("fill", component.rayPolygonColor || DEFAULT_SOLID_RAY_COLOR);
        polygon.setAttribute("fill-opacity", component.rayPolygonOpacity ?? DEFAULT_RAY_POLYGON_OPACITY);
        polygon.setAttribute("stroke", "none");
        polygon.setAttribute("pointer-events", "none");
        
        rayGroup.appendChild(polygon);
    });
    
    // Insert aperture rays before schematics group so they appear behind components
    const schematicsGroup = document.getElementById("schematics");
    if (schematicsGroup) {
        canvas.insertBefore(rayGroup, schematicsGroup);
    } else {
        canvas.appendChild(rayGroup);
    }
}

/**
 * Hide aperture rays by removing the group from the canvas.
 */
export function hideApertureRays() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;
    
    const rayGroup = canvas.querySelector("#aperture-rays");
    if (rayGroup) {
        rayGroup.remove();
    }
}

/**
 * Toggle aperture rays visibility.
 */
export function toggleApertureRays() {
    showApertureRays = !showApertureRays;
    
    if (showApertureRays) {
        drawApertureRays();
    } else {
        hideApertureRays();
    }
}


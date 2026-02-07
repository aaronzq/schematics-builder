
import { componentManager } from './ComponentManager.js';
import { updateRays } from '../rays/DrawRays.js';

export function addComponent(type) {
  try {
    componentManager.addComponent(type);
    updateRays();
    return null;
  } catch (error) {
    console.error(`Failed to add component: ${error.message}`);
    return null;
  }
}

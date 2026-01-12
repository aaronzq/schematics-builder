
import { componentManager } from './ComponentManager.js';

export function addComponent(type) {
  try {
    componentManager.addComponent(type);
    return null;
  } catch (error) {
    console.error(`❌ Failed to add component: ${error.message}`);
    return null;
  }
}

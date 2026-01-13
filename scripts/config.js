/**
 * Application configuration and constants
 * Centralized configuration values used across all modules
 */

// ===== Component defaults =====
export const DEFAULT_APERTURE_RADIUS = 15;  // Default aperture radius for components
export const DEFAULT_CONE_ANGLE = 0;        // Default cone angle in degrees (0 = collimated)

// ===== Component spacing and positioning =====
export const GRID_SIZE = 2.5;
export const COMPONENT_SPACING = 150;

// ===== Arrow/positioning handle configuration =====
export const ARROW_COLOR = '#2196F3';
export const ARROW_STROKE_WIDTH = 2;
export const ARROW_HANDLE_RADIUS = 3;
export const ARROW_TIP_SNAP_SIZE = 2.5;

// ===== Component rotation handle =====
export const ROTATION_SNAP_INCREMENT = 2.5;
export const ROTATION_HANDLE_DISTANCE = 50;
export const ROTATION_HANDLE_RADIUS = 5;
export const ROTATION_HANDLE_COLOR = '#ffba0c';

// ===== Component scale handle =====
export const SCALE_HANDLE_DISTANCE = 50;
export const SCALE_HANDLE_RADIUS = 5;
export const SCALE_HANDLE_COLOR = '#2196F3';
export const SCALE_SNAP_INCREMENT = 0.1;
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.0;

// ===== Ray rendering =====
export const DEFAULT_SOLID_RAY_COLOR = '#00ffff';
export const DEFAULT_RAY_POLYGON_OPACITY = 0.2;

// ===== Component visibility =====
export const HIDDEN_COMPONENT_OPACITY = 0;
export const VISIBLE_COMPONENT_OPACITY = 1.0;

// ===== Canvas and viewport =====
export const MIN_CANVAS_WIDTH = 400;
export const MIN_CANVAS_HEIGHT = 300;
export const CANVAS_PADDING_PERCENT = 0.1;
export const MIN_CANVAS_PADDING = 50;

// ===== Grid configuration =====
export const GRID_EXTEND_FACTOR = 5;

// ===== Debug visualization =====
export const SHOW_DEBUG_DRAWING = false;
export const UP_VECTOR_LENGTH = 60;
export const FORWARD_VECTOR_LENGTH = 60;
export const CENTER_MARKER_RADIUS = 2;
export const APERTURE_POINT_RADIUS = 3;
export const LOWER_APERTURE_POINT_RADIUS = 2;

// ===== Component defaults =====
export const DEFAULT_COMPONENT_VISIBLE = true;
export const DEFAULT_COMPONENT_FLIP_X = false;
export const DEFAULT_COMPONENT_FLIP_Y = false;
export const DEFAULT_COMPONENT_ROTATION = 0;

// ===== Ray shapes =====
export const RAY_SHAPES = {
  COLLIMATED: 'collimated',
  DIVERGENT: 'divergent',
  CONVERGENT: 'convergent',
  MANUAL: 'manual'
};

// ===== Component type aliases =====
export const COMPONENT_TYPES = {
  POINT: 'point',
  PLANE: 'plane',
  LENS: 'lens',
  MIRROR: 'mirror',
  OBJECTIVE: 'objective',
  DETECTOR: 'detector',
  APERTURE: 'aperture',
  DOE: 'doe',
  GRATING: 'grating',
  PRISM: 'wedge-prism',
  MASK: 'mask',
  CUBE: 'cube',
  // Add more as needed
};

// ===== Viewport configuration =====
export const VIEWPORT_CONFIG = {
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 10,
  ZOOM_STEP: 0.1,
  PAN_SPEED: 1.0
};

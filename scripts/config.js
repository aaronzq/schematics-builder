/**
 * Application configuration and constants
 * Centralized configuration values used across all modules
 */

// ===== Canvas and viewport =====
export const MIN_CANVAS_WIDTH = 400;
export const MIN_CANVAS_HEIGHT = 300;
export const CANVAS_PADDING_PERCENT = 0.2;
export const MIN_CANVAS_PADDING = 200;

// ===== Zoom/ViewBox limits =====
export const MIN_VIEWBOX_WIDTH = 100;
export const MIN_VIEWBOX_HEIGHT = 75;
export const MAX_VIEWBOX_WIDTH = 4000;
export const MAX_VIEWBOX_HEIGHT = 3000;
export const INITIAL_ZOOM = 0.25; 

// ===== Grid configuration =====
export const GRID_SIZE = 50;
export const GRID_EXTEND_FACTOR = 5;

// ===== Arrow/positioning handle configuration =====
export const ARROW_LENGTH = 150;
export const ARROW_COLOR = '#2196F3';
export const ARROW_STROKE_WIDTH = 2;
export const ARROW_HANDLE_RADIUS = 3;
export const ARROW_TIP_SNAP_SIZE = 2.5;

// ===== Component positioning =====
export const DRAGGING_SNAP_INCREMENT = 2.5;

// ===== Component rotation handle =====
export const ROTATION_SNAP_INCREMENT = 2.5;
export const ROTATION_HANDLE_DISTANCE = 50;
export const ROTATION_HANDLE_RADIUS = 5;
export const ROTATION_HANDLE_COLOR = '#ffba0c';

// ===== Component scale handle =====
export const SCALE_HANDLE_DISTANCE = 50;
export const SCALE_HANDLE_RADIUS = 5;
export const SCALE_HANDLE_COLOR = '#ffba0c';
export const SCALE_SNAP_INCREMENT = 0.1;
export const MIN_SCALE = 0.8;
export const MAX_SCALE = 2.0;

// ===== Value display =====
export const VALUE_DISPLAY_DISTANCE = 50;

// ===== Component defaults =====
export const DEFAULT_APERTURE_RADIUS = 15;  // Default aperture radius for components
export const DEFAULT_CONE_ANGLE = 0;        // Default cone angle in degrees (0 = collimated)

// ===== Ray rendering =====
export const DEFAULT_SOLID_RAY_COLOR = '#00ffff';
export const DEFAULT_RAY_POLYGON_OPACITY = 0.2;

// ===== Component visibility =====
export const HIDDEN_COMPONENT_OPACITY = 0;
export const VISIBLE_COMPONENT_OPACITY = 1.0;

// ===== Selection box configuration =====
export const SELECTION_BOX_FILL = 'rgba(33, 150, 243, 0.1)';
export const SELECTION_BOX_STROKE = '#2196F3';
export const SELECTION_BOX_STROKE_WIDTH = 2;
export const SELECTION_BOX_STROKE_DASHARRAY = '5,5';

// ===== Unified bounding box configuration =====
export const UNIFIED_BBOX_FILL = 'rgba(33, 150, 243, 0.05)';
export const UNIFIED_BBOX_STROKE = '#2196F3';
export const UNIFIED_BBOX_STROKE_WIDTH = 2.5;
export const UNIFIED_BBOX_STROKE_DASHARRAY = '10,5';
export const UNIFIED_BBOX_PADDING = 10;



// ===== Debug visualization =====
export const SHOW_DEBUG_DRAWING = true;
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

// ===== Canvas configuration =====
export const CANVAS_CONFIG = {
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 10,
  ZOOM_STEP: 0.1,
  PAN_SPEED: 1.0
};



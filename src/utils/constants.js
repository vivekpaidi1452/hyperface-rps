/**
 * Application constants
 */

// Game constants
export const GAME_CHOICES = {
  ROCK: 'rock',
  PAPER: 'paper',
  SCISSORS: 'scissors',
};

export const GAME_RESULTS = {
  WIN: 'win',
  LOSE: 'lose',
  DRAW: 'draw',
};

// UI constants
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INACTIVE: 'inactive',
};

export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

export const BUTTON_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};

// Performance constants
export const DEBOUNCE_DELAY = 300;
export const THROTTLE_DELAY = 100;
export const HEARTBEAT_INTERVAL = 30000; // 30 seconds
export const INACTIVE_THRESHOLD = 2 * 60 * 1000; // 2 minutes

// Firebase constants
export const FIREBASE_TIMEOUT = 10000; // 10 seconds

// Animation constants
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
};

// Breakpoints for responsive design
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1200,
};

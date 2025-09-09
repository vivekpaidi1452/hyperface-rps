/**
 * Performance optimization utilities
 */

/**
 * Throttle function to limit the rate of function execution
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} The throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Debounce function to delay function execution
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @param {boolean} immediate - Whether to execute immediately
 * @returns {Function} The debounced function
 */
export const debounce = (func, wait, immediate) => {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

/**
 * Memoize function results
 * @param {Function} fn - The function to memoize
 * @returns {Function} The memoized function
 */
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Check if the current environment supports Web Workers
 * @returns {boolean} Whether Web Workers are supported
 */
export const supportsWebWorkers = () => {
  return typeof Worker !== 'undefined';
};

/**
 * Check if the current environment supports Service Workers
 * @returns {boolean} Whether Service Workers are supported
 */
export const supportsServiceWorkers = () => {
  return 'serviceWorker' in navigator;
};

/**
 * Get device information for performance optimization
 * @returns {Object} Device information
 */
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android/i.test(userAgent) && !isMobile;
  const isDesktop = !isMobile && !isTablet;
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    userAgent,
    connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
  };
};

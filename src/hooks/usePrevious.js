import { useRef, useEffect } from 'react';

/**
 * Custom hook to get the previous value of a prop or state
 * @param {any} value - The current value
 * @returns {any} The previous value
 */
export const usePrevious = (value) => {
  const ref = useRef();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
};

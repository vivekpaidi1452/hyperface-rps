import React from 'react';
import './styles.css';

const LoadingSpinner = ({
  size = 'medium',
  color = 'primary',
  text = '',
  className = '',
}) => {
  return (
    <div
      className={`loading-spinner loading-spinner-${size} loading-spinner-${color} ${className}`}
    >
      <div className="spinner">
        <div className="spinner-inner"></div>
      </div>
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;

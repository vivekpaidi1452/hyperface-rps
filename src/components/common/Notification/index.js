import React, { useEffect } from 'react';
import './styles.css';

const Notification = ({
  message,
  type = 'info',
  isVisible,
  onClose,
  duration = 5000,
  showCloseButton = true,
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible || !message) return null;

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        <span className="notification-message">{message}</span>
        {showCloseButton && (
          <button
            className="notification-close"
            onClick={onClose}
            aria-label="Close notification"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default Notification;

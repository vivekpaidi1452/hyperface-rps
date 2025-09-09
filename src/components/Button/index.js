import React, { memo, useMemo } from 'react';
import './styles.css';

const Button = memo(
  ({
    children,
    className = '',
    variant = 'primary',
    size = 'medium',
    disabled = false,
    onClick,
    style = {},
    ...props
  }) => {
    const buttonClasses = useMemo(
      () =>
        [
          'button',
          `button--${variant}`,
          `button--${size}`,
          disabled ? 'button--disabled' : '',
          className,
        ]
          .filter(Boolean)
          .join(' '),
      [variant, size, disabled, className]
    );

    return (
      <button
        className={buttonClasses}
        style={style}
        onClick={onClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

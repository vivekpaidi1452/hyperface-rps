import React, { memo, useMemo } from 'react';
import './styles.css';

const Card = memo(
  ({ children, className = '', hover = false, style = {}, ...props }) => {
    const cardClasses = useMemo(
      () =>
        ['card', hover ? 'card--hover' : '', className]
          .filter(Boolean)
          .join(' '),
      [hover, className]
    );

    return (
      <div className={cardClasses} style={style} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;

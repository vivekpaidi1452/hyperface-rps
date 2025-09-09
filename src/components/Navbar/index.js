import React from 'react';
import { Button } from '../';
import './styles.css';

const Navbar = ({ isLoggedIn, onLeaveArena }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo/Brand */}
        <div className="navbar-brand">
          <div className="brand-icon">🎮</div>
          <span className="brand-text">RPS Arena</span>
        </div>

        {/* Right side - Leave Arena button (only when logged in) */}
        {isLoggedIn && (
          <div className="navbar-actions">
            <Button onClick={onLeaveArena} variant="secondary" size="small">
              ← Leave Arena
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

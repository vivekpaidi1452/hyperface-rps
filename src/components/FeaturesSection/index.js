import React from 'react';
import { Card } from '../';
import './styles.css';

const FeaturesSection = () => {
  return (
    <div className="features-section">
      <h2 className="features-title">Game Features</h2>

      <div className="features-grid">
        <Card
          className="feature-card"
          hover={true}
          style={{
            padding: '32px 24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            borderRadius: '16px',
          }}
        >
          <div className="feature-icon multiplayer-icon">
            <div className="icon-bg">
              <span className="icon">👥</span>
            </div>
          </div>
          <h3 className="feature-title">Multiplayer Battles</h3>
          <p className="feature-description">
            Play against other players in real-time across different browser
            tabs
          </p>
        </Card>

        <Card
          className="feature-card"
          hover={true}
          style={{
            padding: '32px 24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            borderRadius: '16px',
          }}
        >
          <div className="feature-icon leaderboard-icon">
            <div className="icon-bg">
              <span className="icon">🏆</span>
            </div>
          </div>
          <h3 className="feature-title">Live Leaderboard</h3>
          <p className="feature-description">
            Track your progress and compete for the top spot with visible
            rankings
          </p>
        </Card>

        <Card
          className="feature-card"
          hover={true}
          style={{
            padding: '32px 24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            borderRadius: '16px',
          }}
        >
          <div className="feature-icon matchmaking-icon">
            <div className="icon-bg">
              <span className="icon">⏰</span>
            </div>
          </div>
          <h3 className="feature-title">Smart Matchmaking</h3>
          <p className="feature-description">
            Join the waiting list when games are full and get matched
            automatically
          </p>
        </Card>
      </div>
    </div>
  );
};

export default FeaturesSection;

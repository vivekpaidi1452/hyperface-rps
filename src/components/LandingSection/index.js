import React, { useState } from 'react';
import { Card, Button } from '../';
import './styles.css';

const adjectives = [
  'Swift',
  'Bold',
  'Fierce',
  'Clever',
  'Brave',
  'Sharp',
  'Quick',
  'Strong',
  'Wise',
  'Epic',
  'Legendary',
  'Mighty',
  'Noble',
  'Rapid',
  'Stealthy',
];

const nouns = [
  'Warrior',
  'Champion',
  'Fighter',
  'Gladiator',
  'Hero',
  'Guardian',
  'Knight',
  'Ranger',
  'Assassin',
  'Mage',
  'Paladin',
  'Rogue',
  'Hunter',
  'Berserker',
  'Titan',
];

const LandingSection = ({ onPlayerLogin }) => {
  const [playerName, setPlayerName] = useState('');

  const generatePlayerName = () => {
    const randomAdjective =
      adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 999) + 1;

    const generatedName = `${randomAdjective}${randomNoun}${randomNumber}`;
    setPlayerName(generatedName);
  };

  const handleEnterArena = () => {
    if (playerName.trim() && onPlayerLogin) {
      onPlayerLogin(playerName.trim());
    } else {
    }
  };

  return (
    <Card
      className="hero-card"
      style={{
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        borderRadius: '16px',
      }}
    >
      <div className="game-icon">
        <div className="icon-circle">
          <span className="icon-symbol">⚡</span>
        </div>
      </div>
      <h1 className="hero-title">Join the Game</h1>
      <p className="hero-subtitle">Enter your name to start playing</p>

      <div className="input-section">
        <label className="input-label">Player Name</label>
        <div className="input-container">
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your unique name"
            className="player-input"
          />
          <Button
            onClick={generatePlayerName}
            variant="secondary"
            size="small"
            className="generate-button"
          >
            Generate
          </Button>
        </div>
      </div>

      <Button
        onClick={handleEnterArena}
        variant="primary"
        size="xl"
        disabled={playerName.trim() === ''}
        className="enter-button"
      >
        Enter Game Arena
      </Button>
    </Card>
  );
};

export default LandingSection;

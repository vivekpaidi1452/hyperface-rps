import React from 'react';
import { Card } from '../';
import './styles.css';

const HowItWorksSection = () => {
  const steps = [
    {
      number: '01',
      title: 'Enter Your Name',
      description:
        'Create a unique player name or use our generator to get a cool gaming alias',
      icon: '👤',
    },
    {
      number: '02',
      title: 'Join the Arena',
      description:
        'Click "Enter Game Arena" to join the multiplayer battle lobby',
      icon: '⚔️',
    },
    {
      number: '03',
      title: 'Make Your Choice',
      description: 'Select Rock, Paper, or Scissors when the round begins',
      icon: '✂️',
    },
    {
      number: '04',
      title: 'Battle & Win',
      description: 'Compete against other players and climb the leaderboard',
      icon: '🏆',
    },
  ];

  return (
    <div className="how-it-works-section">
      <div className="section-header">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">
          Get started in just 4 simple steps and join the ultimate Rock Paper
          Scissors battle arena
        </p>
      </div>

      <div className="steps-container">
        {steps.map((step, index) => (
          <Card
            key={index}
            className="step-card"
            hover={true}
            style={{
              padding: '32px 24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              borderRadius: '16px',
            }}
          >
            <div className="step-number">{step.number}</div>
            <div className="step-icon">{step.icon}</div>
            <h3 className="step-title">{step.title}</h3>
            <p className="step-description">{step.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HowItWorksSection;

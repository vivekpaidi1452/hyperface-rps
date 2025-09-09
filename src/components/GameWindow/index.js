import React, { useState, useEffect } from 'react';
import { Card, Button } from '../';
import {
  listenRoom,
  leaveGame,
  processGameResult,
  sendPlayAnotherRoundRequest,
} from '../../firebase';
import './styles.css';

const GameWindow = ({ currentPlayer, roomId, onLeaveGame }) => {
  const [roomData, setRoomData] = useState(null);
  const [playerChoice, setPlayerChoice] = useState(null);
  const [opponentChoice, setOpponentChoice] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, completed
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [playAnotherRoundRequest, setPlayAnotherRoundRequest] = useState(null);
  const [inviteSent, setInviteSent] = useState(false);

  // Game choices
  const choices = [
    { id: 'rock', emoji: '🪨', name: 'Rock' },
    { id: 'paper', emoji: '📄', name: 'Paper' },
    { id: 'scissors', emoji: '✂️', name: 'Scissors' },
  ];

  // Listen to room data
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = listenRoom(roomId, async roomData => {
      setRoomData(roomData);

      // If room was deleted (roomData is null), the other player left
      if (roomData === null) {
        // Call onLeaveGame to close the modal and return to lobby
        onLeaveGame();
        return;
      }

      if (roomData && roomData.players && roomData.gameData) {
        const gameData = roomData.gameData;
        // Get opponent name from room data
        const opponentName =
          roomData.players.find(player => player !== currentPlayer) || '';

        setPlayerChoice(gameData[`${currentPlayer}_choice`] || null);
        setOpponentChoice(gameData[`${opponentName}_choice`] || null);
        // Use player-specific result instead of general result
        setGameResult(gameData[`${currentPlayer}_result`] || null);
        setRoundNumber(gameData.roundNumber || 1);
        setPlayerScore(gameData[`${currentPlayer}_score`] || 0);
        setOpponentScore(gameData[`${opponentName}_score`] || 0);
        setGameStatus(roomData.status || 'waiting');

        // Check if waiting for opponent's choice
        const hasPlayerChoice = gameData[`${currentPlayer}_choice`];
        const hasOpponentChoice = gameData[`${opponentName}_choice`];
        setWaitingForOpponent(hasPlayerChoice && !hasOpponentChoice);

        // If both players have made choices and no result yet, process the result
        // Only the player with the lexicographically smaller name processes to avoid double processing
        if (
          hasPlayerChoice &&
          hasOpponentChoice &&
          !gameData[`${currentPlayer}_result`] &&
          roomData.status === 'playing' &&
          currentPlayer < opponentName // Only process if current player's name comes first alphabetically
        ) {
          try {
            await processGameResult(
              roomId,
              currentPlayer,
              opponentName,
              hasPlayerChoice,
              hasOpponentChoice
            );
          } catch (error) {
            console.error('Error processing game result:', error);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, currentPlayer, onLeaveGame]);

  // Listen for play another round accepted notifications
  useEffect(() => {
    const handlePlayAnotherRoundAccepted = event => {
      resetGameState();
    };

    const handlePlayAnotherRoundRequest = event => {
      setPlayAnotherRoundRequest(event.detail);
    };

    const handlePlayAnotherRoundDeclined = event => {
      setInviteSent(false);
    };

    window.addEventListener(
      'playAnotherRoundAccepted',
      handlePlayAnotherRoundAccepted
    );

    window.addEventListener(
      'playAnotherRoundRequest',
      handlePlayAnotherRoundRequest
    );

    window.addEventListener(
      'playAnotherRoundDeclined',
      handlePlayAnotherRoundDeclined
    );

    return () => {
      window.removeEventListener(
        'playAnotherRoundAccepted',
        handlePlayAnotherRoundAccepted
      );
      window.removeEventListener(
        'playAnotherRoundRequest',
        handlePlayAnotherRoundRequest
      );
      window.removeEventListener(
        'playAnotherRoundDeclined',
        handlePlayAnotherRoundDeclined
      );
    };
  }, []);

  // Get opponent name
  const getOpponentName = () => {
    if (!roomData || !roomData.players) return '';
    return roomData.players.find(player => player !== currentPlayer) || '';
  };

  // Make a choice
  const makeChoice = async choice => {
    if (playerChoice || waitingForOpponent) return;

    try {
      // console.log('Making choice:', choice);
      setPlayerChoice(choice);
      setWaitingForOpponent(true);

      // Update room with player's choice and set status to playing
      const { ref, set, get } = await import('firebase/database');
      const { db } = await import('../../firebase');
      const roomRef = ref(db, `rooms/${roomId}`);

      // Get current room data first
      const roomSnapshot = await get(roomRef);
      if (!roomSnapshot.exists()) {
        throw new Error('Room not found');
      }

      const currentRoomData = roomSnapshot.val();
      const updatedGameData = {
        ...currentRoomData.gameData,
        [`${currentPlayer}_choice`]: choice,
        roundNumber: roundNumber,
        lastUpdated: Date.now(),
      };

      // Update room with new game data and set status to playing
      await set(roomRef, {
        ...currentRoomData,
        gameData: updatedGameData,
        status: 'playing',
      });

      // console.log('Choice submitted successfully');
    } catch (error) {
      console.error('Error making choice:', error);
      setPlayerChoice(null);
      setWaitingForOpponent(false);
      alert('Failed to make choice. Please try again.');
    }
  };

  // Request to play another round
  const playAnotherRound = async () => {
    try {
      // console.log('Requesting another round');

      // Get opponent name from room data
      const opponentName = getOpponentName();

      if (!opponentName) {
        throw new Error('Opponent not found');
      }

      // Send play another round request to opponent
      await sendPlayAnotherRoundRequest(currentPlayer, opponentName, roomId);
      // console.log('Play another round request sent to:', opponentName);

      // Set invite sent state
      setInviteSent(true);
    } catch (error) {
      console.error('Error requesting another round:', error);
      alert('Failed to send request. Please try again.');
    }
  };

  // Reset game state for new round
  const resetGameState = () => {
    setPlayerChoice(null);
    setOpponentChoice(null);
    setGameResult(null);
    setWaitingForOpponent(false);
    setPlayAnotherRoundRequest(null);
    setInviteSent(false);
  };

  // Handle accepting play another round request
  const handleAcceptPlayAnotherRound = async () => {
    try {
      if (!playAnotherRoundRequest) return;

      const { acceptPlayAnotherRoundRequest } = await import('../../firebase');
      await acceptPlayAnotherRoundRequest(
        playAnotherRoundRequest.from,
        currentPlayer,
        roomId
      );

      // Reset game state for new round
      resetGameState();
      // console.log('Play another round request accepted');
    } catch (error) {
      console.error('Error accepting play another round request:', error);
      alert('Failed to accept request. Please try again.');
    }
  };

  // Handle declining play another round request
  const handleDeclinePlayAnotherRound = async () => {
    try {
      if (!playAnotherRoundRequest) return;

      const { declinePlayAnotherRoundRequest } = await import('../../firebase');
      await declinePlayAnotherRoundRequest(
        playAnotherRoundRequest.from,
        currentPlayer
      );

      // Close the game modal
      onLeaveGame();
      // console.log('Play another round request declined');
    } catch (error) {
      console.error('Error declining play another round request:', error);
      alert('Failed to decline request. Please try again.');
    }
  };

  // Leave game
  const handleLeaveGame = async () => {
    try {
      await leaveGame(currentPlayer);
      onLeaveGame();
    } catch (error) {
      console.error('Error leaving game:', error);
      alert('Failed to leave game. Please try again.');
    }
  };

  // Get result message
  const getResultMessage = () => {
    if (!gameResult) return '';

    const opponentName = getOpponentName();
    switch (gameResult) {
      case 'win':
        return `🎉 You won this round!`;
      case 'lose':
        return `😔 ${opponentName} won this round!`;
      case 'draw':
        return `🤝 It's a draw!`;
      default:
        return '';
    }
  };

  // Get choice emoji
  const getChoice = choice => {
    const choiceObj = choices.find(c => c.id === choice);
    return choiceObj;
  };

  const opponentName = getOpponentName();

  return (
    <div className="game-window">
      <div className="game-modal-content">
        <div className="game-header">
          <div className="game-title-section">
            <h1>Rock Paper Scissors</h1>
            <div className="game-info">
              <span className="round-info">Round {roundNumber}</span>
            </div>
          </div>
          <button
            className="game-modal-close"
            onClick={handleLeaveGame}
            aria-label="Close game"
          >
            ×
          </button>
        </div>

        <div className="game-content">
          {/* Score Display */}
          <Card
            className="score-card"
            style={{ padding: '20px', marginBottom: '24px' }}
          >
            <div className="score-display">
              <div className="player-score">
                <span className="player-name">{`${currentPlayer} (You)`}</span>
                <span className="score">{playerScore}</span>
              </div>
              <div className="vs">VS</div>
              <div className="opponent-score">
                <span className="player-name">{opponentName}</span>
                <span className="score">{opponentScore}</span>
              </div>
            </div>
          </Card>

          {/* Game Status */}
          {gameStatus === 'waiting' && !playerChoice && (
            <Card
              className="status-card"
              style={{ padding: '20px', marginBottom: '24px' }}
            >
              <h3>Choose your move!</h3>
              <p>Select Rock, Paper, or Scissors to start the round.</p>
            </Card>
          )}

          {waitingForOpponent && (
            <Card
              className="status-card"
              style={{ padding: '20px', marginBottom: '24px' }}
            >
              <h3>Waiting for {opponentName}...</h3>
              <p>
                You chose {getChoice(playerChoice)?.emoji}. Waiting for
                opponent's choice.
              </p>
            </Card>
          )}

          {/* Choice Buttons */}
          {!playerChoice && gameStatus !== 'completed' && (
            <Card
              className="choices-card"
              style={{ padding: '24px', marginBottom: '24px' }}
            >
              <h3>Make Your Choice</h3>
              <div className="choices-grid">
                {choices.map(choice => (
                  <Button
                    key={choice.id}
                    onClick={() => makeChoice(choice.id)}
                    variant="primary"
                    size="large"
                    className="choice-button"
                    title={choice.name}
                  >
                    <span className="choice-emoji">{choice.emoji}</span>
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Game Result */}
          {gameResult && (
            <Card
              className="result-card"
              style={{ padding: '24px', marginBottom: '24px' }}
            >
              <h3>Round Result</h3>
              <div className="result-display">
                <div className="player-result">
                  <span className="player-name">{`${currentPlayer} (You)`}</span>
                  <span className="choice-display">
                    {getChoice(playerChoice)?.emoji}{' '}
                    {getChoice(playerChoice)?.name}
                  </span>
                </div>
                <div className="vs">VS</div>
                <div className="opponent-result">
                  <span className="player-name">{opponentName}</span>
                  <span className="choice-display">
                    {getChoice(opponentChoice)?.emoji}{' '}
                    {getChoice(opponentChoice)?.name}
                  </span>
                </div>
              </div>
              <div className="result-message">{getResultMessage()}</div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="game-actions">
            {playAnotherRoundRequest ? (
              // Show Accept/Decline buttons when request is pending
              <>
                <div className="request-message">
                  <p>
                    {playAnotherRoundRequest.from} wants to play another round
                  </p>
                </div>
                <div className="action-buttons-row">
                  <Button
                    onClick={handleAcceptPlayAnotherRound}
                    variant="primary"
                    size="large"
                    style={{ marginRight: '12px' }}
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={handleDeclinePlayAnotherRound}
                    variant="secondary"
                    size="large"
                    style={{ marginRight: '12px' }}
                  >
                    Decline
                  </Button>
                  <Button
                    onClick={handleLeaveGame}
                    variant="secondary"
                    size="large"
                  >
                    Leave Game
                  </Button>
                </div>
              </>
            ) : gameResult ? (
              // Show Play Another Round button when game is completed and no request pending
              <>
                <div className="invite-status-message">
                  <p>
                    {inviteSent
                      ? 'Invite sent! Waiting for response...'
                      : 'Ready for another round?'}
                  </p>
                </div>
                <div className="action-buttons-row">
                  <Button
                    onClick={playAnotherRound}
                    variant="primary"
                    size="large"
                    disabled={inviteSent}
                    style={{ marginRight: '12px' }}
                  >
                    {inviteSent ? 'Invite Sent' : 'Play Another Round'}
                  </Button>
                  <Button
                    onClick={handleLeaveGame}
                    variant="secondary"
                    size="large"
                  >
                    Leave Game
                  </Button>
                </div>
              </>
            ) : (
              // Show only Leave Game button when no game result
              <div className="action-buttons-row">
                <Button
                  onClick={handleLeaveGame}
                  variant="secondary"
                  size="large"
                >
                  Leave Game
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameWindow;

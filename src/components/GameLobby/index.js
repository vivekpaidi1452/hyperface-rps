import React, { useState, useEffect, memo, useCallback } from 'react';
import { Card, Button } from '../';
import {
  listenPlayers,
  sendChallenge,
  listenChallenge,
  addToWaitingList,
  removeFromWaitingList,
  listenWaitingList,
} from '../../firebase';
import './styles.css';

const GameLobby = memo(({ currentPlayer, onLeaveArena }) => {
  const [players, setPlayers] = useState({});
  const [sentChallenges, setSentChallenges] = useState(new Set());
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [activeTab, setActiveTab] = useState('players');
  const [searchQuery, setSearchQuery] = useState('');
  const [waitingList, setWaitingList] = useState({});
  const [isInWaitingList, setIsInWaitingList] = useState(false);

  useEffect(() => {
    // Listen to all players
    const unsubscribePlayers = listenPlayers(playersData => {
      // console.log('Players data received:', playersData);
      setPlayers(playersData || {});
    });

    // Listen for incoming challenges
    const unsubscribeChallenge = listenChallenge(
      currentPlayer,
      challengeData => {
        // console.log('Incoming challenge data received:', challengeData);
        setIncomingChallenge(challengeData);
      }
    );

    // Listen to waiting list
    const unsubscribeWaitingList = listenWaitingList(waitingListData => {
      // console.log('Waiting list data received:', waitingListData);
      setWaitingList(waitingListData || {});
      setIsInWaitingList(!!waitingListData?.[currentPlayer]);
    });

    // Listen for challenge declined events
    const handleChallengeDeclined = event => {
      const { declinedBy } = event.detail;
      // console.log('Challenge declined by:', declinedBy);
      // Remove the declined challenge from sent challenges
      setSentChallenges(prev => {
        const newSet = new Set(prev);
        newSet.delete(declinedBy);
        return newSet;
      });
    };

    // Listen for play another round declined events
    const handlePlayAnotherRoundDeclined = event => {
      // When play another round is declined, clear all sent challenges
      // since the game has ended and players are back to lobby
      setSentChallenges(new Set());
    };

    window.addEventListener('challengeDeclined', handleChallengeDeclined);
    window.addEventListener(
      'playAnotherRoundDeclined',
      handlePlayAnotherRoundDeclined
    );

    return () => {
      unsubscribePlayers();
      unsubscribeChallenge();
      unsubscribeWaitingList();
      window.removeEventListener('challengeDeclined', handleChallengeDeclined);
      window.removeEventListener(
        'playAnotherRoundDeclined',
        handlePlayAnotherRoundDeclined
      );
    };
  }, [currentPlayer]);

  // Clear challenges for players who are no longer available
  useEffect(() => {
    if (Object.keys(players).length === 0) return;

    const now = Date.now();
    const INACTIVE_THRESHOLD = 2 * 60 * 1000; // 2 minutes

    setSentChallenges(prev => {
      const newSet = new Set();
      prev.forEach(playerUsername => {
        const player = players[playerUsername];
        if (
          player &&
          player.isActive &&
          player.username !== currentPlayer &&
          now - (player.lastSeen || 0) < INACTIVE_THRESHOLD
        ) {
          newSet.add(playerUsername);
        }
      });
      return newSet;
    });
  }, [players, currentPlayer]);

  const handleChallengePlayer = useCallback(
    async opponentUsername => {
      if (opponentUsername === currentPlayer) return;

      try {
        await sendChallenge(currentPlayer, opponentUsername);
        setSentChallenges(prev => new Set([...prev, opponentUsername]));
      } catch (error) {
        console.error('Error sending challenge:', error);
        alert('Failed to send challenge. Please try again.');
      }
    },
    [currentPlayer]
  );

  const handleJoinWaitingList = async () => {
    try {
      // console.log('Joining waiting list:', currentPlayer);
      await addToWaitingList(currentPlayer);
    } catch (error) {
      console.error('Error joining waiting list:', error);
      alert('Failed to join waiting list. Please try again.');
    }
  };

  const handleLeaveWaitingList = async () => {
    try {
      // console.log('Leaving waiting list:', currentPlayer);
      await removeFromWaitingList(currentPlayer);
    } catch (error) {
      console.error('Error leaving waiting list:', error);
      alert('Failed to leave waiting list. Please try again.');
    }
  };

  const getOnlinePlayers = () => {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 2 * 60 * 1000; // 2 minutes

    return Object.values(players).filter(
      player =>
        player.isActive &&
        player.username !== currentPlayer &&
        now - (player.lastSeen || 0) < INACTIVE_THRESHOLD
    );
  };

  const getPlayerChallengeStatus = playerUsername => {
    if (sentChallenges.has(playerUsername)) {
      return 'challenged';
    }
    // Check if this player has challenged the current user
    if (incomingChallenge && incomingChallenge.from === playerUsername) {
      return 'challenging_me';
    }
    return 'available';
  };

  const getPlayerStats = () => {
    const player = players[currentPlayer];
    return player
      ? {
          wins: player.wins || 0,
          losses: player.losses || 0,
          draws: player.draws || 0,
          roomId: player.roomId,
        }
      : { wins: 0, losses: 0, draws: 0, roomId: null };
  };

  const getArenaStats = () => {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 2 * 60 * 1000; // 2 minutes

    const allPlayers = Object.values(players);
    const onlinePlayers = allPlayers.filter(
      player =>
        player.isActive && now - (player.lastSeen || 0) < INACTIVE_THRESHOLD
    );
    const availablePlayers = onlinePlayers.filter(player => !player.roomId);
    const activeGames =
      onlinePlayers.filter(player => player.roomId).length / 2; // Divide by 2 since each game has 2 players
    const waitingPlayers = Object.values(waitingList).filter(
      player => player.status === 'waiting'
    );

    return {
      onlinePlayers: onlinePlayers.length,
      availableToPlay: availablePlayers.length,
      activeGames: Math.floor(activeGames),
      waitingPlayers: waitingPlayers.length,
    };
  };

  const getLeaderboard = () => {
    return Object.values(players)
      .filter(
        player =>
          (player.wins || 0) + (player.losses || 0) + (player.draws || 0) > 0
      )
      .map(player => ({
        ...player,
        wins: player.wins || 0,
        losses: player.losses || 0,
        draws: player.draws || 0,
        totalGames:
          (player.wins || 0) + (player.losses || 0) + (player.draws || 0),
        winRate:
          (player.wins || 0) + (player.losses || 0) + (player.draws || 0) > 0
            ? Math.round(
                ((player.wins || 0) /
                  ((player.wins || 0) +
                    (player.losses || 0) +
                    (player.draws || 0))) *
                  100
              )
            : 0,
      }))
      .sort((a, b) => {
        // Sort by win rate first, then by total wins
        if (b.winRate !== a.winRate) {
          return b.winRate - a.winRate;
        }
        return b.wins - a.wins;
      })
      .slice(0, 10);
  };

  const getAvailablePlayers = () => {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 2 * 60 * 1000; // 2 minutes

    return Object.values(players).filter(
      player =>
        player.isActive &&
        player.username !== currentPlayer &&
        !player.roomId &&
        now - (player.lastSeen || 0) < INACTIVE_THRESHOLD
    );
  };

  const getFilteredPlayers = () => {
    const onlinePlayers = getOnlinePlayers();
    if (!searchQuery) return onlinePlayers;

    return onlinePlayers.filter(player =>
      player.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getFilteredAvailablePlayers = () => {
    const availablePlayers = getAvailablePlayers();
    if (!searchQuery) return availablePlayers;

    return availablePlayers.filter(player =>
      player.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getFilteredLeaderboard = () => {
    const leaderboard = getLeaderboard();
    if (!searchQuery) return leaderboard;

    return leaderboard.filter(player =>
      player.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const playerStats = getPlayerStats();
  const arenaStats = getArenaStats();
  const onlinePlayers = getFilteredPlayers();
  const availablePlayers = getFilteredAvailablePlayers();
  const leaderboard = getFilteredLeaderboard();

  return (
    <div className="game-lobby">
      {/* Mobile Stats Section - Shows at top on mobile */}
      <div className="mobile-stats-section">
        <div className="mobile-stats-grid">
          {/* Your Stats */}
          <Card className="mobile-stats-card">
            <div className="stats-header">
              <span className="stats-icon">🏆</span>
              <h3>Your Stats</h3>
            </div>
            <div className="player-info">
              <div className="player-name">{currentPlayer}</div>
            </div>
            <div className="stats-divider"></div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{playerStats.wins}</div>
                <div className="stat-label">Wins</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{playerStats.losses}</div>
                <div className="stat-label">Losses</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{playerStats.draws}</div>
                <div className="stat-label">Draws</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {playerStats.wins + playerStats.losses + playerStats.draws}
                </div>
                <div className="stat-label">Total</div>
              </div>
            </div>
          </Card>

          {/* Arena Stats */}
          <Card className="mobile-stats-card">
            <div className="stats-header">
              <span className="stats-icon">👥</span>
              <h3>Arena Stats</h3>
            </div>
            <div className="arena-stats">
              <div className="arena-stat">
                <span className="arena-stat-label">Online</span>
                <span className="arena-stat-value">
                  {arenaStats.onlinePlayers}
                </span>
              </div>
              <div className="arena-stat">
                <span className="arena-stat-label">Available</span>
                <span className="arena-stat-value">
                  {arenaStats.availableToPlay}
                </span>
              </div>
              <div className="arena-stat">
                <span className="arena-stat-label">Games</span>
                <span className="arena-stat-value">
                  {arenaStats.activeGames}
                </span>
              </div>
              <div className="arena-stat">
                <span className="arena-stat-label">Waiting</span>
                <span className="arena-stat-value">
                  {arenaStats.waitingPlayers}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Waiting List Section for Mobile */}
        {availablePlayers.length === 0 && onlinePlayers.length > 0 && (
          <Card className="mobile-waiting-card">
            <div className="stats-header">
              <span className="stats-icon">⏳</span>
              <h3>Waiting List</h3>
            </div>
            <div className="waiting-section">
              <p>No available players to challenge</p>
              <p>All players are currently in games</p>
              {!isInWaitingList ? (
                <div className="waiting-options">
                  <p>Get notified when a player becomes available</p>
                  <Button
                    onClick={handleJoinWaitingList}
                    variant="primary"
                    size="medium"
                    style={{ marginTop: '8px' }}
                  >
                    Join Waiting List
                  </Button>
                </div>
              ) : (
                <div className="waiting-status">
                  <p>✅ You're on the waiting list!</p>
                  <p>You'll be notified when a player becomes available</p>
                  <Button
                    onClick={handleLeaveWaitingList}
                    variant="secondary"
                    size="small"
                    style={{ marginTop: '8px' }}
                  >
                    Leave Waiting List
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <div className="lobby-content">
        <div className="sidebar">
          {/* Desktop Stats - Hidden on mobile */}
          <Card
            className="stats-card desktop-stats"
            style={{ padding: '20px', marginBottom: '20px' }}
          >
            <div className="stats-header">
              <span className="stats-icon">🏆</span>
              <h3>Your Stats</h3>
            </div>
            <div className="player-info">
              <div className="player-name">{currentPlayer}</div>
            </div>
            <div className="stats-divider"></div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{playerStats.wins}</div>
                <div className="stat-label">Wins</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{playerStats.losses}</div>
                <div className="stat-label">Losses</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{playerStats.draws}</div>
                <div className="stat-label">Draws</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {playerStats.wins + playerStats.losses + playerStats.draws}
                </div>
                <div className="stat-label">Total Games</div>
              </div>
            </div>
          </Card>

          {/* Arena Stats */}
          <Card
            className="stats-card desktop-stats"
            style={{ padding: '20px' }}
          >
            <div className="stats-header">
              <span className="stats-icon">👥</span>
              <h3>Arena Stats</h3>
            </div>
            <div className="arena-stats">
              <div className="arena-stat">
                <span className="arena-stat-label">Online Players</span>
                <span className="arena-stat-value">
                  {arenaStats.onlinePlayers}
                </span>
              </div>
              <div className="arena-stat">
                <span className="arena-stat-label">Available to Play</span>
                <span className="arena-stat-value">
                  {arenaStats.availableToPlay}
                </span>
              </div>
              <div className="arena-stat">
                <span className="arena-stat-label">Active Games</span>
                <span className="arena-stat-value">
                  {arenaStats.activeGames}
                </span>
              </div>
              <div className="arena-stat">
                <span className="arena-stat-label">Waiting for Match</span>
                <span className="arena-stat-value">
                  {arenaStats.waitingPlayers}
                </span>
              </div>
            </div>
          </Card>

          {/* Waiting List Section */}
          {availablePlayers.length === 0 && onlinePlayers.length > 0 && (
            <Card
              className="stats-card desktop-stats"
              style={{ padding: '20px' }}
            >
              <div className="stats-header">
                <span className="stats-icon">⏳</span>
                <h3>Waiting List</h3>
              </div>
              <div className="waiting-section">
                <p>No available players to challenge</p>
                <p>All players are currently in games</p>
                {!isInWaitingList ? (
                  <div className="waiting-options">
                    <p>Get notified when a player becomes available</p>
                    <Button
                      onClick={handleJoinWaitingList}
                      variant="primary"
                      size="large"
                      style={{ marginTop: '8px' }}
                    >
                      Join Waiting List
                    </Button>
                  </div>
                ) : (
                  <div className="waiting-status">
                    <p>✅ You're on the waiting list!</p>
                    <p>You'll be notified when a player becomes available</p>
                    <Button
                      onClick={handleLeaveWaitingList}
                      variant="secondary"
                      size="medium"
                      style={{ marginTop: '8px' }}
                    >
                      Leave Waiting List
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="main-content">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'players' ? 'active' : ''}`}
              onClick={() => setActiveTab('players')}
            >
              <span className="tab-icon">👥</span>
              <span className="tab-text">
                Online Players ({arenaStats.onlinePlayers})
              </span>
            </button>
            <button
              className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              <span className="tab-icon">🏆</span>
              <span className="tab-text">Leaderboard</span>
            </button>
          </div>

          {/* Tab Content */}
          <Card className="tab-content" style={{ padding: '24px' }}>
            {activeTab === 'players' ? (
              <>
                <div className="content-header">
                  <h2>Online Players ({arenaStats.onlinePlayers})</h2>
                  <div className="live-indicator">
                    <span className="live-dot"></span>
                    Live
                  </div>
                </div>
                <div className="search-container">
                  <div className="search-input">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Search online players..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="players-list">
                  {onlinePlayers.length === 0 ? (
                    <div className="no-players">
                      {searchQuery
                        ? 'No players found matching your search.'
                        : 'No other players online. Wait for someone to join!'}
                    </div>
                  ) : (
                    onlinePlayers.map(player => {
                      const challengeStatus = getPlayerChallengeStatus(
                        player.username
                      );
                      return (
                        <div key={player.username} className="player-item">
                          <div className="player-main-info">
                            <div className="player-avatar">
                              <span className="avatar-text">
                                {player.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="player-details">
                              <div className="player-name">
                                {player.username}
                              </div>
                              <div className="player-stats">
                                <span className="player-wins">
                                  {player.wins} wins
                                </span>
                                {player.roomId && (
                                  <span className="player-status-badge in-game">
                                    In Game
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="player-actions">
                            {player.roomId && (
                              <Button
                                variant="secondary"
                                size="small"
                                disabled={true}
                                className="status-button"
                              >
                                In Game
                              </Button>
                            )}
                            {challengeStatus === 'available' &&
                              !player.roomId && (
                                <Button
                                  onClick={() =>
                                    handleChallengePlayer(player.username)
                                  }
                                  variant="primary"
                                  size="small"
                                  className="challenge-button"
                                >
                                  ⚡ Challenge
                                </Button>
                              )}
                            {challengeStatus === 'challenged' && (
                              <Button
                                variant="secondary"
                                size="small"
                                disabled={true}
                                className="status-button"
                              >
                                Challenge Sent
                              </Button>
                            )}
                            {challengeStatus === 'challenging_me' && (
                              <Button
                                variant="secondary"
                                size="small"
                                disabled={true}
                                className="status-button"
                              >
                                Challenging You
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="content-header">
                  <h2>Global Leaderboard</h2>
                  <div className="leaderboard-badge">
                    {leaderboard.length} Players
                  </div>
                </div>
                <div className="search-container">
                  <div className="search-input">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="leaderboard-list">
                  {leaderboard.length === 0 ? (
                    <div className="no-players">
                      {searchQuery
                        ? 'No players found matching your search.'
                        : 'No players on the leaderboard yet.'}
                    </div>
                  ) : (
                    leaderboard.map((player, index) => {
                      const rank = index + 1;
                      const isCurrentPlayer = player.username === currentPlayer;

                      return (
                        <div
                          key={player.username}
                          className={`leaderboard-card ${
                            isCurrentPlayer ? 'current-player' : ''
                          }`}
                        >
                          <div className="player">
                            <div className="rank-medal">
                              {rank <= 3 ? (
                                <span className="medal">
                                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                                </span>
                              ) : (
                                <span className="rank-num">#{rank}</span>
                              )}
                            </div>
                            <div className="info">
                              <div className="name">
                                {player.username}
                                {isCurrentPlayer && (
                                  <span className="you">You</span>
                                )}
                              </div>
                              <div className="stats">
                                {`${player.wins}W ${player.losses}L ${player.draws}D • ${player.totalGames} games • ${player.winRate}%`}
                              </div>
                            </div>
                          </div>

                          <div className="wins">
                            <span className="number">{player.wins}</span>
                            <span className="label">wins</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
});

GameLobby.displayName = 'GameLobby';

export default GameLobby;

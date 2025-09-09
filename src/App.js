import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  Navbar,
  LazyLandingSection,
  LazyFeaturesSection,
  LazyHowItWorksSection,
  LazyGameLobby,
  LazyGameWindow,
  LazyErrorBoundary,
  Notification,
} from './components';
import {
  addPlayer,
  leaveRoom,
  leaveGame,
  testFirebaseConnection,
  listenPlayer,
  listenChallenge,
  acceptChallenge,
  declineChallenge,
  listenNotifications,
  clearNotification,
  setUserInactive,
  updateUserHeartbeat,
} from './firebase';
import './App.css';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [inactiveMessage, setInactiveMessage] = useState(null);
  const [invitationNotification, setInvitationNotification] = useState(null);
  const [declineNotification, setDeclineNotification] = useState(null);
  const [roundStartNotification, setRoundStartNotification] = useState(null);
  const [
    playAnotherRoundDeclinedNotification,
    setPlayAnotherRoundDeclinedNotification,
  ] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const isVoluntaryLogoutRef = useRef(false);
  const previousRoomIdRef = useRef(null);

  // Handle player login
  const handlePlayerLogin = useCallback(async playerName => {
    try {
      // Add timeout to Firebase operation
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Firebase operation timed out')),
          10000
        )
      );

      // Add player to Firebase with timeout
      await Promise.race([addPlayer(playerName), timeoutPromise]);

      // Clear any existing notifications for this user
      await clearNotification(playerName);

      setCurrentPlayer(playerName);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error logging in player:', error);
      alert(`Failed to join the arena: ${error.message}. Please try again.`);
    }
  }, []);

  // Handle player logout
  const handlePlayerLogout = useCallback(async () => {
    try {
      isVoluntaryLogoutRef.current = true; // Set flag before logout
      if (currentPlayer) {
        await leaveRoom(currentPlayer);
        // Clear all notifications for this user
        await clearNotification(currentPlayer);
      }

      // Clear all local notification states
      setCurrentPlayer(null);
      setIsLoggedIn(false);
      setInactiveMessage(null);
      setInvitationNotification(null);
      setDeclineNotification(null);
      setRoundStartNotification(null);
      setPlayAnotherRoundDeclinedNotification(null);
      setCurrentRoomId(null);
      setIsGameModalOpen(false);

      isVoluntaryLogoutRef.current = false; // Reset flag after logout
    } catch (error) {
      console.error('Error logging out player:', error);
      isVoluntaryLogoutRef.current = false; // Reset flag on error
    }
  }, [currentPlayer]);

  // Clear inactive message
  const clearInactiveMessage = useCallback(() => {
    setInactiveMessage(null);
  }, []);

  // Handle invitation actions
  const handleAcceptInvitation = useCallback(async () => {
    if (!invitationNotification) return;

    try {
      const roomId = await acceptChallenge(
        invitationNotification.from,
        currentPlayer
      );
      setInvitationNotification(null);
      setCurrentRoomId(roomId);
      setIsGameModalOpen(true);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation. Please try again.');
    }
  }, [invitationNotification, currentPlayer]);

  const handleDeclineInvitation = useCallback(async () => {
    if (!invitationNotification) return;

    try {
      await declineChallenge(currentPlayer);
      setInvitationNotification(null);
    } catch (error) {
      console.error('Error declining invitation:', error);
      alert('Failed to decline invitation. Please try again.');
    }
  }, [invitationNotification, currentPlayer]);

  const clearDeclineNotification = useCallback(async () => {
    if (currentPlayer) {
      await clearNotification(currentPlayer);
    }
    setDeclineNotification(null);
  }, [currentPlayer]);

  const clearRoundStartNotification = useCallback(async () => {
    if (currentPlayer) {
      await clearNotification(currentPlayer);
    }
    setRoundStartNotification(null);
  }, [currentPlayer]);

  const clearPlayAnotherRoundDeclinedNotification = useCallback(() => {
    setPlayAnotherRoundDeclinedNotification(null);
  }, []);

  // Handle leaving game (but staying in arena)
  const handleLeaveGame = useCallback(async () => {
    try {
      await leaveGame(currentPlayer);
      setCurrentRoomId(null);
      setIsGameModalOpen(false);
    } catch (error) {
      console.error('Error leaving game:', error);
      alert('Failed to leave game. Please try again.');
    }
  }, [currentPlayer]);

  // Test Firebase connection on component mount
  useEffect(() => {
    testFirebaseConnection().catch(error => {
      console.error('Firebase connection test failed on mount:', error);
    });
  }, []);

  // Monitor current user's status
  useEffect(() => {
    if (!currentPlayer) return;

    const unsubscribe = listenPlayer(currentPlayer, playerData => {
      // Skip inactive message if this is a voluntary logout
      if (isVoluntaryLogoutRef.current) {
        return;
      }

      if (!playerData || !playerData.isActive) {
        // Player is inactive, redirect to home
        setInactiveMessage('Ouch! You have been logged out.');
        setCurrentPlayer(null);
        setIsLoggedIn(false);
        setCurrentRoomId(null);
        // Clear all notifications when player becomes inactive
        setInvitationNotification(null);
        setDeclineNotification(null);
        setRoundStartNotification(null);
        setPlayAnotherRoundDeclinedNotification(null);
        setIsGameModalOpen(false);
        return;
      }

      // Update room status and modal state
      const newRoomId = playerData.roomId || null;
      setCurrentRoomId(newRoomId);

      // Open modal if player enters a room, close if they leave
      if (newRoomId && !previousRoomIdRef.current) {
        setIsGameModalOpen(true);
      } else if (!newRoomId && previousRoomIdRef.current) {
        setIsGameModalOpen(false);
      }

      // Update the ref for next comparison
      previousRoomIdRef.current = newRoomId;

      // Player is still active, continue monitoring
    });

    return () => {
      unsubscribe();
    };
  }, [currentPlayer]);

  // Monitor invitations for current user
  useEffect(() => {
    if (!currentPlayer || !isLoggedIn) return;

    // Small delay to ensure any notification clearing has completed
    const timer = setTimeout(() => {
      const unsubscribe = listenChallenge(currentPlayer, challengeData => {
        setInvitationNotification(challengeData);
      });

      return () => {
        unsubscribe();
      };
    }, 100); // 100ms delay

    return () => {
      clearTimeout(timer);
    };
  }, [currentPlayer, isLoggedIn]);

  // Monitor decline notifications for current user
  useEffect(() => {
    if (!currentPlayer || !isLoggedIn) return;

    // Small delay to ensure any notification clearing has completed
    const timer = setTimeout(() => {
      const unsubscribe = listenNotifications(
        currentPlayer,
        notificationData => {
          if (
            notificationData &&
            notificationData.type === 'challenge_declined'
          ) {
            setDeclineNotification(notificationData);
            // We'll need to communicate this to GameLobby to update sent challenges
            // For now, we'll use a custom event
            window.dispatchEvent(
              new CustomEvent('challengeDeclined', {
                detail: { declinedBy: notificationData.from },
              })
            );
          } else if (
            notificationData &&
            notificationData.type === 'player_available'
          ) {
            // Player is now available to challenge
            setInvitationNotification({
              type: 'player_available',
              message: notificationData.message,
              availablePlayer: notificationData.availablePlayer,
            });
            // Clear the notification after showing the message
            setTimeout(() => {
              setInvitationNotification(null);
              clearNotification(currentPlayer);
            }, 5000);
          } else if (
            notificationData &&
            notificationData.type === 'player_left_game'
          ) {
            // Player left the game, redirect to lobby
            setInactiveMessage(
              `${notificationData.from} left the game. Returning to lobby.`
            );
            setCurrentRoomId(null);
            setIsGameModalOpen(false);
            // Clear any pending notifications when returning to lobby
            setInvitationNotification(null);
            setDeclineNotification(null);
            setRoundStartNotification(null);
            setPlayAnotherRoundDeclinedNotification(null);
            // Clear the notification after showing the message
            setTimeout(() => {
              setInactiveMessage(null);
            }, 3000);
          } else if (
            notificationData &&
            notificationData.type === 'round_started'
          ) {
            // Round started notification
            setRoundStartNotification(notificationData);
            // Auto-clear the notification after 3 seconds
            setTimeout(() => {
              setRoundStartNotification(null);
            }, 3000);
          } else if (
            notificationData &&
            notificationData.type === 'play_another_round_request'
          ) {
            // Play another round request
            // Dispatch event to GameWindow instead of showing notification
            window.dispatchEvent(
              new CustomEvent('playAnotherRoundRequest', {
                detail: notificationData,
              })
            );
          } else if (
            notificationData &&
            notificationData.type === 'play_another_round_accepted'
          ) {
            // Play another round request was accepted
            // Dispatch event to GameWindow to reset game state
            window.dispatchEvent(new CustomEvent('playAnotherRoundAccepted'));
            // Auto-clear after 3 seconds
            setTimeout(() => {
              setRoundStartNotification(null);
            }, 3000);
          } else if (
            notificationData &&
            notificationData.type === 'play_another_round_declined'
          ) {
            // Play another round request was declined
            setPlayAnotherRoundDeclinedNotification(notificationData);
            // Dispatch event to GameWindow to reset invite state
            window.dispatchEvent(new CustomEvent('playAnotherRoundDeclined'));
            // Close the game modal since the other player declined
            setCurrentRoomId(null);
            setIsGameModalOpen(false);
            // Clear any other pending notifications when game ends
            setInvitationNotification(null);
            setDeclineNotification(null);
            setRoundStartNotification(null);
            // Auto-clear after 3 seconds
            setTimeout(() => {
              setPlayAnotherRoundDeclinedNotification(null);
            }, 3000);
          }
        }
      );

      return () => {
        unsubscribe();
      };
    }, 100); // 100ms delay

    return () => {
      clearTimeout(timer);
    };
  }, [currentPlayer, isLoggedIn]);

  // Handle page refresh/close - mark user as inactive
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentPlayer) {
        // Mark user as inactive when page is about to unload
        setUserInactive(currentPlayer);
      }
    };

    // Add event listener for page refresh/close
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentPlayer]);

  // Heartbeat system to keep user active
  useEffect(() => {
    if (!currentPlayer || !isLoggedIn) return;

    const heartbeatInterval = setInterval(() => {
      updateUserHeartbeat(currentPlayer);
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [currentPlayer, isLoggedIn]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (currentPlayer) {
        leaveRoom(currentPlayer);
      }
    };
  }, [currentPlayer]);

  // Logged in view
  const LoggedInView = useMemo(
    () => (
      <div className="logged-in-container">
        <LazyErrorBoundary>
          <LazyGameLobby
            currentPlayer={currentPlayer}
            onLeaveArena={handlePlayerLogout}
          />
        </LazyErrorBoundary>

        {/* Game Modal */}
        {isGameModalOpen && currentRoomId && (
          <LazyErrorBoundary>
            <LazyGameWindow
              currentPlayer={currentPlayer}
              roomId={currentRoomId}
              onLeaveGame={handleLeaveGame}
            />
          </LazyErrorBoundary>
        )}
      </div>
    ),
    [
      currentPlayer,
      isGameModalOpen,
      currentRoomId,
      handlePlayerLogout,
      handleLeaveGame,
    ]
  );

  return (
    <div className="App">
      <Navbar isLoggedIn={isLoggedIn} onLeaveArena={handlePlayerLogout} />

      {/* Inactive Message */}
      <Notification
        message={inactiveMessage}
        type="inactive"
        isVisible={!!inactiveMessage}
        onClose={clearInactiveMessage}
        showCloseButton={true}
      />

      {/* Invitation Notification */}
      {invitationNotification && (
        <div className="invitation-notification">
          <div className="invitation-content">
            <span className="invitation-icon">
              {invitationNotification.type === 'player_available' ? '🎮' : '⚔️'}
            </span>
            <div className="invitation-text">
              <span className="invitation-title">
                {invitationNotification.type === 'player_available'
                  ? 'Player Available!'
                  : 'Challenge Received!'}
              </span>
              <span className="invitation-message">
                {invitationNotification.type === 'player_available'
                  ? invitationNotification.message
                  : `${invitationNotification.from} has challenged you to a game!`}
              </span>
            </div>
            <div className="invitation-actions">
              {invitationNotification.type === 'player_available' ? (
                <button
                  className="invitation-accept"
                  onClick={() => setInvitationNotification(null)}
                  aria-label="Dismiss notification"
                >
                  Got it!
                </button>
              ) : (
                <>
                  <button
                    className="invitation-accept"
                    onClick={handleAcceptInvitation}
                    aria-label="Accept challenge"
                  >
                    Accept
                  </button>
                  <button
                    className="invitation-decline"
                    onClick={handleDeclineInvitation}
                    aria-label="Decline challenge"
                  >
                    Decline
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decline Notification */}
      {declineNotification && (
        <div className="decline-notification">
          <div className="decline-content">
            <span className="decline-icon">😔</span>
            <div className="decline-text">
              <span className="decline-title">Challenge Declined</span>
              <span className="decline-message">
                {declineNotification.message}
              </span>
            </div>
            <button
              className="decline-close"
              onClick={clearDeclineNotification}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Round Start Notification */}
      {roundStartNotification && (
        <div className="round-start-notification">
          <div className="round-start-content">
            <span className="round-start-icon">🎮</span>
            <div className="round-start-text">
              <span className="round-start-title">New Round Started!</span>
              <span className="round-start-message">
                {roundStartNotification.message}
              </span>
            </div>
            <button
              className="round-start-close"
              onClick={clearRoundStartNotification}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Play Another Round Declined Notification */}
      {playAnotherRoundDeclinedNotification && (
        <div className="decline-notification">
          <div className="decline-content">
            <span className="decline-icon">😔</span>
            <div className="decline-text">
              <span className="decline-title">Request Declined</span>
              <span className="decline-message">
                {playAnotherRoundDeclinedNotification.message}
              </span>
            </div>
            <button
              className="decline-close"
              onClick={clearPlayAnotherRoundDeclinedNotification}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {isLoggedIn ? (
        LoggedInView
      ) : (
        <div className="container">
          <LazyErrorBoundary>
            <LazyLandingSection onPlayerLogin={handlePlayerLogin} />
          </LazyErrorBoundary>
          <LazyErrorBoundary>
            <LazyFeaturesSection />
          </LazyErrorBoundary>
          <LazyErrorBoundary>
            <LazyHowItWorksSection />
          </LazyErrorBoundary>
        </div>
      )}
    </div>
  );
};

export default App;

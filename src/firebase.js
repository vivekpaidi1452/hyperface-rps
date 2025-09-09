// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, remove, onValue, get } from 'firebase/database';

const firebaseConfig = {
  databaseURL:
    'https://hyperface-rps-default-rtdb.asia-southeast1.firebasedatabase.app/',
  apiKey: 'AIzaSyCB3nAO4GGlmUiczVL3yoPGF46t-JRMvUg',
  authDomain: 'hyperface-rps.firebaseapp.com',
  projectId: 'hyperface-rps',
  storageBucket: 'hyperface-rps.appspot.com',
  messagingSenderId: '44451146915',
  appId: '1:44451146915:web:047aad0d285ac7fe31e316',
  measurementId: 'G-YCRS79M8DB',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Test Firebase connection
export const testFirebaseConnection = () => {
  const testRef = ref(db, 'test');
  return set(testRef, { timestamp: Date.now() })
    .then(() => {
      return remove(testRef);
    })
    .catch(error => {
      console.error('Firebase connection test failed:', error);
      throw error;
    });
};

// Player management
export const addPlayer = username => {
  // console.log('Firebase addPlayer called with:', username);
  const playerRef = ref(db, `players/${username}`);

  // First get current player data to preserve wins and other data
  return get(playerRef)
    .then(snapshot => {
      if (snapshot.exists()) {
        // Player exists, update only isActive and lastSeen
        const currentData = snapshot.val();
        const updatedData = {
          ...currentData,
          isActive: true,
          lastSeen: Date.now(),
        };
        // console.log('Updating existing player data:', updatedData);
        return set(playerRef, updatedData);
      } else {
        // New player, create with default values
        const newPlayerData = {
          username,
          wins: 0,
          losses: 0,
          draws: 0,
          isActive: true,
          roomId: null,
          lastSeen: Date.now(),
        };
        // console.log('Creating new player data:', newPlayerData);
        return set(playerRef, newPlayerData);
      }
    })
    .then(() => {
      // console.log('Firebase set operation completed successfully');
      return Promise.resolve();
    })
    .catch(error => {
      console.error('Firebase set operation failed:', error);
      throw error;
    });
};

export const removePlayer = username => {
  // console.log('Setting player as inactive:', username);
  const playerRef = ref(db, `players/${username}`);

  // First get current player data to preserve wins
  return get(playerRef).then(snapshot => {
    if (snapshot.exists()) {
      const currentData = snapshot.val();
      return set(playerRef, {
        username,
        wins: currentData.wins || 0,
        isActive: false,
        roomId: null,
        lastSeen: Date.now(),
      });
    } else {
      // If player doesn't exist, create with default values
      return set(playerRef, {
        username,
        wins: 0,
        isActive: false,
        roomId: null,
        lastSeen: Date.now(),
      });
    }
  });
};

export const listenPlayers = callback =>
  onValue(ref(db, 'players'), snapshot => {
    callback(snapshot.val() || {});
  });

export const listenPlayer = (username, callback) =>
  onValue(ref(db, `players/${username}`), snapshot => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });

// Challenge system
export const sendChallenge = (from, to) => {
  // console.log('Sending challenge from:', from, 'to:', to);
  const challengeRef = ref(db, `challenges/${to}`);
  const challengeData = {
    from,
    to,
    timestamp: Date.now(),
    status: 'pending', // pending, accepted, declined
  };
  return set(challengeRef, challengeData);
};

export const acceptChallenge = (challenger, challenged) => {
  // console.log('Accepting challenge from:', challenger, 'by:', challenged);

  // First remove the challenge
  const challengeRef = ref(db, `challenges/${challenged}`);
  return remove(challengeRef).then(() => {
    // Get all pending challenges for the challenged user to decline them
    const challengesRef = ref(db, 'challenges');
    return get(challengesRef).then(snapshot => {
      const allChallenges = snapshot.val() || {};
      const declinePromises = [];

      // Find all challenges TO the challenged user (from other users)
      Object.keys(allChallenges).forEach(challengedUser => {
        if (challengedUser === challenged) {
          const challenge = allChallenges[challengedUser];
          if (challenge && challenge.from !== challenger) {
            // This is a different challenge to the same user, decline it
            const otherChallengeRef = ref(db, `challenges/${challenged}`);
            declinePromises.push(
              remove(otherChallengeRef).then(() => {
                // Send decline notification to the other challenger
                const declineNotificationRef = ref(
                  db,
                  `notifications/${challenge.from}`
                );
                const declineData = {
                  type: 'challenge_declined',
                  from: challenged,
                  to: challenge.from,
                  message: `${challenged} accepted another challenge`,
                  timestamp: Date.now(),
                };
                return set(declineNotificationRef, declineData);
              })
            );
          }
        }
      });

      // Wait for all decline operations to complete, then create room
      return Promise.all(declinePromises).then(() => {
        return createRoom(challenger, challenged);
      });
    });
  });
};

export const declineChallenge = challenged => {
  // console.log('Declining challenge for:', challenged);
  const challengeRef = ref(db, `challenges/${challenged}`);

  // First get the challenge data to notify the challenger
  return get(challengeRef).then(snapshot => {
    if (snapshot.exists()) {
      const challengeData = snapshot.val();
      const challenger = challengeData.from;

      // Remove the challenge
      return remove(challengeRef).then(() => {
        // Send decline notification to challenger
        const declineNotificationRef = ref(db, `notifications/${challenger}`);
        const declineData = {
          type: 'challenge_declined',
          from: challenged,
          to: challenger,
          message: `${challenged} declined your challenge`,
          timestamp: Date.now(),
        };
        return set(declineNotificationRef, declineData);
      });
    } else {
      // No challenge exists, just return
      return Promise.resolve();
    }
  });
};

export const listenChallenge = (username, callback) =>
  onValue(ref(db, `challenges/${username}`), snapshot => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });

export const listenNotifications = (username, callback) =>
  onValue(ref(db, `notifications/${username}`), snapshot => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });

export const clearNotification = username => {
  // console.log('Clearing notification for:', username);
  const notificationRef = ref(db, `notifications/${username}`);
  return remove(notificationRef);
};

// Game logic functions
export const updateGameData = (roomId, gameData) => {
  // console.log('Updating game data for room:', roomId, gameData);
  const roomRef = ref(db, `rooms/${roomId}`);

  return get(roomRef).then(snapshot => {
    if (snapshot.exists()) {
      const currentRoomData = snapshot.val();
      return set(roomRef, {
        ...currentRoomData,
        gameData: {
          ...currentRoomData.gameData,
          ...gameData,
          lastUpdated: Date.now(),
        },
      });
    } else {
      throw new Error('Room not found');
    }
  });
};

export const determineGameResult = (choice1, choice2) => {
  if (choice1 === choice2) return 'draw';

  const winConditions = {
    rock: 'scissors',
    paper: 'rock',
    scissors: 'paper',
  };

  return winConditions[choice1] === choice2 ? 'win' : 'lose';
};

// Update player statistics (wins, losses, draws)
export const updatePlayerStats = async (username, result) => {
  // console.log('Updating player stats:', username, result);
  const playerRef = ref(db, `players/${username}`);

  return get(playerRef).then(snapshot => {
    if (snapshot.exists()) {
      const currentData = snapshot.val();
      const updatedData = {
        ...currentData,
        wins: (currentData.wins || 0) + (result === 'win' ? 1 : 0),
        losses: (currentData.losses || 0) + (result === 'lose' ? 1 : 0),
        draws: (currentData.draws || 0) + (result === 'draw' ? 1 : 0),
        lastSeen: Date.now(),
      };
      // console.log('Updated player stats:', updatedData);
      return set(playerRef, updatedData);
    } else {
      // Player doesn't exist, create with initial stats
      const newPlayerData = {
        username,
        wins: result === 'win' ? 1 : 0,
        losses: result === 'lose' ? 1 : 0,
        draws: result === 'draw' ? 1 : 0,
        isActive: false,
        roomId: null,
        lastSeen: Date.now(),
      };
      // console.log('Creating new player with stats:', newPlayerData);
      return set(playerRef, newPlayerData);
    }
  });
};

export const processGameResult = async (
  roomId,
  player1,
  player2,
  choice1,
  choice2
) => {
  const result1 = determineGameResult(choice1, choice2);
  const result2 = determineGameResult(choice2, choice1);

  // Get current game data
  const roomRef = ref(db, `rooms/${roomId}`);
  const roomSnapshot = await get(roomRef);

  if (!roomSnapshot.exists()) {
    throw new Error('Room not found');
  }

  const roomData = roomSnapshot.val();
  const currentGameData = roomData.gameData || {};

  // Check if this round has already been processed
  if (
    currentGameData[`${player1}_result`] ||
    currentGameData[`${player2}_result`]
  ) {
    // console.log('Round already processed, skipping...');
    return;
  }

  // Update scores
  const player1Score =
    (currentGameData[`${player1}_score`] || 0) + (result1 === 'win' ? 1 : 0);
  const player2Score =
    (currentGameData[`${player2}_score`] || 0) + (result2 === 'win' ? 1 : 0);

  const updatedGameData = {
    ...currentGameData,
    [`${player1}_choice`]: choice1,
    [`${player2}_choice`]: choice2,
    [`${player1}_result`]: result1,
    [`${player2}_result`]: result2,
    [`${player1}_score`]: player1Score,
    [`${player2}_score`]: player2Score,
    lastUpdated: Date.now(),
  };

  // Update player statistics in the database
  await updatePlayerStats(player1, result1);
  await updatePlayerStats(player2, result2);

  return set(roomRef, {
    ...roomData,
    gameData: updatedGameData,
    status: 'completed',
  });
};

// Legacy invite functions (keeping for compatibility)
export const sendInvite = (from, to) =>
  set(ref(db, `invites/${to}`), { from, to, timestamp: Date.now() });

export const listenInvite = (username, callback) =>
  onValue(ref(db, `invites/${username}`), snapshot => {
    if (snapshot.exists()) callback(snapshot.val());
  });

// Room management
export const createRoom = (player1, player2) => {
  const roomId = `room_${crypto.randomUUID()}`;
  // console.log('Creating room:', roomId, 'for players:', player1, player2);

  const roomRef = ref(db, `rooms/${roomId}`);
  const roomData = {
    id: roomId,
    players: [player1, player2],
    status: 'waiting', // waiting, playing, completed
    createdAt: Date.now(),
    gameData: null,
  };

  return set(roomRef, roomData).then(() => {
    // Update both players with roomId, preserving existing data
    const updatePromises = [player1, player2].map(player => {
      const playerRef = ref(db, `players/${player}`);
      return get(playerRef).then(snapshot => {
        if (snapshot.exists()) {
          const currentData = snapshot.val();
          const updatedData = {
            ...currentData,
            isActive: true,
            roomId: roomId,
            lastSeen: Date.now(),
          };
          return set(playerRef, updatedData);
        } else {
          // If player doesn't exist, create new
          const newPlayerData = {
            username: player,
            wins: 0,
            isActive: true,
            roomId: roomId,
            lastSeen: Date.now(),
          };
          return set(playerRef, newPlayerData);
        }
      });
    });

    return Promise.all(updatePromises).then(() => roomId);
  });
};

export const joinRoom = (username, roomId) => {
  // console.log('Player joining room:', username, roomId);
  const playerRef = ref(db, `players/${username}`);

  // Get current player data to preserve wins
  return get(playerRef).then(snapshot => {
    if (snapshot.exists()) {
      const currentData = snapshot.val();
      const updatedData = {
        ...currentData,
        isActive: true,
        roomId: roomId,
        lastSeen: Date.now(),
      };
      // console.log('Updating player for room join:', updatedData);
      return set(playerRef, updatedData);
    } else {
      // If player doesn't exist, create new
      const newPlayerData = {
        username,
        wins: 0,
        isActive: true,
        roomId: roomId,
        lastSeen: Date.now(),
      };
      // console.log('Creating new player for room join:', newPlayerData);
      return set(playerRef, newPlayerData);
    }
  });
};

// Leave a game but stay in the arena (keep isActive: true)
export const leaveGame = username => {
  console.log('Player leaving game:', username);
  const playerRef = ref(db, `players/${username}`);

  // Get current player data to preserve wins and get room info
  return get(playerRef).then(snapshot => {
    if (snapshot.exists()) {
      const currentData = snapshot.val();
      const roomId = currentData.roomId;
      console.log('Player data:', currentData, 'Room ID:', roomId);

      const updatedData = {
        ...currentData,
        isActive: true, // Keep user active in arena
        roomId: null,
        lastSeen: Date.now(),
      };
      // console.log('Updating player for game leave:', updatedData);

      // If player was in a room, notify the other player
      if (roomId) {
        return get(ref(db, `rooms/${roomId}`)).then(roomSnapshot => {
          if (roomSnapshot.exists()) {
            const roomData = roomSnapshot.val();
            const otherPlayer = roomData.players.find(
              player => player !== username
            );
            console.log('Other player found:', otherPlayer);

            if (otherPlayer) {
              // Update the other player's status to remove them from the game
              const otherPlayerRef = ref(db, `players/${otherPlayer}`);
              return get(otherPlayerRef).then(otherPlayerSnapshot => {
                if (otherPlayerSnapshot.exists()) {
                  const otherPlayerData = otherPlayerSnapshot.val();
                  const updatedOtherPlayerData = {
                    ...otherPlayerData,
                    roomId: null,
                    lastSeen: Date.now(),
                  };

                  // Send notification to other player
                  const notificationRef = ref(
                    db,
                    `notifications/${otherPlayer}`
                  );
                  const notificationData = {
                    type: 'player_left_game',
                    from: username,
                    to: otherPlayer,
                    message: `${username} left the game`,
                    timestamp: Date.now(),
                  };

                  return set(notificationRef, notificationData).then(() => {
                    // Also remove the room since the game is over
                    const roomRef = ref(db, `rooms/${roomId}`);
                    return remove(roomRef).then(() => {
                      // Update both players
                      console.log(
                        'Updating both players:',
                        username,
                        'and',
                        otherPlayer
                      );
                      return Promise.all([
                        set(playerRef, updatedData),
                        set(otherPlayerRef, updatedOtherPlayerData),
                      ]).then(() => {
                        console.log('Both players updated successfully');
                        // Check for waiting matches after game ends
                        return checkForWaitingMatches();
                      });
                    });
                  });
                } else {
                  // If other player doesn't exist, just handle the leaving player
                  const notificationRef = ref(
                    db,
                    `notifications/${otherPlayer}`
                  );
                  const notificationData = {
                    type: 'player_left_game',
                    from: username,
                    to: otherPlayer,
                    message: `${username} left the game`,
                    timestamp: Date.now(),
                  };

                  return set(notificationRef, notificationData).then(() => {
                    const roomRef = ref(db, `rooms/${roomId}`);
                    return remove(roomRef).then(() => {
                      return set(playerRef, updatedData).then(() => {
                        return checkForWaitingMatches();
                      });
                    });
                  });
                }
              });
            }
          }
          return set(playerRef, updatedData).then(() => {
            // Notify waiting players that this player is now available
            return notifyWaitingPlayers(username);
          });
        });
      }

      return set(playerRef, updatedData).then(() => {
        // Notify waiting players that this player is now available
        return notifyWaitingPlayers(username);
      });
    } else {
      // If player doesn't exist, create with default values
      const newPlayerData = {
        username,
        wins: 0,
        isActive: true, // Keep active when leaving game
        roomId: null,
        lastSeen: Date.now(),
      };
      // console.log('Creating new player for game leave:', newPlayerData);
      return set(playerRef, newPlayerData);
    }
  });
};

// Leave the arena completely (set isActive: false)
export const leaveRoom = username => {
  // console.log('Player leaving arena:', username);
  const playerRef = ref(db, `players/${username}`);

  // Get current player data to preserve wins and get room info
  return get(playerRef).then(snapshot => {
    if (snapshot.exists()) {
      const currentData = snapshot.val();
      const roomId = currentData.roomId;

      const updatedData = {
        ...currentData,
        isActive: false, // User is leaving arena completely
        roomId: null,
        lastSeen: Date.now(),
      };
      // console.log('Updating player for arena leave:', updatedData);

      // If player was in a room, notify the other player
      if (roomId) {
        return get(ref(db, `rooms/${roomId}`)).then(roomSnapshot => {
          if (roomSnapshot.exists()) {
            const roomData = roomSnapshot.val();
            const otherPlayer = roomData.players.find(
              player => player !== username
            );

            if (otherPlayer) {
              // Send notification to other player
              const notificationRef = ref(db, `notifications/${otherPlayer}`);
              const notificationData = {
                type: 'player_left_game',
                from: username,
                to: otherPlayer,
                message: `${username} left the game`,
                timestamp: Date.now(),
              };
              return set(notificationRef, notificationData).then(() => {
                return set(playerRef, updatedData);
              });
            }
          }
          return set(playerRef, updatedData);
        });
      }

      return set(playerRef, updatedData);
    } else {
      // If player doesn't exist, create with default values
      const newPlayerData = {
        username,
        wins: 0,
        isActive: false,
        roomId: null,
        lastSeen: Date.now(),
      };
      // console.log('Creating new player for arena leave:', newPlayerData);
      return set(playerRef, newPlayerData);
    }
  });
};

export const completeGame = (roomId, winner) => {
  // console.log('Completing game in room:', roomId, 'winner:', winner);

  // Update room status
  const roomRef = ref(db, `rooms/${roomId}`);
  return set(roomRef, {
    id: roomId,
    status: 'completed',
    completedAt: Date.now(),
    winner: winner,
  }).then(() => {
    // Clear roomId from all players in the room and update wins
    const roomPlayersRef = ref(db, `rooms/${roomId}/players`);
    return get(roomPlayersRef).then(snapshot => {
      if (snapshot.exists()) {
        const players = snapshot.val();
        const updatePromises = players.map(player => {
          const playerRef = ref(db, `players/${player}`);
          return get(playerRef).then(playerSnapshot => {
            if (playerSnapshot.exists()) {
              const currentData = playerSnapshot.val();
              const updatedData = {
                ...currentData,
                wins: currentData.wins || 0,
                losses: currentData.losses || 0,
                draws: currentData.draws || 0,
                isActive: true,
                roomId: null,
                lastSeen: Date.now(),
              };
              return set(playerRef, updatedData);
            } else {
              // If player doesn't exist, create with default values
              const newPlayerData = {
                username: player,
                wins: 0,
                losses: 0,
                draws: 0,
                isActive: true,
                roomId: null,
                lastSeen: Date.now(),
              };
              return set(playerRef, newPlayerData);
            }
          });
        });
        return Promise.all(updatePromises);
      }
    });
  });
};

export const listenRoom = (roomId, callback) =>
  onValue(ref(db, `rooms/${roomId}`), snapshot => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      // Room was deleted, notify that the game is over
      callback(null);
    }
  });

// Send round start notification
export const sendRoundStartNotification = (
  fromPlayer,
  toPlayer,
  roundNumber
) => {
  const notificationRef = ref(db, `notifications/${toPlayer}`);
  const notificationData = {
    type: 'round_started',
    from: fromPlayer,
    to: toPlayer,
    message: `${fromPlayer} started round ${roundNumber}`,
    roundNumber: roundNumber,
    timestamp: Date.now(),
  };
  return set(notificationRef, notificationData);
};

// Send play another round request
export const sendPlayAnotherRoundRequest = (fromPlayer, toPlayer, roomId) => {
  const notificationRef = ref(db, `notifications/${toPlayer}`);
  const notificationData = {
    type: 'play_another_round_request',
    from: fromPlayer,
    to: toPlayer,
    message: `${fromPlayer} wants to play another round`,
    roomId: roomId,
    timestamp: Date.now(),
  };
  return set(notificationRef, notificationData);
};

// Accept play another round request
export const acceptPlayAnotherRoundRequest = async (
  fromPlayer,
  toPlayer,
  roomId
) => {
  // Clear the notification
  await clearNotification(toPlayer);

  // Update the room to start a new round
  const roomRef = ref(db, `rooms/${roomId}`);
  const roomSnapshot = await get(roomRef);

  if (roomSnapshot.exists()) {
    const roomData = roomSnapshot.val();
    const newRoundNumber = (roomData.gameData?.roundNumber || 1) + 1;

    const updatedGameData = {
      ...roomData.gameData,
      [`${fromPlayer}_choice`]: null,
      [`${toPlayer}_choice`]: null,
      [`${fromPlayer}_result`]: null,
      [`${toPlayer}_result`]: null,
      roundNumber: newRoundNumber,
      lastUpdated: Date.now(),
    };

    await set(roomRef, {
      ...roomData,
      gameData: updatedGameData,
      status: 'waiting',
    });

    // Send notification to the requester that it was accepted
    const notificationRef = ref(db, `notifications/${fromPlayer}`);
    const notificationData = {
      type: 'play_another_round_accepted',
      from: toPlayer,
      to: fromPlayer,
      message: `${toPlayer} accepted your request to play another round`,
      roomId: roomId,
      roundNumber: newRoundNumber,
      timestamp: Date.now(),
    };
    return set(notificationRef, notificationData);
  }
};

// Decline play another round request
export const declinePlayAnotherRoundRequest = async (fromPlayer, toPlayer) => {
  // Clear the notification
  await clearNotification(toPlayer);

  // Get the room ID from the requester's player data
  const fromPlayerRef = ref(db, `players/${fromPlayer}`);
  const fromPlayerSnapshot = await get(fromPlayerRef);

  if (fromPlayerSnapshot.exists()) {
    const fromPlayerData = fromPlayerSnapshot.val();
    const roomId = fromPlayerData.roomId;

    // If both players are in a room, remove them from the game
    if (roomId) {
      // Update both players to remove them from the room
      const toPlayerRef = ref(db, `players/${toPlayer}`);

      // Update fromPlayer (requester)
      const updatedFromPlayerData = {
        ...fromPlayerData,
        roomId: null,
        lastSeen: Date.now(),
      };

      // Update toPlayer (decliner)
      const toPlayerSnapshot = await get(toPlayerRef);
      const toPlayerData = toPlayerSnapshot.exists()
        ? toPlayerSnapshot.val()
        : {};
      const updatedToPlayerData = {
        ...toPlayerData,
        roomId: null,
        lastSeen: Date.now(),
      };

      // Update both players
      await Promise.all([
        set(fromPlayerRef, updatedFromPlayerData),
        set(toPlayerRef, updatedToPlayerData),
      ]);

      // Remove the room since the game is over
      const roomRef = ref(db, `rooms/${roomId}`);
      await remove(roomRef);

      // Check for waiting matches after game ends
      await checkForWaitingMatches();
    }
  }

  // Send notification to the requester that it was declined
  const notificationRef = ref(db, `notifications/${fromPlayer}`);
  const notificationData = {
    type: 'play_another_round_declined',
    from: toPlayer,
    to: fromPlayer,
    message: `${toPlayer} declined your request to play another round`,
    timestamp: Date.now(),
  };
  return set(notificationRef, notificationData);
};

// Waiting list system
export const addToWaitingList = async username => {
  // console.log('Adding player to waiting list:', username);
  const waitingListRef = ref(db, `waitingList/${username}`);
  const waitingData = {
    username,
    joinedAt: Date.now(),
    status: 'waiting',
  };
  return set(waitingListRef, waitingData);
};

export const removeFromWaitingList = async username => {
  // console.log('Removing player from waiting list:', username);
  const waitingListRef = ref(db, `waitingList/${username}`);
  return remove(waitingListRef);
};

export const getWaitingList = async () => {
  // console.log('Getting waiting list');
  const waitingListRef = ref(db, 'waitingList');
  const snapshot = await get(waitingListRef);
  return snapshot.val() || {};
};

export const listenWaitingList = callback => {
  // console.log('Starting to listen to waiting list');
  return onValue(ref(db, 'waitingList'), snapshot => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback({});
    }
  });
};

// Notify waiting players when a player becomes available
export const notifyWaitingPlayers = async availablePlayer => {
  const waitingList = await getWaitingList();
  const waitingPlayers = Object.values(waitingList).filter(
    player => player.status === 'waiting'
  );

  if (waitingPlayers.length > 0) {
    // Send notification to all waiting players and remove them from waiting list
    const notificationPromises = waitingPlayers.map(async waitingPlayer => {
      const notificationRef = ref(
        db,
        `notifications/${waitingPlayer.username}`
      );
      const notificationData = {
        type: 'player_available',
        from: 'system',
        to: waitingPlayer.username,
        message: `${availablePlayer} is now available to challenge!`,
        availablePlayer: availablePlayer,
        timestamp: Date.now(),
      };

      // Send notification and remove from waiting list
      await set(notificationRef, notificationData);
      await removeFromWaitingList(waitingPlayer.username);

      return waitingPlayer.username;
    });

    await Promise.all(notificationPromises);
  }

  return null;
};

// Auto-match waiting players when a game finishes (legacy function, keeping for compatibility)
export const checkForWaitingMatches = async () => {
  // console.log('Checking for waiting matches');
  const waitingList = await getWaitingList();
  const waitingPlayers = Object.values(waitingList).filter(
    player => player.status === 'waiting'
  );

  if (waitingPlayers.length >= 2) {
    // Sort by join time to match first-come-first-served
    waitingPlayers.sort((a, b) => a.joinedAt - b.joinedAt);

    const player1 = waitingPlayers[0];
    const player2 = waitingPlayers[1];

    // Remove both players from waiting list
    await removeFromWaitingList(player1.username);
    await removeFromWaitingList(player2.username);

    // Send notifications to both players that they can now challenge each other
    const notification1Ref = ref(db, `notifications/${player1.username}`);
    const notification1Data = {
      type: 'player_available',
      from: 'system',
      to: player1.username,
      message: `${player2.username} is now available to challenge!`,
      availablePlayer: player2.username,
      timestamp: Date.now(),
    };

    const notification2Ref = ref(db, `notifications/${player2.username}`);
    const notification2Data = {
      type: 'player_available',
      from: 'system',
      to: player2.username,
      message: `${player1.username} is now available to challenge!`,
      availablePlayer: player1.username,
      timestamp: Date.now(),
    };

    await set(notification1Ref, notification1Data);
    await set(notification2Ref, notification2Data);

    return null; // Don't create room automatically
  }

  return null;
};

// Update user's last seen timestamp (heartbeat)
export const updateUserHeartbeat = username => {
  // console.log('Updating user heartbeat:', username);
  const playerRef = ref(db, `players/${username}`);

  return get(playerRef).then(snapshot => {
    if (snapshot.exists()) {
      const currentData = snapshot.val();
      const updatedData = {
        ...currentData,
        lastSeen: Date.now(),
      };
      return set(playerRef, updatedData);
    } else {
      // console.log('User not found for heartbeat:', username);
      return Promise.resolve();
    }
  });
};

// Utility function to set user as inactive (for page refresh/close)
export const setUserInactive = username => {
  // console.log('Setting user as inactive:', username);
  const playerRef = ref(db, `players/${username}`);

  return get(playerRef).then(snapshot => {
    if (snapshot.exists()) {
      const currentData = snapshot.val();
      const updatedData = {
        ...currentData,
        isActive: false,
        lastSeen: Date.now(),
      };
      // console.log('Setting user inactive:', updatedData);

      // Also remove from waiting list if they were waiting
      return Promise.all([
        set(playerRef, updatedData),
        removeFromWaitingList(username),
      ]);
    } else {
      // console.log('User not found:', username);
      return Promise.resolve();
    }
  });
};

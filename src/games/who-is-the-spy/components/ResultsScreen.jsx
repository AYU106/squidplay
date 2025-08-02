import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { subscribeToRoom, leaveRoom, resetGame } from '../firebaseSpy';
import '../styles/ResultsScreen.css';

const ResultsScreen = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const playerName = location.state?.playerName;

  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🔁 Firebase Room Listener
  useEffect(() => {
    if (!playerName) {
      navigate('/spy');
      return;
    }

    const unsubscribe = subscribeToRoom(roomCode, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setRoomData(data);

        // Redirect if game state changes
        if (data.status === 'waiting') {
          navigate(`/spy/lobby/${roomCode}`, {
            state: { playerName, isHost: data.players?.[playerName]?.isHost },
          });
        } else if (data.status === 'playing') {
          navigate(`/spy/game/${roomCode}`, { state: { playerName } });
        }
      } else {
        setError('Room not found');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomCode, playerName, navigate]);

  const handlePlayAgain = async () => {
    try {
      await resetGame(roomCode);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeaveGame = async () => {
    try {
      await leaveRoom(roomCode, playerName);
      navigate('/spy');
    } catch (err) {
      console.error('Error leaving room:', err);
      navigate('/spy');
    }
  };

  if (loading) {
    return (
      <div className="game-container">
        <div className="loading">Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-container">
        <div className="error">{error}</div>
        <button onClick={() => navigate('/spy')}>Back to Who's the Spy</button>
      </div>
    );
  }

  // 🧠 Extract game data
  const players = Object.values(roomData?.players || {});
  const currentPlayer = roomData?.players?.[playerName];
  const gameResults = roomData?.gameResults || {};
  const gameMode = roomData?.gameMode || 'normal';
  const votes = roomData?.votes || {};

  // 📊 Count votes
  const voteCount = {};
  Object.values(votes).forEach((target) => {
    voteCount[target] = (voteCount[target] || 0) + 1;
  });

  // 🚫 Handle case with no votes
  const mostVoted = Object.entries(voteCount).reduce(
    (a, b) => (a[1] >= b[1] ? a : b),
    ['', 0]
  );

  const eliminatedPlayer = players.find((p) => p.name === mostVoted[0]) || null;
  const spyPlayer = players.find((p) => p.isSpy) || null;
  const doppelgangerPlayer = players.find((p) => p.isDoppelganger) || null;

  // 🏆 Determine winner
  const spyWon = gameResults.winner === 'spy';

  return (
    <div className="results-screen">
      <div className="results-container">
        {/* 🧾 Header */}
        <div className="results-header">
          <h1>🎯 Game Results</h1>
          <div className="game-mode-badge">{gameMode.toUpperCase()}</div>
        </div>

        {/* 🏆 Winner Banner */}
        <div className="winner-announcement">
          {spyWon ? (
            <div className="winner-card spy-wins">
              <h2>🕵️ SPY WINS!</h2>
              <p>{spyPlayer?.name} successfully avoided detection!</p>
            </div>
          ) : (
            <div className="winner-card civilian-wins">
              <h2>👥 CIVILIANS WIN!</h2>
              <p>The spy has been caught!</p>
            </div>
          )}
        </div>

        {/* 📦 Results Grid */}
        <div className="results-grid">
          {/* 🗳 Voting Results */}
          <div className="results-section">
            <h3>📊 Voting Results</h3>
            <div className="vote-results">
              {Object.entries(voteCount).map(([playerName, count]) => (
                <div key={playerName} className="vote-result-item">
                  <span className="player-name">{playerName}</span>
                  <div className="vote-bar">
                    <div
                      className="vote-fill"
                      style={{ width: `${(count / players.length) * 100}%` }}
                    />
                    <span className="vote-count">{count} votes</span>
                  </div>
                </div>
              ))}
            </div>
            {eliminatedPlayer && (
              <div className="eliminated-player">
                <strong>Eliminated:</strong> {eliminatedPlayer.name}
              </div>
            )}
          </div>

          {/* 🧠 Role Reveals */}
          <div className="results-section">
            <h3>🎭 Role Reveals</h3>
            <div className="role-reveals">
              {players.map((player, i) => (
                <div
                  key={i}
                  className={`role-reveal ${
                    player.isSpy
                      ? 'spy'
                      : player.isDoppelganger
                      ? 'doppelganger'
                      : 'civilian'
                  }`}
                >
                  <span className="player-name">{player.name}</span>
                  <div className="role-info">
                    {player.isSpy ? (
                      <span className="role-badge spy">🕵️ SPY</span>
                    ) : player.isDoppelganger ? (
                      <span className="role-badge doppelganger">👥 DOPPELGANGER</span>
                    ) : (
                      <span className="role-badge civilian">👤 CIVILIAN</span>
                    )}
                    {player.gameWord && (
                      <span className="word-reveal">"{player.gameWord}"</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 🧾 Detailed Votes */}
          <div className="results-section">
            <h3>🗳️ Vote Details</h3>
            <div className="vote-details">
              {Object.entries(votes).map(([voter, target]) => (
                <div key={voter} className="vote-detail-item">
                  <span className="voter">{voter}</span>
                  <span className="arrow">→</span>
                  <span className="target">{target}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 📈 Stats */}
          <div className="results-section">
            <h3>📈 Game Stats</h3>
            <div className="game-stats">
              <div className="stat-item">
                <span className="stat-label">Total Players:</span>
                <span className="stat-value">{players.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Game Mode:</span>
                <span className="stat-value">
                  {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Room Code:</span>
                <span className="stat-value">{roomCode}</span>
              </div>
              {gameMode === 'doppelganger' && doppelgangerPlayer && (
                <div className="stat-item">
                  <span className="stat-label">Doppelganger:</span>
                  <span className="stat-value">{doppelgangerPlayer.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🎮 Actions */}
        <div className="results-actions">
          {currentPlayer?.isHost && (
            <button className="btn btn-primary" onClick={handlePlayAgain}>
              🔄 Play Again
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleLeaveGame}>
            🚪 Leave Game
          </button>
        </div>

        {/* 👋 Footer */}
        <div className="results-footer">
          <p>Thanks for playing Who's the Spy! 🕵️</p>
          {!currentPlayer?.isHost && (
            <p>Waiting for host to start a new game...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
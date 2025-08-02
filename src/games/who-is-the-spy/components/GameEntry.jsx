import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, joinRoom } from '../firebaseSpy';
import '../styles/GameEntry.css';
import '../../shared.css';

const GameEntry = () => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [gameMode, setGameMode] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle room creation
  const handleCreateRoom = async (e) => {
    e.preventDefault();

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newRoomCode = await createRoom(playerName.trim(), gameMode);
      navigate(`/spy/lobby/${newRoomCode}`, {
        state: { playerName: playerName.trim(), isHost: true, gameMode },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle joining an existing room
  const handleJoinRoom = async (e) => {
    e.preventDefault();

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter room code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      navigate(`/spy/lobby/${roomCode.trim().toUpperCase()}`, {
        state: { playerName: playerName.trim(), isHost: false },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const gameModes = {
    normal: {
      name: 'Normal Mode',
      description: '5min discussion + 1min voting',
      icon: '🕵️',
      discussionTime: 5,
      votingTime: 1
    },
    speedrun: {
      name: 'Speed Run',
      description: '2min discussion + 1min voting',
      icon: '⚡',
      discussionTime: 2,
      votingTime: 1
    },
    doppelganger: {
      name: 'Doppelganger',
      description: '5min discussion + 1min voting (Twist: One civilian gets different word)',
      icon: '👥',
      discussionTime: 5,
      votingTime: 1
    }
  };

  return (
    <div className="game-container">
      {/* Back button */}
      <button className="back-button" onClick={() => navigate('/')}>←</button>

      <div className="game-card">
        {/* Header */}
        <div className="game-header">
          <h1>🕵️ Who's the Spy</h1>
          <p>Social deduction game for 3 - 10 players</p>
        </div>

        {/* Error message */}
        {error && <div className="error">{error}</div>}

        {/* Entry Form */}
        <form>
          <div className="form-group">
            <label htmlFor="playerName">Your Name</label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              required
            />
          </div>

          {/* Game Mode Selection */}
          <div className="form-group">
            <label>Game Mode</label>
            <div className="game-modes">
              {Object.entries(gameModes).map(([key, mode]) => (
                <div
                  key={key}
                  className={`game-mode-card ${gameMode === key ? 'selected' : ''}`}
                  onClick={() => setGameMode(key)}
                >
                  <div className="mode-icon">{mode.icon}</div>
                  <div className="mode-info">
                    <h4>{mode.name}</h4>
                    <p>{mode.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="roomCode">Room Code (to join existing room)</label>
            <input
              type="text"
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              maxLength={6}
            />
          </div>

          <div className="button-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleJoinRoom}
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              onClick={handleCreateRoom}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>

        {/* Game Rules */}
        <div className="game-rules">
          <h3>How to Play:</h3>
          <ul>
            <li><strong>Normal Mode:</strong> Most players get the same word, spy gets nothing</li>
            <li><strong>Speed Run:</strong> Same as normal but with faster timer</li>
            <li><strong>Doppelganger:</strong> Most civilians get word A, one civilian gets word B, spy gets nothing</li>
            <li>Discuss and describe your word without saying it directly</li>
            <li>Find the spy through voting after timer ends</li>
            <li>Spy wins if they avoid detection or guess the word</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GameEntry;
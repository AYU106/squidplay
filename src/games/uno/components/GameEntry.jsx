import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, joinRoom } from '../firebaseUNO';
import '../styles/GameEntry.css';
import '../../shared.css';

const GameEntry = () => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
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
      const newRoomCode = await createRoom(playerName.trim());
      navigate(`/uno/lobby/${newRoomCode}`, {
        state: { playerName: playerName.trim(), isHost: true },
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
      navigate(`/uno/lobby/${roomCode.trim().toUpperCase()}`, {
        state: { playerName: playerName.trim(), isHost: false },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="game-container">
      {/* Back to home */}
      <button className="back-button" onClick={() => navigate('/')}>←</button>

      <div className="game-card">
        {/* Game Header */}
        <div className="game-header">
          <h1>🃏 UNO</h1>
          <p>Classic card game for 2 - 13 players</p>
        </div>

        {/* Error Message */}
        {error && <div className="error">{error}</div>}

        {/* Form */}
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
            <li>Match cards by color, number, or symbol</li>
            <li>Use special cards to block opponents</li>
            <li>Don't forget to say "UNO" when you have one card left!</li>
            <li>First player to play all cards wins</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GameEntry;
